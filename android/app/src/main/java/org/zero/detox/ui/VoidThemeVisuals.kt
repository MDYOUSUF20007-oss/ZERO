package org.zero.detox.ui

import android.content.Context
import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.LinearGradient
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.RectF
import android.graphics.Shader
import android.graphics.drawable.Drawable
import android.util.AttributeSet
import android.view.View
import java.util.Locale
import kotlin.math.abs
import kotlin.math.max
import kotlin.math.pow
import kotlin.math.roundToInt

/**
 * Pure Kotlin + Android helpers for TheVoidActivity's pixelated gradient clock
 * and WhatsApp-style brand-colored Bag app tiles.
 *
 * All color parsing, pixel matrix glyph tables, and package brand resolution are
 * pure Kotlin so JVM unit tests run reliably without Robolectric or framework stubs.
 */
object VoidThemeStore {
    const val PREFS_NAME = "zero_theme_prefs"
    const val KEY_ACCENT_HEX = "accent_hex"
    const val KEY_ACCENT_RGB = "accent_rgb"
    const val KEY_BADGE_TEXT_HEX = "badge_text_hex"
    const val KEY_INTERFACE_STYLE = "interface_style"

    const val STYLE_BESPOKE = "bespoke"
    const val STYLE_CLASSIC = "classic"
    const val DEFAULT_INTERFACE_STYLE = STYLE_CLASSIC

    const val DEFAULT_ACCENT_HEX = "#FFFFFF"
    const val DEFAULT_ACCENT_RGB = "255, 255, 255"
    const val DEFAULT_BADGE_TEXT_HEX = "#09090B"

    data class VoidAccentConfig(
        val accentHex: String,
        val accentRgb: String,
        val badgeTextHex: String,
        val accentColor: Int,
        val badgeTextColor: Int
    )

    private val HEX6_REGEX = Regex("^#[0-9A-F]{6}$")

    @JvmStatic
    fun normalizeHex(raw: String?, fallback: String = DEFAULT_ACCENT_HEX): String {
        val cleaned = raw?.trim()?.uppercase(Locale.US).orEmpty()
        val withHash = if (cleaned.startsWith("#")) cleaned else "#$cleaned"
        if (HEX6_REGEX.matches(withHash)) {
            return withHash
        }
        val fb = fallback.trim().uppercase(Locale.US)
        val fbHash = if (fb.startsWith("#")) fb else "#$fb"
        return if (HEX6_REGEX.matches(fbHash)) fbHash else DEFAULT_ACCENT_HEX
    }

    @JvmStatic
    @JvmOverloads
    fun parseHexColorSafe(hex: String?, fallbackArgb: Int = 0xFFFFFFFF.toInt()): Int {
        val cleaned = hex?.trim()?.uppercase(Locale.US).orEmpty()
        val withHash = if (cleaned.startsWith("#")) cleaned else "#$cleaned"
        val raw = if (HEX6_REGEX.matches(withHash)) withHash else return fallbackArgb
        val r = raw.substring(1, 3).toIntOrNull(16) ?: return fallbackArgb
        val g = raw.substring(3, 5).toIntOrNull(16) ?: return fallbackArgb
        val b = raw.substring(5, 7).toIntOrNull(16) ?: return fallbackArgb
        return (0xFF shl 24) or (r shl 16) or (g shl 8) or b
    }

    @JvmStatic
    fun withAlpha(color: Int, alpha0To255: Int): Int {
        val clamped = alpha0To255.coerceIn(0, 255)
        return (color and 0x00FFFFFF) or (clamped shl 24)
    }

    @JvmStatic
    fun computeRgbString(color: Int): String {
        val r = (color ushr 16) and 0xFF
        val g = (color ushr 8) and 0xFF
        val b = color and 0xFF
        return "$r, $g, $b"
    }

