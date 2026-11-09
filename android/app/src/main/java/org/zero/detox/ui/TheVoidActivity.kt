package org.zero.detox.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.BatteryManager
import android.os.Build
import android.os.Bundle
import android.os.CountDownTimer
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import org.zero.detox.R
import org.zero.detox.core.LockEngine
import org.zero.detox.data.ParachuteStore
import org.zero.detox.receiver.ZeroDeviceAdminReceiver
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * TheVoidActivity:
 * The ultra-minimalist, distraction-free screen lock overlay ("The Void").
 * Enforces Kiosk / LockTaskMode pinning, handles emergency calls, and validates Parachute deployment.
 */
class TheVoidActivity : AppCompatActivity() {

    private lateinit var lockEngine: LockEngine
    private lateinit var parachuteStore: ParachuteStore
    private var countDownTimer: CountDownTimer? = null

    private lateinit var textRemainingTime: TextView
    private lateinit var textCurrentTime: TextView
    private lateinit var textBattery: TextView
    private lateinit var textSessionTag: TextView
    private lateinit var btnEmergencyCall: Button
    private lateinit var btnDeployParachute: Button
    private lateinit var textParachuteBalance: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // OS-level flags: Wake, Keep Screen, Show over Keyguard
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        // Hide navigation and system bars (Immersive Sticky Mode)
        hideSystemUI()

        parachuteStore = ParachuteStore(this)
        lockEngine = LockEngine(this, parachuteStore)

        // Try locking task if device admin / kiosk permissions are granted
        tryPinScreen()

        setupViewBindings()
        startTickers()
    }

    private fun hideSystemUI() {
        window.decorView.systemUiVisibility = (
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        or View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        or View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                        or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        or View.SYSTEM_UI_FLAG_FULLSCREEN
                )
    }

    private fun tryPinScreen() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as DevicePolicyManager
        val adminComponent = ComponentName(this, ZeroDeviceAdminReceiver::class.java)

        if (dpm.isDeviceOwnerApp(packageName)) {
            // Unlocked device owner mode: lock task without exit prompt
            dpm.setLockTaskPackages(adminComponent, arrayOf(packageName, "com.android.dialer"))
            startLockTask()
        } else {
            // Standard user pinned mode
            try {
                startLockTask()
            } catch (e: Exception) {
                // Pinning not enabled or permission missing
            }
        }
    }

    private fun setupViewBindings() {
        // In actual layout XML:
        // textRemainingTime, textCurrentTime, textBattery, textSessionTag, btnEmergencyCall, btnDeployParachute
        updateParachuteStatus()

        btnEmergencyCall.setOnClickListener {
            // Open system emergency dialer
            val dialIntent = Intent(Intent.ACTION_DIAL).apply {
                data = Uri.parse("tel:")
            }
            startActivity(dialIntent)
        }

        btnDeployParachute.setOnClickListener {
            val balance = parachuteStore.getParachuteBalance()
            if (balance <= 0) {
                Toast.makeText(this, "No Parachutes available. Earn 1 per 20 cumulative hours.", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            AlertDialog.Builder(this)
                .setTitle("Deploy Emergency Parachute?")
                .setMessage("You have $balance Parachute(s).\n\nDeploying will terminate this session immediately, BUT all elapsed time in this session will NOT count toward your next Parachute.")
                .setPositiveButton("Deploy (-1 Parachute)") { _, _ ->
                    val success = lockEngine.deployParachute()
                    if (success) {
                        try { stopLockTask() } catch (_: Exception) {}
                        finish()
                    }
                }
                .setNegativeButton("Cancel", null)
                .show()
        }
    }

    private fun updateParachuteStatus() {
        val balance = parachuteStore.getParachuteBalance()
        textParachuteBalance.text = "$balance Available"
        btnDeployParachute.isEnabled = (balance > 0)
        btnDeployParachute.alpha = if (balance > 0) 1.0f else 0.4f
    }

    private fun startTickers() {
        val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val targetEndTime = prefs.getLong(LockEngine.KEY_TARGET_END_TIME, 0L)
        val now = System.currentTimeMillis()
        val remainingMillis = maxOf(0L, targetEndTime - now)

        countDownTimer = object : CountDownTimer(remainingMillis, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                val totalSec = millisUntilFinished / 1000L
                val hours = totalSec / 3600L
                val minutes = (totalSec % 3600L) / 60L
                val seconds = totalSec % 60L

                textRemainingTime.text = String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)
                textCurrentTime.text = SimpleDateFormat("h:mm a", Locale.getDefault()).format(Date())

                // Update Battery
                val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                textBattery.text = "$batteryPct%"
            }

            override fun onFinish() {
                lockEngine.completeSession()
                try { stopLockTask() } catch (_: Exception) {}
                Toast.makeText(this@TheVoidActivity, "Lock Completed. Reclaimed!", Toast.LENGTH_LONG).show()
                finish()
            }
        }.start()
    }

    override fun onBackPressed() {
        // Block back button during Void lock
    }

    override fun onDestroy() {
        countDownTimer?.cancel()
        super.onDestroy()
    }
}
