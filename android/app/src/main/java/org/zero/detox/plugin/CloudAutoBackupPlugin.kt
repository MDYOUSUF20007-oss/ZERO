package org.zero.detox.plugin

import android.app.Activity
import android.content.ContentResolver
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.OpenableColumns
import androidx.activity.result.ActivityResult
import androidx.core.content.FileProvider
import com.getcapacitor.JSObject
import com.getcapacitor.Plugin
import com.getcapacitor.PluginCall
import com.getcapacitor.PluginMethod
import com.getcapacitor.annotation.ActivityCallback
import com.getcapacitor.annotation.CapacitorPlugin
import org.json.JSONObject
import org.zero.detox.core.EndpointSecurityPolicy
import org.zero.detox.security.AppSecurityGuard
import java.io.File
import java.io.OutputStream
import java.util.concurrent.Executors

/**
 * CloudAutoBackupPlugin:
 * 100% serverless Capacitor plugin for Universal Cloud Auto-Backup using Android SAF
 * (Google Drive, Microsoft OneDrive, JioDrive/JioCloud, Dropbox, or Local Storage).
 *
 * Security Invariants:
 * - Only system Storage Access Framework intents (ACTION_CREATE_DOCUMENT,
 *   ACTION_OPEN_DOCUMENT, and ACTION_SEND FileProvider chooser) are used.
 * - Dynamically supplied HTTP/HTTPS/webhook upload URLs are strictly rejected.
 * - Background writes only write to the OS-picker-granted persisted content:// URI
 *   stored in MODE_PRIVATE SharedPreferences.
 */
@CapacitorPlugin(name = "CloudAutoBackup")
class CloudAutoBackupPlugin : Plugin() {

    companion object {
        private const val PREFS_NAME = "zero_cloud_auto_backup_v1"
        private const val KEY_ENABLED = "auto_backup_enabled"
        private const val KEY_URI = "backup_uri"
        private const val KEY_DISPLAY_NAME = "backup_display_name"
        private const val KEY_PROVIDER_LABEL = "backup_provider_label"
        private const val KEY_LAST_BACKUP_TS = "last_backup_timestamp"
        private const val MAX_RESTORE_BYTES = 10 * 1024 * 1024 // 10 MB safety cap
    }

    private val ioExecutor = Executors.newSingleThreadExecutor()

    private fun getPrefs() =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    @PluginMethod
    fun enableAutoBackup(call: PluginCall) {
        val fileName = EndpointSecurityPolicy.sanitizeBackupFileName(
            call.getString("fileName"),
            EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        )

        val intent = Intent(Intent.ACTION_CREATE_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "application/octet-stream"
            putExtra(Intent.EXTRA_TITLE, fileName)
            addFlags(
                Intent.FLAG_GRANT_READ_URI_PERMISSION or
                    Intent.FLAG_GRANT_WRITE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PERSISTABLE_URI_PERMISSION or
                    Intent.FLAG_GRANT_PREFIX_URI_PERMISSION
            )
        }

        startActivityForResult(call, intent, "handleEnableAutoBackupResult")
    }

