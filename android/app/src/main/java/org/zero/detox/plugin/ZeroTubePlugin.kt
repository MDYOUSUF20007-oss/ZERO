package org.zero.detox.plugin

import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.cancel
import kotlinx.coroutines.launch
import org.json.JSONObject
import org.schabi.newpipe.extractor.InfoItem
import org.schabi.newpipe.extractor.MediaFormat
import org.schabi.newpipe.extractor.NewPipe
import org.schabi.newpipe.extractor.ServiceList
import org.schabi.newpipe.extractor.channel.ChannelInfo
import org.schabi.newpipe.extractor.localization.ContentCountry
import org.schabi.newpipe.extractor.localization.Localization
import org.schabi.newpipe.extractor.stream.StreamInfo
import org.schabi.newpipe.extractor.stream.StreamInfoItem
import org.schabi.newpipe.extractor.stream.StreamType
import org.zero.detox.service.YouTubeAccessibilityGuard
import java.net.URI
import java.util.Locale
import java.util.concurrent.atomic.AtomicBoolean

/**
 * ZeroTubePlugin:
 * Native local NewPipeExtractor (v0.27.1) Capacitor plugin providing:
 * 1. Deterministic whitelist-locked YouTube search (stripping Shorts < 120s, Mixes, and Ads)
 * 2. Deterministic channel identity resolution ({ id: UC..., handle: @..., name, url })
 * 3. Direct ad-free .googlevideo.com stream extraction (muxed MP4, audio M4A, live HLS)
 */
@CapacitorPlugin(name = "ZeroTube")
class ZeroTubePlugin : Plugin() {

    private val pluginScope = CoroutineScope(SupervisorJob() + Dispatchers.IO)

    private data class WhitelistEntry(
        val id: String,
        val handle: String,
        val normalizedName: String,
        val url: String
    )

    override fun load() {
        super.load()
        ensureNewPipeInitialized()
    }

    override fun handleOnDestroy() {
        pluginScope.cancel()
        super.handleOnDestroy()
    }

    private fun ensureNewPipeInitialized() {
        if (newPipeInitialized.compareAndSet(false, true)) {
            try {
                NewPipe.init(
                    ZeroTubeDownloader.getInstance(),
                    Localization("en", "IN"),
                    ContentCountry("IN")
                )
            } catch (t: Throwable) {
                newPipeInitialized.set(false)
                Log.e(TAG, "Failed to initialize NewPipeExtractor", t)
            }
        }
    }

