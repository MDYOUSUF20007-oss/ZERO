package org.zero.detox.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * ParachuteStore:
 * Tracks total cumulative blocked seconds, earned Escape Tickets, deployed tickets,
 * verified native monotonic completion proofs, and maintains the 20-Hour progression logic.
 *
 * Formula:
 * 1 Emergency Escape Ticket = 72,000 completed seconds (20 cumulative hours).
 * Rollover progress = completed_blocked_seconds % 72000.
 */
class ParachuteStore(context: Context) {

    companion object {
        const val PREFS_NAME = "zero_parachute_ledger"
        const val KEY_CUMULATIVE_SECONDS = "completed_blocked_seconds"
        const val KEY_DEPLOYED_COUNT = "deployed_parachutes_count"
        const val KEY_BONUS_PARACHUTES = "bonus_parachutes_count"
        const val KEY_TRANSACTION_HISTORY = "parachute_ledger_json"
        const val KEY_PENDING_VERIFIED_COMPLETIONS = "pending_verified_completions_json"
        const val SECONDS_PER_PARACHUTE = 72_000L // 20 Hours exactly
        private const val MAX_PENDING_COMPLETIONS = 100
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    data class ParachuteMetrics(
        val totalCumulativeSeconds: Long,
        val totalCumulativeHours: Double,
        val lifetimeEarnedParachutes: Int,
        val deployedParachutes: Int,
        val bonusParachutes: Int = 0,
        val currentBalance: Int,
        val currentProgressSeconds: Long,
        val currentProgressHours: Double,
        val hoursUntilNextParachute: Double,
        val progressPercentage: Float
    )

    data class LedgerEntry(
        val id: String,
        val timestamp: Long,
        val type: String, // "EARNED" or "DEPLOYED"
        val description: String,
        val delta: Int,
        val tag: String?
    )

    data class VerifiedCompletionEvent(
        val eventId: String,
        val sessionId: String,
        val tag: String,
        val startTimeMillis: Long,
        val endTimeMillis: Long,
        val durationSeconds: Long,
        val elapsedMonotonicMs: Long,
        val usedRebootFallback: Boolean,
        val monotonicSource: String,
        val strictAccessibilityActive: Boolean,
        val proofDigest: String
    ) {
        fun toJsonObject(): JSONObject {
            return JSONObject().apply {
                put("eventId", eventId)
                put("sessionId", sessionId)
                put("tag", tag)
                put("startTime", startTimeMillis)
                put("endTime", endTimeMillis)
                put("durationSeconds", durationSeconds)
                put("elapsedMonotonicMs", elapsedMonotonicMs)
                put("usedRebootFallback", usedRebootFallback)
                put("monotonicSource", monotonicSource)
                put("strictAccessibilityActive", strictAccessibilityActive)
                put("proofDigest", proofDigest)
            }
        }
    }

    /**
     * Compute current metrics in real-time according to formula
     */
    fun getMetrics(): ParachuteMetrics {
        val totalSeconds = prefs.getLong(KEY_CUMULATIVE_SECONDS, 0L)
        val deployed = prefs.getInt(KEY_DEPLOYED_COUNT, 0)
        val bonus = maxOf(0, prefs.getInt(KEY_BONUS_PARACHUTES, 0))

        val lifetimeEarned = (totalSeconds / SECONDS_PER_PARACHUTE).toInt() + bonus
        val currentBalance = maxOf(0, lifetimeEarned - deployed)

        val progressSeconds = totalSeconds % SECONDS_PER_PARACHUTE
        val progressHours = progressSeconds / 3600.0
        val remainingHours = (SECONDS_PER_PARACHUTE - progressSeconds) / 3600.0
        val percentage = (progressSeconds.toFloat() / SECONDS_PER_PARACHUTE.toFloat()) * 100f

        return ParachuteMetrics(
            totalCumulativeSeconds = totalSeconds,
            totalCumulativeHours = totalSeconds / 3600.0,
            lifetimeEarnedParachutes = lifetimeEarned,
            deployedParachutes = deployed,
            bonusParachutes = bonus,
            currentBalance = currentBalance,
            currentProgressSeconds = progressSeconds,
            currentProgressHours = progressHours,
            hoursUntilNextParachute = remainingHours,
            progressPercentage = percentage
        )
    }

    fun getParachuteBalance(): Int = getMetrics().currentBalance

    @Synchronized
    @JvmOverloads
    fun syncLedgerState(cumulativeSeconds: Long, deployedCount: Int, bonusCount: Int = 0) {
        prefs.edit()
            .putLong(KEY_CUMULATIVE_SECONDS, maxOf(0L, cumulativeSeconds))
            .putInt(KEY_DEPLOYED_COUNT, maxOf(0, deployedCount))
            .putInt(KEY_BONUS_PARACHUTES, maxOf(0, bonusCount))
            .apply()
    }

    /**
     * Records a completed lock session.
     * Credits seconds towards cumulative total and checks if a new 20-hour Escape Ticket was earned.
     */
    @Synchronized
    fun recordCompletedSession(tag: String, seconds: Long, timestamp: Long) {
        val previousTotal = prefs.getLong(KEY_CUMULATIVE_SECONDS, 0L)
        val newTotal = previousTotal + seconds

        val previousMilestones = (previousTotal / SECONDS_PER_PARACHUTE).toInt()
        val newMilestones = (newTotal / SECONDS_PER_PARACHUTE).toInt()

        prefs.edit().putLong(KEY_CUMULATIVE_SECONDS, newTotal).commit()

        if (newMilestones > previousMilestones) {
            val earnedCount = newMilestones - previousMilestones
            appendLedgerEntry(
                type = "EARNED",
                description = "20-Hour Phone Blockage Milestone reached (+${earnedCount} Escape Ticket)",
                delta = earnedCount,
                tag = tag,
                timestamp = timestamp
            )
        }
    }

    @Synchronized
    fun enqueueVerifiedCompletion(event: VerifiedCompletionEvent) {
        val raw = prefs.getString(KEY_PENDING_VERIFIED_COMPLETIONS, "[]") ?: "[]"
        val current = try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }

        for (i in 0 until current.length()) {
            val item = current.optJSONObject(i) ?: continue
            if (item.optString("eventId") == event.eventId) {
                return
            }
        }

        current.put(event.toJsonObject())

        val trimmed = if (current.length() > MAX_PENDING_COMPLETIONS) {
            val next = JSONArray()
            val start = current.length() - MAX_PENDING_COMPLETIONS
            for (i in start until current.length()) {
                next.put(current.get(i))
            }
            next
        } else {
            current
        }

        prefs.edit()
            .putString(KEY_PENDING_VERIFIED_COMPLETIONS, trimmed.toString())
            .commit()
    }

