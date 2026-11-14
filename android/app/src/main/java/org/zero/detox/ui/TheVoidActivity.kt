package org.zero.detox.ui

import android.app.admin.DevicePolicyManager
import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.content.res.ColorStateList
import android.graphics.Color
import android.graphics.Outline
import android.graphics.Typeface
import android.graphics.drawable.Drawable
import android.graphics.drawable.GradientDrawable
import android.graphics.drawable.RippleDrawable
import android.media.AudioManager
import android.net.Uri
import android.os.BatteryManager
import android.os.Bundle
import android.os.CountDownTimer
import android.os.SystemClock
import android.text.TextUtils
import android.view.Gravity
import android.view.View
import android.view.ViewGroup
import android.view.ViewOutlineProvider
import android.view.WindowManager
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.HorizontalScrollView
import android.widget.ImageView
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
import org.zero.detox.engage.EngageConfig
import org.zero.detox.engage.EngageConfigStore
import org.zero.detox.receiver.ZeroDeviceAdminReceiver
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * TheVoidActivity:
 * Full-screen distraction-free focus shield ("The Void").
 * - Enforces Device Owner LockTaskMode ONLY when provisioned via ADB (never weak manual Screen Pinning)
 * - Relies on AccessibilityService / UsageStats + Overlay Watchdog for tamper-proof enforcement
 * - Displays Pixelated Gradient Clock synced with active Theme Accent above the countdown timer
 * - Displays WhatsApp-style brand-colored vertical Bag app rows + compulsory Phone Calls / optional SMS & Emergency SOS
 */
class TheVoidActivity : AppCompatActivity() {

    companion object {
        @Volatile
        var isInForeground: Boolean = false

        @Volatile
        var dialerGraceUntilElapsed: Long = 0L

        @Volatile
        var bagLaunchGraceUntilElapsed: Long = 0L

        @Volatile
        var activeBagPackage: String? = null
    }

    private lateinit var lockEngine: LockEngine
    private lateinit var parachuteStore: ParachuteStore
    private lateinit var bagStore: BagStore
    private var countDownTimer: CountDownTimer? = null

    private lateinit var accentConfig: VoidThemeStore.VoidAccentConfig
    private var isBespokeStyle: Boolean = false

    private lateinit var textCurrentTime: TextView
    private lateinit var statusDot: View
    private lateinit var textVoidActive: TextView
    private lateinit var textClockHeader: TextView
    private lateinit var textQuote: TextView
    private lateinit var textBattery: TextView
    private lateinit var textSessionTag: TextView
    private lateinit var btnEmergencyCall: Button
    private lateinit var btnDeployParachute: Button
    private lateinit var textParachuteBalance: TextView
    private lateinit var bagContainer: LinearLayout
    private lateinit var centerBox: LinearLayout

    private lateinit var pixelClockCard: FrameLayout
    private lateinit var pixelClockRim: View
    private lateinit var pixelClockView: PixelClockView

    private lateinit var pixelTimerCard: FrameLayout
    private lateinit var pixelTimerRim: View
    private lateinit var pixelTimerView: PixelClockView

    private fun resolveReadableAccent(): Int {
        return if (isBespokeStyle) {
            Color.parseColor("#3B82F6")
        } else {
            VoidThemeStore.ensureReadableOnBlack(accentConfig.accentColor)
        }
    }

    private fun dp(value: Int): Int {
        return (value * resources.displayMetrics.density).toInt()
    }

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
        accentConfig = VoidThemeStore.loadAccent(this)
        isBespokeStyle = VoidThemeStore.isBespokeStyle(this)