    /**
     * Method 1: searchVideos
     * Queries ServiceList.YouTube.getSearchExtractor(query) on Dispatchers.IO,
     * strips Shorts (< 120s), Mixes, Channels, Playlists, and Ads, and strictly pre-filters
     * against the deterministic channel whitelist passed from React.
     */
    @PluginMethod
    fun searchVideos(call: PluginCall) {
        val rawQuery = call.getString("query")?.trim().orEmpty()
        if (rawQuery.isEmpty()) {
            call.reject("Search query is required.", "INVALID_QUERY")
            return
        }

        val whitelist = parseWhitelist(call.getArray("whitelistedChannels"))
        if (whitelist.isEmpty()) {
            call.resolve(JSObject().apply {
                put("videos", JSArray())
                put("scannedCount", 0)
            })
            return
        }

        pluginScope.launch {
            try {
                ensureNewPipeInitialized()
                val extractor = ServiceList.YouTube.getSearchExtractor(rawQuery)
                extractor.fetchPage()

                val results = JSArray()
                val seenVideoIds = HashSet<String>()
                var scannedCount = 0

                fun processItems(items: List<InfoItem>) {
                    for (item in items) {
                        // Only StreamInfoItem passes; Channels, Playlists, Mixes, and Ads are stripped
                        if (item !is StreamInfoItem) continue
                        scannedCount++

                        // Strip Shorts (< 120 seconds or short-form content flag / /shorts/ URL)
                        val itemUrl = item.url.orEmpty()
                        if (item.isShortFormContent || isShortUrl(itemUrl)) continue

                        val isLive = item.streamType == StreamType.LIVE_STREAM ||
                            item.streamType == StreamType.AUDIO_LIVE_STREAM
                        val durationSec = item.duration
                        if (!isLive && durationSec >= 0L && durationSec < MIN_FULL_LENGTH_SECONDS) {
                            continue
                        }

                        val uploaderUrl = item.uploaderUrl.orEmpty()
                        val uploaderName = item.uploaderName.orEmpty()
                        val uploaderChannelId = extractChannelId(uploaderUrl)
                        val uploaderHandle = extractChannelHandle(uploaderUrl)

                        if (!matchesWhitelist(uploaderChannelId, uploaderHandle, uploaderName, whitelist)) {
                            continue
                        }

                        val videoId = extractVideoId(itemUrl) ?: continue
                        if (!seenVideoIds.add(videoId)) continue

                        val thumbUrl = bestThumbnailUrl(item.thumbnails)

                        val videoObj = JSObject().apply {
                            put("videoId", videoId)
                            put("url", itemUrl)
                            put("title", item.name.orEmpty())
                            put("uploaderName", uploaderName)
                            put("uploaderUrl", uploaderUrl)
                            put("uploaderChannelId", uploaderChannelId)
                            put("uploaderHandle", uploaderHandle)
                            put("duration", durationSec)
                            put("thumbnailUrl", thumbUrl)
                            put("viewCount", item.viewCount)
                            put("textualUploadDate", item.textualUploadDate.orEmpty())
                            put("isLive", isLive)
                        }
                        results.put(videoObj)
                    }
                }

                val initialPage = extractor.initialPage
                processItems(initialPage.items)

                // Fetch up to 1 additional page if initial page produced few whitelisted matches
                if (results.length() < 8 && initialPage.hasNextPage()) {
                    try {
                        val nextPage = extractor.getPage(initialPage.nextPage)
                        processItems(nextPage.items)
                    } catch (t: Throwable) {
                        Log.w(TAG, "Secondary search page skipped: ${t.message}")
                    }
                }

                call.resolve(JSObject().apply {
                    put("videos", results)
                    put("scannedCount", scannedCount)
                })
            } catch (t: Throwable) {
                Log.e(TAG, "searchVideos failed for query=$rawQuery", t)
                call.reject(t.message ?: "YouTube search extraction failed.", "SEARCH_ERROR")
            }
        }
    }

