package org.zero.detox.core

import android.content.Context
import android.content.Intent
import android.os.SystemClock
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.zero.detox.data.ParachuteStore
import org.zero.detox.service.LockForegroundService
import org.zero.detox.ui.TheVoidActivity

/**
 * LockEngine: Coordinates the execution, anti-tamper state, and lifecycle of a Zero Lock Session.
 */
class LockEngine(private val context: Context, private val parachuteStore: ParachuteStore) {

    data class SessionState(
        val isLocked: Boolean = false,
        val sessionTag: String = "Deep Work",
        val startTimeMillis: Long = 0L,
        val targetEndTimeMillis: Long = 0L,
        val durationSeconds: Long = 0L,
        val elapsedSeconds: Long = 0L,
        val remainingSeconds: Long = 0L
    )

    private val _sessionState = MutableStateFlow(loadPersistedState())
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    companion object {
        const val PREFS_NAME = "zero_lock_engine_state"
        const val KEY_IS_LOCKED = "is_locked"
        const val KEY_SESSION_TAG = "session_tag"
        const val KEY_START_TIME = "start_time_millis"
        const val KEY_TARGET_END_TIME = "target_end_time_millis"
        const val KEY_DURATION_SECONDS = "duration_seconds"
    }

    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    /**
     * Arm and ignite a new lock session.
     * Persists timestamp boundaries immediately so reboots cannot bypass it.
     */
    fun igniteSession(durationSeconds: Long, tag: String) {
        val now = System.currentTimeMillis()
        val targetEndTime = now + (durationSeconds * 1000L)

        prefs.edit()
            .putBoolean(KEY_IS_LOCKED, true)
            .putString(KEY_SESSION_TAG, tag)
            .putLong(KEY_START_TIME, now)
            .putLong(KEY_TARGET_END_TIME, targetEndTime)
            .putLong(KEY_DURATION_SECONDS, durationSeconds)
            .commit() // Commit synchronously to ensure flash memory write before lock overlay engages

        _sessionState.value = SessionState(
            isLocked = true,
            sessionTag = tag,
            startTimeMillis = now,
            targetEndTimeMillis = targetEndTime,
            durationSeconds = durationSeconds,
            elapsedSeconds = 0L,
            remainingSeconds = durationSeconds
        )

        // Start Foreground Guard Service
        val serviceIntent = Intent(context, LockForegroundService::class.java).apply {
            action = LockForegroundService.ACTION_START_LOCK
            putExtra("EXTRA_TARGET_TIMESTAMP", targetEndTime)
            putExtra("EXTRA_TAG", tag)
        }
        context.startForegroundService(serviceIntent)

        // Launch The Void lock overlay
        val voidIntent = Intent(context, TheVoidActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_EXCLUDE_FROM_RECENTS
        }
        context.startActivity(voidIntent)
    }

    /**
     * Terminate the lock session successfully upon timer expiration.
     * Credits the full duration towards the 20-Hour Parachute progression milestone.
     */
    fun completeSession() {
        val current = _sessionState.value
        if (!current.isLocked) return

        val completedSeconds = current.durationSeconds

        // Credit to Parachute Store (anti-cheat: only full completions count)
        parachuteStore.recordCompletedSession(
            tag = current.sessionTag,
            seconds = completedSeconds,
            timestamp = System.currentTimeMillis()
        )

        clearLockState()
    }

    /**
     * Deploy Parachute: Emergency unlock mechanism.
     * Deducts 1 Parachute.
     * STRICT ANTI-EXPLOIT RULE: The elapsed time in this aborted session is VOIDED
     * and NOT counted toward the 20-hour parachute milestone.
     */
    fun deployParachute(): Boolean {
        val canDeploy = parachuteStore.getParachuteBalance() >= 1
        if (!canDeploy) return false

        val current = _sessionState.value
        val elapsed = (System.currentTimeMillis() - current.startTimeMillis) / 1000L

        // Record parachute deployment transaction
        val success = parachuteStore.useParachute(
            abortedTag = current.sessionTag,
            abortedElapsedSeconds = elapsed,
            timestamp = System.currentTimeMillis()
        )

        if (success) {
            clearLockState()
            return true
        }
        return false
    }

    private fun clearLockState() {
        prefs.edit().clear().commit()
        _sessionState.value = SessionState(isLocked = false)

        val serviceIntent = Intent(context, LockForegroundService::class.java).apply {
            action = LockForegroundService.ACTION_STOP_LOCK
        }
        context.startService(serviceIntent)
    }

    private fun loadPersistedState(): SessionState {
        val isLocked = prefs.getBoolean(KEY_IS_LOCKED, false)
        if (!isLocked) return SessionState(isLocked = false)

        val targetEndTime = prefs.getLong(KEY_TARGET_END_TIME, 0L)
        val now = System.currentTimeMillis()

        if (now >= targetEndTime) {
            // Lock completed while device was powered off / asleep
            val duration = prefs.getLong(KEY_DURATION_SECONDS, 0L)
            val tag = prefs.getString(KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"
            parachuteStore.recordCompletedSession(tag, duration, targetEndTime)
            prefs.edit().clear().commit()
            return SessionState(isLocked = false)
        }

        val startTime = prefs.getLong(KEY_START_TIME, now)
        val duration = prefs.getLong(KEY_DURATION_SECONDS, 0L)
        val remaining = (targetEndTime - now) / 1000L
        val elapsed = (now - startTime) / 1000L
        val tag = prefs.getString(KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"

        return SessionState(
            isLocked = true,
            sessionTag = tag,
            startTimeMillis = startTime,
            targetEndTimeMillis = targetEndTime,
            durationSeconds = duration,
            elapsedSeconds = elapsed,
            remainingSeconds = remaining
        )
    }
}
