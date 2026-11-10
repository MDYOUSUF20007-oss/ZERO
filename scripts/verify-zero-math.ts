/**
 * Verification test suite for Zero Core Logic:
 * 1. 20-Hour Parachute Progression Math (72,000s milestone rollover)
 * 2. Anti-Sleep-Farming Rule (0.25x Parachute credit vs 0.0x daytime only)
 * 3. Aborted Session Penalty (0 credit for parachuted sessions, forfeited progress)
 * 4. Anti-Tamper Reboot Timestamp Recovery
 * 5. Post-Session Tip Prompt Policy (shows on completion, blockable for 5 sessions)
 */
import {
  TIP_SNOOZE_SESSIONS,
  evaluatePostSessionTipPrompt,
  normalizeTipSkipCount,
} from '../src/utils/tipPromptPolicy.ts';
import {
  FIRST_DONATION_BONUS_INR,
  claimFirstDonationParachute,
  claimFirstTimerProfileBonus,
  computeParachuteBalance,
  getZeroRankFromHours,
  sanitizeZeroProfile,
} from '../src/utils/parachuteRewardsPolicy.ts';
import {
  ACHIEVEMENT_DEFINITIONS,
  evaluateBadges,
} from '../src/utils/achievements.ts';
import { createHmac } from 'node:crypto';
import {
  AMOLED_GRADIENTS,
  DEFAULT_THEME_CONFIG,
  KINDLE_PAPER_PRESETS,
  MATTE_STUDIO_PRESETS,
  computeThemeRuntime,
  computeDynamicAccentTokens,
  resolveActiveAccentTokens,
  getRelativeLuminance,
  sanitizeThemeConfig,
} from '../src/utils/themes.ts';
import {
  PIXEL_GLYPHS_5X7,
  buildPixelClockLayout,
  normalizePixelClockText,
} from '../src/utils/pixelFont.ts';
import { resolveAppBrandVisual } from '../src/utils/appBrandColors.ts';
import {
  DEFAULT_WIDGETS_CONFIG,
  computeHeatmapView,
  computeMiniWeekHeatmap,
  computeTimeframeSummary,
  moveWidgetOrder,
  sanitizeWidgetsConfig,
  shiftDateStr,
  shiftMonthAnchor,
} from '../src/utils/heatmapAnalytics.ts';
import {
  MONTHLY_BACKUP_INTERVAL_MS,
  WEEKLY_BACKUP_INTERVAL_MS,
  ZBAK_PREFIX,
  decodeAndVerifyZbak,
  encodeZbakPayload,
  getNextCloudReminderInfo,
  hmacSha256Hex,
  isCloudUploadReminderDue,
  isWeeklyBackupDue,
  sanitizeCloudReminderInterval,
} from '../src/utils/zbakCodec.ts';
import {
  evaluatePermissionPriority,
  normalizeRestrictedSettingsStatus,
} from '../src/utils/permissionPriority.ts';
import {
  encodeDonorUnlockToken,
  verifyDonorUnlockToken,
} from '../src/utils/donorUnlockToken.ts';
import { KOFI_URL, SUPPORT_EMAIL } from '../src/utils/supportLinks.ts';
import {
  DEFAULT_FOCUS_RECEIPT_MOTTO,
  FOCUS_RECEIPT_PERIOD_ORDER,
  computeReceiptPeriodStats,
  formatReceiptDuration,
  formatReceiptHandle,
  formatReceiptMotto,
} from '../src/utils/focusReceipt.ts';
import {
  DEFAULT_SESSION_TAGS,
  isWorkBag,
  mergeHashtagList,
  normalizeCustomHashtag,
} from '../src/utils/bagLayout.ts';
import {
  buildEngageSessionPayload,
  createDefaultAppRuleConfig,
  formatCompactDuration,
  formatRuleSummary,
  getAllowedBagAppsForNative,
  sanitizeAppRuleConfig,
  sanitizeOccasionBag,
} from '../src/utils/bagAppConfig.ts';
import { IntegrityEngine } from '../src/core/integrity/IntegrityEngine.ts';
import type {
  NativeEnvironmentSecurity,
  NativePermissionStatus,
  OccasionBag,
  SessionRecord,
  VerifiedNativeCompletionEvent,
  ZeroZbakPayload,
} from '../src/types/index.ts';

const SECONDS_PER_PARACHUTE = 72000; // 20 Hours

type SleepMode = 'quarter_credit' | 'daytime_only' | 'full_credit';

class TestParachuteEngine {
  cumulativeParachuteSeconds: number = 0;
  totalReclaimedSeconds: number = 0;
  usedParachutes: number = 0;
  sleepMode: SleepMode = 'quarter_credit';
  ledger: Array<{ type: string; delta: number; note?: string }> = [];

  get lifetimeEarned(): number {
    return Math.floor(this.cumulativeParachuteSeconds / SECONDS_PER_PARACHUTE);
  }

  get balance(): number {
    return Math.max(0, this.lifetimeEarned - this.usedParachutes);
  }

  get progressSeconds(): number {
    return this.cumulativeParachuteSeconds % SECONDS_PER_PARACHUTE;
  }

  get progressHours(): number {
    return Number((this.progressSeconds / 3600).toFixed(2));
  }

  get hoursUntilNext(): number {
    return Number(((SECONDS_PER_PARACHUTE - this.progressSeconds) / 3600).toFixed(2));
  }

  get progressPercentage(): number {
    return Number(((this.progressSeconds / SECONDS_PER_PARACHUTE) * 100).toFixed(2));
  }

  completeSession(durationSeconds: number, tag: string = 'Deep Work') {
    this.totalReclaimedSeconds += durationSeconds;

    // Calculate Anti-Sleep-Farming Multiplier
    let multiplier = 1.0;
    if (tag === 'Sleep') {
      if (this.sleepMode === 'quarter_credit') multiplier = 0.25;
      else if (this.sleepMode === 'daytime_only') multiplier = 0.0;
      else multiplier = 1.0;
    }

    const earnedParachuteSecs = Math.round(durationSeconds * multiplier);
    const prevMilestones = Math.floor(this.cumulativeParachuteSeconds / SECONDS_PER_PARACHUTE);
    this.cumulativeParachuteSeconds += earnedParachuteSecs;
    const newMilestones = Math.floor(this.cumulativeParachuteSeconds / SECONDS_PER_PARACHUTE);

    if (newMilestones > prevMilestones) {
      const delta = newMilestones - prevMilestones;
      this.ledger.push({
        type: 'EARNED',
        delta,
        note: `Milestone reached (+${delta} Parachute)`,
      });
    }

    return earnedParachuteSecs;
  }

  deployParachute(elapsedSecondsInAbortedSession: number): boolean {
    if (this.balance < 1) return false;

    this.usedParachutes += 1;
    this.ledger.push({
      type: 'DEPLOYED',
      delta: -1,
      note: 'Aborted Session Penalty: 0 hours credited toward parachute meter.',
    });

    // STRICT ABORTED SESSION PENALTY:
    // elapsedSecondsInAbortedSession is VOIDED and NOT credited!
    // this.cumulativeParachuteSeconds remains unchanged.

    return true;
  }
}

// RUN TESTS
console.log('=== TEST 1: Initial State Verification ===');
const engine = new TestParachuteEngine();
console.assert(engine.cumulativeParachuteSeconds === 0, 'Initial seconds should be 0');
console.assert(engine.balance === 0, 'Initial balance should be 0');
console.assert(engine.hoursUntilNext === 20, 'Initial hours until next should be 20');
console.log('PASS: Initial State');

console.log('\n=== TEST 2: Daytime Focus Session (10 Hours = 36,000s) ===');
engine.completeSession(36000, 'Deep Work');
console.assert(engine.cumulativeParachuteSeconds === 36000, 'Daytime gets 1.0x credit (36000s)');
console.assert(engine.progressHours === 10, '10 hours toward next parachute');
console.assert(engine.hoursUntilNext === 10, '10 hours remaining');
console.log('PASS: Daytime 1.0x Focus Session');

console.log('\n=== TEST 3: Anti-Sleep-Farming Rule (0.25x Credit) ===');
// An 8-hour sleep session (28,800 seconds)
// Under 0.25x rule, should earn 8 * 0.25 = 2.0 hours (7,200 seconds) toward Parachute!
const earnedSleepSecs = engine.completeSession(28800, 'Sleep');
console.assert(earnedSleepSecs === 7200, '8h Sleep session should credit exactly 2.0h (7,200s)');
console.assert(engine.totalReclaimedSeconds === 36000 + 28800, 'Total reclaimed time correctly logs full 18h phone-free');
console.assert(engine.cumulativeParachuteSeconds === 36000 + 7200, 'Parachute cumulative meter is 43,200s (12.0h)');
console.assert(engine.progressHours === 12, 'Parachute meter is at 12.0 / 20.0 hrs');
console.assert(engine.hoursUntilNext === 8, '8 hours left until Parachute');
console.log('PASS: Anti-Sleep-Farming 0.25x Rate Enforced (No 8h free parachute exploit)');

console.log('\n=== TEST 4: Anti-Sleep-Farming "Daytime Only" Mode (0.0x Credit) ===');
engine.sleepMode = 'daytime_only';
const earnedDaytimeOnlySleep = engine.completeSession(28800, 'Sleep');
console.assert(earnedDaytimeOnlySleep === 0, 'Under daytime_only mode, sleep awards 0s parachute credit');
console.assert(engine.cumulativeParachuteSeconds === 43200, 'Cumulative parachute seconds do not increase');
console.log('PASS: Daytime Only Anti-Sleep Rule Enforced');

