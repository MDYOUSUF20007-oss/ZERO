package org.zero.detox.service

import android.accessibilityservice.AccessibilityServiceInfo
import android.app.AppOpsManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import android.view.inputmethod.InputMethodManager
import androidx.core.app.NotificationCompat
import org.zero.detox.MainActivity
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.data.ParachuteStore
import org.zero.detox.engage.EngageConfigStore
import org.zero.detox.engage.EngageRuntimeEngine
import org.zero.detox.ui.TheVoidActivity

/**
 * LockForegroundService:
 * Keeps Zero active in OS memory and runs a 350ms Bag-aware foreground guard.
 * Uses UsageStatsManager (when granted) + SYSTEM_ALERT_WINDOW BAL exemption so users
 * can seamlessly use apps packed in their Bag (and allowed Phone/SMS), while immediately
 * snapping TheVoidActivity back over Settings, Launcher, or any disallowed/quota-exhausted app.
 * Strictly avoids static references to ZeroAccessibilityService so both standard and strict flavors compile.
 */
class LockForegroundService : Service() {

    companion object {
        const val ACTION_START_LOCK = "org.zero.detox.START_LOCK"
        const val ACTION_STOP_LOCK = "org.zero.detox.STOP_LOCK"
        const val CHANNEL_ID = "zero_void_channel"
        const val NOTIFICATION_ID = 1001
        private const val WATCHDOG_INTERVAL_MS = 350L
        private const val CACHE_REFRESH_MS = 30_000L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isWatchdogActive = false
    private lateinit var bagStore: BagStore
    private lateinit var parachuteStore: ParachuteStore
    private lateinit var lockEngine: LockEngine
    private lateinit var engageConfigStore: EngageConfigStore
    private lateinit var fallbackEngageEngine: EngageRuntimeEngine
    private var lastSyncedRevision: Long = -1L
    private var lastKnownForegroundPkg: String? = null
    private var cachedImePackages: Set<String> = emptySet()
    private var cachedLauncherPackages: Set<String> = emptySet()
    private var lastPackageCacheElapsed: Long = -CACHE_REFRESH_MS

    private val watchdogRunnable = object : Runnable {
        override fun run() {
            if (!isWatchdogActive) return

            val nowWall = System.currentTimeMillis()
            val nowElapsed = SystemClock.elapsedRealtime()
            val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
            val timing = LockEngine.rebaseAfterRebootIfNeeded(prefs, nowWall, nowElapsed)

            if (!timing.isLocked) {
                stopWatchdogAndService()
                return
            }

            if (timing.isExpired) {
                if (lockEngine.completeSession()) {
                    stopWatchdogAndService()
                    return
                }
            }

            refreshPackageCachesIfNeeded(nowElapsed)

            // Skip enforcement while in emergency 911/112 grace or active Bag launch grace (monotonic clock)
            val inEmergencyGrace = nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed
            val inBagTransitionGrace = nowElapsed <= TheVoidActivity.bagLaunchGraceUntilElapsed

            if (!TheVoidActivity.isInForeground && !inEmergencyGrace && !inBagTransitionGrace) {
                val fgPkg = detectForegroundPackage(nowWall)
                val accessibilityActive = isZeroAccessibilityServiceEnabled()

                val allowedNow = if (fgPkg != null) {
                    if (fgPkg == "com.android.settings" || BagStore.PROTECTED_SYSTEM_PACKAGES.contains(fgPkg)) {
                        false
                    } else if (accessibilityActive) {
                        // In Strict Edition, ZeroAccessibilityService owns granular controlled quotas,
                        // mindful friction, scroll guard, and TYPE_ACCESSIBILITY_OVERLAY layers.
                        bagStore.isPackageAllowedDuringLock(fgPkg)
                    } else {
                        evaluateStandardFallbackPermission(fgPkg, nowElapsed)
                    }
                } else {
                    // Fallback if Usage Access isn't granted: allow temporarily if user intentionally opened a Bag app
                    TheVoidActivity.activeBagPackage != null
                }

                if (!allowedNow) {
                    TheVoidActivity.activeBagPackage = null
                    snapBackToVoid()
                }
            } else if (TheVoidActivity.isInForeground) {
                lastKnownForegroundPkg = packageName
                TheVoidActivity.activeBagPackage = null
                if (!isZeroAccessibilityServiceEnabled()) {
                    fallbackEngageEngine.onForegroundTick(
                        foregroundPkg = packageName,
                        nowElapsedMs = nowElapsed,
                        imePackages = cachedImePackages,
                        launcherPackages = cachedLauncherPackages,
                        legacyBagAllowed = { bagStore.isPackageAllowedDuringLock(it) }
                    )
                }
            }

            handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
    }

    private fun evaluateStandardFallbackPermission(fgPkg: String, nowElapsed: Long): Boolean {
        val rev = engageConfigStore.getRevision()
        val activeCfg = engageConfigStore.loadActiveConfig()
        if (activeCfg == null) {
            if (lastSyncedRevision != -1L) {
                fallbackEngageEngine.reset()
                lastSyncedRevision = -1L
            }
            return bagStore.isPackageAllowedDuringLock(fgPkg)
        }
        if (rev != lastSyncedRevision || fallbackEngageEngine.getConfig() == null) {
            fallbackEngageEngine.configure(activeCfg, rev)
            lastSyncedRevision = rev
        }
        val decision = fallbackEngageEngine.onForegroundTick(
            foregroundPkg = fgPkg,
            nowElapsedMs = nowElapsed,
            imePackages = cachedImePackages,
            launcherPackages = cachedLauncherPackages,
            legacyBagAllowed = { bagStore.isPackageAllowedDuringLock(it) }
        )
        return when (decision.action) {
            EngageRuntimeEngine.TickAction.BLOCK_HARD,
            EngageRuntimeEngine.TickAction.BLOCK_QUOTA,
            EngageRuntimeEngine.TickAction.BLOCK_COOLDOWN -> false
            EngageRuntimeEngine.TickAction.NONE -> {
                if (cachedLauncherPackages.contains(fgPkg)) false else true
            }
            EngageRuntimeEngine.TickAction.REQUIRE_FRICTION,
            EngageRuntimeEngine.TickAction.ALLOW -> true
        }
    }

    private fun refreshPackageCachesIfNeeded(nowElapsed: Long) {
        if (nowElapsed - lastPackageCacheElapsed < CACHE_REFRESH_MS) return
        lastPackageCacheElapsed = nowElapsed

        try {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            val imeSet = imm?.enabledInputMethodList
                ?.mapNotNull { it.packageName }
                ?.filter { it.isNotBlank() }
                ?.toSet()
                ?: emptySet()
            cachedImePackages = imeSet
        } catch (_: Exception) {}

        try {
            val homeIntent = Intent(Intent.ACTION_MAIN).apply {
                addCategory(Intent.CATEGORY_HOME)
            }
            val list = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.queryIntentActivities(homeIntent, PackageManager.ResolveInfoFlags.of(0L))
            } else {
                @Suppress("DEPRECATION")
                packageManager.queryIntentActivities(homeIntent, 0)
            }
            cachedLauncherPackages = list
                .mapNotNull { it.activityInfo?.packageName }
                .filter { it.isNotBlank() && it != packageName }
                .toSet()
        } catch (_: Exception) {}
    }

    private fun isZeroAccessibilityServiceEnabled(): Boolean {
        try {
            val am = getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            val enabledList = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            if (enabledList != null) {
                for (info in enabledList) {
                    if (info.resolveInfo?.serviceInfo?.packageName == packageName) {
                        return true
                    }
                }
            }
        } catch (_: Exception) {}

        return try {
            val expectedFull = ComponentName(
                packageName,
                "${packageName}.service.ZeroAccessibilityService"
            ).flattenToString()
            val expectedShort = ComponentName(
                packageName,
                "${packageName}.service.ZeroAccessibilityService"
            ).flattenToShortString()
            val enabledServices = Settings.Secure.getString(
                contentResolver,
                Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
            ) ?: ""
            enabledServices.contains(expectedFull) || enabledServices.contains(expectedShort)
        } catch (_: Exception) {
            false
        }
    }

    private fun hasUsageStatsAccess(): Boolean {
        return try {
            val appOps = getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(AppOpsManager.OPSTR_GET_USAGE_STATS, Process.myUid(), packageName)
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: Exception) {
            false
        }
    }

    private fun detectForegroundPackage(now: Long): String? {
        if (!hasUsageStatsAccess()) return null
        return try {
            val usm = getSystemService(Context.USAGE_STATS_SERVICE) as? UsageStatsManager ?: return null
            val events = usm.queryEvents(now - 30_000L, now)
            val event = UsageEvents.Event()
            var latestTime = 0L
            var latestPkg: String? = null
            while (events.hasNextEvent()) {
                events.getNextEvent(event)
                val isResumed = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    event.eventType == UsageEvents.Event.ACTIVITY_RESUMED
                } else {
                    @Suppress("DEPRECATION")
                    event.eventType == UsageEvents.Event.MOVE_TO_FOREGROUND
                }
                val pkg = event.packageName
                if (isResumed &&
                    !pkg.isNullOrBlank() &&
                    !cachedImePackages.contains(pkg) &&
                    pkg != "com.android.systemui" &&
                    event.timeStamp >= latestTime
                ) {
                    latestTime = event.timeStamp
                    latestPkg = pkg
                }
            }
            if (!latestPkg.isNullOrBlank()) {
                lastKnownForegroundPkg = latestPkg
            }
            lastKnownForegroundPkg
        } catch (_: Exception) {
            null
        }
    }

