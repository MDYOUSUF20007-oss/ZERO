# Zero-Noise Releases & Changelog

All official release packages, cryptographic hashes, and version changelogs for **Zero-Noise (Zero App)**.

Official binaries are hosted directly on **[GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases)**.

---

## Release Matrix

| Version | Status | Release Date | Package Name | Android Support | Recommended For |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **v1.0.0** | **Latest Stable** | Nov 2026 | `ZERO-Noise-v1.0.0.apk` | Android 8.0 – 16+ | Direct install without ADB. Usage Access + Display Over Other Apps. |
| **v1.0.0 (Strict)** | **Latest Stable** | Nov 2026 | `ZERO-Noise-strict-adb-v1.0.0.apk` | Android 8.0 – 16+ | Maximum discipline. Blocks notifications, Quick Settings, Recents & Settings via Accessibility. |

- **Official Release Channel:** [https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases)
- **Release Certificate SHA-256:** `A1:4A:36:...CE:11` (V1 + V2 + V3 in-place upgrades guaranteed)

---

## v1.0.0 — Zero-Noise Major Edition (Latest)

### 🌟 Headline Highlights

#### 1. Flexible 10-Minute Hourly Pomodoro Break
- **Freedom on Your Schedule:** Take a 10-minute break every hour on your own timing during long focus blocks.
- **Total Device Freedom:** During the 10-minute window, the phone blockade is temporarily suspended—open and use any app freely.
- **Auto-Re-Arm with Zen Chime:** A live countdown header and soothing Zen bowl chime notify you when break time ends, smoothly locking the phone back into The Void.

#### 2. Phase 2 Unlimited Occasion Bags & Granular App Quotas
- **Unlimited Custom Bags:** Create dedicated bags (`Work`, `Study`, `Coding`, `Exams`, `Family`, `Night`).
- **Granular Per-App Quotas:** Configure specific daily limits (`15m`, `30m`, `1h`) per application.
- **Short-Video Intercept Actions:** Intercept doomscrolling with configurable actions (`back_action`, `overlay`, `hard_block`) and scroll velocity throttling.

#### 3. Aetherial Focus Minimal Mesh
- **Minimal Living Canvas:** Stripped unnecessary mesh clutter in Aetherial Focus. Tuned to a clean, organic fluid mesh drift that provides subtle depth without visual mess.

#### 4. Rebranding & Visual Polish
- Official rebrand to **Zero-Noise (Zero App)**.
- Enhanced Liquid Glass squircle pill navigation.
- High-contrast accessibility across all system views.

---

### 🛡️ Security & Anti-Cheat Hardening
- **Monotonic Hardware Time Watchdog:** Lock duration is evaluated strictly via `SystemClock.elapsedRealtime()`, defeating system date/time rollback exploits.
- **Reboot Protection:** Detects device reboot and cold-boot immediately, resuming active locks without token leaks.
- **Anti-Sleep-Farming:** Sleep sessions credit at `0.25x` by default to prevent overnight ticket farming.
- **Anti-Exploit Abort Penalty:** Mid-session aborts forfeit all elapsed progress toward Escape Tickets.
- **Zero-Telemetry Guarantee:** Zero network tracking SDKs, zero external ad beacons, and strict offline operation.

---

## Installation & Upgrade Guide

### Standard Edition (Recommended)
1. Download `ZERO-Noise-v1.0.0.apk` from [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases).
2. Tap the downloaded APK to install.
3. Grant **Usage Access** and **Display Over Other Apps** when prompted.
4. Ready to focus!

### Strict Edition (Full Zero Mode via ADB)
1. Download `ZERO-Noise-strict-adb-v1.0.0.apk`.
2. Install via ADB or Shizuku:
   ```bash
   adb install -r ZERO-Noise-strict-adb-v1.0.0.apk
   ```
3. On Android 13–16:
   - Go to `Settings → Apps → Zero-Noise → ⋮ (top right) → Allow restricted settings`.
   - Go to `Accessibility → Zero-Noise` and enable the service.
4. Complete system lock holding the line against Notification pull-down, Quick Settings, and Force-Stop.

### Upgrading From Previous Versions
All releases share Zero-Noise's official V1 + V2 + V3 release key:
```
Owner: CN=Zero Detox, OU=Mobile Security, O=Zero Detox Project, L=Bangalore, ST=Karnataka, C=IN
SHA-256: A1:4A:36:9C:5F:85:2B:12:F6:39:1A:E7:09:A6:6C:56:53:7E:89:1E:FE:CB:AC:3B:5A:0B:4D:43:2F:CE:9F:11
```
You can install updates directly over existing installations without losing your focus statistics, streaks, or Escape Tickets.

---

## Verifying Integrity Locally

To verify test coverage and anti-cheat policies locally:

```bash
# Run all 23 unit and anti-exploit tests
npm test

# Run CI security and integrity verifier
node scripts/verify-integrity.mjs

# Build production bundle
npm run build
```

---

*Zero-Noise is 100% free and open-source under the [MIT License](./LICENSE).*
