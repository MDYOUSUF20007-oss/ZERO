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
} from '../types';
import { haptics } from '../utils/haptics';
import confetti from 'canvas-confetti';

export const SECONDS_PER_PARACHUTE = 72000; // 20 Hours exactly

const STORAGE_KEYS = {
  ACTIVE_LOCK: 'zero_active_lock_v3',
  CUMULATIVE_PARACHUTE_SECONDS: 'zero_cumulative_parachute_seconds_v3',
  TOTAL_RECLAIMED_SECONDS: 'zero_total_reclaimed_seconds_v3',
  USED_PARACHUTES: 'zero_used_parachutes_v3',
  LEDGER: 'zero_parachute_ledger_v3',
  SESSIONS: 'zero_sessions_history_v3',
  SCHEDULES: 'zero_recurring_schedules_v3',
  THEME: 'zero_active_theme_v3',
  SLEEP_FARMING_MODE: 'zero_sleep_farming_mode_v3',
};

// Initial realistic sample data
const INITIAL_CUMULATIVE_SECONDS = 79200; // 22 Hours = 1 Parachute earned, 2h towards 2nd
const INITIAL_RECLAIMED_SECONDS = 118800; // 33 Hours total phone-free (including sleep sessions)
const INITIAL_USED_PARACHUTES = 0;

const DEFAULT_SCHEDULES: RecurringSchedule[] = [
  {
    id: 'sched-1',
    name: 'Morning Deep Work',
    days: [1, 2, 3, 4, 5], // Mon - Fri
    startTime: '09:00',
    endTime: '12:00',
    tag: 'Deep Work',
    isEnabled: true,
    preLockWarningMinutes: 5,
  },
  {
    id: 'sched-2',
    name: 'Nightly Sleep Wind-Down',
    days: [0, 1, 2, 3, 4, 5, 6], // Daily
    startTime: '23:00',
    endTime: '06:30',
    tag: 'Sleep',
    isEnabled: true,
    preLockWarningMinutes: 5,
  },
  {
    id: 'sched-3',
    name: 'Sunday Digital Fast',
    days: [0], // Sunday
    startTime: '14:00',
    endTime: '18:00',
    tag: 'Detox',
    isEnabled: false,
    preLockWarningMinutes: 5,
  },
];

function generateSeedSessions(): SessionRecord[] {
  const sessions: SessionRecord[] = [];
  const now = Date.now();
  const dayMs = 86400000;

  const tags: SessionTag[] = ['Deep Work', 'Study', 'Sleep', 'Detox', 'Family'];
  const presets = [1800, 3600, 5400, 7200, 10800]; // 30m, 1h, 1.5h, 2h, 3h

  for (let i = 24; i >= 0; i--) {
    const daysAgo = Math.floor((24 - i) * 1.2);
    const sessionTime = now - daysAgo * dayMs - (i * 3600000);
    const dur = presets[i % presets.length];
    const isParachuted = i === 7;
    const tag = tags[i % tags.length];
    const isSleep = tag === 'Sleep';
    const mult = isParachuted ? 0 : isSleep ? 0.25 : 1.0;
    const earned = Math.round(dur * mult);
    const d = new Date(sessionTime);
    const dateStr = d.toISOString().split('T')[0];

    sessions.push({
      id: `seed_sess_${i}`,
      startTime: sessionTime - dur * 1000,
      endTime: sessionTime,
      durationSeconds: dur,
      earnedParachuteSeconds: earned,
      weightMultiplier: mult,
      tag,
      status: isParachuted ? 'parachuted' : 'completed',
      dateStr,
    });
  }
  return sessions;
}

const INITIAL_LEDGER: ParachuteLedgerEntry[] = [
  {
    id: 'txn_init_1',
    timestamp: Date.now() - 6 * 86400000,
    type: 'EARNED',
    description: 'First 20-Hour Milestone reached! (+1 Emergency Parachute earned)',
    delta: 1,
    tag: 'Deep Work',
    note: '20.0 cumulative daytime hours completed',
  },
];

