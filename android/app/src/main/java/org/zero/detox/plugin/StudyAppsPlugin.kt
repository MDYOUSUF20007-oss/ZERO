package org.zero.detox.plugin

import android.content.Intent
import android.content.pm.ApplicationInfo
import android.content.pm.PackageManager
import android.os.Build
import android.util.Log
import com.getcapacitor.JSArray
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import okhttp3.OkHttpClient
import okhttp3.Request
import org.zero.detox.data.BagStore
import java.util.Locale
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * StudyAppsPlugin:
 * Native on-device scanner & deterministic verifier for Compulsory Study / Online Class apps.
 * - Strictly excludes chat, social media, games, video streaming, and AI apps (AI is already built-in).
 * - Recognizes online class platforms (Google Meet, Zoom, Teams, Classroom), major EdTech platforms
 *   (PW, Next Toppers, Unacademy, Allen, Adda247, Testbook, Vedantu, Khan Academy, etc.),
 *   and white-label coaching engines (Classplus, AppX, PenPencil, Graphy, Teachmint).
 * - Verifies unknown apps deterministically against their official Google Play Store category.
 */
@CapacitorPlugin(name = "StudyApps")
class StudyAppsPlugin : Plugin() {

    companion object {
        private const val TAG = "StudyAppsPlugin"

        // Strictly forbidden from auto-approve or compulsory study apps (must be added to a Bag instead)
        private val HARD_BLOCKED_CHAT_SOCIAL_GAME_PACKAGES = setOf(
            // Messaging & Chat (explicitly excluded — use a Bag if needed)
            "com.whatsapp",
            "com.whatsapp.w4b",
            "org.telegram.messenger",
            "org.telegram.messenger.web",
            "org.telegram.plus",
            "nekox.messenger",
            "com.discord",
            "org.thoughtcrime.securesms",
            "com.facebook.orca",
            "com.facebook.mlite",
            "com.snapchat.android",
            "com.viber.voip",
            "jp.naver.line.android",
            "com.tencent.mm",
            "com.skype.raider",
            "com.google.android.apps.messaging",
            "com.samsung.android.messaging",
            // Social Media & Short-Form Feeds
            "com.instagram.android",
            "com.instagram.lite",
            "com.instagram.barcelona", // Threads
            "com.twitter.android",
            "com.reddit.frontpage",
            "com.zhiliaoapp.musically",
            "com.ss.android.ugc.trill",
            "com.facebook.katana",
            "com.facebook.lite",
            "com.pinterest",
            "com.tumblr",
            "com.linkedin.android",
            "in.mohalla.sharechat",
            "in.mohalla.video",
            "com.eterno.shortvideos",
            // Video / Entertainment / Streaming / Shopping / Dating
            "com.google.android.youtube",
            "com.google.android.apps.youtube.music",
            "app.morphe.android.youtube",
            "app.revanced.android.youtube",
            "com.netflix.mediaclient",
            "com.amazon.avod.thirdpartyclient",
            "in.startv.hotstar",
            "com.jio.media.ondemand",
            "com.sonyliv",
            "com.graymatrix.did",
            "tv.twitch.android.app",
            "com.spotify.music",
            "com.spotify.lite",
            "com.tinder",
            "com.bumble.app",
            "co.hinge.app",
            "com.flipkart.android",
            "in.amazon.mShop.android.shopping",
            "com.myntra.android",
            "com.meesho.supply",
            // Browsers (can bypass into any site)
            "com.android.chrome",
            "com.chrome.beta",
            "com.sec.android.app.sbrowser",
            "org.mozilla.firefox",
            "com.brave.browser",
            "com.opera.browser",
            "com.opera.mini.native",
            "com.microsoft.emmx",
            "com.duckduckgo.mobile.android",
            // Popular Games
            "com.pubg.imobile",
            "com.tencent.ig",
            "com.dts.freefireth",
            "com.dts.freefiremax",
            "com.supercell.clashofclans",
            "com.supercell.clashroyale",
            "com.supercell.brawlstars",
            "com.activision.callofduty.shooter",
            "com.mojang.minecraftpe",
            "com.roblox.client",
            "com.miHoYo.GenshinImpact",
            "com.kiloo.subwaysurf",
            "com.king.candycrushsaga",
            "com.ludo.king"
        )

        private val BLOCKED_KEYWORDS_IN_PACKAGE = listOf(
            "whatsapp", "telegram", "discord", "instagram", "snapchat", "tiktok", "musically",
            "facebook", "reddit", "twitter", "netflix", "hotstar", "twitch", "tinder", "bumble",
            "game", "pubg", "freefire", "roblox", "minecraft", "ludo", "casino", "betting", "rummy",
            "dream11", "browser", "chrome", "firefox"
        )

        // Built-in verified Online Class, Work Meeting & EdTech Coaching packages
        private val KNOWN_STUDY_AND_CLASS_PACKAGES: Map<String, String> = mapOf(
            // Online Class & Work Meetings
            "com.google.android.apps.meetings" to "Online Class / Meeting",
            "us.zoom.videomeetings" to "Online Class / Meeting",
            "com.microsoft.teams" to "Online Class / Meeting",
            "com.cisco.webex.meetings" to "Online Class / Meeting",
            "com.google.android.apps.classroom" to "Online Classroom",
            "org.jitsi.meet" to "Online Class / Meeting",
            // Indian Coaching & Exam Prep Platforms
            "xyz.penpencil.physicswala" to "Coaching & Study",
            "com.nexttoppers.app" to "Coaching & Study",
            "com.unacademyapp" to "Coaching & Study",
            "in.allen.digital" to "Coaching & Study",
            "com.allen.digital" to "Coaching & Study",
            "com.adda247.app" to "Coaching & Study",
            "com.testbook.tbapp" to "Coaching & Study",
            "com.vedantu.app" to "Coaching & Study",
            "com.doubtnutapp" to "Coaching & Study",
            "com.byjus.thelearningapp" to "Coaching & Study",
            "com.toppr.app" to "Coaching & Study",
            "com.embibe.student" to "Coaching & Study",
            "in.oliveboard.prep" to "Coaching & Study",
            "com.studyiq.android" to "Coaching & Study",
            "com.drishtiias.app" to "Coaching & Study",
            "com.motion.education" to "Coaching & Study",
            "com.resonance.app" to "Coaching & Study",
            "com.careerwill.app" to "Coaching & Study",
            "com.rojgarwithankit.app" to "Coaching & Study",
            "com.khanglobalstudies.app" to "Coaching & Study",
            "com.utkarsh.android" to "Coaching & Study",
            "com.teachmint.teachmint" to "Online Classroom",
            // Global Learning & Study Tools
            "org.khanacademy.android" to "Study Platform",
            "org.coursera.android" to "Study Platform",
            "com.udemy.android" to "Study Platform",
            "org.edx.mobile" to "Study Platform",
            "com.duolingo" to "Study Platform",
            "org.brilliant.android" to "Study Platform",
            "com.ichi2.anki" to "Study Flashcards",
            "com.quizlet.quizletandroid" to "Study Flashcards",
            "com.wolfram.android.alpha" to "Study Tool",
            "com.microblink.photomath" to "Study Tool",
            "com.desmos.calculator" to "Study Tool",
            "org.geogebra.android" to "Study Tool",
            "md.obsidian" to "Study Notes",
            "notion.id" to "Study Notes",
            "com.notion.id" to "Study Notes",
            "com.microsoft.office.onenote" to "Study Notes",
            "com.google.android.apps.docs" to "Study Docs",
            "com.google.android.apps.docs.editors.docs" to "Study Docs",
            "com.google.android.apps.docs.editors.sheets" to "Study Docs",
            "com.google.android.apps.docs.editors.slides" to "Study Docs",
            "com.adobe.reader" to "Study PDF Reader",
            "com.amazon.kindle" to "Study Reading",
            "com.instructure.candroid" to "Online Classroom",
            "com.moodle.moodlemobile" to "Online Classroom",
            "com.blackboard.android.bbstudent" to "Online Classroom"
        )

        // White-label Indian coaching app SDK prefixes (Classplus, PenPencil, AppX, Graphy, Teachmint)
        private val COACHING_SDK_PREFIXES = listOf(
            "co.classplus.", "co.tarly.", "co.edvin.", "co.loki.", "co.davinci.",
            "co.sheldon.", "co.sansa.", "co.stan.", "co.alexis.", "co.kevin.",
            "co.thor.", "co.groot.", "co.robin.", "co.arya.", "co.april.",
            "co.bolton.", "co.nick.", "co.jarvis.", "co.khal.", "co.iron.",
            "co.martin.", "co.lynde.", "co.hodor.", "co.barney.", "co.penny.",
            "co.lenord.", "co.alicia.", "co.dora.", "co.ted.", "co.marshal.",
            "co.lily.", "co.rogers.", "co.stark.", "co.banner.", "co.parker.",
            "xyz.penpencil.", "com.appx.", "com.graphy.", "com.teachmint.",
            "com.classplusapp."
        )

        // Hints used during full-phone Auto-Scan so we only query Play Store for likely study/class apps
        private val STUDY_NAME_HINTS = listOf(
            "study", "class", "academy", "coach", "exam", "prep", "learn", "course",
            "meet", "zoom", "teams", "tutor", "edu", "institute", "school", "college",
            "university", "ncert", "upsc", "jee", "neet", "gate", "ssc", "bank",
            "merchant", "navy", "paramount", "cet", "topper", "wallah", "pw", "allen",
            "lecture", "notes", "anki", "flashcard", "quiz", "library", "book", "pdf",
            "math", "physics", "chemistry", "biology", "code", "coding", "campus", "lms"
        )

        private val PLAY_STORE_ALLOWED_CATEGORIES = setOf(
            "EDUCATION",
            "BOOKS_AND_REFERENCE",
            "BUSINESS",
            "PRODUCTIVITY"
        )

        private val PLAY_STORE_REJECTED_CATEGORIES = setOf(
            "SOCIAL",
            "COMMUNICATION",
            "ENTERTAINMENT",
            "DATING",
            "SHOPPING",
            "VIDEO_PLAYERS",
            "MUSIC_AND_AUDIO",
            "COMICS",
            "LIFESTYLE",
            "EVENTS",
            "FOOD_AND_DRINK"
        )

        private val JSON_LD_CATEGORY_REGEX = Regex(
            "\"applicationCategory\"\\s*:\\s*\"([^\"]+)\"",
            RegexOption.IGNORE_CASE
        )
        private val GENRE_LINK_REGEX = Regex(
            "/store/apps/category/([A-Z0-9_]+)",
            RegexOption.IGNORE_CASE
        )
    }