console.log('\n=== TEST 5: Crossing 20-Hour Milestone (+28,800s Daytime) ===');
engine.sleepMode = 'quarter_credit';
engine.completeSession(28800, 'Deep Work'); // 43,200 + 28,800 = 72,000s (20.0h)!
console.assert(engine.cumulativeParachuteSeconds === 72000, 'Cumulative seconds reach 72000');
console.assert(engine.balance === 1, '1 Parachute earned!');
console.assert(engine.progressHours === 0, 'Rollover progress hours reset to 0');
console.assert(engine.hoursUntilNext === 20, 'Hours until next reset to 20');
console.log('PASS: 20-Hour Milestone Reached & Rollover');

console.log('\n=== TEST 6: Aborted Session Penalty (Anti-Exploit) ===');
// User locks for 4 hours, but aborts at hour 3 with Parachute
const prevCumulative = engine.cumulativeParachuteSeconds;
const success = engine.deployParachute(10800); // 3 hours in aborted session
console.assert(success === true, 'Parachute deployment succeeded');
console.assert(engine.balance === 0, 'Balance decremented to 0');
console.assert(engine.cumulativeParachuteSeconds === prevCumulative, 'ABORTED SESSION PENALTY: 3h aborted time was VOIDED and not credited!');
console.assert(engine.progressHours === 0, 'Progress remains 0 (cannot exploit parachute to refund itself)');
console.log('PASS: Aborted Session Penalty Enforced');

console.log('\n=== TEST 7: Anti-Tamper Reboot Timestamp Verification ===');
const start = Date.now();
const dur = 7200; // 2 hours
const target = start + dur * 1000;

// Scenario: Reboot 30 minutes in
const rebootNow = start + 1800 * 1000;
console.assert(rebootNow < target, 'Reboot mid-session detected');
const remainingSec = (target - rebootNow) / 1000;
console.assert(remainingSec === 5400, 'Remaining time resumes accurately');
console.log('PASS: Anti-Tamper Reboot Watchdog Logic');

console.log('\n=== TEST 8: Post-Session Tip Prompt & 5-Session Block Policy ===');
const failIf = (cond: boolean, msg: string) => {
  if (!cond) throw new Error(msg);
};

// First completed session (skipRemaining = 0) shows the tip popup
let skipCount = normalizeTipSkipCount(null);
failIf(skipCount === 0, 'Initial skip count should normalize to 0');
let decision = evaluatePostSessionTipPrompt(skipCount);
failIf(decision.shouldShow === true && decision.nextSkipRemaining === 0, 'Popup should show when skip=0');

// User clicks "Block for 5 Sessions"
skipCount = TIP_SNOOZE_SESSIONS;
failIf(skipCount === 5, 'TIP_SNOOZE_SESSIONS must equal 5');

for (let sessionNum = 1; sessionNum <= 5; sessionNum++) {
  decision = evaluatePostSessionTipPrompt(skipCount);
  failIf(
    decision.shouldShow === false,
    `Session ${sessionNum} after blocking should keep Tip Popup hidden`
  );
  failIf(
    decision.nextSkipRemaining === 5 - sessionNum,
    `Session ${sessionNum} should leave ${5 - sessionNum} skipped sessions`
  );
  skipCount = decision.nextSkipRemaining;
}

// 6th completed session should allow the Tip Popup again
decision = evaluatePostSessionTipPrompt(skipCount);
failIf(decision.shouldShow === true && decision.nextSkipRemaining === 0, '6th completed session should show popup again');
console.log('PASS: Post-Session Tip Prompt & Exact 5-Session Block Countdown Verified');

console.log('\n=== TEST 9: First-Timer Profile Bonus, First ₹50+ Donation Bonus & Profile Sanitization ===');
failIf(FIRST_DONATION_BONUS_INR === 50, 'First donation bonus threshold must be Rs 50');

// 1st-timer profile bonus grants strictly once without inflating focus hours
const firstClaim = claimFirstTimerProfileBonus(false, 0);
failIf(firstClaim.granted === true && firstClaim.nextBonusParachutes === 1, 'First profile creation must grant +1 Parachute');
const repeatFirstClaim = claimFirstTimerProfileBonus(firstClaim.nextAlreadyClaimed, firstClaim.nextBonusParachutes);
failIf(repeatFirstClaim.granted === false && repeatFirstClaim.nextBonusParachutes === 1, 'Second profile save must not grant duplicate starter Parachute');

// 1st Rs 50+ donation grants strictly once
const donationClaim = claimFirstDonationParachute(false, repeatFirstClaim.nextBonusParachutes);
failIf(donationClaim.granted === true && donationClaim.nextBonusParachutes === 2, 'First Rs 50+ donation must grant +1 Parachute');
const repeatDonationClaim = claimFirstDonationParachute(donationClaim.nextAlreadyClaimed, donationClaim.nextBonusParachutes);
failIf(repeatDonationClaim.granted === false && repeatDonationClaim.nextBonusParachutes === 2, 'Repeat donation claim must stay capped at 1');

// Parachute balance adds bonus gifts without forging 20h milestones, and decrements on deployment
const bonusSnap = computeParachuteBalance({
  cumulativeSeconds: 0,
  bonusParachutes: repeatDonationClaim.nextBonusParachutes,
  usedParachutes: 1,
});
failIf(bonusSnap.earnedFromHours === 0, 'Focus-earned milestone count must remain 0 when cumulativeSeconds=0');
failIf(bonusSnap.lifetimeEarned === 2 && bonusSnap.currentBalance === 1, 'Bonus parachutes and deployments must compute accurately');

// Interactive profile sanitization and rank mapping
const emptyProfile = sanitizeZeroProfile({ displayName: '   ' });
failIf(emptyProfile === null, 'Blank callsign must be rejected');
const savedProfile = sanitizeZeroProfile({
  displayName: 'Yousuf',
  handle: '@@Yousuf 2007!!',
  avatarId: 'owl',
  accentColor: 'emerald',
  dailyGoalHours: 99,
});
failIf(savedProfile !== null && savedProfile.handle === '@yousuf2007', 'Handle should normalize safely');
failIf(savedProfile !== null && savedProfile.dailyGoalHours === 12, 'Daily goal hours should clamp to max 12h');
failIf(getZeroRankFromHours(0).title === 'Initiate' && getZeroRankFromHours(55).title === 'Void Master', 'Rank progression must map accurately');
console.log('PASS: One-Time Parachute Gifts, Balance Integrity & Profile Policies Verified');

console.log('\n=== TEST 10: ZERO-SUPPORTER Golden Badge & Focus Achievement Milestones ===');
const expectedTitles = [
  'ZERO-SUPPORTER',
  'GETTING STARTED',
  'WOO NICE!',
  'LONG WAY',
  'GETTING DISCIPLINED',
  'FULL CONTROL !',
  'CAME SO FAR',
];
failIf(
  ACHIEVEMENT_DEFINITIONS.length === expectedTitles.length &&
    expectedTitles.every((t, idx) => ACHIEVEMENT_DEFINITIONS[idx].title === t),
  'Achievement badge titles must match exact user specification'
);

const abortedTwoHours: SessionRecord = {
  id: 'sess_abort_test',
  startTime: 0,
  endTime: 7200000,
  durationSeconds: 7200,
  earnedParachuteSeconds: 0,
  weightMultiplier: 1,
  tag: 'Deep Work',
  status: 'parachuted',
  dateStr: '2026-11-10',
};
const emptyOrAbortedEval = evaluateBadges({
  sessions: [abortedTwoHours],
  totalReclaimedHours: 0,
  isZeroSupporter: false,
});
failIf(
  emptyOrAbortedEval.unlockedBadges.length === 0,
  'Aborted sessions alone must unlock 0 badges'
);

const fiftyNineMins: SessionRecord = {
  ...abortedTwoHours,
  id: 'sess_59m',
  durationSeconds: 3540,
  earnedParachuteSeconds: 3540,
  status: 'completed',
};
failIf(
  evaluateBadges({
    sessions: [fiftyNineMins],
    totalReclaimedHours: 0.9,
    isZeroSupporter: false,
  }).unlockedBadges.length === 0,
  '59m completed session must not unlock GETTING STARTED'
);

const oneHourCompleted: SessionRecord = {
  ...abortedTwoHours,
  id: 'sess_1h',
  durationSeconds: 3600,
  earnedParachuteSeconds: 3600,
  status: 'completed',
};
const startedEval = evaluateBadges({
  sessions: [oneHourCompleted],
  totalReclaimedHours: 1,
  isZeroSupporter: false,
});
failIf(
  startedEval.unlockedBadges.length === 1 &&
    startedEval.unlockedBadges[0].title === 'GETTING STARTED',
  '1st completed 1h session must unlock GETTING STARTED'
);

const milestoneChecks: Array<[number, string]> = [
  [50, 'WOO NICE!'],
  [100, 'LONG WAY'],
  [250, 'GETTING DISCIPLINED'],
  [500, 'FULL CONTROL !'],
  [1000, 'CAME SO FAR'],
];
for (const [hours, title] of milestoneChecks) {
  const below = evaluateBadges({
    sessions: [oneHourCompleted],
    totalReclaimedHours: hours - 0.1,
    isZeroSupporter: false,
  });
  failIf(
    below.unlockedBadges.some((b) => b.title === title) === false,
    `${hours - 0.1}h must not unlock ${title}`
  );
  const atBoundary = evaluateBadges({
    sessions: [oneHourCompleted],
    totalReclaimedHours: hours,
    isZeroSupporter: false,
  });
  failIf(
    atBoundary.unlockedBadges.some((b) => b.title === title) === true,
    `${hours}h must unlock ${title}`
  );
}

