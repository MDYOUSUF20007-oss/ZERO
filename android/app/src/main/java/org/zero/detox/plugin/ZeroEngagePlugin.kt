package org.zero.detox.plugin

import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.CapacitorPlugin
import org.zero.detox.engage.EngageConfigStore
import org.zero.detox.security.AppSecurityGuard

/**
 * ZeroEngagePlugin:
 * Capacitor 8 bridge receiving dynamic Phase 2 Engage session payloads (`startEngageSession`)
 * from React and persisting validated per-app Quotas, Friction, and Anti-Scroll Intervention
 * configurations into MODE_PRIVATE SharedPreferences for ZeroAccessibilityService & foreground guards.
 */
@CapacitorPlugin(name = "ZeroEngage")
class ZeroEngagePlugin : Plugin() {

    @PluginMethod
    fun startEngageSession(call: PluginCall) {
        val security = AppSecurityGuard.evaluateEnvironment(context)
        if (security.presetBagEditingDisabled) {
            call.reject(
                "Engage rule editing is disabled in rooted/emulator environments.",
                "SECURITY_RESTRICTED"
            )
            return
        }

        val payloadJson = call.data?.toString()
        if (payloadJson.isNullOrBlank()) {
            call.reject("Missing Engage session configuration payload.", "INVALID_PAYLOAD")
            return
        }

        val store = EngageConfigStore(context)
        val parsed = store.saveAndActivateSessionJson(payloadJson)
        if (parsed == null) {
            call.reject("Malformed Engage session configuration JSON.", "INVALID_PAYLOAD")
            return
        }

        call.resolve(buildSummaryObject(true, parsed))
    }

    @PluginMethod
    fun stopEngageSession(call: PluginCall) {
        EngageConfigStore(context).clearActiveSession()
        val res = JSObject().apply {
            put("stopped", true)
        }
        call.resolve(res)
    }

    @PluginMethod
    fun getEngageSessionState(call: PluginCall) {
        val store = EngageConfigStore(context)
        val activeCfg = store.loadActiveConfig()
        call.resolve(buildSummaryObject(activeCfg != null, activeCfg))
    }

    private fun buildSummaryObject(
        active: Boolean,
        cfg: org.zero.detox.engage.EngageConfig.SessionPayloadConfig?
    ): JSObject {
        return JSObject().apply {
            put("active", active)
            put("bagId", cfg?.bagId ?: "")
            put("bagName", cfg?.bagName ?: "")
            put("masterTimerSeconds", cfg?.masterTimerSeconds ?: 0L)
            put("allowSms", cfg?.allowSms ?: false)
            put("configuredAppCount", cfg?.appConfigs?.size ?: 0)
            put("compulsoryCount", cfg?.compulsoryPackages?.size ?: 0)
        }
    }
}
