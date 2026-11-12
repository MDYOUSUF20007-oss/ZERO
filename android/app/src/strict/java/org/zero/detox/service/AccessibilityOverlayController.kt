package org.zero.detox.service

import android.animation.ValueAnimator
import android.content.Context
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.PixelFormat
import android.graphics.Typeface
import android.graphics.drawable.GradientDrawable
import android.os.Handler
import android.os.Looper
import android.text.Editable
import android.text.InputType
import android.text.TextWatcher
import android.view.Gravity
import android.view.KeyEvent
import android.view.View
import android.view.WindowManager
import android.view.animation.AccelerateDecelerateInterpolator
import android.view.inputmethod.EditorInfo
import android.widget.Button
import android.widget.EditText
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.widget.ScrollView
import android.widget.TextView
import org.zero.detox.engage.EngageConfig
import org.zero.detox.ui.VoidThemeStore
import java.util.Locale
import kotlin.math.roundToInt

/**
 * AccessibilityOverlayController:
 * Renders pure AMOLED (#000000) theme-synced overlays strictly via
 * WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY on the AccessibilityService context.
 *
 * Focusability safeguard:
 * - Includes FLAG_NOT_FOCUSABLE on all informational/blocking screens & floating banners.
 * - Omits FLAG_NOT_FOCUSABLE (and enables SOFT_INPUT_ADJUST_RESIZE) ONLY when displaying
 *   Mindful Friction with requireIntentText == true so native EditText accepts soft keyboard input.
 */
