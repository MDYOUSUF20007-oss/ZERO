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
import android.widget.FrameLayout
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
    private lateinit var centerBagSlot: FrameLayout
    private lateinit var workSpotlightBox: LinearLayout
    private lateinit var textWorkEyebrow: TextView
    private lateinit var textWorkHashtag: TextView
    private lateinit var bottomBagScroll: MaxHeightScrollView
    private lateinit var bottomBagSlot: FrameLayout

    private lateinit var pixelClockCard: FrameLayout
    private lateinit var pixelClockRim: View
    private lateinit var pixelClockView: PixelClockView

    private lateinit var pixelTimerCard: FrameLayout
    private lateinit var pixelTimerRim: View
    private lateinit var pixelTimerView: PixelClockView

    private class MaxHeightScrollView(
        context: Context,
        private val maxHeightPx: Int
    ) : ScrollView(context) {
        override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
            val boundedSpec = MeasureSpec.makeMeasureSpec(maxHeightPx, MeasureSpec.AT_MOST)
            super.onMeasure(widthMeasureSpec, boundedSpec)
        }
    }

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
            setInvertedPolarity(true)
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

        textQuote = TextView(this).apply {
            text = "\"The obstacle is the way. Stay phone-free.\""
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 11.5f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.ITALIC
            )
            gravity = Gravity.CENTER
            setPadding(0, dp(2), 0, dp(20))
        }

        // Work Bag Center Hero Hashtag Spotlight (Larger than Clock & Countdown Timer)
        workSpotlightBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            minimumHeight = dp(136)
            setPadding(dp(8), dp(10), dp(8), dp(10))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                0,
                1f
            )
            visibility = View.GONE
        }

        textWorkEyebrow = TextView(this).apply {
            text = "WORK BAG MISSION"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 10f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = 0.24f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(6))
        }

        textWorkHashtag = TextView(this).apply {
            text = "#DEEP WORK"
            isAllCaps = true
            setTextColor(resolveReadableAccent())
            textSize = 50f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = -0.02f
            maxLines = 2
            setLineSpacing(0f, 1.02f)
            gravity = Gravity.CENTER
        }

        workSpotlightBox.addView(textWorkEyebrow)
        workSpotlightBox.addView(textWorkHashtag)

        centerBagSlot = FrameLayout(this).apply {
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 3. BAG CARD (Relocated to Bottom Dock when Work Bag is active)
        bagContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        centerBox.addView(pixelClockCard)
        centerBox.addView(pixelTimerCard)
        centerBox.addView(workSpotlightBox)
        centerBox.addView(textQuote)
        centerBagSlot.addView(bagContainer)
        centerBox.addView(centerBagSlot)
        centerScroll.addView(centerBox)
        root.addView(centerScroll)

        // Bottom Controls
        val bottomBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val maxBagScrollPx = (resources.displayMetrics.heightPixels * 0.27f)
            .toInt()
            .coerceAtLeast(dp(140))
        bottomBagScroll = MaxHeightScrollView(this, maxBagScrollPx).apply {
            isVerticalScrollBarEnabled = false
            overScrollMode = View.OVER_SCROLL_NEVER
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(4) }
            visibility = View.GONE
        }
        bottomBagSlot = FrameLayout(this).apply {
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }
        bottomBagScroll.addView(bottomBagSlot)
        bottomBox.addView(bottomBagScroll)

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
            textSessionTag.text = "WORK BAG COUNTDOWN"

            val tagDisplay = "#${rawTag.uppercase(Locale.US)}"
            val tagSp = when {
                tagDisplay.length <= 12 -> 50f
                tagDisplay.length <= 18 -> 40f
                else -> 32f
            }
            textWorkHashtag.text = tagDisplay
            textWorkHashtag.textSize = tagSp
            textWorkHashtag.setTextColor(readableAccent)
            textWorkHashtag.typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            textWorkEyebrow.typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )

            workSpotlightBox.visibility = View.VISIBLE
            centerBox.gravity = Gravity.CENTER_HORIZONTAL or Gravity.TOP

            textQuote.setPadding(dp(8), dp(10), dp(8), dp(4))
            if (textQuote.parent !== workSpotlightBox) {
                (textQuote.parent as? ViewGroup)?.removeView(textQuote)
                workSpotlightBox.addView(textQuote)
            }

            if (bagContainer.parent !== bottomBagSlot) {
                (bagContainer.parent as? ViewGroup)?.removeView(bagContainer)
                bottomBagSlot.addView(
                    bagContainer,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    )
                )
            }
            centerBagSlot.visibility = View.GONE
            bottomBagScroll.visibility = View.VISIBLE
        } else {
            textSessionTag.text = "LOCKED IN #${rawTag.uppercase(Locale.US)}"
            workSpotlightBox.visibility = View.GONE
            centerBox.gravity = Gravity.CENTER

            textQuote.setPadding(0, dp(2), 0, dp(20))
            if (textQuote.parent !== centerBox) {
                (textQuote.parent as? ViewGroup)?.removeView(textQuote)
                val bagSlotIndex = centerBox.indexOfChild(centerBagSlot)
                if (bagSlotIndex >= 0) {
                    centerBox.addView(textQuote, bagSlotIndex)
                } else {
                    centerBox.addView(textQuote)
                }
            }

            if (bagContainer.parent !== centerBagSlot) {
                (bagContainer.parent as? ViewGroup)?.removeView(bagContainer)
                centerBagSlot.addView(
                    bagContainer,
                    FrameLayout.LayoutParams(
                        FrameLayout.LayoutParams.MATCH_PARENT,
                        FrameLayout.LayoutParams.WRAP_CONTENT
                    )
                )
            }
            bottomBagScroll.visibility = View.GONE
            centerBagSlot.visibility = View.VISIBLE
        }
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
                setColor(Color.parseColor("#FAFAFA"))
                setStroke(dp(1), Color.parseColor("#D4D4D8"))
            }
            pixelTimerRim.visibility = View.GONE

            bagContainer.background = GradientDrawable().apply {
                cornerRadius = dp(6).toFloat()
                setColor(Color.BLACK)
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
            textSessionTag.setTextColor(Color.parseColor("#1D4ED8"))
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
                intArrayOf(Color.parseColor("#FFFFFF"), Color.parseColor("#F4F4F5"))
            ).apply {
                cornerRadius = dp(16).toFloat()
                setStroke(classicTimerStrokePx, VoidThemeStore.withAlpha(VoidThemeStore.darkenColor(accent, 0.15f), 220))
            }
            pixelTimerRim.visibility = View.VISIBLE
            pixelTimerRim.background = GradientDrawable(
                GradientDrawable.Orientation.LEFT_RIGHT,
                intArrayOf(
                    Color.TRANSPARENT,
                    VoidThemeStore.withAlpha(VoidThemeStore.darkenColor(accent, 0.25f), 210),
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
            textSessionTag.setTextColor(VoidThemeStore.darkenColor(accentConfig.accentColor, 0.65f))
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
        pixelTimerView.setInvertedPolarity(true)
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
        val workBagActive = bagStore.isWorkBagActive()
        val accent = resolveReadableAccent()

        bagContainer.setPadding(
            dp(if (workBagActive) 14 else 16),
            dp(if (workBagActive) 11 else 14),
            dp(if (workBagActive) 14 else 16),
            dp(if (workBagActive) 11 else 14)
        )

        // Header Strip: BAG: WORK BAG (X/3 APPS)  |  Monk Mode Active / Allowed Apps
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(if (workBagActive) 8 else 12) }
        }

        val headerLeft = TextView(this).apply {
            text = "BAG: $bagName (${apps.size}/3 APPS)"
            setTextColor(Color.parseColor("#D4D4D8"))
            textSize = 11f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = 0.08f
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val headerRight = TextView(this).apply {
            text = if (apps.isEmpty()) "Monk Mode Active" else "Allowed Apps"
            setTextColor(accent)
            textSize = 10f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
        }

        headerRow.addView(headerLeft)
        headerRow.addView(headerRight)
        bagContainer.addView(headerRow)

        val rowsStack = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        if (apps.isEmpty()) {
            // Tactical Empty-State Card
            val emptyNotice = TextView(this).apply {
                text = if (allowSms) {
                    "Monk Mode: Empty Bag. Unbagged distraction apps are sealed."
                } else {
                    "Monk Mode: Empty Bag. All normal apps & texts are sealed."
                }
                setTextColor(Color.parseColor("#D4D4D8"))
                textSize = 11.5f
                typeface = if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE
                setLineSpacing(dp(3).toFloat(), 1f)
                setPadding(dp(14), dp(11), dp(14), dp(11))
                background = GradientDrawable().apply {
                    cornerRadius = dp(if (isBespokeStyle) 6 else 12).toFloat()
                    setColor(Color.parseColor(if (isBespokeStyle) "#0A0A0A" else "#D909090C"))
                    setStroke(
                        dp(1),
                        if (isBespokeStyle) Color.parseColor("#262626") else VoidThemeStore.withAlpha(accent, 66)
                    )
                }
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(8) }
            }
            rowsStack.addView(emptyNotice)
        } else {
            // Packed Bag App Vertical Rows matching each app's brand color
            for (app in apps) {
                val iconDrawable = loadAppIconSafe(app.packageName)
                val brandColor = VoidBrandPalette.extractBrandColorFromDrawable(
                    drawable = iconDrawable,
                    packageName = app.packageName,
                    appName = app.appName,
                    category = "custom",
                    fallbackHex = accentConfig.accentHex
                )
                val row = createBagAppRow(
                    title = app.appName,
                    subtitle = app.packageName,
                    badgeLabel = "ALLOWED",
                    brandColor = brandColor,
                    iconDrawable = iconDrawable,
                    onClick = { launchAllowedBagPackage(app.packageName, null) }
                )
                rowsStack.addView(row)
            }
        }

        // Compulsory Phone Calls row — always available even in an empty Monk Mode Bag (theme-matched accent, zero green)
        rowsStack.addView(
            createBagAppRow(
                title = "Phone Calls",
                subtitle = "Compulsory Dialer • Always ON",
                badgeLabel = "ALWAYS ON",
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

        // Optional Normal SMS row if enabled for the Bag (theme-matched accent)
        if (allowSms) {
            rowsStack.addView(
                createBagAppRow(
                    title = "Messages",
                    subtitle = "Normal Texts (SMS)",
                    badgeLabel = "ALLOWED",
                    brandColor = accent,
                    iconDrawable = null,
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

        // Trim extra bottom margin on final row for balanced card padding
        if (rowsStack.childCount > 0) {
            val lastChild = rowsStack.getChildAt(rowsStack.childCount - 1)
            (lastChild.layoutParams as? LinearLayout.LayoutParams)?.bottomMargin = 0
        }

        bagContainer.addView(rowsStack)
    }

    private fun loadAppIconSafe(packageName: String): Drawable? {
        return try {
            packageManager.getApplicationIcon(packageName)
        } catch (_: Exception) {
            null
        }
    }

    private fun createBagAppRow(
        title: String,
        subtitle: String,
        badgeLabel: String,
        brandColor: Int,
        iconDrawable: Drawable?,
        fallbackVectorResId: Int? = null,
        useThemeTileTint: Boolean = false,
        onClick: () -> Unit
    ): View {
        val accent = resolveReadableAccent()
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            isClickable = true
            isFocusable = true
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = if (isBespokeStyle) {
                createRoundedButtonBg(
                    fillColors = intArrayOf(Color.parseColor("#0A0A0A"), Color.parseColor("#0A0A0A")),
                    strokeColor = Color.parseColor("#262626"),
                    rippleColor = Color.parseColor("#26FFFFFF"),
                    radiusDp = 6
                )
            } else {
                createRoundedButtonBg(
                    fillColors = intArrayOf(Color.parseColor("#CC18181C"), Color.parseColor("#CC141418")),
                    strokeColor = Color.parseColor("#14FFFFFF"),
                    rippleColor = VoidThemeStore.withAlpha(accent, 64),
                    radiusDp = 12
                )
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
            setOnClickListener { onClick() }
        }

        // App Icon Tile
        val tileSize = dp(38)
        val tileCornerDp = if (isBespokeStyle) 6 else 11
        val tileFillColor = if (useThemeTileTint) VoidThemeStore.withAlpha(accent, 36) else brandColor
        val tileStrokeColor = if (useThemeTileTint) {
            VoidThemeStore.withAlpha(accent, 92)
        } else {
            Color.parseColor(if (isBespokeStyle) "#262626" else "#33FFFFFF")
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
            layoutParams = LinearLayout.LayoutParams(tileSize, tileSize).apply {
                marginEnd = dp(12)
            }
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
                setPadding(dp(9), dp(9), dp(9), dp(9))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(iv)
        } else {
            val txtColor = if (useThemeTileTint) {
                accent
            } else {
                val hexBg = String.format(Locale.US, "#%06X", 0xFFFFFF and brandColor)
                VoidThemeStore.parseHexColorSafe(
                    VoidBrandPalette.contrastTextHexForBg(hexBg),
                    Color.WHITE
                )
            }
            val tvInitial = TextView(this).apply {
                text = title.trim().firstOrNull()?.uppercaseChar()?.toString() ?: "A"
                setTextColor(txtColor)
                textSize = 15f
                typeface = Typeface.create(Typeface.DEFAULT, Typeface.BOLD)
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(tvInitial)
        }

        // Middle Column: App Name & Package Subtitle
        val textCol = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f).apply {
                marginEnd = dp(10)
            }
        }

        val tvTitle = TextView(this).apply {
            text = title
            setTextColor(Color.WHITE)
            textSize = 13f
            typeface = Typeface.create(Typeface.SANS_SERIF, Typeface.BOLD)
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
        }

        val tvSub = TextView(this).apply {
            text = subtitle
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            setPadding(0, dp(1), 0, 0)
        }

        textCol.addView(tvTitle)
        textCol.addView(tvSub)

        // Right Status Tag ("ALLOWED" / "ALWAYS ON") — strictly matched to active Theme Accent
        val badgeTextColor = if (isBespokeStyle) Color.parseColor("#60A5FA") else accent
        val badgeView = TextView(this).apply {
            text = badgeLabel
            setTextColor(badgeTextColor)
            textSize = 9f
            typeface = Typeface.create(
                if (isBespokeStyle) Typeface.SANS_SERIF else Typeface.MONOSPACE,
                Typeface.BOLD
            )
            letterSpacing = 0.05f
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = GradientDrawable().apply {
                cornerRadius = dp(if (isBespokeStyle) 4 else 6).toFloat()
                setColor(VoidThemeStore.withAlpha(accent, 36))
                setStroke(dp(1), VoidThemeStore.withAlpha(accent, 90))
            }
        }

        row.addView(iconTile)
        row.addView(textCol)
        row.addView(badgeView)
        return row
    }

    private fun launchAllowedBagPackage(targetPackage: String, fallbackIntent: Intent?) {
        if (!bagStore.isPackageAllowedDuringLock(targetPackage)) {
            Toast.makeText(this, "App not permitted in your active Bag.", Toast.LENGTH_SHORT).show()
            return
        }
        activeBagPackage = targetPackage
        bagLaunchGraceUntilElapsed = SystemClock.elapsedRealtime() + 3_500L
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
            Toast.makeText(this, "0 Escape Tickets available. Earn 1 per 20 cumulative hours.", Toast.LENGTH_LONG).show()
            return
        }

        AlertDialog.Builder(this)
            .setTitle("Use Emergency Escape Ticket?")
            .setMessage("You have $balance Emergency Escape Ticket(s).\n\nUsing 1 ticket consumes it and terminates the lock.\n\nABORTED SESSION PENALTY: All elapsed time in this session is VOIDED and will NOT count toward your next 20h Escape Ticket.")
            .setPositiveButton("Use (-1 Escape Ticket)") { _, _ ->
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
        super.onDestroy()
    }
}