    @ActivityCallback
    private fun handleEnableAutoBackupResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val resultUri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || resultUri == null) {
            call.reject("Cloud backup location selection was cancelled.", "CANCELLED")
            return
        }

        val uriStr = resultUri.toString()
        if (!EndpointSecurityPolicy.validateSafDocumentUriString(uriStr, context.packageName)) {
            call.reject(
                "Blocked unverified backup destination. Only Android SAF content:// providers are allowed.",
                "UNTRUSTED_URI"
            )
            return
        }

        val cr = context.contentResolver
        try {
            cr.takePersistableUriPermission(
                resultUri,
                Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
            )
        } catch (_: SecurityException) {
            try {
                cr.takePersistableUriPermission(resultUri, Intent.FLAG_GRANT_WRITE_URI_PERMISSION)
            } catch (_: Exception) {
                // Provider does not expose explicit persistable flag; URI stored & verified on write
            }
        } catch (_: Exception) {
            // Ignore non-fatal flag edge cases across OEM document providers
        }

        val displayName = EndpointSecurityPolicy.sanitizeBackupFileName(
            resolveDisplayName(resultUri),
            EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        )
        val providerLabel = EndpointSecurityPolicy.resolveSafProviderLabel(resultUri.authority)
        val persistedNow = hasPersistedWritePermission(uriStr)

        getPrefs().edit()
            .putBoolean(KEY_ENABLED, true)
            .putString(KEY_URI, uriStr)
            .putString(KEY_DISPLAY_NAME, displayName)
            .putString(KEY_PROVIDER_LABEL, providerLabel)
            .apply()

        val initialData = call.getString("data")
        if (initialData.isNullOrEmpty()) {
            call.resolve(buildStatusObject(persistedNow))
            return
        }

        ioExecutor.execute {
            try {
                val bytesWritten = writeContentToUri(resultUri, initialData)
                val ts = System.currentTimeMillis()
                getPrefs().edit().putLong(KEY_LAST_BACKUP_TS, ts).apply()

                val res = buildStatusObject(persistedNow).apply {
                    put("lastBackupTimestamp", ts)
                    put("bytesWritten", bytesWritten)
                    put("synced", true)
                }
                call.resolve(res)
            } catch (sec: SecurityException) {
                call.reject(
                    "Storage permission was denied for ${providerLabel}: ${sec.localizedMessage}",
                    "PERMISSION_REVOKED"
                )
            } catch (e: Exception) {
                call.reject(
                    "Selected ${providerLabel}, but initial write failed: ${e.localizedMessage}",
                    "WRITE_FAILED"
                )
            }
        }
    }

    @PluginMethod
    fun writeAutoBackup(call: PluginCall) {
        val data = call.getString("data")
        if (data.isNullOrEmpty()) {
            call.reject("Missing backup payload data.", "INVALID_DATA")
            return
        }

        val prefs = getPrefs()
        val storedUriString = prefs.getString(KEY_URI, null)
        if (storedUriString.isNullOrBlank()) {
            call.reject("No persisted cloud backup URI configured.", "NO_URI")
            return
        }

        // Prohibit dynamic or caller-substituted upload destinations:
        // caller must never redirect persisted SAF writes to a different URL or endpoint.
        val callerUriString = call.getString("uri")?.takeIf { it.isNotBlank() }
        if (callerUriString != null && callerUriString != storedUriString) {
            call.reject(
                "Blocked dynamic destination override. Backups may only target your OS-selected SAF URI.",
                "UNTRUSTED_URI"
            )
            return
        }

        if (!EndpointSecurityPolicy.validateSafDocumentUriString(storedUriString, context.packageName)) {
            call.reject("Stored backup URI failed SAF content:// policy check.", "UNTRUSTED_URI")
            return
        }

        val uri = try {
            Uri.parse(storedUriString)
        } catch (e: Exception) {
            call.reject("Invalid persisted backup URI: ${e.localizedMessage}", "INVALID_URI")
            return
        }

        if (uri.scheme?.lowercase() != ContentResolver.SCHEME_CONTENT) {
            call.reject("Blocked non-SAF backup scheme.", "UNTRUSTED_URI")
            return
        }

        val displayName = prefs.getString(
            KEY_DISPLAY_NAME,
            EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        ) ?: EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        val providerLabel = prefs.getString(
            KEY_PROVIDER_LABEL,
            EndpointSecurityPolicy.resolveSafProviderLabel(uri.authority)
        ) ?: EndpointSecurityPolicy.resolveSafProviderLabel(uri.authority)

        ioExecutor.execute {
            try {
                val bytesWritten = writeContentToUri(uri, data)
                val ts = System.currentTimeMillis()
                prefs.edit().putLong(KEY_LAST_BACKUP_TS, ts).apply()

                call.resolve(
                    JSObject().apply {
                        put("ok", true)
                        put("timestamp", ts)
                        put("uri", storedUriString)
                        put("displayName", displayName)
                        put("providerLabel", providerLabel)
                        put("bytesWritten", bytesWritten)
                    }
                )
            } catch (sec: SecurityException) {
                call.reject(
                    "Access to $providerLabel ($displayName) was revoked. Re-enable Auto-Backup to relink.",
                    "PERMISSION_REVOKED"
                )
            } catch (e: Exception) {
                call.reject(
                    "Background sync to $providerLabel failed: ${e.localizedMessage}",
                    "WRITE_FAILED"
                )
            }
        }
    }

    @PluginMethod
    fun getAutoBackupStatus(call: PluginCall) {
        val prefs = getPrefs()
        val uriStr = prefs.getString(KEY_URI, null)
        val validSaf = uriStr != null &&
            EndpointSecurityPolicy.validateSafDocumentUriString(uriStr, context.packageName)
        val hasPerm = validSaf && hasPersistedWritePermission(uriStr!!)
        call.resolve(buildStatusObject(hasPerm))
    }

    @PluginMethod
    fun disableAutoBackup(call: PluginCall) {
        val prefs = getPrefs()
        val uriStr = prefs.getString(KEY_URI, null)
        if (!uriStr.isNullOrBlank()) {
            try {
                context.contentResolver.releasePersistableUriPermission(
                    Uri.parse(uriStr),
                    Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_GRANT_WRITE_URI_PERMISSION
                )
            } catch (_: Exception) {
                // Ignore if already released or provider doesn't persist
            }
        }
        val lastTs = prefs.getLong(KEY_LAST_BACKUP_TS, 0L)
        prefs.edit()
            .putBoolean(KEY_ENABLED, false)
            .remove(KEY_URI)
            .remove(KEY_DISPLAY_NAME)
            .remove(KEY_PROVIDER_LABEL)
            .apply()

        call.resolve(
            JSObject().apply {
                put("enabled", false)
                put("uri", JSONObject.NULL)
                put("displayName", JSONObject.NULL)
                put("providerLabel", JSONObject.NULL)
                put("hasPersistedPermission", false)
                put("lastBackupTimestamp", lastTs)
            }
        )
    }

    @PluginMethod
    fun shareManualBackup(call: PluginCall) {
        val data = call.getString("data")
        if (data.isNullOrEmpty()) {
            call.reject("Missing .zbak payload to share.", "INVALID_DATA")
            return
        }
        val fileName = EndpointSecurityPolicy.sanitizeBackupFileName(
            call.getString("fileName"),
            EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        )

        ioExecutor.execute {
            try {
                val backupDir = File(context.cacheDir, "backups")
                if (!backupDir.exists()) backupDir.mkdirs()
                val outFile = File(backupDir, fileName)
                if (!outFile.canonicalPath.startsWith(backupDir.canonicalPath)) {
                    throw SecurityException("Invalid backup output path.")
                }
                outFile.writeText(data, Charsets.UTF_8)

                val contentUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    outFile
                )
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/octet-stream"
                    putExtra(Intent.EXTRA_STREAM, contentUri)
                    putExtra(Intent.EXTRA_SUBJECT, "Zero-Distractions Cloud Backup ($fileName)")
                    putExtra(
                        Intent.EXTRA_TEXT,
                        "Zero App signed focus backup ($fileName). Save to Google Drive, OneDrive, JioDrive, or Files."
                    )
                    clipData = android.content.ClipData.newUri(context.contentResolver, fileName, contentUri)
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }

                val chooser = Intent.createChooser(
                    sendIntent,
                    "Save or Upload $fileName to Cloud"
                ).apply {
                    addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
                }
                val act = activity
                if (act == null) {
                    call.reject("Activity unavailable to open Share sheet.", "SHARE_FAILED")
                    return@execute
                }
                act.runOnUiThread {
                    try {
                        act.startActivity(chooser)
                        val ts = System.currentTimeMillis()
                        getPrefs().edit().putLong(KEY_LAST_BACKUP_TS, ts).apply()
                        call.resolve(
                            JSObject().apply {
                                put("ok", true)
                                put("timestamp", ts)
                                put("fileName", fileName)
                            }
                        )
                    } catch (e: Exception) {
                        call.reject("Unable to launch Share sheet: ${e.localizedMessage}", "SHARE_FAILED")
                    }
                }
            } catch (e: Exception) {
                call.reject("Failed preparing $fileName for upload: ${e.localizedMessage}", "SHARE_FAILED")
            }
        }
    }

    @PluginMethod
    fun pickAndReadBackupFile(call: PluginCall) {
        val security = AppSecurityGuard.evaluateEnvironment(context)
        if (security.backupRestoreDisabled) {
            call.reject(
                "Backup restore is disabled on rooted devices, test-keys ROMs, or debug emulators to protect Zero App integrity.",
                "SECURITY_RESTRICTED"
            )
            return
        }
        val intent = Intent(Intent.ACTION_OPEN_DOCUMENT).apply {
            addCategory(Intent.CATEGORY_OPENABLE)
            type = "*/*"
            putExtra(
                Intent.EXTRA_MIME_TYPES,
                arrayOf("application/octet-stream", "application/json", "text/plain", "*/*")
            )
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        startActivityForResult(call, intent, "handlePickBackupFileResult")
    }

    @ActivityCallback
    private fun handlePickBackupFileResult(call: PluginCall?, result: ActivityResult) {
        if (call == null) return
        val security = AppSecurityGuard.evaluateEnvironment(context)
        if (security.backupRestoreDisabled) {
            call.reject(
                "Backup restore is disabled on rooted devices, test-keys ROMs, or debug emulators to protect Zero App integrity.",
                "SECURITY_RESTRICTED"
            )
            return
        }
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            call.reject("Cloud backup file selection cancelled.", "CANCELLED")
            return
        }

        val uriStr = uri.toString()
        if (!EndpointSecurityPolicy.validateSafDocumentUriString(uriStr, context.packageName)) {
            call.reject(
                "Blocked non-SAF backup restore URI. Select a file via Google Drive, OneDrive, JioDrive, or Files.",
                "UNTRUSTED_URI"
            )
            return
        }

        val fileName = EndpointSecurityPolicy.sanitizeBackupFileName(
            resolveDisplayName(uri),
            EndpointSecurityPolicy.DEFAULT_BACKUP_FILE_NAME
        )
        ioExecutor.execute {
            try {
                val content = context.contentResolver.openInputStream(uri)?.use { stream ->
                    val bytes = stream.readBytes()
                    if (bytes.size > MAX_RESTORE_BYTES) {
                        throw IllegalArgumentException("Selected file exceeds 10 MB backup limit.")
                    }
                    bytes.toString(Charsets.UTF_8)
                } ?: throw IllegalStateException("Unable to open selected backup file stream.")

                call.resolve(
                    JSObject().apply {
                        put("data", content)
                        put("fileName", fileName)
                        put("uri", uriStr)
                        put("providerLabel", EndpointSecurityPolicy.resolveSafProviderLabel(uri.authority))
                    }
                )
            } catch (e: Exception) {
                call.reject("Could not read backup file: ${e.localizedMessage}", "READ_FAILED")
            }
        }
    }

    private fun writeContentToUri(uri: Uri, content: String): Int {
        if (uri.scheme?.lowercase() != ContentResolver.SCHEME_CONTENT) {
            throw SecurityException("Only SAF content:// destinations are permitted for backup writes.")
        }
        val bytes = content.toByteArray(Charsets.UTF_8)
        val cr = context.contentResolver
        val stream: OutputStream = try {
            cr.openOutputStream(uri, "wt") ?: cr.openOutputStream(uri, "w")
        } catch (_: IllegalArgumentException) {
            cr.openOutputStream(uri, "w")
        } catch (_: UnsupportedOperationException) {
            cr.openOutputStream(uri, "w")
        } ?: throw IllegalStateException("Could not open cloud document output stream.")

        stream.use { out ->
            out.write(bytes)
            out.flush()
        }
        return bytes.size
    }

    private fun hasPersistedWritePermission(uriStr: String): Boolean {
        return try {
            context.contentResolver.persistedUriPermissions.any {
                it.uri.toString() == uriStr && it.isWritePermission
            }
        } catch (_: Exception) {
            false
        }
    }

    private fun resolveDisplayName(uri: Uri): String? {
        return try {
            context.contentResolver.query(
                uri,
                arrayOf(OpenableColumns.DISPLAY_NAME),
                null,
                null,
                null
            )?.use { cursor ->
                if (cursor.moveToFirst()) {
                    val idx = cursor.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (idx >= 0) cursor.getString(idx) else null
                } else null
            }
        } catch (_: Exception) {
            uri.lastPathSegment
        }
    }

    private fun buildStatusObject(hasPersistedPermission: Boolean): JSObject {
        val prefs = getPrefs()
        val enabled = prefs.getBoolean(KEY_ENABLED, false)
        val uri = prefs.getString(KEY_URI, null)
        val validUri = uri?.takeIf {
            EndpointSecurityPolicy.validateSafDocumentUriString(it, context.packageName)
        }
        val displayName = prefs.getString(KEY_DISPLAY_NAME, null)
        val providerLabel = prefs.getString(KEY_PROVIDER_LABEL, null)
        val lastTs = prefs.getLong(KEY_LAST_BACKUP_TS, 0L)

        return JSObject().apply {
            put("enabled", enabled && validUri != null)
            put("uri", validUri ?: JSONObject.NULL)
            put("displayName", displayName ?: JSONObject.NULL)
            put("providerLabel", providerLabel ?: JSONObject.NULL)
            put("hasPersistedPermission", validUri != null && hasPersistedPermission)
            put("lastBackupTimestamp", lastTs)
        }
    }
}
