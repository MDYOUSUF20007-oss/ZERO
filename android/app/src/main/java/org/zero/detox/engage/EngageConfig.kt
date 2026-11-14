package org.zero.detox.engage

import android.content.Context
import android.content.Intent
import org.json.JSONArray
import org.json.JSONObject
import org.zero.detox.data.BagStore
import java.util.Locale

/**
 * Dynamic per-app Phase 2 Engage configuration parsed from the React UI JSON payload.
 * Contains zero hardcoded timers or quotas; every value reflects user-defined config.
 */
object EngageConfig {

    enum class AccessMode(val wireName: String) {
        HARD_BLOCK("hard_block"),
        CONTROLLED("controlled"),
        UNRESTRICTED("unrestricted");

        companion object {
            fun fromWire(raw: String?): AccessMode {
                return when (raw?.trim()?.lowercase(Locale.US)) {
                    "hard_block" -> HARD_BLOCK
                    "controlled" -> CONTROLLED
                    else -> UNRESTRICTED
                }
            }
        }
    }

    enum class ShortVideoAction(val wireName: String) {
        OVERLAY("overlay"),
        BACK_ACTION("back_action");

        companion object {
            fun fromWire(raw: String?): ShortVideoAction {
                return when (raw?.trim()?.lowercase(Locale.US)) {
                    "back_action" -> BACK_ACTION
                    else -> OVERLAY
                }
            }
        }
    }

    data class AppRuleConfig(
        val mode: AccessMode = AccessMode.UNRESTRICTED,
        val quotaSeconds: Long = 0L,
        val maxContinuousSeconds: Long = 0L,
        val cooldownSeconds: Long = 0L,
        val frictionEnabled: Boolean = false,
        val frictionDelaySeconds: Int = 0,
        val showBreathingCircle: Boolean = false,
        val requireIntentText: Boolean = false,
        val minIntentChars: Int = 0,
        val reEntryGraceSeconds: Int = 0,
        val blockShortVideos: Boolean = false,
        val shortVideoAction: ShortVideoAction = ShortVideoAction.OVERLAY,
        val scrollVelocityLimit: Int = 0,
        val nudgeIntervalSeconds: Long = 0L
    )

    data class SessionPayloadConfig(
        val bagId: String,
        val bagName: String,
        val masterTimerSeconds: Long,
        val allowSms: Boolean,
        val compulsoryPackages: Set<String>,
        val appConfigs: Map<String, AppRuleConfig>,
        val rawJson: String
    )

    private val CORE_DIALER_PACKAGES = setOf(
        "com.android.dialer",
        "com.google.android.dialer",
        "com.android.incallui",
        "com.android.phone",
        "com.android.server.telecom",
        "com.samsung.android.dialer",
        "com.samsung.android.incallui",
        "com.oneplus.dialer",
        "com.oplus.dialer",
        "com.coloros.dialer",
        "com.miui.phone",
        "com.asus.dialer"
    )

    private val CORE_AI_ASSISTANT_PACKAGES = setOf(
        "com.google.android.apps.bard",
        "com.google.android.googlequicksearchbox",
        "com.openai.chatgpt",
        "com.anthropic.claude",
        "ai.perplexity.app.android",
        "com.microsoft.copilot",
        "com.deepseek.chat"
    )

    private fun clampNonNegLong(raw: Long, max: Long = 86_400L * 30L): Long {
        if (raw <= 0L) return 0L
        return if (raw > max) max else raw
    }

    private fun clampNonNegInt(raw: Int, max: Int = 86_400): Int {
        if (raw <= 0) return 0
        return if (raw > max) max else raw
    }