    /**
     * Method 2: resolveChannel
     * Resolves a study channel from an @handle, channel URL, UC... ID, or sample video URL
     * and returns all normalized identifiers: { id (UC...), handle (@...), name, url }.
     * When a video URL is supplied, also returns video metadata for instant whitelist verification.
     */
    @PluginMethod
    fun resolveChannel(call: PluginCall) {
        val rawInput = call.getString("input")?.trim().orEmpty()
        if (rawInput.isEmpty()) {
            call.reject("Channel handle, channel URL, or video URL is required.", "INVALID_INPUT")
            return
        }

        pluginScope.launch {
            try {
                ensureNewPipeInitialized()

                var videoId: String? = null
                var videoTitle: String? = null
                var videoDuration: Long? = null
                var videoThumbnailUrl: String? = null
                var isShortVideo = isShortUrl(rawInput)
                var isLiveVideo = false

                val parsedVideoId = extractVideoId(rawInput)
                var targetChannelUrl: String? = null
                var fallbackUploaderName = ""

                if (parsedVideoId != null) {
                    val canonicalVideoUrl = "https://www.youtube.com/watch?v=$parsedVideoId"
                    val streamInfo = StreamInfo.getInfo(ServiceList.YouTube, canonicalVideoUrl)
                    videoId = streamInfo.id.orEmpty().ifBlank { parsedVideoId }
                    videoTitle = streamInfo.name.orEmpty()
                    videoDuration = streamInfo.duration
                    videoThumbnailUrl = bestThumbnailUrl(streamInfo.thumbnails)
                    isLiveVideo = streamInfo.streamType == StreamType.LIVE_STREAM ||
                        streamInfo.streamType == StreamType.AUDIO_LIVE_STREAM
                    if (streamInfo.isShortFormContent ||
                        (!isLiveVideo && streamInfo.duration in 0L until MIN_FULL_LENGTH_SECONDS)
                    ) {
                        isShortVideo = true
                    }
                    targetChannelUrl = streamInfo.uploaderUrl
                    fallbackUploaderName = streamInfo.uploaderName.orEmpty()
                } else {
                    targetChannelUrl = normalizeChannelInputToUrl(rawInput)
                }

                if (targetChannelUrl.isNullOrBlank()) {
                    call.reject("Could not parse a valid YouTube channel or video URL.", "INVALID_URL")
                    return@launch
                }

                val channelInfo = ChannelInfo.getInfo(ServiceList.YouTube, targetChannelUrl)
                val resolvedId = resolveCanonicalChannelId(channelInfo, targetChannelUrl, rawInput)
                val channelInfoUrl = channelInfo.url.orEmpty()
                val resolvedUrl = when {
                    resolvedId.startsWith("UC") -> "https://www.youtube.com/channel/$resolvedId"
                    channelInfoUrl.isNotBlank() -> channelInfoUrl
                    else -> targetChannelUrl
                }
                val resolvedName = channelInfo.name.orEmpty().ifBlank { fallbackUploaderName }
                var resolvedHandle = firstNonBlank(
                    extractChannelHandle(rawInput),
                    extractChannelHandle(channelInfo.originalUrl),
                    extractChannelHandle(channelInfo.url),
                    extractChannelHandle(targetChannelUrl)
                )
                if (resolvedHandle.isEmpty() && resolvedUrl.isNotBlank()) {
                    resolvedHandle = fetchCanonicalHandleFromPage(resolvedUrl)
                }

                val avatarUrl = bestThumbnailUrl(channelInfo.avatars)

                val result = JSObject().apply {
                    put("id", resolvedId)
                    put("handle", resolvedHandle)
                    put("name", resolvedName)
                    put("url", resolvedUrl)
                    put("avatarUrl", avatarUrl)
                    if (videoId != null) {
                        put("videoId", videoId)
                        put("videoTitle", videoTitle.orEmpty())
                        put("videoDuration", videoDuration ?: -1L)
                        put("videoThumbnailUrl", videoThumbnailUrl.orEmpty())
                        put("isShort", isShortVideo)
                        put("isLive", isLiveVideo)
                    }
                }
                call.resolve(result)
            } catch (t: Throwable) {
                Log.e(TAG, "resolveChannel failed for input=$rawInput", t)
                call.reject(t.message ?: "Failed to resolve YouTube channel.", "RESOLVE_ERROR")
            }
        }
    }

