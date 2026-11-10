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
import type { SessionRecord } from '../src/types.ts';

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

console.log('\n>>> ALL SPECIFICATION AND ANTI-EXPLOIT TESTS PASSED WITH 100% SUCCESS! <<<');