class AccessibilityOverlayController(
    private val serviceContext: Context
) {

    enum class OverlayMode {
        HARD_BLOCK,
        QUOTA_EXHAUSTED,
        COOLDOWN,
        FRICTION,
        SHORT_VIDEO,
        SCROLL_INTERVENTION
    }

    private data class OverlayPalette(
        val isBespoke: Boolean,
        val isLiquidGlass: Boolean = false,
        val accentColor: Int,
        val primaryFillColor: Int,
        val primaryTextColor: Int,
        val cardBgColor: Int,
        val cardBorderColor: Int,
        val insetBgColor: Int,
        val insetBorderColor: Int,
        val secondaryBgColor: Int,
        val secondaryBorderColor: Int,
        val cornerRadiusPx: Float,
        val controlRadiusPx: Float,
        val typeface: Typeface
    )

    private class GeometricBreathingRingView(context: Context) : View(context) {
        private var progressFraction: Float = 0.55f
        private val ringPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.STROKE
            strokeWidth = 3f * context.resources.displayMetrics.density
        }
        private val guidePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.parseColor("#222222")
            style = Paint.Style.STROKE
            strokeWidth = 1f * context.resources.displayMetrics.density
        }
        private val corePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
            color = Color.WHITE
            style = Paint.Style.FILL
        }

        fun setThemeColors(ringColor: Int, guideColor: Int) {
            ringPaint.color = ringColor
            corePaint.color = ringColor
            guidePaint.color = guideColor
            invalidate()
        }

        fun setExpansionFraction(fraction: Float) {
            progressFraction = fraction.coerceIn(0.35f, 1.0f)
            invalidate()
        }

        override fun onDraw(canvas: Canvas) {
            super.onDraw(canvas)
            val cx = width / 2f
            val cy = height / 2f
            val maxRadius = (minOf(width, height) / 2f) - ringPaint.strokeWidth - 4f
            if (maxRadius <= 0f) return
            canvas.drawCircle(cx, cy, maxRadius, guidePaint)
            canvas.drawCircle(cx, cy, maxRadius * progressFraction, ringPaint)
            canvas.drawCircle(cx, cy, 3f * resources.displayMetrics.density, corePaint)
        }
    }

    private val mainHandler = Handler(Looper.getMainLooper())
    private val windowManager: WindowManager? =
        serviceContext.getSystemService(Context.WINDOW_SERVICE) as? WindowManager

    private var blockingView: View? = null
    private var blockingMode: OverlayMode? = null
    private var blockingPackageName: String? = null

    private var cooldownTimerView: TextView? = null
    private var frictionCountdownRunnable: Runnable? = null
    private var breathingAnimator: ValueAnimator? = null
    private var scrollPauseRunnable: Runnable? = null

    private var nudgeView: View? = null
    private var nudgeAutoDismissRunnable: Runnable? = null

    private fun dp(value: Int): Int {
        return maxOf(1, (value * serviceContext.resources.displayMetrics.density).toInt())
    }

    private fun dpF(value: Float): Int {
        return maxOf(1, (value * serviceContext.resources.displayMetrics.density).roundToInt())
    }

    private fun resolveOverlayPalette(): OverlayPalette {
        val bespoke = VoidThemeStore.isBespokeStyle(serviceContext)
        if (bespoke) {
            val accent = Color.parseColor("#3B82F6")
            val fill = Color.parseColor("#2563EB")
            return OverlayPalette(
                isBespoke = true,
                isLiquidGlass = false,
                accentColor = accent,
                primaryFillColor = fill,
                primaryTextColor = Color.WHITE,
                cardBgColor = Color.BLACK,
                cardBorderColor = Color.parseColor("#262626"),
                insetBgColor = Color.parseColor("#0A0A0A"),
                insetBorderColor = Color.parseColor("#262626"),
                secondaryBgColor = Color.parseColor("#0A0A0A"),
                secondaryBorderColor = Color.parseColor("#262626"),
                cornerRadiusPx = dp(6).toFloat(),
                controlRadiusPx = dp(6).toFloat(),
                typeface = Typeface.SANS_SERIF
            )
        }

        // Liquid Glass palette: Acrylic translucent overlay with #4FACFE accent
        val liquidGlass = VoidThemeStore.isLiquidGlassStyle(serviceContext)
        if (liquidGlass) {
            val accent = Color.parseColor("#4FACFE")
            val fill = Color.parseColor("#4FACFE")
            return OverlayPalette(
                isBespoke = false,
                isLiquidGlass = true,
                accentColor = accent,
                primaryFillColor = fill,
                primaryTextColor = Color.parseColor("#09090B"),
                cardBgColor = Color.parseColor("#0D1018"),   // EB 10% translucent handled by FLAG_DIM
                cardBorderColor = Color.parseColor("#38FFFFFF").let {
                    // #38 = 56/255 ≈ 22% alpha white hairline
                    (0x38 shl 24) or (Color.WHITE and 0x00FFFFFF)
                },
                insetBgColor = Color.parseColor("#0F1218"),
                insetBorderColor = (0x1F shl 24) or (Color.WHITE and 0x00FFFFFF),
                secondaryBgColor = Color.parseColor("#111520"),
                secondaryBorderColor = (0x0F shl 24) or (Color.WHITE and 0x00FFFFFF),
                cornerRadiusPx = dp(18).toFloat(),
                controlRadiusPx = dp(14).toFloat(),
                typeface = Typeface.SANS_SERIF
            )
        }

        val accentCfg = VoidThemeStore.loadAccent(serviceContext)
        val readableAccent = VoidThemeStore.ensureReadableOnBlack(accentCfg.accentColor)
        val badgeText = if (VoidThemeStore.relativeLuminance(readableAccent) >= 0.34) {
            Color.parseColor("#09090B")
        } else {
            Color.WHITE
        }
        return OverlayPalette(
            isBespoke = false,
            isLiquidGlass = false,
            accentColor = readableAccent,
            primaryFillColor = readableAccent,
            primaryTextColor = badgeText,
            cardBgColor = Color.parseColor("#0C0C10"),
            cardBorderColor = VoidThemeStore.withAlpha(readableAccent, 128),
            insetBgColor = Color.parseColor("#111116"),
            insetBorderColor = VoidThemeStore.withAlpha(readableAccent, 96),
            secondaryBgColor = Color.parseColor("#0D0D11"),
            secondaryBorderColor = Color.parseColor("#27272A"),
            cornerRadiusPx = dp(16).toFloat(),
            controlRadiusPx = dp(12).toFloat(),
            typeface = Typeface.MONOSPACE
        )
    }

    fun isBlockingOverlayVisible(): Boolean = blockingView != null

    fun getBlockingPackageName(): String? = blockingPackageName

    fun shouldKeepInAppInterventionFor(pkg: String): Boolean {
        val mode = blockingMode ?: return false
        return blockingPackageName == pkg &&
            (mode == OverlayMode.SHORT_VIDEO || mode == OverlayMode.SCROLL_INTERVENTION)
    }

    fun showHardBlockOverlay(
        pkg: String,
        mode: OverlayMode,
        title: String,
        body: String,
        onExitToVoid: () -> Unit
    ) {
        if (blockingView != null && blockingPackageName == pkg && blockingMode == mode) {
            return
        }
        hideBlockingOverlay()

        val palette = resolveOverlayPalette()
        val (root, card) = buildThemedRoot(
            palette = palette,
            allowKeyboardFocus = false,
            onBackAction = onExitToVoid
        )
        card.addView(buildEyebrowText("ZERO // ENFORCEMENT LAYER", palette))
        card.addView(buildTitleText(title, palette))
        card.addView(buildBodyText(body, palette))
        card.addView(buildPrimaryButton("RETURN TO ZERO", palette) { onExitToVoid() })

        attachBlockingView(root, mode, pkg, allowKeyboardFocus = false)
    }

    fun showCooldownOverlay(
        pkg: String,
        appLabel: String,
        remainingCooldownSec: Long,
        onExitToVoid: () -> Unit
    ) {
        val formattedTime = formatDuration(remainingCooldownSec)
        if (blockingView != null && blockingPackageName == pkg && blockingMode == OverlayMode.COOLDOWN) {
            cooldownTimerView?.text = "COOLDOWN REMAINING: $formattedTime"
            return
        }
        hideBlockingOverlay()

        val palette = resolveOverlayPalette()
        val (root, card) = buildThemedRoot(
            palette = palette,
            allowKeyboardFocus = false,
            onBackAction = onExitToVoid
        )
        card.addView(buildEyebrowText("ZERO // CONTINUOUS SESSION LIMIT", palette))
        card.addView(buildTitleText("$appLabel LOCKED", palette))
        card.addView(
            buildBodyText(
                "Continuous streak cap reached for $appLabel. Step away until your cooldown expires.",
                palette
            )
        )

        val timerBanner = TextView(serviceContext).apply {
            text = "COOLDOWN REMAINING: $formattedTime"
            setTextColor(palette.accentColor)
            textSize = 15f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(12), dp(14), dp(12), dp(14))
            background = boxDrawable(
                fillColor = palette.insetBgColor,
                borderColor = palette.insetBorderColor,
                cornerRadiusPx = palette.controlRadiusPx
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(16) }
        }
        card.addView(timerBanner)
        card.addView(buildPrimaryButton("RETURN TO ZERO", palette) { onExitToVoid() })

        if (attachBlockingView(root, OverlayMode.COOLDOWN, pkg, allowKeyboardFocus = false)) {
            cooldownTimerView = timerBanner
        }
    }

    fun showFrictionOverlay(
        pkg: String,
        appLabel: String,
        rule: EngageConfig.AppRuleConfig,
        onProceed: () -> Unit,
        onCancelToVoid: () -> Unit
    ) {
        if (blockingView != null && blockingPackageName == pkg && blockingMode == OverlayMode.FRICTION) {
            return
        }
        hideBlockingOverlay()

        val palette = resolveOverlayPalette()
        val allowKeyboard = rule.requireIntentText
        val (root, card) = buildThemedRoot(
            palette = palette,
            allowKeyboardFocus = allowKeyboard,
            onBackAction = onCancelToVoid
        )

        card.addView(buildEyebrowText("ZERO // MINDFUL FRICTION", palette))
        card.addView(buildTitleText("PAUSE BEFORE $appLabel", palette))

        val subtitle = buildString {
            append("Confirm your intention before opening $appLabel.")
            if (rule.reEntryGraceSeconds > 0) {
                append(" (${formatDuration(rule.reEntryGraceSeconds.toLong())} re-entry grace after proceeding)")
            }
        }
        card.addView(buildBodyText(subtitle, palette))

        var pendingAnimator: ValueAnimator? = null
        if (rule.showBreathingCircle) {
            val ringContainer = FrameLayout(serviceContext).apply {
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    dp(104)
                ).apply { bottomMargin = dp(14) }
            }
            val ringView = GeometricBreathingRingView(serviceContext).apply {
                setThemeColors(
                    ringColor = palette.accentColor,
                    guideColor = VoidThemeStore.withAlpha(palette.accentColor, 65)
                )
                layoutParams = FrameLayout.LayoutParams(dp(96), dp(96), Gravity.CENTER)
            }
            val breatheLabel = TextView(serviceContext).apply {
                text = "BREATHE"
                setTextColor(palette.accentColor)
                textSize = 9f
                typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
                letterSpacing = 0.14f
                gravity = Gravity.CENTER
                layoutParams = FrameLayout.LayoutParams(
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    FrameLayout.LayoutParams.WRAP_CONTENT,
                    Gravity.CENTER
                )
            }
            ringContainer.addView(ringView)
            ringContainer.addView(breatheLabel)
            card.addView(ringContainer)

            pendingAnimator = ValueAnimator.ofFloat(0.45f, 1.0f).apply {
                duration = 3200L
                repeatMode = ValueAnimator.REVERSE
                repeatCount = ValueAnimator.INFINITE
                interpolator = AccelerateDecelerateInterpolator()
                addUpdateListener { anim ->
                    val frac = (anim.animatedValue as? Float) ?: 0.7f
                    ringView.setExpansionFraction(frac)
                    breatheLabel.text = if (frac >= 0.72f) "INHALE" else "EXHALE"
                }
            }
        }

        var remainingWaitSec = maxOf(0, rule.frictionDelaySeconds)
        var currentIntentLength = 0
        val minCharsRequired = if (rule.requireIntentText) maxOf(0, rule.minIntentChars) else 0

        val statusView = TextView(serviceContext).apply {
            text = if (remainingWaitSec > 0) {
                "WAIT: ${remainingWaitSec}S REMAINING"
            } else {
                "FRICTION TIMER READY"
            }
            setTextColor(palette.accentColor)
            textSize = 12f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            gravity = Gravity.CENTER
            setPadding(dp(10), dp(10), dp(10), dp(10))
            background = boxDrawable(
                fillColor = palette.insetBgColor,
                borderColor = palette.insetBorderColor,
                cornerRadiusPx = palette.controlRadiusPx
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(12) }
        }
        card.addView(statusView)

        var charCountView: TextView? = null
        var intentEditText: EditText? = null
        if (rule.requireIntentText) {
            val edit = EditText(serviceContext).apply {
                hint = "State why you are opening $appLabel..."
                setTextColor(Color.WHITE)
                setHintTextColor(Color.parseColor("#6B7280"))
                textSize = 13f
                typeface = palette.typeface
                isFocusable = true
                isFocusableInTouchMode = true
                inputType = InputType.TYPE_CLASS_TEXT or InputType.TYPE_TEXT_FLAG_MULTI_LINE
                imeOptions = EditorInfo.IME_ACTION_DONE
                maxLines = 3
                minLines = 2
                gravity = Gravity.TOP or Gravity.START
                setPadding(dp(12), dp(12), dp(12), dp(12))
                background = boxDrawable(
                    fillColor = palette.insetBgColor,
                    borderColor = VoidThemeStore.withAlpha(palette.accentColor, 110),
                    cornerRadiusPx = palette.controlRadiusPx
                )
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(6) }
            }
            val counter = TextView(serviceContext).apply {
                text = "INTENT LENGTH: 0 / $minCharsRequired CHARS"
                setTextColor(Color.parseColor("#9CA3AF"))
                textSize = 10f
                typeface = Typeface.MONOSPACE
                layoutParams = LinearLayout.LayoutParams(
                    LinearLayout.LayoutParams.MATCH_PARENT,
                    LinearLayout.LayoutParams.WRAP_CONTENT
                ).apply { bottomMargin = dp(14) }
            }
            intentEditText = edit
            charCountView = counter
            card.addView(edit)
            card.addView(counter)
        }

        val proceedBtn = Button(serviceContext).apply {
            isAllCaps = true
            typeface = Typeface.create(palette.typeface, Typeface.BOLD)
            textSize = 12f
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
        }

        fun updateProceedButtonState() {
            val waitDone = remainingWaitSec <= 0
            val textOk = !rule.requireIntentText || currentIntentLength >= minCharsRequired
            val unlocked = waitDone && textOk
            proceedBtn.isEnabled = unlocked
            proceedBtn.text = when {
                !waitDone -> "WAIT (${remainingWaitSec}S)..."
                !textOk -> "ENTER INTENT (${currentIntentLength}/$minCharsRequired)"
                else -> "PROCEED TO $appLabel"
            }
            if (unlocked) {
                proceedBtn.setTextColor(palette.primaryTextColor)
                proceedBtn.background = boxDrawable(
                    fillColor = palette.primaryFillColor,
                    borderColor = palette.accentColor,
                    cornerRadiusPx = palette.controlRadiusPx
                )
            } else {
                proceedBtn.setTextColor(Color.parseColor("#71717A"))
                proceedBtn.background = boxDrawable(
                    fillColor = palette.secondaryBgColor,
                    borderColor = palette.secondaryBorderColor,
                    cornerRadiusPx = palette.controlRadiusPx
                )
            }
        }

        intentEditText?.addTextChangedListener(object : TextWatcher {
            override fun beforeTextChanged(s: CharSequence?, start: Int, count: Int, after: Int) = Unit
            override fun onTextChanged(s: CharSequence?, start: Int, before: Int, count: Int) {
                currentIntentLength = s?.toString()?.trim()?.length ?: 0
                charCountView?.text = "INTENT LENGTH: $currentIntentLength / $minCharsRequired CHARS"
                charCountView?.setTextColor(
                    if (currentIntentLength >= minCharsRequired) {
                        palette.accentColor
                    } else {
                        Color.parseColor("#9CA3AF")
                    }
                )
                updateProceedButtonState()
            }
            override fun afterTextChanged(s: Editable?) = Unit
        })

        proceedBtn.setOnClickListener {
            if (proceedBtn.isEnabled) {
                onProceed()
            }
        }

        card.addView(proceedBtn)
        card.addView(buildSecondaryButton("CANCEL & RETURN TO ZERO", palette) { onCancelToVoid() })
        updateProceedButtonState()

        if (!attachBlockingView(root, OverlayMode.FRICTION, pkg, allowKeyboardFocus = allowKeyboard)) {
            return
        }

        if (pendingAnimator != null) {
            breathingAnimator = pendingAnimator
            pendingAnimator.start()
        }

        if (remainingWaitSec > 0) {
            val tickTask = object : Runnable {
                override fun run() {
                    if (blockingMode != OverlayMode.FRICTION || blockingPackageName != pkg) return
                    remainingWaitSec = maxOf(0, remainingWaitSec - 1)
                    statusView.text = if (remainingWaitSec > 0) {
                        "WAIT: ${remainingWaitSec}S REMAINING"
                    } else {
                        "FRICTION TIMER COMPLETE"
                    }
                    updateProceedButtonState()
                    if (remainingWaitSec > 0) {
                        mainHandler.postDelayed(this, 1000L)
                    }
                }
            }
            frictionCountdownRunnable = tickTask
            mainHandler.postDelayed(tickTask, 1000L)
        }
    }

    fun showShortVideoOverlay(
        pkg: String,
        appLabel: String,
        onLeaveShorts: () -> Unit,
        onExitToVoid: () -> Unit
    ) {
        if (blockingView != null && blockingPackageName == pkg && blockingMode == OverlayMode.SHORT_VIDEO) {
            return
        }
        hideBlockingOverlay()

        val palette = resolveOverlayPalette()
        val (root, card) = buildThemedRoot(
            palette = palette,
            allowKeyboardFocus = false,
            onBackAction = onLeaveShorts
        )
        card.addView(buildEyebrowText("ZERO // SURGICAL SHORT-VIDEO BLOCKER", palette))
        card.addView(buildTitleText("SHORT-FORM FEED BLOCKED", palette))
        card.addView(
            buildBodyText(
                "Short-form video playback inside $appLabel is blocked during this Bag session. Long-form views & messages remain allowed.",
                palette
            )
        )
        card.addView(buildPrimaryButton("EXIT SHORTS / REELS", palette) { onLeaveShorts() })
        card.addView(buildSecondaryButton("RETURN TO ZERO", palette) { onExitToVoid() })

        attachBlockingView(root, OverlayMode.SHORT_VIDEO, pkg, allowKeyboardFocus = false)
    }

    fun showScrollInterventionOverlay(
        pkg: String,
        appLabel: String,
        scrollLimit: Int,
        onResumeAfterPause: () -> Unit,
        onExitToVoid: () -> Unit
    ) {
        if (blockingView != null && blockingPackageName == pkg && blockingMode == OverlayMode.SCROLL_INTERVENTION) {
            return
        }
        hideBlockingOverlay()

        val palette = resolveOverlayPalette()
        val (root, card) = buildThemedRoot(
            palette = palette,
            allowKeyboardFocus = false,
            onBackAction = onExitToVoid
        )
        card.addView(buildEyebrowText("ZERO // SCROLL VELOCITY GUARD", palette))
        card.addView(buildTitleText("DOOMSCROLL INTERRUPTED", palette))
        card.addView(
            buildBodyText(
                "Detected rapid scrolling (>$scrollLimit scroll events in 10s) inside $appLabel. Take a deliberate pause before resuming.",
                palette
            )
        )

        var holdSec = 3
        val resumeBtn = Button(serviceContext).apply {
            isAllCaps = true
            isEnabled = false
            text = "PAUSE BREAK (${holdSec}S)..."
            typeface = Typeface.create(palette.typeface, Typeface.BOLD)
            textSize = 12f
            setPadding(dp(14), dp(12), dp(14), dp(12))
            setTextColor(Color.parseColor("#71717A"))
            background = boxDrawable(
                fillColor = palette.secondaryBgColor,
                borderColor = palette.secondaryBorderColor,
                cornerRadiusPx = palette.controlRadiusPx
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
        }
        resumeBtn.setOnClickListener {
            if (resumeBtn.isEnabled) {
                onResumeAfterPause()
            }
        }
        card.addView(resumeBtn)
        card.addView(buildSecondaryButton("RETURN TO ZERO", palette) { onExitToVoid() })

        if (!attachBlockingView(root, OverlayMode.SCROLL_INTERVENTION, pkg, allowKeyboardFocus = false)) {
            return
        }

        val pauseTick = object : Runnable {
            override fun run() {
                if (blockingMode != OverlayMode.SCROLL_INTERVENTION || blockingPackageName != pkg) return
                holdSec = maxOf(0, holdSec - 1)
                if (holdSec > 0) {
                    resumeBtn.text = "PAUSE BREAK (${holdSec}S)..."
                    mainHandler.postDelayed(this, 1000L)
                } else {
                    resumeBtn.isEnabled = true
                    resumeBtn.text = "RESUME $appLabel"
                    resumeBtn.setTextColor(palette.primaryTextColor)
                    resumeBtn.background = boxDrawable(
                        fillColor = palette.primaryFillColor,
                        borderColor = palette.accentColor,
                        cornerRadiusPx = palette.controlRadiusPx
                    )
                }
            }
        }
        scrollPauseRunnable = pauseTick
        mainHandler.postDelayed(pauseTick, 1000L)
    }

    fun showNudgeBanner(
        appLabel: String,
        elapsedSec: Long,
        remainingQuotaSec: Long
    ) {
        val wm = windowManager ?: return
        hideNudgeBanner()

        val palette = resolveOverlayPalette()
        val quotaText = if (remainingQuotaSec > 0L) {
            "QUOTA LEFT ${formatDuration(remainingQuotaSec)}"
        } else {
            "UNLIMITED QUOTA"
        }

        val bannerContainer = LinearLayout(serviceContext).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(16), dp(36), dp(16), dp(8))
        }

        val pill = LinearLayout(serviceContext).apply {
            orientation = LinearLayout.HORIZONTAL
            gravity = Gravity.CENTER_VERTICAL
            setPadding(dp(14), dp(10), dp(14), dp(10))
            background = boxDrawable(
                fillColor = VoidThemeStore.withAlpha(palette.cardBgColor, 240),
                borderColor = palette.accentColor,
                cornerRadiusPx = palette.controlRadiusPx,
                strokePx = dpF(if (palette.isBespoke) 1f else 1.5f)
            )
        }

        val msg = TextView(serviceContext).apply {
            text = "ZERO NUDGE // ${appLabel.uppercase(Locale.US)} · ELAPSED ${formatDuration(elapsedSec)} · $quotaText"
            setTextColor(palette.accentColor)
            textSize = 10.5f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }
        pill.addView(msg)
        bannerContainer.addView(pill)

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.TOP or Gravity.CENTER_HORIZONTAL
        }

        try {
            wm.addView(bannerContainer, params)
            nudgeView = bannerContainer
            val dismissTask = Runnable { hideNudgeBanner() }
            nudgeAutoDismissRunnable = dismissTask
            mainHandler.postDelayed(dismissTask, 4500L)
        } catch (_: Exception) {
            nudgeView = null
        }
    }

    fun hideNudgeBanner() {
        nudgeAutoDismissRunnable?.let { mainHandler.removeCallbacks(it) }
        nudgeAutoDismissRunnable = null
        val view = nudgeView ?: return
        nudgeView = null
        try {
            windowManager?.removeViewImmediate(view)
        } catch (_: Exception) {
            try {
                windowManager?.removeView(view)
            } catch (_: Exception) {}
        }
    }

    fun hideBlockingOverlay() {
        clearBlockingRunnablesAndAnimators()
        cooldownTimerView = null
        blockingMode = null
        blockingPackageName = null
        val view = blockingView ?: return
        blockingView = null
        try {
            windowManager?.removeViewImmediate(view)
        } catch (_: Exception) {
            try {
                windowManager?.removeView(view)
            } catch (_: Exception) {}
        }
    }

    fun destroyAll() {
        hideBlockingOverlay()
        hideNudgeBanner()
    }

    private fun clearBlockingRunnablesAndAnimators() {
        frictionCountdownRunnable?.let { mainHandler.removeCallbacks(it) }
        frictionCountdownRunnable = null
        scrollPauseRunnable?.let { mainHandler.removeCallbacks(it) }
        scrollPauseRunnable = null
        breathingAnimator?.cancel()
        breathingAnimator = null
    }

    private fun attachBlockingView(
        view: View,
        mode: OverlayMode,
        pkg: String,
        allowKeyboardFocus: Boolean
    ): Boolean {
        val wm = windowManager ?: return false

        val flags = if (allowKeyboardFocus) {
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        } else {
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or
                WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN
        }

        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.TYPE_ACCESSIBILITY_OVERLAY,
            flags,
            PixelFormat.OPAQUE
        ).apply {
            gravity = Gravity.CENTER
            if (allowKeyboardFocus) {
                @Suppress("DEPRECATION")
                softInputMode = WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE or
                    WindowManager.LayoutParams.SOFT_INPUT_STATE_VISIBLE
            }
        }

        return try {
            wm.addView(view, params)
            blockingView = view
            blockingMode = mode
            blockingPackageName = pkg
            true
        } catch (_: Exception) {
            clearBlockingRunnablesAndAnimators()
            blockingView = null
            blockingMode = null
            blockingPackageName = null
            false
        }
    }

    private fun buildThemedRoot(
        palette: OverlayPalette,
        allowKeyboardFocus: Boolean,
        onBackAction: () -> Unit
    ): Pair<FrameLayout, LinearLayout> {
        val root = object : FrameLayout(serviceContext) {
            override fun dispatchKeyEvent(event: KeyEvent): Boolean {
                if (event.keyCode == KeyEvent.KEYCODE_BACK) {
                    if (event.action == KeyEvent.ACTION_UP && !event.isCanceled) {
                        onBackAction()
                    }
                    return true
                }
                return super.dispatchKeyEvent(event)
            }
        }.apply {
            setBackgroundColor(Color.BLACK)
            isFocusable = allowKeyboardFocus
            isFocusableInTouchMode = allowKeyboardFocus
        }

        val scroll = ScrollView(serviceContext).apply {
            isFillViewport = true
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.MATCH_PARENT
            )
        }

        val centerWrapper = LinearLayout(serviceContext).apply {
            orientation = LinearLayout.VERTICAL
            gravity = Gravity.CENTER
            setPadding(dp(20), dp(36), dp(20), dp(36))
            layoutParams = FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT,
                FrameLayout.LayoutParams.WRAP_CONTENT
            )
        }

        val card = LinearLayout(serviceContext).apply {
            orientation = LinearLayout.VERTICAL
            setPadding(dp(20), dp(22), dp(20), dp(22))
            background = boxDrawable(
                fillColor = palette.cardBgColor,
                borderColor = palette.cardBorderColor,
                cornerRadiusPx = palette.cornerRadiusPx,
                strokePx = dpF(if (palette.isBespoke) 1f else 1.5f)
            )
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
        }

        centerWrapper.addView(card)
        scroll.addView(centerWrapper)
        root.addView(scroll)
        return Pair(root, card)
    }

    private fun buildEyebrowText(textValue: String, palette: OverlayPalette): TextView {
        return TextView(serviceContext).apply {
            text = textValue
            setTextColor(palette.accentColor)
            textSize = 10f
            typeface = Typeface.create(Typeface.MONOSPACE, Typeface.BOLD)
            letterSpacing = 0.14f
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(8) }
        }
    }

    private fun buildTitleText(textValue: String, palette: OverlayPalette): TextView {
        return TextView(serviceContext).apply {
            text = textValue.uppercase(Locale.US)
            setTextColor(Color.WHITE)
            textSize = 19f
            typeface = Typeface.create(palette.typeface, Typeface.BOLD)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
        }
    }

    private fun buildBodyText(textValue: String, palette: OverlayPalette): TextView {
        return TextView(serviceContext).apply {
            text = textValue
            setTextColor(Color.parseColor("#D4D4D8"))
            textSize = 13f
            typeface = palette.typeface
            setLineSpacing(dp(4).toFloat(), 1f)
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(16) }
        }
    }

    private fun buildPrimaryButton(
        label: String,
        palette: OverlayPalette,
        onClick: () -> Unit
    ): Button {
        return Button(serviceContext).apply {
            text = label
            isAllCaps = true
            setTextColor(palette.primaryTextColor)
            textSize = 12f
            typeface = Typeface.create(palette.typeface, Typeface.BOLD)
            background = boxDrawable(
                fillColor = palette.primaryFillColor,
                borderColor = palette.accentColor,
                cornerRadiusPx = palette.controlRadiusPx
            )
            setPadding(dp(14), dp(12), dp(14), dp(12))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            ).apply { bottomMargin = dp(10) }
            setOnClickListener { onClick() }
        }
    }

    private fun buildSecondaryButton(
        label: String,
        palette: OverlayPalette,
        onClick: () -> Unit
    ): Button {
        return Button(serviceContext).apply {
            text = label
            isAllCaps = true
            setTextColor(Color.WHITE)
            textSize = 11.5f
            typeface = Typeface.create(palette.typeface, Typeface.BOLD)
            background = boxDrawable(
                fillColor = palette.secondaryBgColor,
                borderColor = palette.secondaryBorderColor,
                cornerRadiusPx = palette.controlRadiusPx
            )
            setPadding(dp(14), dp(11), dp(14), dp(11))
            layoutParams = LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT,
                LinearLayout.LayoutParams.WRAP_CONTENT
            )
            setOnClickListener { onClick() }
        }
    }

    private fun boxDrawable(
        fillColor: Int,
        borderColor: Int,
        cornerRadiusPx: Float = 0f,
        strokePx: Int = dp(1)
    ): GradientDrawable {
        return GradientDrawable().apply {
            shape = GradientDrawable.RECTANGLE
            cornerRadius = cornerRadiusPx
            setColor(fillColor)
            setStroke(strokePx, borderColor)
        }
    }

    private fun formatDuration(totalSec: Long): String {
        val safe = maxOf(0L, totalSec)
        val hours = safe / 3600L
        val mins = (safe % 3600L) / 60L
        val secs = safe % 60L
        return when {
            hours > 0L -> String.format(Locale.US, "%dh %02dm %02ds", hours, mins, secs)
            mins > 0L -> String.format(Locale.US, "%dm %02ds", mins, secs)
            else -> String.format(Locale.US, "%ds", secs)
        }
    }
}
