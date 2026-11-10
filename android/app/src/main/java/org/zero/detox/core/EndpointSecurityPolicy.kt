package org.zero.detox.core

import java.net.URI
import java.net.URLDecoder
import java.nio.charset.StandardCharsets

/**
 * EndpointSecurityPolicy:
 * Hardcoded anti-exfiltration & destination allowlist shared across WebView navigation,
 * native intent dispatch, and Android SAF Cloud Auto-Backup.
 *
 * Strictly zero external user-editable upload URLs, webhooks, HTTP cleartext URLs,
 * or non-official email/payment recipients are ever permitted.
 */
object EndpointSecurityPolicy {

    const val OFFICIAL_KOFI_HOST = "ko-fi.com"
    const val OFFICIAL_KOFI_PATH_PREFIX = "/mdyousuf2620"
    const val OFFICIAL_KOFI_URL = "https://ko-fi.com/mdyousuf2620"

    const val OFFICIAL_GITHUB_HOST = "github.com"
    const val OFFICIAL_GITHUB_REPO_PATH_PREFIX = "/MDYOUSUF20007-oss/ZERO"
    const val OFFICIAL_GITHUB_REPO_URL = "https://github.com/MDYOUSUF20007-oss/ZERO"
    const val OFFICIAL_GITHUB_RELEASES_URL = "https://github.com/MDYOUSUF20007-oss/ZERO/releases"

    const val OFFICIAL_PAGES_HOST = "mdyousuf20007-oss.github.io"
    const val OFFICIAL_PAGES_PATH_PREFIX = "/ZERO"
    const val OFFICIAL_PAGES_URL = "https://mdyousuf20007-oss.github.io/ZERO"

    const val OFFICIAL_SUPPORT_EMAIL = "mdyousuf982007@proton.me"
    const val OFFICIAL_UPI_ID = "md.y2007@ptaxis"

    const val DEFAULT_BACKUP_FILE_NAME = "zero-backup.zbak"
    const val SAF_CONTENT_SCHEME = "content"
    const val CAPACITOR_LOCAL_ORIGIN_HOST = "localhost"

    val HARDCODED_CLOUD_SAF_PROVIDERS: Set<String> = setOf(
        "com.google.android.apps.docs.storage",
        "com.google.android.apps.docs.storage.legacy",
        "com.microsoft.skydrive.content.StorageAccessProvider",
        "com.ril.jio.jiodrive.provider",
        "com.dropbox.android.provider",
        "com.android.externalstorage.documents",
        "com.android.providers.downloads.documents",
        "com.android.providers.media.documents",
        "com.google.android.documentsui.documents",
        "com.android.documentsui.documents"
    )

    private val BLOCKED_SAF_AUTHORITIES: Set<String> = setOf(
        "settings",
        "com.android.providers.settings",
        "contacts",
        "com.android.contacts",
        "telephony",
        "sms",
        "mms",
        "mms-sms",
        "call_log",
        "icc",
        "media_playback"
    )

    private val SAFE_FILENAME_CHARS = Regex("[^A-Za-z0-9._-]")
    private val VALID_SAF_AUTHORITY = Regex("^[A-Za-z0-9._:-]+$")

    data class ValidatedExternalTarget(
        val scheme: String,
        val normalizedUrl: String,
        val mailtoRecipient: String? = null,
        val mailtoSubject: String? = null
    )

