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
} from '../types';
import { haptics } from '../utils/haptics';
import confetti from 'canvas-confetti';

export const SECONDS_PER_PARACHUTE = 72000; // 20 Hours exactly
export const MAX_BAG_APPS = 3; // BlockIt-inspired 3-app cap per Bag
export const MAX_BAGS = 4; // 4 customizable occasion Bags

const STORAGE_KEYS = {
  ACTIVE_LOCK: 'zero_active_lock_v3',
  CUMULATIVE_PARACHUTE_SECONDS: 'zero_cumulative_parachute_seconds_v3',
  TOTAL_RECLAIMED_SECONDS: 'zero_total_reclaimed_seconds_v3',
  USED_PARACHUTES: 'zero_used_parachutes_v3',
  LEDGER: 'zero_parachute_ledger_v3',
  SESSIONS: 'zero_sessions_history_v3',
  SCHEDULES: 'zero_recurring_schedules_v3',
  BAGS: 'zero_occasion_bags_v4',
  ACTIVE_BAG_ID: 'zero_active_bag_id_v4',
  THEME: 'zero_active_theme_v3',
  SLEEP_FARMING_MODE: 'zero_sleep_farming_mode_v3',
  SEED_PURGE_FLAG: 'zero_seed_purged_v4',
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
    localStorage.setItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS, cumulativeSeconds.toString());
  }, [cumulativeSeconds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS, totalReclaimedSeconds.toString());
  }, [totalReclaimedSeconds]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.USED_PARACHUTES, usedParachutes.toString());
  }, [usedParachutes]);

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
    try {
      window.ZeroNative?.syncLedgerState(cumulativeSeconds, usedParachutes);
    } catch {
      // Web mode
    }
  }, [cumulativeSeconds, usedParachutes]);

  // Compute live Parachute Metrics
  const lifetimeEarned = Math.floor(cumulativeSeconds / SECONDS_PER_PARACHUTE);
  const currentBalance = Math.max(0, lifetimeEarned - usedParachutes);
  const currentProgressSeconds = cumulativeSeconds % SECONDS_PER_PARACHUTE;
  const currentProgressHours = Number((currentProgressSeconds / 3600).toFixed(1));
  const hoursUntilNextParachute = Number(((SECONDS_PER_PARACHUTE - currentProgressSeconds) / 3600).toFixed(1));
  const progressPercentage = Math.min(100, Number(((currentProgressSeconds / SECONDS_PER_PARACHUTE) * 100).toFixed(1)));

  const parachuteMetrics: ParachuteMetrics = {
    totalCumulativeSeconds: cumulativeSeconds,
    totalCumulativeHours: Number((cumulativeSeconds / 3600).toFixed(1)),
    totalReclaimedHours: Number((totalReclaimedSeconds / 3600).toFixed(1)),
    lifetimeEarnedParachutes: lifetimeEarned,
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
  const cumulativeSecondsRef = useRef(cumulativeSeconds);
  cumulativeSecondsRef.current = cumulativeSeconds;

  const handleSessionCompletion = useCallback((finishedLock: ActiveLockSession) => {
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

    setCumulativeSeconds((prevTotal) => {
      const newTotal = prevTotal + earnedParachuteSecs;
      const prevMilestones = Math.floor(prevTotal / SECONDS_PER_PARACHUTE);
      const newMilestones = Math.floor(newTotal / SECONDS_PER_PARACHUTE);

      if (newMilestones > prevMilestones) {
        const delta = newMilestones - prevMilestones;
        try {
          confetti({
            particleCount: 120,
            spread: 80,
            origin: { y: 0.6 },
            colors: ['#FFFFFF', '#F59E0B', '#10B981'],
          });
        } catch {
          // Ignore confetti error
        }

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
      }
      return newTotal;
    });

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
  }, []);

  const applyParachuteAbort = useCallback((current: ActiveLockSession) => {
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

  useEffect(() => {
    if (!activeLock.isLocked) return;

    const syncWithNative = () => {
      try {
        if (!window.ZeroNative) return;
        const current = activeLockRef.current;
        if (!current.isLocked) return;
        const raw = window.ZeroNative.getNativeStateJson();
        const nativeState = JSON.parse(raw) as {
          isLocked: boolean;
          cumulativeSeconds: number;
          deployedCount: number;
        };
        if (!nativeState.isLocked && nativeState.deployedCount > usedParachutesRef.current) {
          applyParachuteAbort(current);
        }
      } catch {
        // Ignore bridge errors
      }
    };

    const interval = setInterval(() => {
      const now = Date.now();
      const current = activeLockRef.current;
      if (!current.isLocked) return;

      syncWithNative();

      if (now >= current.targetEndTime) {
        handleSessionCompletion(current);
      } else {
        const remaining = Math.max(0, Math.floor((current.targetEndTime - now) / 1000));
        const elapsed = Math.floor((now - current.startTime) / 1000);
        setActiveLock((prev) => ({
          ...prev,
          remainingSeconds: remaining,
          elapsedSeconds: elapsed,
        }));
      }
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
        window.ZeroNative.syncLedgerState(cumulativeSecondsRef.current, usedParachutesRef.current);
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

  const buildBackupJson = (): string => {
    const payload: ZeroBackupPayload = {
      schemaVersion: 2,
      appName: 'Zero',
      exportedAt: new Date().toISOString(),
      cumulativeSeconds,
      totalReclaimedSeconds,
      usedParachutes,
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
      setTotalReclaimedSeconds(nextReclaimed);
      setUsedParachutes(nextUsed);
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
      localStorage.setItem(STORAGE_KEYS.SESSIONS, JSON.stringify(nextSessions));
      localStorage.setItem(STORAGE_KEYS.LEDGER, JSON.stringify(nextLedger));
      localStorage.setItem(STORAGE_KEYS.SCHEDULES, JSON.stringify(nextSchedules));
      localStorage.setItem(STORAGE_KEYS.BAGS, JSON.stringify(nextBags));
      localStorage.setItem(STORAGE_KEYS.ACTIVE_BAG_ID, nextActiveBagId);
      localStorage.setItem(STORAGE_KEYS.SEED_PURGE_FLAG, '1');

      try {
        window.ZeroNative?.syncLedgerState(nextCumulative, nextUsed);
      } catch {
        // Ignore in web
      }

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
    setCumulativeSeconds(0);
    setTotalReclaimedSeconds(0);
    setUsedParachutes(0);
    setLedger([]);
    setSessions([]);
    setSchedules(DEFAULT_SCHEDULES);
    setBags(DEFAULT_BAGS);
    setActiveBagId(DEFAULT_BAGS[0].id);
    setActiveLock({
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    });
    try {
      window.ZeroNative?.syncLedgerState(0, 0);
    } catch {
      // Ignore
    }
  };

  return {
    theme,
    setTheme: setThemeState,
    sleepFarmingMode,
    setSleepFarmingMode,
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