    @JvmStatic
    fun darkenColor(color: Int, factor0To1: Float): Int {
        val f = (1f - factor0To1.coerceIn(0f, 1f))
        val a = (color ushr 24) and 0xFF
        val r = (((color ushr 16) and 0xFF) * f).roundToInt().coerceIn(0, 255)
        val g = (((color ushr 8) and 0xFF) * f).roundToInt().coerceIn(0, 255)
        val b = ((color and 0xFF) * f).roundToInt().coerceIn(0, 255)
        return (a shl 24) or (r shl 16) or (g shl 8) or b
    }

    @JvmStatic
    fun lightenColor(color: Int, mixWhite0To1: Float): Int {
        val t = mixWhite0To1.coerceIn(0f, 1f)
        val a = (color ushr 24) and 0xFF
        val r0 = (color ushr 16) and 0xFF
        val g0 = (color ushr 8) and 0xFF
        val b0 = color and 0xFF
        val r = (r0 + (255 - r0) * t).roundToInt().coerceIn(0, 255)
        val g = (g0 + (255 - g0) * t).roundToInt().coerceIn(0, 255)
        val b = (b0 + (255 - b0) * t).roundToInt().coerceIn(0, 255)
        return (a shl 24) or (r shl 16) or (g shl 8) or b
    }

    private fun linearLuminanceChannel(c: Int): Double {
        val s = (c and 0xFF) / 255.0
        return if (s <= 0.03928) s / 12.92 else ((s + 0.055) / 1.055).pow(2.4)
    }

    @JvmStatic
    fun relativeLuminance(color: Int): Double {
        val r = linearLuminanceChannel(color ushr 16)
        val g = linearLuminanceChannel(color ushr 8)
        val b = linearLuminanceChannel(color)
        return 0.2126 * r + 0.7152 * g + 0.0722 * b
    }

    @JvmStatic
    fun ensureReadableOnBlack(color: Int): Int {
        return if (relativeLuminance(color) < 0.24) lightenColor(color, 0.48f) else color
    }

    @JvmStatic
    fun saveAccent(
        context: Context,
        accentHex: String?,
        accentRgb: String?,
        badgeTextHex: String?
    ) {
        val cleanHex = normalizeHex(accentHex, DEFAULT_ACCENT_HEX)
        val colorInt = parseHexColorSafe(cleanHex)
        val cleanRgb = accentRgb?.takeIf { it.isNotBlank() }?.trim() ?: computeRgbString(colorInt)
        val cleanBadgeText = normalizeHex(badgeTextHex, DEFAULT_BADGE_TEXT_HEX)

        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_ACCENT_HEX, cleanHex)
            .putString(KEY_ACCENT_RGB, cleanRgb)
            .putString(KEY_BADGE_TEXT_HEX, cleanBadgeText)
            .commit()
    }

    @JvmStatic
    fun loadAccent(context: Context): VoidAccentConfig {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val hex = normalizeHex(prefs.getString(KEY_ACCENT_HEX, DEFAULT_ACCENT_HEX), DEFAULT_ACCENT_HEX)
        val colorInt = parseHexColorSafe(hex)
        val rgb = prefs.getString(KEY_ACCENT_RGB, null)?.takeIf { it.isNotBlank() }
            ?: computeRgbString(colorInt)
        val badgeHex = normalizeHex(
            prefs.getString(KEY_BADGE_TEXT_HEX, DEFAULT_BADGE_TEXT_HEX),
            DEFAULT_BADGE_TEXT_HEX
        )
        val badgeColor = parseHexColorSafe(badgeHex, 0xFF09090B.toInt())
        return VoidAccentConfig(
            accentHex = hex,
            accentRgb = rgb,
            badgeTextHex = badgeHex,
            accentColor = colorInt,
            badgeTextColor = badgeColor
        )
    }

    @JvmStatic
    fun normalizeInterfaceStyle(raw: String?): String {
        return if (raw?.trim()?.lowercase(Locale.US) == STYLE_BESPOKE) STYLE_BESPOKE else STYLE_CLASSIC
    }

    @JvmStatic
    fun saveInterfaceStyle(context: Context, style: String?) {
        val clean = normalizeInterfaceStyle(style)
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
            .edit()
            .putString(KEY_INTERFACE_STYLE, clean)
            .commit()
    }

    @JvmStatic
    fun loadInterfaceStyle(context: Context): String {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        return normalizeInterfaceStyle(prefs.getString(KEY_INTERFACE_STYLE, DEFAULT_INTERFACE_STYLE))
    }

    @JvmStatic
    fun isBespokeStyle(context: Context): Boolean {
        return loadInterfaceStyle(context) == STYLE_BESPOKE
    }
}

