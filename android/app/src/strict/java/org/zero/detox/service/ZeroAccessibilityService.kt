package org.zero.detox.service

import android.accessibilityservice.AccessibilityService
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.view.accessibility.AccessibilityWindowInfo
import android.view.inputmethod.InputMethodManager
import androidx.core.content.ContextCompat
import org.zero.detox.MainActivity
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.engage.EngageConfig
import org.zero.detox.engage.EngageConfigStore
import org.zero.detox.engage.EngageRuntimeEngine
import org.zero.detox.ui.TheVoidActivity
import java.util.ArrayDeque
import java.util.Locale

/**
 * ZeroAccessibilityService (Strict Zero App Guard — Phase 1 + Phase 2):
 * - Intercepts Settings, Package Installers, Status Bar / Quick Settings / App Switcher (Recents)
 * - Runs a single Looper.getMainLooper() 1000ms foreground ticker via EngageRuntimeEngine
 * - Renders brutalist #000000 TYPE_ACCESSIBILITY_OVERLAY screens (Hard Block, Cooldown, Friction,
 *   Short-Video Blocker, Scroll Intervention, Floating Nudge Banner)
 * - Debounces TYPE_WINDOW_CONTENT_CHANGED node inspection (<= 1 per 400ms via elapsedRealtime)
 * - Ignores SystemUI, Home Launchers, and IME keyboards so session timers stay intact
 */
class ZeroAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "ZeroAccessibility"
        private const val TICKER_INTERVAL_MS = 1000L
        private const val PACKAGE_CACHE_TTL_MS = 30_000L
        private const val SHORT_VIDEO_BACK_COOLDOWN_MS = 1200L
        private const val MAX_SNIFF_DEPTH = 20
        private const val MAX_SNIFF_NODES = 250

        private val SHORT_VIDEO_VIEW_IDS = listOf(
            "reel_player_page_container",
            "shorts_container",
            "clips_viewer_view_pager",
            "clips_viewer_root",
            "reel_watch_fragment_root",
            "reel_recycler",
            "shorts_player_container",
            "fb_shorts_viewer"
        )

        private val SHORT_VIDEO_CONTENT_DESCS = listOf(
            "remix this short",
            "like this short",
            "dislike this short",
            "shorts player",
            "remix this reel",
            "like this reel",
            "reels player"
        )
    }

    private val mainHandler = Handler(Looper.getMainLooper())

    private lateinit var bagStore: BagStore
    private lateinit var engageConfigStore: EngageConfigStore
    private lateinit var engageEngine: EngageRuntimeEngine
    private lateinit var overlayController: AccessibilityOverlayController

    private var isReceiverRegistered = false
    private var isTickerRunning = false
    private var syncedConfigRevision: Long = Long.MIN_VALUE
    private var synthesizedBagRevision: Long = Long.MIN_VALUE

    private var cachedImePackages: Set<String> = emptySet()
    private var cachedLauncherPackages: Set<String> = emptySet()
    private var cachedDialerPackages: Set<String> = emptySet()
    private var lastPackageCacheElapsed: Long = -PACKAGE_CACHE_TTL_MS
    private val appLabelCache = HashMap<String, String>()

    private var lastObservedAppPackage: String? = null
    private var lastVoidSnapElapsed: Long = 0L
    private var lastShortVideoActionElapsed: Long = 0L
    private var shortVideoGraceUntilElapsed: Long = 0L

    private val configBroadcastReceiver = object : BroadcastReceiver() {
        override fun onReceive(context: Context?, intent: Intent?) {
            val action = intent?.action ?: return
            val nowElapsed = SystemClock.elapsedRealtime()
            when (action) {
                EngageConfigStore.ACTION_ENGAGE_CONFIG_UPDATED -> {
                    syncedConfigRevision = Long.MIN_VALUE
                    synthesizedBagRevision = Long.MIN_VALUE
                    syncEngageConfig(force = true)
                    val timing = readActiveTiming(System.currentTimeMillis(), nowElapsed)
                    if (timing.isLocked && !timing.isExpired) {
                        startTickerIfNeeded()
                        val fgPkg = resolveActiveApplicationPackage()
                        if (!fgPkg.isNullOrBlank() && !TheVoidActivity.isInForeground) {
                            evaluateDecisionAndUpdateUi(fgPkg, nowElapsed)
                        }
                    }
                }
                EngageConfigStore.ACTION_ENGAGE_STOPPED -> {
                    val timing = readActiveTiming(System.currentTimeMillis(), nowElapsed)
                    if (!timing.isLocked || timing.isExpired) {
                        stopActiveEnforcement(resetEngine = true)
                    } else {
                        syncEngageConfig(force = true)
                    }
                }
            }
        }
    }

    private val tickerRunnable = object : Runnable {
        override fun run() {
            if (!isTickerRunning) return

            val nowWall = System.currentTimeMillis()
            val nowElapsed = SystemClock.elapsedRealtime()
            val timing = readActiveTiming(nowWall, nowElapsed)

            if (!timing.isLocked || timing.isExpired) {
                stopActiveEnforcement(resetEngine = true)
                return
            }

            refreshPackageCachesIfNeeded(nowElapsed)
            syncEngageConfig(force = false)

            if (TheVoidActivity.isInForeground) {
                lastObservedAppPackage = null
                overlayController.hideBlockingOverlay()
                overlayController.hideNudgeBanner()
                engageEngine.onForegroundTick(
                    foregroundPkg = packageName,
                    nowElapsedMs = nowElapsed,
                    imePackages = cachedImePackages,
                    launcherPackages = cachedLauncherPackages,
                    legacyBagAllowed = { bagStore.isPackageAllowedDuringLock(it) }
                )
            } else {
                val resolvedPkg = resolveActiveApplicationPackage()
                if (!resolvedPkg.isNullOrBlank()) {
                    if (resolvedPkg == "com.android.settings" || BagStore.PROTECTED_SYSTEM_PACKAGES.contains(resolvedPkg)) {
                        overlayController.hideBlockingOverlay()
                        performGlobalAction(GLOBAL_ACTION_BACK)
                        performGlobalAction(GLOBAL_ACTION_HOME)
                        snapToVoid(nowElapsed)
                    } else if (nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed &&
                        cachedDialerPackages.contains(resolvedPkg)
                    ) {
                        overlayController.hideBlockingOverlay()
                    } else {
                        evaluateDecisionAndUpdateUi(resolvedPkg, nowElapsed)
                    }
                }
            }

            if (isTickerRunning) {
                mainHandler.postDelayed(this, TICKER_INTERVAL_MS)
            }
        }
    }

    override fun onCreate() {
        super.onCreate()
        bagStore = BagStore(this)
        engageConfigStore = EngageConfigStore(this)
        engageEngine = EngageRuntimeEngine(packageName)
        overlayController = AccessibilityOverlayController(this)
        registerConfigReceiverIfNeeded()
    }

    override fun onServiceConnected() {
        super.onServiceConnected()
        registerConfigReceiverIfNeeded()
        val nowElapsed = SystemClock.elapsedRealtime()
        refreshPackageCachesIfNeeded(nowElapsed, force = true)
        val timing = readActiveTiming(System.currentTimeMillis(), nowElapsed)
        if (timing.isLocked && !timing.isExpired) {
            syncEngageConfig(force = true)
            startTickerIfNeeded()
        }
    }

    private fun registerConfigReceiverIfNeeded() {
        if (isReceiverRegistered) return
        try {
            val filter = IntentFilter().apply {
                addAction(EngageConfigStore.ACTION_ENGAGE_CONFIG_UPDATED)
                addAction(EngageConfigStore.ACTION_ENGAGE_STOPPED)
            }
            ContextCompat.registerReceiver(
                this,
                configBroadcastReceiver,
                filter,
                ContextCompat.RECEIVER_NOT_EXPORTED
            )
            isReceiverRegistered = true
        } catch (e: Exception) {
            Log.w(TAG, "Failed to register engage broadcast receiver", e)
        }
    }

    private fun readActiveTiming(nowWallMs: Long, nowElapsedMs: Long): LockEngine.LockTimingSnapshot {
        val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        return LockEngine.rebaseAfterRebootIfNeeded(prefs, nowWallMs, nowElapsedMs)
    }

    private fun syncEngageConfig(force: Boolean) {
        if (engageConfigStore.isActive()) {
            val rev = engageConfigStore.getRevision()
            if (force || rev != syncedConfigRevision || engageEngine.getConfig() == null) {
                val cfg = engageConfigStore.loadActiveConfig()
                if (cfg != null) {
                    engageEngine.configure(cfg, rev)
                    syncedConfigRevision = rev
                    synthesizedBagRevision = Long.MIN_VALUE
                    return
                }
            } else {
                return
            }
        }

        // Fallback when lock started without a separate Phase 2 JSON payload (legacy/upgraded BagStore session)
        val apps = bagStore.getBagApps()
        val allowSms = bagStore.isSmsAllowed()
        val bagId = bagStore.getActiveBagId()
        val bagName = bagStore.getActiveBagName()
        val synthSig = (bagId + "|" + bagName + "|" + allowSms + "|" + apps.joinToString(",") { it.packageName }).hashCode().toLong()
        if (!force && synthSig == synthesizedBagRevision && engageEngine.getConfig() != null) {
            return
        }

        val compulsory = HashSet<String>(cachedDialerPackages)
        if (compulsory.isEmpty()) {
            compulsory.addAll(bagStore.getAllowedDialerPackages())
        }
        if (allowSms) {
            compulsory.addAll(bagStore.getAllowedSmsPackages())
        }
        val appConfigs = LinkedHashMap<String, EngageConfig.AppRuleConfig>()
        for (app in apps) {
            appConfigs[app.packageName] = EngageConfig.AppRuleConfig(mode = EngageConfig.AccessMode.UNRESTRICTED)
        }
        val synthCfg = EngageConfig.SessionPayloadConfig(
            bagId = bagId,
            bagName = bagName,
            masterTimerSeconds = 0L,
            allowSms = allowSms,
            compulsoryPackages = compulsory,
            appConfigs = appConfigs,
            rawJson = "legacy_synth_$synthSig"
        )
        engageEngine.configure(synthCfg, -1L - kotlin.math.abs(synthSig % 1_000_000L))
        synthesizedBagRevision = synthSig
        syncedConfigRevision = Long.MIN_VALUE
    }

    private fun startTickerIfNeeded() {
        if (isTickerRunning) return
        isTickerRunning = true
        mainHandler.removeCallbacks(tickerRunnable)
        mainHandler.postDelayed(tickerRunnable, TICKER_INTERVAL_MS)
    }

    private fun stopActiveEnforcement(resetEngine: Boolean) {
        isTickerRunning = false
        mainHandler.removeCallbacks(tickerRunnable)
        overlayController.destroyAll()
        if (resetEngine) {
            engageEngine.reset()
            syncedConfigRevision = Long.MIN_VALUE
            synthesizedBagRevision = Long.MIN_VALUE
        }
        lastObservedAppPackage = null
    }

    private fun refreshPackageCachesIfNeeded(nowElapsed: Long, force: Boolean = false) {
        if (!force && nowElapsed - lastPackageCacheElapsed < PACKAGE_CACHE_TTL_MS) return
        lastPackageCacheElapsed = nowElapsed

        try {
            val imm = getSystemService(Context.INPUT_METHOD_SERVICE) as? InputMethodManager
            cachedImePackages = imm?.enabledInputMethodList
                ?.mapNotNull { it.packageName }
                ?.filter { it.isNotBlank() }
                ?.toSet()
                ?: emptySet()
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

        try {
            cachedDialerPackages = bagStore.getAllowedDialerPackages()
        } catch (_: Exception) {}
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val nowWall = System.currentTimeMillis()
        val nowElapsed = SystemClock.elapsedRealtime()
        val timing = readActiveTiming(nowWall, nowElapsed)
        if (!timing.isLocked || timing.isExpired) {
            stopActiveEnforcement(resetEngine = true)
            return
        }

        val eventPkg = event.packageName?.toString() ?: ""
        if (eventPkg.isBlank()) return

        refreshPackageCachesIfNeeded(nowElapsed)
        syncEngageConfig(force = false)
        startTickerIfNeeded()

        // 0. Ignore active soft keyboard (InputMethodService) events so typing never resets
        // controlled continuous timers or falsely triggers re-entry Mindful Friction.
        if (cachedImePackages.contains(eventPkg)) {
            return
        }

        // 1. Always block Settings & Package Installers immediately regardless of Bag configuration
        if (eventPkg == "com.android.settings" || BagStore.PROTECTED_SYSTEM_PACKAGES.contains(eventPkg)) {
            overlayController.hideBlockingOverlay()
            performGlobalAction(GLOBAL_ACTION_BACK)
            performGlobalAction(GLOBAL_ACTION_HOME)
            snapToVoid(nowElapsed)
            Log.w(TAG, "Blocked protected system settings/installer: $eventPkg")
            return
        }

        // 2. Intercept Status Bar, Quick Settings & Recents/Overview drawer; ignore benign SystemUI alerts
        if (eventPkg == "com.android.systemui") {
            val className = event.className?.toString() ?: ""
            val lowerClass = className.lowercase(Locale.US)
            if (lowerClass.contains("notification") ||
                lowerClass.contains("statusbar") ||
                lowerClass.contains("quicksettings") ||
                lowerClass.contains("panel") ||
                lowerClass.contains("qs") ||
                lowerClass.contains("recents") ||
                lowerClass.contains("overview")
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
                }
                performGlobalAction(GLOBAL_ACTION_BACK)
                overlayController.hideBlockingOverlay()
                snapToVoid(nowElapsed)
                Log.d(TAG, "Blocked SystemUI overlay ($className)")
            }
            return
        }

        // 3. Own package: either TheVoidActivity or our own TYPE_ACCESSIBILITY_OVERLAY views
        if (eventPkg == packageName) {
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED && TheVoidActivity.isInForeground) {
                lastObservedAppPackage = null
                overlayController.hideBlockingOverlay()
                overlayController.hideNudgeBanner()
                engageEngine.onForegroundTick(
                    foregroundPkg = packageName,
                    nowElapsedMs = nowElapsed,
                    imePackages = cachedImePackages,
                    launcherPackages = cachedLauncherPackages,
                    legacyBagAllowed = { bagStore.isPackageAllowedDuringLock(it) }
                )
            }
            return
        }

        // 4. Temporary Emergency Dialer grace (911/112) triggered from TheVoidActivity
        if (nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed && cachedDialerPackages.contains(eventPkg)) {
            overlayController.hideBlockingOverlay()
            return
        }

        // 5. Home Launchers: never corrupt controlled app timers in EngageRuntimeEngine,
        // and return user to TheVoidActivity if navigating to desktop outside brief launch grace
        if (cachedLauncherPackages.contains(eventPkg)) {
            if (event.eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED &&
                nowElapsed > TheVoidActivity.bagLaunchGraceUntilElapsed
            ) {
                overlayController.hideBlockingOverlay()
                snapToVoid(nowElapsed)
            }
            return
        }

        val eventType = event.eventType

        // 6. Immediate per-app mode / friction / quota / cooldown evaluation on window transitions
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED
        ) {
            lastObservedAppPackage = eventPkg
            evaluateDecisionAndUpdateUi(eventPkg, nowElapsed)
            return
        }

        // 7. Debounced Short-Video View Sniffing (max 1 inspection per 400ms via elapsedRealtime)
        if (eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (overlayController.isBlockingOverlayVisible()) return
            if (nowElapsed <= shortVideoGraceUntilElapsed) return
            if (nowElapsed - lastShortVideoActionElapsed < SHORT_VIDEO_BACK_COOLDOWN_MS) return

            val rule = engageEngine.getRuleForPackage(eventPkg) ?: return
            if (rule.mode != EngageConfig.AccessMode.CONTROLLED || !rule.blockShortVideos) return

            if (!engageEngine.shouldInspectWindowContent(nowElapsed)) return

            val root = try {
                rootInActiveWindow
            } catch (_: Exception) {
                null
            }
            if (detectShortVideoContainer(root, eventPkg)) {
                lastShortVideoActionElapsed = nowElapsed
                if (rule.shortVideoAction == EngageConfig.ShortVideoAction.BACK_ACTION) {
                    shortVideoGraceUntilElapsed = nowElapsed + SHORT_VIDEO_BACK_COOLDOWN_MS
                    performGlobalAction(GLOBAL_ACTION_BACK)
                } else {
                    overlayController.hideNudgeBanner()
                    val label = resolveAppLabel(eventPkg)
                    overlayController.showShortVideoOverlay(
                        pkg = eventPkg,
                        appLabel = label,
                        onLeaveShorts = {
                            shortVideoGraceUntilElapsed = SystemClock.elapsedRealtime() + 1500L
                            overlayController.hideBlockingOverlay()
                            performGlobalAction(GLOBAL_ACTION_BACK)
                        },
                        onExitToVoid = {
                            overlayController.hideBlockingOverlay()
                            snapToVoid(SystemClock.elapsedRealtime())
                        }
                    )
                }
            }
            return
        }

        // 8. Scroll Velocity Guard (10-second sliding ring buffer)
        if (eventType == AccessibilityEvent.TYPE_VIEW_SCROLLED) {
            if (overlayController.isBlockingOverlayVisible()) return
            val rule = engageEngine.getRuleForPackage(eventPkg) ?: return
            if (rule.mode != EngageConfig.AccessMode.CONTROLLED || rule.scrollVelocityLimit <= 0) return

            if (engageEngine.onScrollEvent(eventPkg, nowElapsed)) {
                overlayController.hideNudgeBanner()
                overlayController.showScrollInterventionOverlay(
                    pkg = eventPkg,
                    appLabel = resolveAppLabel(eventPkg),
                    scrollLimit = rule.scrollVelocityLimit,
                    onResumeAfterPause = {
                        engageEngine.clearScrollBuffer(eventPkg)
                        overlayController.hideBlockingOverlay()
                    },
                    onExitToVoid = {
                        engageEngine.clearScrollBuffer(eventPkg)
                        overlayController.hideBlockingOverlay()
                        snapToVoid(SystemClock.elapsedRealtime())
                    }
                )
            }
        }
    }

    private fun evaluateDecisionAndUpdateUi(fgPkg: String, nowElapsed: Long) {
        val decision = engageEngine.onForegroundTick(
            foregroundPkg = fgPkg,
            nowElapsedMs = nowElapsed,
            imePackages = cachedImePackages,
            launcherPackages = cachedLauncherPackages,
            legacyBagAllowed = { bagStore.isPackageAllowedDuringLock(it) }
        )
        val appLabel = resolveAppLabel(decision.packageName)

        when (decision.action) {
            EngageRuntimeEngine.TickAction.NONE -> {
                // SystemUI / Launcher / idle IME: preserve timers cleanly
            }
            EngageRuntimeEngine.TickAction.ALLOW -> {
                if (!overlayController.shouldKeepInAppInterventionFor(decision.packageName)) {
                    overlayController.hideBlockingOverlay()
                }
                val nudge = engageEngine.consumePendingNudge(decision.packageName)
                if (nudge != null && !overlayController.isBlockingOverlayVisible()) {
                    overlayController.showNudgeBanner(
                        appLabel = appLabel,
                        elapsedSec = nudge.continuousSeconds,
                        remainingQuotaSec = nudge.remainingQuotaSeconds
                    )
                }
            }
            EngageRuntimeEngine.TickAction.REQUIRE_FRICTION -> {
                val rule = decision.rule ?: return
                overlayController.hideNudgeBanner()
                overlayController.showFrictionOverlay(
                    pkg = decision.packageName,
                    appLabel = appLabel,
                    rule = rule,
                    onProceed = {
                        engageEngine.markFrictionPassed(decision.packageName, SystemClock.elapsedRealtime())
                        overlayController.hideBlockingOverlay()
                    },
                    onCancelToVoid = {
                        overlayController.hideBlockingOverlay()
                        snapToVoid(SystemClock.elapsedRealtime())
                    }
                )
            }
            EngageRuntimeEngine.TickAction.BLOCK_QUOTA -> {
                overlayController.hideNudgeBanner()
                overlayController.showHardBlockOverlay(
                    pkg = decision.packageName,
                    mode = AccessibilityOverlayController.OverlayMode.QUOTA_EXHAUSTED,
                    title = "BAG QUOTA EXHAUSTED",
                    body = "$appLabel has 0s left in your Bag quota and is now hard-blocked for the rest of this session.",
                    onExitToVoid = {
                        overlayController.hideBlockingOverlay()
                        snapToVoid(SystemClock.elapsedRealtime())
                    }
                )
            }
            EngageRuntimeEngine.TickAction.BLOCK_COOLDOWN -> {
                overlayController.hideNudgeBanner()
                overlayController.showCooldownOverlay(
                    pkg = decision.packageName,
                    appLabel = appLabel,
                    remainingCooldownSec = decision.cooldownRemainingSeconds,
                    onExitToVoid = {
                        overlayController.hideBlockingOverlay()
                        snapToVoid(SystemClock.elapsedRealtime())
                    }
                )
            }
            EngageRuntimeEngine.TickAction.BLOCK_HARD -> {
                overlayController.hideNudgeBanner()
                overlayController.showHardBlockOverlay(
                    pkg = decision.packageName,
                    mode = AccessibilityOverlayController.OverlayMode.HARD_BLOCK,
                    title = "APP HARD BLOCKED",
                    body = "$appLabel is blocked during this Bag focus session.",
                    onExitToVoid = {
                        overlayController.hideBlockingOverlay()
                        snapToVoid(SystemClock.elapsedRealtime())
                    }
                )
            }
        }
    }

    private fun resolveActiveApplicationPackage(): String? {
        var bestPkg: String? = null
        var bestPriority = Int.MIN_VALUE
        var hasImeWindow = false

        try {
            val windowList = windows
            if (!windowList.isNullOrEmpty()) {
                for (win in windowList) {
                    val winType = win.type
                    if (winType == AccessibilityWindowInfo.TYPE_INPUT_METHOD) {
                        hasImeWindow = true
                        continue
                    }
                    if (winType != AccessibilityWindowInfo.TYPE_APPLICATION) {
                        continue
                    }
                    var winRoot: AccessibilityNodeInfo? = null
                    val pkg = try {
                        winRoot = win.root
                        winRoot?.packageName?.toString()
                    } catch (_: Exception) {
                        null
                    } finally {
                        safeRecycle(winRoot)
                    }
                    if (pkg.isNullOrBlank() ||
                        pkg == "com.android.systemui" ||
                        cachedImePackages.contains(pkg)
                    ) {
                        continue
                    }
                    val priority = (if (win.isActive) 10_000 else 0) +
                        (if (win.isFocused) 5_000 else 0) +
                        win.layer
                    if (priority > bestPriority) {
                        bestPriority = priority
                        bestPkg = pkg
                    }
                }
            }
        } catch (_: Exception) {}

        if (!bestPkg.isNullOrBlank()) {
            if (!cachedLauncherPackages.contains(bestPkg)) {
                lastObservedAppPackage = bestPkg
            }
            return bestPkg
        }

        // If a focusable TYPE_ACCESSIBILITY_OVERLAY + IME keyboard temporarily hid the underlying
        // window root handle, preserve the overlay's target package cleanly so intent typing isn't interrupted.
        val overlayPkg = overlayController.getBlockingPackageName()
        if (overlayController.isBlockingOverlayVisible() && !overlayPkg.isNullOrBlank() && !TheVoidActivity.isInForeground) {
            return overlayPkg
        }

        val activeRoot = try {
            rootInActiveWindow
        } catch (_: Exception) {
            null
        }
        val activeRootPkg = try {
            activeRoot?.packageName?.toString()
        } finally {
            safeRecycle(activeRoot)
        }
        if (!activeRootPkg.isNullOrBlank() &&
            activeRootPkg != packageName &&
            activeRootPkg != "com.android.systemui" &&
            !cachedImePackages.contains(activeRootPkg)
        ) {
            if (!cachedLauncherPackages.contains(activeRootPkg)) {
                lastObservedAppPackage = activeRootPkg
            }
            return activeRootPkg
        }

        if (hasImeWindow || (!activeRootPkg.isNullOrBlank() && cachedImePackages.contains(activeRootPkg))) {
            return lastObservedAppPackage
        }

        return lastObservedAppPackage
    }

    private fun detectShortVideoContainer(root: AccessibilityNodeInfo?, targetPkg: String): Boolean {
        if (root == null) return false
        val rootPkg = root.packageName?.toString()
        if (rootPkg != targetPkg) {
            safeRecycle(root)
            return false
        }

        val stack = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        stack.addLast(Pair(root, 0))
        var visitedNodes = 0
        var detected = false

        try {
            while (stack.isNotEmpty() && visitedNodes < MAX_SNIFF_NODES) {
                val (node, depth) = stack.removeLast()
                visitedNodes++
                try {
                    val viewId = node.viewIdResourceName?.lowercase(Locale.US).orEmpty()
                    val contentDesc = node.contentDescription?.toString()?.lowercase(Locale.US).orEmpty()
                    val visible = node.isVisibleToUser

                    val idMatched = viewId.isNotEmpty() &&
                        visible &&
                        SHORT_VIDEO_VIEW_IDS.any { viewId.contains(it) }
                    val descMatched = contentDesc.isNotEmpty() &&
                        visible &&
                        SHORT_VIDEO_CONTENT_DESCS.any { contentDesc.contains(it) }

                    if (idMatched || descMatched) {
                        detected = true
                        break
                    }

                    if (depth < MAX_SNIFF_DEPTH) {
                        val childCount = node.childCount
                        for (i in 0 until childCount) {
                            val child = node.getChild(i) ?: continue
                            stack.addLast(Pair(child, depth + 1))
                        }
                    }
                } finally {
                    safeRecycle(node)
                }
            }
        } finally {
            while (stack.isNotEmpty()) {
                safeRecycle(stack.removeLast().first)
            }
        }

        return detected
    }

    @Suppress("DEPRECATION")
    private fun safeRecycle(node: AccessibilityNodeInfo?) {
        if (node == null) return
        try {
            node.recycle()
        } catch (_: Exception) {}
    }

    private fun resolveAppLabel(pkg: String): String {
        appLabelCache[pkg]?.let { return it }
        val resolved = try {
            val appInfo = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                packageManager.getApplicationInfo(pkg, PackageManager.ApplicationInfoFlags.of(0L))
            } else {
                @Suppress("DEPRECATION")
                packageManager.getApplicationInfo(pkg, 0)
            }
            packageManager.getApplicationLabel(appInfo)?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: pkg
        } catch (_: Exception) {
            pkg
        }
        appLabelCache[pkg] = resolved
        return resolved
    }

    private fun snapToVoid(nowElapsed: Long) {
        if (nowElapsed - lastVoidSnapElapsed < 180L) return
        lastVoidSnapElapsed = nowElapsed
        try {
            val voidIntent = Intent(this, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(voidIntent)
        } catch (_: Exception) {}
    }

    private fun cleanupServiceResources() {
        stopActiveEnforcement(resetEngine = true)
        if (isReceiverRegistered) {
            try {
                unregisterReceiver(configBroadcastReceiver)
            } catch (_: Exception) {}
            isReceiverRegistered = false
        }
        appLabelCache.clear()
    }

    override fun onInterrupt() {
        Log.w(TAG, "Accessibility service interrupted.")
        stopActiveEnforcement(resetEngine = false)
    }

    override fun onUnbind(intent: Intent?): Boolean {
        cleanupServiceResources()
        return super.onUnbind(intent)
    }

    override fun onDestroy() {
        cleanupServiceResources()
        super.onDestroy()
    }
}