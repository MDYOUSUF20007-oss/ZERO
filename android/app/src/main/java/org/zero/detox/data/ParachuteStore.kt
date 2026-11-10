package org.zero.detox.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONArray
import org.json.JSONObject

/**
 * ParachuteStore:
 * Tracks total cumulative blocked seconds, earned parachutes, deployed parachutes,
 * and maintains the 20-Hour progression logic.
 *
 * Formula:
 * 1 Parachute = 72,000 completed seconds (20 cumulative hours).
 * Rollover progress = completed_blocked_seconds % 72000.
 */
class ParachuteStore(context: Context) {

    companion object {
        const val PREFS_NAME = "zero_parachute_ledger"
        const val KEY_CUMULATIVE_SECONDS = "completed_blocked_seconds"
        const val KEY_DEPLOYED_COUNT = "deployed_parachutes_count"
        const val KEY_TRANSACTION_HISTORY = "parachute_ledger_json"
        const val SECONDS_PER_PARACHUTE = 72_000L // 20 Hours exactly
    }

    private val prefs: SharedPreferences = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    data class ParachuteMetrics(
        val totalCumulativeSeconds: Long,
        val totalCumulativeHours: Double,
        val lifetimeEarnedParachutes: Int,
        val deployedParachutes: Int,
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

    /**
     * Compute current metrics in real-time according to formula
     */
    fun getMetrics(): ParachuteMetrics {
        val totalSeconds = prefs.getLong(KEY_CUMULATIVE_SECONDS, 0L)
        val deployed = prefs.getInt(KEY_DEPLOYED_COUNT, 0)

        val lifetimeEarned = (totalSeconds / SECONDS_PER_PARACHUTE).toInt()
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
            currentBalance = currentBalance,
            currentProgressSeconds = progressSeconds,
            currentProgressHours = progressHours,
            hoursUntilNextParachute = remainingHours,
            progressPercentage = percentage
        )
    }

    fun getParachuteBalance(): Int = getMetrics().currentBalance

    @Synchronized
    fun syncLedgerState(cumulativeSeconds: Long, deployedCount: Int) {
        prefs.edit()
            .putLong(KEY_CUMULATIVE_SECONDS, maxOf(0L, cumulativeSeconds))
            .putInt(KEY_DEPLOYED_COUNT, maxOf(0, deployedCount))
            .apply()
    }

    /**
     * Records a completed lock session.
     * Credits seconds towards cumulative total and checks if a new 20-hour parachute was earned.
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
                description = "20-Hour Phone Blockage Milestone reached (+${earnedCount} Parachute)",
                delta = earnedCount,
                tag = tag,
                timestamp = timestamp
            )
        }
    }

    /**
     * Deploys an emergency parachute.
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
            description = "Parachute deployed ($abortedTag session aborted at ${abortedElapsedSeconds / 60}m; progress forfeited)",
            delta = -1,
            tag = abortedTag,
            timestamp = timestamp
        )
        return true
    }

    private fun appendLedgerEntry(type: String, description: String, delta: Int, tag: String?, timestamp: Long) {
        val raw = prefs.getString(KEY_TRANSACTION_HISTORY, "[]") ?: "[]"
        val array = JSONArray(raw)
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