/**
 * Pure Kotlin 5x7 LED pixel matrix glyph engine (mirrors src/utils/pixelFont.ts).
 */
object PixelFont5x7 {
    const val ROWS = 7

    val GLYPHS: Map<Char, Array<String>> = mapOf(
        '0' to arrayOf("01110", "10001", "10011", "10101", "11001", "10001", "01110"),
        '1' to arrayOf("00100", "01100", "00100", "00100", "00100", "00100", "01110"),
        '2' to arrayOf("01110", "10001", "00001", "00110", "01000", "10000", "11111"),
        '3' to arrayOf("01110", "10001", "00001", "01110", "00001", "10001", "01110"),
        '4' to arrayOf("00010", "00110", "01010", "10010", "11111", "00010", "00010"),
        '5' to arrayOf("11111", "10000", "11110", "00001", "00001", "10001", "01110"),
        '6' to arrayOf("01110", "10000", "10000", "11110", "10001", "10001", "01110"),
        '7' to arrayOf("11111", "00001", "00010", "00100", "01000", "01000", "01000"),
        '8' to arrayOf("01110", "10001", "10001", "01110", "10001", "10001", "01110"),
        '9' to arrayOf("01110", "10001", "10001", "01111", "00001", "00001", "01110"),
        ':' to arrayOf("00", "11", "11", "00", "11", "11", "00"),
        '.' to arrayOf("00", "00", "00", "00", "00", "11", "11"),
        'A' to arrayOf("01110", "10001", "10001", "11111", "10001", "10001", "10001"),
        'P' to arrayOf("11110", "10001", "10001", "11110", "10000", "10000", "10000"),
        'M' to arrayOf("10001", "11011", "10101", "10101", "10001", "10001", "10001"),
        ' ' to arrayOf("00", "00", "00", "00", "00", "00", "00")
    )

    data class PixelCell(val col: Float, val row: Int)

    data class Layout(
        val normalizedText: String,
        val totalCols: Float,
        val totalRows: Int,
        val cells: List<PixelCell>
    )

    @JvmStatic
    fun normalizeClockText(input: String?): String {
        val upper = input?.trim()?.uppercase(Locale.US).orEmpty()
        val sb = StringBuilder()
        for (ch in upper) {
            if (GLYPHS.containsKey(ch)) {
                sb.append(ch)
            }
        }
        val cleaned = sb.toString().trim()
        val hasDigit = cleaned.any { it in '0'..'9' }
        return if (hasDigit) cleaned else "3:39 PM"
    }

    @JvmStatic
    fun buildLayout(rawText: String?): Layout {
        val text = normalizeClockText(rawText)
        val cells = ArrayList<PixelCell>(text.length * 16)
        var cursorCol = 0f

        for (i in text.indices) {
            val ch = text[i]
            val matrix = GLYPHS[ch] ?: GLYPHS[' ']!!
            val widthCols = matrix[0].length

            for (r in 0 until ROWS) {
                val rowStr = matrix[r]
                for (c in 0 until widthCols) {
                    if (rowStr[c] == '1') {
                        cells.add(PixelCell(cursorCol + c, r))
                    }
                }
            }

            cursorCol += widthCols
            if (i < text.length - 1) {
                val next = text[i + 1]
                cursorCol += if (ch == ':' || next == ':') 1.0f else 1.25f
            }
        }

        return Layout(
            normalizedText = text,
            totalCols = max(1f, cursorCol),
            totalRows = ROWS,
            cells = cells
        )
    }
}