    @JvmStatic
    @JvmOverloads
    fun validateSafDocumentUriString(
        uriString: String?,
        ownPackageName: String = "org.zero.detox"
    ): Boolean {
        val raw = uriString?.trim() ?: return false
        if (raw.isEmpty()) return false
        if (raw.any { it.isWhitespace() && it != ' ' }) return false
        if (raw.contains("..")) return false

        val schemeSep = raw.indexOf("://")
        if (schemeSep <= 0) return false
        val scheme = raw.substring(0, schemeSep).lowercase()
        if (scheme != SAF_CONTENT_SCHEME) return false

        val rest = raw.substring(schemeSep + 3)
        if (rest.isEmpty()) return false

        val slashIdx = rest.indexOf('/')
        if (slashIdx <= 0) return false
        val authority = rest.substring(0, slashIdx)
        val docPath = rest.substring(slashIdx + 1)

        if (authority.contains('@') || !VALID_SAF_AUTHORITY.matches(authority)) return false
        if (docPath.isBlank()) return false

        val lowerAuth = authority.lowercase()
        val lowerPkg = ownPackageName.trim().lowercase()
        if (lowerPkg.isNotEmpty() &&
            (lowerAuth == lowerPkg || lowerAuth.startsWith("$lowerPkg."))
        ) {
            return false
        }
        if (BLOCKED_SAF_AUTHORITIES.contains(lowerAuth)) return false

        val lowerPath = docPath.lowercase()
        if (lowerPath.contains("http://") || lowerPath.contains("https://")) {
            return false
        }
        return true
    }

    @JvmStatic
    fun resolveSafProviderLabel(authority: String?): String {
        val auth = (authority ?: "").trim().lowercase()
        return when {
            auth.contains("google.android.apps.docs") -> "Google Drive"
            auth.contains("onedrive") || auth.contains("skydrive") -> "Microsoft OneDrive"
            auth.contains("jio") -> "JioDrive / JioCloud"
            auth.contains("dropbox") -> "Dropbox"
            auth.contains("nextcloud") || auth.contains("owncloud") -> "Nextcloud / OwnCloud"
            auth.contains("externalstorage") || auth.contains("downloads") || auth.contains("media") || auth.contains("documentsui") ->
                "Device Storage"
            else -> "Cloud Storage"
        }
    }

    @JvmStatic
    @JvmOverloads
    fun sanitizeBackupFileName(
        rawName: String?,
        defaultName: String = DEFAULT_BACKUP_FILE_NAME
    ): String {
        val candidate = rawName?.trim() ?: return defaultName
        if (candidate.isEmpty()) return defaultName
        val baseOnly = candidate.substringAfterLast('/').substringAfterLast('\\')
        if (baseOnly.isEmpty() || baseOnly == "." || baseOnly == ".." || baseOnly.contains("..")) {
            return defaultName
        }
        val cleaned = SAFE_FILENAME_CHARS.replace(baseOnly, "_").trim('.')
        if (cleaned.isEmpty() || cleaned == "." || cleaned == "..") {
            return defaultName
        }
        return if (cleaned.length > 96) cleaned.substring(0, 96) else cleaned
    }

    @JvmStatic
    fun parseAndValidateExternalUrl(rawUrl: String?): ValidatedExternalTarget? {
        val trimmed = rawUrl?.trim() ?: return null
        if (trimmed.isEmpty()) return null

        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return null
        }

