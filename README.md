# ZERO — Open-Source Digital Detox & Phone Blocker

> **"The obstacle is the way. Put your phone facedown."**

Zero is a 100% free and open-source (FOSS) distraction-blocking application inspired by BlockIt. Built with an ultra-minimalist, tactile Neo-Brutalist aesthetic, zero paywalls, zero telemetry, and a revolutionary **Earned-Only Parachute** discipline economy.

<a href="https://ko-fi.com/mdyousuf2620" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="210">
</a>

---

## Downloads & Releases

- **Latest Android APKs:** [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases/latest) ([All Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases))
  - **`ZERO-v<version>.apk` (Standard Edition — Direct Install):** Uses Usage Access + Display Over Other Apps without Accessibility permissions for quick browser/file-manager sideloading.
  - **`ZERO-requires-adb-v<version>.apk` (Strict Accessibility Edition — Full BlockIt Mode):** Blocks Notification pull-down, Quick Settings, Recents, Settings, and unbagged apps via Accessibility Service (`adb install -r` / Shizuku or Allow Restricted Settings on Android 14–16).
  - *Seamless In-Place Updates:* Releases from `v1.0.19+` are permanently signed with ZERO's release keystore so future APKs update directly over previous versions. *(If migrating from an older `v1.0.18` debug preview, open **Rules → Export Backup** once, uninstall the old preview, install the new signed APK, and tap **Restore File**.)*
