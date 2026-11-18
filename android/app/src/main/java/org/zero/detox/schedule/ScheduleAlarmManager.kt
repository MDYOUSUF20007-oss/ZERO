package org.zero.detox.schedule

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import android.util.Log
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import org.json.JSONArray
import org.zero.detox.ZeroBridgePlugin
import org.zero.detox.receiver.ScheduleAlarmReceiver
import org.zero.detox.worker.PreLockScheduleWorker
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Date
import java.util.Locale
import java.util.concurrent.TimeUnit

/**
 * ScheduleAlarmManager:
 * Native Android recurring schedule engine (works identically on Normal & Strict APKs,
 * even when the Zero-Noise UI is closed).
 * Schedules both AlarmManager alarms and WorkManager fallback jobs for:
 *  1) Pre-lock warning notification (N minutes before start)
 *  2) Automatic LockEngine engagement at start time
 */
object ScheduleAlarmManager {
    private const val TAG = "ZeroScheduleEngine"
    private const val PREFS_NAME = ZeroBridgePlugin.PREFS_NAME
    private const val KEY_ROUTINES_JSON = ZeroBridgePlugin.KEY_ROUTINES_JSON
    private const val KEY_LAST_FIRED_LOCK = "zero_sched_last_fired_lock_key"
    private const val KEY_LAST_FIRED_WARN = "zero_sched_last_fired_warn_key"

    private const val REQ_CODE_LOCK = 4101
    private const val REQ_CODE_WARNING = 4102
    private const val WORK_NAME_LOCK = "zero_schedule_lock_now"
    private const val WORK_NAME_WARN = "zero_schedule_warning"

    data class RecurringScheduleItem(
        val id: String,
        val name: String,
        val days: Set<Int>, // 0 = Sun, 1 = Mon, ..., 6 = Sat
        val startHour: Int,
        val startMinute: Int,
        val endHour: Int,
        val endMinute: Int,
        val tag: String,
        val isEnabled: Boolean,
        val preLockWarningMinutes: Int
    )

    data class ScheduleOccurrence(
        val schedule: RecurringScheduleItem,
        val startMillis: Long,
        val endMillis: Long,
        val warningMillis: Long
    ) {
        val durationSeconds: Long
            get() = maxOf(60L, (endMillis - startMillis) / 1000L)

        val occurrenceKey: String
            get() = "${schedule.id}_${startMillis / 60_000L}"
    }

