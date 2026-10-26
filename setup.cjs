// setup.cjs — Revised & Audited Project + Native Android APK Generator
const fs = require('fs');
const path = require('path');

// 1. Find the original exported .txt file in the root folder
const files = fs.readdirSync(__dirname);
const sourceFile = files.find(f => f.endsWith('.txt'));

if (!sourceFile) {
  console.error('❌ Could not find your exported .txt file in this folder!');
  process.exit(1);
}

console.log(`✅ Found source file: ${sourceFile}`);
let appCode = fs.readFileSync(path.join(__dirname, sourceFile), 'utf8');

// 2. Completely disable the browser "Perimeter Breach" popup AND the 880Hz siren when screen turns off
appCode = appCode.replace(/setBreachWarningOpen\(true\)/g, '/* native lock active */');
appCode = appCode.replace(/soundEngine\.playBreachWarning\(\)/g, '/* siren disabled for native screen-off */');
appCode = appCode.replace(/setBreachCount\(\(c\)\s*=>\s*c\s*\+\s*1\)/g, '/* breach counter disabled */');

// 3. Inject Native Android Hardware Lock Bridge + Screen-Off Clock Sync into App.jsx
const bridgeHook = `
  // --- NATIVE ANDROID HARDWARE LOCK BRIDGE & REAL-TIME CLOCK SYNC ---
  const lockEndTimestampRef = React.useRef(null);

  React.useEffect(() => {
    if (appState === 'LOCKED') {
      if (window.BlockitNative) {
        if (!window.BlockitNative.isAccessibilityEnabled()) {
          window.BlockitNative.openAccessibilitySettings();
          setAppState('IDLE');
          return;
        }
        window.BlockitNative.setLockState(true);
      }
      lockEndTimestampRef.current = Date.now() + remainingSeconds * 1000;
    } else {
      if (window.BlockitNative) {
        window.BlockitNative.setLockState(false);
      }
      lockEndTimestampRef.current = null;
    }
  }, [appState]);

  // Keep timer 100% accurate when phone screen wakes back up from sleep
  React.useEffect(() => {
    const syncClockOnWake = () => {
      if (appState === 'LOCKED' && lockEndTimestampRef.current) {
        const left = Math.max(0, Math.round((lockEndTimestampRef.current - Date.now()) / 1000));
        setRemainingSeconds(left);
      }
    };
    document.addEventListener('visibilitychange', syncClockOnWake);
    window.addEventListener('focus', syncClockOnWake);
    return () => {
      document.removeEventListener('visibilitychange', syncClockOnWake);
      window.removeEventListener('focus', syncClockOnWake);
    };
  }, [appState]);
`;