    private val executor = Executors.newSingleThreadExecutor()
    private val httpClient = OkHttpClient.Builder()
        .connectTimeout(6, TimeUnit.SECONDS)
        .readTimeout(6, TimeUnit.SECONDS)
        .followRedirects(true)
        .build()

    private data class VerificationOutcome(
        val status: String, // "verified", "rejected", "unlisted"
        val categoryLabel: String,
        val reason: String,
        val source: String // "builtin", "coaching_sdk", "play_store", "blocked_list", "unlisted"
    )

    @PluginMethod
    fun syncCompulsoryStudyApps(call: PluginCall) {
        val enabled = call.getBoolean("enabled", true) ?: true
        val appsArray = call.getArray("apps") ?: JSArray()
        try {
            val bagStore = BagStore(context)
            bagStore.saveCompulsoryStudyApps(enabled, appsArray.toString())
            call.resolve(JSObject().apply {
                put("synced", true)
                put("enabled", enabled)
                put("count", bagStore.getCompulsoryStudyApps().size)
            })
        } catch (e: Exception) {
            call.reject("Failed to sync compulsory study apps: ${e.message}", e)
        }
    }

    @PluginMethod
    fun scanInstalledStudyApps(call: PluginCall) {
        val ctx = context
        if (ctx == null) {
            call.reject("Context unavailable")
            return
        }

        executor.execute {
            try {
                val pm = ctx.packageManager
                val bagStore = BagStore(ctx)
                val dialers = bagStore.getAllowedDialerPackages()
                val payments = bagStore.getAllowedPaymentPackages()
                val smsPkgs = bagStore.getAllowedSmsPackages()

                val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
                    addCategory(Intent.CATEGORY_LAUNCHER)
                }
                val resolveList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                    pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0L))
                } else {
                    @Suppress("DEPRECATION")
                    pm.queryIntentActivities(mainIntent, 0)
                }

                val seen = HashSet<String>()
                val discovered = mutableListOf<JSObject>()
                var playStoreLookups = 0
                val maxPlayStoreLookups = 14

                for (ri in resolveList) {
                    val pkg = ri.activityInfo?.packageName ?: continue
                    if (!seen.add(pkg)) continue
                    if (pkg == ctx.packageName) continue
                    if (BagStore.PROTECTED_SYSTEM_PACKAGES.contains(pkg)) continue
                    // Skip apps already handled by built-in compulsory slots (AI, Calls, UPI, SMS)
                    if (BagStore.COMPULSORY_AI_ASSISTANT_PACKAGES.contains(pkg)) continue
                    if (dialers.contains(pkg) || payments.contains(pkg) || smsPkgs.contains(pkg)) continue

                    val label = ri.loadLabel(pm)?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: pkg

                    if (isHardBlocked(pkg, label, pm)) continue

                    // 1. Instant built-in match
                    val builtinCat = KNOWN_STUDY_AND_CLASS_PACKAGES[pkg]
                    if (builtinCat != null) {
                        discovered.add(buildCandidateJson(pkg, label, builtinCat, "Verified $builtinCat app", "builtin"))
                        continue
                    }

                    // 2. White-label coaching SDK match (Classplus, AppX, PenPencil, Graphy, etc.)
                    if (matchesCoachingSdk(pkg)) {
                        discovered.add(
                            buildCandidateJson(
                                pkg,
                                label,
                                "Coaching & Online Class",
                                "Detected coaching platform SDK",
                                "coaching_sdk"
                            )
                        )
                        continue
                    }

                    // 3. Name/OS-hinted Play Store verification (keeps scan fast & private)
                    val isLikelyCandidate = hasStudyHint(pkg, label) || isOsProductivityNonSystem(pkg, pm)
                    if (isLikelyCandidate && playStoreLookups < maxPlayStoreLookups) {
                        playStoreLookups++
                        val playResult = verifyViaPlayStore(pkg)
                        if (playResult != null && playResult.status == "verified") {
                            discovered.add(
                                buildCandidateJson(
                                    pkg,
                                    label,
                                    playResult.categoryLabel,
                                    playResult.reason,
                                    "play_store"
                                )
                            )
                        }
                    }
                }

                discovered.sortBy { it.optString("appName").lowercase(Locale.US) }
                val outArr = JSArray()
                for (item in discovered) outArr.put(item)

                call.resolve(JSObject().apply {
                    put("apps", outArr)
                    put("scannedCount", seen.size)
                })
            } catch (e: Exception) {
                Log.e(TAG, "scanInstalledStudyApps failed", e)
                call.reject("Scan failed: ${e.message}", e)
            }
        }
    }

    @PluginMethod
    fun verifyStudyApp(call: PluginCall) {
        val pkg = call.getString("packageName")?.trim().orEmpty()
        val appName = call.getString("appName")?.trim().orEmpty().ifEmpty { pkg }
        if (pkg.isEmpty()) {
            call.reject("packageName is required")
            return
        }

        executor.execute {
            try {
                val pm = context.packageManager
                val outcome = evaluateSingleApp(pkg, appName, pm)
                call.resolve(JSObject().apply {
                    put("packageName", pkg)
                    put("appName", appName)
                    put("status", outcome.status)
                    put("categoryLabel", outcome.categoryLabel)
                    put("reason", outcome.reason)
                    put("source", outcome.source)
                })
            } catch (e: Exception) {
                call.reject("Verification failed: ${e.message}", e)
            }
        }
    }

    private fun evaluateSingleApp(pkg: String, appName: String, pm: PackageManager): VerificationOutcome {
        if (BagStore.COMPULSORY_AI_ASSISTANT_PACKAGES.contains(pkg)) {
            return VerificationOutcome(
                status = "rejected",
                categoryLabel = "AI Assistant",
                reason = "AI assistants are already built into Zero-Noise automatically — save your Study App slot for your course or class app.",
                source = "blocked_list"
            )
        }

        if (isHardBlocked(pkg, appName, pm)) {
            return VerificationOutcome(
                status = "rejected",
                categoryLabel = "Chat / Social / Entertainment",
                reason = "Chat, social media, browsers, streaming, and game apps are kept out of Compulsory Study Apps. Add it to a Bag instead if needed.",
                source = "blocked_list"
            )
        }

        val builtinCat = KNOWN_STUDY_AND_CLASS_PACKAGES[pkg]
        if (builtinCat != null) {
            return VerificationOutcome(
                status = "verified",
                categoryLabel = builtinCat,
                reason = "Verified $builtinCat platform.",
                source = "builtin"
            )
        }

        if (matchesCoachingSdk(pkg)) {
            return VerificationOutcome(
                status = "verified",
                categoryLabel = "Coaching & Online Class",
                reason = "Verified online coaching platform SDK.",
                source = "coaching_sdk"
            )
        }

        val playOutcome = verifyViaPlayStore(pkg)
        if (playOutcome != null) {
            return playOutcome
        }

        return VerificationOutcome(
            status = "unlisted",
            categoryLabel = "Unlisted / Private APK",
            reason = "Not found on Google Play Store. If this is a private coaching or college APK, you can confirm adding it manually.",
            source = "unlisted"
        )
    }

    private fun isHardBlocked(pkg: String, label: String, pm: PackageManager): Boolean {
        val lowerPkg = pkg.lowercase(Locale.US)
        val lowerLabel = label.lowercase(Locale.US)

        if (HARD_BLOCKED_CHAT_SOCIAL_GAME_PACKAGES.contains(lowerPkg)) return true
        if (BagStore.PROTECTED_SYSTEM_PACKAGES.contains(lowerPkg)) return true

        // Check Android OS app category (Android 8+ API 26+)
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val ai = pm.getApplicationInfo(pkg, 0)
                if (ai.category == ApplicationInfo.CATEGORY_GAME ||
                    ai.category == ApplicationInfo.CATEGORY_SOCIAL ||
                    ai.category == ApplicationInfo.CATEGORY_VIDEO ||
                    ai.category == ApplicationInfo.CATEGORY_AUDIO
                ) {
                    // Allow explicitly whitelisted study platforms if mis-categorized, otherwise reject
                    if (!KNOWN_STUDY_AND_CLASS_PACKAGES.containsKey(pkg) && !matchesCoachingSdk(pkg)) {
                        return true
                    }
                }
            } catch (_: Exception) {}
        }

        for (kw in BLOCKED_KEYWORDS_IN_PACKAGE) {
            if (lowerPkg.contains(kw)) return true
        }
        if (lowerLabel == "whatsapp" || lowerLabel == "telegram" || lowerLabel == "instagram" ||
            lowerLabel == "snapchat" || lowerLabel == "discord" || lowerLabel == "youtube"
        ) {
            return true
        }
        return false
    }

    private fun matchesCoachingSdk(pkg: String): Boolean {
        val lower = pkg.lowercase(Locale.US)
        return COACHING_SDK_PREFIXES.any { lower.startsWith(it) }
    }

    private fun hasStudyHint(pkg: String, label: String): Boolean {
        val combined = "${pkg.lowercase(Locale.US)} ${label.lowercase(Locale.US)}"
        return STUDY_NAME_HINTS.any { combined.contains(it) }
    }

    private fun isOsProductivityNonSystem(pkg: String, pm: PackageManager): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return false
        return try {
            val ai = pm.getApplicationInfo(pkg, 0)
            val isSystem = (ai.flags and ApplicationInfo.FLAG_SYSTEM) != 0
            !isSystem && ai.category == ApplicationInfo.CATEGORY_PRODUCTIVITY
        } catch (_: Exception) {
            false
        }
    }

    private fun verifyViaPlayStore(pkg: String): VerificationOutcome? {
        val url = "https://play.google.com/store/apps/details?id=$pkg&hl=en&gl=US"
        val req = Request.Builder()
            .url(url)
            .header(
                "User-Agent",
                "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Mobile Safari/537.36"
            )
            .get()
            .build()

        return try {
            httpClient.newCall(req).execute().use { resp ->
                if (!resp.isSuccessful) {
                    return null
                }
                val html = resp.body?.string() ?: return null
                val rawCat = JSON_LD_CATEGORY_REGEX.find(html)?.groupValues?.getOrNull(1)
                    ?: GENRE_LINK_REGEX.find(html)?.groupValues?.getOrNull(1)
                    ?: return null

                val normalizedCat = rawCat.trim().uppercase(Locale.US).replace(' ', '_')
                val prettyCat = rawCat.trim().replace('_', ' ').lowercase(Locale.US)
                    .split(' ')
                    .joinToString(" ") { w -> w.replaceFirstChar { it.uppercase() } }

                when {
                    normalizedCat.startsWith("GAME") || PLAY_STORE_REJECTED_CATEGORIES.contains(normalizedCat) -> {
                        VerificationOutcome(
                            status = "rejected",
                            categoryLabel = prettyCat,
                            reason = "Play Store lists this app under $prettyCat (not Study/Work). Add it to a Bag instead if needed.",
                            source = "play_store"
                        )
                    }
                    PLAY_STORE_ALLOWED_CATEGORIES.contains(normalizedCat) -> {
                        VerificationOutcome(
                            status = "verified",
                            categoryLabel = prettyCat,
                            reason = "Verified via Google Play Store ($prettyCat).",
                            source = "play_store"
                        )
                    }
                    else -> {
                        VerificationOutcome(
                            status = "rejected",
                            categoryLabel = prettyCat,
                            reason = "Play Store category is $prettyCat — only Education, Books & Reference, Business, or Productivity apps qualify as Compulsory Study Apps.",
                            source = "play_store"
                        )
                    }
                }
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Play Store lookup failed for $pkg", t)
            null
        }
    }

    private fun buildCandidateJson(
        pkg: String,
        appName: String,
        categoryLabel: String,
        reason: String,
        source: String
    ): JSObject {
        return JSObject().apply {
            put("packageName", pkg)
            put("appName", appName)
            put("categoryLabel", categoryLabel)
            put("reason", reason)
            put("source", source)
        }
    }
}
