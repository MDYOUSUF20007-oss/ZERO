package org.zero.detox.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import org.zero.detox.core.LockEngine
import org.zero.detox.ui.TheVoidActivity

/**
 * ZeroAccessibilityService:
 * Intercepts status bar expansions, notification pull-downs, and unauthorized package launches
 * during an active lock session.
 */
class ZeroAccessibilityService : AccessibilityService() {

    private val allowedPackages = setOf(
        "com.android.phone",
        "com.google.android.dialer",
        "com.samsung.android.dialer",
        "org.zero.detox"
    )

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)
        if (!isLocked) return

        val targetEndTime = prefs.getLong(LockEngine.KEY_TARGET_END_TIME, 0L)
        if (System.currentTimeMillis() >= targetEndTime) return

        val packageName = event.packageName?.toString() ?: ""

        // 1. Intercept Status Bar / Quick Settings pull-down attempts
        if (packageName == "com.android.systemui") {
            val className = event.className?.toString() ?: ""
            if (className.contains("NotificationPanelView") ||
                className.contains("StatusBar") ||
                className.contains("QuickSettings")) {
                // Collapse notification bar immediately
                performGlobalAction(GLOBAL_ACTION_BACK)
                sendBroadcast(Intent(Intent.ACTION_CLOSE_SYSTEM_DIALOGS))
                Log.d("ZeroAccessibility", "Blocked Notification Drawer pull-down attempt.")
            }
        }

        // 2. Intercept unauthorized App switches (e.g., Settings, App Switcher)
        if (packageName.isNotEmpty() && !allowedPackages.contains(packageName) && packageName != "com.android.systemui") {
            Log.w("ZeroAccessibility", "Unauthorized app launch detected: $packageName. Relaunching Void.")
            val voidIntent = Intent(this, TheVoidActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(voidIntent)
        }
    }

    override fun onInterrupt() {
        Log.w("ZeroAccessibility", "Accessibility service interrupted.")
    }
}
