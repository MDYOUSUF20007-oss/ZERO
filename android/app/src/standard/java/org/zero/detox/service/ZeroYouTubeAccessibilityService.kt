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
 * ZeroYouTubeAccessibilityService (Normal / Standard Edition):
 * Everyday focus guard providing:
 * 1. Official YouTube Shorts Blocker & Official YouTube Study Mode (24/7, even outside locks)
 * 2. Instagram Reels / Short-Video Blocker during active focus/Bag sessions
 * 3. Doomscroll Brake (scroll velocity intervention), per-app time limits (quotas),
 *    cooldowns, and Mindful Friction ("Pause & Breathe") during active focus sessions
 *
 * Unlike Strict Edition (`ZeroAccessibilityService`), this intentionally does NOT lock down
 * Notification Shade, Quick Settings, Recents switcher, or Phone Settings.
 */
class ZeroYouTubeAccessibilityService : AccessibilityService() {

    companion object {
        private const val TAG = "ZeroStandardGuard"
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
    private lateinit var youTubeGuard: YouTubeAccessibilityGuard

    private var isReceiverRegistered = false
    private var isTickerRunning = false
    private var syncedConfigRevision: Long = Long.MIN_VALUE
    private var synthesizedBagRevision: Long = Long.MIN_VALUE

    private var cachedImePackages: Set<String> = emptySet()
    private var cachedLauncherPackages: Set<String> = emptySet()
    private var cachedDialerPackages: Set<String> = emptySet()
    private var cachedPaymentPackages: Set<String> = emptySet()
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
                if (!resolvedPkg.isNullOrBlank() &&
                    resolvedPkg != "com.android.settings" &&
                    !BagStore.PROTECTED_SYSTEM_PACKAGES.contains(resolvedPkg)
                ) {
                    if (nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed &&
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
        youTubeGuard = YouTubeAccessibilityGuard(this)
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

        val apps = bagStore.getBagApps()
        val allowSms = bagStore.isSmsAllowed()
        val bagId = bagStore.getActiveBagId()
        val bagName = bagStore.getActiveBagName()
        val synthSig = (bagId + "|" + bagName + "|" + allowSms + "|" + apps.joinToString(",") { it.packageName }).hashCode().toLong()
        if (!force && synthSig == synthesizedBagRevision && engageEngine.getConfig() != null) {
            return
        }

        val compulsory = HashSet<String>(cachedDialerPackages)
        compulsory.addAll(cachedPaymentPackages)
        if (compulsory.isEmpty()) {
            compulsory.addAll(bagStore.getAllowedDialerPackages())
            compulsory.addAll(bagStore.getAllowedPaymentPackages())
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
            cachedPaymentPackages = bagStore.getAllowedPaymentPackages()
        } catch (_: Exception) {}
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val nowWall = System.currentTimeMillis()
        val nowElapsed = SystemClock.elapsedRealtime()
        val eventPkg = event.packageName?.toString() ?: ""

        if (eventPkg.isNotBlank()) {
            refreshPackageCachesIfNeeded(nowElapsed)
            if (!cachedImePackages.contains(eventPkg) && eventPkg != "com.android.systemui") {
                youTubeGuard.onPackageChanged(eventPkg)
            }
        }

        val timing = readActiveTiming(nowWall, nowElapsed)
        if (!timing.isLocked || timing.isExpired) {
            if (isTickerRunning || overlayController.isBlockingOverlayVisible()) {
                stopActiveEnforcement(resetEngine = true)
            }
            // Official YouTube Shorts Blocker & Study Mode work 24/7 even outside locks
            if (eventPkg == YouTubeAccessibilityGuard.YOUTUBE_PACKAGE) {
                youTubeGuard.onYouTubeEvent(this, event, nowElapsed)
            }
            return
        }

        if (eventPkg.isBlank()) return

        syncEngageConfig(force = false)
        startTickerIfNeeded()

        // Ignore keyboards, SystemUI (Notification shade / Quick Settings / Recents), Settings,
        // Dialers, Payment apps, and Launchers in Normal edition (no heavy OS lockdown)
        if (cachedImePackages.contains(eventPkg) ||
            eventPkg == "com.android.systemui" ||
            eventPkg == "com.android.settings" ||
            BagStore.PROTECTED_SYSTEM_PACKAGES.contains(eventPkg)
        ) {
            return
        }

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

        if (cachedDialerPackages.contains(eventPkg) || cachedPaymentPackages.contains(eventPkg)) {
            overlayController.hideBlockingOverlay()
            overlayController.hideNudgeBanner()
            return
        }

        if (cachedLauncherPackages.contains(eventPkg)) {
            return
        }

        val eventType = event.eventType

        // 1. Per-app Quota / Cooldown / Mindful Friction evaluation on window transitions
        if (eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED
        ) {
            lastObservedAppPackage = eventPkg
            evaluateDecisionAndUpdateUi(eventPkg, nowElapsed)
            if (eventPkg == YouTubeAccessibilityGuard.YOUTUBE_PACKAGE && !overlayController.isBlockingOverlayVisible()) {
                youTubeGuard.onYouTubeEvent(this, event, nowElapsed)
            }
            return
        }

        // 2. Official YouTube Guard + Instagram Reels / Short-Video Blocker
        if (eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED) {
            if (overlayController.isBlockingOverlayVisible()) return

            if (eventPkg == YouTubeAccessibilityGuard.YOUTUBE_PACKAGE &&
                youTubeGuard.onYouTubeEvent(this, event, nowElapsed)
            ) {
                return
            }

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

        // 3. Doomscroll Brake (Scroll Velocity Guard)
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
            EngageRuntimeEngine.TickAction.NONE -> {}
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
                    if (winType != AccessibilityWindowInfo.TYPE_APPLICATION) continue
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
        Log.w(TAG, "Standard focus accessibility service interrupted.")
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