        val scheme = uri.scheme?.lowercase() ?: return null
        return when (scheme) {
            "https" -> {
                if (uri.rawUserInfo != null || uri.port != -1) return null
                val host = uri.host?.lowercase() ?: return null
                val path = uri.path ?: ""
                val allowed = when (host) {
                    OFFICIAL_KOFI_HOST -> path.equals(OFFICIAL_KOFI_PATH_PREFIX, ignoreCase = true) ||
                        path.startsWith("$OFFICIAL_KOFI_PATH_PREFIX/", ignoreCase = true)
                    OFFICIAL_GITHUB_HOST -> path.equals(OFFICIAL_GITHUB_REPO_PATH_PREFIX, ignoreCase = true) ||
                        path.startsWith("$OFFICIAL_GITHUB_REPO_PATH_PREFIX/", ignoreCase = true)
                    OFFICIAL_PAGES_HOST -> path.equals(OFFICIAL_PAGES_PATH_PREFIX, ignoreCase = true) ||
                        path.startsWith("$OFFICIAL_PAGES_PATH_PREFIX/", ignoreCase = true)
                    else -> false
                }
                if (!allowed) null else ValidatedExternalTarget("https", uri.toASCIIString())
            }
            "mailto" -> {
                val ssp = uri.rawSchemeSpecificPart ?: return null
                val qIdx = ssp.indexOf('?')
                val rawRecipient = (if (qIdx >= 0) ssp.substring(0, qIdx) else ssp).trim()
                if (rawRecipient.contains(',') || rawRecipient.contains(';')) return null
                if (!rawRecipient.equals(OFFICIAL_SUPPORT_EMAIL, ignoreCase = true)) return null

                var subjectValue: String? = null
                if (qIdx >= 0 && qIdx + 1 < ssp.length) {
                    val pairs = ssp.substring(qIdx + 1).split('&')
                    for (pair in pairs) {
                        if (pair.isEmpty()) continue
                        val eqIdx = pair.indexOf('=')
                        val key = (if (eqIdx >= 0) pair.substring(0, eqIdx) else pair)
                            .lowercase()
                            .trim()
                        if (key == "to" || key == "cc" || key == "bcc") {
                            return null
                        }
                        if (key == "subject" && eqIdx >= 0) {
                            val rawVal = pair.substring(eqIdx + 1)
                            val decoded = try {
                                URLDecoder.decode(rawVal, StandardCharsets.UTF_8.name())
                            } catch (_: Exception) {
                                rawVal
                            }
                            subjectValue = decoded
                                .replace('\r', ' ')
                                .replace('\n', ' ')
                                .trim()
                                .take(120)
                        }
                    }
                }
                ValidatedExternalTarget(
                    scheme = "mailto",
                    normalizedUrl = "mailto:$OFFICIAL_SUPPORT_EMAIL",
                    mailtoRecipient = OFFICIAL_SUPPORT_EMAIL,
                    mailtoSubject = subjectValue
                )
            }
            "upi" -> {
                if (uri.rawUserInfo != null) return null
                val host = uri.host?.lowercase() ?: return null
                if (host != "pay") return null
                val query = uri.rawQuery ?: return null
                var paValue: String? = null
                for (pair in query.split('&')) {
                    val eqIdx = pair.indexOf('=')
                    if (eqIdx <= 0) continue
                    val key = pair.substring(0, eqIdx).lowercase()
                    if (key == "pa") {
                        paValue = try {
                            URLDecoder.decode(pair.substring(eqIdx + 1), StandardCharsets.UTF_8.name())
                        } catch (_: Exception) {
                            pair.substring(eqIdx + 1)
                        }
                        break
                    }
                }
                if (paValue != OFFICIAL_UPI_ID) return null
                ValidatedExternalTarget("upi", uri.toASCIIString())
            }
            else -> null
        }
    }

    @JvmStatic
    fun isAllowedWebViewRequestUrl(rawUrl: String?): Boolean {
        val trimmed = rawUrl?.trim() ?: return false
        if (trimmed.isEmpty()) return false
        val lower = trimmed.lowercase()
        if (lower.startsWith("data:") || lower.startsWith("blob:")) {
            return true
        }
        val uri = try {
            URI(trimmed)
        } catch (_: Exception) {
            return false
        }
        val scheme = uri.scheme?.lowercase() ?: return false
        if (scheme != "https") return false
        if (uri.rawUserInfo != null || uri.port != -1) return false
        val host = uri.host?.lowercase() ?: return false
        val path = uri.path ?: ""
        return when (host) {
            CAPACITOR_LOCAL_ORIGIN_HOST -> true
            "fonts.googleapis.com", "fonts.gstatic.com" -> true
            OFFICIAL_PAGES_HOST -> path.isEmpty() ||
                path == "/" ||
                path.equals(OFFICIAL_PAGES_PATH_PREFIX, ignoreCase = true) ||
                path.startsWith("$OFFICIAL_PAGES_PATH_PREFIX/", ignoreCase = true)
            else -> false
        }
    }
}
