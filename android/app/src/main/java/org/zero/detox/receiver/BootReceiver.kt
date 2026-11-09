package org.zero.detox.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.ui.TheVoidActivity

/**
 * BootReceiver: Anti-tamper watchdog.
 * Catches device reboot intents (BOOT_COMPLETED, LOCKED_BOOT_COMPLETED, QUICKBOOT_POWERON).
 * Ensures that if a user reboots their phone mid-session, The Void immediately takes over.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        Log.i("ZeroAntiTamper", "Boot event intercepted: $action")

        val prefs = context.getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)

        if (!isLocked) {
            Log.d("ZeroAntiTamper", "No active lock on boot. Standing down.")
            return
        }

        val targetEndTime = prefs.getLong(LockEngine.KEY_TARGET_END_TIME, 0L)
        val now = System.currentTimeMillis()

        if (now < targetEndTime) {
            // Lock is still active! Immediately re-surface The Void
            Log.w("ZeroAntiTamper", "Device rebooted mid-session! Re-engaging The Void. Remaining: ${(targetEndTime - now)/1000}s")
            val voidIntent = Intent(context, TheVoidActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
            }
            context.startActivity(voidIntent)
        } else {
            // Lock expired during reboot / shutdown
            Log.i("ZeroAntiTamper", "Session completed while powered down. Crediting cumulative hours.")
            val parachuteStore = ParachuteStore(context)
            val duration = prefs.getLong(LockEngine.KEY_DURATION_SECONDS, 0L)
            val tag = prefs.getString(LockEngine.KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"
            parachuteStore.recordCompletedSession(tag, duration, targetEndTime)
            prefs.edit().clear().apply()
        }
    }
}