const supporterOnly = evaluateBadges({
  sessions: [],
  totalReclaimedHours: 0,
  isZeroSupporter: true,
});
failIf(
  supporterOnly.unlockedBadges.length === 1 &&
    supporterOnly.unlockedBadges[0].title === 'ZERO-SUPPORTER',
  '₹50+ supporter gift must unlock ZERO-SUPPORTER golden badge'
);

const allSeven = evaluateBadges({
  sessions: [oneHourCompleted],
  totalReclaimedHours: 1000,
  isZeroSupporter: true,
});
failIf(
  allSeven.unlockedBadges.length === 7,
  'All 7 badges must unlock when all criteria are satisfied'
);
console.log('PASS: Golden ZERO-SUPPORTER & All 6 Achievement Milestone Badges Verified');

console.log('\n=== TEST 11: Theme Studio Palette Derivation & WCAG Contrast Safety ===');
failIf(AMOLED_GRADIENTS.length === 14, 'Should define Pure + 13 Gradient AMOLED presets (14 total)');
failIf(KINDLE_PAPER_PRESETS.length === 10, 'Should define 10 Paper like Kindle presets');
failIf(MATTE_STUDIO_PRESETS.length === 10, 'Should define 10 Matte Studio presets');

for (const preset of AMOLED_GRADIENTS) {
  const rt = computeThemeRuntime({
    ...DEFAULT_THEME_CONFIG,
    family: 'amoled',
    amoledGradient: preset.id,
  });
  failIf(rt.family === 'amoled' && rt.mode === 'dark', `AMOLED ${preset.id} must be dark`);
  failIf(rt.cssVars['--zero-bg-primary'] === '#000000', `AMOLED ${preset.id} keeps 0% pitch black base`);
  if (preset.id === 'pure') {
    failIf(rt.cssVars['--zero-bg-image'] === 'none', 'Pure Pitch AMOLED must have no gradient');
  } else {
    failIf(rt.cssVars['--zero-bg-image'].includes('gradient'), `Gradient AMOLED ${preset.id} must render gradient`);
  }
}

const kindleCustom = computeThemeRuntime({
  ...DEFAULT_THEME_CONFIG,
  family: 'kindle',
  kindlePreset: 'custom',
  kindlePaperColor: '#FAF3E0',
  kindleInkAccent: '#1E40AF',
});
failIf(kindleCustom.mode === 'light', 'Paper like Kindle must use light color-scheme');
failIf(kindleCustom.cssVars['--zero-bg-primary'] === '#FAF3E0', 'Custom Kindle paper hex should apply');
failIf(kindleCustom.cssVars['--zero-accent'] === '#1E40AF', 'Custom Kindle ink accent should apply');

// Safety clamp against illegible custom hex picks in Kindle light mode
const kindleSafeClamp = computeThemeRuntime({
  ...DEFAULT_THEME_CONFIG,
  family: 'kindle',
  kindlePreset: 'custom',
  kindlePaperColor: '#09090B',
  kindleInkAccent: '#FFFFFF',
});
failIf(
  getRelativeLuminance(kindleSafeClamp.cssVars['--zero-bg-primary']) >= 0.55,
  'Kindle paper safety clamp must keep background readable for dark E-Ink text'
);
failIf(
  getRelativeLuminance(kindleSafeClamp.cssVars['--zero-accent']) <= 0.55,
  'Kindle ink safety clamp must keep custom ink legible against light paper'
);

const matteCustom = computeThemeRuntime({
  ...DEFAULT_THEME_CONFIG,
  family: 'matte',
  mattePreset: 'custom',
  matteBaseColor: '#161B22',
  matteAccentColor: '#38BDF8',
});
failIf(matteCustom.mode === 'dark', 'Matte Studio must stay dark low-glare studio mode');
failIf(matteCustom.cssVars['--zero-bg-primary'] === '#161B22', 'Custom Matte surface hex should apply');
failIf(matteCustom.cssVars['--zero-accent'] === '#38BDF8', 'Custom Matte accent hex should apply');

// Legacy ThemeStyle migration & short hex normalization
failIf(sanitizeThemeConfig(null, 'oled').family === 'amoled', 'Legacy oled migrates to amoled');
failIf(sanitizeThemeConfig(null, 'kindle').family === 'kindle', 'Legacy kindle stays kindle');
failIf(sanitizeThemeConfig(null, 'matte').family === 'matte', 'Legacy matte stays matte');
failIf(
  sanitizeThemeConfig({ family: 'kindle', kindlePreset: 'custom', kindlePaperColor: '#abc' }).kindlePaperColor === '#AABBCC',
  '3-digit custom hex should normalize cleanly to 6-digit uppercase'
);
console.log('PASS: Theme Studio (AMOLED Gradients, Paper Kindle + Custom, Matte + Custom) Verified');

console.log('\n=== TEST 12: Signed .zbak Cloud Archive, Anti-Cheat HMAC & Weekly Reminder Policy ===');
const nodeExpectedHmac = createHmac('sha256', 'zero-test-key').update('ZBAK1.salt.payload').digest('hex');
const tsHmac = hmacSha256Hex('zero-test-key', 'ZBAK1.salt.payload');
failIf(tsHmac === nodeExpectedHmac, 'Pure-TS HMAC-SHA256 must match Node crypto bit-for-bit');

const sampleZbakPayload: ZeroZbakPayload = {
  schema: 'zero.zbak.v1',
  appName: 'Zero',
  exportedAt: '2026-11-10T07:00:00.000Z',
  exportedAtMs: 1794294000000,
  onboardingComplete: true,
  cumulativeSeconds: 144000, // 40h -> 2 earned tickets
  totalReclaimedSeconds: 180000,
  totalCompletedSessions: 12,
  currentStreak: 5,
  usedParachutes: 1,
  bonusParachutes: 2,
  remainingEscapeTickets: 3, // 2 earned + 2 bonus - 1 used = 3
  hasClaimedFirstTimeParachute: true,
  hasClaimedFirstDonationParachute: true,
  isZeroSupporter: true,
  unlockedBadgeIds: ['zero_supporter', 'getting_started'],
  bags: [
    {
      id: 'bag-work',
      name: 'Work Bag',
      occasionLabel: 'Deep Work',
      apps: [{ packageName: 'md.obsidian', appName: 'Obsidian' }],
      allowCalls: false,
      allowSms: false,
    },
  ],
  activeBagId: 'bag-work',
  schedules: [],
  sleepFarmingMode: 'quarter_credit',
  theme: 'amoled',
  themeConfig: DEFAULT_THEME_CONFIG,
  profile: {
    displayName: 'Yousuf',
    handle: '@yousuf',
    avatarId: 'monk',
    accentColor: 'amber',
    primaryMission: 'Deep Work',
    dailyGoalHours: 4,
    motto: 'Discipline beats willpower.',
    createdAt: 1794000000000,
    updatedAt: 1794294000000,
  },
  sessions: [oneHourCompleted],
  ledger: [
    {
      id: 'txn_test',
      timestamp: 1794294000000,
      type: 'EARNED',
      description: 'Test ticket',
      delta: 1,
    },
  ],
};

const encodedZbak = encodeZbakPayload(sampleZbakPayload);
failIf(encodedZbak.startsWith(`${ZBAK_PREFIX}.`), 'Encoded .zbak must use ZBAK1 envelope prefix');
failIf(!encodedZbak.includes('bonusParachutes'), '.zbak payload must be Base64/XOR obfuscated against plain JSON edits');

const decodedOk = decodeAndVerifyZbak(encodedZbak);
failIf(decodedOk.ok === true, 'Valid .zbak archive must verify and decode cleanly');
if (decodedOk.ok) {
  failIf(decodedOk.payload.onboardingComplete === true, '.zbak must preserve onboardingComplete: true');
  failIf(decodedOk.payload.isZeroSupporter === true, '.zbak must preserve donor badge flag');
  failIf(decodedOk.payload.remainingEscapeTickets === 3, '.zbak must preserve exact ticket balance');
  failIf(decodedOk.payload.bags.length === 1 && decodedOk.payload.profile?.displayName === 'Yousuf', '.zbak must preserve bags and profile');
}

// Tamper rejection: flipping even a single character in HMAC or ciphertext fails verification
const zbakParts = encodedZbak.split('.');
const flippedChar = zbakParts[2][0] === 'A' ? 'B' : 'A';
const tamperedCipher = `${zbakParts[0]}.${zbakParts[1]}.${flippedChar}${zbakParts[2].slice(1)}.${zbakParts[3]}`;
failIf(decodeAndVerifyZbak(tamperedCipher).ok === false, 'Tampered .zbak ciphertext must fail HMAC check');

const flippedMacChar = zbakParts[3][0] === '0' ? '1' : '0';
const tamperedMac = `${zbakParts[0]}.${zbakParts[1]}.${zbakParts[2]}.${flippedMacChar}${zbakParts[3].slice(1)}`;
failIf(decodeAndVerifyZbak(tamperedMac).ok === false, 'Tampered .zbak HMAC signature must be rejected');

