package org.zero.detox.bridge

import android.app.Activity
import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.provider.Settings
import android.webkit.JavascriptInterface
import android.widget.Toast
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.receiver.ZeroDeviceAdminReceiver

/**
 * ZeroNativeBridge:
 * Bridges the React / Web UI layer directly to Android OS-level primitives:
 * - DevicePolicyManager.setLockTaskPackages() (Kiosk mode)
 * - SYSTEM_ALERT_WINDOW (Display over other apps & foreground service launch exemption)
 * - Optional ZeroAccessibilityService (Strict ADB Edition)
 * - Anti-Tamper persistence, ledger sync & battery statistics
 */
class ZeroNativeBridge(
    private val activity: Activity,
    private val lockEngine: LockEngine,
    private val parachuteStore: ParachuteStore
) {

    private val dpm: DevicePolicyManager? =
        activity.getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager
    private val adminComponent = ComponentName(activity, ZeroDeviceAdminReceiver::class.java)

    /**
     * Reports whether this APK includes the optional Strict AccessibilityService
     */
    @JavascriptInterface
    fun isStrictAccessibilityBuild(): Boolean {
        return try {
            Class.forName("org.zero.detox.service.ZeroAccessibilityService")
            true
        } catch (_: ClassNotFoundException) {
            false
        }
    }

    /**
     * Checks if Zero has been provisioned as Device Owner via ADB
     * Command: adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver
     */
    @JavascriptInterface
    fun isDeviceOwner(): Boolean {
        return dpm?.isDeviceOwnerApp(activity.packageName) == true
    }

    /**
     * Checks if the app has permission to draw over other apps (SYSTEM_ALERT_WINDOW)
     */
    @JavascriptInterface
    fun hasOverlayPermission(): Boolean {
        return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Settings.canDrawOverlays(activity)
        } else {
            true
        }
    }

    /**
     * Opens system Settings prompt for SYSTEM_ALERT_WINDOW
     */
    @JavascriptInterface
    fun requestOverlayPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && !Settings.canDrawOverlays(activity)) {
            val intent = Intent(
                Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                Uri.parse("package:${activity.packageName}")
            )
            activity.startActivity(intent)
        }
    }

    /**
     * Checks if ZeroAccessibilityService is actively enabled (when compiled with strict flavor)
     */
    @JavascriptInterface
    fun isAccessibilityEnabled(): Boolean {
        if (!isStrictAccessibilityBuild()) return false
        val expectedComponentName = ComponentName(
            activity.packageName,
            "${activity.packageName}.service.ZeroAccessibilityService"
        ).flattenToString()
        val enabledServices = Settings.Secure.getString(
            activity.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(expectedComponentName)
    }

    /**
     * Opens Accessibility Settings to enable ZeroAccessibilityService
     */
    @JavascriptInterface
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        activity.startActivity(intent)
    }

    /**
     * Starts OS-level LockTaskMode pinning
     */
    @JavascriptInterface
    fun startLockTaskMode() {
        activity.runOnUiThread {
            try {
                if (dpm?.isDeviceOwnerApp(activity.packageName) == true) {
                    dpm.setLockTaskPackages(
                        adminComponent,
                        arrayOf(activity.packageName, "com.android.dialer")
                    )
                }
                activity.startLockTask()
            } catch (e: Exception) {
                Toast.makeText(activity, "Pinning: " + e.localizedMessage, Toast.LENGTH_SHORT).show()
            }
        }
    }

    /**
     * Exits LockTaskMode
     */
    @JavascriptInterface
    fun stopLockTaskMode() {
        activity.runOnUiThread {
            try {
                activity.stopLockTask()
            } catch (_: Exception) {}
        }
    }

    /**
     * Synchronizes React Web UI cumulative seconds & deployed parachutes into native store
     */
    @JavascriptInterface
    fun syncLedgerState(cumulativeSeconds: Long, deployedCount: Int) {
        parachuteStore.syncLedgerState(cumulativeSeconds, deployedCount)
    }

    /**
     * Engages The Void with persistent timestamp boundaries
     */
    @JavascriptInterface
    fun igniteSession(durationSeconds: Long, tag: String) {
        lockEngine.igniteSession(durationSeconds, tag)
    }

    /**
     * Emergency Parachute Unlock
     */
    @JavascriptInterface
    fun deployParachute(): Boolean {
        return lockEngine.deployParachute()
    }

    /**
     * Real-time Battery Percentage
     */
    @JavascriptInterface
    fun getBatteryPercentage(): Int {
        val bm = activity.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        return bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
    }

    /**
     * Returns synchronized native lock + ledger snapshot as JSON string
     */
    @JavascriptInterface
    fun getNativeStateJson(): String {
        val prefs = activity.getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)
        val metrics = parachuteStore.getMetrics()
        return "{\"isLocked\":$isLocked,\"cumulativeSeconds\":${metrics.totalCumulativeSeconds},\"deployedCount\":${metrics.deployedParachutes}}"
    }
}