        tryDeviceOwnerPinning()
        applyVoidSilentMode()
        buildViewHierarchy()
        startTickers()
    }

    private var originalRingerMode: Int? = null

    private fun applyVoidSilentMode() {
        try {
            val am = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            originalRingerMode = am.ringerMode
            // Set to VIBRATE mode: silences intrusive sounds while ensuring critical Phone Calls
            // and WhatsApp messages remain audible/vibrating and visible (Never force strict DND).
            if (am.ringerMode == AudioManager.RINGER_MODE_NORMAL) {
                am.ringerMode = AudioManager.RINGER_MODE_VIBRATE
            }
        } catch (_: Exception) {}
    }

    private fun restoreRingerMode() {
        try {
            val am = getSystemService(Context.AUDIO_SERVICE) as? AudioManager ?: return
            originalRingerMode?.let {
                am.ringerMode = it
            }
        } catch (_: Exception) {}
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
            // Phone Calls are compulsory and always permitted even in an empty Bag
            allowed.addAll(bagStore.getAllowedDialerPackages())
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
            setPadding(dp(20), dp(28), dp(20), dp(20))
            gravity = Gravity.CENTER_HORIZONTAL
        }

        ViewCompat.setOnApplyWindowInsetsListener(root) { v, insets ->
            val sys = insets.getInsets(WindowInsetsCompat.Type.systemBars())
            v.setPadding(dp(20), maxOf(dp(28), sys.top + dp(12)), dp(20), maxOf(dp(20), sys.bottom + dp(12)))
            insets
        }

        // Top Status Bar: Clock left, VOID ACTIVE badge + Battery right
        val topBar = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        val initialTimeLower = SimpleDateFormat("h:mm a", Locale.US)
            .format(Date())
            .lowercase(Locale.US)
        val initialTimeUpper = initialTimeLower.uppercase(Locale.US)

        textCurrentTime = TextView(this).apply {
            text = initialTimeLower
            setTextColor(Color.parseColor("#D4D4D8"))
            textSize = 12f
            typeface = Typeface.MONOSPACE
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        statusDot = View(this).apply {
            val dotSize = dp(6)
            layoutParams = LinearLayout.LayoutParams(dotSize, dotSize).apply {
                marginEnd = dp(6)
            }
            background = GradientDrawable().apply {
                shape = if (isBespokeStyle) GradientDrawable.RECTANGLE else GradientDrawable.OVAL
                if (isBespokeStyle) {
                    cornerRadius = dp(1).toFloat()
                }
                setColor(resolveReadableAccent())
            }
        }

        textVoidActive = TextView(this).apply {
            text = "VOID ACTIVE"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 10f
            typeface = if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE
            letterSpacing = 0.08f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { marginEnd = dp(12) }
        }

        textBattery = TextView(this).apply {
            setTextColor(Color.parseColor("#D4D4D8"))
            textSize = 12f
            typeface = Typeface.MONOSPACE
        }

        topBar.addView(textCurrentTime)
        topBar.addView(statusDot)
        topBar.addView(textVoidActive)
        topBar.addView(textBattery)
        root.addView(topBar)

        // Scrollable Center Container (ensures bottom controls stay cleanly pinned on all screen sizes)
        val centerScroll = ScrollView(this).apply {
            isFillViewport = true
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
        }

        centerBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, dp(12))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 1. PIXELATED CLOCK CONTAINER (Directly Above Countdown Timer)
        pixelClockCard = FrameLayout(this).apply {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    val radiusDp = if (isBespokeStyle) 6 else 16
                    outline.setRoundRect(0, 0, view.width, view.height, dp(radiusDp).toFloat())
                }
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        pixelClockRim = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(2),
                Gravity.TOP
            ).apply {
                leftMargin = dp(24)
                rightMargin = dp(24)
            }
        }

        val clockInner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        textClockHeader = TextView(this).apply {
            text = "SYSTEM TIME // SYNCED"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 9.5f
            typeface = if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE
            letterSpacing = if (isBespokeStyle) 0.16f else 0.22f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }

        pixelClockView = PixelClockView(this).apply {
            setDesiredHeightDp(34f)
            setClockTime(initialTimeUpper)
            setBespokeMinimalist(isBespokeStyle)
            setAccentTheme(if (isBespokeStyle) Color.parseColor("#3B82F6") else accentConfig.accentColor)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        clockInner.addView(textClockHeader)
        clockInner.addView(pixelClockView)
        pixelClockCard.addView(clockInner)
        pixelClockCard.addView(pixelClockRim)

        // 2. INVERTED POLARITY PIXELATED TIMER CONTAINER (#FAFAFA light card, #000000 5x7 pixels)
        pixelTimerCard = FrameLayout(this).apply {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    val radiusDp = if (isBespokeStyle) 6 else 16
                    outline.setRoundRect(0, 0, view.width, view.height, dp(radiusDp).toFloat())
                }
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        pixelTimerRim = View(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                dp(2),
                Gravity.TOP
            ).apply {
                leftMargin = dp(24)
                rightMargin = dp(24)
            }
        }

        val timerInner = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            setPadding(dp(16), dp(14), dp(16), dp(16))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        textSessionTag = TextView(this).apply {
            val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
            val tag = prefs.getString(LockEngine.KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"
            text = "LOCKED IN #$tag"
            isAllCaps = true
            setTextColor(
                if (isBespokeStyle) Color.parseColor("#1D4ED8")
                else VoidThemeStore.darkenColor(accentConfig.accentColor, 0.65f)
            )
            textSize = 10f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = if (isBespokeStyle) 0.16f else 0.2f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }

        val initialRemaining = maxOf(0L, lockEngine.getCurrentTiming().remainingSeconds)
        val initialRemainingText = formatHms(initialRemaining)
        pixelTimerView = PixelClockView(this).apply {
            setDesiredHeightDp(36f)
            setInvertedPolarity(false)
            setClockTime(initialRemainingText)
            contentDescription = "Remaining lock time $initialRemainingText"
            setBespokeMinimalist(isBespokeStyle)
            setAccentTheme(if (isBespokeStyle) Color.parseColor("#3B82F6") else accentConfig.accentColor)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        timerInner.addView(textSessionTag)
        timerInner.addView(pixelTimerView)
        pixelTimerCard.addView(timerInner)
        pixelTimerCard.addView(pixelTimerRim)

        val voidQuotes = listOf(
            "\"You have power over your mind - not outside events. Realize this, and you will find strength.\" — Marcus Aurelius",
            "\"No man is free who is not master of himself.\" — Epictetus",
            "\"We suffer more often in imagination than in reality.\" — Seneca",
            "\"Do you have the patience to wait until your mud settles and the water is clear?\" — Lao Tzu",
            "\"Control of consciousness determines the quality of life.\" — Mihaly Csikszentmihalyi",
            "\"It is not a daily increase, but a daily decrease. Hack away at the unessential.\" — Bruce Lee",
            "\"Day by day, what you choose, what you think and what you do is who you become.\" — Heraclitus"
        )
        var quoteIdx = (0 until voidQuotes.size).random()

        textQuote = TextView(this).apply {
            text = voidQuotes[quoteIdx]
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 12f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.ITALIC
            )
            gravity = Gravity.CENTER
            setPadding(dp(16), dp(10), dp(16), dp(16))
            isClickable = true
            isFocusable = true
            setOnClickListener {
                quoteIdx = (quoteIdx + 1) % voidQuotes.size
                text = voidQuotes[quoteIdx]
            }
        }

        // Center Box holds strictly the Pixel Clock, Pixel Timer, and Stoic Quote
        centerBox.addView(pixelClockCard)
        centerBox.addView(pixelTimerCard)
        centerBox.addView(textQuote)
        centerScroll.addView(centerBox)
        root.addView(centerScroll)

        // Bottom Controls with Floating Allowed Apps Dock
        val bottomBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        bagContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(12), dp(10), dp(12), dp(10))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
        }
        bottomBox.addView(bagContainer)

        textParachuteBalance = TextView(this).apply {
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 11.5f
            typeface = Typeface.MONOSPACE
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, dp(10))
        }

        btnDeployParachute = Button(this).apply {
            text = "USE EMERGENCY ESCAPE TICKET"
            isAllCaps = false
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            textSize = 12f
            letterSpacing = 0.06f
            stateListAnimator = null
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
            setOnClickListener { handleDeployParachute() }
        }

        btnEmergencyCall = Button(this).apply {
            text = "EMERGENCY CALL (911 / 112)"
            isAllCaps = false
            setTextColor(Color.WHITE)
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            textSize = 12f
            letterSpacing = 0.06f
            stateListAnimator = null
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener {
                dialerGraceUntilElapsed = SystemClock.elapsedRealtime() + 45_000L
                startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:")))
            }
        }

        bottomBox.addView(textParachuteBalance)
        bottomBox.addView(btnDeployParachute)
        bottomBox.addView(btnEmergencyCall)
        root.addView(bottomBox)

        setContentView(root)
        applyAccentThemeVisuals()
        populateBagSection()
        refreshBatteryDisplay()
        updateParachuteStatus()
    }

    private fun updateWorkBagLayoutMode() {
        val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
        val rawTag = (prefs.getString(LockEngine.KEY_SESSION_TAG, "Deep Work") ?: "Deep Work")
            .trim()
            .trimStart('#')
            .trim()
            .ifEmpty { "Deep Work" }
        val workBagActive = bagStore.isWorkBagActive()
        val readableAccent = resolveReadableAccent()

        if (workBagActive) {
            textSessionTag.text = "WORK BAG // #${rawTag.uppercase(Locale.US)}"
        } else {
            textSessionTag.text = "LOCKED IN #${rawTag.uppercase(Locale.US)}"
        }
        textSessionTag.setTextColor(readableAccent)
    }

    private fun applyAccentThemeVisuals() {
        accentConfig = VoidThemeStore.loadAccent(this)
        isBespokeStyle = VoidThemeStore.isBespokeStyle(this)
        val accent = resolveReadableAccent()

        pixelClockCard.invalidateOutline()
        pixelTimerCard.invalidateOutline()

        if (isBespokeStyle) {
            pixelClockCard.background = GradientDrawable().apply {
                cornerRadius = dp(6).toFloat()
                setColor(Color.BLACK)
                setStroke(dp(1), Color.parseColor("#262626"))
            }
            pixelClockRim.visibility = View.GONE

            pixelTimerCard.background = GradientDrawable().apply {
                cornerRadius = dp(6).toFloat()
                setColor(Color.parseColor("#0B0F19"))
                setStroke(dp(1), Color.parseColor("#1E293B"))
            }
            pixelTimerRim.visibility = View.GONE

            bagContainer.background = GradientDrawable().apply {
                cornerRadius = dp(12).toFloat()
                setColor(Color.parseColor("#0A0A0A"))
                setStroke(dp(1), Color.parseColor("#262626"))
            }

            statusDot.background = GradientDrawable().apply {
                shape = GradientDrawable.RECTANGLE
                cornerRadius = dp(1).toFloat()
                setColor(accent)
            }

            textVoidActive.typeface = Typeface.SANS_SERIF
            textClockHeader.typeface = Typeface.SANS_SERIF
            textSessionTag.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            textSessionTag.letterSpacing = 0.16f
            textSessionTag.setTextColor(accent)
            textQuote.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.ITALIC)
            btnDeployParachute.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            btnEmergencyCall.typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            btnEmergencyCall.background = createRoundedButtonBg(
                fillColors = intArrayOf(Color.parseColor("#0A0A0A"), Color.parseColor("#0A0A0A")),
                strokeColor = Color.parseColor("#262626"),
                rippleColor = Color.parseColor("#26FFFFFF"),
                radiusDp = 6
            )
        } else {
            pixelClockCard.background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#EB141418"), Color.parseColor("#F508080A"))
            ).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(dp(1), VoidThemeStore.withAlpha(accent, 90))
            }
            pixelClockRim.visibility = View.VISIBLE
            pixelClockRim.background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(Color.TRANSPARENT, VoidThemeStore.withAlpha(accent, 196), Color.TRANSPARENT)
            )

            val classicTimerStrokePx = maxOf(dp(1), (1.5f * resources.displayMetrics.density).toInt())
            pixelTimerCard.background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#EB141418"), Color.parseColor("#F508080A"))
            ).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(classicTimerStrokePx, VoidThemeStore.withAlpha(accent, 120))
            }
            pixelTimerRim.visibility = View.VISIBLE
            pixelTimerRim.background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(
                    Color.TRANSPARENT,
                    VoidThemeStore.withAlpha(accent, 210),
                    Color.TRANSPARENT
                )
            )

            bagContainer.background = GradientDrawable(
                GradientDrawable.Orientation.TOP_BOTTOM,
                intArrayOf(Color.parseColor("#EF101014"), Color.parseColor("#FA08080A"))
            ).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(dp(1), VoidThemeStore.withAlpha(accent, 74))
            }

            statusDot.background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(accent)
            }

            textVoidActive.typeface = Typeface.MONOSPACE
            textClockHeader.typeface = Typeface.MONOSPACE
            textSessionTag.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSessionTag.letterSpacing = 0.2f
            textSessionTag.setTextColor(accent)
            textQuote.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.ITALIC)
            btnDeployParachute.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            btnEmergencyCall.typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            btnEmergencyCall.background = createRoundedButtonBg(
                fillColors = intArrayOf(Color.parseColor("#18181C"), Color.parseColor("#111114")),
                strokeColor = Color.parseColor("#1FFFFFFF"),
                rippleColor = Color.parseColor("#33FFFFFF"),
                radiusDp = 14
            )
        }

        pixelClockView.setBespokeMinimalist(isBespokeStyle)
        pixelClockView.setAccentTheme(accent)

        pixelTimerView.setBespokeMinimalist(isBespokeStyle)
        pixelTimerView.setInvertedPolarity(false)
        pixelTimerView.setAccentTheme(accent)

        updateWorkBagLayoutMode()
        updateParachuteStatus()
    }

    private fun createRoundedButtonBg(
        fillColors: IntArray,
        strokeColor: Int?,
        rippleColor: Int,
        radiusDp: Int
    ): Drawable {
        val shape = GradientDrawable(GradientDrawable.Orientation.TL_BR, fillColors).apply {
            cornerRadius = dp(radiusDp).toFloat()
            if (strokeColor != null) {
                setStroke(dp(1), strokeColor)
            }
        }
        return RippleDrawable(ColorStateList.valueOf(rippleColor), shape, null)
    }

    private fun populateBagSection() {
        bagContainer.removeAllViews()
        val bagName = bagStore.getActiveBagName().uppercase(Locale.US)
        val allowSms = bagStore.isSmsAllowed()
        val apps = bagStore.getBagApps()
        val engageConfig = try { EngageConfigStore(this).loadActiveConfig() } catch (_: Exception) { null }
        val visibleApps = apps.filter { app ->
            engageConfig?.appConfigs?.get(app.packageName)?.mode != EngageConfig.AccessMode.HARD_BLOCK
        }
        val accent = resolveReadableAccent()

        bagContainer.setPadding(dp(12), dp(10), dp(12), dp(10))

        // Mini Header Strip
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(6) }
        }

        val totalAllowedCount = visibleApps.size + 1 + (if (allowSms) 1 else 0)
        val headerLeft = TextView(this).apply {
            text = "ALLOWED TOOLS // $bagName ($totalAllowedCount APPS)"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 9.5f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = 0.12f
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val headerRight = TextView(this).apply {
            text = if (visibleApps.isEmpty()) "Monk Mode" else "Allowed Dock"
            setTextColor(accent)
            textSize = 9.5f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = 0.08f
        }

        headerRow.addView(headerLeft)
        headerRow.addView(headerRight)
        bagContainer.addView(headerRow)

        // Horizontal Scroll for Icons Dock
        val scroll = HorizontalScrollView(this).apply {
            isHorizontalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val iconsRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.WRAP_CONTENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // Compulsory Phone Dialer
        iconsRow.addView(
            createBagAppDockIcon(
                title = "Phone",
                brandColor = accent,
                iconDrawable = null,
                fallbackVectorResId = android.R.drawable.stat_sys_phone_call,
                useThemeTileTint = true,
                onClick = {
                    val pkg = bagStore.getPrimaryDialerPackage()
                    if (pkg != null) {
                        launchAllowedBagPackage(
                            pkg,
                            fallbackIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:"))
                        )
                    } else {
                        bagLaunchGraceUntilElapsed = SystemClock.elapsedRealtime() + 3_000L
                        startActivity(Intent(Intent.ACTION_DIAL, Uri.parse("tel:")))
                    }
                }
            )
        )

        // Optional SMS
        if (allowSms) {
            iconsRow.addView(
                createBagAppDockIcon(
                    title = "Messages",
                    brandColor = accent,
                    iconDrawable = null,
                    fallbackVectorResId = android.R.drawable.sym_action_chat,
                    useThemeTileTint = true,
                    onClick = {
                        val pkg = bagStore.getPrimarySmsPackage()
                        if (pkg != null) {
                            launchAllowedBagPackage(
                                pkg,
                                fallbackIntent = Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:"))
                            )
                        } else {
                            bagLaunchGraceUntilElapsed = SystemClock.elapsedRealtime() + 3_000L
                            startActivity(Intent(Intent.ACTION_SENDTO, Uri.parse("smsto:")))
                        }
                    }
                )
            )
        }

        // Packed Bag Apps
        for (app in visibleApps) {
            val iconDrawable = loadAppIconSafe(app.packageName)
            val brandColor = VoidBrandPalette.extractBrandColorFromDrawable(
                drawable = iconDrawable,
                packageName = app.packageName,
                appName = app.appName,
                category = "custom",
                fallbackHex = accentConfig.accentHex
            )
            iconsRow.addView(
                createBagAppDockIcon(
                    title = app.appName,
                    brandColor = brandColor,
                    iconDrawable = iconDrawable,
                    onClick = { launchAllowedBagPackage(app.packageName, null) }
                )
            )
        }

        scroll.addView(iconsRow)
        bagContainer.addView(scroll)
    }

    private fun loadAppIconSafe(packageName: String): Drawable? {
        return try {
            packageManager.getApplicationIcon(packageName)
        } catch (_: Exception) {
            null
        }
    }

    private fun createBagAppDockIcon(
        title: String,
        brandColor: Int,
        iconDrawable: Drawable?,
        fallbackVectorResId: Int? = null,
        useThemeTileTint: Boolean = false,
        onClick: () -> Unit
    ): View {
        val accent = resolveReadableAccent()
        val itemCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER_HORIZONTAL
            isClickable = true
            isFocusable = true
            setPadding(dp(4), dp(4), dp(4), dp(4))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply {
                marginEnd = dp(6)
            }
            setOnClickListener { onClick() }
        }

        val tileSize = dp(46)
        val tileCornerDp = if (isBespokeStyle) 8 else 12
        val tileFillColor = if (useThemeTileTint) VoidThemeStore.withAlpha(accent, 36) else Color.parseColor("#1C1C22")
        val tileStrokeColor = if (useThemeTileTint) {
            VoidThemeStore.withAlpha(accent, 90)
        } else {
            Color.parseColor(if (isBespokeStyle) "#2A2A2A" else "#20FFFFFF")
        }

        val iconTile = FrameLayout(this).apply {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, dp(tileCornerDp).toFloat())
                }
            }
            background = GradientDrawable().apply {
                cornerRadius = dp(tileCornerDp).toFloat()
                setColor(tileFillColor)
                setStroke(dp(1), tileStrokeColor)
            }
            layoutParams = LinearLayout.LayoutParams(tileSize, tileSize)
        }

        if (iconDrawable != null) {
            val iv = ImageView(this).apply {
                setImageDrawable(iconDrawable)
                scaleType = ImageView.ScaleType.FIT_CENTER
                setPadding(dp(5), dp(5), dp(5), dp(5))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(iv)
        } else if (fallbackVectorResId != null) {
            val iv = ImageView(this).apply {
                setImageResource(fallbackVectorResId)
                setColorFilter(if (useThemeTileTint) accent else Color.WHITE)
                scaleType = ImageView.ScaleType.FIT_CENTER
                setPadding(dp(10), dp(10), dp(10), dp(10))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(iv)
        } else {
            val tvInitial = TextView(this).apply {
                text = title.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "A"
                setTextColor(accent)
                textSize = 16f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(tvInitial)
        }

        val tvLabel = TextView(this).apply {
            text = title
            setTextColor(Color.parseColor("#E4E4E7"))
            textSize = 10f
            typeface = if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.DEFAULT
            gravity = Gravity.CENTER
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(dp(54), LinearLayout.LayoutParams.WRAP_CONTENT).apply {
                topMargin = dp(4)
            }
        }

        itemCol.addView(iconTile)
        itemCol.addView(tvLabel)
        return itemCol
    }

    private fun launchAllowedBagPackage(targetPackage: String, fallbackIntent: Intent?) {
        if (!bagStore.isPackageAllowedDuringLock(targetPackage)) {
            Toast.makeText(this, "App not permitted in your active Bag.", Toast.LENGTH_SHORT).show()
            return
        }

        val isVideoApp = targetPackage.contains("youtube") || targetPackage.contains("morphe")
        if (isVideoApp) {
            val input = EditText(this).apply {
                hint = "Type: I am productive."
                setSingleLine(true)
                setTextColor(Color.WHITE)
                setHintTextColor(Color.parseColor("#71717A"))
                setPadding(dp(16), dp(12), dp(16), dp(12))
                background = GradientDrawable().apply {
                    cornerRadius = dp(8).toFloat()
                    setColor(Color.parseColor("#18181B"))
                    setStroke(dp(1), Color.parseColor("#3F3F46"))
                }
            }
            val container = FrameLayout(this).apply {
                setPadding(dp(20), dp(10), dp(20), dp(4))
                addView(input)
            }
            AlertDialog.Builder(this)
                .setTitle("Productive Focus Check")
                .setMessage("To open YouTube Morph during a focus session, confirm your productive study intention by typing:\n\n\"I am productive.\"")
                .setView(container)
                .setPositiveButton("Proceed") { _, _ ->
                    val text = input.text.toString().trim()
                    if (text.equals("I am productive.", ignoreCase = true) ||
                        text.equals("I am productive", ignoreCase = true)) {
                        proceedWithAppLaunch(targetPackage, fallbackIntent)
                    } else {
                        Toast.makeText(this, "Incorrect phrase. Focus protected.", Toast.LENGTH_SHORT).show()
                    }
                }
                .setNegativeButton("Cancel & Focus", null)
                .show()
            return
        }

        proceedWithAppLaunch(targetPackage, fallbackIntent)
    }

    private fun proceedWithAppLaunch(targetPackage: String, fallbackIntent: Intent?) {
        activeBagPackage = targetPackage
        bagLaunchGraceUntilElapsed = SystemClock.elapsedRealtime() + 3_500L
        try {
            val launch = packageManager.getLaunchIntentForPackage(targetPackage)
                ?: if (targetPackage.contains("morphe")) {
                    packageManager.getLaunchIntentForPackage("com.google.android.youtube")
                } else null
                ?: fallbackIntent

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
            Toast.makeText(this, "0 Escape Tickets available. Earn 1 per 20 cumulative hours.", Toast.LENGTH_LONG).show()
            return
        }

        val input = EditText(this).apply {
            hint = "Why am I breaking this session for myself?"
            setTextColor(Color.WHITE)
            setHintTextColor(Color.parseColor("#71717A"))
            setPadding(dp(16), dp(12), dp(16), dp(12))
            background = GradientDrawable().apply {
                cornerRadius = dp(8).toFloat()
                setColor(Color.parseColor("#18181B"))
                setStroke(dp(1), Color.parseColor("#3F3F46"))
            }
        }
        val note = TextView(this).apply {
            text = "Your answer is not saved anywhere. It serves only as a mindful mirror."
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 10f
            setPadding(dp(4), dp(8), dp(4), 0)
        }
        val container = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(10), dp(20), dp(4))
            addView(input)
            addView(note)
        }

        AlertDialog.Builder(this)
            .setTitle("Why am I breaking this session?")
            .setMessage("You have $balance Emergency Escape Ticket(s).\n\nABORTED SESSION PENALTY: All elapsed focus time in this session will be permanently voided.")
            .setView(container)
            .setPositiveButton("Break Session (-1 Ticket)") { _, _ ->
                val reason = input.text.toString().trim()
                if (reason.isEmpty()) {
                    Toast.makeText(this, "A reflection is required before breaking.", Toast.LENGTH_SHORT).show()
                    return@setPositiveButton
                }
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
        textParachuteBalance.text = "$balance Escape Ticket(s) Available"
        btnDeployParachute.isEnabled = (balance > 0)
        btnDeployParachute.alpha = if (balance > 0) 1.0f else 0.42f

        if (isBespokeStyle) {
            if (balance > 0) {
                val primaryBlue = Color.parseColor("#2563EB")
                btnDeployParachute.setTextColor(Color.WHITE)
                btnDeployParachute.background = createRoundedButtonBg(
                    fillColors = intArrayOf(primaryBlue, primaryBlue),
                    strokeColor = Color.parseColor("#3B82F6"),
                    rippleColor = Color.parseColor("#44FFFFFF"),
                    radiusDp = 6
                )
            } else {
                btnDeployParachute.setTextColor(Color.parseColor("#A3A3A3"))
                btnDeployParachute.background = createRoundedButtonBg(
                    fillColors = intArrayOf(Color.parseColor("#0A0A0A"), Color.parseColor("#0A0A0A")),
                    strokeColor = Color.parseColor("#262626"),
                    rippleColor = Color.parseColor("#22FFFFFF"),
                    radiusDp = 6
                )
            }
            return
        }

        val accent = resolveReadableAccent()
        if (balance > 0) {
            val topStop = VoidThemeStore.lightenColor(accent, 0.16f)
            val botStop = VoidThemeStore.darkenColor(accent, 0.18f)
            val buttonTextColor = if (VoidThemeStore.relativeLuminance(accent) >= 0.40) {
                Color.parseColor("#09090B")
            } else {
                Color.WHITE
            }
            btnDeployParachute.setTextColor(buttonTextColor)
            btnDeployParachute.background = createRoundedButtonBg(
                fillColors = intArrayOf(topStop, botStop),
                strokeColor = VoidThemeStore.withAlpha(Color.WHITE, 46),
                rippleColor = Color.parseColor("#44FFFFFF"),
                radiusDp = 14
            )
        } else {
            btnDeployParachute.setTextColor(Color.parseColor("#A1A1AA"))
            btnDeployParachute.background = createRoundedButtonBg(
                fillColors = intArrayOf(Color.parseColor("#18181C"), Color.parseColor("#121215")),
                strokeColor = Color.parseColor("#1AFFFFFF"),
                rippleColor = Color.parseColor("#22FFFFFF"),
                radiusDp = 14
            )
        }
    }

    private fun refreshBatteryDisplay() {
        val bm = getSystemService(Context.BATTERY_SERVICE) as? BatteryManager
        val batteryPct = bm?.getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) ?: 100
        textBattery.text = "$batteryPct%"
    }

    private fun formatHms(totalSec: Long): String {
        val safeSec = maxOf(0L, totalSec)
        val hours = safeSec / 3600L
        val minutes = (safeSec % 3600L) / 60L
        val seconds = safeSec % 60L
        return String.format(Locale.US, "%02d:%02d:%02d", hours, minutes, seconds)
    }

    private fun startTickers() {
        countDownTimer?.cancel()
        val timing = lockEngine.getCurrentTiming()
        if (!timing.isLocked) {
            isInForeground = false
            activeBagPackage = null
            try { stopLockTask() } catch (_: Exception) {}
            finish()
            return
        }
        if (timing.isExpired) {
            isInForeground = false
            activeBagPackage = null
            lockEngine.completeSession()
            try { stopLockTask() } catch (_: Exception) {}
            Toast.makeText(this@TheVoidActivity, "Lock Completed. Focus Reclaimed!", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        val remainingMillis = maxOf(1L, timing.remainingMillis)

        countDownTimer = object : CountDownTimer(remainingMillis, 1000L) {
            override fun onTick(millisUntilFinished: Long) {
                val live = lockEngine.getCurrentTiming()
                if (!live.isLocked) {
                    cancel()
                    isInForeground = false
                    activeBagPackage = null
                    try { stopLockTask() } catch (_: Exception) {}
                    finish()
                    return
                }
                val remainingText = formatHms(live.remainingMillis / 1000L)
                pixelTimerView.setClockTime(remainingText)
                pixelTimerView.contentDescription = "Remaining lock time $remainingText"

                val formattedClock = SimpleDateFormat("h:mm a", Locale.US).format(Date())
                textCurrentTime.text = formattedClock.lowercase(Locale.US)
                pixelClockView.setClockTime(formattedClock.uppercase(Locale.US))

                refreshBatteryDisplay()
            }

            override fun onFinish() {
                val finalTiming = lockEngine.getCurrentTiming()
                if (finalTiming.isLocked && !finalTiming.isExpired && finalTiming.remainingMillis > 0L) {
                    // Never finish early: reschedule against Android's monotonic SystemClock.elapsedRealtime()
                    startTickers()
                    return
                }
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
        val timing = lockEngine.refreshAndCompleteIfExpired()
        if (!timing.isLocked) {
            isInForeground = false
            try { stopLockTask() } catch (_: Exception) {}
            finish()
            return
        }
        applyAccentThemeVisuals()
        populateBagSection()
        val nowClock = SimpleDateFormat("h:mm a", Locale.US).format(Date())
        textCurrentTime.text = nowClock.lowercase(Locale.US)
        pixelClockView.setClockTime(nowClock.uppercase(Locale.US))
        val resumedRemainingText = formatHms(timing.remainingMillis / 1000L)
        pixelTimerView.setClockTime(resumedRemainingText)
        pixelTimerView.contentDescription = "Remaining lock time $resumedRemainingText"
        refreshBatteryDisplay()
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
        restoreRingerMode()
        super.onDestroy()
    }
}
