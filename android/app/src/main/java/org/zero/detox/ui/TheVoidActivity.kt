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

    private lateinit var textRemainingTime: TextView
    private lateinit var textCurrentTime: TextView
    private lateinit var textBattery: TextView
    private lateinit var textSessionTag: TextView
    private lateinit var btnEmergencyCall: Button
    private lateinit var btnDeployParachute: Button
    private lateinit var textParachuteBalance: TextView
    private lateinit var bagContainer: LinearLayout

    private lateinit var pixelClockCard: FrameLayout
    private lateinit var pixelClockRim: View
    private lateinit var pixelClockView: PixelClockView

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

        val statusDot = View(this).apply {
            val dotSize = dp(6)
            layoutParams = LinearLayout.LayoutParams(dotSize, dotSize).apply {
                marginEnd = dp(6)
            }
            background = GradientDrawable().apply {
                shape = GradientDrawable.OVAL
                setColor(Color.parseColor("#10B981"))
            }
        }

        val textVoidActive = TextView(this).apply {
            text = "VOID ACTIVE"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
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

        val centerBox = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(0, dp(8), 0, dp(12))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        // 1. PIXELATED GRADIENT CLOCK CONTAINER (Directly Above Countdown Timer)
        pixelClockCard = FrameLayout(this).apply {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, dp(16).toFloat())
                }
            }
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(20) }
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
            setPadding(dp(16), dp(12), dp(16), dp(14))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val textClockHeader = TextView(this).apply {
            text = "SYSTEM TIME // SYNCED"
            setTextColor(Color.parseColor("#A1A1AA"))
            textSize = 9.5f
            typeface = Typeface.MONOSPACE
            letterSpacing = 0.22f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }

        pixelClockView = PixelClockView(this).apply {
            setClockTime(initialTimeUpper)
            setAccentTheme(accentConfig.accentColor)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.WRAP_CONTENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        clockInner.addView(textClockHeader)
        clockInner.addView(pixelClockView)
        pixelClockCard.addView(clockInner)
        pixelClockCard.addView(pixelClockRim)

        // Lock Subtitle & Countdown Timer
        textSessionTag = TextView(this).apply {
            val prefs = getSharedPreferences(LockEngine.PREFS_NAME, Context.MODE_PRIVATE)
            val tag = prefs.getString(LockEngine.KEY_SESSION_TAG, "Deep Work") ?: "Deep Work"
            text = "LOCKED IN #$tag"
            setTextColor(accentConfig.accentColor)
            textSize = 12.5f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            letterSpacing = 0.14f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }

        val initialRemaining = maxOf(0L, lockEngine.getCurrentTiming().remainingSeconds)
        textRemainingTime = TextView(this).apply {
            text = formatHms(initialRemaining)
            setTextColor(Color.WHITE)
            textSize = 48f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            letterSpacing = -0.02f
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(8))
        }

        val textQuote = TextView(this).apply {
            text = "\"The obstacle is the way. Stay phone-free.\""
            setTextColor(Color.parseColor("#9CA3AF"))
            textSize = 11.5f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.ITALIC)
            gravity = Gravity.CENTER
            setPadding(0, 0, 0, dp(22))
        }

        // 2. WHATSAPP-STYLE BAG CARD (Replacing Plain Square Tiles)
        bagContainer = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(14), dp(16), dp(14))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        centerBox.addView(pixelClockCard)
        centerBox.addView(textSessionTag)
        centerBox.addView(textRemainingTime)
        centerBox.addView(textQuote)
        centerBox.addView(bagContainer)
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
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
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
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            textSize = 12f
            letterSpacing = 0.06f
            stateListAnimator = null
            setPadding(dp(16), dp(14), dp(16), dp(14))
            background = createRoundedButtonBg(
                fillColors = intArrayOf(Color.parseColor("#18181C"), Color.parseColor("#111114")),
                strokeColor = Color.parseColor("#1FFFFFFF"),
                rippleColor = Color.parseColor("#33FFFFFF"),
                radiusDp = 14
            )
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

    private fun applyAccentThemeVisuals() {
        accentConfig = VoidThemeStore.loadAccent(this)
        val accent = accentConfig.accentColor

        pixelClockCard.background = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(Color.parseColor("#EB141418"), Color.parseColor("#F508080A"))
        ).apply {
            cornerRadius = dp(16).toFloat()
            setStroke(dp(1), VoidThemeStore.withAlpha(accent, 90))
        }

        pixelClockRim.background = GradientDrawable(
            GradientDrawable.Orientation.LEFT_RIGHT,
            intArrayOf(Color.TRANSPARENT, VoidThemeStore.withAlpha(accent, 196), Color.TRANSPARENT)
        )

        pixelClockView.setAccentTheme(accent)
        textSessionTag.setTextColor(accent)

        bagContainer.background = GradientDrawable(
            GradientDrawable.Orientation.TOP_BOTTOM,
            intArrayOf(Color.parseColor("#EF101014"), Color.parseColor("#FA08080A"))
        ).apply {
            cornerRadius = dp(16).toFloat()
            setStroke(dp(1), VoidThemeStore.withAlpha(accent, 74))
        }

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
        val accent = accentConfig.accentColor

        // Header Strip: BAG: WORK BAG (X/3 APPS)  |  Monk Mode Active / Allowed Apps
        val headerRow = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }

        val headerLeft = TextView(this).apply {
            text = "BAG: $bagName (${apps.size}/3 APPS)"
            setTextColor(Color.parseColor("#D4D4D8"))
            textSize = 11f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            letterSpacing = 0.08f
            maxLines = 1
            ellipsize = TextUtils.TruncateAt.END
            layoutParams = LinearLayout.LayoutParams(0, LinearLayout.LayoutParams.WRAP_CONTENT, 1f)
        }

        val headerRight = TextView(this).apply {
            text = if (apps.isEmpty()) "Monk Mode Active" else "Allowed Apps"
            setTextColor(if (apps.isEmpty()) accent else Color.parseColor("#34D399"))
            textSize = 10f
            typeface = Typeface.MONOSPACE
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
            // Tactical Empty-State Card with subtle accent glow
            val emptyNotice = TextView(this).apply {
                text = if (allowSms) {
                    "Monk Mode: Empty Bag. Unbagged distraction apps are sealed."
                } else {
                    "Monk Mode: Empty Bag. All normal apps & texts are sealed."
                }
                setTextColor(Color.parseColor("#D4D4D8"))
                textSize = 11.5f
                typeface = Typeface.MONOSPACE
                setLineSpacing(dp(3).toFloat(), 1f)
                setPadding(dp(14), dp(11), dp(14), dp(11))
                background = GradientDrawable().apply {
                    cornerRadius = dp(12).toFloat()
                    setColor(Color.parseColor("#D909090C"))
                    setStroke(dp(1), VoidThemeStore.withAlpha(accent, 66))
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

        // Compulsory Phone Calls row — always available even in an empty Monk Mode Bag
        val dialerPkg = bagStore.getPrimaryDialerPackage()
        val dialerIcon = dialerPkg?.let { loadAppIconSafe(it) }
        val dialerColor = VoidBrandPalette.extractBrandColorFromDrawable(
            drawable = dialerIcon,
            packageName = dialerPkg ?: "com.google.android.dialer",
            appName = "Phone Calls",
            category = "calls",
            fallbackHex = "#16A34A"
        )
        rowsStack.addView(
            createBagAppRow(
                title = "Phone Calls",
                subtitle = "Compulsory Dialer • Always ON",
                badgeLabel = "ALWAYS ON",
                brandColor = dialerColor,
                iconDrawable = dialerIcon,
                fallbackVectorResId = android.R.drawable.stat_sys_phone_call,
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

        // Optional Normal SMS row if enabled for the Bag
        if (allowSms) {
            val smsPkg = bagStore.getPrimarySmsPackage()
            val smsIcon = smsPkg?.let { loadAppIconSafe(it) }
            val smsColor = VoidBrandPalette.extractBrandColorFromDrawable(
                drawable = smsIcon,
                packageName = smsPkg ?: "com.google.android.apps.messaging",
                appName = "Messages",
                category = "messages",
                fallbackHex = "#0284C7"
            )
            rowsStack.addView(
                createBagAppRow(
                    title = "Messages",
                    subtitle = "Normal Texts (SMS)",
                    badgeLabel = "ALLOWED",
                    brandColor = smsColor,
                    iconDrawable = smsIcon,
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
        onClick: () -> Unit
    ): View {
        val row = LinearLayout(this).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            isClickable = true
            isFocusable = true
            setPadding(dp(12), dp(10), dp(12), dp(10))
            background = createRoundedButtonBg(
                fillColors = intArrayOf(Color.parseColor("#CC18181C"), Color.parseColor("#CC141418")),
                strokeColor = Color.parseColor("#14FFFFFF"),
                rippleColor = VoidThemeStore.withAlpha(brandColor, 64),
                radiusDp = 12
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
            setOnClickListener { onClick() }
        }

        // Dynamic Brand-Colored App Icon Tile
        val tileSize = dp(38)
        val iconTile = FrameLayout(this).apply {
            clipToOutline = true
            outlineProvider = object : ViewOutlineProvider() {
                override fun getOutline(view: View, outline: Outline) {
                    outline.setRoundRect(0, 0, view.width, view.height, dp(11).toFloat())
                }
            }
            background = GradientDrawable().apply {
                cornerRadius = dp(11).toFloat()
                setColor(brandColor)
                setStroke(dp(1), Color.parseColor("#33FFFFFF"))
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
                setColorFilter(Color.WHITE)
                scaleType = ImageView.ScaleType.FIT_CENTER
                setPadding(dp(9), dp(9), dp(9), dp(9))
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.MATCH_PARENT,
                    FrameLayout.LayoutParams.MATCH_PARENT
                )
            }
            iconTile.addView(iv)
        } else {
            val hexBg = String.format(Locale.US, "#%06X", 0xFFFFFF and brandColor)
            val txtColor = VoidThemeStore.parseHexColorSafe(
                VoidBrandPalette.contrastTextHexForBg(hexBg),
                Color.WHITE
            )
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

        // Right Pill Badge ("ALLOWED" / "ALWAYS ON")
        val badgeView = TextView(this).apply {
            text = badgeLabel
            setTextColor(Color.parseColor("#34D399"))
            textSize = 9f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            letterSpacing = 0.05f
            setPadding(dp(8), dp(4), dp(8), dp(4))
            background = GradientDrawable().apply {
                cornerRadius = dp(6).toFloat()
                setColor(Color.parseColor("#1F10B981"))
                setStroke(dp(1), Color.parseColor("#4010B981"))
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

        val accent = accentConfig.accentColor
        if (balance > 0) {
            val topStop = VoidThemeStore.lightenColor(accent, 0.16f)
            val botStop = VoidThemeStore.darkenColor(accent, 0.18f)
            btnDeployParachute.setTextColor(accentConfig.badgeTextColor)
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
                textRemainingTime.text = formatHms(live.remainingMillis / 1000L)

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
