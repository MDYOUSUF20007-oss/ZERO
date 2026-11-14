package org.zero.detox.core

import android.content.Context
import android.content.Intent
import android.content.SharedPreferences
import android.os.SystemClock
import androidx.core.content.ContextCompat
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.zero.detox.MainActivity
import org.zero.detox.data.ParachuteStore
import org.zero.detox.engage.EngageConfigStore
import org.zero.detox.service.LockForegroundService
import org.zero.detox.ui.TheVoidActivity
import javax.crypto.Mac
import javax.crypto.spec.SecretKeySpec

/**
 * LockEngine: Coordinates execution, monotonic SystemClock.elapsedRealtime() timing,
 * anti-tamper state, verified session completion proofs, and Escape Ticket aborts.
 */
class LockEngine @JvmOverloads constructor(
    private val context: Context,
    private val parachuteStore: ParachuteStore,
    private val elapsedRealtimeProvider: () -> Long = { SystemClock.elapsedRealtime() },
    private val wallClockProvider: () -> Long = { System.currentTimeMillis() }
) {

    data class SessionState(
        val isLocked: Boolean = false,
        val sessionTag: String = "Deep Work",
        val startTimeMillis: Long = 0L,
        val targetEndTimeMillis: Long = 0L,
        val durationSeconds: Long = 0L,
        val elapsedSeconds: Long = 0L,
        val remainingSeconds: Long = 0L
    )

    data class LockTimingSnapshot(
        val isLocked: Boolean,
        val isExpired: Boolean,
        val sessionId: String,
        val sessionTag: String,
        val startTimeMillis: Long,
        val targetEndTimeMillis: Long,
        val durationSeconds: Long,
        val elapsedSeconds: Long,
        val remainingSeconds: Long,
        val remainingMillis: Long,
        val elapsedMonotonicMillis: Long,
        val usedRebootFallback: Boolean,
        val needsRebootRebase: Boolean
    )

    companion object {
        const val PREFS_NAME = "zero_lock_engine_state"
        const val KEY_IS_LOCKED = "is_locked"
        const val KEY_SESSION_ID = "session_id"
        const val KEY_SESSION_TAG = "session_tag"
        const val KEY_START_TIME = "start_time_millis"
        const val KEY_TARGET_END_TIME = "target_end_time_millis"
        const val KEY_DURATION_SECONDS = "duration_seconds"
        const val KEY_BOOT_ANCHOR_ELAPSED_MS = "boot_anchor_elapsed_ms"
        const val KEY_PRIOR_ELAPSED_MS = "prior_elapsed_ms"
        const val KEY_REBOOT_REBASED = "reboot_rebased"

        const val MONOTONIC_SOURCE = "android_elapsed_realtime"
        private const val NATIVE_EVENT_HMAC_SECRET = "ZERO::FOSS::NATIVE::MONOTONIC::v1::org.zero.detox"
        private val COMPLETION_LOCK = Any()

        /**
         * Evaluates active lock status strictly via Android's monotonic SystemClock.elapsedRealtime()
         * on same-boot sessions so shifting wall-clock Date/Time forward cannot spoof completion.
         * Across genuine cold device reboots (elapsedRealtime < saved boot anchor), safely rebases
         * prior elapsed time using persisted boundaries and immediately re-anchors to SystemClock.elapsedRealtime().
         */
        @JvmStatic
        fun evaluateLockTiming(
            prefs: SharedPreferences,
            nowWallMs: Long,
            nowElapsedMs: Long
        ): LockTimingSnapshot {
            val isLocked = prefs.getBoolean(KEY_IS_LOCKED, false)
            if (!isLocked) {
                return LockTimingSnapshot(
                    isLocked = false,
                    isExpired = false,
                    sessionId = "",
                    sessionTag = "Deep Work",
                    startTimeMillis = 0L,
                    targetEndTimeMillis = 0L,
                    durationSeconds = 0L,
                    elapsedSeconds = 0L,
                    remainingSeconds = 0L,
                    remainingMillis = 0L,
                    elapsedMonotonicMillis = 0L,
                    usedRebootFallback = false,
                    needsRebootRebase = false
                )
            }

            val tag = prefs.getString(KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"
            val durationSeconds = maxOf(0L, prefs.getLong(KEY_DURATION_SECONDS, 0L))
            val durationMillis = durationSeconds * 1000L
            val startWall = prefs.getLong(KEY_START_TIME, nowWallMs)
            val targetEndWall = prefs.getLong(KEY_TARGET_END_TIME, startWall + durationMillis)
            val sessionId = prefs.getString(KEY_SESSION_ID, "sess_$startWall") ?: "sess_$startWall"

            val bootAnchorElapsed = prefs.getLong(KEY_BOOT_ANCHOR_ELAPSED_MS, -1L)
            val priorElapsedMs = maxOf(0L, prefs.getLong(KEY_PRIOR_ELAPSED_MS, 0L))
            val alreadyRebased = prefs.getBoolean(KEY_REBOOT_REBASED, false)

            val sameBootMonotonic = bootAnchorElapsed >= 0L && nowElapsedMs >= bootAnchorElapsed
            return if (sameBootMonotonic) {
                val activeBootElapsed = maxOf(0L, nowElapsedMs - bootAnchorElapsed)
                val totalMonotonicElapsed = priorElapsedMs + activeBootElapsed
                val remainingMs = maxOf(0L, durationMillis - totalMonotonicElapsed)
                val isExpired = (durationMillis == 0L) || (totalMonotonicElapsed >= durationMillis)
                val elapsedSec = minOf(durationSeconds, totalMonotonicElapsed / 1000L)
                val remainingSec = maxOf(0L, remainingMs / 1000L)

                LockTimingSnapshot(
                    isLocked = true,
                    isExpired = isExpired,
                    sessionId = sessionId,
                    sessionTag = tag,
                    startTimeMillis = startWall,
                    targetEndTimeMillis = targetEndWall,
                    durationSeconds = durationSeconds,
                    elapsedSeconds = elapsedSec,
                    remainingSeconds = remainingSec,
                    remainingMillis = remainingMs,
                    elapsedMonotonicMillis = totalMonotonicElapsed,
                    usedRebootFallback = alreadyRebased,
                    needsRebootRebase = false
                )
            } else {
                // Device cold-rebooted or pre-upgrade session: compute wall-clock gap while offline
                val elapsedWall = maxOf(0L, minOf(durationMillis, nowWallMs - startWall))
                val remainingMs = maxOf(0L, targetEndWall - nowWallMs)
                val isExpired = nowWallMs >= targetEndWall
                LockTimingSnapshot(
                    isLocked = true,
                    isExpired = isExpired,
                    sessionId = sessionId,
                    sessionTag = tag,
                    startTimeMillis = startWall,
                    targetEndTimeMillis = targetEndWall,
                    durationSeconds = durationSeconds,
                    elapsedSeconds = minOf(durationSeconds, elapsedWall / 1000L),
                    remainingSeconds = maxOf(0L, remainingMs / 1000L),
                    remainingMillis = remainingMs,
                    elapsedMonotonicMillis = elapsedWall,
                    usedRebootFallback = true,
                    needsRebootRebase = !isExpired
                )
            }
        }

        @JvmStatic
        fun rebaseAfterRebootIfNeeded(
            prefs: SharedPreferences,
            nowWallMs: Long,
            nowElapsedMs: Long
        ): LockTimingSnapshot {
            val current = evaluateLockTiming(prefs, nowWallMs, nowElapsedMs)
            if (current.isLocked && current.needsRebootRebase) {
                val durationMs = current.durationSeconds * 1000L
                val priorAtReboot = maxOf(0L, minOf(durationMs, durationMs - current.remainingMillis))
                prefs.edit()
                    .putLong(KEY_PRIOR_ELAPSED_MS, priorAtReboot)
                    .putLong(KEY_BOOT_ANCHOR_ELAPSED_MS, nowElapsedMs)
                    .putBoolean(KEY_REBOOT_REBASED, true)
                    .commit()
                return evaluateLockTiming(prefs, nowWallMs, nowElapsedMs)
            }
            return current
        }

        @JvmStatic
        fun computeNativeProofDigest(
            eventId: String,
            sessionId: String,
            tag: String,
            startTimeMillis: Long,
            endTimeMillis: Long,
            durationSeconds: Long,
            elapsedMonotonicMs: Long,
            usedRebootFallback: Boolean
        ): String {
            val rebootFlag = if (usedRebootFallback) 1 else 0
            val payload =
                "ZERO::NATIVE::v1|$eventId|$sessionId|$tag|$startTimeMillis|$endTimeMillis|$durationSeconds|$elapsedMonotonicMs|$rebootFlag"
            val mac = Mac.getInstance("HmacSHA256")
            mac.init(SecretKeySpec(NATIVE_EVENT_HMAC_SECRET.toByteArray(Charsets.UTF_8), "HmacSHA256"))
            val raw = mac.doFinal(payload.toByteArray(Charsets.UTF_8))
            return raw.joinToString("") { "%02x".format(it) }
        }
    }

    // Must be declared BEFORE _sessionState so loadPersistedState() sees an initialized prefs instance
    private val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    private val _sessionState = MutableStateFlow(loadPersistedState())
    val sessionState: StateFlow<SessionState> = _sessionState.asStateFlow()

    /**
     * Arm and ignite a new lock session using both wall boundaries (reboot reference)
     * and Android's monotonic SystemClock.elapsedRealtime() anchor (tamper-proof active lock).
     */
    fun igniteSession(durationSeconds: Long, tag: String) {
        val safeDuration = maxOf(0L, durationSeconds)
        val nowWall = wallClockProvider()
        val nowElapsed = elapsedRealtimeProvider()
        val targetEndTime = nowWall + (safeDuration * 1000L)
        val sessionId = "sess_${nowWall}_${nowElapsed}"

        prefs.edit()
            .putBoolean(KEY_IS_LOCKED, true)
            .putString(KEY_SESSION_ID, sessionId)
            .putString(KEY_SESSION_TAG, tag)
            .putLong(KEY_START_TIME, nowWall)
            .putLong(KEY_TARGET_END_TIME, targetEndTime)
            .putLong(KEY_DURATION_SECONDS, safeDuration)
            .putLong(KEY_BOOT_ANCHOR_ELAPSED_MS, nowElapsed)
            .putLong(KEY_PRIOR_ELAPSED_MS, 0L)
            .putBoolean(KEY_REBOOT_REBASED, false)
            .commit()

        _sessionState.value = SessionState(
            isLocked = true,
            sessionTag = tag,
            startTimeMillis = nowWall,
            targetEndTimeMillis = targetEndTime,
            durationSeconds = safeDuration,
            elapsedSeconds = 0L,
            remainingSeconds = safeDuration
        )

        try {
            val serviceIntent = Intent(context, LockForegroundService::class.java).apply {
                action = LockForegroundService.ACTION_START_LOCK
                putExtra("EXTRA_TARGET_TIMESTAMP", targetEndTime)
                putExtra("EXTRA_TAG", tag)
            }
            ContextCompat.startForegroundService(context, serviceIntent)
        } catch (_: Exception) {}

        try {
            val voidIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                        Intent.FLAG_ACTIVITY_CLEAR_TOP or
                        Intent.FLAG_ACTIVITY_SINGLE_TOP or
                        Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
            }
            context.startActivity(voidIntent)
        } catch (_: Exception) {}
    }

    fun getCurrentTiming(): LockTimingSnapshot {
        val nowWall = wallClockProvider()
        val nowElapsed = elapsedRealtimeProvider()
        return rebaseAfterRebootIfNeeded(prefs, nowWall, nowElapsed)
    }

    /**
     * Checks monotonic clock status; completes session ONLY when SystemClock.elapsedRealtime()
     * confirms full lock duration has genuinely elapsed (or post-reboot boundary expired).
     */
    fun refreshAndCompleteIfExpired(): LockTimingSnapshot = synchronized(COMPLETION_LOCK) {
        val timing = getCurrentTiming()
        if (timing.isLocked && timing.isExpired) {
            finalizeVerifiedCompletionLocked(timing)
            return@synchronized getCurrentTiming()
        }
        if (timing.isLocked) {
            _sessionState.value = SessionState(
                isLocked = true,
                sessionTag = timing.sessionTag,
                startTimeMillis = timing.startTimeMillis,
                targetEndTimeMillis = timing.targetEndTimeMillis,
                durationSeconds = timing.durationSeconds,
                elapsedSeconds = timing.elapsedSeconds,
                remainingSeconds = timing.remainingSeconds
            )
        } else {
            _sessionState.value = SessionState(isLocked = false)
        }
        return@synchronized timing
    }

    /**
     * Terminate the lock session ONLY if monotonic clock confirms expiration.
     * Emits an HMAC-signed VerifiedCompletionEvent consumed by IntegrityEngine in WebView.
     */
    fun completeSession(): Boolean = synchronized(COMPLETION_LOCK) {
        val timing = getCurrentTiming()
        if (!timing.isLocked || !timing.isExpired) {
            return@synchronized false
        }
        finalizeVerifiedCompletionLocked(timing)
        return@synchronized true
    }

    private fun finalizeVerifiedCompletionLocked(timing: LockTimingSnapshot) {
        if (!prefs.getBoolean(KEY_IS_LOCKED, false)) {
            return
        }
        val endWall = wallClockProvider()
        val completedSeconds = timing.durationSeconds
        val isStrictActive = try {
            Class.forName("org.zero.detox.service.ZeroAccessibilityService")
            true
        } catch (_: ClassNotFoundException) {
            false
        }

        val eventId = "nat_${timing.sessionId}_${endWall}"
        val proofDigest = computeNativeProofDigest(
            eventId = eventId,
            sessionId = timing.sessionId,
            tag = timing.sessionTag,
            startTimeMillis = timing.startTimeMillis,
            endTimeMillis = endWall,
            durationSeconds = completedSeconds,
            elapsedMonotonicMs = timing.elapsedMonotonicMillis,
            usedRebootFallback = timing.usedRebootFallback
        )

        parachuteStore.enqueueVerifiedCompletion(
            ParachuteStore.VerifiedCompletionEvent(
                eventId = eventId,
                sessionId = timing.sessionId,
                tag = timing.sessionTag,
                startTimeMillis = timing.startTimeMillis,
                endTimeMillis = endWall,
                durationSeconds = completedSeconds,
                elapsedMonotonicMs = timing.elapsedMonotonicMillis,
                usedRebootFallback = timing.usedRebootFallback,
                monotonicSource = MONOTONIC_SOURCE,
                strictAccessibilityActive = isStrictActive,
                proofDigest = proofDigest
            )
        )

        parachuteStore.recordCompletedSession(
            tag = timing.sessionTag,
            seconds = completedSeconds,
            timestamp = endWall
        )

        clearLockState()
    }

    /**
     * Deploy Emergency Escape Ticket:
     * Deducts 1 Escape Ticket.
     * STRICT ANTI-EXPLOIT RULE: The elapsed time in this aborted session is VOIDED
     * and NOT counted toward the 20-hour Escape Ticket milestone or focus hours.
     */
    fun deployParachute(): Boolean = synchronized(COMPLETION_LOCK) {
        val canDeploy = parachuteStore.getParachuteBalance() >= 1
        if (!canDeploy) return@synchronized false

        val timing = getCurrentTiming()
        if (!timing.isLocked) return@synchronized false

        val success = parachuteStore.useParachute(
            abortedTag = timing.sessionTag,
            abortedElapsedSeconds = timing.elapsedSeconds,
            timestamp = wallClockProvider()
        )

        if (success) {
            clearLockState()
            return@synchronized true
        }
        return@synchronized false
    }

    private fun clearLockState() {
        prefs.edit().clear().commit()
        _sessionState.value = SessionState(isLocked = false)

        try {
            EngageConfigStore(context).clearActiveSession()
        } catch (_: Throwable) {}

        try {
            val serviceIntent = Intent(context, LockForegroundService::class.java)
            context.stopService(serviceIntent)
        } catch (_: Exception) {}
    }

    private fun loadPersistedState(): SessionState = synchronized(COMPLETION_LOCK) {
        val timing = rebaseAfterRebootIfNeeded(prefs, wallClockProvider(), elapsedRealtimeProvider())
        if (!timing.isLocked) return@synchronized SessionState(isLocked = false)

        if (timing.isExpired) {
            finalizeVerifiedCompletionLocked(timing)
            return@synchronized SessionState(isLocked = false)
        }

        return@synchronized SessionState(
            isLocked = true,
            sessionTag = timing.sessionTag,
            startTimeMillis = timing.startTimeMillis,
            targetEndTimeMillis = timing.targetEndTimeMillis,
            durationSeconds = timing.durationSeconds,
            elapsedSeconds = timing.elapsedSeconds,
            remainingSeconds = timing.remainingSeconds
        )
    }
}
