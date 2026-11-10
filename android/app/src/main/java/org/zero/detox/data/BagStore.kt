package org.zero.detox.data

import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.Build
import android.provider.Telephony
import android.telecom.TelecomManager
import org.json.JSONArray
import org.json.JSONObject

/**
 * BagStore:
 * Manages the user's active "Bag" (Suitcase) of up to 3 custom allowed apps + optional Normal Calls / SMS
 * that remain permitted during an active Zero lock session.
 */
class BagStore(private val context: Context) {

    data class BagApp(
        val packageName: String,
        val appName: String
    )

    companion object {
        const val PREFS_NAME = "zero_bag_store"
        const val KEY_ACTIVE_BAG_NAME = "active_bag_name"
        const val KEY_ALLOW_CALLS = "allow_calls"
        const val KEY_ALLOW_SMS = "allow_sms"
        const val KEY_BAG_APPS_JSON = "bag_apps_json"
        const val MAX_BAG_APPS = 3

        private val CORE_CALL_PACKAGES = setOf(
            "com.android.incallui",
            "com.google.android.dialer",
            "com.samsung.android.incallui",
            "com.samsung.android.dialer",
            "com.android.dialer",
            "com.android.phone",
            "com.android.server.telecom",
            "com.oneplus.dialer"
        )
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @Synchronized
    fun saveActiveBag(
        bagName: String,
        appsJson: String,
        allowCalls: Boolean,
        allowSms: Boolean
    ) {
        val sanitized = JSONArray()
        try {
            val incoming = JSONArray(appsJson)
            val count = minOf(MAX_BAG_APPS, incoming.length())
            for (i in 0 until count) {
                val item = incoming.optJSONObject(i) ?: continue
                val pkg = item.optString("packageName", "").trim()
                val label = item.optString("appName", pkg).trim()
                if (pkg.isNotEmpty()) {
                    sanitized.put(
                        JSONObject().apply {
                            put("packageName", pkg)
                            put("appName", label)
                        }
                    )
                }
            }
        } catch (_: Exception) {}

        prefs.edit()
            .putString(KEY_ACTIVE_BAG_NAME, bagName.ifBlank { "Work Bag" })
            .putBoolean(KEY_ALLOW_CALLS, allowCalls)
            .putBoolean(KEY_ALLOW_SMS, allowSms)
            .putString(KEY_BAG_APPS_JSON, sanitized.toString())
            .commit()
    }

    fun getActiveBagName(): String = prefs.getString(KEY_ACTIVE_BAG_NAME, "Essentials Bag") ?: "Essentials Bag"

    fun isCallsAllowed(): Boolean = prefs.getBoolean(KEY_ALLOW_CALLS, false)

    fun isSmsAllowed(): Boolean = prefs.getBoolean(KEY_ALLOW_SMS, false)

    fun getBagApps(): List<BagApp> {
        val list = mutableListOf<BagApp>()
        val raw = prefs.getString(KEY_BAG_APPS_JSON, "[]") ?: "[]"
        try {
            val arr = JSONArray(raw)
            for (i in 0 until minOf(MAX_BAG_APPS, arr.length())) {
                val obj = arr.optJSONObject(i) ?: continue
                val pkg = obj.optString("packageName", "")
                val name = obj.optString("appName", pkg)
                if (pkg.isNotEmpty()) {
                    list.add(BagApp(packageName = pkg, appName = name))
                }
            }
        } catch (_: Exception) {}
        return list
    }

    fun getAllowedDialerPackages(): Set<String> {
        val pkgs = CORE_CALL_PACKAGES.toMutableSet()
        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            telecom?.defaultDialerPackage?.let { if (it.isNotBlank()) pkgs.add(it) }
        } catch (_: Exception) {}

        try {
            val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:"))
            val matches = queryIntentPackages(dialIntent)
            pkgs.addAll(matches)
        } catch (_: Exception) {}
        return pkgs
    }

    fun getAllowedSmsPackages(): Set<String> {
        val pkgs = mutableSetOf<String>()
        try {
            Telephony.Sms.getDefaultSmsPackage(context)?.let {
                if (it.isNotBlank()) pkgs.add(it)
            }
        } catch (_: Exception) {}

        try {
            val smsIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"))
            pkgs.addAll(queryIntentPackages(smsIntent))
        } catch (_: Exception) {}
        return pkgs
    }

    fun getPrimaryDialerPackage(): String? {
        try {
            val telecom = context.getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
            val def = telecom?.defaultDialerPackage
            if (!def.isNullOrBlank()) return def
        } catch (_: Exception) {}
        val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:"))
        return queryIntentPackages(dialIntent).firstOrNull()
    }

    fun getPrimarySmsPackage(): String? {
        try {
            val def = Telephony.Sms.getDefaultSmsPackage(context)
            if (!def.isNullOrBlank()) return def
        } catch (_: Exception) {}
        val smsIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"))
        return queryIntentPackages(smsIntent).firstOrNull()
    }

    fun isPackageAllowedDuringLock(pkg: String): Boolean {
        if (pkg.isBlank()) return false
        if (pkg == context.packageName) return true

        val customPkgs = getBagApps().map { it.packageName }.toSet()
        if (customPkgs.contains(pkg)) return true

        if (isCallsAllowed() && getAllowedDialerPackages().contains(pkg)) return true
        if (isSmsAllowed() && getAllowedSmsPackages().contains(pkg)) return true

        return false
    }

    private fun queryIntentPackages(intent: Intent): List<String> {
        val pm = context.packageManager
        val list = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(intent, 0)
        }
        return list.mapNotNull { it.activityInfo?.packageName }.filter { it.isNotBlank() }
    }
}
