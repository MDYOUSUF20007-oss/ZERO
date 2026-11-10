package org.zero.detox.bridge

import android.Manifest
import android.accessibilityservice.AccessibilityServiceInfo
import android.app.Activity
import android.app.AppOpsManager
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Process
import android.provider.Settings
import android.util.Base64
import android.view.accessibility.AccessibilityManager
import android.webkit.JavascriptInterface
import android.widget.Toast
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import androidx.core.content.FileProvider
import org.json.JSONArray
import org.json.JSONObject
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.data.ParachuteStore
import org.zero.detox.receiver.ZeroDeviceAdminReceiver
import java.io.File

/**
 * ZeroNativeBridge:
 * Bridges the React UI layer directly to Android OS primitives:
 * - Accessibility Service status & Settings launch
 * - Usage Access (PACKAGE_USAGE_STATS) & Display Over Other Apps (SYSTEM_ALERT_WINDOW)
 * - Post Notifications runtime prompt (Android 13+)
 * - 4-Bag Suitcase installed-app discovery, persistence & Bag syncing
 * - Native PNG Flex Scorecard sharing & JSON Backup export via FileProvider
 * - DeviceOwner Kiosk mode (without falling back to weak manual Screen Pinning)
 */
class ZeroNativeBridge(
    private val activity: Activity,
    private val lockEngine: LockEngine,
    private val parachuteStore: ParachuteStore,
    private val bagStore: BagStore
) {

    private val dpm: DevicePolicyManager? =
        activity.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
    private val adminComponent = ComponentName(activity, ZeroDeviceAdminReceiver::class.java)

    @JavascriptInterface
    fun isStrictAccessibilityBuild(): Boolean {
        return try {
            Class.forName("org.zero.detox.service.ZeroAccessibilityService")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
    }

    @JavascriptInterface
    fun isDeviceOwner(): Boolean {
        return dpm?.isDeviceOwnerApp(activity.packageName) == true
    }

    @JavascriptInterface
    fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(activity)
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(activity)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${activity.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(intent)
        }
    }

    @JavascriptInterface
    fun hasUsageStatsPermission(): Boolean {
        return try {
            val appOps = activity.getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
            val mode = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                appOps.unsafeCheckOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    activity.packageName
                )
            } else {
                @Suppress("DEPRECATION")
                appOps.checkOpNoThrow(
                    AppOpsManager.OPSTR_GET_USAGE_STATS,
                    Process.myUid(),
                    activity.packageName
                )
            }
            mode == AppOpsManager.MODE_ALLOWED
        } catch (_: Exception) {
            false
        }
    }

    @JavascriptInterface
    fun requestUsageStatsPermission() {
        try {
            val directIntent = Intent(
                Settings.ACTION_USAGE_ACCESS_SETTINGS,
                Uri.parse("package:${activity.packageName}")
            ).apply {
                addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            }
            activity.startActivity(directIntent)
            return
        } catch (_: Exception) {}

        val fallbackIntent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        try {
            activity.startActivity(fallbackIntent)
        } catch (_: Exception) {
            openAppSettingsDetails()
        }
    }

    @JavascriptInterface
    fun hasNotificationPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            ContextCompat.checkSelfPermission(
                activity,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
        } else {
            true
        }
    }

    @JavascriptInterface
    fun requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            activity.runOnUiThread {
                ActivityCompat.requestPermissions(
                    activity,
                    arrayOf(Manifest.permission.POST_NOTIFICATIONS),
                    1001
                )
            }
        }
    }

    @JavascriptInterface
    fun isAccessibilityEnabled(): Boolean {
        if (!isStrictAccessibilityBuild()) return false
        try {
            val am = activity.getSystemService(Context.ACCESSIBILITY_SERVICE) as? AccessibilityManager
            val enabledList = am?.getEnabledAccessibilityServiceList(AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            if (enabledList != null) {
                for (info in enabledList) {
                    val pkg = info.resolveInfo?.serviceInfo?.packageName
                    if (pkg == activity.packageName) return true
                }
            }
        } catch (_: Exception) {}

        val expectedFull = ComponentName(
            activity.packageName,
            "${activity.packageName}.service.ZeroAccessibilityService"
        ).flattenToString()
        val expectedShort = ComponentName(
            activity.packageName,
            "${activity.packageName}.service.ZeroAccessibilityService"
        ).flattenToShortString()
        val enabledServices = Settings.Secure.getString(
            activity.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(expectedFull) || enabledServices.contains(expectedShort)
    }

    @JavascriptInterface
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
    }

    @JavascriptInterface
    fun openAppSettingsDetails() {
        val intent = Intent(
            Settings.ACTION_APPLICATION_DETAILS_SETTINGS,
            Uri.parse("package:${activity.packageName}")
        ).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        activity.startActivity(intent)
    }

    private fun computeStrictReady(): Boolean {
        if (isDeviceOwner()) return true
        return if (isStrictAccessibilityBuild()) {
            isAccessibilityEnabled() && hasOverlayPermission()
        } else {
            hasOverlayPermission() && hasUsageStatsPermission()
        }
    }

    @JavascriptInterface
    fun requestNextMissingPermission() {
        if (isStrictAccessibilityBuild() && !isAccessibilityEnabled()) {
            activity.runOnUiThread {
                Toast.makeText(
                    activity,
                    "Enable Zero in Accessibility Services (App Info -> Allow Restricted Settings if greyed out)",
                    Toast.LENGTH_LONG
                ).show()
            }
            openAccessibilitySettings()
            return
        }
        if (!isStrictAccessibilityBuild() && !hasUsageStatsPermission()) {
            activity.runOnUiThread {
                Toast.makeText(activity, "Allow Usage Access for Zero", Toast.LENGTH_LONG).show()
            }
            requestUsageStatsPermission()
            return
        }
        if (!hasOverlayPermission()) {
            activity.runOnUiThread {
                Toast.makeText(activity, "Allow Display Over Other Apps for Zero", Toast.LENGTH_LONG).show()
            }
            requestOverlayPermission()
            return
        }
        if (!hasNotificationPermission()) {
            requestNotificationPermission()
        }
    }

    @JavascriptInterface
    fun getPermissionStatusJson(): String {
        val strictBuild = isStrictAccessibilityBuild()
        val accessibility = isAccessibilityEnabled()
        val overlay = hasOverlayPermission()
        val usage = hasUsageStatsPermission()
        val notifications = hasNotificationPermission()
        val owner = isDeviceOwner()
        val strictReady = computeStrictReady()

        return JSONObject().apply {
            put("isNativeAndroid", true)
            put("isStrictAccessibilityBuild", strictBuild)
            put("isAccessibilityEnabled", accessibility)
            put("hasOverlayPermission", overlay)
            put("hasUsageStatsPermission", usage)
            put("hasNotificationPermission", notifications)
            put("isDeviceOwner", owner)
            put("strictReady", strictReady)
        }.toString()
    }

    @JavascriptInterface
    fun getInstalledAppsJson(): String {
        val pm = activity.packageManager
        val mainIntent = Intent(Intent.ACTION_MAIN, null).apply {
            addCategory(Intent.CATEGORY_LAUNCHER)
        }
        val resolveList = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            pm.queryIntentActivities(mainIntent, PackageManager.ResolveInfoFlags.of(0L))
        } else {
            @Suppress("DEPRECATION")
            pm.queryIntentActivities(mainIntent, 0)
        }

        val callPkgs = bagStore.getAllowedDialerPackages()
        val smsPkgs = bagStore.getAllowedSmsPackages()
        val seen = HashSet<String>()
        val items = mutableListOf<Triple<String, String, String>>()

        for (ri in resolveList) {
            val pkg = ri.activityInfo?.packageName ?: continue
            if (pkg == activity.packageName || pkg == "com.android.settings") continue
            if (!seen.add(pkg)) continue
            val label = ri.loadLabel(pm)?.toString()?.trim().takeUnless { it.isNullOrBlank() } ?: pkg
            val category = when {
                callPkgs.contains(pkg) -> "calls"
                smsPkgs.contains(pkg) -> "messages"
                else -> "custom"
            }
            items.add(Triple(label, pkg, category))
        }

        items.sortBy { it.first.lowercase() }
        val json = JSONArray()
        for ((label, pkg, category) in items) {
            json.put(
                JSONObject().apply {
                    put("packageName", pkg)
                    put("appName", label)
                    put("category", category)
                }
            )
        }
        return json.toString()
    }

    @JavascriptInterface
    fun setBagStateJson(bagName: String, appsJson: String, allowCalls: Boolean, allowSms: Boolean) {
        bagStore.saveActiveBag(bagName, appsJson, allowCalls, allowSms)
    }

    @JavascriptInterface
    fun getBagStateJson(): String {
        val arr = JSONArray()
        for (app in bagStore.getBagApps()) {
            arr.put(
                JSONObject().apply {
                    put("packageName", app.packageName)
                    put("appName", app.appName)
                }
            )
        }
        return JSONObject().apply {
            put("bagName", bagStore.getActiveBagName())
            put("allowCalls", bagStore.isCallsAllowed())
            put("allowSms", bagStore.isSmsAllowed())
            put("apps", arr)
        }.toString()
    }

    @JavascriptInterface
    fun shareImageBase64(base64Png: String, fileName: String, caption: String) {
        try {
            val cleanB64 = base64Png.substringAfter(",", base64Png)
            val bytes = Base64.decode(cleanB64, Base64.DEFAULT)
            val shareDir = File(activity.cacheDir, "shared")
            if (!shareDir.exists()) shareDir.mkdirs()
            val outFile = File(shareDir, fileName.ifBlank { "zero-focus-card.png" })
            outFile.writeBytes(bytes)

            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", outFile)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "image/png"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_TEXT, caption)
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.runOnUiThread {
                activity.startActivity(Intent.createChooser(intent, "Share Zero Achievement"))
            }
        } catch (e: Exception) {
            activity.runOnUiThread {
                Toast.makeText(activity, "Share failed: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun exportBackupJson(jsonContent: String, fileName: String) {
        try {
            val backupDir = File(activity.cacheDir, "backups")
            if (!backupDir.exists()) backupDir.mkdirs()
            val outFile = File(backupDir, fileName.ifBlank { "zero-backup.json" })
            outFile.writeText(jsonContent, Charsets.UTF_8)

            val uri = FileProvider.getUriForFile(activity, "${activity.packageName}.fileprovider", outFile)
            val intent = Intent(Intent.ACTION_SEND).apply {
                type = "application/json"
                putExtra(Intent.EXTRA_STREAM, uri)
                putExtra(Intent.EXTRA_SUBJECT, "Zero Digital Detox Backup")
                addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
            }
            activity.runOnUiThread {
                activity.startActivity(Intent.createChooser(intent, "Save or Send Zero Backup"))
            }
        } catch (e: Exception) {
            activity.runOnUiThread {
                Toast.makeText(activity, "Export failed: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun openExternalUrl(url: String) {
        val trimmed = url.trim()
        val parsed = try {
            Uri.parse(trimmed)
        } catch (_: Exception) {
            null
        } ?: return

        val scheme = parsed.scheme?.lowercase() ?: return
        if (scheme != "https" && scheme != "http" && scheme != "upi") {
            return
        }

        activity.runOnUiThread {
            try {
                val intent = Intent(Intent.ACTION_VIEW, parsed).apply {
                    addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                }
                activity.startActivity(intent)
            } catch (_: Exception) {
                val msg = if (scheme == "upi") {
                    "No UPI app found. Please copy the UPI ID (md.y2007@ptaxis) manually."
                } else {
                    "No browser app found to open this link."
                }
                Toast.makeText(activity, msg, Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Starts OS LockTaskMode strictly when Zero is provisioned as Device Owner.
     * Never invokes manual Screen Pinning fallback.
     */
    @JavascriptInterface
    fun startLockTaskMode() {
        activity.runOnUiThread {
            try {
                if (dpm?.isDeviceOwnerApp(activity.packageName) == true) {
                    dpm.setLockTaskPackages(
                        adminComponent,
                        arrayOf(activity.packageName)
                    )
                    activity.startLockTask()
                }
            } catch (e: Exception) {
                Toast.makeText(activity, "Kiosk: " + e.localizedMessage, Toast.LENGTH_SHORT).show()
            }
        }
    }

    @JavascriptInterface
    fun stopLockTaskMode() {
        activity.runOnUiThread {
            try {
                activity.stopLockTask()
            } catch (_: Exception) {}
        }
    }

    @JavascriptInterface
    fun syncLedgerState(cumulativeSeconds: Long, deployedCount: Int) {
        parachuteStore.syncLedgerState(cumulativeSeconds, deployedCount, 0)
    }

    @JavascriptInterface
    fun syncLedgerStateWithBonus(cumulativeSeconds: Long, deployedCount: Int, bonusCount: Int) {
        parachuteStore.syncLedgerState(cumulativeSeconds, deployedCount, bonusCount)
    }

    @JavascriptInterface
    fun igniteSession(durationSeconds: Long, tag: String): Boolean {
        if (!computeStrictReady()) {
            requestNextMissingPermission()
            return false
        }
        lockEngine.igniteSession(durationSeconds, tag)
        return true
    }

    @JavascriptInterface
    fun deployParachute(): Boolean {
        return lockEngine.deployParachute()
    }

    @JavascriptInterface
    fun getBatteryPercentage(): Int {
        val bm = activity.getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        return bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
    }

    @JavascriptInterface
    fun getNativeStateJson(): String {
        val prefs = activity.getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)
        val metrics = parachuteStore.getMetrics()
        return "{\"isLocked\":$isLocked,\"cumulativeSeconds\":${metrics.totalCumulativeSeconds},\"deployedCount\":${metrics.deployedParachutes},\"bonusCount\":${metrics.bonusParachutes}}"
    }
}
