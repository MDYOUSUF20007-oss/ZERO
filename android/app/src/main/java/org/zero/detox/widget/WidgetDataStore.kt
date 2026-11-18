package org.zero.detox.widget

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RectF
import org.json.JSONObject
import org.zero.detox.ui.VoidThemeStore
import java.text.SimpleDateFormat
import java.util.Calendar
import java.util.Locale
import kotlin.math.max
import kotlin.math.min

/**
 * WidgetDataStore:
 * Persists focus metrics & daily heatmap minutes synced from React (and updated natively
 * on session completion) so Android Home Screen AppWidgets render accurately offline.
 */
object WidgetDataStore {
    private const val PREFS_NAME = "zero_widget_stats_prefs"
    private const val KEY_TODAY_SAVED_SEC = "today_saved_sec"
    private const val KEY_TODAY_DATE = "today_date"
    private const val KEY_TOTAL_SAVED_SEC = "total_saved_sec"
    private const val KEY_STREAK_DAYS = "streak_days"
    private const val KEY_DAILY_GOAL_HOURS = "daily_goal_hours"
    private const val KEY_HEATMAP_JSON = "heatmap_json"

    data class WidgetStatsSnapshot(
        val todaySavedSeconds: Long,
        val totalSavedSeconds: Long,
        val streakDays: Int,
        val dailyGoalHours: Float,
        val heatmapMinutesByDate: Map<String, Int>
    )

