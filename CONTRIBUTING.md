# Contributing to ZERO

Thank you for helping improve ZERO — a 100% free, open-source digital detox application built to protect human focus and agency without paywalls, ads, or trackers.

Contributors are warmly welcome to propose improvements in:
- UI polish, layouts, animations, and responsive design
- Live **Theme Studio** presets & color accessibility
- Preset occasion Bags, non-bypass UX copy, translations, and documentation

---

## Productivity Integrity Policy (Mandatory)

ZERO's value depends on strict, tamper-resistant phone blockage and honest discipline accounting. Every Pull Request is automatically audited by `node scripts/verify-integrity.mjs`, Code Owners (`@MDYOUSUF20007-oss`), and Android/TypeScript unit suites.

**Pull Requests violating ANY of the following rules will be automatically rejected:**

1. **No Lock Bypasses or Timer Skips:**
   - Do not add `skipTimer`, `fastForwardSeconds`, `bypassLock`, debug unlock buttons, or early exit switches for `TheVoidActivity`, `LockForegroundService`, `ZeroAccessibilityService`, or `BootReceiver`.
   - Do not whitelist `com.android.settings` or Android package installers (`com.android.packageinstaller`, `com.google.android.packageinstaller`, `com.samsung.android.packageinstaller`) inside `BagStore`, `LockForegroundService`, or `ZeroAccessibilityService`.
   - Do not weaken `ZeroAccessibilityService` notification shade, Quick Settings, Recents, or app blocking during an active lock.

2. **Monotonic Clock & Verified Native Completion Only:**
   - Active lock duration on Android MUST be measured via Android's monotonic clock (`SystemClock.elapsedRealtime()`) inside `LockEngine.kt`.
   - Focus minutes inside `src/core/integrity/IntegrityEngine.ts` MUST only increment from verified native completion events signed with `SystemClock.elapsedRealtime()` proof when running on Android (or monotonic `performance.now()` strictly for non-native web previews).

3. **No Debug Stat Injectors or Direct Protected State Writes:**
   - Do not expose setter helpers (such as `addFakeHours()`, `setStats()`, `setCumulativeSeconds()`, `setBonusParachutes()`, or `setIsZeroSupporter()`) to UI components or React hooks.
   - Never bypass `IntegrityEngine` with direct `localStorage` mutations on focus stats, sessions, Emergency Escape Ticket balances, donor perks, or `.zbak` HMAC checks.

4. **Release Security, R8 Obfuscation & Update Continuity:**
   - Never add `android:debuggable="true"` to any `AndroidManifest.xml` or enable `debuggable true` on release `buildTypes` in `android/app/build.gradle`.
   - Keep `minifyEnabled true`, `shrinkResources true`, `proguard-android-optimize.txt`, and `proguard-rules.pro` enabled on release builds in `android/app/build.gradle`.
   - Never bypass or weaken runtime APK signing certificate verification (`AppSecurityGuard.isAppSignatureValid`) or root/emulator feature restrictions (`backupRestoreDisabled` / `presetBagEditingDisabled`), and never add a `FLAG_DEBUGGABLE` exemption.
   - Never alter `applicationId "org.zero.detox"`, strip V1+V2+V3 signing flags, or replace the official release signing workflow so users always receive seamless in-place APK updates.

5. **No Data Exfiltration or Endpoint Tampering:**
   - All Cloud Auto-Backup writes must strictly use OS-granted Android SAF `content://` URIs (`ACTION_CREATE_DOCUMENT`, `ACTION_OPEN_DOCUMENT`, `ACTION_SEND` `FileProvider`). Never add dynamic upload URLs, webhooks, HTTP clients, `fetch()`, `XMLHttpRequest`, `WebSocket`, or `navigator.sendBeacon()`.
   - Never weaken `android/app/src/main/res/xml/network_security_config.xml` (`cleartextTrafficPermitted="false"`), `index.html` Content-Security-Policy (`connect-src`, `form-action`), or `EndpointSecurityPolicy.kt` destination allowlists (support `mailto:mdyousuf982007@proton.me`, `ko-fi.com/mdyousuf2620`, `github.com/MDYOUSUF20007-oss/ZERO`).

---

## Local Verification Before Opening a PR

Run all checks locally before pushing:

```bash
node scripts/verify-integrity.mjs
npm test
npm run lint
npm run build
```

Changes touching protected directories (`/android/app/src/main/java/**`, `/android/app/src/strict/java/**`, `/src/core/integrity/**`, `/.github/workflows/**`) require explicit review from `@MDYOUSUF20007-oss` via `.github/CODEOWNERS`.