    /**
     * Method 3: getStream
     * Runs StreamInfo.getInfo(ServiceList.YouTube, videoUrl) on Dispatchers.IO and returns
     * direct .googlevideo.com muxedStreams (MP4 360p/720p), audioStreams (M4A), and hlsUrl.
     */
    @PluginMethod
    fun getStream(call: PluginCall) {
        val rawUrlOrId = (call.getString("videoUrl") ?: call.getString("videoId"))?.trim().orEmpty()
        if (rawUrlOrId.isEmpty()) {
            call.reject("videoUrl or videoId is required.", "INVALID_VIDEO")
            return
        }

        val parsedId = extractVideoId(rawUrlOrId)
        val canonicalUrl = if (parsedId != null) {
            "https://www.youtube.com/watch?v=$parsedId"
        } else {
            rawUrlOrId
        }

        pluginScope.launch {
            try {
                ensureNewPipeInitialized()
                val streamInfo = StreamInfo.getInfo(ServiceList.YouTube, canonicalUrl)

                val muxedArray = JSArray()
                val muxedList = streamInfo.videoStreams.orEmpty()
                    .filter { it.isUrl && !it.isVideoOnly && !it.content.isNullOrBlank() }
                    .sortedWith(
                        compareByDescending<org.schabi.newpipe.extractor.stream.VideoStream> {
                            it.format == MediaFormat.MPEG_4
                        }.thenByDescending {
                            it.height.takeIf { h -> h > 0 } ?: parseResolutionHeight(it.resolution)
                        }
                    )

                for (stream in muxedList) {
                    val formatName = stream.format?.getSuffix() ?: stream.format?.getName() ?: "mp4"
                    val mimeType = stream.format?.getMimeType() ?: "video/mp4"
                    val resolvedHeight = stream.height.takeIf { it > 0 } ?: parseResolutionHeight(stream.resolution)
                    muxedArray.put(JSObject().apply {
                        put("url", stream.content.orEmpty())
                        put("resolution", stream.resolution.orEmpty())
                        put("height", resolvedHeight)
                        put("format", formatName)
                        put("mimeType", mimeType)
                        put("bitrate", stream.bitrate)
                    })
                }

                val audioArray = JSArray()
                val audioList = streamInfo.audioStreams.orEmpty()
                    .filter { it.isUrl && !it.content.isNullOrBlank() }
                    .sortedWith(
                        compareByDescending<org.schabi.newpipe.extractor.stream.AudioStream> {
                            it.format == MediaFormat.M4A
                        }.thenByDescending { it.averageBitrate }
                    )

                for (audio in audioList) {
                    val formatName = audio.format?.getSuffix() ?: audio.format?.getName() ?: "m4a"
                    val mimeType = audio.format?.getMimeType() ?: "audio/mp4"
                    audioArray.put(JSObject().apply {
                        put("url", audio.content.orEmpty())
                        put("averageBitrate", audio.averageBitrate)
                        put("format", formatName)
                        put("mimeType", mimeType)
                        put("quality", audio.quality.orEmpty())
                    })
                }

                val uploaderUrl = streamInfo.uploaderUrl.orEmpty()
                val uploaderChannelId = extractChannelId(uploaderUrl)
                val uploaderHandle = extractChannelHandle(uploaderUrl)
                val isLive = streamInfo.streamType == StreamType.LIVE_STREAM ||
                    streamInfo.streamType == StreamType.AUDIO_LIVE_STREAM
                val isShort = streamInfo.isShortFormContent ||
                    isShortUrl(rawUrlOrId) ||
                    (!isLive && streamInfo.duration in 0L until MIN_FULL_LENGTH_SECONDS)

                val response = JSObject().apply {
                    put("videoId", streamInfo.id.orEmpty().ifBlank { parsedId.orEmpty() })
                    put("title", streamInfo.name.orEmpty())
                    put("uploaderName", streamInfo.uploaderName.orEmpty())
                    put("uploaderUrl", uploaderUrl)
                    put("uploaderChannelId", uploaderChannelId)
                    put("uploaderHandle", uploaderHandle)
                    put("duration", streamInfo.duration)
                    put("thumbnailUrl", bestThumbnailUrl(streamInfo.thumbnails))
                    put("isLive", isLive)
                    put("isShort", isShort)
                    put("hlsUrl", streamInfo.hlsUrl.orEmpty())
                    put("muxedStreams", muxedArray)
                    put("audioStreams", audioArray)
                }

                call.resolve(response)
            } catch (t: Throwable) {
                Log.e(TAG, "getStream failed for url=$canonicalUrl", t)
                call.reject(t.message ?: "Failed to extract video stream.", "STREAM_EXTRACTION_ERROR")
            }
        }
    }

