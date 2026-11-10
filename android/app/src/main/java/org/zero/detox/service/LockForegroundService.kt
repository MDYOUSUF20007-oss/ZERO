package org.zero.detox.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import androidx.core.app.NotificationCompat
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.ui.TheVoidActivity

/**
 * LockForegroundService:
 * Keeps the focus lock persistent in OS memory and runs a non-intrusive Watchdog loop
 * (requiring zero AccessibilityService permissions) that re-surfaces The Void if minimized
 * prior to targetEndTimeMillis.
 */
class LockForegroundService : Service() {

    companion object {
        const val ACTION_START_LOCK = "org.zero.detox.START_LOCK"
        const val ACTION_STOP_LOCK = "org.zero.detox.STOP_LOCK"
        const val CHANNEL_ID = "zero_void_channel"
        const val NOTIFICATION_ID = 1001
        private const val WATCHDOG_INTERVAL_MS = 500L
    }

    private val handler = Handler(Looper.getMainLooper())
    private var isWatchdogActive = false

    private val watchdogRunnable = object : Runnable {
        override fun run() {
            if (!isWatchdogActive) return

            val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
            val isLocked = prefs.getBoolean(LockEngine.KEY_IS_LOCKED, false)
            val targetEndTime = prefs.getLong(LockEngine.KEY_TARGET_END_TIME, 0L)
            val now = System.currentTimeMillis()

            if (!isLocked) {
                stopWatchdogAndService()
                return
            }

            if (now >= targetEndTime) {
                LockEngine(this@LockForegroundService, ParachuteStore(this@LockForegroundService)).completeSession()
                stopWatchdogAndService()
                return
            }

            if (!TheVoidActivity.isInForeground && now > TheVoidActivity.dialerGraceUntilMillis) {
                val voidIntent = Intent(this@LockForegroundService, TheVoidActivity::class.java).apply {
                    flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                            Intent.FLAG_ACTIVITY_CLEAR_TOP or
                            Intent.FLAG_ACTIVITY_SINGLE_TOP or
                            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
                }
                try {
                    startActivity(voidIntent)
                } catch (_: Exception) {}
            }

            handler.postDelayed(this, WATCHDOG_INTERVAL_MS)
        }
    }

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        if (intent?.action == ACTION_STOP_LOCK) {
            stopWatchdogAndService()
            return START_NOT_STICKY
        }

        val tag = intent?.getStringExtra("EXTRA_TAG") ?: "Deep Work"
        val notification = buildLockNotification(tag)

        if (Build.VERSION.SDK_INT >= 34) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_SPECIAL_USE)
        } else {
            startForeground(NOTIFICATION_ID, notification)
        }

        if (!isWatchdogActive) {
            isWatchdogActive = true
            handler.postDelayed(watchdogRunnable, WATCHDOG_INTERVAL_MS)
        }

        return START_STICKY
    }

    private fun stopWatchdogAndService() {
        isWatchdogActive = false
        handler.removeCallbacks(watchdogRunnable)
        stopForeground(STOP_FOREGROUND_REMOVE)
        stopSelf()
    }

    override fun onDestroy() {
        isWatchdogActive = false
        handler.removeCallbacks(watchdogRunnable)
        super.onDestroy()
    }

    override fun onBind(intent: Intent?): IBinder? = null

    private fun buildLockNotification(tag: String): Notification {
        val voidIntent = Intent(this, TheVoidActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            voidIntent,
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Zero — The Void is Active")
            .setContentText("Locked in $tag session. Focus mode engaged.")
            .setSmallIcon(android.R.drawable.ic_lock_idle_lock)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setContentIntent(pendingIntent)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "Zero Active Lock",
                NotificationManager.IMPORTANCE_HIGH
            ).apply {
                description = "Enforces persistent lock state during digital detox"
                setSound(null, null)
                enableVibration(false)
            }
            val manager = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            manager.createNotificationChannel(channel)
        }
    }
}