    @JvmStatic
    @JvmOverloads
    fun parseSessionPayload(
        rawJson: String?,
        ownPackageName: String,
        extraCompulsoryPackages: Set<String> = emptySet()
    ): SessionPayloadConfig? {
        if (rawJson.isNullOrBlank()) return null
        return try {
            val root = JSONObject(rawJson)
            val bagId = root.optString("bagId", "").trim()
            val bagName = root.optString("bagName", "").trim().ifEmpty {
                bagId.ifEmpty { "Bag" }
            }
            val masterTimerSeconds = clampNonNegLong(root.optLong("masterTimerSeconds", 0L))
            val allowSms = root.optBoolean("allowSms", false)

            val compulsory = HashSet<String>(CORE_DIALER_PACKAGES)
            compulsory.addAll(CORE_AI_ASSISTANT_PACKAGES)
            compulsory.addAll(extraCompulsoryPackages)
            val compArr: JSONArray? = root.optJSONArray("compulsoryPackages")
            if (compArr != null) {
                for (i in 0 until compArr.length()) {
                    val pkg = compArr.optString(i, "").trim()
                    if (pkg.isNotEmpty() && !BagStore.PROTECTED_SYSTEM_PACKAGES.contains(pkg)) {
                        compulsory.add(pkg)
                    }
                }
            }
            // Strip any protected settings/installer from compulsory
            compulsory.removeAll(BagStore.PROTECTED_SYSTEM_PACKAGES)
            compulsory.remove(ownPackageName)

            val configsMap = LinkedHashMap<String, AppRuleConfig>()
            val configsObj = root.optJSONObject("appConfigs")
            if (configsObj != null) {
                val iter = configsObj.keys()
                while (iter.hasNext()) {
                    val pkg = iter.next().trim()
                    if (pkg.isEmpty() || pkg == ownPackageName) continue
                    val entry = configsObj.optJSONObject(pkg) ?: continue

                    if (BagStore.PROTECTED_SYSTEM_PACKAGES.contains(pkg)) {
                        configsMap[pkg] = AppRuleConfig(mode = AccessMode.HARD_BLOCK)
                        continue
                    }

                    if (compulsory.contains(pkg)) {
                        configsMap[pkg] = AppRuleConfig(mode = AccessMode.UNRESTRICTED)
                        continue
                    }

                    val parsedRule = AppRuleConfig(
                        mode = AccessMode.fromWire(entry.optString("mode", "unrestricted")),
                        quotaSeconds = clampNonNegLong(entry.optLong("quotaSeconds", 0L)),
                        maxContinuousSeconds = clampNonNegLong(entry.optLong("maxContinuousSeconds", 0L), 86_400L),
                        cooldownSeconds = clampNonNegLong(entry.optLong("cooldownSeconds", 0L), 86_400L),
                        frictionEnabled = entry.optBoolean("frictionEnabled", false),
                        frictionDelaySeconds = clampNonNegInt(entry.optInt("frictionDelaySeconds", 0), 3600),
                        showBreathingCircle = entry.optBoolean("showBreathingCircle", false),
                        requireIntentText = entry.optBoolean("requireIntentText", false),
                        minIntentChars = clampNonNegInt(entry.optInt("minIntentChars", 0), 500),
                        reEntryGraceSeconds = clampNonNegInt(entry.optInt("reEntryGraceSeconds", 0), 86_400),
                        blockShortVideos = entry.optBoolean("blockShortVideos", false),
                        shortVideoAction = ShortVideoAction.fromWire(
                            entry.optString("shortVideoAction", "overlay")
                        ),
                        scrollVelocityLimit = clampNonNegInt(entry.optInt("scrollVelocityLimit", 0), 5000),
                        nudgeIntervalSeconds = clampNonNegLong(entry.optLong("nudgeIntervalSeconds", 0L), 86_400L)
                    )
                    configsMap[pkg] = parsedRule
                }
            }

            SessionPayloadConfig(
                bagId = bagId,
                bagName = bagName,
                masterTimerSeconds = masterTimerSeconds,
                allowSms = allowSms,
                compulsoryPackages = compulsory,
                appConfigs = configsMap,
                rawJson = rawJson
            )
        } catch (_: Exception) {
            null
        }
    }
}