    /**
     * Method 4: syncYouTubeGuardConfig
     * Persists Official YouTube App Guard toggles and normalized whitelisted channel names/handles
     * into dedicated SharedPreferences (`zero_noise_yt_guard_prefs`) so ZeroAccessibilityService
     * enforces Shorts blocking & Study Mode even when Zero Noise UI is closed.
     */
    @PluginMethod
    fun syncYouTubeGuardConfig(call: PluginCall) {
        val blockOfficialShorts = call.getBoolean("blockOfficialShorts", false) ?: false
        val strictOfficialStudyMode = call.getBoolean("strictOfficialStudyMode", false) ?: false
        val rawChannels = call.getArray("whitelistedChannels")

        val normalizedList = ArrayList<String>()
        if (rawChannels != null) {
            for (i in 0 until rawChannels.length()) {
                val entry = rawChannels.opt(i) ?: continue
                when (entry) {
                    is String -> {
                        val cleaned = YouTubeAccessibilityGuard.normalizeIdentifier(entry)
                        if (cleaned.isNotEmpty()) normalizedList.add(cleaned)
                    }
                    is JSONObject -> {
                        val name = YouTubeAccessibilityGuard.normalizeIdentifier(entry.optString("name", ""))
                        val handle = YouTubeAccessibilityGuard.normalizeIdentifier(entry.optString("handle", ""))
                        if (name.isNotEmpty()) normalizedList.add(name)
                        if (handle.isNotEmpty()) normalizedList.add(handle)
                    }
                }
            }
        }

        val saved = YouTubeAccessibilityGuard.saveConfig(
            context = context,
            blockOfficialShorts = blockOfficialShorts,
            strictOfficialStudyMode = strictOfficialStudyMode,
            whitelistedChannels = normalizedList
        )

        call.resolve(JSObject().apply {
            put("synced", true)
            put("blockOfficialShorts", saved.blockOfficialShorts)
            put("strictOfficialStudyMode", saved.strictOfficialStudyMode)
            put("whitelistedCount", saved.whitelistedChannels.size)
            put("revision", saved.revision)
        })
    }

    // -------------------------------------------------------------------------
    // Deterministic Whitelist & URL Normalization Helpers
    // -------------------------------------------------------------------------

    private fun parseWhitelist(rawArray: JSArray?): List<WhitelistEntry> {
        if (rawArray == null) return emptyList()
        val entries = ArrayList<WhitelistEntry>(rawArray.length())
        for (i in 0 until rawArray.length()) {
            val item = rawArray.opt(i) ?: continue
            when (item) {
                is JSONObject -> {
                    val url = item.optString("url", "").trim()
                    val id = firstNonBlank(
                        item.optString("id", "").trim(),
                        extractChannelId(url)
                    )
                    val handle = normalizeHandle(
                        firstNonBlank(
                            item.optString("handle", "").trim(),
                            extractChannelHandle(url)
                        )
                    )
                    val name = normalizeName(item.optString("name", ""))
                    if (id.isNotEmpty() || handle.isNotEmpty() || name.isNotEmpty()) {
                        entries.add(WhitelistEntry(id, handle, name, url))
                    }
                }
                is String -> {
                    val str = item.trim()
                    if (str.isNotEmpty()) {
                        val id = extractChannelId(str)
                        val handle = normalizeHandle(extractChannelHandle(str))
                        val name = if (id.isEmpty() && handle.isEmpty()) normalizeName(str) else ""
                        entries.add(WhitelistEntry(id, handle, name, str))
                    }
                }
            }
        }
        return entries
    }

    private fun matchesWhitelist(
        uploaderChannelId: String,
        uploaderHandle: String,
        uploaderName: String,
        whitelist: List<WhitelistEntry>
    ): Boolean {
        val normHandle = normalizeHandle(uploaderHandle)
        val normName = normalizeName(uploaderName)

        for (entry in whitelist) {
            // 1. Exact UC... Channel ID match
            if (entry.id.isNotEmpty() && uploaderChannelId.isNotEmpty() &&
                entry.id.equals(uploaderChannelId, ignoreCase = false)
            ) {
                return true
            }
            // 2. Exact @handle match (case-insensitive)
            if (entry.handle.isNotEmpty() && normHandle.isNotEmpty() &&
                entry.handle == normHandle
            ) {
                return true
            }
            // 3. Exact normalized uploaderName match (case-insensitive)
            if (entry.normalizedName.isNotEmpty() && normName.isNotEmpty() &&
                entry.normalizedName == normName
            ) {
                return true
            }
        }
        return false
    }