    @JvmStatic
    fun saveAndReschedule(context: Context, routinesJson: String?) {
        val safeJson = routinesJson?.takeIf { it.isNotBlank() } ?: "[]"
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ROUTINES_JSON, safeJson)
            .apply()
        rescheduleAll(context)
    }

    @JvmStatic
    fun loadSchedules(context: Context): List<RecurringScheduleItem> {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val raw = prefs.getString(KEY_ROUTINES_JSON, "[]") ?: "[]"
        return parseSchedulesJson(raw)
    }

    @JvmStatic
    fun parseSchedulesJson(raw: String): List<RecurringScheduleItem> {
        val out = mutableListOf<RecurringScheduleItem>()
        try {
            val arr = JSONArray(raw)
            for (i in 0 until arr.length()) {
                val obj = arr.optJSONObject(i) ?: continue
                val id = obj.optString("id", "").trim().ifEmpty { "sched_$i" }
                val name = obj.optString("name", "Focus Session").trim().ifEmpty { "Focus Session" }
                val isEnabled = obj.optBoolean("isEnabled", false)
                val tag = obj.optString("tag", "Deep Work").trim().ifEmpty { "Deep Work" }
                val warnMins = obj.optInt("preLockWarningMinutes", 5).coerceIn(0, 60)

                val daysSet = mutableSetOf<Int>()
                val daysArr = obj.optJSONArray("days")
                if (daysArr != null) {
                    for (d in 0 until daysArr.length()) {
                        val dayVal = daysArr.optInt(d, -1)
                        if (dayVal in 0..6) daysSet.add(dayVal)
                    }
                }

                val (sh, sm) = parseHm(obj.optString("startTime", "09:00"))
                val (eh, em) = parseHm(obj.optString("endTime", "10:00"))

                out.add(
                    RecurringScheduleItem(
                        id = id,
                        name = name,
                        days = daysSet,
                        startHour = sh,
                        startMinute = sm,
                        endHour = eh,
                        endMinute = em,
                        tag = tag,
                        isEnabled = isEnabled,
                        preLockWarningMinutes = warnMins
                    )
                )
            }
        } catch (t: Throwable) {
            Log.w(TAG, "Failed parsing schedules JSON", t)
        }
        return out
    }

    private fun parseHm(raw: String): Pair<Int, Int> {
        val parts = raw.trim().split(":")
        if (parts.size < 2) return 9 to 0
        val h = (parts[0].toIntOrNull() ?: 9).coerceIn(0, 23)
        val m = (parts[1].toIntOrNull() ?: 0).coerceIn(0, 59)
        return h to m
    }

    /**
     * Finds the earliest upcoming enabled schedule whose start time is strictly after nowMillis
     * (within the next 8 days).
     */
    @JvmStatic
    fun findNextUpcomingOccurrence(
        context: Context,
        nowMillis: Long = System.currentTimeMillis()
    ): ScheduleOccurrence? {
        val schedules = loadSchedules(context).filter { it.isEnabled && it.days.isNotEmpty() }
        if (schedules.isEmpty()) return null

        var best: ScheduleOccurrence? = null
        val baseCal = Calendar.getInstance().apply {
            timeInMillis = nowMillis
            set(Calendar.SECOND, 0)
            set(Calendar.MILLISECOND, 0)
        }

        for (dayOffset in 0..7) {
            val dayCal = (baseCal.clone() as Calendar).apply {
                add(Calendar.DAY_OF_YEAR, dayOffset)
            }
            val jsDay = dayCal.get(Calendar.DAY_OF_WEEK) - 1 // 0=Sun..6=Sat

            for (sched in schedules) {
                if (!sched.days.contains(jsDay)) continue

                val startCal = (dayCal.clone() as Calendar).apply {
                    set(Calendar.HOUR_OF_DAY, sched.startHour)
                    set(Calendar.MINUTE, sched.startMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val startMs = startCal.timeInMillis
                if (startMs <= nowMillis + 5_000L) continue

                val startTotalMins = sched.startHour * 60 + sched.startMinute
                val endTotalMins = sched.endHour * 60 + sched.endMinute
                val endCal = (startCal.clone() as Calendar).apply {
                    if (endTotalMins <= startTotalMins) {
                        add(Calendar.DAY_OF_YEAR, 1)
                    }
                    set(Calendar.HOUR_OF_DAY, sched.endHour)
                    set(Calendar.MINUTE, sched.endMinute)
                    set(Calendar.SECOND, 0)
                    set(Calendar.MILLISECOND, 0)
                }
                val endMs = endCal.timeInMillis
                val warnMs = startMs - (sched.preLockWarningMinutes * 60_000L)

                if (best == null || startMs < best.startMillis) {
                    best = ScheduleOccurrence(sched, startMs, endMs, warnMs)
                }
            }
            // Once we found at least one future occurrence on an earlier day, we can stop scanning further days
            if (best != null) break
        }
        return best
    }

    @JvmStatic
    fun markOccurrenceLockFired(context: Context, key: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.getString(KEY_LAST_FIRED_LOCK, null) == key) {
            return false
        }
        prefs.edit().putString(KEY_LAST_FIRED_LOCK, key).commit()
        return true
    }

    @JvmStatic
    fun markOccurrenceWarningFired(context: Context, key: String): Boolean {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        if (prefs.getString(KEY_LAST_FIRED_WARN, null) == key) {
            return false
        }
        prefs.edit().putString(KEY_LAST_FIRED_WARN, key).commit()
        return true
    }

    @JvmStatic
    fun rescheduleAll(context: Context) {
        val appCtx = context.applicationContext
        val am = appCtx.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        cancelExistingAlarms(appCtx, am)

        val now = System.currentTimeMillis()
        val next = findNextUpcomingOccurrence(appCtx, now) ?: run {
            Log.d(TAG, "No enabled schedules to arm.")
            return
        }

        // 1. Arm LOCK_NOW alarm + WorkManager backup
        val lockIntent = Intent(appCtx, ScheduleAlarmReceiver::class.java).apply {
            action = ScheduleAlarmReceiver.ACTION_LOCK_NOW
            putExtra(PreLockScheduleWorker.KEY_SCHEDULE_NAME, next.schedule.name)
            putExtra(PreLockScheduleWorker.KEY_DURATION_SECONDS, next.durationSeconds)
            putExtra(PreLockScheduleWorker.KEY_TAG, next.schedule.tag)
            putExtra(ScheduleAlarmReceiver.EXTRA_OCCURRENCE_KEY, next.occurrenceKey)
            putExtra(ScheduleAlarmReceiver.EXTRA_END_MILLIS, next.endMillis)
        }
        val lockPi = PendingIntent.getBroadcast(
            appCtx,
            REQ_CODE_LOCK,
            lockIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )
        scheduleAlarmSafely(am, next.startMillis, lockPi)

        val lockDelayMs = maxOf(5_000L, next.startMillis - now)
        val lockWork = OneTimeWorkRequestBuilder<PreLockScheduleWorker>()
            .setInitialDelay(lockDelayMs, TimeUnit.MILLISECONDS)
            .setInputData(
                Data.Builder()
                    .putString(PreLockScheduleWorker.KEY_ACTION_TYPE, "LOCK_NOW")
                    .putString(PreLockScheduleWorker.KEY_SCHEDULE_NAME, next.schedule.name)
                    .putLong(PreLockScheduleWorker.KEY_DURATION_SECONDS, next.durationSeconds)
                    .putString(PreLockScheduleWorker.KEY_TAG, next.schedule.tag)
                    .putString(ScheduleAlarmReceiver.EXTRA_OCCURRENCE_KEY, next.occurrenceKey)
                    .putLong(ScheduleAlarmReceiver.EXTRA_END_MILLIS, next.endMillis)
                    .build()
            )
            .build()
        try {
            WorkManager.getInstance(appCtx).enqueueUniqueWork(
                WORK_NAME_LOCK,
                ExistingWorkPolicy.REPLACE,
                lockWork
            )
        } catch (t: Throwable) {
            Log.w(TAG, "WorkManager lock enqueue failed", t)
        }

        // 2. Arm Pre-Lock Warning alarm + WorkManager backup if still in future
        if (next.schedule.preLockWarningMinutes > 0 && next.warningMillis > now + 5_000L) {
            val warnIntent = Intent(appCtx, ScheduleAlarmReceiver::class.java).apply {
                action = ScheduleAlarmReceiver.ACTION_WARNING
                putExtra(PreLockScheduleWorker.KEY_SCHEDULE_NAME, next.schedule.name)
                putExtra(ScheduleAlarmReceiver.EXTRA_WARNING_MINUTES, next.schedule.preLockWarningMinutes)
                putExtra(ScheduleAlarmReceiver.EXTRA_OCCURRENCE_KEY, next.occurrenceKey)
            }
            val warnPi = PendingIntent.getBroadcast(
                appCtx,
                REQ_CODE_WARNING,
                warnIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            scheduleAlarmSafely(am, next.warningMillis, warnPi)

            val warnDelayMs = maxOf(5_000L, next.warningMillis - now)
            val warnWork = OneTimeWorkRequestBuilder<PreLockScheduleWorker>()
                .setInitialDelay(warnDelayMs, TimeUnit.MILLISECONDS)
                .setInputData(
                    Data.Builder()
                        .putString(PreLockScheduleWorker.KEY_ACTION_TYPE, "WARNING")
                        .putString(PreLockScheduleWorker.KEY_SCHEDULE_NAME, next.schedule.name)
                        .putInt(ScheduleAlarmReceiver.EXTRA_WARNING_MINUTES, next.schedule.preLockWarningMinutes)
                        .putString(ScheduleAlarmReceiver.EXTRA_OCCURRENCE_KEY, next.occurrenceKey)
                        .build()
                )
                .build()
            try {
                WorkManager.getInstance(appCtx).enqueueUniqueWork(
                    WORK_NAME_WARN,
                    ExistingWorkPolicy.REPLACE,
                    warnWork
                )
            } catch (t: Throwable) {
                Log.w(TAG, "WorkManager warning enqueue failed", t)
            }
        }

        Log.i(
            TAG,
            "Armed next schedule '${next.schedule.name}' (#${next.schedule.tag}) at ${Date(next.startMillis)} (${next.durationSeconds}s)"
        )
    }

    private fun cancelExistingAlarms(context: Context, am: AlarmManager?) {
        try {
            val lockPi = PendingIntent.getBroadcast(
                context,
                REQ_CODE_LOCK,
                Intent(context, ScheduleAlarmReceiver::class.java).apply {
                    action = ScheduleAlarmReceiver.ACTION_LOCK_NOW
                },
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (lockPi != null) {
                am?.cancel(lockPi)
                lockPi.cancel()
            }
        } catch (_: Throwable) {}

        try {
            val warnPi = PendingIntent.getBroadcast(
                context,
                REQ_CODE_WARNING,
                Intent(context, ScheduleAlarmReceiver::class.java).apply {
                    action = ScheduleAlarmReceiver.ACTION_WARNING
                },
                PendingIntent.FLAG_NO_CREATE or PendingIntent.FLAG_IMMUTABLE
            )
            if (warnPi != null) {
                am?.cancel(warnPi)
                warnPi.cancel()
            }
        } catch (_: Throwable) {}

        try {
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_LOCK)
            WorkManager.getInstance(context).cancelUniqueWork(WORK_NAME_WARN)
        } catch (_: Throwable) {}
    }

    private fun scheduleAlarmSafely(am: AlarmManager?, triggerAtMillis: Long, pendingIntent: PendingIntent) {
        if (am == null) return
        try {
            val canExact = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                am.canScheduleExactAlarms()
            } else {
                true
            }
            if (canExact) {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setExactAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.setExact(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } else {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            }
        } catch (se: SecurityException) {
            try {
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                } else {
                    am.set(AlarmManager.RTC_WAKEUP, triggerAtMillis, pendingIntent)
                }
            } catch (_: Throwable) {}
        } catch (_: Throwable) {}
    }

    /**
     * Human-readable next session string for Home Screen widgets.
     */
    @JvmStatic
    fun formatNextSessionLabel(context: Context, nowMillis: Long = System.currentTimeMillis()): Pair<String, String> {
        val next = findNextUpcomingOccurrence(context, nowMillis)
            ?: return "No schedule armed" to "Tap to set routine"

        val diffMs = maxOf(0L, next.startMillis - nowMillis)
        val diffMins = diffMs / 60_000L
        val timeFmt = SimpleDateFormat("h:mm a", Locale.getDefault())
        val dayFmt = SimpleDateFormat("EEE", Locale.getDefault())
        val timeStr = timeFmt.format(Date(next.startMillis))

        val nowCal = Calendar.getInstance().apply { timeInMillis = nowMillis }
        val startCal = Calendar.getInstance().apply { timeInMillis = next.startMillis }
        val isToday = nowCal.get(Calendar.YEAR) == startCal.get(Calendar.YEAR) &&
            nowCal.get(Calendar.DAY_OF_YEAR) == startCal.get(Calendar.DAY_OF_YEAR)
        val tomorrowCal = (nowCal.clone() as Calendar).apply { add(Calendar.DAY_OF_YEAR, 1) }
        val isTomorrow = tomorrowCal.get(Calendar.YEAR) == startCal.get(Calendar.YEAR) &&
            tomorrowCal.get(Calendar.DAY_OF_YEAR) == startCal.get(Calendar.DAY_OF_YEAR)

        val countdownStr = when {
            diffMins < 60 -> "in ${maxOf(1L, diffMins)}m"
            diffMins < 24 * 60 -> {
                val h = diffMins / 60
                val m = diffMins % 60
                if (m > 0) "in ${h}h ${m}m" else "in ${h}h"
            }
            else -> "${dayFmt.format(Date(next.startMillis))} $timeStr"
        }

        val dayPrefix = when {
            isToday -> "Today $timeStr"
            isTomorrow -> "Tmrw $timeStr"
            else -> "${dayFmt.format(Date(next.startMillis))} $timeStr"
        }

        val headline = "${next.schedule.name} • $countdownStr"
        val subline = "$dayPrefix (#${next.schedule.tag})"
        return headline to subline
    }
}