- **Web / PWA Preview:** [mdyousuf20007-oss.github.io/ZERO](https://mdyousuf20007-oss.github.io/ZERO/)

---

## 1. Vision & Core Philosophy

- **Zero Paywalls:** Every single feature—unlimited recurring schedules, deep analytics heatmaps, strict OS kiosk locks, interactive profiles, and themes—is completely free for all users from day one.
- **Earned & Gift Parachutes:** Emergency Parachutes cannot be purchased outright. Users earn **1 Parachute for every 20 cumulative hours (72,000 seconds) of completed phone blockage**, plus a **one-time free starter Parachute (+1)** when creating an interactive profile on first launch, and a **one-time thank-you bonus (+1)** on a user's first ₹50+ donation.
- **The Anti-Sleep-Farming Rule:** To keep Parachutes a genuine badge of daytime focus, sleep blocks earn **0.25x parachute progression** by default (or Daytime-Only 0.0x mode). An 8-hour sleep lock contributes 2.0 hours toward the next parachute instead of allowing users to farm a parachute every 2.5 nights.
- **Aborted Session Penalty (Anti-Exploit):** If a user deploys a Parachute mid-session, 1 Parachute is consumed and **all elapsed time in that aborted session is permanently voided**, never counting toward the next 20-hour milestone. If you lock for 4 hours and pull the parachute at hour 3, you lose 1 Parachute and gain 0 hours.
- **Ethical Support Model:** Clean, non-intrusive "Keep Zero Free" section in Settings ([Ko-fi](https://ko-fi.com/mdyousuf2620) and UPI ID `md.y2007@ptaxis` with no minimum limit) plus an optional post-session tip prompt highlighting UPI as the best zero-fee option (including the one-time 1st ₹50+ tip free Parachute bonus; dismissible or blockable for 5 sessions at a time) with zero advertisements.
- **100% Local-First & Offline:** No accounts, no cloud sync, no tracking SDKs. Works fully offline with local-first persistence.

---

## 2. Design Language & Aesthetic

- **Neo-Brutalist Monochrome:** High-contrast OLED blacks (`#000000`), subtle dot-matrix canvas accents, stark borders, and brutalist geometric badges.
- **Tactile Web Haptics Engine:** Custom Web Audio API frequency-ramping synthesizer generating crisp mechanical ticks (1200Hz -> 80Hz), detent thuds, and escalating 3-second hold charges paired with vibration patterns.
- **Micro-Interactions:** Scrubbable circular dial wheel, escalating 3-second radial hold-to-lock button, and parachute milestone celebrations.

---

## 3. The 4 Main Views

### 1. Lock Dial (Home Screen)
- **Scrubbable Dial:** Radial drag wheel supporting smooth 5-minute to 24-hour duration scrub with tactile clicks.
- **Preset Chips:** Quick buttons for 5m, 15m, 25m Pomodoro, 45m, 1h, 2h, 4h, 8h Sleep, and 24h Detox.
- **Session Tags:** Categorize locks into `#Deep Work`, `#Study`, `#Family`, `#Sleep`, `#Detox`, or custom tags.
- **Hold-to-Ignite:** 3-second hold button with escalating tactile charging sound and progressive SVG fill to prevent accidental locks.
- **Glance Card:** Live display of current Parachute balance and hours remaining until the next 20h rollover.

### 2. The Void (Active Lock Screen)
- **Extreme Focus Overlay:** Displays only remaining countdown (HH:MM:SS), real-time system clock, and battery level.
- **Emergency Call Dialer:** Instant access to 911, 112, or custom ICE contact lines without breaking lock task integrity.
- **Deploy Parachute Button:**
  - Active *only* if Parachute Balance $\ge 1$.
  - Displays confirmation dialog warning of session forfeiture.
  - Decrements balance by 1 and aborts the lock immediately.
  - If Balance is 0, remains securely locked with a reminder of the 20-hour requirement.
- **Anti-Tamper Reboot Watchdog:** Resumes instantly across device reboots or browser reloads until the target timestamp expires. Includes an interactive **"Simulate Reboot"** button to verify persistence.

### 3. Parachute & Discipline Analytics Dashboard
- **Hero 20-Hour Progression Card:**
  - Inventory count of ready parachutes.
  - Rollover progress bar: `completed_blocked_seconds % 72000` (e.g. `14.5 / 20.0 hrs`).
- **Discipline Metrics:**
  - Total Hours Reclaimed.
  - Daily Streak counter.
  - Session Completion Rate (Completed vs. Parachuted %).
  - Average Session Duration.
- **GitHub-Style Contribution Heatmap:** 16-week monochrome calendar grid mapping daily focus intensity.
- **Focus Time by Tag:** Visual horizontal breakdown across tags.
- **Immutable Parachute Ledger:** Chronological record of +1 Earned milestones and -1 Deployed aborts.

### 4. Schedules & Settings ("Keep Zero Free")
- **Auto-Pilot Recurring Schedules:** Unlimited schedules (e.g., Weekdays 9:00 AM - 12:00 PM, Nightly Wind-Down 11:00 PM - 6:30 AM) with day-of-week selectors.
- **5-Minute Heads-Up Alert:** Push notification and heads-up banner warning the user 5 minutes before lock engages. Includes a test simulation button.
- **Keep Zero Free:** Ethical support links ([Ko-fi](https://ko-fi.com/mdyousuf2620) and UPI ID `md.y2007@ptaxis` with scannable QR / instant pay launch) plus direct link to [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases).
- **Data Portability:** Complete JSON export, import, and factory reset.
- **Color Themes:** Pure OLED Void and Neo Monochrome.

---

## 4. Technical Architecture

### State Store & Mathematical Formulation
```typescript
const SECONDS_PER_PARACHUTE = 72_000; // 20 Hours

// Parachute Progression Formula:
lifetimeEarned = Math.floor(cumulativeCompletedSeconds / SECONDS_PER_PARACHUTE);
currentBalance = Math.max(0, lifetimeEarned - usedParachutes);
progressSeconds = cumulativeCompletedSeconds % SECONDS_PER_PARACHUTE;
hoursUntilNext = (SECONDS_PER_PARACHUTE - progressSeconds) / 3600;

// Anti-Exploit Rule on Parachute Deployment:
usedParachutes += 1;
// abortedSession.earnedSeconds = 0; -> Cumulative seconds do NOT increase!
```

### Native Android Subsystem (`android/`)
For Android deployment, Zero leverages OS-level system capabilities:
- **`LockTaskEngine.kt` / `TheVoidActivity.kt`**: Uses Android Kiosk / `startLockTask()` pinning mode via Device Policy Manager (`setLockTaskPackages`) to disable Home, Recents, and Status Bar drawers.
- **`ZeroAccessibilityService.kt`**: Intercepts `com.android.systemui` status bar pulldown attempts and closes system notification dialogs; traps unauthorized app switches.
- **`BootReceiver.kt`**: Listens for `android.intent.action.BOOT_COMPLETED`, checks persistent timestamp in flash storage (`EncryptedSharedPreferences`), and immediately re-surfaces `TheVoidActivity` if rebooted mid-session.
- **`LockForegroundService.kt`**: High-priority sticky foreground service maintaining OS process priority (`START_STICKY`).
- **`PreLockScheduleWorker.kt`**: WorkManager job dispatching high-priority heads-up notifications 5 minutes prior to scheduled lock engagements.

---

## 5. Running & Testing the Project

### Interactive Web / PWA App
```bash
# Navigate to project directory
cd zero-app

# Install dependencies (if not already installed)
npm install

# Run verification test suite (validates 20h math & anti-exploit rules)
npm test

# Run local development server
npm run dev

# Build production bundle
npm run build
```

---

## 6. License
Zero is open-source under the **GNU General Public License v3 (GPL-3.0)** / **MIT License**.
Built with zero trackers, zero subscriptions, and 100% respect for human agency.
