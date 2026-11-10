package org.zero.detox.service

import android.app.AppOpsManager
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.app.usage.UsageEvents
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import android.os.Process
import android.os.SystemClock
import androidx.core.app.NotificationCompat
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.data.ParachuteStore
import org.zero.detox.ui.TheVoidActivity

/**
 * LockForegroundService:
 * Keeps Zero active in OS memory and runs a 350ms Bag-aware foreground guard.
 * Uses UsageStatsManager (when granted) + SYSTEM_ALERT_WINDOW BAL exemption so users
 * can seamlessly use apps packed in their Bag (and allowed Phone/SMS), while immediately
 * snapping TheVoidActivity back over Settings, Launcher, or any disallowed app.
 */
class LockForegroundService : Service() {

    companion object {
        const val ACTION_START_LOCK = "org.zero.detox.START_LOCK"
        const val ACTION_STOP_LOCK = "org.zero.detox.STOP_LOCK"
        const val CHANNEL_ID = "zero_void_channel"
        const val NOTIFICATION_ID = 1001
        private const val WATCHDOG_INTERVAL_MS = 350L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isWatchdogActive = false
    private lateinit var bagStore: BagStore
    private lateinit var parachuteStore: ParachuteStore
    private lateinit var lockEngine: LockEngine
    private var lastKnownForegroundPkg: String? = null

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

            // Skip enforcement while in emergency 911/112 grace or active Bag launch grace (monotonic clock)
            val inEmergencyGrace = nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed
            val inBagTransitionGrace = nowElapsed <= TheVoidActivity.bagLaunchGraceUntilElapsed

            if (!TheVoidActivity.isInForeground && !inEmergencyGrace && !inBagTransitionGrace) {
                val fgPkg = detectForegroundPackage(nowWall)
                val allowedByBag = if (fgPkg != null) {
                    if (fgPkg == "com.android.settings" || BagStore.PROTECTED_SYSTEM_PACKAGES.contains(fgPkg)) {
                        false
                    } else {
                        bagStore.isPackageAllowedDuringLock(fgPkg)
                    }
                } else {
                    // Fallback if Usage Access isn't granted: allow temporarily if user intentionally opened a Bag app
                    TheVoidActivity.activeBagPackage != null
                }

                if (!allowedByBag) {
                    TheVoidActivity.activeBagPackage = null
                    snapBackToVoid()
                }
            } else if (TheVoidActivity.isInForeground) {
                lastKnownForegroundPkg = packageName
                TheVoidActivity.activeBagPackage = null
            }

            handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
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
                if (isResumed && event.timeStamp >= latestTime) {
                    latestTime = event.timeStamp
                    latestPkg = event.packageName
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
        val voidIntent = Intent(this@LockForegroundService, TheVoidActivity::class.java).apply {
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
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        isWatchdogActive = false
        handler.removeCallbacks(watchdogRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildLockNotification(tag: String): Notification {
        val voidIntent = Intent(this, TheVoidActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            voidIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zero — The Void is Active")
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
                "Zero Active Lock",
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