export function useZeroStore() {
  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    return (localStorage.getItem(STORAGE_KEYS.THEME) as ThemeStyle) || 'oled';
  });

  const [sleepFarmingMode, setSleepFarmingMode] = useState<SleepFarmingMode>(() => {
    return (localStorage.getItem(STORAGE_KEYS.SLEEP_FARMING_MODE) as SleepFarmingMode) || 'quarter_credit';
  });

  const [cumulativeSeconds, setCumulativeSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS);
    return saved !== null ? Number(saved) : INITIAL_CUMULATIVE_SECONDS;
  });

  const [totalReclaimedSeconds, setTotalReclaimedSeconds] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS);
    return saved !== null ? Number(saved) : INITIAL_RECLAIMED_SECONDS;
  });

  const [usedParachutes, setUsedParachutes] = useState<number>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.USED_PARACHUTES);
    return saved !== null ? Number(saved) : INITIAL_USED_PARACHUTES;
  });

  const [ledger, setLedger] = useState<ParachuteLedgerEntry[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.LEDGER);
    return saved ? JSON.parse(saved) : INITIAL_LEDGER;
  });

  const [sessions, setSessions] = useState<SessionRecord[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SESSIONS);
    return saved ? JSON.parse(saved) : generateSeedSessions();
  });

  const [schedules, setSchedules] = useState<RecurringSchedule[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SCHEDULES);
    return saved ? JSON.parse(saved) : DEFAULT_SCHEDULES;
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

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.THEME, theme);
    document.documentElement.className = theme === 'oled' || theme === 'monochrome' ? 'dark' : 'dark';
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
    localStorage.setItem(STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(activeLock));
  }, [activeLock]);

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

  // Session Completion Handler
  const handleSessionCompletion = useCallback((finishedLock: ActiveLockSession) => {
    haptics.milestoneChime();
    const duration = finishedLock.durationSeconds;
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split('T')[0];
    const isSleep = finishedLock.tag === 'Sleep';
    const currentMode = sleepFarmingModeRef.current;

    // ANTI-SLEEP-FARMING MULTIPLIER:
    let multiplier = 1.0;
    if (isSleep) {
      if (currentMode === 'quarter_credit') multiplier = 0.25;
      else if (currentMode === 'daytime_only') multiplier = 0.0;
      else multiplier = 1.0;
    }

    const earnedParachuteSecs = Math.round(duration * multiplier);

    // Record session
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

    // Credit parachute progression
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
          // Confetti ignore
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

    // Clear active lock
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

    const interval = setInterval(() => {
      const now = Date.now();
      const current = activeLockRef.current;
      if (!current.isLocked) return;

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

    return () => clearInterval(interval);
  }, [activeLock.isLocked, handleSessionCompletion]);

  // Ignite Session
  const igniteSession = (durationSeconds: number, tag: SessionTag) => {
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
  };

  // Deploy Parachute (ABORTED SESSION PENALTY ENFORCED)
  const deployParachute = (): boolean => {
    if (currentBalance < 1 || !activeLock.isLocked) return false;

    haptics.parachuteDeploy();
    const now = Date.now();
    const dateStr = new Date(now).toISOString().split('T')[0];
    const abortedTag = activeLock.tag;
    const elapsedMinutes = Math.max(1, Math.floor(activeLock.elapsedSeconds / 60));

    // Deduct 1 parachute
    setUsedParachutes((prev) => prev + 1);

    // STRICT ABORTED SESSION PENALTY:
    // 0 hours credited toward 20-hour parachute progression
    const abortedSession: SessionRecord = {
      id: `sess_aborted_${now}`,
      startTime: activeLock.startTime,
      endTime: now,
      durationSeconds: activeLock.durationSeconds,
      earnedParachuteSeconds: 0, // Voided!
      weightMultiplier: 0,
      tag: abortedTag,
      status: 'parachuted',
      dateStr,
    };
    setSessions((prev) => [abortedSession, ...prev]);

    // Ledger entry
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

    // Clear active lock
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
    } else {
      setCumulativeSeconds((prev) => {
        const next = prev + secondsToAdd;
        const prevMilestones = Math.floor(prev / SECONDS_PER_PARACHUTE);
        const nextMilestones = Math.floor(next / SECONDS_PER_PARACHUTE);
        if (nextMilestones > prevMilestones) {
          const delta = nextMilestones - prevMilestones;
          const now = Date.now();
          const newEntry: ParachuteLedgerEntry = {
            id: `txn_${now}`,
            timestamp: now,
            type: 'EARNED',
            description: `20-Hour Milestone reached! (+${delta} Emergency Parachute earned)`,
            delta,
            tag: 'Deep Work',
            note: 'Simulated daytime focus completion',
          };
          setLedger((l) => [newEntry, ...l]);
          try {
            confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          } catch {
            // Ignore
          }
        }
        return next;
      });
      setTotalReclaimedSeconds((prev) => prev + secondsToAdd);
    }
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

  const exportData = () => {
    const backup = {
      cumulativeSeconds,
      totalReclaimedSeconds,
      usedParachutes,
      sleepFarmingMode,
      ledger,
      sessions,
      schedules,
      theme,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zero-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resetAllData = () => {
    localStorage.clear();
    setCumulativeSeconds(0);
    setTotalReclaimedSeconds(0);
    setUsedParachutes(0);
    setLedger([]);
    setSessions([]);
    setActiveLock({
      isLocked: false,
      tag: 'Deep Work',
      startTime: 0,
      targetEndTime: 0,
      durationSeconds: 0,
      elapsedSeconds: 0,
      remainingSeconds: 0,
    });
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
    preLockAlert,
    igniteSession,
    deployParachute,
    simulateReboot,
    fastForwardSeconds,
    toggleSchedule,
    addSchedule,
    deleteSchedule,
    triggerTestWarning,
    exportData,
    resetAllData,
  };
}