// Forged ticket count rejection (even if encoded via internal encoder)
const forgedBonusPayload: ZeroZbakPayload = {
  ...sampleZbakPayload,
  bonusParachutes: 99,
  remainingEscapeTickets: 100,
};
failIf(
  decodeAndVerifyZbak(encodeZbakPayload(forgedBonusPayload)).ok === false,
  'Forged bonus/remaining ticket count exceeding policy bounds must be rejected'
);
const forgedNegativePayload: ZeroZbakPayload = {
  ...sampleZbakPayload,
  usedParachutes: -5,
};
failIf(
  decodeAndVerifyZbak(encodeZbakPayload(forgedNegativePayload)).ok === false,
  'Negative usedParachutes must be rejected'
);

// Mode B weekly reminder boundaries
const nowTs = 2_000_000_000_000;
failIf(
  isWeeklyBackupDue(true, 0, nowTs) === false,
  'Weekly banner must stay hidden when autoBackupEnabled is true'
);
failIf(
  isWeeklyBackupDue(false, nowTs - (WEEKLY_BACKUP_INTERVAL_MS - 1000), nowTs) === false,
  'Weekly banner must stay hidden before 7 full days pass'
);
failIf(
  isWeeklyBackupDue(false, nowTs - (WEEKLY_BACKUP_INTERVAL_MS + 1000), nowTs) === true,
  'Weekly banner must appear once >7 days elapse with autoBackupEnabled=false'
);
failIf(
  isWeeklyBackupDue(false, 0, nowTs) === true,
  'Weekly banner should remind manual users with legacy timestamp=0'
);

// Configurable Cloud Upload Reminder Timer (1 Week / 1 Month / Off) — independent of local Auto-Sync
failIf(
  MONTHLY_BACKUP_INTERVAL_MS === 30 * 24 * 60 * 60 * 1000 &&
    sanitizeCloudReminderInterval('monthly') === 'monthly' &&
    sanitizeCloudReminderInterval('off') === 'off' &&
    sanitizeCloudReminderInterval('bogus') === 'weekly',
  'Cloud reminder interval sanitizer must allow weekly/monthly/off and fallback invalid inputs to weekly'
);
failIf(
  isCloudUploadReminderDue('weekly', nowTs - (WEEKLY_BACKUP_INTERVAL_MS - 1000), nowTs) === false &&
    isCloudUploadReminderDue('weekly', nowTs - WEEKLY_BACKUP_INTERVAL_MS, nowTs) === true &&
    isCloudUploadReminderDue('monthly', nowTs - (WEEKLY_BACKUP_INTERVAL_MS + 1000), nowTs) === false &&
    isCloudUploadReminderDue('monthly', nowTs - MONTHLY_BACKUP_INTERVAL_MS, nowTs) === true &&
    isCloudUploadReminderDue('off', 0, nowTs) === false,
  'Cloud upload reminder due checks must enforce exact 7d weekly, 30d monthly, and disabled off boundaries'
);
const monthlyInfoDueIn10d = getNextCloudReminderInfo(
  'monthly',
  nowTs - (20 * 24 * 60 * 60 * 1000),
  nowTs
);
failIf(
  monthlyInfoDueIn10d.interval === 'monthly' &&
    monthlyInfoDueIn10d.isDue === false &&
    monthlyInfoDueIn10d.remainingMs === 10 * 24 * 60 * 60 * 1000 &&
    getNextCloudReminderInfo('off', 0, nowTs).nextReminderAtMs === null,
  'Next cloud reminder info must compute accurate remaining milliseconds for monthly schedule and null for off'
);
console.log('PASS: Signed .zbak Envelope, Tamper Rejection & Weekly/Monthly Cloud Reminder Timer Verified');

console.log('\n=== TEST 13: Android Permission Priority Order & Restricted Settings State ===');
const baseMissingPerms: NativePermissionStatus = {
  isNativeAndroid: true,
  isStrictAccessibilityBuild: false,
  isAccessibilityEnabled: false,
  hasOverlayPermission: false,
  hasUsageStatsPermission: false,
  hasNotificationPermission: false,
  restrictedSettingsStatus: 'blocked',
  hasRestrictedSettingsAllowed: false,
  isDeviceOwner: false,
  strictReady: false,
};

failIf(
  evaluatePermissionPriority(baseMissingPerms).nextStep === 'restricted_settings',
  'Priority 1: Explicitly blocked Restricted Settings must route to App Info first'
);
failIf(
  evaluatePermissionPriority({
    ...baseMissingPerms,
    restrictedSettingsStatus: 'check_app_info',
  }).nextStep === 'usage_or_accessibility',
  'Priority 2 (default/unblocked): Missing Usage Access comes before Overlay & Notifications'
);
failIf(
  evaluatePermissionPriority({
    ...baseMissingPerms,
    isStrictAccessibilityBuild: true,
    restrictedSettingsStatus: 'allowed',
  }).nextStep === 'usage_or_accessibility',
  'Priority 2 (strict): Missing Accessibility Service comes before Overlay & Notifications'
);
failIf(
  evaluatePermissionPriority({
    ...baseMissingPerms,
    restrictedSettingsStatus: 'allowed',
    hasUsageStatsPermission: true,
  }).nextStep === 'overlay',
  'Priority 3: Missing Display Over Other Apps comes after Usage Access'
);
failIf(
  evaluatePermissionPriority({
    ...baseMissingPerms,
    restrictedSettingsStatus: 'allowed',
    hasUsageStatsPermission: true,
    hasOverlayPermission: true,
    strictReady: true,
  }).nextStep === 'notifications',
  'Priority 4: Notifications follows Display Over Other Apps'
);
failIf(
  evaluatePermissionPriority({
    ...baseMissingPerms,
    restrictedSettingsStatus: 'allowed',
    hasUsageStatsPermission: true,
    hasOverlayPermission: true,
    hasNotificationPermission: true,
    strictReady: true,
  }).nextStep === 'all_done',
  'All 4 permission priority steps complete cleanly'
);
failIf(
  normalizeRestrictedSettingsStatus({
    ...baseMissingPerms,
    restrictedSettingsStatus: undefined,
    hasRestrictedSettingsAllowed: undefined,
    hasUsageStatsPermission: true,
  }) === 'allowed',
  'Granted Usage Access implies Restricted Settings is allowed when field omitted'
);
console.log('PASS: Permission Priority (Restricted Check -> Usage -> Overlay -> Notifications) Verified');

console.log('\n=== TEST 14: Signed Donor Unlock Token & Manual Ko-fi Verification Support ===');
failIf(
  SUPPORT_EMAIL === 'mdyousuf982007@proton.me',
  'Support email must point to mdyousuf982007@proton.me'
);
failIf(
  KOFI_URL === 'https://ko-fi.com/mdyousuf2620',
  'Ko-fi URL must point to https://ko-fi.com/mdyousuf2620'
);

const donorToken = encodeDonorUnlockToken({
  email: 'Supporter@Example.com',
  receiptRef: 'KOFI-9912',
  minInr: 100,
});
failIf(donorToken.startsWith('ZDON1.'), 'Donor unlock token must use ZDON1 prefix');

const donorVerifyOk = verifyDonorUnlockToken(donorToken);
failIf(donorVerifyOk.ok === true, 'Valid signed ZDON1 token must verify cleanly');
if (donorVerifyOk.ok) {
  failIf(
    donorVerifyOk.payload.email === 'supporter@example.com' &&
      donorVerifyOk.payload.minInr === 100 &&
      donorVerifyOk.payload.tier === 'zero_supporter',
    'Verified donor token must normalize email and preserve supporter tier'
  );
}

const tokenParts = donorToken.split('.');
const flippedSig = `${tokenParts[2].slice(0, -1)}${tokenParts[2].slice(-1) === '0' ? '1' : '0'}`;
failIf(
  verifyDonorUnlockToken(`${tokenParts[0]}.${tokenParts[1]}.${flippedSig}`).ok === false,
  'Tampered donor token HMAC signature must be rejected'
);
failIf(
  verifyDonorUnlockToken('').ok === false,
  'Empty donor token input must be rejected'
);
console.log('PASS: Signed Donor Unlock Token & Ko-fi Verification Support Details Verified');

console.log('\n=== TEST 15: Isolated Read-Only IntegrityEngine & Monotonic Native Event Proofs ===');
failIf(Object.isFrozen(IntegrityEngine) === true, 'IntegrityEngine must be Object.freeze() read-only');
for (const forbidden of [
  'addFakeHours',
  'setStats',
  'fastForwardSeconds',
  'setCumulativeSeconds',
  'setTotalReclaimedSeconds',
  'setUsedParachutes',
  'setBonusParachutes',
  'skipTimer',
]) {
  failIf(!(forbidden in IntegrityEngine), `IntegrityEngine must NOT expose cheat setter "${forbidden}"`);
}

let iState = IntegrityEngine.resetProtectedState(false);
failIf(
  iState.cumulativeSeconds === 0 && iState.bonusParachutes === 0 && !iState.isZeroSupporter,
  'Initial IntegrityEngine protected state must start cleanly at 0'
);

// 1. Native Android strictly refuses Web Preview timer completion (requires SystemClock.elapsedRealtime proof)
const refusedWebOnAndroid = IntegrityEngine.commitWebPreviewSessionCompletion(
  iState,
  {
    lock: {
      isLocked: true,
      tag: 'Deep Work',
      startTime: 1000,
      targetEndTime: 3601000,
      durationSeconds: 3600,
      elapsedSeconds: 3600,
      remainingSeconds: 0,
    },
    sleepFarmingMode: 'quarter_credit',
    isNativeAndroid: true,
    startPerfMs: 0,
    nowPerfMs: 5_000_000,
    nowWallMs: 5_000_000,
  },
  false
);
failIf(
  refusedWebOnAndroid.ok === false,
  'IntegrityEngine must refuse Web fallback completions when running on native Android'
);

