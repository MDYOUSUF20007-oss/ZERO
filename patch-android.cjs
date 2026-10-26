const fs = require('fs');
const path = require('path');

const javaDir = path.join(__dirname, 'android/app/src/main/java/com/blockitzero/app');
const xmlDir = path.join(__dirname, 'android/app/src/main/res/xml');
const manifestPath = path.join(__dirname, 'android/app/src/main/AndroidManifest.xml');

fs.mkdirSync(javaDir, { recursive: true });
fs.mkdirSync(xmlDir, { recursive: true });

// 1. Write BlockitAccessibilityService.java
fs.writeFileSync(path.join(javaDir, 'BlockitAccessibilityService.java'), `package com.blockitzero.app;

import android.accessibilityservice.AccessibilityService;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.Looper;
import android.view.accessibility.AccessibilityEvent;

public class BlockitAccessibilityService extends AccessibilityService {
    public static volatile boolean isLocked = false;
    public static BlockitAccessibilityService instance;
    private long lastLockTimestamp = 0;
    private final Handler handler = new Handler(Looper.getMainLooper());

    @Override
    protected void onServiceConnected() {
        super.onServiceConnected();
        instance = this;
    }

    @Override
    public boolean onUnbind(Intent intent) {
        instance = null;
        isLocked = false;
        return super.onUnbind(intent);
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        if (!isLocked || event == null || event.getPackageName() == null) return;

        String pkg = event.getPackageName().toString().toLowerCase();
        String myPkg = getPackageName().toLowerCase();

        // Allow our own app, system UI/lockscreen, keyboards, and emergency calls/dialer
        if (pkg.equals(myPkg) ||
            pkg.equals("com.android.systemui") ||
            pkg.contains("inputmethod") ||
            pkg.contains("keyboard") ||
            pkg.contains("dialer") ||
            pkg.contains("incallui") ||
            pkg.contains("telecom") ||
            pkg.contains("permissioncontroller")) {
            return;
        }

        // 1.5-second debounce so a single Home press doesn't queue multiple screen-off loops
        long now = System.currentTimeMillis();
        if (now - lastLockTimestamp < 1500) {
            return;
        }
        lastLockTimestamp = now;

        // Step 1: Bring Blockit Zero back to the foreground FIRST
        Intent lockIntent = new Intent(this, MainActivity.class);
        lockIntent.addFlags(
            Intent.FLAG_ACTIVITY_NEW_TASK |
            Intent.FLAG_ACTIVITY_REORDER_TO_FRONT |
            Intent.FLAG_ACTIVITY_SINGLE_TOP |
            Intent.FLAG_ACTIVITY_CLEAR_TOP
        );
        startActivity(lockIntent);

        // Step 2: Wait 250ms for Blockit Zero to be the active window, then turn off the screen
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            handler.postDelayed(() -> {
                if (isLocked) {
                    performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
                }
            }, 250);
        }
    }

    public void lockHardwareScreenNow() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
            performGlobalAction(GLOBAL_ACTION_LOCK_SCREEN);
        }
    }

    @Override
    public void onInterrupt() {}
}
`);

// 2. Write MainActivity.java
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), `package com.blockitzero.app;

import android.content.Intent;
import android.os.Bundle;
import android.provider.Settings;
import android.webkit.JavascriptInterface;
import androidx.activity.OnBackPressedCallback;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        this.getBridge().getWebView().addJavascriptInterface(new Object() {
            @JavascriptInterface
            public boolean isAccessibilityEnabled() {
                return BlockitAccessibilityService.instance != null;
            }

            @JavascriptInterface
            public void openAccessibilitySettings() {
                runOnUiThread(() -> {
                    Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
                    intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                    startActivity(intent);
                });
            }

            @JavascriptInterface
            public void setLockState(boolean locked) {
                BlockitAccessibilityService.isLocked = locked;
            }

            @JavascriptInterface
            public void turnScreenOff() {
                if (BlockitAccessibilityService.instance != null) {
                    BlockitAccessibilityService.instance.lockHardwareScreenNow();
                }
            }
        }, "BlockitNative");

        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (!BlockitAccessibilityService.isLocked) {
                    setEnabled(false);
                    getOnBackPressedDispatcher().onBackPressed();
                    setEnabled(true);
                }
            }
        });
    }
}
`);

// 3. Write accessibility_service_config.xml
fs.writeFileSync(path.join(xmlDir, 'accessibility_service_config.xml'), `<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canRetrieveWindowContent="false"
    android:notificationTimeout="50" />
`);

// 4. Register service inside AndroidManifest.xml
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('BlockitAccessibilityService')) {
  const serviceBlock = `
        <service
            android:name=".BlockitAccessibilityService"
            android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
            android:exported="true">
            <intent-filter>
                <action android:name="android.accessibilityservice.AccessibilityService" />
            </intent-filter>
            <meta-data
                android:name="android.accessibilityservice"
                android:resource="@xml/accessibility_service_config" />
        </service>
    </application>`;
  manifest = manifest.replace('</application>', serviceBlock);
  fs.writeFileSync(manifestPath, manifest);
}
console.log('✅ Audited Native Android Hardware Lock injected successfully!');