/**
 * Custom Canvas view rendering crisp pixelated digital digits shaded with a sharp
 * vertical White -> Theme Accent gradient, dot-matrix underlay, and terminal scanlines.
 */
class PixelClockView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null
) : View(context, attrs) {

    private var clockText: String = "3:39 PM"
    private var layoutData: PixelFont5x7.Layout = PixelFont5x7.buildLayout(clockText)
    private var accentColor: Int = 0xFFF59E0B.toInt()
    private var bespokeMinimalist: Boolean = false
    private var invertedPolarity: Boolean = false
    private var desiredHeightDp: Float = 34f

    private val pixelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val dotMatrixPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0x16FFFFFF
    }
    private val invertedDotMatrixPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
        color = 0x14000000
    }
    private val glowUnderlayPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        style = Paint.Style.FILL
    }
    private val scanlinePaint = Paint().apply {
        style = Paint.Style.FILL
        color = 0x48000000
    }
    private val invertedScanlinePaint = Paint().apply {
        style = Paint.Style.FILL
        color = 0x10000000
    }
    private val rectBuffer = RectF()
    private var lastGradientHeight = -1f
    private var lastGradientTop = -1f
    private var lastGradientAccent = 0
    private var lastGradientInverted = false

    fun setClockTime(rawTime: String) {
        val normalized = PixelFont5x7.normalizeClockText(rawTime)
        if (normalized == clockText) return
        val prevCols = layoutData.totalCols
        clockText = normalized
        layoutData = PixelFont5x7.buildLayout(normalized)
        if (abs(layoutData.totalCols - prevCols) > 0.4f) {
            requestLayout()
        }
        invalidate()
    }

    fun setAccentTheme(color: Int) {
        if (accentColor == color) return
        accentColor = color
        lastGradientAccent = 0
        invalidate()
    }

    fun setBespokeMinimalist(enabled: Boolean) {
        if (bespokeMinimalist == enabled) return
        bespokeMinimalist = enabled
        lastGradientAccent = 0
        invalidate()
    }

    fun setInvertedPolarity(inverted: Boolean) {
        if (invertedPolarity == inverted) return
        invertedPolarity = inverted
        lastGradientAccent = 0
        invalidate()
    }

    fun setDesiredHeightDp(heightDp: Float) {
        val clamped = heightDp.coerceIn(20f, 72f)
        if (abs(desiredHeightDp - clamped) < 0.1f) return
        desiredHeightDp = clamped
        requestLayout()
        invalidate()
    }

    override fun onMeasure(widthMeasureSpec: Int, heightMeasureSpec: Int) {
        val density = resources.displayMetrics.density
        val desiredHeight = (desiredHeightDp * density).roundToInt()
        val cellPx = desiredHeight / PixelFont5x7.ROWS.toFloat()
        val desiredWidth = (layoutData.totalCols * cellPx + 16f * density).roundToInt()

        val measuredW = resolveSize(desiredWidth, widthMeasureSpec)
        val measuredH = resolveSize(desiredHeight, heightMeasureSpec)
        setMeasuredDimension(measuredW, measuredH)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)
        val w = width.toFloat()
        val h = height.toFloat()
        if (w <= 0f || h <= 0f) return

        val density = resources.displayMetrics.density

        if (!bespokeMinimalist) {
            // 1. Subtle Dot-Matrix Underlay
            val dotPaint = if (invertedPolarity) invertedDotMatrixPaint else dotMatrixPaint
            val dotStep = max(4f * density, 1f)
            val dotRadius = 0.75f * density
            var dy = dotStep * 0.5f
            while (dy < h) {
                var dx = dotStep * 0.5f
                while (dx < w) {
                    canvas.drawCircle(dx, dy, dotRadius, dotPaint)
                    dx += dotStep
                }
                dy += dotStep
            }

            // 2. Ambient radial glow / subtle tint
            glowUnderlayPaint.shader = RadialGradient(
                w * 0.5f,
                h * 0.55f,
                max(w * 0.46f, h * 0.9f),
                VoidThemeStore.withAlpha(accentColor, if (invertedPolarity) 20 else 44),
                0x00000000,
                Shader.TileMode.CLAMP
            )
            canvas.drawRect(0f, 0f, w, h, glowUnderlayPaint)
        }

        // 3. Crisp 5x7 Pixelated LED Matrix
        val padH = 6f * density
        val maxCellW = (w - padH * 2f) / max(1f, layoutData.totalCols)
        val maxCellH = (h - 2f * density) / PixelFont5x7.ROWS.toFloat()
        val cellSize = minOf(maxCellW, maxCellH)
        if (cellSize > 0.5f) {
            val drawWidth = layoutData.totalCols * cellSize
            val drawHeight = PixelFont5x7.ROWS * cellSize
            val startX = (w - drawWidth) * 0.5f
            val startY = (h - drawHeight) * 0.5f

            if (bespokeMinimalist) {
                pixelPaint.shader = null
                pixelPaint.color = if (invertedPolarity) Color.BLACK else 0xFFFAFAFA.toInt()
            } else if (
                lastGradientTop != startY ||
                lastGradientHeight != drawHeight ||
                lastGradientAccent != accentColor ||
                lastGradientInverted != invertedPolarity ||
                pixelPaint.shader == null
            ) {
                val gradColors = if (invertedPolarity) {
                    intArrayOf(
                        Color.BLACK,
                        Color.BLACK,
                        VoidThemeStore.darkenColor(accentColor, 0.78f)
                    )
                } else {
                    intArrayOf(Color.WHITE, Color.WHITE, accentColor)
                }
                pixelPaint.shader = LinearGradient(
                    0f,
                    startY,
                    0f,
                    startY + drawHeight,
                    gradColors,
                    floatArrayOf(0f, 0.28f, 1f),
                    Shader.TileMode.CLAMP
                )
                lastGradientTop = startY
                lastGradientHeight = drawHeight
                lastGradientAccent = accentColor
                lastGradientInverted = invertedPolarity
            }

            val gap = cellSize * 0.14f
            val pixelExtent = cellSize - gap
            val corner = if (bespokeMinimalist) 0f else cellSize * 0.1f

            for (cell in layoutData.cells) {
                val left = startX + cell.col * cellSize + gap * 0.5f
                val top = startY + cell.row * cellSize + gap * 0.5f
                rectBuffer.set(left, top, left + pixelExtent, top + pixelExtent)
                if (corner <= 0f) {
                    canvas.drawRect(rectBuffer, pixelPaint)
                } else {
                    canvas.drawRoundRect(rectBuffer, corner, corner, pixelPaint)
                }
            }
        }

        if (!bespokeMinimalist) {
            // 4. Subtle Terminal CRT Scanlines across display
            val scanPaint = if (invertedPolarity) invertedScanlinePaint else scanlinePaint
            val scanStep = max(4f * density, 2f)
            val scanThick = max(1.6f * density, 1f)
            var sy = scanStep * 0.5f
            while (sy < h) {
                canvas.drawRect(0f, sy, w, sy + scanThick, scanPaint)
                sy += scanStep
            }
        }
    }
}

