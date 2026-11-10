package org.zero.detox;

import android.Manifest;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.WebView;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import org.zero.detox.bridge.ZeroNativeBridge;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.BagStore;
import org.zero.detox.data.ParachuteStore;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_ONBOARDING = "zero_onboarding_prefs";
    private static final String KEY_NOTIF_PROMPTED = "notif_prompted_once";
    private static final int REQ_NOTIFICATIONS = 1001;

    private ZeroNativeBridge nativeBridge;

    private void ensureNativeBridge() {
        if (nativeBridge != null) return;
        try {
            ParachuteStore parachuteStore = new ParachuteStore(this);
            BagStore bagStore = new BagStore(this);
            LockEngine lockEngine = new LockEngine(this, parachuteStore);
            nativeBridge = new ZeroNativeBridge(this, lockEngine, parachuteStore, bagStore);
        } catch (Throwable t) {
            Log.e("ZeroMainActivity", "Failed to create ZeroNativeBridge", t);
        }
    }

    @Override
    protected void load() {
        ensureNativeBridge();
        try {
            WebView rawWebView = findViewById(com.getcapacitor.android.R.id.webview);
            if (rawWebView != null && nativeBridge != null) {
                rawWebView.addJavascriptInterface(nativeBridge, "ZeroNative");
            }
        } catch (Throwable t) {
            Log.e("ZeroMainActivity", "Pre-load ZeroNative attach failed", t);
        }

        super.load();

        try {
            if (getBridge() != null && getBridge().getWebView() != null && nativeBridge != null) {
                getBridge().getWebView().addJavascriptInterface(nativeBridge, "ZeroNative");
            }
        } catch (Throwable t) {
            Log.e("ZeroMainActivity", "Post-load ZeroNative attach failed", t);
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestStartupNotificationPermissionOnce();
    }

    private void requestStartupNotificationPermissionOnce() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) return;
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS)
                == PackageManager.PERMISSION_GRANTED) {
            return;
        }
        SharedPreferences prefs = getSharedPreferences(PREFS_ONBOARDING, MODE_PRIVATE);
        if (!prefs.getBoolean(KEY_NOTIF_PROMPTED, false)) {
            prefs.edit().putBoolean(KEY_NOTIF_PROMPTED, true).apply();
            ActivityCompat.requestPermissions(
                this,
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                REQ_NOTIFICATIONS
            );
        }
    }

    private void dispatchPermissionRefreshToJs() {
        try {
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                Runnable emit = () -> {
                    try {
                        webView.evaluateJavascript(
                            "window.dispatchEvent(new Event('zero-permissions-updated'))",
                            null
                        );
                    } catch (Throwable ignored) {}
                };
                webView.post(emit);
                webView.postDelayed(emit, 180L);
            }
        } catch (Throwable ignored) {}
    }

    @Override
    public void onResume() {
        super.onResume();
        dispatchPermissionRefreshToJs();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        dispatchPermissionRefreshToJs();
    }
}
