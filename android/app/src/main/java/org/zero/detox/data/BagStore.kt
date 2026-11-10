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
import java.net.URLDecoder
import java.net.URLEncoder

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
        const val KEY_BAG_APPS_COMPACT = "bag_apps_compact"
        const val MAX_BAG_APPS = 3

        private val OBJ_PATTERN = Regex("\\{([^{}]*)\\}")
        private val PKG_PATTERN = Regex("\"packageName\"\\s*:\\s*\"([^\"]+)\"")
        private val LABEL_PATTERN = Regex("\"appName\"\\s*:\\s*\"([^\"]*)\"")

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
        val parsedApps = parseIncomingApps(appsJson).take(MAX_BAG_APPS)

        val sanitizedJson = try {
            val arr = JSONArray()
            for (app in parsedApps) {
                arr.put(
                    JSONObject().apply {
                        put("packageName", app.packageName)
                        put("appName", app.appName)
                    }
                )
            }
            arr.toString() ?: "[]"
        } catch (_: Exception) {
            "[]"
        }

        val compact = serializeCompact(parsedApps)

        prefs.edit()
            .putString(KEY_ACTIVE_BAG_NAME, bagName.ifBlank { "Work Bag" })
            .putBoolean(KEY_ALLOW_CALLS, allowCalls)
            .putBoolean(KEY_ALLOW_SMS, allowSms)
            .putString(KEY_BAG_APPS_JSON, sanitizedJson)
            .putString(KEY_BAG_APPS_COMPACT, compact)
            .commit()
    }

    private fun parseIncomingApps(raw: String): List<BagApp> {
        val result = mutableListOf<BagApp>()
        val seen = HashSet<String>()

        try {
            val incoming = JSONArray(raw)
            val len = incoming.length()
            if (len > 0) {
                for (i in 0 until minOf(MAX_BAG_APPS, len)) {
                    val item = incoming.optJSONObject(i) ?: continue
                    val pkg = item.optString("packageName", "").trim()
                    val label = item.optString("appName", pkg).trim().ifEmpty { pkg }
                    if (pkg.isNotEmpty() && seen.add(pkg)) {
                        result.add(BagApp(packageName = pkg, appName = label))
                    }
                }
                if (result.isNotEmpty()) return result
            }
        } catch (_: Exception) {}

        // Pure-Kotlin fallback (handles JVM stubbed org.json unit tests cleanly)
        for (match in OBJ_PATTERN.findAll(raw)) {
            if (result.size >= MAX_BAG_APPS) break
            val block = match.groupValues[1]
            val pkg = PKG_PATTERN.find(block)?.groupValues?.getOrNull(1)?.trim().orEmpty()
            if (pkg.isEmpty() || !seen.add(pkg)) continue
            val label = LABEL_PATTERN.find(block)?.groupValues?.getOrNull(1)?.trim()?.ifEmpty { pkg } ?: pkg
            result.add(BagApp(packageName = pkg, appName = label))
        }
        return result
    }

    private fun serializeCompact(apps: List<BagApp>): String {
        return apps.take(MAX_BAG_APPS).joinToString(";") { app ->
            val encodedPkg = URLEncoder.encode(app.packageName, "UTF-8")
            val encodedName = URLEncoder.encode(app.appName, "UTF-8")
            "$encodedPkg=$encodedName"
        }
    }

    private fun parseCompact(compact: String): List<BagApp> {
        if (compact.isBlank()) return emptyList()
        val list = mutableListOf<BagApp>()
        for (entry in compact.split(";")) {
            if (list.size >= MAX_BAG_APPS) break
            val idx = entry.indexOf('=')
            if (idx <= 0) continue
            try {
                val pkg = URLDecoder.decode(entry.substring(0, idx), "UTF-8").trim()
                val label = URLDecoder.decode(entry.substring(idx + 1), "UTF-8").trim().ifEmpty { pkg }
                if (pkg.isNotEmpty()) {
                    list.add(BagApp(packageName = pkg, appName = label))
                }
            } catch (_: Exception) {}
        }
        return list
    }

    fun getActiveBagName(): String = prefs.getString(KEY_ACTIVE_BAG_NAME, "Essentials Bag") ?: "Essentials Bag"

    fun isCallsAllowed(): Boolean = prefs.getBoolean(KEY_ALLOW_CALLS, false)

    fun isSmsAllowed(): Boolean = prefs.getBoolean(KEY_ALLOW_SMS, false)

    fun getBagApps(): List<BagApp> {
        val compact = prefs.getString(KEY_BAG_APPS_COMPACT, "") ?: ""
        if (compact.isNotEmpty()) {
            return parseCompact(compact)
        }
        val raw = prefs.getString(KEY_BAG_APPS_JSON, "[]") ?: "[]"
        return parseIncomingApps(raw)
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
            pm.queryIntentActivities(intent, PackageManager.ResolveInfoFlags.of(0L))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(intent, 0)
        }
        return list.mapNotNull { it.activityInfo?.packageName }.filter { it.isNotBlank() }
    }
}
