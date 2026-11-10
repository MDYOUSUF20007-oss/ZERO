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
import android.widget.ScrollView
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.ViewCompat
import androidx.core.view.WindowInsetsCompat
import org.zero.detox.core.LockEngine
import org.zero.detox.data.BagStore
import org.zero.detox.data.ParachuteStore
import org.zero.detox.receiver.ZeroDeviceAdminReceiver
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * TheVoidActivity:
 * Full-screen distraction-free focus shield ("The Void").
 * - Enforces Device Owner LockTaskMode ONLY when provisioned via ADB (never weak manual Screen Pinning)
 * - Relies on AccessibilityService / UsageStats + Overlay Watchdog for tamper-proof enforcement
 * - Displays packed Bag apps + optional Normal Phone/SMS buttons & Emergency SOS dialer
 */
class TheVoidActivity : AppCompatActivity() {

    companion object {
        @Volatile
        var isInForeground: Boolean = false

        @Volatile
        var dialerGraceUntilMillis: Long = 0L

        @Volatile
        var bagLaunchGraceUntilMillis: Long = 0L

        @Volatile
        var activeBagPackage: String? = null
    }

    private lateinit var lockEngine: LockEngine
    private lateinit var parachuteStore: ParachuteStore
    private lateinit var bagStore: BagStore
    private var countDownTimer: CountDownTimer? = null

    private lateinit var textRemainingTime: TextView
    private lateinit var textCurrentTime: TextView
    private lateinit var textBattery: TextView
    private lateinit var textSessionTag: TextView
    private lateinit var btnEmergencyCall: Button
    private lateinit var btnDeployParachute: Button
    private lateinit var textParachuteBalance: TextView
    private lateinit var bagContainer: LinearLayout