/**
 * Resolves brand colors for WhatsApp-style vertical Bag app rows both purely by package/app
 * metadata (JVM-testable) and dynamically from the installed Android launcher Drawable.
 */
object VoidBrandPalette {
    val BRAND_HEX_BY_PACKAGE: Map<String, String> = mapOf(
        "com.whatsapp" to "#16A34A",
        "com.whatsapp.w4b" to "#16A34A",
        "com.spotify.music" to "#1DB954",
        "com.spotify.lite" to "#1DB954",
        "md.obsidian" to "#7C3AED",
        "com.notion.id" to "#27272A",
        "notion.id" to "#27272A",
        "com.google.android.apps.maps" to "#2563EB",
        "com.google.android.gm" to "#DC2626",
        "com.google.android.youtube" to "#E11D48",
        "com.google.android.apps.youtube.music" to "#E11D48",
        "org.telegram.messenger" to "#0284C7",
        "org.telegram.plus" to "#0284C7",
        "org.thoughtcrime.securesms" to "#2563EB",
        "com.discord" to "#5865F2",
        "com.slack" to "#6D28D9",
        "com.google.android.calculator" to "#0D9488",
        "com.android.calculator2" to "#0D9488",
        "com.sec.android.app.popupcalculator" to "#0D9488",
        "com.google.android.deskclock" to "#0284C7",
        "com.sec.android.app.clockpackage" to "#0284C7",
        "com.android.camera2" to "#3F3F46",
        "com.google.android.googlecamera" to "#3F3F46",
        "com.sec.android.app.camera" to "#3F3F46",
        "com.ubercab" to "#18181B",
        "com.google.android.apps.docs" to "#2563EB",
        "com.google.android.apps.photos" to "#EA580C",
        "com.google.android.calendar" to "#2563EB",
        "com.amazon.kindle" to "#D97706",
        "com.ichi2.anki" to "#0EA5E9",
        "cc.forestapp" to "#15803D",
        "us.zoom.videomeetings" to "#2563EB",
        "com.google.android.apps.meetings" to "#059669",
        "com.microsoft.teams" to "#4F46E5",
        "com.google.android.dialer" to "#16A34A",
        "com.samsung.android.dialer" to "#16A34A",
        "com.android.dialer" to "#16A34A",
        "com.google.android.apps.messaging" to "#0284C7",
        "com.samsung.android.messaging" to "#0284C7",
        "com.android.mms" to "#0284C7"
    )