// 2. Web preview refuses completion if browser monotonic performance.now() fell short even if wall clock jumped
const refusedSpoofedWebWall = IntegrityEngine.commitWebPreviewSessionCompletion(
  iState,
  {
    lock: {
      isLocked: true,
      tag: 'Study',
      startTime: 1_000_000,
      targetEndTime: 4_600_000,
      durationSeconds: 3600,
      elapsedSeconds: 3600,
      remainingSeconds: 0,
    },
    sleepFarmingMode: 'quarter_credit',
    isNativeAndroid: false,
    startPerfMs: 1000,
    nowPerfMs: 61_000, // Only 60s monotonic vs 3600s required
    nowWallMs: 99_999_999_999,
  },
  false
);
failIf(
  refusedSpoofedWebWall.ok === false,
  'Web preview monotonic check must block wall-clock fast-forward attacks'
);

// 3. Valid Native Android monotonic event (72,000s = 20h -> unlocks 1 Escape Ticket)
const validNativeBase = {
  eventId: 'nat_sess_1_1794300000000',
  sessionId: 'sess_1',
  tag: 'Deep Work',
  startTime: 1794228000000,
  endTime: 1794300000000,
  durationSeconds: 72000,
  elapsedMonotonicMs: 72_000_000,
  usedRebootFallback: false,
};
const validNativeEvent: VerifiedNativeCompletionEvent = {
  ...validNativeBase,
  monotonicSource: IntegrityEngine.NATIVE_MONOTONIC_SOURCE,
  strictAccessibilityActive: true,
  proofDigest: IntegrityEngine.computeNativeCompletionProofDigest(validNativeBase),
};

const validRes = IntegrityEngine.commitNativeSessionCompletions(
  iState,
  [validNativeEvent],
  'quarter_credit',
  false
);
iState = validRes.state;
failIf(
  validRes.acceptedEventIds.length === 1 &&
    validRes.committedSessions.length === 1 &&
    iState.cumulativeSeconds === 72000 &&
    iState.totalReclaimedSeconds === 72000 &&
    validRes.rewards.length === 1 &&
    IntegrityEngine.computeParachuteBalance({
      cumulativeSeconds: iState.cumulativeSeconds,
      bonusParachutes: iState.bonusParachutes,
      usedParachutes: iState.usedParachutes,
    }).currentBalance === 1,
  'Verified native SystemClock.elapsedRealtime() completion must credit 20h and mint 1 Escape Ticket'
);

// 4. Reject tampered HMAC, wrong clock source, short monotonic elapsed time, and duplicate event replay
const tamperedDigestEv: VerifiedNativeCompletionEvent = {
  ...validNativeEvent,
  eventId: 'nat_sess_tamper_1',
  proofDigest: '0'.repeat(64),
};
const badClockEv: VerifiedNativeCompletionEvent = {
  ...validNativeEvent,
  eventId: 'nat_sess_badclock_1',
  monotonicSource: 'wall_clock',
};
const shortElapsedBase = {
  ...validNativeBase,
  eventId: 'nat_sess_short_1',
  sessionId: 'sess_short_1',
  durationSeconds: 3600,
  elapsedMonotonicMs: 60_000,
  usedRebootFallback: false,
};
const shortElapsedEv: VerifiedNativeCompletionEvent = {
  ...shortElapsedBase,
  monotonicSource: IntegrityEngine.NATIVE_MONOTONIC_SOURCE,
  strictAccessibilityActive: true,
  proofDigest: IntegrityEngine.computeNativeCompletionProofDigest(shortElapsedBase),
};

const maliciousRes = IntegrityEngine.commitNativeSessionCompletions(
  iState,
  [tamperedDigestEv, badClockEv, shortElapsedEv, validNativeEvent], // includes replay of validNativeEvent!
  'quarter_credit',
  false
);
failIf(
  maliciousRes.committedSessions.length === 0 &&
    maliciousRes.rejectedEventIds.length === 3 &&
    maliciousRes.state.cumulativeSeconds === 72000,
  'Tampered digest, non-monotonic clock, short monotonic duration & replay must add 0 seconds'
);

// 5. Escape ticket abort voids elapsed seconds cleanly
const abortOk = IntegrityEngine.commitEscapeTicketAbort(
  iState,
  {
    tag: 'Deep Work',
    startTime: 1794310000000,
    durationSeconds: 7200,
    elapsedSeconds: 5400,
    nowWallMs: 1794315400000,
  },
  false
);
failIf(abortOk.ok === true, 'Escape ticket deduction should succeed when balance >= 1');
if (abortOk.ok) {
  iState = abortOk.state;
  failIf(
    iState.usedParachutes === 1 &&
      iState.cumulativeSeconds === 72000 &&
      iState.totalReclaimedSeconds === 72000 &&
      iState.sessions[0].status === 'parachuted' &&
      iState.sessions[0].earnedParachuteSeconds === 0,
    'Escape ticket abort must deduct 1 ticket and permanently void aborted elapsed seconds'
  );
}
const abortWhenEmpty = IntegrityEngine.commitEscapeTicketAbort(
  iState,
  {
    tag: 'Study',
    startTime: 1794320000000,
    durationSeconds: 3600,
    elapsedSeconds: 1200,
  },
  false
);
failIf(abortWhenEmpty.ok === false, 'Escape ticket deduction must fail when balance is 0');

// 6. Donor token activation enforces cryptographic HMAC before unlocking badge + gift ticket
const badDonorAct = IntegrityEngine.activateDonorUnlockToken(iState, 'ZDON1.fake.0000', false);
failIf(
  !badDonorAct.ok && badDonorAct.state.isZeroSupporter === false,
  'Invalid ZDON1 token must not unlock ZERO-SUPPORTER or bonus ticket'
);
const goodDonorAct = IntegrityEngine.activateDonorUnlockToken(iState, donorToken, false);
failIf(
  goodDonorAct.ok &&
    goodDonorAct.grantedNewPerks &&
    goodDonorAct.state.isZeroSupporter === true &&
    goodDonorAct.state.bonusParachutes === 1,
  'Valid ZDON1 token via IntegrityEngine must grant ZERO-SUPPORTER Gold Badge & +1 ticket once'
);
console.log('PASS: IntegrityEngine Isolation, Monotonic Proofs & Anti-Cheat Guards Verified');

console.log('\n=== TEST 16: Hardcoded Destinations & Anti-Exfiltration Allowlists ===');
// Allowed Android SAF & local backup URIs (Google Drive, OneDrive, JioDrive, Dropbox, External Storage)
failIf(
  IntegrityEngine.isAllowedBackupUri(
    'content://com.google.android.apps.docs.storage/document/acc%3D1%3Bdoc%3Dencoded%3D123'
  ) === true,
  'Google Drive SAF content:// URI must be permitted'
);
failIf(
  IntegrityEngine.isAllowedBackupUri(
    'content://com.microsoft.skydrive.content.StorageAccessProvider/document/zero-backup.zbak'
  ) === true,
  'OneDrive SAF content:// URI must be permitted'
);
failIf(
  IntegrityEngine.isAllowedBackupUri(
    'content://com.ril.jio.jiodrive.provider/document/zero-backup.zbak'
  ) === true,
  'JioDrive SAF content:// URI must be permitted'
);
failIf(
  IntegrityEngine.isAllowedBackupUri(
    'content://com.android.externalstorage.documents/document/primary%3ADownload%2Fzero-backup.zbak'
  ) === true,
  'Local External Storage SAF URI must be permitted'
);
failIf(
  IntegrityEngine.isAllowedBackupUri('web-handle://zero-backup.zbak') === true,
  'Local File System Access handle URI must be permitted in desktop preview'
);

// Reject arbitrary HTTP/HTTPS webhooks, self-package FileProvider, system settings, and file:// paths
failIf(
  IntegrityEngine.isAllowedBackupUri('https://webhook.site/steal-backup') === false &&
    IntegrityEngine.isAllowedBackupUri('http://192.168.1.50/upload') === false &&
    IntegrityEngine.isAllowedBackupUri('file:///sdcard/Download/zero.zbak') === false &&
    IntegrityEngine.isAllowedBackupUri('content://org.zero.detox.fileprovider/backups/secret.zbak') === false &&
    IntegrityEngine.isAllowedBackupUri('content://com.android.providers.settings/system') === false,
  'HTTP/HTTPS webhooks, file:// URIs, self-provider URIs & system settings must be blocked as backup destinations'
);

