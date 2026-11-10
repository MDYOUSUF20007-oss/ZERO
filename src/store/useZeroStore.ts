import { useState, useEffect, useCallback, useRef } from 'react';
import type {
  SessionTag,
  SessionRecord,
  ParachuteLedgerEntry,
  ParachuteMetrics,
  RecurringSchedule,
  ActiveLockSession,
  ThemeStyle,
  SleepFarmingMode,
  OccasionBag,
  BagApp,
  NativePermissionStatus,
  ZeroBackupPayload,
  ZeroProfile,
  ParachuteRewardEvent,
  ProfileAvatarId,
  ProfileAccent,
} from '../types';
import { haptics } from '../utils/haptics';
import confetti from 'canvas-confetti';
import {
  TIP_SNOOZE_SESSIONS,
  evaluatePostSessionTipPrompt,
  normalizeTipSkipCount,
} from '../utils/tipPromptPolicy';
import {
  FIRST_DONATION_BONUS_INR,
  claimFirstDonationParachute,
  claimFirstTimerProfileBonus,
  computeParachuteBalance,
  sanitizeZeroProfile,
} from '../utils/parachuteRewardsPolicy';

export const SECONDS_PER_PARACHUTE = 72000; // 20 Hours exactly
export const MAX_BAG_APPS = 3; // BlockIt-inspired 3-app cap per Bag
export const MAX_BAGS = 4; // 4 customizable occasion Bags

const STORAGE_KEYS = {
  ACTIVE_LOCK: 'zero_active_lock_v3',
  CUMULATIVE_PARACHUTE_SECONDS: 'zero_cumulative_parachute_seconds_v3',
  TOTAL_RECLAIMED_SECONDS: 'zero_total_reclaimed_seconds_v3',
  USED_PARACHUTES: 'zero_used_parachutes_v3',
  BONUS_PARACHUTES: 'zero_bonus_parachutes_v1',
  CLAIMED_FIRST_TIME_PARACHUTE: 'zero_claimed_first_time_parachute_v1',
  CLAIMED_FIRST_DONATION_PARACHUTE: 'zero_claimed_first_donation_parachute_v1',
  PROFILE: 'zero_user_profile_v1',
  DISMISSED_WELCOME_MODAL: 'zero_dismissed_welcome_modal_v1',
  LEDGER: 'zero_parachute_ledger_v3',
  SESSIONS: 'zero_sessions_history_v3',
  SCHEDULES: 'zero_recurring_schedules_v3',
  BAGS: 'zero_occasion_bags_v4',
  ACTIVE_BAG_ID: 'zero_active_bag_id_v4',
  THEME: 'zero_active_theme_v3',
  SLEEP_FARMING_MODE: 'zero_sleep_farming_mode_v3',
  SEED_PURGE_FLAG: 'zero_seed_purged_v4',
  TIP_SKIP_REMAINING: 'zero_tip_skip_remaining_v1',
};

const DEFAULT_SCHEDULES: RecurringSchedule[] = [
  {
    id: 'sched-1',
    name: 'Morning Deep Work',
    days: [1, 2, 3, 4, 5],
    startTime: '09:00',
    endTime: '12:00',
    tag: 'Deep Work',
    isEnabled: false,
    preLockWarningMinutes: 5,
  },
  {
    id: 'sched-2',
    name: 'Nightly Wind-Down',
    days: [0, 1, 2, 3, 4, 5, 6],
    startTime: '23:00',
    endTime: '06:30',
    tag: 'Sleep',
    isEnabled: false,
    preLockWarningMinutes: 5,
  },
];

export const DEFAULT_BAGS: OccasionBag[] = [
  {
    id: 'bag-work',
    name: 'Work Bag',
    occasionLabel: 'Deep Focus & Office',
    apps: [],
    allowCalls: false,
    allowSms: false,
  },
  {
    id: 'bag-commute',
    name: 'Commute Bag',
    occasionLabel: 'Travel & Transit',
    apps: [],
    allowCalls: true,
    allowSms: false,
  },
  {
    id: 'bag-study',
    name: 'Study Bag',
    occasionLabel: 'Lectures & Exam Prep',
    apps: [],
    allowCalls: false,
    allowSms: false,
  },
  {
    id: 'bag-family',
    name: 'Family & Night',
    occasionLabel: 'Home & Urgent Contact',
    apps: [],
    allowCalls: true,
    allowSms: true,
  },
];

const WEB_FALLBACK_APPS: BagApp[] = [
  { packageName: 'com.google.android.apps.maps', appName: 'Maps', category: 'custom' },
  { packageName: 'com.spotify.music', appName: 'Spotify', category: 'custom' },
  { packageName: 'com.whatsapp', appName: 'WhatsApp', category: 'custom' },
  { packageName: 'md.obsidian', appName: 'Obsidian', category: 'custom' },
  { packageName: 'com.google.android.calculator', appName: 'Calculator', category: 'custom' },
  { packageName: 'com.android.camera2', appName: 'Camera', category: 'custom' },
  { packageName: 'com.google.android.deskclock', appName: 'Clock & Timer', category: 'custom' },
  { packageName: 'com.ubercab', appName: 'Uber', category: 'custom' },
];

const DEFAULT_WEB_PERMISSIONS: NativePermissionStatus = {
  isNativeAndroid: false,
  isStrictAccessibilityBuild: false,
  isAccessibilityEnabled: false,
  hasOverlayPermission: true,
  hasUsageStatsPermission: true,
  hasNotificationPermission: true,
  isDeviceOwner: false,
  strictReady: true,
};

function isCapacitorNativeAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  const cap = (window as unknown as {
    Capacitor?: { isNativePlatform?: () => boolean; getPlatform?: () => string };
  }).Capacitor;
  if (cap?.getPlatform?.() === 'android') return true;
  if (cap?.isNativePlatform?.() && /Android/i.test(navigator.userAgent)) return true;
  return Boolean(window.ZeroNative);
}