    private val FALLBACK_PALETTE = listOf(
        "#16A34A",
        "#2563EB",
        "#7C3AED",
        "#0284C7",
        "#0D9488",
        "#D97706",
        "#DC2626",
        "#4F46E5"
    )

    private fun fnv1aHash(input: String): Int {
        var h = 0x811C9DC5.toInt()
        for (i in input.indices) {
            h = h xor input[i].code
            h *= 0x01000193
        }
        return if (h == Int.MIN_VALUE) 0 else abs(h)
    }

    @JvmStatic
    fun resolveBrandHexForPackage(
        packageName: String?,
        appName: String?,
        category: String = "custom",
        fallbackHex: String = "#2563EB"
    ): String {
        val pkg = packageName?.trim().orEmpty()
        val lowerPkg = pkg.lowercase(Locale.US)
        val lowerName = appName?.trim()?.lowercase(Locale.US).orEmpty()

        BRAND_HEX_BY_PACKAGE[pkg]?.let { return it }
        BRAND_HEX_BY_PACKAGE[lowerPkg]?.let { return it }

        when {
            lowerPkg.contains("whatsapp") || lowerName.contains("whatsapp") -> return "#16A34A"
            lowerPkg.contains("spotify") || lowerName.contains("spotify") -> return "#1DB954"
            lowerPkg.contains("obsidian") || lowerName.contains("obsidian") -> return "#7C3AED"
            lowerPkg.contains("telegram") || lowerName.contains("telegram") -> return "#0284C7"
            category == "calls" || lowerPkg.contains("dialer") || lowerPkg.contains("phone") || lowerName == "phone calls" -> return "#16A34A"
            category == "messages" || lowerPkg.contains("messaging") || lowerPkg.contains("mms") -> return "#0284C7"
            lowerPkg.contains("maps") || lowerName.contains("maps") -> return "#2563EB"
            lowerPkg.contains("youtube") || lowerName.contains("youtube") -> return "#E11D48"
            lowerPkg.contains("mail") || lowerName.contains("gmail") -> return "#DC2626"
            lowerPkg.contains("calc") || lowerName.contains("calculator") -> return "#0D9488"
            lowerPkg.contains("clock") || lowerName.contains("clock") -> return "#0284C7"
            lowerPkg.contains("camera") || lowerName.contains("camera") -> return "#3F3F46"
        }

        if (pkg.isNotEmpty()) {
            return FALLBACK_PALETTE[fnv1aHash(pkg) % FALLBACK_PALETTE.size]
        }
        return VoidThemeStore.normalizeHex(fallbackHex, "#2563EB")
    }

