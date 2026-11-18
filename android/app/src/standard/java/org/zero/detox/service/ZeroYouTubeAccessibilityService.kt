package org.zero.detox.service

import android.accessibilityservice.AccessibilityService
import android.os.SystemClock
import android.view.accessibility.AccessibilityEvent

/**
 * ZeroYouTubeAccessibilityService (Standard Edition):
 * Lightweight AccessibilityService scoped strictly to `com.google.android.youtube` so users
 * on the normal Standard APK can enable Official YouTube Shorts blocking and Official YouTube
 * Study Mode directly from Settings -> Accessibility -> Installed apps -> Zero-Noise.
 */
class ZeroYouTubeAccessibilityService : AccessibilityService() {

    private lateinit var youTubeGuard: YouTubeAccessibilityGuard

    override fun onCreate() {
        super.onCreate()
        youTubeGuard = YouTubeAccessibilityGuard(this)
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent?) {
        if (event == null) return
        val pkg = event.packageName?.toString() ?: return
        if (pkg != YouTubeAccessibilityGuard.YOUTUBE_PACKAGE) {
            youTubeGuard.onPackageChanged(pkg)
            return
        }
        youTubeGuard.onYouTubeEvent(this, event, SystemClock.elapsedRealtime())
    }

    override fun onInterrupt() {
        // No persistent overlays held by this lightweight service
    }
}
