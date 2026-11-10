package org.zero.detox.worker

import android.Manifest
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.content.ContextCompat
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import org.zero.detox.MainActivity
import java.util.concurrent.TimeUnit

/**
 * CloudUploadReminderWorker:
 * Schedules local Android reminders (Weekly 7d or Monthly 30d, per user setting)
 * to upload ZERO stats, Escape Tickets & donor perks (.zbak) to the user's chosen cloud app.
 * Uses strictly local WorkManager + local notifications with zero network endpoints.
 */
class CloudUploadReminderWorker(
    private val appContext: Context,
    workerParams: WorkerParameters
) : CoroutineWorker(appContext, workerParams) {

    companion object {
        const val PREFS_NAME = "zero_cloud_auto_backup_v1"
        const val KEY_CLOUD_REMINDER_INTERVAL = "cloud_reminder_interval"
        const val KEY_LAST_CLOUD_UPLOAD_TS = "last_cloud_upload_timestamp"
        const val KEY_LAST_NOTIFIED_CYCLE_TS = "last_notified_cloud_cycle_ts"

        const val INTERVAL_WEEKLY = "weekly"
        const val INTERVAL_MONTHLY = "monthly"
        const val INTERVAL_OFF = "off"

        const val WEEKLY_INTERVAL_MS = 7L * 24L * 60L * 60L * 1000L
        const val MONTHLY_INTERVAL_MS = 30L * 24L * 60L * 60L * 1000L

        const val UNIQUE_WORK_NAME = "zero_cloud_upload_reminder_v1"
        const val CHANNEL_ID = "zero_cloud_reminder_channel"
        const val NOTIFICATION_ID = 2009

        @JvmStatic
        fun sanitizeInterval(raw: String?): String {
            return when (raw?.trim()?.lowercase()) {
                INTERVAL_MONTHLY -> INTERVAL_MONTHLY
                INTERVAL_OFF -> INTERVAL_OFF
                else -> INTERVAL_WEEKLY
            }
        }

        @JvmStatic
        fun intervalMillis(interval: String?): Long {
            return when (sanitizeInterval(interval)) {
                INTERVAL_MONTHLY -> MONTHLY_INTERVAL_MS
                INTERVAL_OFF -> 0L
                else -> WEEKLY_INTERVAL_MS
            }
        }

        @JvmStatic
        fun computeDelayMillis(
            interval: String?,
            lastCloudUploadTs: Long,
            nowMs: Long = System.currentTimeMillis()
        ): Long {
            val periodMs = intervalMillis(interval)
            if (periodMs <= 0L) return -1L
            if (lastCloudUploadTs <= 0L) {
                return periodMs
            }
            val dueAt = lastCloudUploadTs + periodMs
            return if (dueAt > nowMs) (dueAt - nowMs) else 0L
        }

        @JvmStatic
        fun scheduleOrCancel(
            context: Context,
            intervalRaw: String?,
            lastCloudUploadTs: Long,
            nowMs: Long = System.currentTimeMillis()
        ): Long {
            val interval = sanitizeInterval(intervalRaw)
            val delayMs = computeDelayMillis(interval, lastCloudUploadTs, nowMs)
            val workManager = try {
                WorkManager.getInstance(context)
            } catch (_: Throwable) {
                return -1L
            }

            if (delayMs < 0L) {
                workManager.cancelUniqueWork(UNIQUE_WORK_NAME)
                return -1L
            }

            val req = OneTimeWorkRequestBuilder<CloudUploadReminderWorker>()
                .setInitialDelay(delayMs, TimeUnit.MILLISECONDS)
                .build()

            workManager.enqueueUniqueWork(
                UNIQUE_WORK_NAME,
                ExistingWorkPolicy.REPLACE,
                req
            )
            return nowMs + delayMs
        }
    }

    override suspend fun doWork(): Result {
        val prefs = appContext.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val interval = sanitizeInterval(prefs.getString(KEY_CLOUD_REMINDER_INTERVAL, INTERVAL_WEEKLY))
        val periodMs = intervalMillis(interval)
        if (periodMs <= 0L) {
            return Result.success()
        }

        val lastCloudUploadTs = prefs.getLong(KEY_LAST_CLOUD_UPLOAD_TS, 0L)
        val nowMs = System.currentTimeMillis()
        if (lastCloudUploadTs > 0L && (nowMs - lastCloudUploadTs) < periodMs) {
            // Uploaded recently; reschedule for remaining duration
            scheduleOrCancel(appContext, interval, lastCloudUploadTs, nowMs)
            return Result.success()
        }

        val lastNotifiedCycleTs = prefs.getLong(KEY_LAST_NOTIFIED_CYCLE_TS, Long.MIN_VALUE)
        if (lastNotifiedCycleTs == lastCloudUploadTs) {
            return Result.success()
        }

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            val granted = ContextCompat.checkSelfPermission(
                appContext,
                Manifest.permission.POST_NOTIFICATIONS
            ) == PackageManager.PERMISSION_GRANTED
            if (!granted) {
                return Result.success()
            }
        }

        val notificationManager =
            appContext.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
                ?: return Result.success()
        createChannel(notificationManager)

        val launchIntent = Intent(appContext, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                Intent.FLAG_ACTIVITY_CLEAR_TOP or
                Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val contentPendingIntent = PendingIntent.getActivity(
            appContext,
            NOTIFICATION_ID,
            launchIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        val title = if (interval == INTERVAL_MONTHLY) {
            "Monthly ZERO Stats Cloud Backup Due"
        } else {
            "Weekly ZERO Stats Cloud Backup Due"
        }

        val notification = NotificationCompat.Builder(appContext, CHANNEL_ID)
            .setContentTitle(title)
            .setContentText("Upload zero-backup.zbak to your cloud app to keep stats, tickets & donor perks safe.")
            .setStyle(
                NotificationCompat.BigTextStyle().bigText(
                    "Open Zero-Distractions -> Settings -> Upload Stats to Cloud to save your stats, Escape Tickets, donor perks & Bags."
                )
            )
            .setSmallIcon(android.R.drawable.ic_menu_upload)
            .setPriority(NotificationCompat.PRIORITY_DEFAULT)
            .setAutoCancel(true)
            .setContentIntent(contentPendingIntent)
            .build()

        notificationManager.notify(NOTIFICATION_ID, notification)
        prefs.edit().putLong(KEY_LAST_NOTIFIED_CYCLE_TS, lastCloudUploadTs).apply()
        return Result.success()
    }

    private fun createChannel(manager: NotificationManager) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Cloud Backup Reminders",
                NotificationManager.IMPORTANCE_DEFAULT
            ).apply {
                description = "Weekly or monthly reminders to upload ZERO stats & donor backup (.zbak) to cloud"
            }
            manager.createNotificationChannel(channel)
        }
    }
}