    @JvmStatic
    fun contrastTextHexForBg(bgHex: String?): String {
        val color = VoidThemeStore.parseHexColorSafe(bgHex, 0xFF2563EB.toInt())
        val r = (color ushr 16) and 0xFF
        val g = (color ushr 8) and 0xFF
        val b = color and 0xFF
        val lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
        return if (lum >= 0.55) "#09090B" else "#FFFFFF"
    }

    /**
     * Extracts the dominant vibrant brand color from an installed app's launcher icon Drawable
     * (falling back cleanly to curated/deterministic package palette when icons are monochrome).
     */
    fun extractBrandColorFromDrawable(
        drawable: Drawable?,
        packageName: String,
        appName: String,
        category: String = "custom",
        fallbackHex: String = "#2563EB"
    ): Int {
        val fallbackColor = VoidThemeStore.parseHexColorSafe(
            resolveBrandHexForPackage(packageName, appName, category, fallbackHex)
        )
        if (drawable == null) return fallbackColor

        val exactKnown = BRAND_HEX_BY_PACKAGE[packageName] ?: BRAND_HEX_BY_PACKAGE[packageName.lowercase(Locale.US)]
        if (exactKnown != null) {
            return VoidThemeStore.parseHexColorSafe(exactKnown, fallbackColor)
        }

        return try {
            val size = 24
            val bmp = Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888)
            val canvas = Canvas(bmp)
            drawable.setBounds(0, 0, size, size)
            drawable.draw(canvas)

            val pixels = IntArray(size * size)
            bmp.getPixels(pixels, 0, size, 0, 0, size, size)
            bmp.recycle()

            val bucketCount = 18 // 20-degree hue buckets
            val scores = FloatArray(bucketCount)
            val sumR = FloatArray(bucketCount)
            val sumG = FloatArray(bucketCount)
            val sumB = FloatArray(bucketCount)
            val hsv = FloatArray(3)

            for (px in pixels) {
                val a = Color.alpha(px)
                if (a < 180) continue
                Color.colorToHSV(px, hsv)
                val sat = hsv[1]
                val valV = hsv[2]
                // Skip near-white adaptive backgrounds & near-black outlines
                if (sat < 0.28f || valV < 0.22f || (valV > 0.96f && sat < 0.35f)) continue
                val bucket = ((hsv[0] / 20f).toInt()).coerceIn(0, bucketCount - 1)
                val weight = sat * (0.4f + valV * 0.6f)
                scores[bucket] += weight
                sumR[bucket] += Color.red(px) * weight
                sumG[bucket] += Color.green(px) * weight
                sumB[bucket] += Color.blue(px) * weight
            }

            var bestIdx = -1
            var bestScore = 0f
            for (i in 0 until bucketCount) {
                if (scores[i] > bestScore) {
                    bestScore = scores[i]
                    bestIdx = i
                }
            }

            if (bestIdx >= 0 && bestScore > 2.5f) {
                val r = (sumR[bestIdx] / bestScore).roundToInt().coerceIn(0, 255)
                val g = (sumG[bestIdx] / bestScore).roundToInt().coerceIn(0, 255)
                val b = (sumB[bestIdx] / bestScore).roundToInt().coerceIn(0, 255)
                val extracted = Color.rgb(r, g, b)
                // Deepen excessively bright hues slightly so white tile icons/glyphs stay legible
                val lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0
                if (lum > 0.65) VoidThemeStore.darkenColor(extracted, 0.25f) else extracted
            } else {
                fallbackColor
            }
        } catch (_: Throwable) {
            fallbackColor
        }
    }
}
