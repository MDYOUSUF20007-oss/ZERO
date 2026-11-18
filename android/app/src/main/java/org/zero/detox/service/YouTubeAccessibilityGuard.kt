package org.zero.detox.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.Toast
import java.util.ArrayDeque
import java.util.Locale

/**
 * YouTubeAccessibilityGuard:
 * Regain-style native Accessibility guard for the official YouTube app (`com.google.android.youtube`).
 *
 * Capabilities:
 * 1. Multi-signal YouTube Shorts detection + 600ms debounced GLOBAL_ACTION_BACK exit.
 * 2. Official YouTube Study Mode: extracts active watch-page channel name (by view ID or
 *    Subscribe/Subscribed sibling fallback), matches deterministically against the synced
 *    ZeroTube whitelist (including truncated `...` names >= 8 chars), and avoids false positives
 *    during Fullscreen and Miniplayer transitions.
 * 3. Throttles TYPE_WINDOW_CONTENT_CHANGED scans to <= 1 per 350ms and never retains
 *    AccessibilityNodeInfo references across events.
 */
class YouTubeAccessibilityGuard(
    private val context: Context
) {
    data class GuardConfig(
        val blockOfficialShorts: Boolean = false,
        val strictOfficialStudyMode: Boolean = false,
        val whitelistedChannels: Set<String> = emptySet(),
        val revision: Long = 0L
    )

    private data class TreeScanResult(
        val isShortsVisible: Boolean,
        val hasWatchPlayerSignals: Boolean,
        val hasSubscribeButton: Boolean,
        val hasBottomNavBrowseSelected: Boolean,
        val isSearchActive: Boolean,
        val primaryChannelName: String?,
        val fallbackChannelName: String?
    ) {
        val isWatchPageMetadataVisible: Boolean
            get() = !isSearchActive &&
                !hasBottomNavBrowseSelected &&
                (hasWatchPlayerSignals || hasSubscribeButton) &&
                (primaryChannelName != null || (hasSubscribeButton && fallbackChannelName != null))
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private var cachedConfig: GuardConfig = loadConfig(context)

    // Throttling & debounce timestamps (SystemClock.elapsedRealtime() ms)
    private var lastContentScanElapsedMs: Long = -CONTENT_SCAN_THROTTLE_MS
    private var lastShortsBackElapsedMs: Long = -SHORTS_BACK_COOLDOWN_MS
    private var lastStudyBlockElapsedMs: Long = -STUDY_BLOCK_COOLDOWN_MS

    // Short in-memory session state to avoid Fullscreen / Miniplayer false positives
    @Volatile
    var lastVerifiedChannelAllowed: Boolean = false
        private set

    private var lastVerifiedChannelName: String? = null

    fun refreshConfigIfNeeded(): GuardConfig {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val rev = prefs.getLong(KEY_CONFIG_REVISION, 0L)
        if (rev != cachedConfig.revision) {
            cachedConfig = loadConfig(context)
        }
        return cachedConfig
    }

    fun isEnabled(): Boolean {
        val cfg = refreshConfigIfNeeded()
        return cfg.blockOfficialShorts || cfg.strictOfficialStudyMode
    }

    fun onPackageChanged(activePkg: String) {
        if (activePkg != YOUTUBE_PACKAGE) {
            lastVerifiedChannelAllowed = false
            lastVerifiedChannelName = null
        }
    }

    /**
     * Evaluates an accessibility event from `com.google.android.youtube`.
     * Returns `true` if a Shorts or Study Mode blocking action was triggered.
     */
    fun onYouTubeEvent(
        service: AccessibilityService,
        event: AccessibilityEvent,
        nowElapsedMs: Long
    ): Boolean {
        val cfg = refreshConfigIfNeeded()
        if (!cfg.blockOfficialShorts && !cfg.strictOfficialStudyMode) {
            return false
        }

        val eventType = event.eventType
        val isContentChanged = eventType == AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED
        val isWindowChanged = eventType == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED ||
            eventType == AccessibilityEvent.TYPE_WINDOWS_CHANGED

        if (!isContentChanged && !isWindowChanged) {
            return false
        }

        // Throttle TYPE_WINDOW_CONTENT_CHANGED tree scans to at most once per 350ms
        if (isContentChanged && nowElapsedMs - lastContentScanElapsedMs < CONTENT_SCAN_THROTTLE_MS) {
            return false
        }
        lastContentScanElapsedMs = nowElapsedMs

        val root = try {
            service.rootInActiveWindow
        } catch (_: Exception) {
            null
        } ?: return false

        val scanResult = scanYouTubeTree(root) ?: return false

        // 1. Official YouTube Shorts Blocker (600ms debounced GLOBAL_ACTION_BACK)
        if (cfg.blockOfficialShorts && scanResult.isShortsVisible) {
            if (nowElapsedMs - lastShortsBackElapsedMs >= SHORTS_BACK_COOLDOWN_MS) {
                lastShortsBackElapsedMs = nowElapsedMs
                Log.d(TAG, "YouTube Shorts detected — triggering debounced BACK action")
                service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
                return true
            }
            return false
        }

        // 2. Official YouTube Study Mode (Regain-style Channel Whitelist Guard)
        if (cfg.strictOfficialStudyMode) {
            // Only evaluate when watch-page metadata is visible; preserves session during
            // Fullscreen rotation, Miniplayer collapse, Home feed, or Search typing.
            if (!scanResult.isWatchPageMetadataVisible) {
                return false
            }

            val detectedChannel = scanResult.primaryChannelName ?: scanResult.fallbackChannelName
            if (detectedChannel.isNullOrBlank()) {
                // Channel node not positively identified (e.g., Fullscreen / loading) -> do NOT block
                return false
            }

            val allowed = isChannelWhitelisted(detectedChannel, cfg.whitelistedChannels)
            if (allowed) {
                lastVerifiedChannelAllowed = true
                lastVerifiedChannelName = detectedChannel
                return false
            }

            // Positively identified non-whitelisted channel on watch page -> block with 1200ms debounce
            lastVerifiedChannelAllowed = false
            lastVerifiedChannelName = detectedChannel
            if (nowElapsedMs - lastStudyBlockElapsedMs >= STUDY_BLOCK_COOLDOWN_MS) {
                lastStudyBlockElapsedMs = nowElapsedMs
                Log.d(TAG, "Blocked non-whitelisted YouTube channel: $detectedChannel")
                service.performGlobalAction(AccessibilityService.GLOBAL_ACTION_BACK)
                showBlockedToast(service.applicationContext, detectedChannel)
                return true
            }
        }

        return false
    }

    private fun showBlockedToast(appContext: Context, channelName: String) {
        val message = "Blocked by Study Mode: $channelName is not whitelisted"
        mainHandler.post {
            try {
                Toast.makeText(appContext, message, Toast.LENGTH_SHORT).show()
            } catch (_: Throwable) {
                // Ignore UI toast failures on background/restricted windows
            }
        }
    }

    /**
     * Single-pass bounded BFS traversal over the active YouTube window tree.
     * Recycles every visited AccessibilityNodeInfo in try/finally so zero nodes leak.
     */
    private fun scanYouTubeTree(root: AccessibilityNodeInfo): TreeScanResult? {
        val rootPkg = root.packageName?.toString()
        if (rootPkg != YOUTUBE_PACKAGE) {
            safeRecycle(root)
            return null
        }

        var isShortsVisible = false
        var hasWatchPlayerSignals = false
        var hasSubscribeButton = false
        var hasBottomNavBrowseSelected = false
        var isSearchActive = false
        var primaryChannelName: String? = null
        var fallbackChannelName: String? = null

        val queue = ArrayDeque<Pair<AccessibilityNodeInfo, Int>>()
        queue.addLast(Pair(root, 0))
        var visited = 0

        try {
            while (queue.isNotEmpty() && visited < MAX_SCAN_NODES) {
                val (node, depth) = queue.removeFirst()
                visited++

                try {
                    val visible = node.isVisibleToUser
                    val viewId = node.viewIdResourceName?.lowercase(Locale.ROOT).orEmpty()
                    val text = node.text?.toString()?.trim().orEmpty()
                    val desc = node.contentDescription?.toString()?.trim().orEmpty()

                    if (visible) {
                        // Signal A: Multi-signal YouTube Shorts containers
                        if (!isShortsVisible && isShortsNode(viewId, text, desc, node.isSelected)) {
                            isShortsVisible = true
                        }

                        // Signal B: Search bar active
                        if (!isSearchActive &&
                            (viewId == "com.google.android.youtube:id/search_edit_text" ||
                                viewId.endsWith(":id/search_edit_text")) &&
                            node.isFocused
                        ) {
                            isSearchActive = true
                        }

                        // Signal C: Bottom navigation tab selected on Browse (Home/Subscriptions/You)
                        if (!hasBottomNavBrowseSelected && node.isSelected) {
                            val tabLabel = (desc.ifEmpty { text }).lowercase(Locale.ROOT)
                            if (tabLabel == "home" ||
                                tabLabel == "subscriptions" ||
                                tabLabel == "you" ||
                                tabLabel == "library"
                            ) {
                                hasBottomNavBrowseSelected = true
                            }
                        }

                        // Signal D: Active Watch Page controls / metadata presence
                        if (!hasWatchPlayerSignals && isWatchPageViewId(viewId)) {
                            hasWatchPlayerSignals = true
                        }

                        // Signal E: Primary Channel Name View IDs
                        if (primaryChannelName == null && isChannelNameViewId(viewId)) {
                            val candidate = sanitizeExtractedChannelName(text.ifEmpty { desc })
                            if (candidate != null) {
                                primaryChannelName = candidate
                                hasWatchPlayerSignals = true
                            }
                        }

                        // Signal F: Subscribe / Subscribed button & resilient sibling fallback
                        if (isSubscribeButtonNode(viewId, text, desc)) {
                            hasSubscribeButton = true
                            if (primaryChannelName == null && fallbackChannelName == null) {
                                fallbackChannelName = extractChannelFromSubscribeDesc(desc)
                                    ?: extractChannelFromSubscribeSiblings(node)
                            }
                        }
                    }

                    if (depth < MAX_SCAN_DEPTH) {
                        val childCount = node.childCount
                        for (i in 0 until childCount) {
                            val child = node.getChild(i) ?: continue
                            queue.addLast(Pair(child, depth + 1))
                        }
                    }
                } finally {
                    safeRecycle(node)
                }
            }
        } finally {
            while (queue.isNotEmpty()) {
                safeRecycle(queue.removeFirst().first)
            }
        }

        return TreeScanResult(
            isShortsVisible = isShortsVisible,
            hasWatchPlayerSignals = hasWatchPlayerSignals,
            hasSubscribeButton = hasSubscribeButton,
            hasBottomNavBrowseSelected = hasBottomNavBrowseSelected,
            isSearchActive = isSearchActive,
            primaryChannelName = primaryChannelName,
            fallbackChannelName = fallbackChannelName
        )
    }

    private fun isShortsNode(
        viewId: String,
        text: String,
        desc: String,
        isSelected: Boolean
    ): Boolean {
        if (viewId.isNotEmpty()) {
            for (shortId in SHORTS_CONTAINER_IDS) {
                if (viewId == shortId || viewId.endsWith(shortId.substringAfter("com.google.android.youtube"))) {
                    return true
                }
            }
        }
        if (isSelected) {
            if (desc.equals("Shorts", ignoreCase = true) || text.equals("Shorts", ignoreCase = true)) {
                return true
            }
        }
        return false
    }

    private fun isWatchPageViewId(viewId: String): Boolean {
        if (viewId.isEmpty()) return false
        for (watchId in WATCH_PAGE_VIEW_IDS) {
            if (viewId.endsWith(watchId)) return true
        }
        return false
    }

    private fun isChannelNameViewId(viewId: String): Boolean {
        if (viewId.isEmpty()) return false
        for (channelId in CHANNEL_NAME_VIEW_IDS) {
            if (viewId == channelId || viewId.endsWith(channelId.substringAfter("com.google.android.youtube"))) {
                return true
            }
        }
        return false
    }

    private fun isSubscribeButtonNode(viewId: String, text: String, desc: String): Boolean {
        if (viewId.endsWith(":id/subscribe_button") || viewId.endsWith(":id/subscribe_button_container")) {
            return true
        }
        val lowerText = text.lowercase(Locale.ROOT)
        if (lowerText == "subscribe" || lowerText == "subscribed") {
            return true
        }
        val lowerDesc = desc.lowercase(Locale.ROOT)
        if (lowerDesc == "subscribe" ||
            lowerDesc == "subscribed" ||
            lowerDesc.startsWith("subscribe to ") ||
            lowerDesc.startsWith("subscribed to ") ||
            lowerDesc.startsWith("unsubscribe from ")
        ) {
            return true
        }
        return false
    }

    /**
     * Fallback Heuristic:
     * Inspects siblings under the Subscribe button's parent (and grandparent if needed)
     * to read the adjacent TextView holding the channel name, recycling all transient nodes.
     */
    private fun extractChannelFromSubscribeSiblings(subscribeNode: AccessibilityNodeInfo): String? {
        var current: AccessibilityNodeInfo? = subscribeNode.parent
        var levelsUp = 0
        try {
            while (current != null && levelsUp < 2) {
                val found = findChannelNameInContainer(current)
                if (found != null) {
                    return found
                }
                val nextParent = current.parent
                safeRecycle(current)
                current = nextParent
                levelsUp++
            }
        } finally {
            safeRecycle(current)
        }
        return null
    }

    private fun findChannelNameInContainer(container: AccessibilityNodeInfo): String? {
        val childCount = container.childCount
        for (i in 0 until childCount) {
            val child = container.getChild(i) ?: continue
            try {
                if (!child.isVisibleToUser) continue
                val cls = child.className?.toString().orEmpty()
                val text = child.text?.toString()?.trim().orEmpty()
                val desc = child.contentDescription?.toString()?.trim().orEmpty()

                if (cls.endsWith("TextView") || text.isNotEmpty()) {
                    val candidate = sanitizeExtractedChannelName(text.ifEmpty { desc })
                    if (candidate != null) {
                        return candidate
                    }
                }

                // Check one nested row container (YouTube often wraps channel name + sub count in a LinearLayout/ViewGroup)
                val nestedCount = child.childCount
                for (j in 0 until minOf(nestedCount, 6)) {
                    val grandChild = child.getChild(j) ?: continue
                    try {
                        if (!grandChild.isVisibleToUser) continue
                        val gCls = grandChild.className?.toString().orEmpty()
                        val gText = grandChild.text?.toString()?.trim().orEmpty()
                        val gDesc = grandChild.contentDescription?.toString()?.trim().orEmpty()
                        if (gCls.endsWith("TextView") || gText.isNotEmpty()) {
                            val candidate = sanitizeExtractedChannelName(gText.ifEmpty { gDesc })
                            if (candidate != null) {
                                return candidate
                            }
                        }
                    } finally {
                        safeRecycle(grandChild)
                    }
                }
            } finally {
                safeRecycle(child)
            }
        }
        return null
    }

    @Suppress("DEPRECATION")
    private fun safeRecycle(node: AccessibilityNodeInfo?) {
        if (node == null) return
        try {
            node.recycle()
        } catch (_: Exception) {}
    }

    companion object {
        private const val TAG = "YouTubeGuard"

        const val YOUTUBE_PACKAGE = "com.google.android.youtube"
        const val PREFS_NAME = "zero_noise_yt_guard_prefs"
        const val KEY_BLOCK_OFFICIAL_SHORTS = "block_official_shorts"
        const val KEY_STRICT_OFFICIAL_STUDY_MODE = "strict_official_study_mode"
        const val KEY_WHITELISTED_CHANNELS = "whitelisted_channels"
        const val KEY_CONFIG_REVISION = "config_revision"

        const val CONTENT_SCAN_THROTTLE_MS = 350L
        const val SHORTS_BACK_COOLDOWN_MS = 600L
        const val STUDY_BLOCK_COOLDOWN_MS = 1200L
        const val MIN_TRUNCATED_PREFIX_LEN = 8

        private const val MAX_SCAN_DEPTH = 24
        private const val MAX_SCAN_NODES = 350

        private val SHORTS_CONTAINER_IDS = listOf(
            "com.google.android.youtube:id/reel_recycler",
            "com.google.android.youtube:id/reel_player_page_container",
            "com.google.android.youtube:id/reel_watch_fragment_root"
        )

        private val CHANNEL_NAME_VIEW_IDS = listOf(
            "com.google.android.youtube:id/channel_name",
            "com.google.android.youtube:id/owner_text",
            "com.google.android.youtube:id/channel_title"
        )

        private val WATCH_PAGE_VIEW_IDS = listOf(
            ":id/watch_player",
            ":id/player_view",
            ":id/watch_while_time_bar_view",
            ":id/watch_list",
            ":id/video_metadata_layout",
            ":id/slim_video_metadata",
            ":id/subscribe_button",
            ":id/channel_name",
            ":id/owner_text",
            ":id/channel_title"
        )

        private val IGNORED_UI_LABELS = setOf(
            "subscribe",
            "subscribed",
            "unsubscribe",
            "join",
            "share",
            "download",
            "save",
            "clip",
            "remix",
            "thanks",
            "comments",
            "live chat",
            "like",
            "dislike",
            "report",
            "more",
            "all",
            "related",
            "home",
            "shorts",
            "subscriptions",
            "you",
            "library",
            "notifications"
        )

        private val WHITESPACE_REGEX = Regex("\\s+")
        private val SUBSCRIBER_COUNT_ONLY_REGEX = Regex(
            "^\\d+(?:[.,]\\d+)?\\s*[kmb]?\\s*(?:subscribers?|subs?|views?|likes?|comments?)?$",
            RegexOption.IGNORE_CASE
        )
        private val TRAILING_SUBSCRIBER_META_REGEX = Regex(
            ",?\\s*\\d+(?:[.,]\\d+)?\\s*[kmb]?\\s*subscribers?.*$",
            RegexOption.IGNORE_CASE
        )
        private val SUBSCRIBE_TO_DESC_REGEX = Regex(
            "^(?:subscribe to|subscribed to|unsubscribe from)\\s+(.+?)\\.?$",
            RegexOption.IGNORE_CASE
        )
        private val GO_TO_CHANNEL_REGEX = Regex(
            "^go to channel\\s+(.+)$",
            RegexOption.IGNORE_CASE
        )

        @JvmStatic
        fun saveConfig(
            context: Context,
            blockOfficialShorts: Boolean,
            strictOfficialStudyMode: Boolean,
            whitelistedChannels: Collection<String>
        ): GuardConfig {
            val normalizedSet = LinkedHashSet<String>()
            for (entry in whitelistedChannels) {
                val norm = normalizeIdentifier(entry)
                if (norm.isNotEmpty()) {
                    normalizedSet.add(norm)
                }
            }
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val nextRev = prefs.getLong(KEY_CONFIG_REVISION, 0L) + 1L
            prefs.edit()
                .putBoolean(KEY_BLOCK_OFFICIAL_SHORTS, blockOfficialShorts)
                .putBoolean(KEY_STRICT_OFFICIAL_STUDY_MODE, strictOfficialStudyMode)
                .putStringSet(KEY_WHITELISTED_CHANNELS, normalizedSet)
                .putLong(KEY_CONFIG_REVISION, nextRev)
                .apply()

            return GuardConfig(
                blockOfficialShorts = blockOfficialShorts,
                strictOfficialStudyMode = strictOfficialStudyMode,
                whitelistedChannels = normalizedSet,
                revision = nextRev
            )
        }

        @JvmStatic
        fun loadConfig(context: Context): GuardConfig {
            val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            val rawSet = prefs.getStringSet(KEY_WHITELISTED_CHANNELS, emptySet()).orEmpty()
            val normalizedSet = HashSet<String>(rawSet.size)
            for (item in rawSet) {
                val norm = normalizeIdentifier(item)
                if (norm.isNotEmpty()) normalizedSet.add(norm)
            }
            return GuardConfig(
                blockOfficialShorts = prefs.getBoolean(KEY_BLOCK_OFFICIAL_SHORTS, false),
                strictOfficialStudyMode = prefs.getBoolean(KEY_STRICT_OFFICIAL_STUDY_MODE, false),
                whitelistedChannels = normalizedSet,
                revision = prefs.getLong(KEY_CONFIG_REVISION, 0L)
            )
        }

        @JvmStatic
        fun normalizeIdentifier(raw: String?): String {
            val trimmed = raw?.trim().orEmpty()
            if (trimmed.isEmpty()) return ""
            return WHITESPACE_REGEX.replace(trimmed.lowercase(Locale.ROOT), " ")
        }

        /**
         * Extracts channel name from accessibility description like "Subscribe to 3Blue1Brown."
         */
        @JvmStatic
        fun extractChannelFromSubscribeDesc(desc: String?): String? {
            val trimmed = desc?.trim().orEmpty()
            if (trimmed.isEmpty()) return null
            val match = SUBSCRIBE_TO_DESC_REGEX.find(trimmed) ?: return null
            return sanitizeExtractedChannelName(match.groupValues[1])
        }

        /**
         * Cleans raw text/contentDescription from a YouTube channel node and filters out
         * non-channel UI labels, subscriber counters, and action buttons.
         */
        @JvmStatic
        fun sanitizeExtractedChannelName(raw: String?): String? {
            var text = raw?.trim().orEmpty()
            if (text.isEmpty()) return null

            val goToMatch = GO_TO_CHANNEL_REGEX.find(text)
            if (goToMatch != null) {
                text = goToMatch.groupValues[1].trim()
            }

            // Strip trailing subscriber count metadata (e.g. "3Blue1Brown, 6.2M subscribers")
            text = TRAILING_SUBSCRIBER_META_REGEX.replace(text, "").trim().trimEnd(',', '·', '-')
            if (text.length < 2 || text.length > 100) return null

            val lower = text.lowercase(Locale.ROOT)
            if (IGNORED_UI_LABELS.contains(lower)) return null
            if (SUBSCRIBER_COUNT_ONLY_REGEX.matches(lower)) return null
            if (lower.startsWith("subscribe") || lower.startsWith("unsubscribe")) return null
            if (lower.endsWith(" ago") || lower.endsWith(" views")) return null

            return text
        }

        /**
         * Deterministic channel whitelist comparison (pure & JVM-testable):
         * - Case-insensitive, trimmed, whitespace-normalized exact match against saved channel names & @handles
         * - Handles truncated YouTube UI names ending with `...` or `…` via prefix match when prefix length >= 8 chars
         */
        @JvmStatic
        fun isChannelWhitelisted(
            detectedChannelName: String?,
            whitelistedChannels: Collection<String>
        ): Boolean {
            if (whitelistedChannels.isEmpty()) return false
            val detectedNorm = normalizeIdentifier(detectedChannelName)
            if (detectedNorm.isEmpty()) return false

            val detectedWithoutAt = detectedNorm.removePrefix("@")
            val isDetectedTruncated = detectedNorm.endsWith("...") || detectedNorm.endsWith("…")
            val detectedPrefix = if (isDetectedTruncated) {
                detectedNorm.removeSuffix("...").removeSuffix("…").trim()
            } else {
                ""
            }
            val detectedPrefixNoAt = detectedPrefix.removePrefix("@")

            for (rawEntry in whitelistedChannels) {
                val entryNorm = normalizeIdentifier(rawEntry)
                if (entryNorm.isEmpty()) continue
                val entryWithoutAt = entryNorm.removePrefix("@")

                // 1. Exact case-insensitive normalized match (including @handle match)
                if (detectedNorm == entryNorm || detectedWithoutAt == entryWithoutAt) {
                    return true
                }

                // 2. Truncated UI channel name prefix match (when non-ellipsis prefix >= 8 chars)
                if (isDetectedTruncated && detectedPrefix.length >= MIN_TRUNCATED_PREFIX_LEN) {
                    if (entryNorm.startsWith(detectedPrefix) ||
                        (detectedPrefixNoAt.length >= MIN_TRUNCATED_PREFIX_LEN &&
                            entryWithoutAt.startsWith(detectedPrefixNoAt))
                    ) {
                        return true
                    }
                }
            }
            return false
        }
    }
}
