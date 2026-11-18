package org.zero.detox.receiver

import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import org.zero.detox.MainActivity
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.schedule.ScheduleAlarmManager
import org.zero.detox.widget.ZeroWidgetUpdater
import org.zero.detox.worker.PreLockScheduleWorker

/**
 * ScheduleAlarmReceiver:
 * Handles AlarmManager callbacks for Zero-Noise recurring schedules:
 *  - Pre-lock warning notification (N minutes before scheduled lock)
 *  - Automatic LockEngine engagement (starts LockForegroundService + The Void)
 * Works on both Normal and Strict APKs even when Zero-Noise is closed.
 */
class ScheduleAlarmReceiver : BroadcastReceiver() {

    companion object {
        const val ACTION_WARNING = "org.zero.detox.ACTION_SCHEDULE_WARNING"
        const val ACTION_LOCK_NOW = "org.zero.detox.ACTION_SCHEDULE_LOCK_NOW"
        const val EXTRA_OCCURRENCE_KEY = "occurrence_key"
        const val EXTRA_END_MILLIS = "end_millis"
        const val EXTRA_WARNING_MINUTES = "warning_minutes"

        fun triggerWarningNotification(
            context: Context,
            scheduleName: String,
            warningMinutes: Int,
            occurrenceKey: String
        ) {
            if (occurrenceKey.isNotBlank() &&
                !ScheduleAlarmManager.markOccurrenceWarningFired(context, occurrenceKey)
            ) {
                return
            }

            val nm = context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager ?: return
            ensureChannel(nm)

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val contentPi = PendingIntent.getActivity(
                context,
                2001,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )

            val minsLabel = maxOf(1, warningMinutes)
            val notification = NotificationCompat.Builder(context, PreLockScheduleWorker.CHANNEL_SCHEDULE)
                .setContentTitle("Upcoming Focus: $scheduleName")
                .setContentText("Zero-Noise starts in $minsLabel min. Finish up and prepare for deep work.")
                .setSmallIcon(android.R.drawable.ic_popup_reminder)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL)
                .setContentIntent(contentPi)
                .setAutoCancel(true)
                .build()

            try {
                nm.notify(2001, notification)
            } catch (_: SecurityException) {
                // Notification permission not granted
            }
        }

        fun triggerScheduledLock(
            context: Context,
            scheduleName: String,
            fallbackDurationSeconds: Long,
            tag: String,
            occurrenceKey: String,
            endMillis: Long
        ) {
            if (occurrenceKey.isNotBlank() &&
                !ScheduleAlarmManager.markOccurrenceLockFired(context, occurrenceKey)
            ) {
                return
            }

            val parachuteStore = ParachuteStore(context)
            val lockEngine = LockEngine(context, parachuteStore)
            val current = lockEngine.refreshAndCompleteIfExpired()
            if (current.isLocked && !current.isExpired) {
                // Already in an active focus session; do not override it
                ScheduleAlarmManager.rescheduleAll(context)
                ZeroWidgetUpdater.requestAllUpdates(context)
                return
            }

            val now = System.currentTimeMillis()
            val remainingSeconds = if (endMillis > now + 30_000L) {
                (endMillis - now) / 1000L
            } else {
                fallbackDurationSeconds
            }

            if (remainingSeconds >= 60L) {
                lockEngine.igniteSession(remainingSeconds, tag.ifBlank { scheduleName })
            }

            ScheduleAlarmManager.rescheduleAll(context)
            ZeroWidgetUpdater.requestAllUpdates(context)
        }

        private fun ensureChannel(manager: NotificationManager) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                val channel = NotificationChannel(
                    PreLockScheduleWorker.CHANNEL_SCHEDULE,
                    "Zero-Noise Schedules & Warnings",
                    NotificationManager.IMPORTANCE_HIGH
                ).apply {
                    description = "Notifications for upcoming automated digital detox blocks"
                }
                manager.createNotificationChannel(channel)
            }
        }
    }

    override fun onReceive(context: Context, intent: Intent) {
        val action = intent.action ?: return
        val name = intent.getStringExtra(PreLockScheduleWorker.KEY_SCHEDULE_NAME) ?: "Scheduled Focus"
        val occurrenceKey = intent.getStringExtra(EXTRA_OCCURRENCE_KEY) ?: ""

        when (action) {
            ACTION_WARNING -> {
                val warnMins = intent.getIntExtra(EXTRA_WARNING_MINUTES, 5)
                triggerWarningNotification(context, name, warnMins, occurrenceKey)
                ZeroWidgetUpdater.requestAllUpdates(context)
            }
            ACTION_LOCK_NOW -> {
                val duration = intent.getLongExtra(PreLockScheduleWorker.KEY_DURATION_SECONDS, 3600L)
                val tag = intent.getStringExtra(PreLockScheduleWorker.KEY_TAG) ?: "Deep Work"
                val endMillis = intent.getLongExtra(EXTRA_END_MILLIS, 0L)
                triggerScheduledLock(context, name, duration, tag, occurrenceKey, endMillis)
            }
        }
    }
}
