package org.zero.detox.ui

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import org.zero.detox.MainActivity

/**
 * TheVoidActivity:
 * Trampoline activity for backward compatibility with Android intents & services.
 * Forwards immediately to MainActivity (which renders the unified, themed React TheVoidView)
 * so that an old native screen never overlaps the modern, fully customized focus view.
 */
class TheVoidActivity : AppCompatActivity() {

    companion object {
        @JvmField
        @Volatile
        var isInForeground: Boolean = false

        @JvmField
        @Volatile
        var dialerGraceUntilElapsed: Long = 0L

        @JvmField
        @Volatile
        var bagLaunchGraceUntilElapsed: Long = 0L

        @JvmField
        @Volatile
        var activeBagPackage: String? = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val mainIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_NEW_TASK or
                    Intent.FLAG_ACTIVITY_CLEAR_TOP or
                    Intent.FLAG_ACTIVITY_SINGLE_TOP or
                    Intent.FLAG_ACTIVITY_REORDER_TO_FRONT
        }
        startActivity(mainIntent)
        finish()
    }

    override fun onResume() {
        super.onResume()
        finish()
    }
}