class EngageConfigStore(private val context: Context) {

    companion object {
        const val PREFS_NAME = "zero_engage_config_v1"
        const val KEY_ACTIVE = "engage_active"
        const val KEY_PAYLOAD_JSON = "engage_payload_json"
        const val KEY_REVISION = "engage_revision"

        const val ACTION_ENGAGE_CONFIG_UPDATED = "org.zero.detox.ACTION_ENGAGE_CONFIG_UPDATED"
        const val ACTION_ENGAGE_STOPPED = "org.zero.detox.ACTION_ENGAGE_STOPPED"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @Synchronized
    fun saveAndActivateSessionJson(rawJson: String): EngageConfig.SessionPayloadConfig? {
        val bagStore = BagStore(context)
        val extraCompulsory = HashSet<String>()
        extraCompulsory.addAll(bagStore.getAllowedDialerPackages())
        val parsedInitial = EngageConfig.parseSessionPayload(rawJson, context.packageName) ?: return null
        if (parsedInitial.allowSms || bagStore.isSmsAllowed()) {
            extraCompulsory.addAll(bagStore.getAllowedSmsPackages())
        }
        val parsed = EngageConfig.parseSessionPayload(rawJson, context.packageName, extraCompulsory)
            ?: return null

        val wasActive = prefs.getBoolean(KEY_ACTIVE, false)
        val previousJson = prefs.getString(KEY_PAYLOAD_JSON, null)
        val prevRev = prefs.getLong(KEY_REVISION, 0L)
        val changed = !wasActive || previousJson != rawJson
        val nextRev = if (changed) prevRev + 1L else prevRev

        prefs.edit()
            .putBoolean(KEY_ACTIVE, true)
            .putString(KEY_PAYLOAD_JSON, rawJson)
            .putLong(KEY_REVISION, nextRev)
            .commit()

        if (changed) {
            broadcastAction(ACTION_ENGAGE_CONFIG_UPDATED)
        }
        return parsed
    }

    @Synchronized
    fun clearActiveSession() {
        val wasActive = prefs.getBoolean(KEY_ACTIVE, false)
        prefs.edit()
            .putBoolean(KEY_ACTIVE, false)
            .remove(KEY_PAYLOAD_JSON)
            .commit()
        if (wasActive) {
            broadcastAction(ACTION_ENGAGE_STOPPED)
        }
    }

    fun isActive(): Boolean = prefs.getBoolean(KEY_ACTIVE, false)

    fun getRevision(): Long = prefs.getLong(KEY_REVISION, 0L)

    fun loadActiveConfig(): EngageConfig.SessionPayloadConfig? {
        if (!prefs.getBoolean(KEY_ACTIVE, false)) return null
        val raw = prefs.getString(KEY_PAYLOAD_JSON, null) ?: return null
        val bagStore = BagStore(context)
        val extraCompulsory = HashSet<String>()
        extraCompulsory.addAll(bagStore.getAllowedDialerPackages())
        val parsedInitial = EngageConfig.parseSessionPayload(raw, context.packageName) ?: return null
        if (parsedInitial.allowSms || bagStore.isSmsAllowed()) {
            extraCompulsory.addAll(bagStore.getAllowedSmsPackages())
        }
        return EngageConfig.parseSessionPayload(raw, context.packageName, extraCompulsory)
    }

    fun isPackageExplicitlyHardBlocked(pkg: String): Boolean {
        val cfg = loadActiveConfig() ?: return false
        return cfg.appConfigs[pkg]?.mode == EngageConfig.AccessMode.HARD_BLOCK
    }

    private fun broadcastAction(action: String) {
        try {
            val intent = Intent(action).apply {
                setPackage(context.packageName)
            }
            context.sendBroadcast(intent)
        } catch (_: Exception) {}
    }
}