    private fun normalizeHandle(raw: String?): String {
        val trimmed = raw?.trim().orEmpty()
        if (trimmed.isEmpty()) return ""
        val withAt = if (trimmed.startsWith("@")) trimmed else "@$trimmed"
        return withAt.lowercase(Locale.ROOT)
    }

    private fun normalizeName(raw: String?): String {
        val trimmed = raw?.trim().orEmpty()
        if (trimmed.isEmpty()) return ""
        return WHITESPACE_REGEX.replace(trimmed.lowercase(Locale.ROOT), " ")
    }

    private fun isShortUrl(url: String): Boolean {
        return url.lowercase(Locale.ROOT).contains("/shorts/")
    }

    private fun extractVideoId(input: String): String? {
        val trimmed = input.trim()
        if (VIDEO_ID_EXACT_REGEX.matches(trimmed)) {
            return trimmed
        }
        try {
            val withScheme = if (trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true)) {
                trimmed
            } else {
                "https://$trimmed"
            }
            val uri = URI(withScheme)
            val host = uri.host?.lowercase(Locale.ROOT).orEmpty()
            val path = uri.path.orEmpty()

            if (host.contains("youtu.be")) {
                val seg = path.trim('/').substringBefore('/')
                if (VIDEO_ID_EXACT_REGEX.matches(seg)) return seg
            }

            if (host.contains("youtube.com") || host.contains("youtube-nocookie.com")) {
                val query = uri.rawQuery.orEmpty()
                for (pair in query.split('&')) {
                    val eqIdx = pair.indexOf('=')
                    if (eqIdx > 0 && pair.substring(0, eqIdx) == "v") {
                        val candidate = pair.substring(eqIdx + 1)
                        if (VIDEO_ID_EXACT_REGEX.matches(candidate)) return candidate
                    }
                }
                val segments = path.split('/').filter { it.isNotEmpty() }
                for (marker in listOf("shorts", "embed", "live", "v")) {
                    val idx = segments.indexOf(marker)
                    if (idx != -1 && idx + 1 < segments.size) {
                        val candidate = segments[idx + 1]
                        if (VIDEO_ID_EXACT_REGEX.matches(candidate)) return candidate
                    }
                }
            }
        } catch (_: Throwable) {
            // Fall through to regex fallback
        }

