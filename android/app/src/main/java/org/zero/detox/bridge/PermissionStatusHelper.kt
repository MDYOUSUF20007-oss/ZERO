package org.zero.detox.bridge

import android.app.AppOpsManager
import android.os.Build
import java.security.MessageDigest

/**
 * Pure JVM-testable permission priority, Android 13–16 Restricted Settings evaluation,
 * and release signing certificate verification helpers for Zero.
 */
object PermissionStatusHelper {
    const val OFFICIAL_RELEASE_CERT_SHA256_HEX =
        "A14A361ED4B7F7D66E576992999D028A053265850A6CA4AFEE4FC12F2948CE11"

    const val RESTRICTED_ALLOWED = "allowed"
    const val RESTRICTED_BLOCKED = "blocked"
    const val RESTRICTED_CHECK_APP_INFO = "check_app_info"

    enum class NextPermissionAction {
        ALLOW_RESTRICTED_SETTINGS_APP_INFO,
        ENABLE_ACCESSIBILITY,
        GRANT_USAGE_ACCESS,
        GRANT_OVERLAY,
        GRANT_NOTIFICATIONS,
        ALL_GRANTED
    }

    /**
     * Evaluates whether Android 13+ "Allow restricted settings" is lifted (`allowed`),
     * explicitly denied/blocked (`blocked`), or still in default/unverified state (`check_app_info`).
     */
    @JvmStatic
    fun evaluateRestrictedSettingsStatus(
        sdkInt: Int,
        appOpMode: Int?,
        corePermissionGranted: Boolean
    ): String {
        if (sdkInt < Build.VERSION_CODES.TIRAMISU) {
            return RESTRICTED_ALLOWED
        }
        if (corePermissionGranted || appOpMode == AppOpsManager.MODE_ALLOWED) {
            return RESTRICTED_ALLOWED
        }
        if (appOpMode == AppOpsManager.MODE_IGNORED || appOpMode == AppOpsManager.MODE_ERRORED) {
            return RESTRICTED_BLOCKED
        }
        return RESTRICTED_CHECK_APP_INFO
    }

    /**
     * Enforces exact priority order:
     * 1. Restricted Settings in App Info (only jump directly to App Info first when explicitly blocked;
     *    if MODE_DEFAULT / check_app_info, open Usage/Accessibility first so Android unlocks the 3-dot option)
     * 2. Core Guard: Accessibility Service (Strict) or Usage Access (Standard)
     * 3. Display Over Other Apps (Overlay)
     * 4. Post Notifications
     */
    @JvmStatic
    fun determineNextPermissionAction(
        isStrictBuild: Boolean,
        restrictedSettingsStatus: String,
        isAccessibilityEnabled: Boolean,
        hasUsageStatsPermission: Boolean,
        hasOverlayPermission: Boolean,
        hasNotificationPermission: Boolean
    ): NextPermissionAction {
        val coreMissing = if (isStrictBuild) !isAccessibilityEnabled else !hasUsageStatsPermission
        if (coreMissing && restrictedSettingsStatus == RESTRICTED_BLOCKED) {
            return NextPermissionAction.ALLOW_RESTRICTED_SETTINGS_APP_INFO
        }
        if (isStrictBuild && !isAccessibilityEnabled) {
            return NextPermissionAction.ENABLE_ACCESSIBILITY
        }
        if (!isStrictBuild && !hasUsageStatsPermission) {
            return NextPermissionAction.GRANT_USAGE_ACCESS
        }
        if (!hasOverlayPermission) {
            return NextPermissionAction.GRANT_OVERLAY
        }
        if (!hasNotificationPermission) {
            return NextPermissionAction.GRANT_NOTIFICATIONS
        }
        return NextPermissionAction.ALL_GRANTED
    }

    @JvmStatic
    fun formatSha256ColonHex(certBytes: ByteArray): String {
        val digest = MessageDigest.getInstance("SHA-256").digest(certBytes)
        return digest.joinToString(":") { "%02X".format(it) }
    }

    @JvmStatic
    fun isOfficialReleaseCertHex(sha256: String?): Boolean {
        if (sha256.isNullOrBlank()) return false
        val cleaned = sha256.replace(":", "").trim().uppercase()
        return cleaned == OFFICIAL_RELEASE_CERT_SHA256_HEX
    }
}
