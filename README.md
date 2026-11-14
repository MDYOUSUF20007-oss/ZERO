# Zero-Distractions — Minimalist Screen-Time & App Blocker

> **"The obstacle is the way. Put your phone facedown."**

[![Version](https://img.shields.io/badge/version-1.0.61-blue.svg)](https://github.com/MDYOUSUF20007-oss/ZERO/releases)
[![Build Status](https://github.com/MDYOUSUF20007-oss/ZERO/actions/workflows/build.yml/badge.svg)](https://github.com/MDYOUSUF20007-oss/ZERO/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Integrity](https://img.shields.io/badge/Integrity-SHA--256%20Verified-brightgreen.svg)](https://github.com/MDYOUSUF20007-oss/ZERO)

**Zero-Distractions** (also referred to as **Zero App**) is a sovereign, minimalist screen-time and app blocker — 100% free and open-source (FOSS) with a 3-way interface engine (**Classic Obsidian**, **Bespoke Minimalist**, and **Fluent Glass**), zero paywalls, zero telemetry SDKs, a 34-preset Theme Studio with an open **Community Theme Engine & JSON Modder**, occasion-based **4-Bag** app whitelisting, offline HMAC-signed **`.zbak` backups + 1-tap Cloud Upload**, overnight cross-midnight routine schedules, and an earned **35-Hour Emergency Escape Ticket (`🎫`)** discipline economy.

<a href="https://ko-fi.com/mdyousuf2620" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="210">
</a>

---

## What's New in v1.0.61 — The Sovereign Horizon Update

- **35-Hour Escape Ticket Economy:** Upgraded discipline milestone from 20h to **35 cumulative hours (126,000 seconds)** of clean, completed phone blockage per 1 Emergency Escape Ticket (`🎫`), backed by strict anti-sleep and anti-exploit rules.
- **3-Way Interface Engine:** Instant toggle between **Classic Obsidian** (frosted layered glass cards), **Bespoke Minimalist** (pure pitch AMOLED, crisp structural lines, and tabular monospace telemetry), and **Fluent Glass** (liquid glassmorphism with dynamic specular diffusion).
- **Custom Mods & Community Theme Engine:** Import, export, create, and share custom JSON theme mods (e.g., *Cyberpunk Neon*, *Tokyo Night*, *Forest Emerald*) alongside the 34 built-in finishes with live CSS variable reactivity.
- **Theme-First FTUE & 5-Question Habit Calibration Survey:** First-launch onboarding wizard with live theme selection, instant `.zbak` cloud/local restore shortcut, and a comprehensive 5-step habit calibration survey (Goals, Distraction Apps, Friction, Vulnerability Windows, and Daily Reclaim Targets).
- **3 Customizable Launch Modes:** Choose between **Recommended Setup** (balanced friction), **Full Productive Mode** (strict discipline), or **Explore by Myself** (manual setup).
- **Automated Routine Execution Engine:** Fully automated routine schedules with seamless overnight cross-midnight calculation support (`22:00 – 02:00`) and a native Android `SharedPreferences` routine bridge that enforces app whitelisting in the background even when the WebView is suspended.
- **Tamper-Proof Support Section Lock & Official Author Integrity:** Strict SHA-256 integrity verification of official author credentials (`@MDYOUSUF20007-oss`, Ko-fi, and support email) inside the native Android layer (`ZeroBridgePlugin.java`), permanently locking bypass actions if tampered.
- **Credits & Contributors Modal:** Live GitHub contributors fetcher with offline caching and transparent community recognition.
- **Zero-Cost In-App Auto-Updater:** Throttled GitHub Releases API checker for direct APK update downloads, paired with a recurring 7-day snooze fallback reminder.
- **Android Back Gesture & Hierarchical Navigation Stack:** Capacitor back gesture listener with layered dialog popping and a 2-second "Swipe again to exit" toast on root dashboard.
- **Unified Backups & 7-Day Backup Reminder:** Backup and restore habit calibration profiles, launch modes, and routine states with automatic 7-day backup prompts.

---

## Downloads & Releases

- **Latest Android APKs:** [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases/latest) ([All Releases](https://github.com/MDYOUSUF20007-oss/ZERO/releases))
  - **`ZERO-v<version>.apk` (Standard Edition — Direct Install):** Uses **Usage Access** + **Display Over Other Apps** without Accessibility permissions for fast browser/file-manager sideloading.
  - **`ZERO-requires-adb-v<version>.apk` (Strict Accessibility Edition — Full Zero Mode):** Blocks Notification pull-down, Quick Settings, Recents, System Settings (`com.android.settings`), package installers, and unbagged apps via Accessibility Service (enable via *Allow Restricted Settings* on Android 13–16 or `adb` / Shizuku).
  - *Seamless In-Place Updates:* Releases from `v1.0.19+` are permanently signed with ZERO's official release keystore (**V1 + V2 + V3 APK signing**) so future APKs install directly over older versions without losing data. *(If upgrading from an old pre-`v1.0.19` debug build, export a backup in **Settings → Backup and Restore Everything**, uninstall the old preview, install the signed APK, and restore in 1 tap.)*
  - *Google Play Protect Notice ("Play Protect hasn't seen this app before"):* Because GitHub Releases are direct sideloads rather than Play Store downloads, every newly built release APK has a fresh SHA-256 binary hash that Play Protect hasn't indexed yet. Tap **Scan app** once to clear it cleanly, and always verify against `SHA256SUMS.txt` + ZERO's official signing certificate SHA-256 (`A1:4A:36:...CE:11`).
- **Web / PWA Preview:** [mdyousuf20007-oss.github.io/ZERO](https://mdyousuf20007-oss.github.io/ZERO/)

---

## Screenshots

| Home Dial *(Classic Default)* | The Void *(Inverted Countdown)* | Work Bag *(`#HASHTAG` Spotlight)* |
| :---: | :---: | :---: |
| 📸 *Paste screenshot here* <!-- PASTE HOME DIAL SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE VOID TIMER SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE WORK BAG VOID SCREENSHOT HERE --> |

| Live Theme Studio *(34 Presets)* | Insights, Badges & Profile Themes | Backup, Cloud Upload & Bespoke UI |
| :---: | :---: | :---: |
| 📸 *Paste screenshot here* <!-- PASTE THEME STUDIO SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE INSIGHTS & PROFILE SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE BACKUP & BESPOKE SCREENSHOT HERE --> |

<details>
<summary>How to add screenshots to this gallery</summary>

1. **Directly on GitHub (Fastest):** Click the **Edit (`✏️`)** button on this `README.md`, highlight `*Paste screenshot here*` inside any table cell above, and **paste (`Ctrl + V`) or drag-and-drop** your PNG/JPG. GitHub automatically uploads the asset and keeps all 3 columns aligned.
2. **Via `docs/screenshots/` folder:** Save images inside [`docs/screenshots/`](./docs/screenshots/README.md) (`home-dial.png`, `the-void-standard.png`, `the-void-work-bag.png`, `theme-studio.png`, `insights-profile.png`, `backup-cloud.png`) and replace `*Paste screenshot here*` with `![Screen](docs/screenshots/<filename>.png)`.

</details>

---

## 1. Vision & Core Philosophy

- **Zero Paywalls:** Unlimited recurring schedules, interactive daily/weekly/monthly/all-time heatmaps, strict OS kiosk locks, all 34 themes + custom color pickers, community theme mods, custom `#Hashtags`, and encrypted `.zbak` backups are 100% free from day one.
- **Earned & Gift Emergency Escape Tickets (`🎫`):** Escape Tickets cannot be bought outright. You earn **1 Emergency Escape Ticket for every 35 cumulative hours (126,000 seconds) of completed phone blockage**, plus a **one-time starter Escape Ticket (+1 🎫)** when creating an interactive profile on first launch, and a **one-time thank-you gift (+1 🎫 + Golden `ZERO-SUPPORTER` Profile Badge)** strictly on your **1st tip of minimum ₹50**.
- **7 Collectible Achievement Badges:** Unlock focus milestones (`GETTING STARTED` at 1h completed, `WOO NICE!` at 50h, `LONG WAY` at 100h, `GETTING DISCIPLINED` at 250h, `FULL CONTROL !` at 500h, `CAME SO FAR` at 1000h) plus the Golden **`ZERO-SUPPORTER`** crest — displayed on your Interactive Profile and rendered onto **1080×1350 Focus Receipt PNG** Flex Cards.
- **Anti-Sleep-Farming Rule:** `#Sleep` sessions earn **0.25x progression** by default (or choose **0.0x Daytime Only** or **1.0x Full Credit** in Settings). An 8-hour sleep block adds 2.0 hours toward the next ticket at `0.25x`, keeping daytime discipline meaningful.
- **Aborted Session Penalty (Anti-Exploit):** Spending an Emergency Escape Ticket mid-session consumes 1 ticket and **permanently voids all elapsed time from that aborted session** — `0` seconds count toward your next 35-hour milestone.
- **Ethical Support Model:** Zero ads and non-intrusive voluntary support ([Ko-fi](https://ko-fi.com/mdyousuf2620) or UPI `md.y2007@ptaxis` with zero-fee transfers; 1st `₹50+` tip unlocks Golden **`ZERO-SUPPORTER`** + `+1 Free 🎫`). Post-session tip prompts can be snoozed for 5 sessions at a time.
- **100% Serverless & Private Backups:** Zero accounts, zero telemetry SDKs, and zero remote servers. Back up stats, Escape Tickets, habit calibration profiles, routine schedules, Bags, widgets, and active themes offline using signed `.zbak` files.

---

## 2. Triple UI Engines, Theme Studio & Modding

- **3-Way Interface Engine (`Settings & OS → Themes → Interface Style`):**
  - **Classic UI *(Default)*:** Frosted Obsidian layered glass cards, ambient theme-matched rim glows, pill geometry, and soft specular highlights.
  - **Bespoke Minimalist:** Pure `#000000` AMOLED flat canvas, crisp `1px` structural borders, functional `#3B82F6` blue utility accents, sans typography with tabular monospace telemetry, and instant mechanical controls.
  - **Fluent Glass:** Liquid glassmorphism featuring multi-layered translucent blur surfaces, adaptive refraction highlights, and specular light diffusion.
  - Switch instantaneously at runtime with zero app reload required.
- **Expanded Theme Studio (34 Presets + Custom Pickers):**
  - **14 AMOLED & Gradient Finishes:** *Pure Pitch (`#000000`)* plus *Abyssal Ember*, *Midnight Aurora*, *Cosmic Dusk*, *Crimson Void*, *Cobalt Cyber*, *Solar Gold*, *Jade Matrix*, *Indigo Abyss*, *Rose Quartz*, *Arctic Cyan*, *Bronze Dusk*, *Vermilion Heat*, and *Titanium Mist*.
  - **10 Paper like Kindle Themes (+ Custom Pickers):** *Paperwhite*, *Warm Sepia*, *Botanical Sage*, *Cool E-Ink*, *Soft Dusk*, *Parchment*, *Matcha Folio*, *Cobalt Ink*, *Plum Folio*, and *Newsprint*, plus live **Custom Paper Color** & **Custom Ink Accent** pickers.
  - **10 Matte Studio Themes (+ Custom Pickers):** *Graphite*, *Warm Taupe*, *Nordic Slate*, *Dark Olive*, *Espresso*, *Bullion*, *Steel Indigo*, *Terracotta*, *Amethyst*, and *Alpine Mint*, plus live **Custom Matte Base** & **Custom Studio Accent** pickers.
- **Custom Mods & Community Theme Engine (`Settings → Themes → Mods`):**
  - Create, import, export, and delete custom theme mods using structured JSON definitions.
  - Built-in community mod presets included: *Cyberpunk Neon*, *Tokyo Night*, and *Forest Emerald*.
  - Live CSS variable reactivity maps custom surfaces (`--bg-primary`, `--surface`, `--accent`, `--border-color`) dynamically across all cards, typography, and controls while preserving core integrity rules.
- **CPU-Optimized Dial & Tactile Audio:** `Dial` wheel uses static memoized tick rings paired with `requestAnimationFrame` imperative DOM updates while dragging so spinning feels silky-smooth with minimal CPU load and battery heat, combined with crisp Web Audio frequency-ramping clicks and haptic vibration.

---

## 3. Core Screens & Workflow

### 1. Dial (Home Screen)
- **Scrubbable Duration Wheel (`5m` to `24h`) & Quick Chips:** 9 instant duration pills (`5m`, `15m`, `25m`, `45m`, `1h`, `2h`, `4h`, `8h`, `24h`) plus continuous radial scrub.
- **Mission `#Hashtags` & Custom Tag Creator:** Pick built-in tags (`#Deep Work`, `#Study`, `#Family`, `#Sleep`, `#Detox`) or create unlimited **custom `#Hashtags`** right from the home screen or inside your Profile.
- **4 Customizable Occasion Bags (`Work Bag`, `Commute Bag`, `Study Bag`, `Family & Night`):** Whitelist up to **3 essential apps** per Bag plus optional normal Texts (SMS), while compulsory **Phone Calls (`ALWAYS ON`)** remain accessible — or leave a Bag empty for pure **Monk Mode**.
- **3-Second Hold-to-Ignite:** Escalating radial charge prevents accidental locks.
- **Glance Strip & Due Cloud Banner:** Live Escape Ticket inventory, 35-hour rollover progress, and a 1-tap reminder strip when your scheduled Cloud Upload timer is due.

### 2. The Void (Active Lock Screen)
- **System Clock & Inverted Countdown Card:** Crisp pixel-matrix **System Clock (`SYSTEM TIME // SYNCED`)** paired directly below with a matching **inverted high-contrast focus countdown** (`HH:MM:SS`) and live battery indicator.
- **Dual Layouts — Standard vs. Work Bag Spotlight:**
  - **Standard / Custom Bags:** Clock & Inverted Countdown on top, personal Lock Pledge pill, centered Allowed Bag panel, Escape Ticket exit controls, and Emergency Call (`911` / `112`).
  - **Work Bag Spotlight:** Automatically switches when locking with **Work Bag** — places Clock + Inverted Countdown at the top, projects a **giant centered `#HASHTAG` focus spotlight** across the middle of the screen (larger than both the clock and timer), and docks your allowed Bag cleanly at the bottom.
- **Emergency Escape Ticket Gate:** Available *only* when Escape Ticket Balance $\ge 1$, guarded by a confirmation dialog warning that elapsed session progress will be forfeited.
- **Reboot-Proof Watchdog:** Survives device reboots, process kills, and screen unlocks via native `BootReceiver` and foreground enforcement until `targetEndTime` expires.

### 3. Insights, Heatmaps & Interactive Profile
- **Interactive Zero Profile (`+1 Free Starter 🎫`):** Configure your Callsign, `@handle`, 6 custom emblem SVGs, **Daily Phone-Free Goal**, Primary Detox Mission + **Custom `#Hashtags`**, **10 Personal Lock Pledges** *(plus custom motto text)*, and a **Live Theme Switcher directly inside the Profile modal**.
- **Interactive Contribution Heatmaps & Customizable Widgets:** Toggle between **Daily**, **Weekly**, **Monthly**, and **Merged All** timeframe heatmaps, inspect per-day sessions & tag breakdowns, and reorder or hide dashboard widgets.
- **Achievement Showcase & Focus Receipt Export:** Track all 7 badges and export a shareable **1080×1350 Focus Receipt PNG** right from Insights or upon completing a lock session.
- **Immutable Escape Ticket Ledger:** Audit every earned 35-hour milestone, welcome/supporter bonus, and aborted Escape use.

### 4. Settings & OS — Routines, Backup, Security & Community
- **Automated Routine Schedules & Overnight Support:** Create recurring daily or day-of-week routines. Supports midnight-crossing windows (e.g., `22:00 – 02:00`) with immediate trigger evaluation on resume and native Android `SharedPreferences` routine bridge (`syncRoutinesToNative`) to maintain strict background enforcement even when the WebView is sleeping.
- **Streamlined Backup and Restore Everything (`.zbak` + Cloud Upload):**
  - **Create Auto-Sync File in Storage:** Links a persistent Android Storage Access Framework (`ACTION_CREATE_DOCUMENT`) `.zbak` file across local storage, Google Drive, OneDrive, JioDrive, or Dropbox and updates automatically on session completion and Bag/profile changes.
  - **One-Tap Save:** Instant manual export of an HMAC-SHA256 sealed `.zbak` snapshot containing stats, bags, custom themes, habit calibrations, and routine schedules.
  - **Restore Data Picker:** Pick any saved `.zbak` / `.json` backup to verify integrity, restore stats, Escape Tickets, donor perks, Bags, active theme, and habit profile in 1 tap.
  - **7-Day Backup Reminder:** Local automated reminder prompt to safeguard your progress if no backup has been generated in the last 7 days.
  - **Upload Stats to Cloud & Configurable Reminder Timer:** Opens Android's share sheet with your stats `.zbak` snapshot so you upload straight to any cloud app of your choice — paired with a local **Weekly / Monthly / Off** Cloud Upload Reminder timer (`CloudUploadReminderWorker.kt`).
- **Android 13–16 OS Security & Restricted Settings Guide:** Enforces clear step-by-step setup (`1. Usage Access / Accessibility -> 2. Display Over Other Apps -> 3. Notifications`), complete with a theme-coherent Android 13–16 **Restricted Settings (`Allow restricted settings`)** walkthrough, plain-English security explanation card, and one-tap **App Info** shortcut.
- **Zero-Cost GitHub Releases Auto-Updater:** Throttled check against GitHub Releases API with 7-day snooze reminder so users always have access to the latest release APK.
- **Credits & Contributors Modal:** Built-in modal honoring creator Mohammed Yusuf (`@MDYOUSUF20007-oss`) and fetching active repository contributors via GitHub's public API with local fallback caching.
- **Tamper-Proof Support Section Lock:** Core author identity verified via native SHA-256 checks in `ZeroBridgePlugin.java`, preventing malicious repackaging or URL redirection.

---

## Support & Donor Verification

Zero-Distractions is 100% free and open-source with zero paywalls. If you choose to support development and unlock the Golden **`ZERO-SUPPORTER`** crest & `+1 Free Emergency Escape Ticket (🎫)`:

- **Ko-fi:** [https://ko-fi.com/mdyousuf2620](https://ko-fi.com/mdyousuf2620)
- **UPI (No minimum limit for regular tips; 1st tip of ₹50+ unlocks Supporter perks):** `md.y2007@ptaxis`
- **Support Email (Manual Ko-fi Verification):** **mdyousuf982007@proton.me**

Donated on Ko-fi and need manual verification or a signed `ZDON1...` unlock token? Send a screenshot of your Ko-fi receipt and email to **mdyousuf982007@proton.me** and activate it inside **Settings & OS → Settings → Donor Perks & Badges**.

---

## 4. Technical Architecture

### State Store & Mathematical Formulation
```typescript
const SECONDS_PER_TICKET = 126_000; // 35 Hours (126,000s)

lifetimeEarned = Math.floor(cumulativeCompletedSeconds / SECONDS_PER_TICKET) + bonusTickets;
currentBalance = Math.max(0, lifetimeEarned - usedTickets);
progressSeconds = cumulativeCompletedSeconds % SECONDS_PER_TICKET;
hoursUntilNext = (SECONDS_PER_TICKET - progressSeconds) / 3600;

// Anti-Exploit Rule on Escape Ticket Use:
usedTickets += 1;
// abortedSession.earnedSeconds = 0; -> Cumulative seconds do NOT increase!
```

### Core Integrity & Native Android Subsystem
- **`src/core/integrity/IntegrityEngine.ts`**: Frozen, read-only integrity module isolating reclaimed-time math, monotonic native proof verification, 35-hour Escape Ticket deductions, Golden `ZERO-SUPPORTER` / `.zbak` HMAC checks, and badge evaluators (`0` cheat mutators exposed to React components).
- **`LockEngine.kt` & `TheVoidActivity.kt` (`VoidThemeVisuals.kt`)**: Tracks elapsed focus strictly via Android's monotonic clock (`SystemClock.elapsedRealtime()`), generates HMAC-SHA256 `VerifiedCompletionEvent` proofs on completion, mirrors classic/bespoke/fluent theme styling + **Work Bag** centered `#HASHTAG` spotlight natively on Android, and engages Device Owner Kiosk / `startLockTask()` when provisioned.
- **`ZeroAccessibilityService.kt` & `LockForegroundService.kt`**: Blocks `com.android.settings`, system package installers, status bar / Quick Settings drawers, Recents, and unbagged apps during active locks using monotonic `SystemClock.elapsedRealtime()` checks.
- **`ZeroBridgePlugin.java`**: High-security Capacitor bridge enforcing SHA-256 author lock verification, native routine synchronization, package inspection, and device policy controls.
- **`BagStore.kt` & Native Routine Bridge**: Synchronizes up to 4 occasion Bags, strict 3-app limits, SMS preferences, routine schedules, and mandatory Settings blacklists between WebView and native Kotlin services.
- **`BootReceiver.kt`, `PreLockScheduleWorker.kt` & `CloudUploadReminderWorker.kt`**: Re-arms locks across cold reboots (`BOOT_COMPLETED` / `MY_PACKAGE_REPLACED`), fires 5-minute pre-lock schedule warnings, and drives configurable Weekly/Monthly Cloud Upload reminders.
- **`CloudAutoBackupPlugin.kt`**: Native Android SAF + `FileProvider` bridge powering persistent `.zbak` auto-sync, One-Tap Save, Restore Data Picker, and direct Cloud App upload without any backend servers or HTTP endpoints.
- **Release Hardening (`R8/ProGuard`, `AppSecurityGuard.java`, `EndpointSecurityPolicy.kt`):** Release APKs ship with `minifyEnabled true` + `shrinkResources true`, `network_security_config.xml` (`cleartextTrafficPermitted="false"`), strict WebView CSP, and startup/resume APK signing certificate verification against `A1:4A:36:...CE:11` (disabling `.zbak` restore and Bag tampering on rooted/test-keys/emulator environments).
- **Automated Anti-Cheat CI Gate (`node scripts/verify-integrity.mjs` + `.github/CODEOWNERS`):** Runs on every push/PR in both `.github/workflows/build.yml` and `.github/workflows/main.yml` before Android unit tests & release APK signing.

---

## 5. Running & Testing Locally

```bash
git clone https://github.com/MDYOUSUF20007-oss/ZERO.git
cd ZERO
npm install
node scripts/verify-integrity.mjs
npm test
npm run lint
npm run build
```

To sync web assets into the Android Capacitor project:
```bash
npx cap sync android
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the mandatory **Productivity Integrity Policy** before submitting PRs.

---

## 6. License

Zero-Distractions (Zero App) is licensed under the **[MIT License](./LICENSE)**.  
Built with zero trackers, zero subscriptions, and 100% respect for human agency.
