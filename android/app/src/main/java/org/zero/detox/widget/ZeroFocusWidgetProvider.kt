package org.zero.detox.widget

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.widget.RemoteViews
import org.zero.detox.MainActivity
import org.zero.detox.R
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.schedule.ScheduleAlarmManager
import org.zero.detox.ui.VoidThemeStore

/**
 * ZeroFocusWidgetProvider (4x2 Home Screen Widget):
 * Displays Time Saved Today, Total Time Reclaimed, Next Scheduled Session countdown
 * (or active lock status), current Streak, and a 42-day (14x3) theme-tinted focus heatmap.
 */
class ZeroFocusWidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_zero_focus)
            val stats = WidgetDataStore.load(context)
            val accent = VoidThemeStore.ensureReadableOnBlack(
                VoidThemeStore.loadAccent(context).accentColor
            )

            // Check live LockEngine state
            val timing = try {
                val lockEngine = LockEngine(context, ParachuteStore(context))
                lockEngine.refreshAndCompleteIfExpired()
            } catch (_: Throwable) {
                null
            }

            // Tap anywhere to open Zero-Noise
            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val launchPi = PendingIntent.getActivity(
                context,
                5101,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_focus_root, launchPi)

            // Top right status badge (active lock or streak)
            if (timing != null && timing.isLocked && !timing.isExpired) {
                val remLabel = WidgetDataStore.formatDurationCompact(timing.remainingSeconds)
                views.setTextViewText(R.id.widget_status_badge, "LOCKED • $remLabel")
            } else if (stats.streakDays > 0) {
                views.setTextViewText(R.id.widget_status_badge, "${stats.streakDays}d STREAK")
            } else {
                views.setTextViewText(R.id.widget_status_badge, "READY")
            }
            views.setTextColor(R.id.widget_status_badge, accent)

            // Left KPI: Time Saved
            views.setTextViewText(
                R.id.widget_time_saved_value,
                WidgetDataStore.formatDurationCompact(stats.todaySavedSeconds)
            )
            views.setTextColor(R.id.widget_time_saved_value, accent)
            views.setTextViewText(
                R.id.widget_time_saved_sub,
                WidgetDataStore.formatTotalHours(stats.totalSavedSeconds)
            )

            // Right KPI: Next Session Reminder or Active Session
            if (timing != null && timing.isLocked && !timing.isExpired) {
                views.setTextViewText(R.id.widget_next_label, "ACTIVE SESSION")
                views.setTextViewText(R.id.widget_next_value, "#${timing.sessionTag}")
                views.setTextViewText(
                    R.id.widget_next_sub,
                    "${WidgetDataStore.formatDurationCompact(timing.remainingSeconds)} left in The Void"
                )
            } else {
                val (headline, subline) = ScheduleAlarmManager.formatNextSessionLabel(context)
                views.setTextViewText(R.id.widget_next_label, "NEXT SESSION")
                views.setTextViewText(R.id.widget_next_value, headline)
                views.setTextViewText(R.id.widget_next_sub, subline)
            }

            // 42-Day Focus Activity Heatmap (14 cols x 3 rows)
            val density = context.resources.displayMetrics.density
            val bmpW = (296 * density).toInt().coerceIn(280, 960)
            val bmpH = (64 * density).toInt().coerceIn(56, 220)
            val heatmapBmp = WidgetDataStore.renderHeatmapBitmap(
                context = context,
                minutesByDate = stats.heatmapMinutesByDate,
                dailyGoalHours = stats.dailyGoalHours,
                cols = 14,
                rows = 3,
                widthPx = bmpW,
                heightPx = bmpH
            )
            views.setImageViewBitmap(R.id.widget_heatmap_image, heatmapBmp)

            appWidgetManager.updateAppWidget(appWidgetId, views)
        }
    }

    override fun onUpdate(
        context: Context,
        appWidgetManager: AppWidgetManager,
        appWidgetIds: IntArray
    ) {
        for (appWidgetId in appWidgetIds) {
            updateWidget(context, appWidgetManager, appWidgetId)
        }
    }
}
