# ZERO — Open-Source Digital Detox & Phone Blocker

> **"The obstacle is the way. Put your phone facedown."**

Zero is a 100% free and open-source (FOSS) distraction-blocking application inspired by strict focus blockers. Built with an ultra-minimalist, tactile aesthetic, zero paywalls, zero telemetry, live **Theme Studio** (**AMOLED + Gradients**, **Paper like Kindle**, **Matte Studio**), and an **Emergency Escape Ticket** discipline economy.

<a href="https://ko-fi.com/mdyousuf2620" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="210">
</a>

---

## Downloads & Releases

- **Latest Android APKs:** [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases/latest) ([All Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases))
  - **`ZERO-v<version>.apk` (Standard Edition — Direct Install):** Uses Usage Access + Display Over Other Apps without Accessibility permissions for quick browser/file-manager sideloading.
  - **`ZERO-requires-adb-v<version>.apk` (Strict Accessibility Edition — Full Kiosk Mode):** Blocks Notification pull-down, Quick Settings, Recents, Settings, and unbagged apps via Accessibility Service (`adb install -r` / Shizuku or Allow Restricted Settings on Android 14–16).
  - *Seamless In-Place Updates:* Releases from `v1.0.19+` are permanently signed with ZERO's release keystore (`v1.0.23+` includes explicit **V1 + V2 + V3 APK signing**) so future APKs update directly over previous versions. *(If migrating from an older `v1.0.18` debug preview, save a backup in **Settings → Export Backup** or **Cloud Auto-Backup**, uninstall the old preview, install the new signed APK, and restore in 1 tap.)*