function readPermissionsFromNative(): NativePermissionStatus {
  if (typeof window === 'undefined') {
    return DEFAULT_WEB_PERMISSIONS;
  }
  if (!window.ZeroNative) {
    if (isCapacitorNativeAndroid()) {
      return {
        isNativeAndroid: true,
        isStrictAccessibilityBuild: false,
        isAccessibilityEnabled: false,
        hasOverlayPermission: false,
        hasUsageStatsPermission: false,
        hasNotificationPermission: false,
        isDeviceOwner: false,
        strictReady: false,
      };
    }
    return DEFAULT_WEB_PERMISSIONS;
  }
  try {
    const raw = window.ZeroNative.getPermissionStatusJson();
    return JSON.parse(raw) as NativePermissionStatus;
  } catch {
    return {
      ...DEFAULT_WEB_PERMISSIONS,
      isNativeAndroid: isCapacitorNativeAndroid(),
      strictReady: !isCapacitorNativeAndroid(),
    };
  }
}

function purgeLegacyDummySeedsOnce(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(STORAGE_KEYS.SEED_PURGE_FLAG) === '1') return;

  try {
    const rawSessions = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    const rawLedger = localStorage.getItem(STORAGE_KEYS.LEDGER);
    const parsedSessions: SessionRecord[] = rawSessions ? JSON.parse(rawSessions) : [];
    const parsedLedger: ParachuteLedgerEntry[] = rawLedger ? JSON.parse(rawLedger) : [];

    const hasFakeSeeds = parsedSessions.some((s) => s.id.startsWith('seed_sess_'));
    const hasFakeInitLedger = parsedLedger.some((l) => l.id === 'txn_init_1');

    if (hasFakeSeeds || hasFakeInitLedger) {
      const realSessions = parsedSessions.filter((s) => !s.id.startsWith('seed_sess_'));
      const realLedger = parsedLedger.filter((l) => l.id !== 'txn_init_1');
      const realCumulative = realSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.earnedParachuteSeconds || 0), 0);
      const realReclaimed = realSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(realSessions));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(realLedger));
      localStorage.setItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS, String(realCumulative));
      localStorage.setItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS, String(realReclaimed));
      if (realSessions.length === 0) {
        localStorage.setItem(STORAGE_KEYS.USED_PARACHUTES, '0');
      }
    }
  } catch {
    // Ignore parse edge cases
  } finally {
    localStorage.setItem(STORAGE_KEYS.SEED_PURGE_FLAG, '1');
  }
}

