package org.zero.detox.receiver

import android.app.admin.DeviceAdminReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

/**
 * ZeroDeviceAdminReceiver:
 * Allows Zero to enforce OS-level Kiosk LockTaskMode without system exit prompts
 * when provisioned as Device Owner.
 */
class ZeroDeviceAdminReceiver : DeviceAdminReceiver() {
    override fun onEnabled(context: Context, intent: Intent) {
        super.onEnabled(context, intent)
        Log.i("ZeroAdmin", "Device Admin enabled.")
    }

    override fun onDisabled(context: Context, intent: Intent) {
        super.onDisabled(context, intent)
        Log.w("ZeroAdmin", "Device Admin disabled.")
    }
}
