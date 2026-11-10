package org.zero.detox.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.graphics.Color
import android.graphics.Typeface
import android.net.Uri
import android.os.BatteryManager
import android.os.Bundle
import android.os.CountDownTimer
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.LinearLayout
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
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

    companion object {
        @Volatile
        var isInForeground: Boolean = false

        @Volatile
        var dialerGraceUntilMillis: Long = 0L
    }

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

    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // OS-level flags: Wake, Keep Screen, Show over Keyguard
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        hideSystemUI()

        parachuteStore = ParachuteStore(this)
        lockEngine = LockEngine(this, parachuteStore)

        tryPinScreen()
        buildViewHierarchy()
        startTickers()
    }

    @Suppress("DEPRECATION")
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
            dpm.setLockTaskPackages(adminComponent, arrayOf(packageName, "com.android.dialer"))
            startLockTask()
        } else {
            try {
                startLockTask()
            } catch (_: Exception) {}
        }
    }

    private fun buildViewHierarchy() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            setPadding(48, 48, 48, 48)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        // Top Status Bar: Clock & Battery
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 80 }
        }

        textCurrentTime = TextView(this).apply {
            setTextColor(Color.WHITE)
            textSize = 14f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        textBattery = TextView(this).apply {
            setTextColor(Color.LTGRAY)
            textSize = 14f
            typeface = Typeface.MONOSPACE
        }

        topBar.addView(textCurrentTime)
        topBar.addView(textBattery)
        root.addView(topBar)

        // Center Content
        val centerBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        textSessionTag = TextView(this).apply {
            val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
            val tag = prefs.getString(LockEngine.KEY_SESSION_TAG, "Deep Work")
            text = "LOCKED IN #$tag"
            setTextColor(Color.parseColor("#F59E0B"))
            textSize = 13f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }

        textRemainingTime = TextView(this).apply {
            text = "00:00:00"
            setTextColor(Color.WHITE)
            textSize = 48f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        val textQuote = TextView(this).apply {
            text = "\"The obstacle is the way. Stay phone-free.\""
            setTextColor(Color.parseColor("#737373"))
            textSize = 12f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
        }

        centerBox.addView(textSessionTag)
        centerBox.addView(textRemainingTime)
        centerBox.addView(textQuote)
        root.addView(centerBox)

        // Bottom Controls
        val bottomBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        textParachuteBalance = TextView(this).apply {
            setTextColor(Color.LTGRAY)
            textSize = 11f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 16)
        }

        btnDeployParachute = Button(this).apply {
            text = "DEPLOY EMERGENCY PARACHUTE"
            setTextColor(Color.BLACK)
            setBackgroundColor(Color.parseColor("#F59E0B"))
            typeface = Typeface.MONOSPACE
            textSize = 12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 20 }
            setOnClickListener { handleDeployParachute() }
        }

        btnEmergencyCall = Button(this).apply {
            text = "EMERGENCY CALL (911 / 112)"
            setTextColor(Color.WHITE)
            setBackgroundColor(Color.parseColor("#18181B"))
            typeface = Typeface.MONOSPACE
            textSize = 12f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                dialerGraceUntilMillis = System.currentTimeMillis() + 30_000L
                startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:")))
            }
        }

        bottomBox.addView(textParachuteBalance)
        bottomBox.addView(btnDeployParachute)
        bottomBox.addView(btnEmergencyCall)
        root.addView(bottomBox)

        setContentView(root)
        updateParachuteStatus()
    }

    private fun handleDeployParachute() {
        val balance = parachuteStore.getParachuteBalance()
        if (balance <= 0) {
            Toast.makeText(this, "0 Parachutes available. Earn 1 per 20 cumulative hours.", Toast.LENGTH_LONG).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Deploy Emergency Parachute?")
            .setMessage("You have $balance Parachute(s).\n\nDeploying consumes 1 Parachute and terminates the lock.\n\nABORTED SESSION PENALTY: All elapsed time in this session is VOIDED and will NOT count toward your next 20h Parachute.")
            .setPositiveButton("Deploy (-1 Parachute)") { _, _ ->
                val success = lockEngine.deployParachute()
                if (success) {
                    isInForeground = false
                    try { stopLockTask() } catch (_: Exception) {}
                    finish()
                }
            }
            .setNegativeButton("Cancel & Focus", null)
            .show()
    }

    private fun updateParachuteStatus() {
        val balance = parachuteStore.getParachuteBalance()
        textParachuteBalance.text = "$balance Parachute(s) Available"
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

                val bm = getSystemService(Context.BATTERY_SERVICE) as BatteryManager
                val batteryPct = bm.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY)
                textBattery.text = "$batteryPct%"
            }

            override fun onFinish() {
                isInForeground = false
                lockEngine.completeSession()
                try { stopLockTask() } catch (_: Exception) {}
                Toast.makeText(this@TheVoidActivity, "Lock Completed. Focus Reclaimed!", Toast.LENGTH_LONG).show()
                finish()
            }
        }.start()
    }

    override fun onResume() {
        super.onResume()
        isInForeground = true
        hideSystemUI()
    }

    override fun onPause() {
        isInForeground = false
        super.onPause()
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {}

    override fun onDestroy() {
        isInForeground = false
        countDownTimer?.cancel()
        super.onDestroy()
    }
}