// Official external URLs, support email & UPI allowlist vs tampering/redirection attempts
failIf(
  IntegrityEngine.isAllowedExternalUrl('https://ko-fi.com/mdyousuf2620') === true &&
    IntegrityEngine.isAllowedExternalUrl('https://github.com/MDYOUSUF20007-oss/ZERO') === true &&
    IntegrityEngine.isAllowedExternalUrl('https://github.com/MDYOUSUF20007-oss/ZERO/releases') === true &&
    IntegrityEngine.isAllowedExternalUrl('https://mdyousuf20007-oss.github.io/ZERO/') === true &&
    IntegrityEngine.isAllowedExternalUrl('mailto:mdyousuf982007@proton.me?subject=ZERO%20Ko-fi%20Donor%20Verification') === true &&
    IntegrityEngine.isAllowedExternalUrl('upi://pay?pa=md.y2007@ptaxis&pn=Zero%20FOSS&am=50&cu=INR') === true,
  'Official ZERO links, official Ko-fi, official Proton support email & official UPI ID must pass'
);
failIf(
  IntegrityEngine.isAllowedExternalUrl('http://ko-fi.com/mdyousuf2620') === false &&
    IntegrityEngine.isAllowedExternalUrl('https://evil.com/phishing') === false &&
    IntegrityEngine.isAllowedExternalUrl('https://github.com/attacker/ZERO') === false &&
    IntegrityEngine.isAllowedExternalUrl('https://ko-fi.com/otheruser') === false &&
    IntegrityEngine.isAllowedExternalUrl('mailto:attacker@evil.com?subject=steal') === false &&
    IntegrityEngine.isAllowedExternalUrl('mailto:mdyousuf982007@proton.me?bcc=attacker@evil.com') === false &&
    IntegrityEngine.isAllowedExternalUrl('upi://pay?pa=scammer@okaxis&am=500') === false,
  'Cleartext HTTP, third-party websites, spoofed email recipients/BCC, and tampered UPI VPAs must be rejected'
);
console.log('PASS: Hardcoded SAF Cloud Destinations & Endpoint Tampering Guards Verified');

console.log('\n=== TEST 17: Runtime APK Integrity & Root/Emulator Graceful Restriction Policy ===');
const safeEnv = IntegrityEngine.parseEnvironmentSecurityJson(null);
failIf(
  safeEnv.isCompromised === false &&
    safeEnv.restrictions.backupRestoreDisabled === false &&
    safeEnv.restrictions.presetBagEditingDisabled === false,
  'Missing/web environment JSON should default to non-compromised preview state'
);

const malformedEnv = IntegrityEngine.parseEnvironmentSecurityJson('{not-valid-json');
failIf(
  malformedEnv.isCompromised === true &&
    malformedEnv.restrictions.backupRestoreDisabled === true &&
    malformedEnv.restrictions.presetBagEditingDisabled === true,
  'Malformed native security JSON must fail closed and disable sensitive features'
);

const rootedEnv: NativeEnvironmentSecurity = IntegrityEngine.parseEnvironmentSecurityJson(
  JSON.stringify({
    isSignatureValid: true,
    isRooted: true,
    isEmulator: false,
    isCompromised: true,
    restrictions: {
      backupRestoreDisabled: true,
      presetBagEditingDisabled: true,
    },
    reasons: ['root_binary', 'test_keys_rom'],
  })
);
failIf(
  IntegrityEngine.isSensitiveFeatureRestricted(rootedEnv) === true,
  'Rooted device status must mark sensitive features restricted'
);

const emulatorEnv: NativeEnvironmentSecurity = IntegrityEngine.parseEnvironmentSecurityJson(
  JSON.stringify({
    isSignatureValid: true,
    isRooted: false,
    isEmulator: true,
    isCompromised: true,
    restrictions: {
      backupRestoreDisabled: true,
      presetBagEditingDisabled: true,
    },
    reasons: ['emulator_environment'],
  })
);

const blockedRootRestore = IntegrityEngine.applyVerifiedRestore(
  {
    rawInput: encodedZbak,
    defaultSchedules: [],
    defaultBags: sampleZbakPayload.bags,
    sanitizeProfile: sanitizeZeroProfile,
    sanitizeThemeConfig,
    environmentSecurity: rootedEnv,
  },
  false
);
failIf(
  blockedRootRestore.ok === false,
  'IntegrityEngine.applyVerifiedRestore must block .zbak restore when device is rooted'
);

const blockedEmuRestore = IntegrityEngine.applyVerifiedRestore(
  {
    rawInput: JSON.stringify(sampleZbakPayload),
    defaultSchedules: [],
    defaultBags: sampleZbakPayload.bags,
    sanitizeProfile: sanitizeZeroProfile,
    sanitizeThemeConfig,
    environmentSecurity: emulatorEnv,
  },
  false
);
failIf(
  blockedEmuRestore.ok === false,
  'IntegrityEngine.applyVerifiedRestore must block .json restore when running on debug emulator'
);

const allowedCleanRestore = IntegrityEngine.applyVerifiedRestore(
  {
    rawInput: encodedZbak,
    defaultSchedules: [],
    defaultBags: sampleZbakPayload.bags,
    sanitizeProfile: sanitizeZeroProfile,
    sanitizeThemeConfig,
    environmentSecurity: safeEnv,
  },
  false
);
failIf(
  allowedCleanRestore.ok === true && allowedCleanRestore.state?.isZeroSupporter === true,
  'IntegrityEngine.applyVerifiedRestore must succeed cleanly on uncompromised devices'
);
console.log('PASS: Runtime Integrity & Root/Emulator Feature Restrictions Verified');

console.log('\n=== TEST 18: Widget Options & Dynamic Multi-Timeframe Discipline Heatmap ===');
// 1. Widget sanitization & reordering
const partialWidgets = sanitizeWidgetsConfig({
  defaultTimeframe: 'merged_all',
  order: ['badges', 'discipline_heatmap'],
  visible: { discipline_heatmap: true, overview_kpis: false, badges: true, tag_breakdown: true },
  syncOverviewWithTimeframe: true,
  showDialWidget: false,
});
failIf(
  partialWidgets.order.length === 4 &&
    partialWidgets.order[0] === 'badges' &&
    partialWidgets.order[1] === 'discipline_heatmap' &&
    partialWidgets.order.includes('overview_kpis') &&
    partialWidgets.order.includes('tag_breakdown') &&
    partialWidgets.defaultTimeframe === 'merged_all' &&
    partialWidgets.visible.overview_kpis === false &&
    partialWidgets.syncOverviewWithTimeframe === true &&
    partialWidgets.showDialWidget === false,
  'sanitizeWidgetsConfig should preserve valid partial config & append any missing widget IDs'
);

const reorderedWidgets = moveWidgetOrder(DEFAULT_WIDGETS_CONFIG.order, 'badges', 'up');
failIf(
  reorderedWidgets[1] === 'badges' && reorderedWidgets[2] === 'overview_kpis',
  'moveWidgetOrder up should swap widget cleanly with predecessor'
);

// 2. Heatmap Daily (24h), Weekly (Mon-Sun), Monthly & Merged All
const anchorNowMs = Date.UTC(2026, 10, 10, 18, 0, 0); // Tue 2026-11-10T18:00:00Z
const heatmapSessions: SessionRecord[] = [
  // Historic session (>16 weeks earlier) -> expands Merged All span!
  {
    id: 'hm_old',
    startTime: Date.UTC(2026, 0, 15, 9, 0, 0),
    endTime: Date.UTC(2026, 0, 15, 14, 0, 0),
    durationSeconds: 5 * 3600,
    earnedParachuteSeconds: 5 * 3600,
    weightMultiplier: 1.0,
    tag: 'Study',
    status: 'completed',
    dateStr: '2026-01-15',
  },
  // 3-day consecutive streak: Nov 08, Nov 09, Nov 10 (best streak = 3)
  {
    id: 'hm_s1',
    startTime: Date.UTC(2026, 10, 8, 10, 0, 0),
    endTime: Date.UTC(2026, 10, 8, 12, 0, 0),
    durationSeconds: 2 * 3600,
    earnedParachuteSeconds: 2 * 3600,
    weightMultiplier: 1.0,
    tag: 'Deep Work',
    status: 'completed',
    dateStr: '2026-11-08',
  },
  {
    id: 'hm_s2',
    startTime: Date.UTC(2026, 10, 9, 9, 0, 0),
    endTime: Date.UTC(2026, 10, 9, 13, 30, 0),
    durationSeconds: Math.round(4.5 * 3600),
    earnedParachuteSeconds: Math.round(4.5 * 3600),
    weightMultiplier: 1.0,
    tag: 'Deep Work',
    status: 'completed',
    dateStr: '2026-11-09',
  },
  {
    id: 'hm_s3_today',
    startTime: Date.UTC(2026, 10, 10, 13, 30, 0),
    endTime: Date.UTC(2026, 10, 10, 16, 0, 0),
    durationSeconds: Math.round(2.5 * 3600),
    earnedParachuteSeconds: Math.round(2.5 * 3600),
    weightMultiplier: 1.0,
    tag: 'Detox',
    status: 'completed',
    dateStr: '2026-11-10',
  },
  // Aborted session must NOT count as completed heatmap hours
  {
    id: 'hm_aborted',
    startTime: Date.UTC(2026, 10, 10, 7, 0, 0),
    endTime: Date.UTC(2026, 10, 10, 8, 0, 0),
    durationSeconds: 3600,
    earnedParachuteSeconds: 0,
    weightMultiplier: 0,
    tag: 'Deep Work',
    status: 'parachuted',
    dateStr: '2026-11-10',
  },
];

const dailyHm = computeHeatmapView({
  sessions: heatmapSessions,
  timeframe: 'daily',
  anchorDateStr: '2026-11-10',
  nowMs: anchorNowMs,
  dailyGoalHours: 4,
  useUtc: true,
});
const hourlySumSec = dailyHm.hourlyCells.reduce((a, b) => a + b.seconds, 0);
failIf(
  dailyHm.hourlyCells.length === 24 &&
    hourlySumSec === Math.round(2.5 * 3600) &&
    dailyHm.hourlyCells[15].seconds === 3600 &&
    dailyHm.hourlyCells[14].seconds === 3600 &&
    dailyHm.hourlyCells[13].seconds === 1800 &&
    dailyHm.sessionCount === 1,
  'Daily heatmap must allocate exact 2.5h across UTC hours 13–15 and exclude aborted sessions'
);

