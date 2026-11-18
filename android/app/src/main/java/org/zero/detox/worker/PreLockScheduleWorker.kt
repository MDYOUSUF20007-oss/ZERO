package org.zero.detox.worker

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.zero.detox.receiver.ScheduleAlarmReceiver

/**
 * PreLockScheduleWorker:
 * Resilient WorkManager companion to ScheduleAlarmReceiver.
 * Triggers pre-lock warning notifications and auto-engages lock sessions on schedule
 * using occurrence-key deduplication so AlarmManager + WorkManager never double-fire.
 */
class PreLockScheduleWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val CHANNEL_SCHEDULE = "zero_schedule_channel"
        const val KEY_ACTION_TYPE = "action_type" // "WARNING" or "LOCK_NOW"
        const val KEY_SCHEDULE_NAME = "schedule_name"
        const val KEY_DURATION_SECONDS = "duration_seconds"
        const val KEY_TAG = "tag"
    }

    override suspend fun doWork(): Result {
        val actionType = inputData.getString(KEY_ACTION_TYPE) ?: "WARNING"
        val scheduleName = inputData.getString(KEY_SCHEDULE_NAME) ?: "Daily Focus"
        val duration = inputData.getLong(KEY_DURATION_SECONDS, 3600L)
        val tag = inputData.getString(KEY_TAG) ?: "Deep Work"
        val occurrenceKey = inputData.getString(ScheduleAlarmReceiver.EXTRA_OCCURRENCE_KEY) ?: ""
        val endMillis = inputData.getLong(ScheduleAlarmReceiver.EXTRA_END_MILLIS, 0L)
        val warnMins = inputData.getInt(ScheduleAlarmReceiver.EXTRA_WARNING_MINUTES, 5)

        if (actionType == "WARNING") {
            ScheduleAlarmReceiver.triggerWarningNotification(
                context = appContext,
                scheduleName = scheduleName,
                warningMinutes = warnMins,
                occurrenceKey = occurrenceKey
            )
        } else if (actionType == "LOCK_NOW") {
            ScheduleAlarmReceiver.triggerScheduledLock(
                context = appContext,
                scheduleName = scheduleName,
                fallbackDurationSeconds = duration,
                tag = tag,
                occurrenceKey = occurrenceKey,
                endMillis = endMillis
            )
        }

        return Result.success()
    }
}