    @Suppress("DEPRECATION")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED or
                    WindowManager.LayoutParams.FLAG_TURN_SCREEN_ON or
                    WindowManager.LayoutParams.FLAG_DISMISS_KEYGUARD
        )

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // Back navigation & predictive back swipes are intentionally disabled inside The Void
            }
        })

        hideSystemUI()

        parachuteStore = ParachuteStore(this)
        bagStore = BagStore(this)
        lockEngine = LockEngine(this, parachuteStore)

        tryDeviceOwnerPinning()
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

    /**
     * Enables OS Kiosk LockTaskMode strictly when Zero is Device Owner via ADB.
     * Never triggers Android's soft Screen Pinning fallback (which can be unpinned by holding Back).
     */
    private fun tryDeviceOwnerPinning() {
        val dpm = getSystemService(Context.DEVICE_POLICY_SERVICE) as? DevicePolicyManager ?: return
        val adminComponent = ComponentName(this, ZeroDeviceAdminReceiver::class.java)
        if (dpm.isDeviceOwnerApp(packageName)) {
            val allowed = mutableListOf(packageName)
            allowed.addAll(bagStore.getBagApps().map { it.packageName })
            if (bagStore.isCallsAllowed()) {
                allowed.addAll(bagStore.getAllowedDialerPackages())
            }
            if (bagStore.isSmsAllowed()) {
                allowed.addAll(bagStore.getAllowedSmsPackages())
            }
            try {
                dpm.setLockTaskPackages(adminComponent, allowed.distinct().toTypedArray())
                startLockTask()
            } catch (_: Exception) {}
        }
    }

    private fun buildViewHierarchy() {
        val root = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.BLACK)
            setPadding(48, 72, 48, 48)
            gravity = Gravity.CENTER_HORIZONTAL
        }

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val sys = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(48, maxOf(72, sys.top + 32), 48, maxOf(48, sys.bottom + 24))
            insets
        }

        // Top Status Bar: Clock & Battery
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = 40 }
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
            setPadding(0, 0, 0, 20)
        }

        textRemainingTime = TextView(this).apply {
            text = "00:00:00"
            setTextColor(Color.WHITE)
            textSize = 48f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 24)
        }

        val textQuote = TextView(this).apply {
            text = "\"The obstacle is the way. Stay phone-free.\""
            setTextColor(Color.parseColor("#737373"))
            textSize = 12f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, 32)
        }

        // Packed Bag Card (Normal Calls / Texts + Up to 3 Custom Bag Apps)
        bagContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.parseColor("#0D0D0D"))
            setPadding(28, 24, 28, 24)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        populateBagSection()

        centerBox.addView(textSessionTag)
        centerBox.addView(textRemainingTime)
        centerBox.addView(textQuote)
        centerBox.addView(bagContainer)
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
            setPadding(0, 12, 0, 14)
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
            ).apply { bottomMargin = 16 }
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
                dialerGraceUntilMillis = System.currentTimeMillis() + 45_000L
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

    private fun populateBagSection() {
        bagContainer.removeAllViews()
        val bagName = bagStore.getActiveBagName().uppercase(Locale.US)
        val allowCalls = bagStore.isCallsAllowed()
        val allowSms = bagStore.isSmsAllowed()
        val apps = bagStore.getBagApps()

        val header = TextView(this).apply {
            text = "BAG: $bagName (${apps.size}/3 APPS)"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 11f
            typeface = Typeface.MONOSPACE
            setPadding(0, 0, 0, 16)
        }
        bagContainer.addView(header)

        if (!allowCalls && !allowSms && apps.isEmpty()) {
            val emptyMsg = TextView(this).apply {
                text = "Monk Mode: Empty Bag. All normal apps, calls & texts are sealed."
                setTextColor(Color.parseColor("#71717A"))
                textSize = 11f
                typeface = Typeface.MONOSPACE
            }
            bagContainer.addView(emptyMsg)
            return
        }

        val scroll = ScrollView(this)
        val btnStack = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
        }

        if (allowCalls) {
            val btnPhone = Button(this).apply {
                text = "PHONE (NORMAL CALLS)"
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#18181B"))
                typeface = Typeface.MONOSPACE
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 10 }
                setOnClickListener {
                    val pkg = bagStore.getPrimaryDialerPackage()
                    if (pkg != null) {
                        launchAllowedBagPackage(pkg, fallbackIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:")))
                    } else {
                        bagLaunchGraceUntilMillis = System.currentTimeMillis() + 3000L
                        startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:")))
                    }
                }
            }
            btnStack.addView(btnPhone)
        }

        if (allowSms) {
            val btnSms = Button(this).apply {
                text = "MESSAGES (NORMAL SMS)"
                setTextColor(Color.WHITE)
                setBackgroundColor(Color.parseColor("#18181B"))
                typeface = Typeface.MONOSPACE
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 10 }
                setOnClickListener {
                    val pkg = bagStore.getPrimarySmsPackage()
                    if (pkg != null) {
                        launchAllowedBagPackage(pkg, fallbackIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")))
                    } else {
                        bagLaunchGraceUntilMillis = System.currentTimeMillis() + 3000L
                        startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")))
                    }
                }
            }
            btnStack.addView(btnSms)
        }

        for (app in apps) {
            val btnApp = Button(this).apply {
                text = app.appName.uppercase(Locale.US)
                setTextColor(Color.BLACK)
                setBackgroundColor(Color.parseColor("#E4E4E7"))
                typeface = Typeface.MONOSPACE
                textSize = 11f
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = 10 }
                setOnClickListener {
                    launchAllowedBagPackage(app.packageName, null)
                }
            }
            btnStack.addView(btnApp)
        }

        scroll.addView(btnStack)
        bagContainer.addView(scroll)
    }

    private fun launchAllowedBagPackage(targetPackage: String, fallbackIntent: Intent?) {
        if (!bagStore.isPackageAllowedDuringLock(targetPackage)) {
            Toast.makeText(this, "App not permitted in your active Bag.", Toast.LENGTH_SHORT).show()
            return
        }
        activeBagPackage = targetPackage
        bagLaunchGraceUntilMillis = System.currentTimeMillis() + 3_500L
        try {
            val launch = packageManager.getLaunchIntentForPackage(targetPackage) ?: fallbackIntent
            if (launch != null) {
                launch.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
                startActivity(launch)
            } else {
                Toast.makeText(this, "Unable to launch $targetPackage", Toast.LENGTH_SHORT).show()
            }
        } catch (e: Exception) {
            Toast.makeText(this, "Launch error: ${e.localizedMessage}", Toast.LENGTH_SHORT).show()
        }
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
                    activeBagPackage = null
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

                val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
                val batteryPct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
                textBattery.text = "$batteryPct%"
            }

            override fun onFinish() {
                isInForeground = false
                activeBagPackage = null
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
        activeBagPackage = null
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