- **Web / PWA Preview:** [mdyousuf20007-oss.github.io/ZERO](https://mdyousuf20007-oss.github.io/ZERO/)

---

## 1. Vision & Core Philosophy

- **Zero Paywalls:** Every single feature—unlimited recurring schedules, deep analytics heatmaps, strict OS kiosk locks, interactive profiles, and all themes—is completely free for all users from day one.
- **Earned & Gift Emergency Escape Tickets (`🎫`):** Escape Tickets cannot be purchased outright. Users earn **1 Emergency Escape Ticket for every 20 cumulative hours (72,000 seconds) of completed phone blockage**, plus a **one-time free starter Escape Ticket (+1)** when creating an interactive profile on first launch, and a **one-time thank-you bonus (+1 Escape Ticket & Golden `ZERO-SUPPORTER` Profile Badge)** strictly on a user's **1st tip of minimum ₹50**.
- **Badges & Achievements Showcase:** Unlock collectible focus milestone badges (`GETTING STARTED` for your 1st 1h completed session, `WOO NICE!` at 50h, `LONG WAY` at 100h, `GETTING DISCIPLINED` at 250h, `FULL CONTROL !` at 500h, `CAME SO FAR` at 1000h) plus the Golden **`ZERO-SUPPORTER`** crest (unlocked strictly after your 1st minimum ₹50 tip) — displayed on your Interactive Profile and rendered onto shareable **Flex Your Focus Card** PNG receipts.
- **The Anti-Sleep-Farming Rule:** To keep Escape Tickets a genuine badge of daytime focus, sleep blocks earn **0.25x progression** by default (or Daytime-Only 0.0x mode). An 8-hour sleep lock contributes 2.0 hours toward the next ticket instead of allowing users to farm an escape ticket every 2.5 nights.
- **Aborted Session Penalty (Anti-Exploit):** If a user spends an Escape Ticket mid-session, 1 ticket is consumed and **all elapsed time in that aborted session is permanently voided**, never counting toward the next 20-hour milestone. If you lock for 4 hours and exit at hour 3, you spend 1 Escape Ticket and gain 0 hours.
- **Ethical Support Model:** Non-intrusive Support section ([Ko-fi](https://ko-fi.com/mdyousuf2620), UPI ID `md.y2007@ptaxis` with no minimum limit for regular UPI tips) plus an optional post-session tip prompt highlighting UPI as the best zero-fee option, and explicitly noting the strict **minimum ₹50 (1st tip)** requirement to unlock the Golden **`ZERO-SUPPORTER`** Badge + `+1 Free Escape Ticket 🎫`. Dismissible or blockable for 5 sessions at a time, with zero ads.
- **100% Serverless & Private Backup:** No accounts, no backend servers, no OAuth keys, and no tracking SDKs. Works fully offline, with optional **Universal Cloud Auto-Backup (`zero-backup.zbak`)** via Android Storage Access Framework (SAF) directly into your own Google Drive, OneDrive, JioDrive, Dropbox, or Downloads.

---

## 2. Theme Studio & Tactile Design

- **Live Theme Studio (`AMOLED`, `Paper like Kindle`, `Matte Studio`):**
  - **AMOLED:** Pure Pitch (`#000000`) plus 5 Gradient AMOLED glow finishes (*Abyssal Ember*, *Midnight Aurora*, *Cosmic Dusk*, *Crimson Void*, *Cobalt Cyber*).
  - **Paper like Kindle:** E-Ink light theme with 5 paper presets (*Paperwhite*, *Warm Sepia*, *Botanical Sage*, *Cool E-Ink*, *Soft Dusk*) **plus customizable Paper Color & Ink Accent pickers** with contrast safety guards.
  - **Matte Studio:** Low-glare charcoal studio finishes (*Graphite*, *Warm Taupe*, *Nordic Slate*, *Dark Olive*, *Espresso*) **plus customizable Studio Surface & Accent pickers**.
- **Tactile Web Haptics Engine:** Custom Web Audio API frequency-ramping synthesizer generating crisp mechanical ticks (1200Hz -> 80Hz), detent thuds, and escalating 3-second hold charges paired with vibration patterns.
- **Micro-Interactions:** Scrubbable circular dial wheel, escalating 3-second radial hold-to-lock button, and Escape Ticket unlock animations.

---

## 3. The Main Views

### 1. Lock Dial (Home Screen)
- **Scrubbable Dial:** Radial drag wheel supporting smooth 5-minute to 24-hour duration scrub with tactile clicks.
- **Quick Theme Button & Profile Strip:** 1-tap access to Theme Studio and your interactive rank/badges card.
- **Preset Chips & Session Tags:** Quick buttons (`5m` to `24h`) and tags (`#Deep Work`, `#Study`, `#Family`, `#Sleep`, `#Detox`, or custom tags).
- **Hold-to-Ignite:** 3-second hold button with escalating tactile charging sound and progressive fill to prevent accidental locks.
- **Glance Card:** Live display of current Emergency Escape Ticket balance and hours remaining until the next 20h rollover.

### 2. The Void (Active Lock Screen)
- **Extreme Focus Overlay:** Displays remaining countdown (HH:MM:SS), real-time system clock, and battery level.
- **Emergency Call Dialer:** Instant access to 911, 112, or custom ICE contact lines without breaking lock task integrity.
- **Use Emergency Escape Ticket Button:**
  - Active *only* if Escape Ticket Balance $\ge 1$.
  - Displays confirmation dialog warning of session forfeiture.
  - Decrements balance by 1 and exits the lock immediately.
  - If Balance is 0, remains securely locked with a reminder of the 20-hour requirement.
- **Anti-Tamper Reboot Watchdog:** Resumes instantly across device reboots or reloads until the target timestamp expires.

### 3. Escape Tickets & Discipline Analytics Dashboard
- **Hero 20-Hour Progression Card:** Inventory of ready Escape Tickets + rollover progress (`completed_blocked_seconds % 72000`).
- **Discipline Metrics:** Total Hours Reclaimed, Daily Streak, Session Completion Rate, and Average Session Duration.
- **Interactive Profile & Achievement Badges:** Inspect unlock progress for all 7 badges (`ZERO-SUPPORTER`, `GETTING STARTED`, `WOO NICE!`, `LONG WAY`, `GETTING DISCIPLINED`, `FULL CONTROL !`, `CAME SO FAR`), and export a **1080×1350 Focus Receipt PNG** with your earned badges via **Flex Stats** or right after a session.
- **GitHub-Style Contribution Heatmap & Tag Breakdown:** 16-week focus intensity grid and tag chart.
- **Immutable Escape Ticket Ledger:** Chronological record of +1 Earned/Gift milestones and -1 Escape uses.

### 4. Themes, Schedules, Cloud Auto-Backup, Settings & Support
- **Auto-Pilot Recurring Schedules:** Unlimited schedules with day-of-week selectors and 5-minute heads-up warnings.
- **Theme Studio:** Full customization for AMOLED Gradients, Paper like Kindle custom colors, and Matte Studio custom colors.
- **Donor Perks & Badges (Settings & Support):** Check your Golden `ZERO-SUPPORTER` crest and Escape Ticket gift status, enter a signed `ZDON1...` / `ZBAK1...` unlock token, or contact support directly for Ko-fi receipt verification.
- **Universal Cloud Auto-Backup (`zero-backup.zbak`):**
  - **Signed & Tamper-Proof:** Compacts stats, donor badges, remaining Escape Tickets, preset Bags, and profile into a Base64/XOR obfuscated archive sealed with **SHA-256 HMAC** (`ZBAK1`) so tickets cannot be forged manually.
  - **Mode A (Android SAF Persistable Auto-Sync):** Native Capacitor `CloudAutoBackupPlugin` acquires `takePersistableUriPermission` across **Google Drive, OneDrive, JioDrive, Dropbox, or Local Storage** and silently overwrites `zero-backup.zbak` whenever a session finishes, a Bag changes, or badges/tickets update.
  - **Mode B (Weekly 1-Tap Reminder):** If Auto-Backup is off and >7 days pass since `lastBackupTimestamp`, displays a pure AMOLED black/purple (`#8B5CF6`) home banner with **1-Tap Upload** and **Turn On Auto-Backup**.
  - **1-Tap Reinstall Restore:** **"Restore Backup from Cloud (Drive / OneDrive / JioDrive)"** on Welcome & Settings verifies the `.zbak` HMAC signature, restores stats/badges/tickets/Bags, sets `onboardingComplete = true`, and skips directly to the Dashboard.
- **OS Permissions & Green Restricted Settings Fix Guide:** Enforces exact priority setup order (**1. Allow Restricted Settings Check + Zero App Info Shortcut -> 2. Usage Access (Find Zero) / Accessibility -> 3. Display Over Other Apps -> 4. Notifications**) with green step-by-step Android 13–16 Restricted Settings unlock instructions right underneath permission prompts.
- **Data Portability:** Complete JSON + signed `.zbak` export/import, clipboard copy/paste, and factory reset.

---

## Support & Donor Verification

Zero is 100% free and open-source with zero paywalls. If you choose to support development and unlock the Golden **`ZERO-SUPPORTER`** crest & `+1 Free Emergency Escape Ticket (🎫)` gift:

- **Ko-fi:** [https://ko-fi.com/mdyousuf2620](https://ko-fi.com/mdyousuf2620)
- **UPI (No minimum limit for regular tips; 1st tip of ₹50+ unlocks Supporter perks):** `md.y2007@ptaxis`
- **Support Email (Manual Ko-fi Verification):** **mdyousuf982007@proton.me**

Donated on Ko-fi but haven't received your badge, ticket bundle, or signed unlock token yet? Send a screenshot of your Ko-fi receipt and your account email to **mdyousuf982007@proton.me** for manual verification and activation via **Settings → Donor Perks & Badges**.

---

## 4. Technical Architecture

### State Store & Mathematical Formulation
```typescript
const SECONDS_PER_TICKET = 72_000; // 20 Hours

lifetimeEarned = Math.floor(cumulativeCompletedSeconds / SECONDS_PER_TICKET) + bonusTickets;
currentBalance = Math.max(0, lifetimeEarned - usedTickets);
progressSeconds = cumulativeCompletedSeconds % SECONDS_PER_TICKET;
hoursUntilNext = (SECONDS_PER_TICKET - progressSeconds) / 3600;

// Anti-Exploit Rule on Escape Ticket Use:
usedTickets += 1;
// abortedSession.earnedSeconds = 0; -> Cumulative seconds do NOT increase!
```

### Core Integrity & Native Android Subsystem
- **`src/core/integrity/IntegrityEngine.ts`**: Frozen, read-only module isolating focus time accounting, monotonic proof verification, Escape Ticket deductions, golden `ZERO-SUPPORTER` / `.zbak` HMAC checks, and achievement evaluators (`0` public setter functions exposed to UI components).
- **`LockEngine.kt` / `TheVoidActivity.kt`**: Tracks lock duration strictly via Android's monotonic `SystemClock.elapsedRealtime()`, computes HMAC-SHA256 `VerifiedCompletionEvent` receipts on completion, and engages Device Owner Kiosk / `startLockTask()` when provisioned.
- **`ZeroAccessibilityService.kt` / `LockForegroundService.kt`**: Blocks `com.android.settings`, system package installers, status bar / Quick Settings drawers, Recents, and unbagged apps during active locks using monotonic `SystemClock.elapsedRealtime()` timing.
- **`BootReceiver.kt`**: Listens for `BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`, rebases monotonic progress on cold reboot, and immediately re-surfaces `TheVoidActivity` or finalizes a signed completion proof.
- **`PreLockScheduleWorker.kt`**: WorkManager job dispatching high-priority heads-up notifications 5 minutes prior to scheduled lock engagements.
- **Automated Anti-Cheat PR Guard (`node scripts/verify-integrity.mjs` + `.github/CODEOWNERS`):** Runs as the first step in `.github/workflows/build.yml` and `main.yml` — blocking any PR introducing `android:debuggable="true"`, removing `SystemClock.elapsedRealtime()` or `com.android.settings` enforcement, or bypassing `IntegrityEngine`. See [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 5. Running & Testing the Project

```bash
cd zero-app
npm install
npm test
npm run lint
npm run build
```

---

## 6. License
Zero is open-source under the **GNU General Public License v3 (GPL-3.0)** / **MIT License**.
Built with zero trackers, zero subscriptions, and 100% respect for human agency.
