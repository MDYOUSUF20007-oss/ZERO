import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  IntegrityEngine,
  SECONDS_PER_PARACHUTE,
  type ProtectedIntegrityState,
} from '../core/integrity/IntegrityEngine';
import type {
  SessionTag,
  SessionRecord,
  ParachuteMetrics,
  RecurringSchedule,
  ActiveLockSession,
  ThemeStyle,
  SleepFarmingMode,
  OccasionBag,
  BagApp,
  NativePermissionStatus,
  NativeAppBuildInfo,
  NativeEnvironmentSecurity,
  NativeStateSnapshot,
  ZeroProfile,
  ParachuteRewardEvent,
  ProfileAvatarId,
  ProfileAccent,
  CloudAutoBackupStatus,
  ThemeConfig,
  DashboardWidgetsConfig,
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
  sanitizeZeroProfile,
} from '../utils/parachuteRewardsPolicy';
import {
  DEFAULT_THEME_CONFIG,
  computeDynamicAccentTokens,
  computeThemeRuntime,
  resolveActiveAccentTokens,
  sanitizeThemeConfig,
} from '../utils/themes';
import {
  DEFAULT_WIDGETS_CONFIG,
  sanitizeWidgetsConfig,
} from '../utils/heatmapAnalytics';
import {
  ACCENT_ID_TO_KEY,
  ACCENT_THEMES,
} from '../components/ProfileAvatar';
import {
  disableUniversalCloudAutoBackup,
  enableUniversalCloudAutoBackup,
  fetchUniversalCloudAutoBackupStatus,
  isNativeAndroidCloudPluginAvailable,
  pickCloudBackupFileContent,
  triggerOneTapCloudUpload,
  writeUniversalCloudAutoBackup,
} from '../plugins/cloudAutoBackup';

export { SECONDS_PER_PARACHUTE };
export const MAX_BAG_APPS = 3; // Zero App 3-app cap per Bag
export const MAX_BAGS = 4; // 4 customizable occasion Bags

// Strictly UI preferences & non-protected local cache keys.
// Protected stats, donor status, Escape Tickets, sessions, and ledger live inside IntegrityEngine.
const UI_STORAGE_KEYS = {
  ACTIVE_LOCK: 'zero_active_lock_v3',
  PROFILE: 'zero_user_profile_v1',
  DISMISSED_WELCOME_MODAL: 'zero_dismissed_welcome_modal_v1',
  ONBOARDING_COMPLETE: 'onboardingComplete',
  AUTO_BACKUP_ENABLED: 'autoBackupEnabled',
  LAST_BACKUP_TIMESTAMP: 'lastBackupTimestamp',
  CLOUD_BACKUP_META: 'zero_cloud_backup_meta_v1',
  SCHEDULES: 'zero_recurring_schedules_v3',
  BAGS: 'zero_occasion_bags_v4',
  ACTIVE_BAG_ID: 'zero_active_bag_id_v4',
  THEME: 'zero_active_theme_v3',
  THEME_CONFIG: 'zero_theme_config_v1',
  SLEEP_FARMING_MODE: 'zero_sleep_farming_mode_v3',
  TIP_SKIP_REMAINING: 'zero_tip_skip_remaining_v1',
  WIDGET_CONFIG: 'zero_widgets_config_v1',
};

const IDLE_LOCK: ActiveLockSession = {
  isLocked: false,
  tag: 'Deep Work',
  startTime: 0,
  targetEndTime: 0,
  durationSeconds: 0,
  elapsedSeconds: 0,
  remainingSeconds: 0,
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
    allowCalls: true,
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
    allowCalls: true,
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
  hasRestrictedSettingsAllowed: true,
  restrictedSettingsStatus: 'allowed',
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
        hasRestrictedSettingsAllowed: false,
        restrictedSettingsStatus: 'check_app_info',
        isDeviceOwner: false,
        strictReady: false,
      };
    }
    return DEFAULT_WEB_PERMISSIONS;
  }
  try {
    const raw = window.ZeroNative.getPermissionStatusJson();
    const parsed = JSON.parse(raw) as NativePermissionStatus;
    const coreGranted = parsed.isStrictAccessibilityBuild
      ? parsed.isAccessibilityEnabled
      : parsed.hasUsageStatsPermission;
    const status =
      parsed.restrictedSettingsStatus ||
      (parsed.hasRestrictedSettingsAllowed || coreGranted ? 'allowed' : 'check_app_info');
    return {
      ...parsed,
      hasRestrictedSettingsAllowed:
        parsed.hasRestrictedSettingsAllowed ?? status === 'allowed',
      restrictedSettingsStatus: status,
    };
  } catch {
    return {
      ...DEFAULT_WEB_PERMISSIONS,
      isNativeAndroid: isCapacitorNativeAndroid(),
      hasRestrictedSettingsAllowed: !isCapacitorNativeAndroid(),
      restrictedSettingsStatus: isCapacitorNativeAndroid() ? 'check_app_info' : 'allowed',
      strictReady: !isCapacitorNativeAndroid(),
    };
  }
}

function readAppBuildInfoFromNative(): NativeAppBuildInfo | null {
  if (typeof window === 'undefined' || !window.ZeroNative?.getAppBuildInfoJson) {
    return null;
  }
  try {
    const raw = window.ZeroNative.getAppBuildInfoJson();
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<NativeAppBuildInfo>;
    if (!parsed.packageName) return null;
    return {
      packageName: parsed.packageName,
      versionName: parsed.versionName || 'unknown',
      versionCode: Number(parsed.versionCode || 0),
      edition: parsed.edition === 'strict' ? 'strict' : 'standard',
      signingSha256: parsed.signingSha256 || '',
      isOfficialReleaseKey: Boolean(parsed.isOfficialReleaseKey),
      installerPackageName: parsed.installerPackageName || '',
    };
  } catch {
    return null;
  }
}

function readEnvironmentSecurityFromNative(): NativeEnvironmentSecurity {
  if (typeof window === 'undefined' || !window.ZeroNative?.getEnvironmentSecurityJson) {
    return IntegrityEngine.DEFAULT_SAFE_ENVIRONMENT_SECURITY;
  }
  try {
    return IntegrityEngine.parseEnvironmentSecurityJson(
      window.ZeroNative.getEnvironmentSecurityJson()
    );
  } catch {
    return IntegrityEngine.parseEnvironmentSecurityJson('invalid');
  }
}