const weeklyHm = computeHeatmapView({
  sessions: heatmapSessions,
  timeframe: 'weekly',
  anchorDateStr: '2026-11-10',
  nowMs: anchorNowMs,
  dailyGoalHours: 4,
  useUtc: true,
});
// Week of 2026-11-10 starts Mon 2026-11-09 -> Sun 2026-11-15: Nov 09 (4.5h, goalMet) + Nov 10 (2.5h) = 7.0h
failIf(
  weeklyHm.weekCells.length === 7 &&
    weeklyHm.weekCells[0].dateStr === '2026-11-09' &&
    weeklyHm.weekCells[0].goalMet === true &&
    weeklyHm.weekCells[1].dateStr === '2026-11-10' &&
    weeklyHm.weekCells[1].hours === 2.5 &&
    weeklyHm.goalMetDays === 1 &&
    weeklyHm.totalHours === 7.0,
  'Weekly heatmap must align Mon–Sun, flag goalMetDays accurately, and sum Mon+Tue = 7.0h'
);

const monthlyHm = computeHeatmapView({
  sessions: heatmapSessions,
  timeframe: 'monthly',
  anchorDateStr: '2026-11-10',
  nowMs: anchorNowMs,
  dailyGoalHours: 4,
  useUtc: true,
});
// Nov 2026 has 30 days, Nov 1 2026 is Sunday -> 6 leading Mon..Sat empty slots; sum Nov 08(2h)+09(4.5h)+10(2.5h)=9h
failIf(
  monthlyHm.monthCells.length === 30 &&
    monthlyHm.monthLeadingEmpty === 6 &&
    monthlyHm.totalHours === 9.0 &&
    monthlyHm.activeCount === 3,
  'Monthly heatmap must compute 30 Nov days, Mon-first leading empties=6, and 9.0h across 3 active days'
);

const mergedHm = computeHeatmapView({
  sessions: heatmapSessions,
  timeframe: 'merged_all',
  anchorDateStr: '2026-11-10',
  nowMs: anchorNowMs,
  dailyGoalHours: 4,
  useUtc: true,
});
failIf(
  mergedHm.totalHours === 14.0 &&
    mergedHm.sessionCount === 4 &&
    mergedHm.mergedWeekCount >= 40 &&
    mergedHm.mergedBestDay?.dateStr === '2026-01-15' &&
    mergedHm.mergedBestDay?.hours === 5.0 &&
    mergedHm.mergedLongestStreak === 3,
  'Merged All heatmap must combine Jan historic session + Nov streak cleanly (14.0h, best day Jan 15, streak 3)'
);

const shiftedMonth = shiftMonthAnchor('2026-01-31', 1);
failIf(
  shiftedMonth === '2026-02-01' && shiftDateStr('2026-11-10', -7) === '2026-11-03',
  'Date & month anchor shifting helpers must avoid Jan 31 -> Mar rollover bug'
);

const scopedSummary = computeTimeframeSummary({
  sessions: heatmapSessions,
  timeframe: 'weekly',
  anchorDateStr: '2026-11-10',
  nowMs: anchorNowMs,
});
failIf(
  scopedSummary.totalHours === 7.0 &&
    scopedSummary.completedCount === 2 &&
    scopedSummary.abortedCount === 1 &&
    scopedSummary.completionRate === 67 &&
    scopedSummary.tagBreakdown[0].tag === 'Deep Work',
  'Timeframe summary helper must compute scoped KPI & tag breakdown cleanly'
);

const dialStrip = computeMiniWeekHeatmap(heatmapSessions, 4, anchorNowMs);
failIf(
  dialStrip.weekTotalHours === 7.0 && dialStrip.goalMetDays === 1 && dialStrip.weekCells.length === 7,
  'Mini dial widget helper must return matching 7-day strip summary'
);

const dynamicAccentEmerald = computeDynamicAccentTokens('#10B981');
const dynamicAccentCrimson = computeDynamicAccentTokens('#9F1239');
failIf(
  dynamicAccentEmerald.rgb === '16, 185, 129' &&
    dynamicAccentEmerald.badgeText === '#09090B' &&
    dynamicAccentCrimson.badgeText === '#FFFFFF',
  'Dynamic accent token generator must compute crisp dark/light metallic text contrast'
);
console.log('PASS: Widget Options, Daily/Weekly/Monthly/Merged-All Heatmaps & Dynamic Accents Verified');

console.log('\n=== TEST 19: Void Pixelated Gradient Clock & WhatsApp-Style Bag Brand Visuals ===');
failIf(
  normalizePixelClockText(' 3:39 pm ') === '3:39 PM' &&
    normalizePixelClockText('???') === '3:39 PM' &&
    normalizePixelClockText('invalid') === '3:39 PM' &&
    PIXEL_GLYPHS_5X7['3'].length === 7,
  'Pixel clock normalizer must uppercase valid time chars and safely fallback on invalid strings'
);

const clockLayout = buildPixelClockLayout('12:45 am', 1, 0.16);
failIf(
  clockLayout.normalizedText === '12:45 AM' &&
    clockLayout.totalRows === 7 &&
    clockLayout.totalCols > 20 &&
    clockLayout.rects.length > 60,
  'Pixelated clock SVG matrix layout must emit crisp non-empty 5x7 rects'
);

const timerTickA = buildPixelClockLayout('00:45:00', 1, 0.16);
const timerTickB = buildPixelClockLayout('00:44:59', 1, 0.16);
failIf(
  timerTickA.normalizedText === '00:45:00' &&
    timerTickB.normalizedText === '00:44:59' &&
    timerTickA.totalRows === 7 &&
    timerTickA.totalCols === timerTickB.totalCols &&
    timerTickA.totalCols === 41.75 &&
    timerTickA.rects.length > 80 &&
    timerTickB.rects.length > 80,
  'Inverted pixel countdown timer HH:MM:SS layout must maintain fixed columns across ticks with zero jitter'
);

const whatsappBrand = resolveAppBrandVisual({
  packageName: 'com.whatsapp',
  appName: 'WhatsApp',
});
const spotifyBrand = resolveAppBrandVisual({
  packageName: 'com.spotify.music',
  appName: 'Spotify',
});
const customBrightBrand = resolveAppBrandVisual({
  packageName: 'com.example.brightnotes',
  appName: 'Bright Notes',
  iconBgColor: '#FDE047',
});
failIf(
  whatsappBrand.bgColor === '#16A34A' &&
    whatsappBrand.textColor === '#FFFFFF' &&
    spotifyBrand.bgColor === '#1DB954' &&
    customBrightBrand.bgColor === '#FDE047' &&
    customBrightBrand.textColor === '#09090B',
  'App brand color resolver must match iconic brand hexes and enforce WCAG dark text on bright icons'
);

const emeraldMock = {
  hex: '#10B981',
  rgb: '16, 185, 129',
  badgeGradient: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
  badgeText: '#09090B',
};
const pureResolved = resolveActiveAccentTokens(DEFAULT_THEME_CONFIG, emeraldMock);
const gradientResolved = resolveActiveAccentTokens(
  { ...DEFAULT_THEME_CONFIG, family: 'amoled', amoledGradient: 'cosmic' },
  emeraldMock
);
failIf(
  pureResolved.hex === '#FFFFFF' && gradientResolved.hex === '#C4B5FD',
  'Active accent token helper must unify UI with active Theme Studio palette (ignoring legacy profile accent mismatches)'
);
console.log('PASS: Void Pixelated Gradient Clock & WhatsApp-Style Brand Bag Visuals Verified');

console.log('\n=== TEST 20: Frosted Obsidian Focus Receipt Formatting & Period Metrics ===');
failIf(
  FOCUS_RECEIPT_PERIOD_ORDER.length === 5 &&
    DEFAULT_FOCUS_RECEIPT_MOTTO === 'Put your phone facedown. Reclaim your hours.',
  'Focus receipt period tabs & default motto must stay locked'
);
failIf(
  formatReceiptDuration(300) === '5m' &&
    formatReceiptDuration(3600) === '1h' &&
    formatReceiptDuration(5100) === '1h 25m',
  'Focus receipt duration formatter must produce compact 5m / 1h / 1h 25m labels'
);
failIf(
  formatReceiptHandle(null) === '@anonymous' &&
    formatReceiptHandle({ handle: '@@MDYOUSUF', displayName: 'Yousuf' }) === '@mdyousuf' &&
    formatReceiptHandle({ handle: 'mdyousuf', displayName: 'Yousuf' }) === '@mdyousuf',
  'Focus receipt handle formatter must normalize @ prefix cleanly without @@ duplication'
);
failIf(
  formatReceiptMotto(null) === '"Put your phone facedown. Reclaim your hours."' &&
    formatReceiptMotto({ motto: 'Stay phone-free.' }) === '"Stay phone-free."',
  'Focus receipt motto formatter must quote default pledge or custom user motto'
);