    private fun todayDateKey(): String {
        return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Calendar.getInstance().time)
    }

    @JvmStatic
    fun saveFromJson(context: Context, payloadJson: String?) {
        if (payloadJson.isNullOrBlank()) return
        try {
            val obj = JSONObject(payloadJson)
            val todaySec = max(0L, obj.optLong("todaySavedSeconds", 0L))
            val totalSec = max(0L, obj.optLong("totalSavedSeconds", 0L))
            val streak = max(0, obj.optInt("streakDays", 0))
            val goal = obj.optDouble("dailyGoalHours", 2.0).toFloat().coerceIn(0.5f, 16f)
            val heatmapObj = obj.optJSONObject("heatmap") ?: JSONObject()

            context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
                .edit()
                .putLong(KEY_TODAY_SAVED_SEC, todaySec)
                .putString(KEY_TODAY_DATE, todayDateKey())
                .putLong(KEY_TOTAL_SAVED_SEC, totalSec)
                .putInt(KEY_STREAK_DAYS, streak)
                .putFloat(KEY_DAILY_GOAL_HOURS, goal)
                .putString(KEY_HEATMAP_JSON, heatmapObj.toString())
                .apply()
        } catch (_: Throwable) {
            // Ignore malformed sync payload
        }
    }

    /**
     * Increments native widget stats immediately when LockEngine completes a session in background
     * even before the React WebView opens.
     */
    @JvmStatic
    fun recordNativeCompletedSeconds(context: Context, seconds: Long) {
        if (seconds <= 0L) return
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val today = todayDateKey()
        val storedDate = prefs.getString(KEY_TODAY_DATE, "")
        val prevToday = if (storedDate == today) prefs.getLong(KEY_TODAY_SAVED_SEC, 0L) else 0L
        val prevTotal = prefs.getLong(KEY_TOTAL_SAVED_SEC, 0L)

        val mapJson = try {
            JSONObject(prefs.getString(KEY_HEATMAP_JSON, "{}") ?: "{}")
        } catch (_: Throwable) {
            JSONObject()
        }
        val prevMins = mapJson.optInt(today, 0)
        val addedMins = max(1, (seconds / 60L).toInt())
        mapJson.put(today, prevMins + addedMins)

        prefs.edit()
            .putLong(KEY_TODAY_SAVED_SEC, prevToday + seconds)
            .putString(KEY_TODAY_DATE, today)
            .putLong(KEY_TOTAL_SAVED_SEC, prevTotal + seconds)
            .putString(KEY_HEATMAP_JSON, mapJson.toString())
            .apply()
    }

    @JvmStatic
    fun load(context: Context): WidgetStatsSnapshot {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val today = todayDateKey()
        val storedDate = prefs.getString(KEY_TODAY_DATE, "")
        val todaySec = if (storedDate == today) prefs.getLong(KEY_TODAY_SAVED_SEC, 0L) else 0L
        val totalSec = prefs.getLong(KEY_TOTAL_SAVED_SEC, 0L)
        val streak = prefs.getInt(KEY_STREAK_DAYS, 0)
        val goal = prefs.getFloat(KEY_DAILY_GOAL_HOURS, 2.0f).coerceIn(0.5f, 16f)

        val map = mutableMapOf<String, Int>()
        try {
            val raw = prefs.getString(KEY_HEATMAP_JSON, "{}") ?: "{}"
            val obj = JSONObject(raw)
            val keys = obj.keys()
            while (keys.hasNext()) {
                val k = keys.next()
                map[k] = max(0, obj.optInt(k, 0))
            }
        } catch (_: Throwable) {}

        return WidgetStatsSnapshot(
            todaySavedSeconds = todaySec,
            totalSavedSeconds = totalSec,
            streakDays = streak,
            dailyGoalHours = goal,
            heatmapMinutesByDate = map
        )
    }

    @JvmStatic
    fun formatDurationCompact(seconds: Long): String {
        val safe = max(0L, seconds)
        val totalMins = safe / 60L
        if (totalMins <= 0L) return "0m"
        val hrs = totalMins / 60L
        val mins = totalMins % 60L
        return when {
            hrs >= 100L -> "${hrs}h"
            hrs > 0L && mins > 0L -> "${hrs}h ${mins}m"
            hrs > 0L -> "${hrs}h"
            else -> "${mins}m"
        }
    }

    @JvmStatic
    fun formatTotalHours(seconds: Long): String {
        val hrs = max(0L, seconds) / 3600.0
        return if (hrs >= 10.0) {
            String.format(Locale.US, "%.0fh saved", hrs)
        } else {
            String.format(Locale.US, "%.1fh saved", hrs)
        }
    }

    /**
     * Renders a crisp rounded-square GitHub-style activity heatmap Bitmap
     * tinted with the user's active Zero-Noise theme accent.
     */
    @JvmStatic
    fun renderHeatmapBitmap(
        context: Context,
        minutesByDate: Map<String, Int>,
        dailyGoalHours: Float,
        cols: Int,
        rows: Int,
        widthPx: Int,
        heightPx: Int
    ): Bitmap {
        val safeW = max(64, widthPx)
        val safeH = max(20, heightPx)
        val bmp = Bitmap.createBitmap(safeW, safeH, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bmp)

        val accentCfg = VoidThemeStore.loadAccent(context)
        val readableAccent = VoidThemeStore.ensureReadableOnBlack(accentCfg.accentColor)
        val emptyColor = Color.parseColor("#1D1D24")
        val level1 = VoidThemeStore.withAlpha(readableAccent, 72)
        val level2 = VoidThemeStore.withAlpha(readableAccent, 130)
        val level3 = VoidThemeStore.withAlpha(readableAccent, 195)
        val level4 = readableAccent

        val totalCells = cols * rows
        val fmt = SimpleDateFormat("yyyy-MM-dd", Locale.US)
        val goalMins = max(30f, dailyGoalHours * 60f)

        val gapX = max(3f, safeW * 0.012f)
        val gapY = max(3f, safeH * 0.08f)
        val cellW = (safeW - gapX * (cols - 1)) / cols.toFloat()
        val cellH = (safeH - gapY * (rows - 1)) / rows.toFloat()
        val cellSize = min(cellW, cellH)
        val gridW = cellSize * cols + gapX * (cols - 1)
        val gridH = cellSize * rows + gapY * (rows - 1)
        val offsetX = (safeW - gridW) * 0.5f
        val offsetY = (safeH - gridH) * 0.5f
        val radius = max(2.5f, cellSize * 0.24f)

        val fillPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply { style = Paint.Style.FILL }
        val todayRingPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            style = Paint.Style.STROKE
            strokeWidth = max(1.5f, cellSize * 0.11f)
            color = Color.WHITE
        }
        val rect = RectF()

        val cal = Calendar.getInstance()
        cal.add(Calendar.DAY_OF_YEAR, -(totalCells - 1))

        for (index in 0 until totalCells) {
            val dateStr = fmt.format(cal.time)
            val mins = minutesByDate[dateStr] ?: 0
            val ratio = mins / goalMins

            fillPaint.color = when {
                mins <= 0 -> emptyColor
                ratio < 0.25f -> level1
                ratio < 0.55f -> level2
                ratio < 0.90f -> level3
                else -> level4
            }

            // Fill column-major so newest days appear on the right
            val col = index / rows
            val row = index % rows
            val left = offsetX + col * (cellSize + gapX)
            val top = offsetY + row * (cellSize + gapY)
            rect.set(left, top, left + cellSize, top + cellSize)
            canvas.drawRoundRect(rect, radius, radius, fillPaint)

            // Crisp ring on Today (final cell)
            if (index == totalCells - 1) {
                val inset = todayRingPaint.strokeWidth * 0.5f
                rect.inset(inset, inset)
                canvas.drawRoundRect(rect, radius, radius, todayRingPaint)
            }

            cal.add(Calendar.DAY_OF_YEAR, 1)
        }

        return bmp
    }
}
