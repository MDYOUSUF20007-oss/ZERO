package org.zero.detox.plugin

import android.app.Activity
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
import java.io.File
import java.io.OutputStream
import java.util.concurrent.Executors

/**
 * CloudAutoBackupPlugin:
 * 100% serverless Capacitor plugin for Universal Cloud Auto-Backup using Android SAF
 * (Google Drive, Microsoft OneDrive, JioDrive/JioCloud, Dropbox, or Local Storage).
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
        val fileName = call.getString("fileName")
            ?.takeIf { it.isNotBlank() }
            ?: "zero-backup.zbak"

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

        val displayName = resolveDisplayName(resultUri) ?: "zero-backup.zbak"
        val providerLabel = detectProviderLabel(resultUri)
        val persistedNow = hasPersistedWritePermission(resultUri.toString())

        getPrefs().edit()
            .putBoolean(KEY_ENABLED, true)
            .putString(KEY_URI, resultUri.toString())
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
        val uriString = call.getString("uri")?.takeIf { it.isNotBlank() }
            ?: prefs.getString(KEY_URI, null)

        if (uriString.isNullOrBlank()) {
            call.reject("No persisted cloud backup URI configured.", "NO_URI")
            return
        }

        val uri = try {
            Uri.parse(uriString)
        } catch (e: Exception) {
            call.reject("Invalid persisted backup URI: ${e.localizedMessage}", "INVALID_URI")
            return
        }

        val displayName = prefs.getString(KEY_DISPLAY_NAME, "zero-backup.zbak") ?: "zero-backup.zbak"
        val providerLabel = prefs.getString(KEY_PROVIDER_LABEL, detectProviderLabel(uri))
            ?: detectProviderLabel(uri)

        ioExecutor.execute {
            try {
                val bytesWritten = writeContentToUri(uri, data)
                val ts = System.currentTimeMillis()
                prefs.edit().putLong(KEY_LAST_BACKUP_TS, ts).apply()

                call.resolve(
                    JSObject().apply {
                        put("ok", true)
                        put("timestamp", ts)
                        put("uri", uriString)
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
        val hasPerm = uriStr != null && hasPersistedWritePermission(uriStr)
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
        val fileName = call.getString("fileName")
            ?.takeIf { it.isNotBlank() }
            ?: "zero-backup.zbak"

        ioExecutor.execute {
            try {
                val backupDir = File(context.cacheDir, "backups")
                if (!backupDir.exists()) backupDir.mkdirs()
                val outFile = File(backupDir, fileName)
                outFile.writeText(data, Charsets.UTF_8)

                val contentUri = FileProvider.getUriForFile(
                    context,
                    "${context.packageName}.fileprovider",
                    outFile
                )
                val sendIntent = Intent(Intent.ACTION_SEND).apply {
                    type = "application/octet-stream"
                    putExtra(Intent.EXTRA_STREAM, contentUri)
                    putExtra(Intent.EXTRA_SUBJECT, "ZERO Cloud Backup ($fileName)")
                    putExtra(
                        Intent.EXTRA_TEXT,
                        "ZERO signed focus backup ($fileName). Save to Google Drive, OneDrive, JioDrive, or Files."
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
        val uri = result.data?.data
        if (result.resultCode != Activity.RESULT_OK || uri == null) {
            call.reject("Cloud backup file selection cancelled.", "CANCELLED")
            return
        }

        val fileName = resolveDisplayName(uri) ?: "zero-backup.zbak"
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
                        put("uri", uri.toString())
                        put("providerLabel", detectProviderLabel(uri))
                    }
                )
            } catch (e: Exception) {
                call.reject("Could not read backup file: ${e.localizedMessage}", "READ_FAILED")
            }
        }
    }

    private fun writeContentToUri(uri: Uri, content: String): Int {
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

    private fun detectProviderLabel(uri: Uri): String {
        val auth = (uri.authority ?: "").lowercase()
        return when {
            auth.contains("google.android.apps.docs") -> "Google Drive"
            auth.contains("onedrive") || auth.contains("skydrive") -> "Microsoft OneDrive"
            auth.contains("jio") -> "JioDrive / JioCloud"
            auth.contains("dropbox") -> "Dropbox"
            auth.contains("nextcloud") || auth.contains("owncloud") -> "Nextcloud / OwnCloud"
            auth.contains("externalstorage") || auth.contains("downloads") || auth.contains("media") ->
                "Device Storage"
            else -> "Cloud Storage"
        }
    }

    private fun buildStatusObject(hasPersistedPermission: Boolean): JSObject {
        val prefs = getPrefs()
        val enabled = prefs.getBoolean(KEY_ENABLED, false)
        val uri = prefs.getString(KEY_URI, null)
        val displayName = prefs.getString(KEY_DISPLAY_NAME, null)
        val providerLabel = prefs.getString(KEY_PROVIDER_LABEL, null)
        val lastTs = prefs.getLong(KEY_LAST_BACKUP_TS, 0L)

        return JSObject().apply {
            put("enabled", enabled && !uri.isNullOrBlank())
            put("uri", uri ?: JSONObject.NULL)
            put("displayName", displayName ?: JSONObject.NULL)
            put("providerLabel", providerLabel ?: JSONObject.NULL)
            put("hasPersistedPermission", hasPersistedPermission)
            put("lastBackupTimestamp", lastTs)
        }
    }
}