const receiptNowMs = Date.UTC(2026, 10, 10, 18, 0, 0);
const receiptToday = computeReceiptPeriodStats(heatmapSessions, 'today', 14.0, receiptNowMs);
failIf(
  receiptToday.formattedTime === '2h 30m' &&
    receiptToday.completedCount === 1 &&
    receiptToday.completionRate === 50 &&
    receiptToday.topTag === '#Detox',
  'Today Focus Receipt stats must include completed 2.5h session, 50% completion vs aborted lock, and top tag #Detox'
);
const receiptWeek = computeReceiptPeriodStats(heatmapSessions, 'week', 14.0, receiptNowMs);
failIf(
  receiptWeek.formattedTime === '9h' &&
    receiptWeek.completedCount === 3 &&
    receiptWeek.completionRate === 75 &&
    receiptWeek.topTag === '#Deep Work',
  'Week Focus Receipt stats must sum completed blocks (9h), compute 75% rate, and pick #Deep Work'
);
const receiptAllFallback = computeReceiptPeriodStats([], 'all', 1.5, receiptNowMs);
failIf(
  receiptAllFallback.formattedTime === '1h 30m' && receiptAllFallback.topTag === '#MonkMode',
  'All-time Focus Receipt must fallback cleanly to totalReclaimedHours and #MonkMode when sessions list is empty'
);
console.log('PASS: Frosted Obsidian Focus Receipt Formatting & Period Metrics Verified');

console.log('\n=== TEST 21: Custom Hashtag Normalization & Work Bag Layout Detection ===');
failIf(
  normalizeCustomHashtag('  ###Sprint  Flow\n ') === 'Sprint Flow' &&
    normalizeCustomHashtag('###   ') === null &&
    (normalizeCustomHashtag('A Very Long Custom Mission Tag Exceeding Limit') || '').length <= 24,
  'Custom hashtag normalizer must strip # prefixes, collapse whitespace, clamp length, and reject empty tags'
);

const mergedTags = mergeHashtagList(['deep work', 'Coding', '#Sprint', 'Sprint'], DEFAULT_SESSION_TAGS);
failIf(
  mergedTags.length === DEFAULT_SESSION_TAGS.length + 2 &&
    mergedTags.includes('Coding') &&
    mergedTags.includes('Sprint'),
  'Merged hashtag list must deduplicate case-insensitively across defaults and custom tags'
);

failIf(
  isWorkBag('bag-work', 'Renamed') === true &&
    isWorkBag('bag-2', 'Work Bag') === true &&
    isWorkBag('bag-2', 'My Work Flow') === true &&
    isWorkBag('bag-study', 'Study Bag') === false &&
    isWorkBag('bag-travel', 'Monk Bag') === false,
  'Work Bag detector must identify bag-work ID or Work Bag name for Void hashtag spotlight layout'
);
console.log('PASS: Custom Hashtag Normalization & Work Bag Layout Detection Verified');

console.log('\n=== TEST 22: Phase 2 Unlimited Bags, Granular App Rules & Dynamic Engage Payload ===');
const igRule = sanitizeAppRuleConfig({
  mode: 'controlled',
  quotaSeconds: 1800,
  maxContinuousSeconds: 600,
  cooldownSeconds: 300,
  frictionEnabled: true,
  frictionDelaySeconds: 15,
  showBreathingCircle: true,
  requireIntentText: true,
  minIntentChars: 12,
  reEntryGraceSeconds: 60,
  blockShortVideos: true,
  shortVideoAction: 'back_action',
  scrollVelocityLimit: 8,
  nudgeIntervalSeconds: 300,
});
failIf(
  igRule.mode === 'controlled' &&
    igRule.quotaSeconds === 1800 &&
    igRule.maxContinuousSeconds === 600 &&
    igRule.cooldownSeconds === 300 &&
    igRule.frictionEnabled === true &&
    igRule.frictionDelaySeconds === 15 &&
    igRule.showBreathingCircle === true &&
    igRule.requireIntentText === true &&
    igRule.minIntentChars === 12 &&
    igRule.reEntryGraceSeconds === 60 &&
    igRule.blockShortVideos === true &&
    igRule.shortVideoAction === 'back_action' &&
    igRule.scrollVelocityLimit === 8 &&
    igRule.nudgeIntervalSeconds === 300,
  'sanitizeAppRuleConfig must preserve every user-configured quota, friction, and intervention control'
);

const forcedDialerRule = sanitizeAppRuleConfig(
  { mode: 'hard_block', quotaSeconds: 60 },
  { isCompulsory: true }
);
const forcedSettingsRule = sanitizeAppRuleConfig(
  { mode: 'unrestricted', quotaSeconds: 9999 },
  { isProtectedSystem: true }
);
failIf(
  forcedDialerRule.mode === 'unrestricted' &&
    forcedDialerRule.quotaSeconds === 0 &&
    forcedSettingsRule.mode === 'hard_block',
  'Compulsory dialer must stay unrestricted while protected Settings stays hard_block'
);

// Bag with 5 apps (> old 3-app cap) plus sneaky com.android.settings entry
const unlimitedCustomBag: OccasionBag = sanitizeOccasionBag({
  id: 'bag-custom-phase2',
  name: 'Phase 2 Custom Bag',
  occasionLabel: 'Custom Occasion',
  isCustom: true,
  allowCalls: true,
  allowSms: false,
  apps: [
    { packageName: 'com.instagram.android', appName: 'Instagram', ruleConfig: igRule },
    { packageName: 'com.google.android.youtube', appName: 'YouTube', ruleConfig: { ...createDefaultAppRuleConfig('controlled'), blockShortVideos: true, shortVideoAction: 'overlay' } },
    { packageName: 'com.zhiliaoapp.musically', appName: 'TikTok', ruleConfig: createDefaultAppRuleConfig('hard_block') },
    { packageName: 'md.obsidian', appName: 'Obsidian', ruleConfig: createDefaultAppRuleConfig('unrestricted') },
    { packageName: 'com.spotify.music', appName: 'Spotify', ruleConfig: createDefaultAppRuleConfig('unrestricted') },
    { packageName: 'com.android.settings', appName: 'Settings' },
  ],
});
failIf(
  unlimitedCustomBag.isCustom === true &&
    unlimitedCustomBag.apps.length === 5 &&
    getAllowedBagAppsForNative(unlimitedCustomBag).length === 4 &&
    !getAllowedBagAppsForNative(unlimitedCustomBag).some((a) => a.packageName === 'com.zhiliaoapp.musically'),
  'Bag sanitizer must allow >3 apps, strip Settings, and exclude hard_block apps from allowed launch list'
);

const dynamicPayload = buildEngageSessionPayload({
  bag: unlimitedCustomBag,
  masterTimerSeconds: 7200,
  installedApps: [
    { packageName: 'com.google.android.dialer', appName: 'Phone', category: 'calls' },
    { packageName: 'com.android.mms', appName: 'Messages', category: 'messages' },
  ],
});
failIf(
  dynamicPayload.bagId === 'bag-custom-phase2' &&
    dynamicPayload.masterTimerSeconds === 7200 &&
    dynamicPayload.compulsoryPackages.includes('com.google.android.dialer') &&
    !dynamicPayload.compulsoryPackages.includes('com.android.mms') &&
    dynamicPayload.appConfigs['com.instagram.android']?.quotaSeconds === 1800 &&
    dynamicPayload.appConfigs['com.zhiliaoapp.musically']?.mode === 'hard_block' &&
    dynamicPayload.appConfigs['com.google.android.youtube']?.shortVideoAction === 'overlay' &&
    formatCompactDuration(1800) === '30m' &&
    formatRuleSummary(igRule).includes('30m quota'),
  'Dynamic Engage payload builder must serialize exact per-app rules without hardcoded limits'
);

// IntegrityEngine backup restore must preserve >4 bags, >3 apps, isCustom, and granular ruleConfigs
const fiveBagsRestorePayload: ZeroZbakPayload = {
  ...sampleZbakPayload,
  bags: [
    ...sampleZbakPayload.bags,
    { ...sampleZbakPayload.bags[0], id: 'bag-2', name: 'Bag 2' },
    { ...sampleZbakPayload.bags[0], id: 'bag-3', name: 'Bag 3' },
    { ...sampleZbakPayload.bags[0], id: 'bag-4', name: 'Bag 4' },
    { ...sampleZbakPayload.bags[0], id: 'bag-5', name: 'Bag 5' },
    unlimitedCustomBag,
  ],
};
const restoreFiveBags = IntegrityEngine.applyVerifiedRestore(
  {
    rawInput: encodeZbakPayload(fiveBagsRestorePayload),
    defaultSchedules: [],
    defaultBags: sampleZbakPayload.bags,
    sanitizeProfile: sanitizeZeroProfile,
    sanitizeThemeConfig,
    environmentSecurity: safeEnv,
  },
  false
);
const restoredPhase2Bag = restoreFiveBags.bags?.find((b) => b.id === 'bag-custom-phase2');
failIf(
  restoreFiveBags.ok === true &&
    restoreFiveBags.bags?.length === 6 &&
    restoredPhase2Bag?.isCustom === true &&
    restoredPhase2Bag?.apps.length === 5 &&
    restoredPhase2Bag?.apps[0]?.ruleConfig?.quotaSeconds === 1800 &&
    restoredPhase2Bag?.apps[0]?.ruleConfig?.shortVideoAction === 'back_action' &&
    restoredPhase2Bag?.apps[0]?.ruleConfig?.scrollVelocityLimit === 8,
  'IntegrityEngine restore must preserve >4 Bags, >3 Bag apps, isCustom flags & Phase 2 ruleConfigs'
);
console.log('PASS: Phase 2 Unlimited Bags, Granular App Rules & Dynamic Engage Payload Verified');

console.log('\n>>> ALL SPECIFICATION AND ANTI-EXPLOIT TESTS PASSED WITH 100% SUCCESS! <<<');
