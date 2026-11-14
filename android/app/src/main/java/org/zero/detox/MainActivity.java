package org.zero.detox;

import android.Manifest;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Process;
import android.util.Log;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.FrameLayout;
import androidx.appcompat.app.AlertDialog;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.getcapacitor.BridgeActivity;
import com.getcapacitor.BridgeWebViewClient;
import java.io.ByteArrayInputStream;
import java.util.Collections;
import org.zero.detox.bridge.ZeroNativeBridge;
import org.zero.detox.core.EndpointSecurityPolicy;
import org.zero.detox.core.LockEngine;
import org.zero.detox.data.BagStore;
import org.zero.detox.data.ParachuteStore;
import org.zero.detox.plugin.CloudAutoBackupPlugin;
import org.zero.detox.plugin.ZeroEngagePlugin;
import org.zero.detox.security.AppSecurityGuard;

public class MainActivity extends BridgeActivity {
    private static final String PREFS_ONBOARDING = "zero_onboarding_prefs";
    private static final String KEY_NOTIF_PROMPTED = "notif_prompted_once";
    private static final int REQ_NOTIFICATIONS = 1001;

    private ZeroNativeBridge nativeBridge;
    private boolean signatureVerified = false;
    private boolean tamperDialogShown = false;

    private void ensureNativeBridge() {
        if (!signatureVerified || nativeBridge != null) return;
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
        if (!signatureVerified) {
            return;
        }
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
            if (getBridge() != null && getBridge().getWebView() != null) {
                WebView webView = getBridge().getWebView();
                if (nativeBridge != null) {
                    webView.addJavascriptInterface(nativeBridge, "ZeroNative");
                }
                hardenWebViewSecurity(webView);
            }
        } catch (Throwable t) {
            Log.e("ZeroMainActivity", "Post-load ZeroNative attach failed", t);
        }
    }

    private void hardenWebViewSecurity(WebView webView) {
        WebSettings settings = webView.getSettings();
        settings.setAllowFileAccess(false);
        settings.setAllowFileAccessFromFileURLs(false);
        settings.setAllowUniversalAccessFromFileURLs(false);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setGeolocationEnabled(false);

        if (getBridge() != null) {
            getBridge().setWebViewClient(new BridgeWebViewClient(getBridge()) {
                @Override
                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                    Uri reqUri = request != null ? request.getUrl() : null;
                    String urlStr = reqUri != null ? reqUri.toString() : "";
                    if (!EndpointSecurityPolicy.isAllowedWebViewRequestUrl(urlStr)) {
                        return new WebResourceResponse(
                            "text/plain",
                            "utf-8",
                            403,
                            "Blocked by ZERO Security Policy",
                            Collections.emptyMap(),
                            new ByteArrayInputStream(new byte[0])
                        );
                    }
                    return super.shouldInterceptRequest(view, request);
                }

                @Override
                public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                    Uri target = request != null ? request.getUrl() : null;
                    if (target == null) return true;
                    String scheme = target.getScheme() != null ? target.getScheme().toLowerCase() : "";
                    String host = target.getHost() != null ? target.getHost().toLowerCase() : "";

                    if ("https".equals(scheme) && EndpointSecurityPolicy.CAPACITOR_LOCAL_ORIGIN_HOST.equals(host)) {
                        return super.shouldOverrideUrlLoading(view, request);
                    }

                    EndpointSecurityPolicy.ValidatedExternalTarget validated =
                        EndpointSecurityPolicy.parseAndValidateExternalUrl(target.toString());
                    if (validated == null) {
                        Log.w("ZeroMainActivity", "Blocked unapproved external navigation: " + target);
                        return true;
                    }

                    if ("mailto".equals(validated.getScheme())) {
                        try {
                            String email = EndpointSecurityPolicy.OFFICIAL_SUPPORT_EMAIL;
                            Intent mailIntent = new Intent(Intent.ACTION_SENDTO);
                            mailIntent.setData(Uri.parse("mailto:" + email));
                            mailIntent.putExtra(Intent.EXTRA_EMAIL, new String[] { email });
                            if (validated.getMailtoSubject() != null && !validated.getMailtoSubject().isEmpty()) {
                                mailIntent.putExtra(Intent.EXTRA_SUBJECT, validated.getMailtoSubject());
                            }
                            mailIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(mailIntent);
                        } catch (Throwable ignored) {}
                        return true;
                    }

                    if ("upi".equals(validated.getScheme())) {
                        try {
                            Intent upiIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(validated.getNormalizedUrl()));
                            upiIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(Intent.createChooser(upiIntent, "Pay via UPI"));
                        } catch (Throwable t) {
                            Log.e("ZeroMainActivity", "Failed to launch UPI intent", t);
                        }
                        return true;
                    }

                    if ("https".equals(validated.getScheme())) {
                        try {
                            Intent browserIntent = new Intent(Intent.ACTION_VIEW, Uri.parse(validated.getNormalizedUrl()));
                            browserIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                            startActivity(browserIntent);
                        } catch (Throwable t) {
                            Log.e("ZeroMainActivity", "Failed to launch browser intent", t);
                        }
                        return true;
                    }

                    return super.shouldOverrideUrlLoading(view, request);
                }
            });
        }
    }

    @Override
    public void onCreate(Bundle savedInstanceState) {
        signatureVerified = AppSecurityGuard.isAppSignatureValid(this);
        if (signatureVerified) {
            registerPlugin(CloudAutoBackupPlugin.class);
            registerPlugin(ZeroEngagePlugin.class);
            registerPlugin(ZeroBridgePlugin.class);
        }
        super.onCreate(savedInstanceState);
        if (!signatureVerified) {
            showTamperAlertAndTerminate();
            return;
        }
        requestStartupNotificationPermissionOnce();
    }

    private void showTamperAlertAndTerminate() {
        Log.e("ZeroMainActivity", "APK signature verification failed. Blocking startup and terminating.");
        try {
            FrameLayout blackScreen = new FrameLayout(this);
            blackScreen.setBackgroundColor(Color.BLACK);
            setContentView(blackScreen);
        } catch (Throwable ignored) {}

        if (tamperDialogShown) {
            return;
        }
        tamperDialogShown = true;

        try {
            new AlertDialog.Builder(this)
                .setTitle("Security Tamper Alert")
                .setMessage(
                    "Zero-Distractions detected an unauthorized APK signature modification or cloned package.\n\n"
                        + "For your safety and integrity protection, modified or re-signed APKs cannot run. "
                        + "Install the official release only from GitHub Releases (MDYOUSUF20007-oss/ZERO)."
                )
                .setCancelable(false)
                .setPositiveButton("Exit Zero App", (dialog, which) -> terminateApplication())
                .setOnDismissListener(dialog -> terminateApplication())
                .show();
        } catch (Throwable t) {
            terminateApplication();
            return;
        }

        // Guarantee termination even if dialog presentation is suppressed on headless/restricted hosts
        new Handler(Looper.getMainLooper()).postDelayed(this::terminateApplication, 15000L);
    }

    private void terminateApplication() {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                finishAndRemoveTask();
            }
            finishAffinity();
        } catch (Throwable ignored) {}
        Process.killProcess(Process.myPid());
        System.exit(1);
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
        if (!signatureVerified || !AppSecurityGuard.isAppSignatureValid(this)) {
            signatureVerified = false;
            showTamperAlertAndTerminate();
            return;
        }
        dispatchPermissionRefreshToJs();
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        dispatchPermissionRefreshToJs();
    }
}