if (appCode.includes("const [appState, setAppState]")) {
  appCode = appCode.replace(
    /const \[appState,\s*setAppState\]\s*=\s*useState\(['"]IDLE['"]\);/,
    `const [appState, setAppState] = useState('IDLE');\n${bridgeHook}`
  );
}

// Create src/ directory and write patched App.jsx
fs.mkdirSync(path.join(__dirname, 'src'), { recursive: true });
fs.writeFileSync(path.join(__dirname, 'src', 'App.jsx'), appCode);

// 4. Create src/index.css & src/main.jsx
fs.writeFileSync(path.join(__dirname, 'src', 'index.css'), `@import "tailwindcss";\nbody { background: #000; color: #fff; margin: 0; user-select: none; -webkit-user-select: none; }\n`);

fs.writeFileSync(path.join(__dirname, 'src', 'main.jsx'), `import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
`);

// 5. Create index.html, vite.config.js, capacitor.config.json, and package.json
fs.writeFileSync(path.join(__dirname, 'index.html'), `<!DOCTYPE html>
<html lang="en" class="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <title>BLOCKIT // ZERO</title>
  </head>
  <body class="bg-black text-white overflow-hidden select-none">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
`);

fs.writeFileSync(path.join(__dirname, 'vite.config.js'), `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
});
`);

fs.writeFileSync(path.join(__dirname, 'capacitor.config.json'), JSON.stringify({
  appId: "com.blockitzero.app",
  appName: "Blockit Zero",
  webDir: "dist"
}, null, 2));

fs.writeFileSync(path.join(__dirname, 'package.json'), JSON.stringify({
  name: "blockit-zero",
  private: true,
  version: "1.0.0",
  type: "module",
  scripts: {
    dev: "vite",
    build: "vite build"
  },
  dependencies: {
    "@capacitor/android": "^6.0.0",
    "@capacitor/cli": "^6.0.0",
    "@capacitor/core": "^6.0.0",
    "lucide-react": "^0.454.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1"
  },
  devDependencies: {
    "@tailwindcss/vite": "^4.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "tailwindcss": "^4.0.0",
    "vite": "^5.4.8"
  }
}, null, 2));

// 6. Create patch-android.cjs (Injects audited Java Accessibility Hardware Lock)
const patchAndroidScript = `const fs = require('fs');
const path = require('path');

const javaDir = path.join(__dirname, 'android/app/src/main/java/com/blockitzero/app');
const xmlDir = path.join(__dirname, 'android/app/src/main/res/xml');
const manifestPath = path.join(__dirname, 'android/app/src/main/AndroidManifest.xml');

fs.mkdirSync(javaDir, { recursive: true });
fs.mkdirSync(xmlDir, { recursive: true });

// 1. Write BlockitAccessibilityService.java
fs.writeFileSync(path.join(javaDir, 'BlockitAccessibilityService.java'), \`package com.blockitzero.app;

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
\`);

// 2. Write MainActivity.java
fs.writeFileSync(path.join(javaDir, 'MainActivity.java'), \`package com.blockitzero.app;

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
\`);

// 3. Write accessibility_service_config.xml
fs.writeFileSync(path.join(xmlDir, 'accessibility_service_config.xml'), \`<?xml version="1.0" encoding="utf-8"?>
<accessibility-service xmlns:android="http://schemas.android.com/apk/res/android"
    android:accessibilityEventTypes="typeWindowStateChanged"
    android:accessibilityFeedbackType="feedbackGeneric"
    android:accessibilityFlags="flagDefault"
    android:canRetrieveWindowContent="false"
    android:notificationTimeout="50" />
\`);

// 4. Register service inside AndroidManifest.xml
let manifest = fs.readFileSync(manifestPath, 'utf8');
if (!manifest.includes('BlockitAccessibilityService')) {
  const serviceBlock = \`
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
    </application>\`;
  manifest = manifest.replace('</application>', serviceBlock);
  fs.writeFileSync(manifestPath, manifest);
}
console.log('✅ Audited Native Android Hardware Lock injected successfully!');
`;

fs.writeFileSync(path.join(__dirname, 'patch-android.cjs'), patchAndroidScript);

// 7. Create GitHub Actions Cloud APK Builder (Using JDK 21 for Capacitor 6 compatibility)
const workflowDir = path.join(__dirname, '.github', 'workflows');
fs.mkdirSync(workflowDir, { recursive: true });
fs.writeFileSync(path.join(workflowDir, 'build-apk.yml'), `name: Build Blockit Zero APK
on: [push, workflow_dispatch]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - uses: actions/setup-java@v4
        with:
          distribution: 'temurin'
          java-version: 21
      - name: Install & Build Web Bundle
        run: |
          npm install
          npm run build
      - name: Generate & Patch Native Android Project
        run: |
          if [ ! -d "android" ]; then npx cap add android; fi
          npx cap sync android
          node patch-android.cjs
      - name: Compile Debug APK
        run: |
          cd android
          chmod +x gradlew
          ./gradlew assembleDebug
      - name: Upload Ready-to-Install APK
        uses: actions/upload-artifact@v4
        with:
          name: Blockit-Zero-APK
          path: android/app/build/outputs/apk/debug/app-debug.apk
`);

console.log('🚀 Audited project files regenerated! Ready for GitHub.');