export function useZeroStore() {
  useState(() => {
    purgeLegacyDummySeedsOnce();
    return true;
  });

  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeStyle) || 'oled';
  });

  const [sleepFarmingMode, setSleepFarmingMode] = useState<SleepFarmingMode>(() => {
    return (localStorage.getItem(STORAGE_KEYS.SLEEP_FARMING_MODE) as SleepFarmingMode) || 'quarter_credit';
  });

  const [tipSkipRemaining, setTipSkipRemaining] = useState<number>(() => {
    return normalizeTipSkipCount(localStorage.getItem(STORAGE_KEYS.TIP_SKIP_REMAINING));
  });
  const [postSessionTipPrompt, setPostSessionTipPrompt] = useState<SessionRecord | null>(null);

  // Real Zero metrics — starts honestly at 0 (no fake seed data!)
  const [cumulativeSeconds, setCumulativeSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS);
    return saved !== null ? Math.max(0, Number(saved) || 0) : 0;
  });

  const [totalReclaimedSeconds, setTotalReclaimedSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS);
    return saved !== null ? Math.max(0, Number(saved) || 0) : 0;
  });

  const [usedParachutes, setUsedParachutes] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USED_PARACHUTES);
    return saved !== null ? Math.max(0, Number(saved) || 0) : 0;
  });

  const [bonusParachutes, setBonusParachutes] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BONUS_PARACHUTES);
    return saved !== null ? Math.max(0, Math.floor(Number(saved) || 0)) : 0;
  });

  const [hasClaimedFirstTimeParachute, setHasClaimedFirstTimeParachute] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CLAIMED_FIRST_TIME_PARACHUTE) === '1';
  });

  const [hasClaimedFirstDonationParachute, setHasClaimedFirstDonationParachute] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.CLAIMED_FIRST_DONATION_PARACHUTE) === '1';
  });

  const [hasDismissedWelcomeModal, setHasDismissedWelcomeModal] = useState<boolean>(() => {
    return localStorage.getItem(STORAGE_KEYS.DISMISSED_WELCOME_MODAL) === '1';
  });

  const [profile, setProfile] = useState<ZeroProfile | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PROFILE);
      return saved ? sanitizeZeroProfile(JSON.parse(saved) as Partial<ZeroProfile>) : null;
    } catch {
      return null;
    }
  });

  const [parachuteRewardEvent, setParachuteRewardEvent] = useState<ParachuteRewardEvent | null>(null);
  const [justEarnedParachute, setJustEarnedParachute] = useState<boolean>(false);

  const [ledger, setLedger] = useState<ParachuteLedgerEntry[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.LEDGER);
      return saved ? (JSON.parse(saved) as ParachuteLedgerEntry[]) : [];
    } catch {
      return [];
    }
  });

  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
      return saved ? (JSON.parse(saved) as SessionRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [schedules, setSchedules] = useState<RecurringSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
      return saved ? (JSON.parse(saved) as RecurringSchedule[]) : DEFAULT_SCHEDULES;
    } catch {
      return DEFAULT_SCHEDULES;
    }
  });

  // 4 Custom Occasion Bags (max 3 apps each + Calls / SMS controls)
  const [bags, setBags] = useState<OccasionBag[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.BAGS);
      if (saved) {
        const parsed = JSON.parse(saved) as OccasionBag[];
        if (Array.isArray(parsed) && parsed.length === MAX_BAGS) {
          return parsed.map((b) => ({
            ...b,
            apps: Array.isArray(b.apps) ? b.apps.slice(0, MAX_BAG_APPS) : [],
            allowCalls: Boolean(b.allowCalls),
            allowSms: Boolean(b.allowSms),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_BAGS;
  });

  const [activeBagId, setActiveBagId] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.ACTIVE_BAG_ID) || DEFAULT_BAGS[0].id;
  });

  const [permissions, setPermissions] = useState<NativePermissionStatus>(() =>
    readPermissionsFromNative()
  );

  const [installedApps, setInstalledApps] = useState<BagApp[]>(() => {
    if (typeof window !== 'undefined' && window.ZeroNative) {
      try {
        const parsed = JSON.parse(window.ZeroNative.getInstalledAppsJson()) as BagApp[];
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch {
        // Fallback
      }
    }
    return WEB_FALLBACK_APPS;
  });

  const [expiredLockOnBoot] = useState<ActiveLockSession | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_LOCK);
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveLockSession;
        const now = Date.now();
        if (parsed.isLocked && parsed.targetEndTime > 0 && parsed.targetEndTime <= now) {
          return {
            ...parsed,
            isLocked: true,
            elapsedSeconds: parsed.durationSeconds,
            remainingSeconds: 0,
          };
        }
      }
    } catch {
      // Ignore parse error
    }
    return null;
  });

  const [activeLock, setActiveLock] = useState<ActiveLockSession>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ACTIVE_LOCK);
      if (saved) {
        const parsed = JSON.parse(saved);
        const now = Date.now();
        if (parsed.isLocked && parsed.targetEndTime > now) {
          const remaining = Math.max(0, Math.floor((parsed.targetEndTime - now) / 1000));
          const elapsed = Math.floor((now - parsed.startTime) / 1000);
          return {
            ...parsed,
            isLocked: true,
            elapsedSeconds: elapsed,
            remainingSeconds: remaining,
          };
        }
      }
    } catch {
      // Fallback
    }
    return {
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    };
  });

  const [preLockAlert, setPreLockAlert] = useState<{
    show: boolean;
    scheduleName: string;
    minutesLeft: number;
  } | null>(null);

  const activeBag = bags.find((b) => b.id === activeBagId) || bags[0];

  const refreshPermissions = useCallback(() => {
    setPermissions(readPermissionsFromNative());
  }, []);

  const refreshInstalledApps = useCallback(() => {
    if (typeof window !== 'undefined' && window.ZeroNative) {
      try {
        const parsed = JSON.parse(window.ZeroNative.getInstalledAppsJson()) as BagApp[];
        if (Array.isArray(parsed)) setInstalledApps(parsed);
      } catch {
        // Ignore
      }
    }
  }, []);

  useEffect(() => {
    refreshPermissions();
    let tries = 0;
    const bootPoll = setInterval(() => {
      tries++;
      if (window.ZeroNative || tries >= 20) {
        refreshPermissions();
        refreshInstalledApps();
        clearInterval(bootPoll);
      }
    }, 150);

    const onFocus = () => refreshPermissions();
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshPermissions();
    };
    window.addEventListener('focus', onFocus);
    window.addEventListener('zero-permissions-updated', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(bootPoll);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('zero-permissions-updated', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [refreshPermissions, refreshInstalledApps]);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.className = 'dark';
  }, [theme]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SLEEP_FARMING_MODE, sleepFarmingMode);
  }, [sleepFarmingMode]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TIP_SKIP_REMAINING, String(tipSkipRemaining));
  }, [tipSkipRemaining]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS, cumulativeSeconds.toString());
  }, [cumulativeSeconds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS, totalReclaimedSeconds.toString());
  }, [totalReclaimedSeconds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USED_PARACHUTES, usedParachutes.toString());
  }, [usedParachutes]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BONUS_PARACHUTES, bonusParachutes.toString());
  }, [bonusParachutes]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CLAIMED_FIRST_TIME_PARACHUTE,
      hasClaimedFirstTimeParachute ? '1' : '0'
    );
  }, [hasClaimedFirstTimeParachute]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.CLAIMED_FIRST_DONATION_PARACHUTE,
      hasClaimedFirstDonationParachute ? '1' : '0'
    );
  }, [hasClaimedFirstDonationParachute]);

  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEYS.DISMISSED_WELCOME_MODAL,
      hasDismissedWelcomeModal ? '1' : '0'
    );
  }, [hasDismissedWelcomeModal]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } else {
      localStorage.removeItem(STORAGE_KEYS.PROFILE);
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(ledger));
  }, [ledger]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BAGS, JSON.stringify(bags));
  }, [bags]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_BAG_ID, activeBagId);
  }, [activeBagId]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(activeLock));
  }, [activeLock]);

  const syncNativeLedger = useCallback((cumSecs: number, usedCount: number, bonusCount: number) => {
    try {
      if (window.ZeroNative?.syncLedgerStateWithBonus) {
        window.ZeroNative.syncLedgerStateWithBonus(cumSecs, usedCount, bonusCount);
      } else {
        window.ZeroNative?.syncLedgerState(cumSecs, usedCount);
      }
    } catch {
      // Web mode
    }
  }, []);

  // Keep native BagStore & ParachuteStore synchronized seamlessly
  useEffect(() => {
    try {
      if (window.ZeroNative && activeBag) {
        window.ZeroNative.setBagStateJson(
          activeBag.name,
          JSON.stringify(activeBag.apps.slice(0, MAX_BAG_APPS)),
          activeBag.allowCalls,
          activeBag.allowSms
        );
      }
    } catch {
      // Web mode
    }
  }, [activeBag]);

  useEffect(() => {
    syncNativeLedger(cumulativeSeconds, usedParachutes, bonusParachutes);
  }, [cumulativeSeconds, usedParachutes, bonusParachutes, syncNativeLedger]);

  // Compute live Parachute Metrics
  const balanceSnapshot = computeParachuteBalance({
    cumulativeSeconds,
    bonusParachutes,
    usedParachutes,
  });
  const lifetimeEarned = balanceSnapshot.lifetimeEarned;
  const currentBalance = balanceSnapshot.currentBalance;
  const currentProgressSeconds = cumulativeSeconds % SECONDS_PER_PARACHUTE;
  const currentProgressHours = Number((currentProgressSeconds / 3600).toFixed(1));
  const hoursUntilNextParachute = Number(((SECONDS_PER_PARACHUTE - currentProgressSeconds) / 3600).toFixed(1));
  const progressPercentage = Math.min(100, Number(((currentProgressSeconds / SECONDS_PER_PARACHUTE) * 100).toFixed(1)));

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReclaimedHours = Number(
    (
      sessions
        .filter((s) => s.status === 'completed' && s.dateStr === todayStr)
        .reduce((acc, s) => acc + s.durationSeconds, 0) / 3600
    ).toFixed(1)
  );

  const parachuteMetrics: ParachuteMetrics = {
    totalCumulativeSeconds: cumulativeSeconds,
    totalCumulativeHours: Number((cumulativeSeconds / 3600).toFixed(1)),
    totalReclaimedHours: Number((totalReclaimedSeconds / 3600).toFixed(1)),
    lifetimeEarnedParachutes: lifetimeEarned,
    bonusParachutes,
    deployedParachutes: usedParachutes,
    currentBalance,
    currentProgressSeconds,
    currentProgressHours,
    hoursUntilNextParachute,
    progressPercentage,
    sleepFarmingMode,
  };

  const activeLockRef = useRef(activeLock);
  activeLockRef.current = activeLock;
  const sleepFarmingModeRef = useRef(sleepFarmingMode);
  sleepFarmingModeRef.current = sleepFarmingMode;
  const usedParachutesRef = useRef(usedParachutes);
  usedParachutesRef.current = usedParachutes;
  const bonusParachutesRef = useRef(bonusParachutes);
  bonusParachutesRef.current = bonusParachutes;
  const cumulativeSecondsRef = useRef(cumulativeSeconds);
  cumulativeSecondsRef.current = cumulativeSeconds;
  const hasClaimedFirstTimeRef = useRef(hasClaimedFirstTimeParachute);
  hasClaimedFirstTimeRef.current = hasClaimedFirstTimeParachute;
  const hasClaimedFirstDonationRef = useRef(hasClaimedFirstDonationParachute);
  hasClaimedFirstDonationRef.current = hasClaimedFirstDonationParachute;
  const justEarnedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const tipSkipRemainingRef = useRef(tipSkipRemaining);
  useEffect(() => {
    tipSkipRemainingRef.current = tipSkipRemaining;
  }, [tipSkipRemaining]);

  useEffect(() => {
    return () => {
      if (justEarnedTimerRef.current) clearTimeout(justEarnedTimerRef.current);
    };
  }, []);

  const emitParachuteReward = useCallback(
    (event: Omit<ParachuteRewardEvent, 'id'>) => {
      haptics.milestoneChime();
      try {
        confetti({
          particleCount: 110,
          spread: 75,
          origin: { y: 0.6 },
          colors: ['#FFFFFF', '#F59E0B', '#10B981'],
        });
      } catch {
        // Ignore confetti errors
      }
      setParachuteRewardEvent({
        id: `rew_${Date.now()}`,
        ...event,
      });
      setJustEarnedParachute(true);
      if (justEarnedTimerRef.current) clearTimeout(justEarnedTimerRef.current);
      justEarnedTimerRef.current = setTimeout(() => {
        setJustEarnedParachute(false);
      }, 4500);
    },
    []
  );

  const dismissParachuteRewardAnimation = useCallback(() => {
    setParachuteRewardEvent(null);
  }, []);

  const finalizingLockStartRef = useRef<number | null>(null);
  const bootRecoveryHandledRef = useRef(false);

  const handleSessionCompletion = useCallback((finishedLock: ActiveLockSession) => {
    if (!finishedLock.isLocked || finalizingLockStartRef.current === finishedLock.startTime) {
      return;
    }
    finalizingLockStartRef.current = finishedLock.startTime;
    activeLockRef.current = { ...finishedLock, isLocked: false };

    haptics.milestoneChime();
    const duration = finishedLock.durationSeconds;
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split('T')[0];
    const isSleep = finishedLock.tag === 'Sleep';
    const currentMode = sleepFarmingModeRef.current;

    let multiplier = 1.0;
    if (isSleep) {
      if (currentMode === 'quarter_credit') multiplier = 0.25;
      else if (currentMode === 'daytime_only') multiplier = 0.0;
      else multiplier = 1.0;
    }

    const earnedParachuteSecs = Math.round(duration * multiplier);

    const newSession: SessionRecord = {
      id: `sess_${now}`,
      startTime: finishedLock.startTime,
      endTime: now,
      durationSeconds: duration,
      earnedParachuteSeconds: earnedParachuteSecs,
      weightMultiplier: multiplier,
      tag: finishedLock.tag,
      status: 'completed',
      dateStr,
    };

    setSessions((prev) => [newSession, ...prev]);
    setTotalReclaimedSeconds((prev) => prev + duration);

    const prevTotal = cumulativeSecondsRef.current;
    const newTotal = prevTotal + earnedParachuteSecs;
    cumulativeSecondsRef.current = newTotal;
    setCumulativeSeconds(newTotal);

    const prevMilestones = Math.floor(prevTotal / SECONDS_PER_PARACHUTE);
    const newMilestones = Math.floor(newTotal / SECONDS_PER_PARACHUTE);

    if (newMilestones > prevMilestones) {
      const delta = newMilestones - prevMilestones;
      const updatedBalance = computeParachuteBalance({
        cumulativeSeconds: newTotal,
        bonusParachutes: bonusParachutesRef.current,
        usedParachutes: usedParachutesRef.current,
      }).currentBalance;

      const newEntry: ParachuteLedgerEntry = {
        id: `txn_${now}`,
        timestamp: now,
        type: 'EARNED',
        description: `20-Hour Milestone reached! (+${delta} Emergency Parachute earned)`,
        delta,
        tag: finishedLock.tag,
        note: isSleep ? `Completed Sleep session (credited at ${multiplier}x rate)` : 'Full daytime focus credit',
      };
      setLedger((l) => [newEntry, ...l]);

      emitParachuteReward({
        source: 'milestone_20h',
        delta,
        newBalance: updatedBalance,
        title: delta > 1 ? `+${delta} Parachutes Earned!` : '20h Milestone Parachute!',
        subtitle: `You completed 20 cumulative hours of phone-free discipline in #${finishedLock.tag}.`,
      });
    }

    setActiveLock({
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    });
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_LOCK);

    try {
      window.ZeroNative?.stopLockTaskMode();
    } catch {
      // Ignore in web mode
    }

    const tipDecision = evaluatePostSessionTipPrompt(tipSkipRemainingRef.current);
    tipSkipRemainingRef.current = tipDecision.nextSkipRemaining;
    setTipSkipRemaining(tipDecision.nextSkipRemaining);
    localStorage.setItem(STORAGE_KEYS.TIP_SKIP_REMAINING, String(tipDecision.nextSkipRemaining));
    if (tipDecision.shouldShow) {
      setPostSessionTipPrompt(newSession);
    }
  }, [emitParachuteReward]);

  const applyParachuteAbort = useCallback((current: ActiveLockSession) => {
    if (!current.isLocked || finalizingLockStartRef.current === current.startTime) {
      return;
    }
    finalizingLockStartRef.current = current.startTime;
    activeLockRef.current = { ...current, isLocked: false };

    haptics.parachuteDeploy();
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split('T')[0];
    const abortedTag = current.tag;
    const elapsedMinutes = Math.max(1, Math.floor(current.elapsedSeconds / 60));

    setUsedParachutes((prev) => prev + 1);

    const abortedSession: SessionRecord = {
      id: `sess_aborted_${now}`,
      startTime: current.startTime,
      endTime: now,
      durationSeconds: current.durationSeconds,
      earnedParachuteSeconds: 0,
      weightMultiplier: 0,
      tag: abortedTag,
      status: 'parachuted',
      dateStr,
    };
    setSessions((prev) => [abortedSession, ...prev]);

    const newEntry: ParachuteLedgerEntry = {
      id: `txn_${now}`,
      timestamp: now,
      type: 'DEPLOYED',
      description: `Emergency Parachute deployed (${abortedTag} session aborted at ${elapsedMinutes}m)`,
      delta: -1,
      tag: abortedTag,
      note: 'Aborted Session Penalty: 0h credited toward Parachute progression (anti-exploit).',
    };
    setLedger((prev) => [newEntry, ...prev]);

    setActiveLock({
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    });
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_LOCK);
  }, []);

  // Finalize a session whose timer completed while the WebView process was killed/closed
  useEffect(() => {
    if (!expiredLockOnBoot || bootRecoveryHandledRef.current) return;
    const timer = setTimeout(() => {
      if (bootRecoveryHandledRef.current) return;
      bootRecoveryHandledRef.current = true;
      try {
        if (window.ZeroNative) {
          const raw = window.ZeroNative.getNativeStateJson();
          const nativeState = JSON.parse(raw) as {
            isLocked: boolean;
            deployedCount: number;
          };
          if (!nativeState.isLocked && nativeState.deployedCount > usedParachutesRef.current) {
            applyParachuteAbort(expiredLockOnBoot);
            return;
          }
        }
      } catch {
        // Fallback to completion if targetEndTime elapsed
      }
      handleSessionCompletion(expiredLockOnBoot);
    }, 60);
    return () => clearTimeout(timer);
  }, [expiredLockOnBoot, handleSessionCompletion, applyParachuteAbort]);

  useEffect(() => {
    if (!activeLock.isLocked) return;

    const syncWithNative = (): boolean => {
      try {
        const current = activeLockRef.current;
        if (!current.isLocked) return true;

        if (window.ZeroNative) {
          const raw = window.ZeroNative.getNativeStateJson();
          const nativeState = JSON.parse(raw) as {
            isLocked: boolean;
            cumulativeSeconds: number;
            deployedCount: number;
          };
          if (!nativeState.isLocked && nativeState.deployedCount > usedParachutesRef.current) {
            applyParachuteAbort(current);
            return true;
          }
        }

        if (Date.now() >= current.targetEndTime) {
          handleSessionCompletion(current);
          return true;
        }
      } catch {
        // Ignore bridge errors
      }
      return false;
    };

    const interval = setInterval(() => {
      if (syncWithNative()) return;
      const now = Date.now();
      const current = activeLockRef.current;
      if (!current.isLocked) return;

      const remaining = Math.max(0, Math.floor((current.targetEndTime - now) / 1000));
      const elapsed = Math.floor((now - current.startTime) / 1000);
      setActiveLock((prev) => ({
        ...prev,
        remainingSeconds: remaining,
        elapsedSeconds: elapsed,
      }));
    }, 1000);

    window.addEventListener('focus', syncWithNative);
    document.addEventListener('visibilitychange', syncWithNative);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', syncWithNative);
      document.removeEventListener('visibilitychange', syncWithNative);
    };
  }, [activeLock.isLocked, handleSessionCompletion, applyParachuteAbort]);

  const igniteSession = (durationSeconds: number, tag: SessionTag): boolean => {
    const latestPerms = readPermissionsFromNative();
    setPermissions(latestPerms);

    if (latestPerms.isNativeAndroid && !latestPerms.strictReady) {
      window.ZeroNative?.requestNextMissingPermission();
      return false;
    }

    try {
      if (window.ZeroNative && activeBag) {
        window.ZeroNative.setBagStateJson(
          activeBag.name,
          JSON.stringify(activeBag.apps.slice(0, MAX_BAG_APPS)),
          activeBag.allowCalls,
          activeBag.allowSms
        );
        syncNativeLedger(
          cumulativeSecondsRef.current,
          usedParachutesRef.current,
          bonusParachutesRef.current
        );
        const started = window.ZeroNative.igniteSession(durationSeconds, tag);
        if (started === false) {
          refreshPermissions();
          return false;
        }
      }
    } catch {
      if (latestPerms.isNativeAndroid) return false;
    }

    const now = Date.now();
    const targetEndTime = now + durationSeconds * 1000;

    haptics.lockEngaged();

    const newLock: ActiveLockSession = {
      isLocked: true,
      tag,
      startTime: now,
      targetEndTime,
      durationSeconds,
      elapsedSeconds: 0,
      remainingSeconds: durationSeconds,
    };

    setActiveLock(newLock);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(newLock));
    return true;
  };

  const deployParachute = (): boolean => {
    if (currentBalance < 1 || !activeLock.isLocked) return false;

    applyParachuteAbort(activeLock);

    try {
      if (window.ZeroNative) {
        window.ZeroNative.deployParachute();
        window.ZeroNative.stopLockTaskMode();
      }
    } catch {
      // Ignore in web mode
    }

    return true;
  };

  const simulateReboot = () => {
    window.location.reload();
  };

  const fastForwardSeconds = (secondsToAdd: number) => {
    if (activeLock.isLocked) {
      const newTarget = activeLock.targetEndTime - secondsToAdd * 1000;
      setActiveLock((prev) => ({
        ...prev,
        targetEndTime: newTarget,
      }));
    }
  };

  const updateBag = (bagId: string, updater: (bag: OccasionBag) => OccasionBag) => {
    if (activeLock.isLocked) return; // Anti-tamper: Bags cannot be altered mid-lock
    setBags((prev) =>
      prev.map((b) => {
        if (b.id !== bagId) return b;
        const next = updater(b);
        return {
          ...next,
          apps: next.apps.slice(0, MAX_BAG_APPS),
        };
      })
    );
  };

  const toggleBagApp = (bagId: string, app: BagApp) => {
    updateBag(bagId, (bag) => {
      const exists = bag.apps.some((a) => a.packageName === app.packageName);
      if (exists) {
        return { ...bag, apps: bag.apps.filter((a) => a.packageName !== app.packageName) };
      }
      if (bag.apps.length >= MAX_BAG_APPS) {
        return bag; // Hard cap at 3 custom apps per Bag
      }
      return { ...bag, apps: [...bag.apps, app] };
    });
  };

  const toggleSchedule = (id: string) => {
    setSchedules((prev) =>
      prev.map((s) => (s.id === id ? { ...s, isEnabled: !s.isEnabled } : s))
    );
  };

  const addSchedule = (sched: Omit<RecurringSchedule, 'id'>) => {
    const newSched: RecurringSchedule = {
      ...sched,
      id: `sched_${Date.now()}`,
    };
    setSchedules((prev) => [...prev, newSched]);
  };

  const deleteSchedule = (id: string) => {
    setSchedules((prev) => prev.filter((s) => s.id !== id));
  };

  const triggerTestWarning = (scheduleName: string) => {
    setPreLockAlert({
      show: true,
      scheduleName: scheduleName || 'Focus Sprint',
      minutesLeft: 5,
    });
    haptics.tick(600);
    setTimeout(() => {
      setPreLockAlert(null);
    }, 6000);
  };

  const saveProfileAndClaimGift = useCallback(
    (draft: {
      displayName: string;
      handle: string;
      avatarId: ProfileAvatarId;
      accentColor: ProfileAccent;
      primaryMission: string;
      dailyGoalHours: number;
      motto: string;
    }): { grantedFreeParachute: boolean } => {
      const sanitized = sanitizeZeroProfile({
        ...draft,
        createdAt: profile?.createdAt,
      });
      if (!sanitized) {
        return { grantedFreeParachute: false };
      }

      setProfile(sanitized);
      setHasDismissedWelcomeModal(true);

      const claim = claimFirstTimerProfileBonus(
        hasClaimedFirstTimeRef.current,
        bonusParachutesRef.current
      );

      if (claim.granted) {
        bonusParachutesRef.current = claim.nextBonusParachutes;
        hasClaimedFirstTimeRef.current = claim.nextAlreadyClaimed;
        setBonusParachutes(claim.nextBonusParachutes);
        setHasClaimedFirstTimeParachute(claim.nextAlreadyClaimed);
        syncNativeLedger(
          cumulativeSecondsRef.current,
          usedParachutesRef.current,
          claim.nextBonusParachutes
        );

        const now = Date.now();
        const newBalance = computeParachuteBalance({
          cumulativeSeconds: cumulativeSecondsRef.current,
          bonusParachutes: claim.nextBonusParachutes,
          usedParachutes: usedParachutesRef.current,
        }).currentBalance;

        const entry: ParachuteLedgerEntry = {
          id: `txn_welcome_${now}`,
          timestamp: now,
          type: 'EARNED',
          description: 'First-Timer Profile Gift: Starter Emergency Parachute (+1 Free)',
          delta: 1,
          tag: 'Onboarding',
          note: `Profile created for ${sanitized.handle}`,
        };
        setLedger((prev) => [entry, ...prev]);

        emitParachuteReward({
          source: 'first_timer_profile',
          delta: 1,
          newBalance,
          title: 'Starter Parachute Unlocked!',
          subtitle: `Welcome aboard, ${sanitized.displayName}! Your first free Parachute is armed in your vault.`,
        });
      }

      return { grantedFreeParachute: claim.granted };
    },
    [profile?.createdAt, emitParachuteReward, syncNativeLedger]
  );

  const claimFirstDonationBonus = useCallback((): boolean => {
    const claim = claimFirstDonationParachute(
      hasClaimedFirstDonationRef.current,
      bonusParachutesRef.current
    );
    if (!claim.granted) return false;

    bonusParachutesRef.current = claim.nextBonusParachutes;
    hasClaimedFirstDonationRef.current = claim.nextAlreadyClaimed;
    setBonusParachutes(claim.nextBonusParachutes);
    setHasClaimedFirstDonationParachute(claim.nextAlreadyClaimed);
    syncNativeLedger(
      cumulativeSecondsRef.current,
      usedParachutesRef.current,
      claim.nextBonusParachutes
    );

    const now = Date.now();
    const newBalance = computeParachuteBalance({
      cumulativeSeconds: cumulativeSecondsRef.current,
      bonusParachutes: claim.nextBonusParachutes,
      usedParachutes: usedParachutesRef.current,
    }).currentBalance;

    const entry: ParachuteLedgerEntry = {
      id: `txn_supporter_${now}`,
      timestamp: now,
      type: 'EARNED',
      description: `First ₹${FIRST_DONATION_BONUS_INR}+ Supporter Bonus (+1 Free Parachute)`,
      delta: 1,
      tag: 'Support',
      note: 'One-time gratitude bonus for supporting free & open-source Zero',
    };
    setLedger((prev) => [entry, ...prev]);
    setPostSessionTipPrompt(null);

    emitParachuteReward({
      source: 'first_donation_50',
      delta: 1,
      newBalance,
      title: 'Thank-You Parachute Unlocked!',
      subtitle: `Thank you for supporting Zero with ₹${FIRST_DONATION_BONUS_INR}+! +1 bonus Parachute has been added.`,
    });

    return true;
  }, [emitParachuteReward, syncNativeLedger]);

  const dismissWelcomePrompt = useCallback(() => {
    setHasDismissedWelcomeModal(true);
  }, []);

  const buildBackupJson = (): string => {
    const payload: ZeroBackupPayload = {
      schemaVersion: 3,
      appName: 'Zero',
      exportedAt: new Date().toISOString(),
      cumulativeSeconds,
      totalReclaimedSeconds,
      usedParachutes,
      bonusParachutes,
      hasClaimedFirstTimeParachute,
      hasClaimedFirstDonationParachute,
      profile,
      sleepFarmingMode,
      ledger,
      sessions,
      schedules,
      bags,
      activeBagId,
      theme,
    };
    return JSON.stringify(payload, null, 2);
  };

  const exportData = (): string => {
    const json = buildBackupJson();
    const fileName = `zero-backup-${new Date().toISOString().split('T')[0]}.json`;

    if (typeof window !== 'undefined' && window.ZeroNative) {
      window.ZeroNative.exportBackupJson(json, fileName);
      return json;
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return json;
  };

  const importData = (rawJson: string): { ok: boolean; message: string } => {
    try {
      const parsed = JSON.parse(rawJson.trim()) as Partial<ZeroBackupPayload>;
      if (typeof parsed !== 'object' || parsed === null) {
        return { ok: false, message: 'Invalid backup file format.' };
      }
      if (
        typeof parsed.cumulativeSeconds !== 'number' ||
        !Array.isArray(parsed.sessions) ||
        !Array.isArray(parsed.ledger)
      ) {
        return {
          ok: false,
          message: 'Missing required Zero fields (cumulativeSeconds, sessions, ledger).',
        };
      }

      const nextCumulative = Math.max(0, Math.round(parsed.cumulativeSeconds));
      const nextReclaimed =
        typeof parsed.totalReclaimedSeconds === 'number'
          ? Math.max(0, Math.round(parsed.totalReclaimedSeconds))
          : nextCumulative;
      const nextUsed =
        typeof parsed.usedParachutes === 'number' ? Math.max(0, Math.round(parsed.usedParachutes)) : 0;

      const nextClaimedFirstTime = Boolean(parsed.hasClaimedFirstTimeParachute);
      const nextClaimedFirstDonation = Boolean(parsed.hasClaimedFirstDonationParachute);
      const minBonusFromFlags = (nextClaimedFirstTime ? 1 : 0) + (nextClaimedFirstDonation ? 1 : 0);
      const nextBonus =
        typeof parsed.bonusParachutes === 'number'
          ? Math.min(2, Math.max(minBonusFromFlags, Math.round(parsed.bonusParachutes)))
          : minBonusFromFlags;
      const nextProfile = parsed.profile ? sanitizeZeroProfile(parsed.profile) : null;

      const nextSessions = parsed.sessions.slice(0, 5000);
      const nextLedger = parsed.ledger.slice(0, 1000);
      const nextSchedules = Array.isArray(parsed.schedules) ? parsed.schedules : DEFAULT_SCHEDULES;
      const nextBags =
        Array.isArray(parsed.bags) && parsed.bags.length > 0
          ? parsed.bags.slice(0, MAX_BAGS).map((b, i) => ({
              id: b.id || `bag-${i + 1}`,
              name: (b.name || `Bag ${i + 1}`).slice(0, 28),
              occasionLabel: (b.occasionLabel || 'Custom Occasion').slice(0, 40),
              apps: Array.isArray(b.apps) ? b.apps.slice(0, MAX_BAG_APPS) : [],
              allowCalls: Boolean(b.allowCalls),
              allowSms: Boolean(b.allowSms),
            }))
          : DEFAULT_BAGS;
      const nextActiveBagId =
        parsed.activeBagId && nextBags.some((b) => b.id === parsed.activeBagId)
          ? parsed.activeBagId
          : nextBags[0].id;
      const nextTheme: ThemeStyle = parsed.theme || 'oled';
      const nextSleepMode: SleepFarmingMode = parsed.sleepFarmingMode || 'quarter_credit';

      setCumulativeSeconds(nextCumulative);
      cumulativeSecondsRef.current = nextCumulative;
      setTotalReclaimedSeconds(nextReclaimed);
      setUsedParachutes(nextUsed);
      usedParachutesRef.current = nextUsed;
      setBonusParachutes(nextBonus);
      bonusParachutesRef.current = nextBonus;
      setHasClaimedFirstTimeParachute(nextClaimedFirstTime || Boolean(nextProfile && nextBonus > 0));
      hasClaimedFirstTimeRef.current = nextClaimedFirstTime || Boolean(nextProfile && nextBonus > 0);
      setHasClaimedFirstDonationParachute(nextClaimedFirstDonation);
      hasClaimedFirstDonationRef.current = nextClaimedFirstDonation;
      setProfile(nextProfile);
      setSessions(nextSessions);
      setLedger(nextLedger);
      setSchedules(nextSchedules);
      setBags(nextBags);
      setActiveBagId(nextActiveBagId);
      setThemeState(nextTheme);
      setSleepFarmingMode(nextSleepMode);

      localStorage.setItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS, String(nextCumulative));
      localStorage.setItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS, String(nextReclaimed));
      localStorage.setItem(STORAGE_KEYS.USED_PARACHUTES, String(nextUsed));
      localStorage.setItem(STORAGE_KEYS.BONUS_PARACHUTES, String(nextBonus));
      localStorage.setItem(
        STORAGE_KEYS.CLAIMED_FIRST_TIME_PARACHUTE,
        nextClaimedFirstTime ? '1' : '0'
      );
      localStorage.setItem(
        STORAGE_KEYS.CLAIMED_FIRST_DONATION_PARACHUTE,
        nextClaimedFirstDonation ? '1' : '0'
      );
      if (nextProfile) {
        localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(nextProfile));
      } else {
        localStorage.removeItem(STORAGE_KEYS.PROFILE);
      }
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(nextSessions));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(nextLedger));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(nextSchedules));
      localStorage.setItem(STORAGE_KEYS.BAGS, JSON.stringify(nextBags));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BAG_ID, nextActiveBagId);
      localStorage.setItem(STORAGE_KEYS.SEED_PURGE_FLAG, '1');

      syncNativeLedger(nextCumulative, nextUsed, nextBonus);

      const restoredHours = (nextReclaimed / 3600).toFixed(1);
      return {
        ok: true,
        message: `Restored ${nextSessions.length} sessions (${restoredHours}h reclaimed) and ${nextBags.length} Bags.`,
      };
    } catch {
      return { ok: false, message: 'Could not parse JSON backup. Make sure you selected a valid .json file.' };
    }
  };

  const resetAllData = () => {
    localStorage.clear();
    localStorage.setItem(STORAGE_KEYS.SEED_PURGE_FLAG, '1');
    cumulativeSecondsRef.current = 0;
    usedParachutesRef.current = 0;
    bonusParachutesRef.current = 0;
    hasClaimedFirstTimeRef.current = false;
    hasClaimedFirstDonationRef.current = false;
    setCumulativeSeconds(0);
    setTotalReclaimedSeconds(0);
    setUsedParachutes(0);
    setBonusParachutes(0);
    setHasClaimedFirstTimeParachute(false);
    setHasClaimedFirstDonationParachute(false);
    setHasDismissedWelcomeModal(false);
    setProfile(null);
    setParachuteRewardEvent(null);
    setJustEarnedParachute(false);
    setLedger([]);
    setSessions([]);
    setSchedules(DEFAULT_SCHEDULES);
    setBags(DEFAULT_BAGS);
    setActiveBagId(DEFAULT_BAGS[0].id);
    setTipSkipRemaining(0);
    tipSkipRemainingRef.current = 0;
    setPostSessionTipPrompt(null);
    setActiveLock({
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    });
    syncNativeLedger(0, 0, 0);
  };

  const dismissPostSessionTipPrompt = () => {
    setPostSessionTipPrompt(null);
  };

  const blockTipPromptForFiveSessions = () => {
    tipSkipRemainingRef.current = TIP_SNOOZE_SESSIONS;
    setTipSkipRemaining(TIP_SNOOZE_SESSIONS);
    localStorage.setItem(STORAGE_KEYS.TIP_SKIP_REMAINING, String(TIP_SNOOZE_SESSIONS));
    setPostSessionTipPrompt(null);
  };

  const resetTipPromptBlock = () => {
    tipSkipRemainingRef.current = 0;
    setTipSkipRemaining(0);
    localStorage.setItem(STORAGE_KEYS.TIP_SKIP_REMAINING, '0');
  };

  return {
    theme,
    setTheme: setThemeState,
    sleepFarmingMode,
    setSleepFarmingMode,
    profile,
    hasClaimedFirstTimeParachute,
    hasClaimedFirstDonationParachute,
    hasDismissedWelcomeModal,
    todayReclaimedHours,
    parachuteRewardEvent,
    justEarnedParachute,
    dismissParachuteRewardAnimation,
    dismissWelcomePrompt,
    saveProfileAndClaimGift,
    claimFirstDonationBonus,
    activeLock,
    parachuteMetrics,
    ledger,
    sessions,
    schedules,
    bags,
    activeBag,
    activeBagId,
    setActiveBagId,
    updateBag,
    toggleBagApp,
    installedApps,
    refreshInstalledApps,
    permissions,
    refreshPermissions,
    preLockAlert,
    postSessionTipPrompt,
    tipSkipRemaining,
    dismissPostSessionTipPrompt,
    blockTipPromptForFiveSessions,
    resetTipPromptBlock,
    igniteSession,
    deployParachute,
    simulateReboot,
    fastForwardSeconds,
    toggleSchedule,
    addSchedule,
    deleteSchedule,
    triggerTestWarning,
    buildBackupJson,
    exportData,
    importData,
    resetAllData,
  };
}
