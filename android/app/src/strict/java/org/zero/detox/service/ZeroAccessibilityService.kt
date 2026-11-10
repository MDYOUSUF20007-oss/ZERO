package org.zero.detox.service

import android.accessibilityservice.AccessibilityService
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.SystemClock
import android.util.Log
import android.view.accessibility.AccessibilityEvent
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.ui.TheVoidActivity

/**
 * ZeroAccessibilityService (Strict BlockIt-Grade Guard):
 * - Intercepts Status Bar / Quick Settings / App Switcher (Recents) pull-down attempts
 * - Intercepts Settings & any app outside The Bag (or Phone/SMS if toggled ON in The Bag)
 * - Immediately restores TheVoidActivity without relying on weak Android Screen Pinning
 */
class ZeroAccessibilityService : AccessibilityService() {

    private lateinit var bagStore: BagStore
    private var lastVoidSnapElapsed: Long = 0L

    override fun onCreate() {
        super.onCreate()
        bagStore = BagStore(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return

        val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val nowWall = System.currentTimeMillis()
        val nowElapsed = SystemClock.elapsedRealtime()
        val timing = LockEngine.rebaseAfterRebootIfNeeded(prefs, nowWall, nowElapsed)
        if (!timing.isLocked || timing.isExpired) return

        val packageName = event.packageName?.toString() ?: ""
        if (packageName.isBlank()) return

        // 0. Always block Settings & Package Installers regardless of Bag configuration
        if (packageName == "com.android.settings" || BagStore.PROTECTED_SYSTEM_PACKAGES.contains(packageName)) {
            performGlobalAction(GLOBAL_ACTION_BACK)
            performGlobalAction(GLOBAL_ACTION_HOME)
            snapToVoid(nowElapsed)
            Log.w("ZeroAccessibility", "Blocked protected system settings/installer: $packageName")
            return
        }

        // 1. Intercept Status Bar, Quick Settings & Recents/Overview drawer attempts
        if (packageName == "com.android.systemui") {
            val className = event.className?.toString() ?: ""
            val lowerClass = className.lowercase()
            if (lowerClass.contains("notification") ||
                lowerClass.contains("statusbar") ||
                lowerClass.contains("quicksettings") ||
                lowerClass.contains("panel") ||
                lowerClass.contains("qs") ||
                lowerClass.contains("recents") ||
                lowerClass.contains("overview")
            ) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    performGlobalAction(GLOBAL_ACTION_DISMISS_NOTIFICATION_SHADE)
                }
                performGlobalAction(GLOBAL_ACTION_BACK)
                snapToVoid(nowElapsed)
                Log.d("ZeroAccessibility", "Blocked SystemUI overlay ($className)")
            }
            return
        }

        // 2. Allow temporary Emergency Dialer grace (911/112) triggered from TheVoidActivity
        if (nowElapsed <= TheVoidActivity.dialerGraceUntilElapsed && bagStore.getAllowedDialerPackages().contains(packageName)) {
            return
        }

        // 3. Allow Zero itself, up to 3 apps packed in The Bag, plus Normal Calls/SMS if Bag permits
        if (bagStore.isPackageAllowedDuringLock(packageName)) {
            return
        }

        // 4. Strictly block every other app (Launcher, Settings, Social Media, Browsers, etc.)
        Log.w("ZeroAccessibility", "Blocked app $packageName during lock. Returning to The Void.")
        performGlobalAction(GLOBAL_ACTION_HOME)
        snapToVoid(nowElapsed)
    }

    private fun snapToVoid(nowElapsed: Long) {
        if (nowElapsed - lastVoidSnapElapsed < 180L) return
        lastVoidSnapElapsed = nowElapsed
        try {
            val voidIntent = Intent(this, TheVoidActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            startActivity(voidIntent)
        } catch (_: Exception) {}
    }

    override fun onInterrupt() {
        Log.w("ZeroAccessibility", "Accessibility service interrupted.")
    }
}
