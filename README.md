# Zero-Noise (Zero App)

> **"Your attention is the only asset you cannot buy back. Lock the phone. Do the work."**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases)
[![Build Status](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/actions/workflows/build.yml/badge.svg)](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Integrity](https://img.shields.io/badge/Integrity-SHA--256%20Verified-brightgreen.svg)](https://github.com/MDYOUSUF20007-oss/ZERO-Noise)
[![Zero Telemetry](https://img.shields.io/badge/Telemetry-Zero-black.svg)](https://github.com/MDYOUSUF20007-oss/ZERO-Noise)

Most screen-time apps are designed to fail you. They give you a polite reminder or a 15-minute nudge that you dismiss in half a second without thinking. When a craving hits, you tap "Ignore Limit" or uninstall the app in ten seconds. Nothing changes.

**Zero-Noise is built for people who are done lying to themselves.**

It doesn't ask you nicely. When you start a lock, your phone is locked. No bypassing via Quick Settings. No navigating to Settings to force-stop. No cheating by restarting your device—Zero monitors hardware monotonic time and re-arms instantly on reboot.

<a href="https://ko-fi.com/mdyousuf2620" target="_blank">
  <img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" width="210">
</a>

---

## Why People Choose Zero-Noise

### 1. A Real Lock That Holds the Line
- **Full Zero Mode (Strict Edition):** Leverages Android's Accessibility Service to block the Notification pull-down, Quick Settings, Recents menu, and System Settings (`com.android.settings`). You cannot sneak a peek at social media or kill the service.
- **Reboot-Proof Hardware Watchdog:** Evaluates session progress strictly against the native monotonic hardware clock (`SystemClock.elapsedRealtime()`). Restarting your phone will not cancel a session—Zero intercepts cold boot and re-engages immediately.

### 2. ZeroTube // Distraction-Free Study Player
- **Built Right on the Bottom Dock:** Direct 1-tap access from the primary navigation dock (`[Focus]`, `[Insights]`, `[ZeroTube]`, `[Settings & OS]`, `[Support]`) and inside The Void.
- **1-Tap Link Whitelisting (Zero Forms):** Just paste any YouTube video or channel link (`https://youtube.com/@channel`). No forms to fill! Zero-Noise automatically parses creator, exam, category, and tags in 1 click.
- **Regain-Style Educational Channel Whitelisting:** Whitelisting an educational creator (e.g. `@paramountmerchantnavy`, `@physicswallah`, `@freecodecamp`) auto-authorizes and whitelists every lecture from that channel.
- **AI Cognitive Study Verifier & Competitive Exam Detection:** 100% offline, privacy-first semantic classifier that detects target exams (`🎯 IMU-CET`, `JEE`, `NEET`, `SAT`, `UPSC`, `GATE`, `CAT`, `GRE`, `NDA`), assigns curriculum score bonuses, and shields against clickbait, pranks, and algorithmic brainrot.
- **Zero Algorithmic Traps:** Zero recommendations, zero shorts, zero comments, and zero auto-play rabbit holes.

### 3. Flexible 10-Minute Hourly Pomodoro Break
- **Freedom on Your Schedule:** Take a 10-minute break every hour whenever you choose during a focus block.
- **Full Device Freedom:** During the 10-minute window, the phone blockade is paused—open and use any app freely.
- **Zen Bowl Auto-Re-Arm:** A live countdown header and Zen bowl chime alert you when break time ends, smoothly re-locking the device back into The Void.

### 4. Phase 2 Unlimited Bags & Granular App Quotas
- **Unlimited Custom Bags:** Create dedicated bags for `Work`, `Study`, `Coding`, `Merchant Navy / IMU-CET`, `Family`, or `Night`.
- **Granular Per-App Quotas:** Configure specific daily limits (`15m`, `30m`, `1h`) per application.
- **Short-Video Intercepts:** Neutralize dopamine loops with configurable short-form video intercept actions (`back_action`, `overlay`, `hard_block`) and scroll velocity throttling.

### 5. Phone Calls Are Always Accessible
- Focus shouldn't put you in danger. Emergency dialing (`911`, `112`) and essential incoming/outgoing phone calls remain **Always On**. Your family, colleagues, or emergency services can always reach you.

### 6. The 35-Hour Escape Ticket Economy
- There is no paid bypass. You cannot buy your way out of a lock with money.
- The only way to unlock an active session early is an **Emergency Escape Ticket (`🎫`)**, earned exclusively by completing **35 cumulative hours (126,000 seconds)** of verified, distraction-free focus.
- **Strict Anti-Exploit:** Spending an Escape Ticket to abort mid-session forfeits 100% of the elapsed time from that session toward your next ticket.

### 7. 100% Free, Private & Serverless
- **Zero Subscriptions:** No $12/month paywalls. Recurring routines, heatmaps, and custom themes are unlocked from day one.
- **Zero Telemetry SDKs:** No trackers, no ad networks, no analytics beacons, and no accounts.
- **Universal `.zbak` Backups:** Export and restore your statistics, Escape Tickets, custom themes, and routine schedules offline via HMAC-SHA256 sealed `.zbak` archives or sync seamlessly to your private cloud storage.

### 8. The Void & Aetherial Minimal Mesh
- During an active lock, your phone enters **The Void**: an ambient, pitch-black space featuring a retro 5×7 pixelated system clock (`SYSTEM TIME // SYNCED`), a high-contrast focus countdown (`HH:MM:SS`), live battery status, and quick-access docks for your allowed Bag apps.
- **Aetherial Minimal Mesh:** Ultra-clean organic fluid mesh drift tuned to eliminate visual clutter while maintaining deep aesthetic focus.

---

## Downloads & Releases

Get official binaries and release notes directly from [GitHub Releases](https://github.com/MDYOUSUF20007-oss/ZERO-Noise/releases):

For complete version changelogs, architecture notes, and checksums, see **[RELEASES.md](./RELEASES.md)**.

| Edition | Package | Recommended For |
| :--- | :--- | :--- |
| **Standard Edition** *(Direct Install)* | `ZERO-Noise-v<version>.apk` | Quick sideloading without root or ADB. Enforces your Bags, limits, and ZeroTube via Android **Usage Access** + **Display Over Other Apps**. |
| **Strict Edition** *(Full Zero Mode)* | `ZERO-Noise-strict-adb-v<version>.apk` | Maximum discipline. Uses Android's **Accessibility Service** to block the notification shade, Quick Settings, Recents, and Settings. *(On Android 13–16, enable via App Info → ⋮ Allow restricted settings, or install via `adb install -r` / Shizuku).* |

- **Release Documentation & History:** [RELEASES.md](./RELEASES.md)
- **Live Web / PWA Preview:** [mdyousuf20007-oss.github.io/ZERO-Noise](https://mdyousuf20007-oss.github.io/ZERO-Noise/)
- **In-Place Updates (V1 + V2 + V3 Signed):** All official releases share Zero-Noise's permanent release certificate (`SHA-256: A1:4A:36:...CE:11`). Future updates install seamlessly in-place over previous versions without data loss.
- **Google Play Protect Notice:** Because GitHub APKs are direct open-source sideloads, Android asks to scan new APK hashes once before installation. Tap **Scan app** to verify cleanly and proceed.

---

## Screenshots

| The Home Dial *(Scrub 5m–24h)* | The Void *(Active Lock Screen)* | Work Bag Spotlight *(Deep Focus)* |
| :---: | :---: | :---: |
| 📸 *Paste screenshot here* <!-- PASTE HOME DIAL SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE VOID TIMER SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE WORK BAG VOID SCREENSHOT HERE --> |

| ZeroTube *(Study Player & Whitelist)* | Theme Studio *(AMOLED, Kindle, Matte)* | Contribution Heatmap *(Insights)* |
| :---: | :---: | :---: |
| 📸 *Paste screenshot here* <!-- PASTE ZEROTUBE SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE THEME STUDIO SCREENSHOT HERE --> | 📸 *Paste screenshot here* <!-- PASTE INSIGHTS & PROFILE SCREENSHOT HERE --> |

---

## Core Features & Workflow

### 1. The Dial & Floating Dock (Home Screen)
- **Floating Bottom Dock:** Pinned 5-tab glass navigation: `[Focus]` Dial, `[Insights]` Heatmaps, `[ZeroTube]` Study Player, `[Settings & OS]`, and `[Support]`.
- **Scrubbable Radial Wheel (`5m` to `24h`):** Quick pills for `5m`, `15m`, `25m`, `45m`, `1h`, `2h`, `4h`, `8h`, and `24h`, plus smooth continuous dial scrubbing with tactile audio clicks and haptic response.
- **Mission `#Hashtags`:** Tag your focus session (`#Deep Work`, `#Study`, `#Coding`, `#Merchant Navy`, `#Family`, `#Sleep`, `#Detox`) or create unlimited custom hashtags.
- **3-Second Hold-to-Ignite:** An escalating radial charge animation prevents accidental locks while giving you a deliberate 3-second mental checkpoint before committing.

### 2. ZeroTube (Distraction-Free Study System)
- **1-Tap Link Whitelisting (Zero Forms):** Paste any YouTube video or `@channel` link and tap `Whitelist Link`. No title, channel, tag, or description forms required.
- **Regain-Style Auto-Authorization:** Whitelisting a creator like `@paramountmerchantnavy`, `@physicswallah`, or `@codewithharry` automatically authorizes all videos from that channel.
- **Target Exam Badges:** Automatic recognition of competitive exams:
  - `🎯 IMU-CET` (Merchant Navy & Nautical Science)
  - `🎯 JEE (Main & Adv)` (Engineering Entrance)
  - `🎯 NEET` (Medical Entrance)
  - `🎯 SAT` / `🎯 ACT / AP` (College Board)
  - `🎯 UPSC CSE` (Civil Services)
  - `🎯 GATE` (Graduate Aptitude Engineering)
  - `🎯 CAT / MBA` (Management Entrance)
  - `🎯 GRE / GMAT` & `🎯 IELTS / TOEFL`
- **Distraction Shield:** Automatically rejects clickbait, prank videos, vlogs, and YouTube Shorts format.

### 3. The Void & Pomodoro Break (Active Lock Screen)
- **Pixelated Clock & Inverted Timer:** Retro terminal 5×7 pixel matrix clock synchronized to your theme accent, positioned directly above a high-contrast focus countdown.
- **Hourly 10m Pomodoro Break:** Tap `☕ Take 10m Break` anytime during an hour to unlock your phone and use any app freely before re-arming.
- **Emergency Call Button:** Fast access to `911` / `112` and the phone dialer at all times.
- **Escape Ticket Chamber:** Requires deliberate two-step confirmation, warning you that spending a ticket forfeits that session's time toward your next milestone.

### 4. Theme Studio (34 Built-In Finishes + Custom Color Pickers)
Custom aesthetics for both the interactive dashboard and The Void:
- **14 AMOLED Finishes:** *Pure Pitch (`#000000`)*, *Abyssal Ember*, *Midnight Aurora*, *Cosmic Dusk*, *Crimson Void*, *Cobalt Cyber*, *Solar Gold*, *Jade Matrix*, and more.
- **10 Paper like Kindle Themes:** *Paperwhite*, *Warm Sepia*, *Botanical Sage*, *Cool E-Ink*, *Parchment*, *Newsprint*, plus custom paper and ink pickers.
- **10 Matte Studio Finishes:** *Graphite*, *Warm Taupe*, *Nordic Slate*, *Dark Olive*, *Espresso*, *Terracotta*, plus custom matte base and accent pickers.
- **Custom Theme Mods:** Import, create, and share custom JSON theme mods with live CSS variable reactivity.

### 5. Automated Routines & Overnight Schedules
- Set recurring focus windows for specific days or daily cycles (e.g. Bedtime at `22:00 – 06:00` or Morning Study at `08:00 – 11:00`).
- Seamlessly handles midnight-crossing windows with native `SharedPreferences` routine bridges that maintain lock enforcement even when the screen is dark.

### 6. Insights, Heatmaps & Focus Receipts
- **Multi-Timeframe Heatmaps:** Track your discipline across **Daily**, **Weekly**, **Monthly**, and **All-Time** contribution heatmaps.
- **7 Collectible Achievement Badges:** Unlock milestones from `GETTING STARTED` (1h) up to `CAME SO FAR` (1000h) and the Golden **`ZERO-SUPPORTER`** crest.
- **1080×1350 Focus Receipt Export:** Generate high-resolution, shareable focus cards summarizing completed sessions, streaks, and reclaimed hours.

### 7. Universal `.zbak` Backups & Privacy
- **Direct SAF Storage Sync:** Automatically syncs an encrypted `.zbak` file to your preferred local folder or cloud directory (Google Drive, OneDrive, Nextcloud, Dropbox).
- **One-Tap Save & Restore:** Export and restore your complete setup in seconds with cryptographic HMAC-SHA256 signature verification.
- **7-Day Local Reminder:** An unobtrusive reminder if you haven't backed up in over a week.

---

## The Discipline Economy

```typescript
const SECONDS_PER_TICKET = 126_000; // 35 Cumulative Hours (126,000s)

// Earn tickets through genuine completed focus
lifetimeEarned = Math.floor(cumulativeCompletedSeconds / SECONDS_PER_TICKET) + starterBonus;
currentBalance = Math.max(0, lifetimeEarned - usedTickets);

// Anti-Sleep-Farming Rule:
// Sleep sessions credit at 0.25x by default (8h sleep = 2h ticket credit)

// Anti-Exploit Abort Penalty:
// If an active session is aborted using an Escape Ticket:
// abortedSession.earnedSeconds = 0; -> Zero progress added!
```

---

## Technical Architecture & Security

- **Monotonic Native Clock:** Lock expiration is calculated via `SystemClock.elapsedRealtime()`, completely immune to manual changes in the device date/time settings.
- **Isolated Integrity Module (`IntegrityEngine.ts`):** Frozen, read-only engine isolating milestone calculations, HMAC signature checks, and badge evaluators from UI tampering.
- **R8 / ProGuard Code & Resource Shrinking:** Release APKs are compiled with full R8 optimization, dead code stripping, and strict keep rules for native services.
- **Runtime APK Signature Verification:** `AppSecurityGuard.java` verifies the running APK's SHA-256 certificate against the official release key on startup, defending against re-signed modified clones.
- **Strict Network Security Config:** Enforces `cleartextTrafficPermitted="false"` with zero external analytics, tracker endpoints, or remote ad SDKs.
- **Automated Anti-Cheat CI Gate:** Pre-build CI scripts (`node scripts/verify-integrity.mjs` and `npm test`) verify monotonic clock usage, permissions, CSP strings, and integrity isolation on every commit.

---

## Building Locally

```bash
# 1. Clone repository
git clone https://github.com/MDYOUSUF20007-oss/ZERO-Noise.git
cd ZERO-Noise

# 2. Install dependencies & run integrity verification
npm install
node scripts/verify-integrity.mjs

# 3. Run unit tests, linter & production bundle build
npm test
npm run lint
npm run build

# 4. Sync web assets into Android Capacitor project
npx cap sync android
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the mandatory **Productivity Integrity Policy** before submitting pull requests.

---

## Support Development

Zero-Noise is 100% free and open-source with zero paywalls. If Zero-Noise has helped you reclaim your attention and you want to support independent development:

- **Ko-fi:** [https://ko-fi.com/mdyousuf2620](https://ko-fi.com/mdyousuf2620)
- **UPI:** `md.y2007@ptaxis`
- **Supporter Perks:** A first tip of ₹50+ unlocks the Golden **`ZERO-SUPPORTER`** profile badge and `+1 Free Emergency Escape Ticket (🎫)`.
- **Manual Verification:** Email your donation screenshot to **mdyousuf982007@proton.me** to receive a signed offline unlock token (`ZDON1...`).

---

## License

Zero-Noise (Zero App) is licensed under the **[MIT License](./LICENSE)**.  
Built with zero trackers, zero subscriptions, and 100% respect for your focus.
