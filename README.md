# Zero-Distractions — Minimalist Screen-Time & App Blocker

> **"The obstacle is the way. Put your phone facedown."**

**Zero-Distractions** (also referred to as **Zero App**) is a minimalist screen-time and app blocker — 100% free and open-source (FOSS) with dual **Classic (Default)** and **Bespoke Minimalist** UI engines, zero paywalls, zero telemetry, a live **34-preset Theme Studio** (**AMOLED + Gradients**, **Paper like Kindle**, **Matte Studio**), occasion-based **4-Bag** app whitelisting, offline HMAC-signed **`.zbak` backups + 1-tap Cloud Upload**, and an earned **Emergency Escape Ticket (`🎫`)** discipline economy.

<a href="https://ko-fi.com/mdyousuf2620" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="210">
</a>

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

- **Zero Paywalls:** Unlimited recurring schedules, interactive daily/weekly/monthly/all-time heatmaps, strict OS kiosk locks, all 34 themes + custom color pickers, custom `#Hashtags`, and encrypted `.zbak` backups are 100% free from day one.
- **Earned & Gift Emergency Escape Tickets (`🎫`):** Escape Tickets cannot be bought outright. You earn **1 Emergency Escape Ticket for every 20 cumulative hours (72,000 seconds) of completed phone blockage**, plus a **one-time starter Escape Ticket (+1 🎫)** when creating an interactive profile on first launch, and a **one-time thank-you gift (+1 🎫 + Golden `ZERO-SUPPORTER` Profile Badge)** strictly on your **1st tip of minimum ₹50**.
- **7 Collectible Achievement Badges:** Unlock focus milestones (`GETTING STARTED` at 1h completed, `WOO NICE!` at 50h, `LONG WAY` at 100h, `GETTING DISCIPLINED` at 250h, `FULL CONTROL !` at 500h, `CAME SO FAR` at 1000h) plus the Golden **`ZERO-SUPPORTER`** crest — displayed on your Interactive Profile and rendered onto **1080×1350 Focus Receipt PNG** Flex Cards.
- **Anti-Sleep-Farming Rule:** `#Sleep` sessions earn **0.25x progression** by default (or choose **0.0x Daytime Only** or **1.0x Full Credit** in Settings). An 8-hour sleep block adds 2.0 hours toward the next ticket at `0.25x`, keeping daytime discipline meaningful.
- **Aborted Session Penalty (Anti-Exploit):** Spending an Emergency Escape Ticket mid-session consumes 1 ticket and **permanently voids all elapsed time from that aborted session** — `0` seconds count toward your next 20-hour milestone.
- **Ethical Support Model:** Zero ads and non-intrusive voluntary support ([Ko-fi](https://ko-fi.com/mdyousuf2620) or UPI `md.y2007@ptaxis` with zero-fee transfers; 1st `₹50+` tip unlocks Golden **`ZERO-SUPPORTER`** + `+1 Free 🎫`). Post-session tip prompts can be snoozed for 5 sessions at a time.
- **100% Serverless & Private Backups:** Zero accounts, zero telemetry SDKs, and zero remote servers. Back up stats, Escape Tickets, donor perks, schedules, Bags, widgets, and active themes offline using signed `.zbak` files.

---

## 2. Dual UI Engines, Theme Studio & Performance

- **Dual Interface Styles (`Settings & OS → Themes → Interface Style`):**
  - **Classic UI *(Default)*:** Frosted Obsidian layered glass cards, ambient theme-matched rim glows, pill geometry, and soft specular highlights.
  - **Bespoke Minimalist:** Pure `#000000` AMOLED flat canvas, crisp `1px` structural borders, functional `#3B82F6` blue utility accents, sans typography with tabular monospace telemetry, and instant mechanical controls.
  - Switch instantaneously at runtime with zero restart required.
- **Expanded Theme Studio (34 Presets + Custom Pickers):**
  - **14 AMOLED & Gradient Finishes:** *Pure Pitch (`#000000`)* plus *Abyssal Ember*, *Midnight Aurora*, *Cosmic Dusk*, *Crimson Void*, *Cobalt Cyber*, *Solar Gold*, *Jade Matrix*, *Indigo Abyss*, *Rose Quartz*, *Arctic Cyan*, *Bronze Dusk*, *Vermilion Heat*, and *Titanium Mist*.
  - **10 Paper like Kindle Themes (+ Custom Pickers):** *Paperwhite*, *Warm Sepia*, *Botanical Sage*, *Cool E-Ink*, *Soft Dusk*, *Parchment*, *Matcha Folio*, *Cobalt Ink*, *Plum Folio*, and *Newsprint*, plus live **Custom Paper Color** & **Custom Ink Accent** pickers.
  - **10 Matte Studio Themes (+ Custom Pickers):** *Graphite*, *Warm Taupe*, *Nordic Slate*, *Dark Olive*, *Espresso*, *Bullion*, *Steel Indigo*, *Terracotta*, *Amethyst*, and *Alpine Mint*, plus live **Custom Matte Base** & **Custom Studio Accent** pickers.
- **Unified App-Wide Accent Cohesion:** Every active surface — Profile modals, Work Bag badges, Phone Calls (`ALWAYS ON`), SMS badges, and Restricted Settings guides — dynamically inherits your active Theme Studio accent (or Bespoke `#3B82F6`) with zero stray green/amber mismatches.
- **CPU-Optimized Dial & Tactile Audio:** `Dial` wheel uses static memoized tick rings paired with `requestAnimationFrame` imperative DOM updates while dragging so spinning feels silky-smooth with minimal CPU load and battery heat, combined with crisp Web Audio frequency-ramping clicks and haptic vibration.

---

## 3. Core Screens & Workflow

### 1. Dial (Home Screen)
- **Scrubbable Duration Wheel (`5m` to `24h`) & Quick Chips:** 9 instant duration pills (`5m`, `15m`, `25m`, `45m`, `1h`, `2h`, `4h`, `8h`, `24h`) plus continuous radial scrub.
- **Mission `#Hashtags` & Custom Tag Creator:** Pick built-in tags (`#Deep Work`, `#Study`, `#Family`, `#Sleep`, `#Detox`) or create unlimited **custom `#Hashtags`** right from the home screen or inside your Profile.
- **4 Customizable Occasion Bags (`Work Bag`, `Commute Bag`, `Study Bag`, `Family & Night`):** Whitelist up to **3 essential apps** per Bag plus optional normal Texts (SMS), while compulsory **Phone Calls (`ALWAYS ON`)** remain accessible — or leave a Bag empty for pure **Monk Mode**.
- **3-Second Hold-to-Ignite:** Escalating radial charge prevents accidental locks.
- **Glance Strip & Due Cloud Banner:** Live Escape Ticket inventory, 20-hour rollover progress, and a 1-tap reminder strip when your scheduled Cloud Upload timer is due.

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
- **Immutable Escape Ticket Ledger:** Audit every earned 20-hour milestone, welcome/supporter bonus, and aborted Escape use.

### 4. Settings & OS — Auto-Pilot Schedules, Streamlined Backup & Permissions
- **Auto-Pilot Recurring Schedules:** Unlimited day-of-week schedules with 5-minute pre-lock heads-up warnings dispatched via WorkManager (`PreLockScheduleWorker.kt`).
- **Streamlined Backup and Restore Everything (`.zbak` + Cloud Upload):**
  - **Create Auto-Sync File in Storage:** Links a persistent Android Storage Access Framework (`ACTION_CREATE_DOCUMENT`) `.zbak` file across local storage, Google Drive, OneDrive, JioDrive, or Dropbox and updates automatically on session completion and Bag/profile changes.
  - **One-Tap Save:** Instant manual export of an HMAC-SHA256 sealed `.zbak` snapshot.
  - **Restore Data Picker:** Pick any saved `.zbak` / `.json` backup to verify integrity, restore stats, Escape Tickets, donor perks, Bags, and active theme, and skip onboarding after reinstalling.
  - **Upload Stats to Cloud & Configurable Reminder Timer:** Opens Android's share sheet with your stats `.zbak` snapshot so you upload straight to any cloud app of your choice — paired with a local **Weekly / Monthly / Off** Cloud Upload Reminder timer (`CloudUploadReminderWorker.kt`).
- **Android 13–16 OS Security & Restricted Settings Guide:** Enforces clear step-by-step setup (`1. Usage Access / Accessibility -> 2. Display Over Other Apps -> 3. Notifications`), complete with a theme-coherent Android 13–16 **Restricted Settings (`Allow restricted settings`)** walkthrough and one-tap **App Info** shortcut.

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
- **`src/core/integrity/IntegrityEngine.ts`**: Frozen, read-only integrity module isolating reclaimed-time math, monotonic native proof verification, Escape Ticket deductions, Golden `ZERO-SUPPORTER` / `.zbak` HMAC checks, and badge evaluators (`0` cheat mutators exposed to React components).
- **`LockEngine.kt` & `TheVoidActivity.kt` (`VoidThemeVisuals.kt`)**: Tracks elapsed focus strictly via Android's monotonic clock (`SystemClock.elapsedRealtime()`), generates HMAC-SHA256 `VerifiedCompletionEvent` proofs on completion, mirrors classic/bespoke theme styling + **Work Bag** centered `#HASHTAG` spotlight natively on Android, and engages Device Owner Kiosk / `startLockTask()` when provisioned.
- **`ZeroAccessibilityService.kt` & `LockForegroundService.kt`**: Blocks `com.android.settings`, system package installers, status bar / Quick Settings drawers, Recents, and unbagged apps during active locks using monotonic `SystemClock.elapsedRealtime()` checks.
- **`BagStore.kt`**: Synchronizes up to 4 occasion Bags, strict 3-app limits, SMS preferences, and mandatory Settings blacklists between WebView and native Kotlin services.
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