        val match = VIDEO_ID_URL_REGEX.find(trimmed)
        return match?.groupValues?.getOrNull(1)
    }

    private fun extractChannelId(input: String?): String {
        val trimmed = input?.trim().orEmpty()
        if (trimmed.isEmpty()) return ""
        if (CHANNEL_ID_EXACT_REGEX.matches(trimmed)) return trimmed
        val match = CHANNEL_ID_IN_URL_REGEX.find(trimmed)
        return match?.groupValues?.getOrNull(1).orEmpty()
    }

    private fun extractChannelHandle(input: String?): String {
        val trimmed = input?.trim().orEmpty()
        if (trimmed.isEmpty()) return ""
        if (HANDLE_EXACT_REGEX.matches(trimmed)) return trimmed
        val match = HANDLE_IN_URL_REGEX.find(trimmed)
        return match?.groupValues?.getOrNull(1)?.let { "@$it" }.orEmpty()
    }

    private fun normalizeChannelInputToUrl(rawInput: String): String? {
        val trimmed = rawInput.trim()
        if (trimmed.isEmpty()) return null
        if (CHANNEL_ID_EXACT_REGEX.matches(trimmed)) {
            return "https://www.youtube.com/channel/$trimmed"
        }
        if (HANDLE_EXACT_REGEX.matches(trimmed)) {
            return "https://www.youtube.com/$trimmed"
        }
        val withScheme = if (trimmed.startsWith("http://", true) || trimmed.startsWith("https://", true)) {
            trimmed
        } else if (trimmed.contains("youtube.com", true)) {
            "https://$trimmed"
        } else {
            return null
        }
        return try {
            val uri = URI(withScheme)
            val host = uri.host?.lowercase(Locale.ROOT).orEmpty()
            if (host.contains("youtube.com")) withScheme else null
        } catch (_: Throwable) {
            null
        }
    }

    private fun resolveCanonicalChannelId(
        channelInfo: ChannelInfo,
        targetChannelUrl: String,
        rawInput: String
    ): String {
        return firstNonBlank(
            extractChannelId(channelInfo.id),
            extractChannelId(channelInfo.url),
            extractChannelId(targetChannelUrl),
            extractChannelId(rawInput),
            channelInfo.id
        )
    }

    private fun fetchCanonicalHandleFromPage(channelUrl: String): String {
        val html = ZeroTubeDownloader.getInstance().fetchText(channelUrl) ?: return ""
        val vanityMatch = VANITY_HANDLE_REGEX.find(html)
        val rawHandle = vanityMatch?.groupValues?.getOrNull(1)
            ?: CANONICAL_BASE_HANDLE_REGEX.find(html)?.groupValues?.getOrNull(1)
            ?: return ""
        return "@$rawHandle"
    }

    private fun bestThumbnailUrl(images: List<org.schabi.newpipe.extractor.Image>?): String {
        if (images.isNullOrEmpty()) return ""
        return images.maxByOrNull { it.width }?.url ?: images.first().url.orEmpty()
    }

    private fun parseResolutionHeight(resolution: String?): Int {
        if (resolution.isNullOrBlank()) return 0
        val match = DIGITS_REGEX.find(resolution)
        return match?.value?.toIntOrNull() ?: 0
    }

    private fun firstNonBlank(vararg candidates: String?): String {
        for (c in candidates) {
            if (!c.isNullOrBlank()) return c.trim()
        }
        return ""
    }

    companion object {
        private const val TAG = "ZeroTubePlugin"
        private const val MIN_FULL_LENGTH_SECONDS = 120L

        private val newPipeInitialized = AtomicBoolean(false)
        private val WHITESPACE_REGEX = Regex("\\s+")
        private val DIGITS_REGEX = Regex("(\\d+)")
        private val VIDEO_ID_EXACT_REGEX = Regex("^[a-zA-Z0-9_-]{11}$")
        private val VIDEO_ID_URL_REGEX = Regex(
            "(?:youtube\\.com/(?:watch\\?.*v=|shorts/|embed/|live/|v/)|youtu\\.be/)([a-zA-Z0-9_-]{11})",
            RegexOption.IGNORE_CASE
        )
        private val CHANNEL_ID_EXACT_REGEX = Regex("^UC[a-zA-Z0-9_-]{22}$")
        private val CHANNEL_ID_IN_URL_REGEX = Regex("(?:^|/)?(UC[a-zA-Z0-9_-]{22})(?:[/?#&]|$)")
        private val HANDLE_EXACT_REGEX = Regex("^@[a-zA-Z0-9_.-]{3,60}$")
        private val HANDLE_IN_URL_REGEX = Regex("(?:^|/)@([a-zA-Z0-9_.-]{3,60})(?:[/?#&]|$)")
        private val VANITY_HANDLE_REGEX = Regex(
            "\"vanityChannelUrl\"\\s*:\\s*\"https?://(?:www\\.)?youtube\\.com/@([a-zA-Z0-9_.-]{3,60})\""
        )
        private val CANONICAL_BASE_HANDLE_REGEX = Regex(
            "\"canonicalBaseUrl\"\\s*:\\s*\"/@([a-zA-Z0-9_.-]{3,60})\""
        )
    }
}