export function useZeroStore() {
  // Protected Integrity State — strictly loaded & mutated only through frozen IntegrityEngine
  const [integrityState, setIntegrityState] = useState<ProtectedIntegrityState>(() =>
    IntegrityEngine.loadState()
  );
  const integrityStateRef = useRef<ProtectedIntegrityState>(integrityState);
  useEffect(() => {
    integrityStateRef.current = integrityState;
  }, [integrityState]);

  const {
    cumulativeSeconds,
    totalReclaimedSeconds,
    usedParachutes,
    bonusParachutes,
    hasClaimedFirstTimeParachute,
    hasClaimedFirstDonationParachute,
    isZeroSupporter,
    sessions,
    ledger,
  } = integrityState;

  const [theme, setThemeState] = useState<ThemeStyle>(() => {
    return (localStorage.getItem(UI_STORAGE_KEYS.THEME) as ThemeStyle) || 'amoled';
  });

  const [themeConfig, setThemeConfigState] = useState<ThemeConfig>(() => {
    const legacy = (localStorage.getItem(UI_STORAGE_KEYS.THEME) as ThemeStyle) || 'amoled';
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.THEME_CONFIG);
      if (saved) {
        return sanitizeThemeConfig(JSON.parse(saved) as Partial<ThemeConfig>, legacy);
      }
    } catch {
      // Ignore malformed stored theme
    }
    return sanitizeThemeConfig(DEFAULT_THEME_CONFIG, legacy);
  });

  const setThemeConfig = useCallback((next: ThemeConfig) => {
    const sanitized = sanitizeThemeConfig(next);
    setThemeConfigState(sanitized);
    setThemeState(sanitized.family);
  }, []);

  const setTheme = useCallback((nextStyle: ThemeStyle) => {
    setThemeState(nextStyle);
    setThemeConfigState((prev) =>
      sanitizeThemeConfig(
        {
          ...prev,
          family:
            nextStyle === 'kindle' ? 'kindle' : nextStyle === 'matte' ? 'matte' : 'amoled',
        },
        nextStyle
      )
    );
  }, []);

  const [sleepFarmingMode, setSleepFarmingMode] = useState<SleepFarmingMode>(() => {
    return (
      (localStorage.getItem(UI_STORAGE_KEYS.SLEEP_FARMING_MODE) as SleepFarmingMode) ||
      'quarter_credit'
    );
  });

  const [tipSkipRemaining, setTipSkipRemaining] = useState<number>(() => {
    return normalizeTipSkipCount(localStorage.getItem(UI_STORAGE_KEYS.TIP_SKIP_REMAINING));
  });
  const [postSessionTipPrompt, setPostSessionTipPrompt] = useState<SessionRecord | null>(null);

  const [widgetsConfig, setWidgetsConfigState] = useState<DashboardWidgetsConfig>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.WIDGET_CONFIG);
      if (saved) {
        return sanitizeWidgetsConfig(JSON.parse(saved) as Partial<DashboardWidgetsConfig>);
      }
    } catch {
      // Fallback
    }
    return DEFAULT_WIDGETS_CONFIG;
  });

  const setWidgetsConfig = useCallback((next: DashboardWidgetsConfig) => {
    const sanitized = sanitizeWidgetsConfig(next);
    setWidgetsConfigState(sanitized);
  }, []);

  const [hasDismissedWelcomeModal, setHasDismissedWelcomeModal] = useState<boolean>(() => {
    return localStorage.getItem(UI_STORAGE_KEYS.DISMISSED_WELCOME_MODAL) === '1';
  });

  const [profile, setProfile] = useState<ZeroProfile | null>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.PROFILE);
      return saved ? sanitizeZeroProfile(JSON.parse(saved) as Partial<ZeroProfile>) : null;
    } catch {
      return null;
    }
  });

  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(() => {
    const saved = localStorage.getItem(UI_STORAGE_KEYS.ONBOARDING_COMPLETE);
    if (saved === 'true' || saved === '1') return true;
    const hasProfile = Boolean(localStorage.getItem(UI_STORAGE_KEYS.PROFILE));
    const hasDismissed = localStorage.getItem(UI_STORAGE_KEYS.DISMISSED_WELCOME_MODAL) === '1';
    const initialIntegrity = IntegrityEngine.loadState();
    return (
      hasProfile ||
      hasDismissed ||
      initialIntegrity.hasClaimedFirstTimeParachute ||
      initialIntegrity.cumulativeSeconds > 0
    );
  });

  const [autoBackupEnabled, setAutoBackupEnabled] = useState<boolean>(() => {
    return localStorage.getItem(UI_STORAGE_KEYS.AUTO_BACKUP_ENABLED) === 'true';
  });

  const [lastBackupTimestamp, setLastBackupTimestamp] = useState<number>(() => {
    const raw = localStorage.getItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP);
    if (raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const initialIntegrity = IntegrityEngine.loadState();
    const hasExistingStats =
      initialIntegrity.cumulativeSeconds > 0 ||
      initialIntegrity.hasClaimedFirstDonationParachute;
    const initialTs = hasExistingStats ? 0 : Date.now();
    localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(initialTs));
    return initialTs;
  });

  const [cloudBackupMeta, setCloudBackupMeta] = useState<{
    uri: string | null;
    displayName: string | null;
    providerLabel: string | null;
    hasPersistedPermission: boolean;
    lastError: string | null;
  }>(() => {
    try {
      const raw = localStorage.getItem(UI_STORAGE_KEYS.CLOUD_BACKUP_META);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<CloudAutoBackupStatus>;
        return {
          uri: parsed.uri || null,
          displayName: parsed.displayName || null,
          providerLabel: parsed.providerLabel || null,
          hasPersistedPermission: Boolean(parsed.hasPersistedPermission),
          lastError: parsed.lastError || null,
        };
      }
    } catch {
      // Fallback
    }
    return {
      uri: null,
      displayName: null,
      providerLabel: null,
      hasPersistedPermission: false,
      lastError: null,
    };
  });

  const [isCloudBusy, setIsCloudBusy] = useState<boolean>(false);
  const [weeklyCheckNowMs, setWeeklyCheckNowMs] = useState<number>(() => Date.now());
  const [parachuteRewardEvent, setParachuteRewardEvent] = useState<ParachuteRewardEvent | null>(
    null
  );
  const [justEarnedParachute, setJustEarnedParachute] = useState<boolean>(false);

  const [schedules, setSchedules] = useState<RecurringSchedule[]>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.SCHEDULES);
      return saved ? (JSON.parse(saved) as RecurringSchedule[]) : DEFAULT_SCHEDULES;
    } catch {
      return DEFAULT_SCHEDULES;
    }
  });

  // 4 Custom Occasion Bags (max 3 apps each + SMS toggle; Phone Calls are compulsory Always ON)
  const [bags, setBags] = useState<OccasionBag[]>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.BAGS);
      if (saved) {
        const parsed = JSON.parse(saved) as OccasionBag[];
        if (Array.isArray(parsed) && parsed.length === MAX_BAGS) {
          return parsed.map((b) => ({
            ...b,
            apps: Array.isArray(b.apps) ? b.apps.slice(0, MAX_BAG_APPS) : [],
            allowCalls: true,
            allowSms: Boolean(b.allowSms),
          }));
        }
      }
    } catch {
      // Fallback
    }
    return DEFAULT_BAGS;
  });

  const [activeBagId, setActiveBagIdState] = useState<string>(() => {
    return localStorage.getItem(UI_STORAGE_KEYS.ACTIVE_BAG_ID) || DEFAULT_BAGS[0].id;
  });

  const [permissions, setPermissions] = useState<NativePermissionStatus>(() =>
    readPermissionsFromNative()
  );
  const [appBuildInfo, setAppBuildInfo] = useState<NativeAppBuildInfo | null>(() =>
    readAppBuildInfoFromNative()
  );
  const [environmentSecurity, setEnvironmentSecurity] = useState<NativeEnvironmentSecurity>(() =>
    readEnvironmentSecurityFromNative()
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

  const [expiredWebLockOnBoot] = useState<ActiveLockSession | null>(() => {
    if (isCapacitorNativeAndroid()) return null;
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
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
      const saved = localStorage.getItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
      if (saved) {
        const parsed = JSON.parse(saved) as ActiveLockSession;
        const now = Date.now();
        if (parsed.isLocked && parsed.targetEndTime > now) {
          const remaining = Math.max(0, Math.floor((parsed.targetEndTime - now) / 1000));
          const elapsed = Math.max(0, Math.floor((now - parsed.startTime) / 1000));
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
    return IDLE_LOCK;
  });

  const [preLockAlert, setPreLockAlert] = useState<{
    show: boolean;
    scheduleName: string;
    minutesLeft: number;
  } | null>(null);

  const activeBag = bags.find((b) => b.id === activeBagId) || bags[0];
  const webStartPerfMsRef = useRef<number | null>(null);
  const justEarnedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootRecoveryHandledRef = useRef(false);
  const queueSilentCloudWriteRef = useRef<(() => void) | null>(null);

  const activeLockRef = useRef(activeLock);
  useEffect(() => {
    activeLockRef.current = activeLock;
  }, [activeLock]);
  const sleepFarmingModeRef = useRef(sleepFarmingMode);
  useEffect(() => {
    sleepFarmingModeRef.current = sleepFarmingMode;
  }, [sleepFarmingMode]);
  const tipSkipRemainingRef = useRef(tipSkipRemaining);
  useEffect(() => {
    tipSkipRemainingRef.current = tipSkipRemaining;
  }, [tipSkipRemaining]);

  useEffect(() => {
    return () => {
      if (justEarnedTimerRef.current) clearTimeout(justEarnedTimerRef.current);
    };
  }, []);

  const refreshPermissions = useCallback(() => {
    setPermissions(readPermissionsFromNative());
    setAppBuildInfo(readAppBuildInfoFromNative());
    setEnvironmentSecurity(readEnvironmentSecurityFromNative());
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

  const refreshCloudBackupStatus = useCallback(async () => {
    setWeeklyCheckNowMs(Date.now());
    const nativeStatus = await fetchUniversalCloudAutoBackupStatus();
    if (!nativeStatus) return;

    setAutoBackupEnabled(Boolean(nativeStatus.enabled));
    setCloudBackupMeta((prev) => ({
      uri: nativeStatus.uri ?? null,
      displayName: nativeStatus.displayName ?? null,
      providerLabel: nativeStatus.providerLabel ?? null,
      hasPersistedPermission: Boolean(nativeStatus.hasPersistedPermission),
      lastError:
        nativeStatus.enabled && nativeStatus.uri && !nativeStatus.hasPersistedPermission
          ? 'Storage write permission lost for this cloud folder. Tap Change Cloud File to relink.'
          : prev.lastError,
    }));
    if (
      typeof nativeStatus.lastBackupTimestamp === 'number' &&
      nativeStatus.lastBackupTimestamp > 0
    ) {
      setLastBackupTimestamp((prev) =>
        Math.max(prev, nativeStatus.lastBackupTimestamp || 0)
      );
    }
  }, []);

  const syncNativeLedger = useCallback(
    (cumSecs: number, usedCount: number, bonusCount: number) => {
      try {
        if (window.ZeroNative?.syncLedgerStateWithBonus) {
          window.ZeroNative.syncLedgerStateWithBonus(cumSecs, usedCount, bonusCount);
        } else {
          window.ZeroNative?.syncLedgerState(cumSecs, usedCount);
        }
      } catch {
        // Web mode
      }
    },
    []
  );

  const emitParachuteReward = useCallback((event: Omit<ParachuteRewardEvent, 'id'>) => {
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
  }, []);

  const dismissParachuteRewardAnimation = useCallback(() => {
    setParachuteRewardEvent(null);
  }, []);

  const applyPostCompletionSideEffects = useCallback(
    (
      committedSessions: SessionRecord[],
      rewards: Omit<ParachuteRewardEvent, 'id'>[]
    ) => {
      if (committedSessions.length === 0) return;
      haptics.milestoneChime();

      for (const reward of rewards) {
        emitParachuteReward(reward);
      }

      try {
        window.ZeroNative?.stopLockTaskMode();
      } catch {
        // Ignore
      }

      const tipDecision = evaluatePostSessionTipPrompt(tipSkipRemainingRef.current);
      tipSkipRemainingRef.current = tipDecision.nextSkipRemaining;
      setTipSkipRemaining(tipDecision.nextSkipRemaining);
      localStorage.setItem(
        UI_STORAGE_KEYS.TIP_SKIP_REMAINING,
        String(tipDecision.nextSkipRemaining)
      );
      if (tipDecision.shouldShow) {
        setPostSessionTipPrompt(committedSessions[committedSessions.length - 1]);
      }
    },
    [emitParachuteReward]
  );

  /**
   * Authoritative Native Android State & Verified Completion Consumer:
   * Only accepts HMAC-signed VerifiedCompletionEvents produced via SystemClock.elapsedRealtime().
   */
  const syncWithNativeState = useCallback((): NativeStateSnapshot | null => {
    if (typeof window === 'undefined' || !window.ZeroNative) return null;
    try {
      const raw = window.ZeroNative.getNativeStateJson();
      const nativeState = JSON.parse(raw) as NativeStateSnapshot;

      const pending = Array.isArray(nativeState.pendingCompletions)
        ? nativeState.pendingCompletions
        : [];
      if (pending.length > 0) {
        const result = IntegrityEngine.commitNativeSessionCompletions(
          integrityStateRef.current,
          pending,
          sleepFarmingModeRef.current,
          true
        );

        if (result.acceptedEventIds.length > 0) {
          integrityStateRef.current = result.state;
          setIntegrityState(result.state);
          syncNativeLedger(
            result.state.cumulativeSeconds,
            result.state.usedParachutes,
            result.state.bonusParachutes
          );
          try {
            window.ZeroNative.acknowledgeVerifiedCompletions?.(
              JSON.stringify(result.acceptedEventIds)
            );
          } catch {
            // Ignore ack bridge issues; dedup guard also prevents replay
          }
        }

        if (result.committedSessions.length > 0) {
          if (!nativeState.isLocked) {
            setActiveLock(IDLE_LOCK);
            localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
          }
          applyPostCompletionSideEffects(result.committedSessions, result.rewards);
          return nativeState;
        }
      }

      const currentLock = activeLockRef.current;
      const curIntegrity = integrityStateRef.current;

      // Detect native Escape Ticket deployment (aborted inside TheVoidActivity)
      if (!nativeState.isLocked && nativeState.deployedCount > curIntegrity.usedParachutes) {
        const aborted = IntegrityEngine.commitEscapeTicketAbort(
          curIntegrity,
          {
            tag: currentLock.tag || nativeState.sessionTag || 'Deep Work',
            startTime: currentLock.startTime || nativeState.startTime || Date.now(),
            durationSeconds: currentLock.durationSeconds || nativeState.durationSeconds || 0,
            elapsedSeconds: currentLock.elapsedSeconds || nativeState.elapsedSeconds || 0,
          },
          true
        );
        if (aborted.ok) {
          haptics.parachuteDeploy();
          integrityStateRef.current = aborted.state;
          setIntegrityState(aborted.state);
        }
        setActiveLock(IDLE_LOCK);
        localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
        return nativeState;
      }

      if (nativeState.isLocked) {
        const nextLock: ActiveLockSession = {
          isLocked: true,
          tag: nativeState.sessionTag || currentLock.tag || 'Deep Work',
          startTime: nativeState.startTime || currentLock.startTime || Date.now(),
          targetEndTime: nativeState.targetEndTime || currentLock.targetEndTime || Date.now(),
          durationSeconds: nativeState.durationSeconds || currentLock.durationSeconds || 0,
          elapsedSeconds: Math.max(0, Number(nativeState.elapsedSeconds ?? currentLock.elapsedSeconds)),
          remainingSeconds: Math.max(0, Number(nativeState.remainingSeconds ?? currentLock.remainingSeconds)),
        };
        setActiveLock(nextLock);
      } else if (currentLock.isLocked) {
        // Native engine is unlocked with no verified completion and no abort — reset UI lock safely (0 free credit)
        setActiveLock(IDLE_LOCK);
        localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
      }

      return nativeState;
    } catch {
      return null;
    }
  }, [applyPostCompletionSideEffects, syncNativeLedger]);

  const activeAccentTokensRef = useRef<{ hex: string; rgb: string; badgeText: string } | null>(null);

  useEffect(() => {
    refreshPermissions();
    syncWithNativeState();
    void refreshCloudBackupStatus();
    let tries = 0;
    const bootPoll = setInterval(() => {
      tries++;
      if (window.ZeroNative || tries >= 20) {
        refreshPermissions();
        refreshInstalledApps();
        syncWithNativeState();
        if (window.ZeroNative && activeAccentTokensRef.current) {
          try {
            window.ZeroNative.setActiveThemeAccent?.(
              activeAccentTokensRef.current.hex,
              activeAccentTokensRef.current.rgb,
              activeAccentTokensRef.current.badgeText
            );
          } catch {
            // Ignore bridge error during boot poll
          }
        }
        clearInterval(bootPoll);
      }
    }, 150);

    const onFocus = () => {
      refreshPermissions();
      syncWithNativeState();
      void refreshCloudBackupStatus();
    };
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        refreshPermissions();
        syncWithNativeState();
        void refreshCloudBackupStatus();
      }
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
  }, [refreshPermissions, refreshInstalledApps, refreshCloudBackupStatus, syncWithNativeState]);

  useEffect(() => {
    localStorage.setItem(
      UI_STORAGE_KEYS.ONBOARDING_COMPLETE,
      onboardingComplete ? 'true' : 'false'
    );
  }, [onboardingComplete]);

  useEffect(() => {
    localStorage.setItem(
      UI_STORAGE_KEYS.AUTO_BACKUP_ENABLED,
      autoBackupEnabled ? 'true' : 'false'
    );
  }, [autoBackupEnabled]);

  useEffect(() => {
    localStorage.setItem(
      UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP,
      String(lastBackupTimestamp)
    );
  }, [lastBackupTimestamp]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.CLOUD_BACKUP_META, JSON.stringify(cloudBackupMeta));
  }, [cloudBackupMeta]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.THEME, theme);
  }, [theme]);

  useEffect(() => {
    if (profile) {
      localStorage.setItem(UI_STORAGE_KEYS.PROFILE, JSON.stringify(profile));
    } else {
      localStorage.removeItem(UI_STORAGE_KEYS.PROFILE);
    }
  }, [profile]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.WIDGET_CONFIG, JSON.stringify(widgetsConfig));
  }, [widgetsConfig]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.THEME_CONFIG, JSON.stringify(themeConfig));
    const runtime = computeThemeRuntime(themeConfig);
    const rootEl = document.documentElement;
    rootEl.className = runtime.mode === 'light' ? 'light' : 'dark';
    rootEl.setAttribute('data-zero-theme', runtime.family);
    rootEl.setAttribute(
      'data-zero-has-gradient',
      String(themeConfig.family === 'amoled' && themeConfig.amoledGradient !== 'pure')
    );
    Object.entries(runtime.cssVars).forEach(([cssVar, val]) => {
      rootEl.style.setProperty(cssVar, val);
    });

    // Harmonize global Frosted Obsidian accent tokens (--accent-rgb, --accent-hex,
    // --accent-badge-gradient, --accent-badge-text) across the entire app:
    // - Pure Pitch AMOLED follows the user's Profile Accent (default Amber #F59E0B)
    // - Gradient AMOLED / Paper Kindle / Matte Studio harmonize to their active finish accent
    const accentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
    const profileAccentTheme = ACCENT_THEMES[accentKey] || ACCENT_THEMES.Amber;
    const isPureAmoled =
      themeConfig.family === 'amoled' && themeConfig.amoledGradient === 'pure';
    const activeTokens = resolveActiveAccentTokens(themeConfig, profileAccentTheme);
    activeAccentTokensRef.current = {
      hex: activeTokens.hex,
      rgb: activeTokens.rgb,
      badgeText: activeTokens.badgeText,
    };

    if (isPureAmoled) {
      rootEl.style.setProperty('--accent-rgb', activeTokens.rgb);
      rootEl.style.setProperty('--accent-hex', activeTokens.hex);
      rootEl.style.setProperty('--accent-badge-gradient', activeTokens.badgeGradient);
      rootEl.style.setProperty('--accent-badge-text', activeTokens.badgeText);
      rootEl.style.setProperty('--zero-accent', activeTokens.hex);
      rootEl.style.setProperty('--zero-dial-stroke', activeTokens.hex);
    } else {
      const derived = computeDynamicAccentTokens(runtime.cssVars['--zero-accent'] || '#F59E0B');
      rootEl.style.setProperty('--accent-rgb', derived.rgb);
      rootEl.style.setProperty('--accent-hex', derived.hex);
      rootEl.style.setProperty('--accent-badge-gradient', derived.badgeGradient);
      rootEl.style.setProperty('--accent-badge-text', derived.badgeText);
    }

    try {
      window.ZeroNative?.setActiveThemeAccent?.(
        activeTokens.hex,
        activeTokens.rgb,
        activeTokens.badgeText
      );
    } catch {
      // Ignore on web preview
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', runtime.metaThemeColor);
    }
  }, [themeConfig, profile]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.SLEEP_FARMING_MODE, sleepFarmingMode);
  }, [sleepFarmingMode]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.TIP_SKIP_REMAINING, String(tipSkipRemaining));
  }, [tipSkipRemaining]);

  useEffect(() => {
    localStorage.setItem(
      UI_STORAGE_KEYS.DISMISSED_WELCOME_MODAL,
      hasDismissedWelcomeModal ? '1' : '0'
    );
  }, [hasDismissedWelcomeModal]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.SCHEDULES, JSON.stringify(schedules));
  }, [schedules]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.BAGS, JSON.stringify(bags));
  }, [bags]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.ACTIVE_BAG_ID, activeBagId);
  }, [activeBagId]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(activeLock));
  }, [activeLock]);

  // Keep native BagStore & ParachuteStore synchronized seamlessly
  useEffect(() => {
    if (environmentSecurity.restrictions.presetBagEditingDisabled) {
      return;
    }
    try {
      if (window.ZeroNative && activeBag) {
        window.ZeroNative.setBagStateJson(
          activeBag.name,
          JSON.stringify(activeBag.apps.slice(0, MAX_BAG_APPS)),
          true,
          activeBag.allowSms
        );
      }
    } catch {
      // Web mode
    }
  }, [activeBag, environmentSecurity.restrictions.presetBagEditingDisabled]);

  useEffect(() => {
    syncNativeLedger(cumulativeSeconds, usedParachutes, bonusParachutes);
  }, [cumulativeSeconds, usedParachutes, bonusParachutes, syncNativeLedger]);

  const parachuteMetrics: ParachuteMetrics = useMemo(
    () => IntegrityEngine.computeParachuteMetrics(integrityState, sleepFarmingMode),
    [integrityState, sleepFarmingMode]
  );

  const todayStr = new Date().toISOString().split('T')[0];
  const todayReclaimedHours = Number(
    (
      sessions
        .filter((s) => s.status === 'completed' && s.dateStr === todayStr)
        .reduce((acc, s) => acc + s.durationSeconds, 0) / 3600
    ).toFixed(1)
  );

  // Web Preview recovery for an active timer that elapsed across reload (only when NOT native Android)
  useEffect(() => {
    if (!expiredWebLockOnBoot || bootRecoveryHandledRef.current || isCapacitorNativeAndroid()) {
      return;
    }
    const timer = setTimeout(() => {
      if (bootRecoveryHandledRef.current) return;
      bootRecoveryHandledRef.current = true;
      const res = IntegrityEngine.commitWebPreviewSessionCompletion(
        integrityStateRef.current,
        {
          lock: expiredWebLockOnBoot,
          sleepFarmingMode: sleepFarmingModeRef.current,
          isNativeAndroid: false,
          startPerfMs: null,
          nowPerfMs: performance.now(),
        },
        true
      );
      if (res.ok) {
        integrityStateRef.current = res.state;
        setIntegrityState(res.state);
        setActiveLock(IDLE_LOCK);
        localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
        applyPostCompletionSideEffects([res.committedSession], res.rewards);
      }
    }, 60);
    return () => clearTimeout(timer);
  }, [expiredWebLockOnBoot, applyPostCompletionSideEffects]);

  // Active Lock Polling Loop:
  // - Native Android: strictly tracks Android SystemClock.elapsedRealtime() via ZeroNative bridge.
  // - Web Browser Preview: tracks browser monotonic performance.now() via IntegrityEngine.
  useEffect(() => {
    if (!activeLock.isLocked) return;

    const tick = () => {
      if (typeof window !== 'undefined' && (window.ZeroNative || isCapacitorNativeAndroid())) {
        syncWithNativeState();
        return;
      }

      const current = activeLockRef.current;
      if (!current.isLocked) return;

      const startPerf = webStartPerfMsRef.current;
      const nowPerf = performance.now();
      const nowWall = Date.now();
      const elapsedSec =
        startPerf !== null
          ? Math.max(0, Math.floor((nowPerf - startPerf) / 1000))
          : Math.max(0, Math.floor((nowWall - current.startTime) / 1000));
      const remainingSec = Math.max(0, current.durationSeconds - elapsedSec);

      if (remainingSec <= 0) {
        const res = IntegrityEngine.commitWebPreviewSessionCompletion(
          integrityStateRef.current,
          {
            lock: current,
            sleepFarmingMode: sleepFarmingModeRef.current,
            isNativeAndroid: false,
            startPerfMs: startPerf,
            nowPerfMs: nowPerf,
            nowWallMs: nowWall,
          },
          true
        );
        if (res.ok) {
          webStartPerfMsRef.current = null;
          integrityStateRef.current = res.state;
          setIntegrityState(res.state);
          setActiveLock(IDLE_LOCK);
          localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);
          applyPostCompletionSideEffects([res.committedSession], res.rewards);
          return;
        }
      }

      setActiveLock((prev) => ({
        ...prev,
        elapsedSeconds: elapsedSec,
        remainingSeconds: remainingSec,
      }));
    };

    const interval = setInterval(tick, 1000);
    window.addEventListener('focus', tick);
    document.addEventListener('visibilitychange', tick);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', tick);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [activeLock.isLocked, syncWithNativeState, applyPostCompletionSideEffects]);

  const igniteSession = (durationSeconds: number, tag: SessionTag): boolean => {
    const latestPerms = readPermissionsFromNative();
    const latestSecurity = readEnvironmentSecurityFromNative();
    setPermissions(latestPerms);
    setEnvironmentSecurity(latestSecurity);

    if (latestPerms.isNativeAndroid && !latestPerms.strictReady) {
      window.ZeroNative?.requestNextMissingPermission();
      return false;
    }

    const safeDuration = Math.max(60, Math.round(durationSeconds));

    try {
      if (window.ZeroNative && activeBag) {
        if (!latestSecurity.restrictions.presetBagEditingDisabled) {
          window.ZeroNative.setBagStateJson(
            activeBag.name,
            JSON.stringify(activeBag.apps.slice(0, MAX_BAG_APPS)),
            true,
            activeBag.allowSms
          );
        }
        syncNativeLedger(
          integrityStateRef.current.cumulativeSeconds,
          integrityStateRef.current.usedParachutes,
          integrityStateRef.current.bonusParachutes
        );
        const accentKeyNow = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
        const profileThemeNow = ACCENT_THEMES[accentKeyNow] || ACCENT_THEMES.Amber;
        const activeTokensNow = resolveActiveAccentTokens(themeConfig, profileThemeNow);
        window.ZeroNative.setActiveThemeAccent?.(
          activeTokensNow.hex,
          activeTokensNow.rgb,
          activeTokensNow.badgeText
        );
        const started = window.ZeroNative.igniteSession(safeDuration, tag);
        if (started === false) {
          refreshPermissions();
          return false;
        }
      } else if (latestPerms.isNativeAndroid) {
        return false;
      }
    } catch {
      if (latestPerms.isNativeAndroid) return false;
    }

    const now = Date.now();
    const targetEndTime = now + safeDuration * 1000;
    webStartPerfMsRef.current = performance.now();

    haptics.lockEngaged();

    const newLock: ActiveLockSession = {
      isLocked: true,
      tag,
      startTime: now,
      targetEndTime,
      durationSeconds: safeDuration,
      elapsedSeconds: 0,
      remainingSeconds: safeDuration,
    };

    setActiveLock(newLock);
    localStorage.setItem(UI_STORAGE_KEYS.ACTIVE_LOCK, JSON.stringify(newLock));
    queueSilentCloudWriteRef.current?.();
    return true;
  };

  const deployParachute = (): boolean => {
    if (parachuteMetrics.currentBalance < 1 || !activeLock.isLocked) return false;

    const aborted = IntegrityEngine.commitEscapeTicketAbort(
      integrityStateRef.current,
      {
        tag: activeLock.tag,
        startTime: activeLock.startTime,
        durationSeconds: activeLock.durationSeconds,
        elapsedSeconds: activeLock.elapsedSeconds,
      },
      true
    );
    if (!aborted.ok) return false;

    haptics.parachuteDeploy();
    webStartPerfMsRef.current = null;
    integrityStateRef.current = aborted.state;
    setIntegrityState(aborted.state);
    setActiveLock(IDLE_LOCK);
    localStorage.removeItem(UI_STORAGE_KEYS.ACTIVE_LOCK);

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

  const setActiveBagId = (bagId: string) => {
    if (activeLock.isLocked || environmentSecurity.restrictions.presetBagEditingDisabled) return;
    setActiveBagIdState(bagId);
  };

  const updateBag = (bagId: string, updater: (bag: OccasionBag) => OccasionBag) => {
    if (activeLock.isLocked || environmentSecurity.restrictions.presetBagEditingDisabled) return; // Anti-tamper: Bags locked mid-session & on rooted/emulator envs
    setBags((prev) =>
      prev.map((b) => {
        if (b.id !== bagId) return b;
        const next = updater(b);
        return {
          ...next,
          allowCalls: true,
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
      setOnboardingComplete(true);
      localStorage.setItem(UI_STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');

      const gift = IntegrityEngine.claimFirstTimerProfileGift(
        integrityStateRef.current,
        sanitized,
        true
      );
      if (gift.granted) {
        integrityStateRef.current = gift.state;
        setIntegrityState(gift.state);
        syncNativeLedger(
          gift.state.cumulativeSeconds,
          gift.state.usedParachutes,
          gift.state.bonusParachutes
        );
        if (gift.reward) {
          emitParachuteReward(gift.reward);
        }
      }

      return { grantedFreeParachute: gift.granted };
    },
    [profile?.createdAt, emitParachuteReward, syncNativeLedger]
  );

  const claimFirstDonationBonus = useCallback((): boolean => {
    const claim = IntegrityEngine.claimFirstDonationSupporterPerks(
      integrityStateRef.current,
      true
    );
    if (!claim.granted) return false;

    integrityStateRef.current = claim.state;
    setIntegrityState(claim.state);
    syncNativeLedger(
      claim.state.cumulativeSeconds,
      claim.state.usedParachutes,
      claim.state.bonusParachutes
    );
    setPostSessionTipPrompt(null);

    if (claim.reward) {
      emitParachuteReward(claim.reward);
    }
    return true;
  }, [emitParachuteReward, syncNativeLedger]);

  const dismissWelcomePrompt = useCallback(() => {
    setHasDismissedWelcomeModal(true);
  }, []);

  const badgeSummary = useMemo(
    () =>
      IntegrityEngine.evaluateBadges({
        sessions,
        totalReclaimedHours: parachuteMetrics.totalReclaimedHours,
        isZeroSupporter,
      }),
    [sessions, parachuteMetrics.totalReclaimedHours, isZeroSupporter]
  );

  const currentStreak = useMemo(
    () => IntegrityEngine.computeCurrentStreak(sessions),
    [sessions]
  );

  const buildBackupJson = (): string =>
    IntegrityEngine.buildLegacyBackupJson({
      state: integrityState,
      bags,
      activeBagId,
      schedules,
      sleepFarmingMode,
      theme,
      themeConfig,
      profile,
    });

  const buildZbakString = useCallback(
    (): string =>
      IntegrityEngine.encodeVerifiedZbakBackup({
        state: integrityState,
        bags,
        activeBagId,
        schedules,
        sleepFarmingMode,
        theme,
        themeConfig,
        profile,
      }),
    [
      integrityState,
      bags,
      activeBagId,
      schedules,
      sleepFarmingMode,
      theme,
      themeConfig,
      profile,
    ]
  );

  const exportData = (): string => {
    const json = buildBackupJson();
    const fileName = `zero-backup-${new Date().toISOString().split('T')[0]}.json`;
    const exportedTs = Date.now();
    setLastBackupTimestamp(exportedTs);
    localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(exportedTs));

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

  const exportZbakData = (): string => {
    const zbak = buildZbakString();
    const fileName = `zero-backup-${new Date().toISOString().split('T')[0]}.zbak`;
    const exportedTs = Date.now();
    setLastBackupTimestamp(exportedTs);
    localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(exportedTs));

    if (typeof window !== 'undefined' && window.ZeroNative) {
      window.ZeroNative.exportBackupJson(zbak, fileName);
      return zbak;
    }

    const blob = new Blob([zbak], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
    return zbak;
  };

  const importData = useCallback(
    (rawInput: string): { ok: boolean; message: string } => {
      const latestSecurity = readEnvironmentSecurityFromNative();
      setEnvironmentSecurity(latestSecurity);
      if (latestSecurity.restrictions.backupRestoreDisabled || latestSecurity.isCompromised) {
        return {
          ok: false,
          message:
            'Backup restore is disabled on rooted devices, custom test-keys ROMs, or debug emulators to protect ZERO integrity.',
        };
      }

      const outcome = IntegrityEngine.applyVerifiedRestore(
        {
          rawInput,
          defaultSchedules: DEFAULT_SCHEDULES,
          defaultBags: DEFAULT_BAGS,
          sanitizeProfile: sanitizeZeroProfile,
          sanitizeThemeConfig,
          environmentSecurity: latestSecurity,
        },
        true
      );

      if (!outcome.ok || !outcome.state) {
        return { ok: false, message: outcome.message };
      }

      const nextState = outcome.state;
      const nextThemeConfig = outcome.themeConfig || DEFAULT_THEME_CONFIG;
      const nextSleepMode = outcome.sleepFarmingMode || 'quarter_credit';
      const nextBags = (outcome.bags || DEFAULT_BAGS).map((b) => ({
        ...b,
        allowCalls: true,
      }));
      const nextActiveBagId = outcome.activeBagId || nextBags[0].id;
      const nextSchedules = outcome.schedules || DEFAULT_SCHEDULES;
      const restoredNow = outcome.restoredAtMs || Date.now();

      integrityStateRef.current = nextState;
      setIntegrityState(nextState);
      setProfile(outcome.profile ?? null);
      setSchedules(nextSchedules);
      setBags(nextBags);
      setActiveBagIdState(nextActiveBagId);
      setThemeState(nextThemeConfig.family);
      setThemeConfigState(nextThemeConfig);
      setSleepFarmingMode(nextSleepMode);
      setHasDismissedWelcomeModal(true);
      setOnboardingComplete(true);
      setLastBackupTimestamp(restoredNow);

      localStorage.setItem(UI_STORAGE_KEYS.THEME, nextThemeConfig.family);
      localStorage.setItem(UI_STORAGE_KEYS.THEME_CONFIG, JSON.stringify(nextThemeConfig));
      localStorage.setItem(UI_STORAGE_KEYS.SLEEP_FARMING_MODE, nextSleepMode);
      if (outcome.profile) {
        localStorage.setItem(UI_STORAGE_KEYS.PROFILE, JSON.stringify(outcome.profile));
      } else {
        localStorage.removeItem(UI_STORAGE_KEYS.PROFILE);
      }
      localStorage.setItem(UI_STORAGE_KEYS.SCHEDULES, JSON.stringify(nextSchedules));
      localStorage.setItem(UI_STORAGE_KEYS.BAGS, JSON.stringify(nextBags));
      localStorage.setItem(UI_STORAGE_KEYS.ACTIVE_BAG_ID, nextActiveBagId);
      localStorage.setItem(UI_STORAGE_KEYS.DISMISSED_WELCOME_MODAL, '1');
      localStorage.setItem(UI_STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
      localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(restoredNow));

      syncNativeLedger(
        nextState.cumulativeSeconds,
        nextState.usedParachutes,
        nextState.bonusParachutes
      );
      haptics.milestoneChime();

      return { ok: true, message: outcome.message };
    },
    [syncNativeLedger]
  );

  // Mode A: Serialized background writeAutoBackup() trigger on key state mutations
  const autoWriteQueueRef = useRef<Promise<void>>(Promise.resolve());
  const autoSyncMountedRef = useRef<boolean>(false);
  const prevAutoSyncDigestRef = useRef<string>('');
  const buildZbakStringRef = useRef(buildZbakString);
  const cloudUriRef = useRef<string | null>(cloudBackupMeta.uri);

  useEffect(() => {
    buildZbakStringRef.current = buildZbakString;
    cloudUriRef.current = cloudBackupMeta.uri;
  }, [buildZbakString, cloudBackupMeta.uri]);

  const autoSyncDigest = useMemo(
    () =>
      JSON.stringify({
        cumulativeSeconds,
        totalReclaimedSeconds,
        usedParachutes,
        bonusParachutes,
        hasClaimedFirstTimeParachute,
        hasClaimedFirstDonationParachute,
        bags,
        activeBagId,
        sessionsCount: sessions.length,
        ledgerCount: ledger.length,
        schedules,
        sleepFarmingMode,
        themeConfig,
        profile,
      }),
    [
      cumulativeSeconds,
      totalReclaimedSeconds,
      usedParachutes,
      bonusParachutes,
      hasClaimedFirstTimeParachute,
      hasClaimedFirstDonationParachute,
      bags,
      activeBagId,
      sessions.length,
      ledger.length,
      schedules,
      sleepFarmingMode,
      themeConfig,
      profile,
    ]
  );

  const performSilentCloudWrite = useCallback(async () => {
    const payload = buildZbakStringRef.current();
    const res = await writeUniversalCloudAutoBackup(payload, cloudUriRef.current);
    if (res.ok) {
      const ts = res.timestamp || Date.now();
      setLastBackupTimestamp(ts);
      setCloudBackupMeta((prev) => ({
        ...prev,
        hasPersistedPermission: true,
        lastError: null,
      }));
    } else if (res.error) {
      setCloudBackupMeta((prev) => ({
        ...prev,
        hasPersistedPermission: res.permissionRevoked ? false : prev.hasPersistedPermission,
        lastError: res.error || null,
      }));
    }
    return res;
  }, []);

  useEffect(() => {
    queueSilentCloudWriteRef.current = () => {
      if (!autoBackupEnabled) return;
      autoWriteQueueRef.current = autoWriteQueueRef.current
        .catch(() => {})
        .then(async () => {
          await performSilentCloudWrite();
        });
    };
  }, [autoBackupEnabled, performSilentCloudWrite]);

  useEffect(() => {
    if (!autoSyncMountedRef.current) {
      autoSyncMountedRef.current = true;
      prevAutoSyncDigestRef.current = autoSyncDigest;
      return;
    }
    if (autoSyncDigest === prevAutoSyncDigestRef.current) return;
    prevAutoSyncDigestRef.current = autoSyncDigest;
    if (!autoBackupEnabled) return;

    const timer = setTimeout(() => {
      queueSilentCloudWriteRef.current?.();
    }, 400);

    return () => clearTimeout(timer);
  }, [autoSyncDigest, autoBackupEnabled]);

  const enableCloudAutoBackup = useCallback(async (): Promise<{
    ok: boolean;
    cancelled?: boolean;
    message: string;
  }> => {
    setIsCloudBusy(true);
    try {
      const payload = buildZbakStringRef.current();
      const res = await enableUniversalCloudAutoBackup(payload);
      if (res.ok && res.status) {
        const ts = res.status.lastBackupTimestamp || Date.now();
        setAutoBackupEnabled(true);
        setLastBackupTimestamp(ts);
        setCloudBackupMeta({
          uri: res.status.uri || null,
          displayName: res.status.displayName || null,
          providerLabel: res.status.providerLabel || null,
          hasPersistedPermission: Boolean(res.status.hasPersistedPermission),
          lastError: null,
        });
        localStorage.setItem(UI_STORAGE_KEYS.AUTO_BACKUP_ENABLED, 'true');
        localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(ts));
        haptics.milestoneChime();
      }
      return { ok: res.ok, cancelled: res.cancelled, message: res.message };
    } finally {
      setIsCloudBusy(false);
    }
  }, []);

  const disableCloudAutoBackup = useCallback(async () => {
    setIsCloudBusy(true);
    try {
      await disableUniversalCloudAutoBackup();
      setAutoBackupEnabled(false);
      localStorage.setItem(UI_STORAGE_KEYS.AUTO_BACKUP_ENABLED, 'false');
      setCloudBackupMeta({
        uri: null,
        displayName: null,
        providerLabel: null,
        hasPersistedPermission: false,
        lastError: null,
      });
    } finally {
      setIsCloudBusy(false);
    }
  }, []);

  const syncCloudBackupNow = useCallback(async (): Promise<{ ok: boolean; message: string }> => {
    setIsCloudBusy(true);
    try {
      const res = await performSilentCloudWrite();
      if (res.ok) {
        haptics.thud();
        return { ok: true, message: 'Synced latest zero-backup.zbak to your storage backup file.' };
      }
      return { ok: false, message: res.error || 'Could not sync zero-backup.zbak.' };
    } finally {
      setIsCloudBusy(false);
    }
  }, [performSilentCloudWrite]);

  const oneTapCloudUpload = useCallback(async (): Promise<{
    ok: boolean;
    cancelled?: boolean;
    message: string;
  }> => {
    setIsCloudBusy(true);
    try {
      const payload = buildZbakStringRef.current();
      const res = await triggerOneTapCloudUpload(payload);
      if (res.ok) {
        const ts = res.timestamp || Date.now();
        setLastBackupTimestamp(ts);
        localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(ts));
        setCloudBackupMeta((prev) => ({ ...prev, lastError: null }));
        haptics.milestoneChime();
      }
      return { ok: res.ok, cancelled: res.cancelled, message: res.message };
    } finally {
      setIsCloudBusy(false);
    }
  }, []);

  const restoreBackupFromCloudPicker = useCallback(async (): Promise<{
    ok: boolean;
    cancelled?: boolean;
    message: string;
  }> => {
    const latestSecurity = readEnvironmentSecurityFromNative();
    setEnvironmentSecurity(latestSecurity);
    if (latestSecurity.restrictions.backupRestoreDisabled || latestSecurity.isCompromised) {
      return {
        ok: false,
        message:
          'Backup restore is disabled on rooted devices, custom test-keys ROMs, or debug emulators to protect ZERO integrity.',
      };
    }

    setIsCloudBusy(true);
    try {
      const pick = await pickCloudBackupFileContent();
      if (!pick.ok || !pick.data) {
        return {
          ok: false,
          cancelled: pick.cancelled,
          message: pick.message || 'Cloud backup file selection cancelled.',
        };
      }
      const imported = importData(pick.data);
      return { ok: imported.ok, message: imported.message };
    } finally {
      setIsCloudBusy(false);
    }
  }, [importData]);

  const cloudBackupStatus: CloudAutoBackupStatus = useMemo(
    () => ({
      supported:
        isNativeAndroidCloudPluginAvailable() ||
        (typeof window !== 'undefined' && 'showSaveFilePicker' in window),
      enabled: autoBackupEnabled,
      uri: cloudBackupMeta.uri,
      displayName: cloudBackupMeta.displayName,
      providerLabel: cloudBackupMeta.providerLabel,
      lastBackupTimestamp,
      hasPersistedPermission: cloudBackupMeta.hasPersistedPermission,
      lastError: cloudBackupMeta.lastError,
    }),
    [autoBackupEnabled, cloudBackupMeta, lastBackupTimestamp]
  );

  const weeklyBackupDue = useMemo(
    () =>
      IntegrityEngine.isWeeklyBackupDue(
        autoBackupEnabled,
        lastBackupTimestamp,
        weeklyCheckNowMs
      ),
    [autoBackupEnabled, lastBackupTimestamp, weeklyCheckNowMs]
  );

  const resetAllData = () => {
    void disableUniversalCloudAutoBackup();
    const emptyState = IntegrityEngine.resetProtectedState(true);
    integrityStateRef.current = emptyState;
    setIntegrityState(emptyState);

    Object.values(UI_STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
    const freshNow = Date.now();
    localStorage.setItem(UI_STORAGE_KEYS.ONBOARDING_COMPLETE, 'false');
    localStorage.setItem(UI_STORAGE_KEYS.AUTO_BACKUP_ENABLED, 'false');
    localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(freshNow));

    webStartPerfMsRef.current = null;
    setHasDismissedWelcomeModal(false);
    setOnboardingComplete(false);
    setAutoBackupEnabled(false);
    setLastBackupTimestamp(freshNow);
    setCloudBackupMeta({
      uri: null,
      displayName: null,
      providerLabel: null,
      hasPersistedPermission: false,
      lastError: null,
    });
    setProfile(null);
    setParachuteRewardEvent(null);
    setJustEarnedParachute(false);
    setSchedules(DEFAULT_SCHEDULES);
    setBags(DEFAULT_BAGS);
    setActiveBagIdState(DEFAULT_BAGS[0].id);
    setThemeState('amoled');
    setThemeConfigState(DEFAULT_THEME_CONFIG);
    setWidgetsConfigState(DEFAULT_WIDGETS_CONFIG);
    setTipSkipRemaining(0);
    tipSkipRemainingRef.current = 0;
    setPostSessionTipPrompt(null);
    setActiveLock(IDLE_LOCK);
    syncNativeLedger(0, 0, 0);
  };

  const dismissPostSessionTipPrompt = () => {
    setPostSessionTipPrompt(null);
  };

  const blockTipPromptForFiveSessions = () => {
    tipSkipRemainingRef.current = TIP_SNOOZE_SESSIONS;
    setTipSkipRemaining(TIP_SNOOZE_SESSIONS);
    localStorage.setItem(UI_STORAGE_KEYS.TIP_SKIP_REMAINING, String(TIP_SNOOZE_SESSIONS));
    setPostSessionTipPrompt(null);
  };

  const resetTipPromptBlock = () => {
    tipSkipRemainingRef.current = 0;
    setTipSkipRemaining(0);
    localStorage.setItem(UI_STORAGE_KEYS.TIP_SKIP_REMAINING, '0');
  };

  // NOTE: Notice ZERO direct setters for focus stats, Escape Tickets, or donor badges are exported!
  return {
    theme,
    setTheme,
    themeConfig,
    setThemeConfig,
    widgetsConfig,
    setWidgetsConfig,
    sleepFarmingMode,
    setSleepFarmingMode,
    profile,
    isZeroSupporter,
    badgeSummary,
    currentStreak,
    hasClaimedFirstTimeParachute,
    hasClaimedFirstDonationParachute,
    hasDismissedWelcomeModal,
    onboardingComplete,
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
    appBuildInfo,
    environmentSecurity,
    refreshPermissions,
    preLockAlert,
    postSessionTipPrompt,
    tipSkipRemaining,
    dismissPostSessionTipPrompt,
    blockTipPromptForFiveSessions,
    resetTipPromptBlock,
    igniteSession,
    deployParachute,
    toggleSchedule,
    addSchedule,
    deleteSchedule,
    triggerTestWarning,
    buildBackupJson,
    buildZbakString,
    exportData,
    exportZbakData,
    importData,
    resetAllData,
    autoBackupEnabled,
    lastBackupTimestamp,
    cloudBackupStatus,
    weeklyBackupDue,
    isCloudBusy,
    enableCloudAutoBackup,
    disableCloudAutoBackup,
    syncCloudBackupNow,
    oneTapCloudUpload,
    restoreBackupFromCloudPicker,
    FIRST_DONATION_BONUS_INR,
  };
}
