package org.zero.detox.worker

import android.app.NotificationChannel
import android.app.NotificationManager
import android.content.Context
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore

/**
 * PreLockScheduleWorker:
 * Triggers pre-lock warning notifications (5 minutes before scheduled lock)
 * and auto-engages lock sessions on autopilot schedule.
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

    override fun suspend fun doWork(): Result {
        val actionType = inputData.getString(KEY_ACTION_TYPE) ?: "WARNING"
        val scheduleName = inputData.getString(KEY_SCHEDULE_NAME) ?: "Daily Focus"
        val duration = inputData.getLong(KEY_DURATION_SECONDS, 7200L)
        val tag = inputData.getString(KEY_TAG) ?: "Deep Work"

        val notificationManager = appContext.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        createChannel(notificationManager)

        if (actionType == "WARNING") {
            // Send 5-minute pre-lock heads-up warning
            val warningNotification = NotificationCompat.Builder(appContext, CHANNEL_SCHEDULE)
                .setContentTitle("Lock Imminent: $scheduleName")
                .setContentText("Zero will engage phone lock in 5 minutes. Save your work and finish calls.")
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setAutoCancel(true)
                .build()

            notificationManager.notify(2001, warningNotification)
        } else if (actionType == "LOCK_NOW") {
            // Engage lock
            val parachuteStore = ParachuteStore(appContext)
            val lockEngine = LockEngine(appContext, parachuteStore)
            lockEngine.igniteSession(duration, tag)
        }

        return Result.success()
    }

    private fun createChannel(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_SCHEDULE,
                "Zero Schedules & Warnings",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Notifications for upcoming automated digital detox blocks"
            }
            manager.createNotificationChannel(channel)
        }
    }
}
