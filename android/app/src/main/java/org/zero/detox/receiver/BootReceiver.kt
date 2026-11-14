package org.zero.detox.receiver

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.SystemClock
import android.util.Log
import androidx.core.content.ContextCompat
import org.zero.detox.MainActivity
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.service.LockForegroundService
import org.zero.detox.ui.TheVoidActivity

/**
 * BootReceiver: Anti-tamper watchdog.
 * Catches device reboot intents (BOOT_COMPLETED, LOCKED_BOOT_COMPLETED, QUICKBOOT_POWERON).
 * Re-anchors SystemClock.elapsedRealtime() on reboot and restarts The Void or emits a signed VerifiedCompletionEvent.
 */
class BootReceiver : BroadcastReceiver() {

    override fun onReceive(context: Context, intent: Intent) {
        val receivedAction = intent.action ?: return
        Log.i("ZeroAntiTamper", "Boot event intercepted: $receivedAction")

        val prefs = context.getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)

        if (!isLocked) {
            Log.d("ZeroAntiTamper", "No active lock on boot. Standing down.")
            return
        }

        val nowWall = System.currentTimeMillis()
        val nowElapsed = SystemClock.elapsedRealtime()
        val timingBeforeEngine = LockEngine.rebaseAfterRebootIfNeeded(prefs, nowWall, nowElapsed)
        val parachuteStore = ParachuteStore(context)
        val lockEngine = LockEngine(context, parachuteStore)
        val timing = lockEngine.refreshAndCompleteIfExpired()

        if (timing.isLocked && !timing.isExpired) {
            val tag = timing.sessionTag
            Log.w(
                "ZeroAntiTamper",
                "Device rebooted mid-session! Re-anchored monotonic timer. Remaining: ${timing.remainingSeconds}s"
            )
            try {
                val serviceIntent = Intent(context, LockForegroundService::class.java).apply {
                    setAction(LockForegroundService.ACTION_START_LOCK)
                    putExtra("EXTRA_TARGET_TIMESTAMP", timing.targetEndTimeMillis)
                    putExtra("EXTRA_TAG", tag)
                }
                ContextCompat.startForegroundService(context, serviceIntent)
            } catch (_: Exception) {}

            val voidIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            try {
                context.startActivity(voidIntent)
            } catch (_: Exception) {}
        } else if (timingBeforeEngine.isExpired) {
            Log.i("ZeroAntiTamper", "Session completed while powered down. Signed VerifiedCompletionEvent queued.")
        }
    }
}
