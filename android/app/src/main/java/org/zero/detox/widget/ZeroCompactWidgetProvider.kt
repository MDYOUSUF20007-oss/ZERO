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
 * ZeroCompactWidgetProvider (4x1 Compact Home Screen Widget):
 * Shows Today's Time Saved, Next Scheduled Session reminder, and a 7-day mini activity bar.
 */
class ZeroCompactWidgetProvider : AppWidgetProvider() {

    companion object {
        fun updateWidget(context: Context, appWidgetManager: AppWidgetManager, appWidgetId: Int) {
            val views = RemoteViews(context.packageName, R.layout.widget_zero_compact)
            val stats = WidgetDataStore.load(context)
            val accent = VoidThemeStore.ensureReadableOnBlack(
                VoidThemeStore.loadAccent(context).accentColor
            )

            val timing = try {
                val lockEngine = LockEngine(context, ParachuteStore(context))
                lockEngine.refreshAndCompleteIfExpired()
            } catch (_: Throwable) {
                null
            }

            val launchIntent = Intent(context, MainActivity::class.java).apply {
                flags = Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
            }
            val launchPi = PendingIntent.getActivity(
                context,
                5102,
                launchIntent,
                PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
            )
            views.setOnClickPendingIntent(R.id.widget_compact_root, launchPi)

            views.setTextViewText(
                R.id.widget_compact_saved_value,
                WidgetDataStore.formatDurationCompact(stats.todaySavedSeconds)
            )
            views.setTextColor(R.id.widget_compact_saved_value, accent)

            if (timing != null && timing.isLocked && !timing.isExpired) {
                views.setTextViewText(
                    R.id.widget_compact_next_title,
                    "Locked • #${timing.sessionTag}"
                )
                views.setTextViewText(
                    R.id.widget_compact_next_sub,
                    "${WidgetDataStore.formatDurationCompact(timing.remainingSeconds)} left"
                )
            } else {
                val (headline, subline) = ScheduleAlarmManager.formatNextSessionLabel(context)
                views.setTextViewText(R.id.widget_compact_next_title, headline)
                views.setTextViewText(R.id.widget_compact_next_sub, subline)
            }

            val density = context.resources.displayMetrics.density
            val bmpW = (112 * density).toInt().coerceIn(112, 360)
            val bmpH = (20 * density).toInt().coerceIn(20, 72)
            val miniHeatmap = WidgetDataStore.renderHeatmapBitmap(
                context = context,
                minutesByDate = stats.heatmapMinutesByDate,
                dailyGoalHours = stats.dailyGoalHours,
                cols = 7,
                rows = 1,
                widthPx = bmpW,
                heightPx = bmpH
            )
            views.setImageViewBitmap(R.id.widget_compact_heatmap, miniHeatmap)

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