    private fun snapBackToVoid() {
        val voidIntent = Intent(this@LockForegroundService, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        try {
            startActivity(voidIntent)
        } catch (_: Exception) {}
    }

    override fun onCreate() {
        super.onCreate()
        bagStore = BagStore(this)
        parachuteStore = ParachuteStore(this)
        lockEngine = LockEngine(this, parachuteStore)
        engageConfigStore = EngageConfigStore(this)
        fallbackEngageEngine = EngageRuntimeEngine(packageName)
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_LOCK) {
            stopWatchdogAndService()
            return START_NOT_STICKY
        }

        val tag = intent?.getStringExtra("EXTRA_TAG") ?: "Deep Work"
        val notification = buildLockNotification(tag)

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (!isWatchdogActive) {
            isWatchdogActive = true
            handler.postDelayed(watchdogRunnable, WATCHDOG_INTERVAL_MS)
        }

        return START_STICKY
    }

    private fun stopWatchdogAndService() {
        isWatchdogActive = false
        handler.removeCallbacks(watchdogRunnable)
        fallbackEngageEngine.reset()
        lastSyncedRevision = -1L
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        isWatchdogActive = false
        handler.removeCallbacks(watchdogRunnable)
        fallbackEngageEngine.reset()
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildLockNotification(tag: String): Notification {
        val voidIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            voidIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zero-Distractions — The Void is Active")
            .setContentText("Locked in #$tag. Non-Bag apps & distractions are blocked.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Zero-Distractions Active Lock",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Enforces persistent lock state during digital detox"
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
