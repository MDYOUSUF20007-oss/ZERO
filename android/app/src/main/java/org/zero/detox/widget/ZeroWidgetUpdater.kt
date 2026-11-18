package org.zero.detox.widget

import android.appwidget.AppWidgetManager
import android.content.ComponentName
import android.content.Context

/**
 * ZeroWidgetUpdater:
 * Pushes immediate refreshes to all placed Zero-Noise home screen widgets.
 */
object ZeroWidgetUpdater {
    @JvmStatic
    fun requestAllUpdates(context: Context) {
        try {
            val appCtx = context.applicationContext
            val manager = AppWidgetManager.getInstance(appCtx)

            val focusIds = manager.getAppWidgetIds(
                ComponentName(appCtx, ZeroFocusWidgetProvider::class.java)
            )
            for (id in focusIds) {
                ZeroFocusWidgetProvider.updateWidget(appCtx, manager, id)
            }

            val compactIds = manager.getAppWidgetIds(
                ComponentName(appCtx, ZeroCompactWidgetProvider::class.java)
            )
            for (id in compactIds) {
                ZeroCompactWidgetProvider.updateWidget(appCtx, manager, id)
            }
        } catch (_: Throwable) {
            // Non-fatal if launcher has no widgets bound
        }
    }
}