    @Synchronized
    fun getPendingVerifiedCompletionsJson(): JSONArray {
        val raw = prefs.getString(KEY_PENDING_VERIFIED_COMPLETIONS, "[]") ?: "[]"
        return try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
    }

    @Synchronized
    fun acknowledgeVerifiedCompletions(eventIdsJson: String) {
        val acknowledgedIds = HashSet<String>()
        try {
            val arr = JSONArray(eventIdsJson)
            for (i in 0 until arr.length()) {
                val id = arr.optString(i, "").trim()
                if (id.isNotEmpty()) acknowledgedIds.add(id)
            }
        } catch (_: Exception) {
            return
        }
        if (acknowledgedIds.isEmpty()) return

        val existing = getPendingVerifiedCompletionsJson()
        val kept = JSONArray()
        for (i in 0 until existing.length()) {
            val obj = existing.optJSONObject(i) ?: continue
            val id = obj.optString("eventId", "")
            if (id.isNotEmpty() && !acknowledgedIds.contains(id)) {
                kept.put(obj)
            }
        }
        prefs.edit()
            .putString(KEY_PENDING_VERIFIED_COMPLETIONS, kept.toString())
            .commit()
    }

    /**
     * Deploys an Emergency Escape Ticket.
     * Decrements balance by 1.
     * ANTI-EXPLOIT RULE: The aborted elapsed seconds are VOIDED and not added to cumulative seconds.
     */
    @Synchronized
    fun useParachute(abortedTag: String, abortedElapsedSeconds: Long, timestamp: Long): Boolean {
        val currentBalance = getParachuteBalance()
        if (currentBalance < 1) return false

        val currentDeployed = prefs.getInt(KEY_DEPLOYED_COUNT, 0)
        prefs.edit().putInt(KEY_DEPLOYED_COUNT, currentDeployed + 1).commit()

        appendLedgerEntry(
            type = "DEPLOYED",
            description = "Emergency Escape Ticket used ($abortedTag session aborted at ${abortedElapsedSeconds / 60}m; progress forfeited)",
            delta = -1,
            tag = abortedTag,
            timestamp = timestamp
        )
        return true
    }

    private fun appendLedgerEntry(type: String, description: String, delta: Int, tag: String?, timestamp: Long) {
        val raw = prefs.getString(KEY_TRANSACTION_HISTORY, "[]") ?: "[]"
        val array = try {
            JSONArray(raw)
        } catch (_: Exception) {
            JSONArray()
        }
        val obj = JSONObject().apply {
            put("id", "txn_" + System.currentTimeMillis())
            put("type", type)
            put("description", description)
            put("delta", delta)
            put("tag", tag ?: "General")
            put("timestamp", timestamp)
        }
        array.put(obj)
        prefs.edit().putString(KEY_TRANSACTION_HISTORY, array.toString()).apply()
    }
}
