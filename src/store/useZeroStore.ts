import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  IntegrityEngine,
  SECONDS_PER_PARACHUTE,
  type ProtectedIntegrityState,
} from '../core/integrity/IntegrityEngine';
import type {
  AppLockRuleConfig,
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
  CloudReminderInterval,
  ThemeConfig,
  InterfaceStyle,
  MaterialYouSeed,
  DashboardWidgetsConfig,
  HabitCalibrationProfile,
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
  getRelativeLuminance,
  mixHexColors,
  normalizeInterfaceStyle,
  normalizeEngineType,
  seedToM3Palette,
  familyToClassicPreset,
  resolveActiveAccentTokens,
  sanitizeThemeConfig,
} from '../utils/themes';
import { normalizeCustomHashtag } from '../utils/bagLayout';
import {
  buildEngageSessionPayload,
  getAllowedBagAppsForNative,
  isCompulsoryDialerPackage,
  isProtectedSystemPackage,
  sanitizeAppRuleConfig,
  sanitizeBagApp,
  sanitizeOccasionBag,
} from '../utils/bagAppConfig';
import {
  startNativeEngageSession,
  stopNativeEngageSession,
} from '../plugins/zeroEngage';
import {
  DEFAULT_WIDGETS_CONFIG,
  sanitizeWidgetsConfig,
} from '../utils/heatmapAnalytics';
import {
  disableUniversalCloudAutoBackup,
  enableUniversalCloudAutoBackup,
  fetchUniversalCloudAutoBackupStatus,
  isNativeAndroidCloudPluginAvailable,
  oneTapSaveZbakToStorage,
  pickCloudBackupFileContent,
  syncCloudReminderSchedule,
  triggerOneTapCloudUpload,
  writeUniversalCloudAutoBackup,
} from '../plugins/cloudAutoBackup';

export { SECONDS_PER_PARACHUTE };

// Strictly UI preferences & non-protected local cache keys.
// Protected stats, donor status, Escape Tickets, sessions, and ledger live inside IntegrityEngine.
const UI_STORAGE_KEYS = {
  ACTIVE_LOCK: 'zero_active_lock_v3',
  PROFILE: 'zero_user_profile_v1',
  DISMISSED_WELCOME_MODAL: 'zero_dismissed_welcome_modal_v1',
  ONBOARDING_COMPLETE: 'onboardingComplete',
  AUTO_BACKUP_ENABLED: 'autoBackupEnabled',
  LAST_BACKUP_TIMESTAMP: 'lastBackupTimestamp',
  LAST_CLOUD_UPLOAD_TIMESTAMP: 'zero_last_cloud_upload_ts_v1',
  CLOUD_REMINDER_INTERVAL: 'zero_cloud_reminder_interval_v1',
  CLOUD_BACKUP_META: 'zero_cloud_backup_meta_v1',
  SCHEDULES: 'zero_recurring_schedules_v3',
  BAGS: 'zero_occasion_bags_v4',
  ACTIVE_BAG_ID: 'zero_active_bag_id_v4',
  THEME: 'zero_active_theme_v3',
  THEME_CONFIG: 'zero_theme_config_v1',
  INTERFACE_STYLE: 'zero_interface_style_v1',
  MATERIAL_YOU_SEED: 'zero_material_you_seed_v1',
  MATERIAL_YOU_AMOLED: 'zero_material_you_amoled_v1',
  CLASSIC_DEFAULT_MIGRATED: 'zero_classic_default_migrated_v1',
  SLEEP_FARMING_MODE: 'zero_sleep_farming_mode_v3',
  TIP_SKIP_REMAINING: 'zero_tip_skip_remaining_v1',
  WIDGET_CONFIG: 'zero_widgets_config_v1',
  CUSTOM_HASHTAGS: 'zero_custom_hashtags_v1',
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

  const [interfaceStyle, setInterfaceStyleState] = useState<InterfaceStyle>(() => {
    try {
      const migrated = localStorage.getItem(UI_STORAGE_KEYS.CLASSIC_DEFAULT_MIGRATED) === '1';
      if (!migrated) {
        localStorage.setItem(UI_STORAGE_KEYS.CLASSIC_DEFAULT_MIGRATED, '1');
        localStorage.setItem(UI_STORAGE_KEYS.INTERFACE_STYLE, 'classic');
        return 'classic';
      }
      return normalizeInterfaceStyle(localStorage.getItem(UI_STORAGE_KEYS.INTERFACE_STYLE));
    } catch {
      return 'classic';
    }
  });
  const interfaceStyleRef = useRef<InterfaceStyle>(interfaceStyle);
  useEffect(() => {
    interfaceStyleRef.current = interfaceStyle;
  }, [interfaceStyle]);

  const setInterfaceStyle = useCallback((nextStyle: InterfaceStyle) => {
    setInterfaceStyleState(normalizeInterfaceStyle(nextStyle));
  }, []);

  const [materialYouSeed, setMaterialYouSeedState] = useState<MaterialYouSeed>(() => {
    const saved = localStorage.getItem(UI_STORAGE_KEYS.MATERIAL_YOU_SEED);
    return saved === 'cyan' || saved === 'emerald' || saved === 'crimson' ? saved : 'purple';
  });

  const setMaterialYouSeed = useCallback((nextSeed: MaterialYouSeed) => {
    const validSeed =
      nextSeed === 'cyan' || nextSeed === 'emerald' || nextSeed === 'crimson' ? nextSeed : 'purple';
    setMaterialYouSeedState(validSeed);
    localStorage.setItem(UI_STORAGE_KEYS.MATERIAL_YOU_SEED, validSeed);
  }, []);

  const [materialYouAmoled, setMaterialYouAmoledState] = useState<boolean>(() => {
    return localStorage.getItem(UI_STORAGE_KEYS.MATERIAL_YOU_AMOLED) === 'true';
  });

  const setMaterialYouAmoled = useCallback((nextAmoled: boolean) => {
    setMaterialYouAmoledState(nextAmoled);
    localStorage.setItem(UI_STORAGE_KEYS.MATERIAL_YOU_AMOLED, String(nextAmoled));
  }, []);

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

  const [customHashtags, setCustomHashtags] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.CUSTOM_HASHTAGS);
      if (!saved) return [];
      const parsed = JSON.parse(saved) as unknown;
      if (!Array.isArray(parsed)) return [];
      const seen = new Set<string>();
      const out: string[] = [];
      for (const item of parsed) {
        const clean = normalizeCustomHashtag(typeof item === 'string' ? item : null);
        if (clean && !seen.has(clean.toLowerCase())) {
          seen.add(clean.toLowerCase());
          out.push(clean);
        }
      }
      return out.slice(0, 24);
    } catch {
      return [];
    }
  });

  const addCustomHashtag = useCallback((rawTag: string): string | null => {
    const clean = normalizeCustomHashtag(rawTag);
    if (!clean) return null;
    setCustomHashtags((prev) => {
      if (prev.some((t) => t.toLowerCase() === clean.toLowerCase())) {
        return prev;
      }
      return [...prev, clean].slice(-24);
    });
    return clean;
  }, []);

  const removeCustomHashtag = useCallback((targetTag: string) => {
    const targetLower = targetTag.trim().toLowerCase();
    setCustomHashtags((prev) => prev.filter((t) => t.toLowerCase() !== targetLower));
  }, []);

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

  const [cloudReminderInterval, setCloudReminderIntervalState] = useState<CloudReminderInterval>(
    () =>
      IntegrityEngine.sanitizeCloudReminderInterval(
        localStorage.getItem(UI_STORAGE_KEYS.CLOUD_REMINDER_INTERVAL)
      )
  );

  const [lastCloudUploadTimestamp, setLastCloudUploadTimestamp] = useState<number>(() => {
    const raw = localStorage.getItem(UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP);
    if (raw !== null && raw !== '') {
      const parsed = Number(raw);
      if (Number.isFinite(parsed) && parsed >= 0) return parsed;
    }
    const inheritedRaw = localStorage.getItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP);
    const inherited = Number(inheritedRaw);
    const initialCloudTs =
      inheritedRaw !== null && Number.isFinite(inherited) && inherited >= 0
        ? inherited
        : Date.now();
    localStorage.setItem(UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP, String(initialCloudTs));
    return initialCloudTs;
  });

  const [weeklyCheckNowMs, setWeeklyCheckNowMs] = useState<number>(() => Date.now());
  const setCloudReminderInterval = useCallback((next: CloudReminderInterval) => {
    const safe = IntegrityEngine.sanitizeCloudReminderInterval(next);
    setCloudReminderIntervalState(safe);
    localStorage.setItem(UI_STORAGE_KEYS.CLOUD_REMINDER_INTERVAL, safe);
    setWeeklyCheckNowMs(Date.now());
  }, []);

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

  // Default + Unlimited Custom Occasion Bags (with granular Phase 2 per-app rules; Phone Calls always ON)
  const [bags, setBags] = useState<OccasionBag[]>(() => {
    try {
      const saved = localStorage.getItem(UI_STORAGE_KEYS.BAGS);
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<OccasionBag>[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.slice(0, 100).map((b, idx) => sanitizeOccasionBag(b, idx));
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
    if (
      typeof nativeStatus.lastCloudUploadTimestamp === 'number' &&
      nativeStatus.lastCloudUploadTimestamp > 0
    ) {
      setLastCloudUploadTimestamp((prev) =>
        Math.max(prev, nativeStatus.lastCloudUploadTimestamp || 0)
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
      const activeHex = activeAccentTokensRef.current?.hex || '#FFFFFF';
      confetti({
        particleCount: 110,
        spread: 75,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', activeHex, '#E4E4E7'],
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
            stopNativeEngageSession();
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
        stopNativeEngageSession();
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
        stopNativeEngageSession();
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
            window.ZeroNative.setInterfaceStyle?.(interfaceStyleRef.current);
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
    localStorage.setItem(
      UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP,
      String(lastCloudUploadTimestamp)
    );
  }, [lastCloudUploadTimestamp]);

  useEffect(() => {
    localStorage.setItem(
      UI_STORAGE_KEYS.CLOUD_REMINDER_INTERVAL,
      cloudReminderInterval
    );
    void syncCloudReminderSchedule(cloudReminderInterval, lastCloudUploadTimestamp);
  }, [cloudReminderInterval, lastCloudUploadTimestamp]);

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
    localStorage.setItem(UI_STORAGE_KEYS.CUSTOM_HASHTAGS, JSON.stringify(customHashtags));
  }, [customHashtags]);

  useEffect(() => {
    localStorage.setItem(UI_STORAGE_KEYS.THEME_CONFIG, JSON.stringify(themeConfig));
    localStorage.setItem(UI_STORAGE_KEYS.INTERFACE_STYLE, interfaceStyle);
    const runtime = computeThemeRuntime(themeConfig);
    const rootEl = document.documentElement;
    const normalizedEngine = normalizeEngineType(interfaceStyle);
    rootEl.setAttribute('data-engine', normalizedEngine);
    rootEl.setAttribute('data-zero-style', normalizedEngine);

    if (normalizedEngine === 'classic') {
      rootEl.setAttribute('data-preset', familyToClassicPreset(themeConfig.family));
      rootEl.setAttribute('data-zero-theme', themeConfig.family);
    } else {
      rootEl.removeAttribute('data-preset');
    }

    if (normalizedEngine === 'material-you') {
      rootEl.setAttribute('data-m3-palette', seedToM3Palette(materialYouSeed));
      rootEl.setAttribute('data-theme', 'material-you');
      rootEl.setAttribute('data-seed', materialYouSeed);
    } else {
      rootEl.removeAttribute('data-m3-palette');
      rootEl.removeAttribute('data-theme');
      rootEl.removeAttribute('data-seed');
    }

    rootEl.setAttribute(
      'data-amoled',
      String(normalizedEngine === 'material-you' ? materialYouAmoled : (themeConfig.family === 'amoled'))
    );

    if (normalizedEngine === 'material-you') {
      rootEl.className = 'dark';
      rootEl.setAttribute('data-zero-theme', materialYouAmoled ? 'amoled' : 'custom');
      rootEl.setAttribute('data-zero-has-gradient', 'false');

      const seedColors: Record<MaterialYouSeed, { primary: string; onPrimary: string; bg: string }> = {
        purple: { primary: '#D0BCFF', onPrimary: '#381E72', bg: materialYouAmoled ? '#000000' : '#0E0E13' },
        cyan: { primary: '#66E3FF', onPrimary: '#003642', bg: materialYouAmoled ? '#000000' : '#0E0E13' },
        emerald: { primary: '#6DD58C', onPrimary: '#003919', bg: materialYouAmoled ? '#000000' : '#0E0E13' },
        crimson: { primary: '#FFB2BE', onPrimary: '#5F1124', bg: materialYouAmoled ? '#000000' : '#0E0E13' },
      };
      const curSeed = seedColors[materialYouSeed] || seedColors.purple;

      rootEl.style.setProperty('--zero-bg-primary', curSeed.bg);
      rootEl.style.setProperty('--zero-accent', curSeed.primary);
      rootEl.style.setProperty('--zero-dial-stroke', curSeed.primary);
      rootEl.style.setProperty('--accent-hex', curSeed.primary);

      try {
        window.ZeroNative?.setInterfaceStyle?.('classic');
        window.ZeroNative?.setActiveThemeAccent?.(
          curSeed.primary,
          '208, 188, 255',
          curSeed.onPrimary
        );
      } catch {
        // Ignore on web preview
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', curSeed.bg);
      }
      return;
    }

    if (normalizedEngine === 'minimalist') {
      const isLightPaper = runtime.mode === 'light';
      rootEl.className = isLightPaper ? 'light' : 'dark';
      rootEl.setAttribute('data-zero-theme', runtime.family);
      rootEl.setAttribute(
        'data-zero-has-gradient',
        runtime.family === 'amoled' && themeConfig.amoledGradient !== 'pure' ? 'true' : 'false'
      );

      Object.entries(runtime.cssVars).forEach(([cssVar, val]) => {
        rootEl.style.setProperty(cssVar, val);
      });

      const activeAccent = resolveActiveAccentTokens(themeConfig);
      rootEl.style.setProperty('--zero-accent', activeAccent.hex);
      rootEl.style.setProperty('--zero-dial-stroke', activeAccent.hex);
      rootEl.style.setProperty('--accent-rgb', activeAccent.rgb);
      rootEl.style.setProperty('--accent-hex', activeAccent.hex);
      rootEl.style.setProperty('--accent-badge-gradient', activeAccent.hex);
      rootEl.style.setProperty('--accent-badge-text', activeAccent.badgeText);
      rootEl.style.setProperty('--accent-surface-rgb', activeAccent.rgb);
      rootEl.style.setProperty('--accent-surface-hex', activeAccent.hex);
      rootEl.style.setProperty('--accent-surface-badge-gradient', activeAccent.hex);
      rootEl.style.setProperty('--accent-surface-badge-text', activeAccent.badgeText);

      activeAccentTokensRef.current = activeAccent;

      try {
        window.ZeroNative?.setInterfaceStyle?.('bespoke');
        window.ZeroNative?.setActiveThemeAccent?.(
          activeAccent.hex,
          activeAccent.rgb,
          activeAccent.badgeText
        );
      } catch {
        // Ignore on web preview
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', runtime.metaThemeColor || (isLightPaper ? '#F4F1EA' : '#000000'));
      }
      return;
    }

    if (normalizedEngine === 'fluent') {
      // Fluent Glass Pro 60FPS over true #000000 AMOLED canvas — dynamic Theme Studio accent integration
      rootEl.className = 'dark';
      rootEl.setAttribute('data-zero-theme', 'amoled');
      rootEl.setAttribute('data-zero-has-gradient', 'false');

      rootEl.style.setProperty('--zero-bg-primary', '#000000');
      rootEl.style.setProperty('--zero-bg-image', 'none');
      rootEl.style.setProperty('--zero-bg-size', '100% 100%');
      rootEl.style.setProperty('--zero-surface-1', 'rgba(14, 14, 20, 0.72)');
      rootEl.style.setProperty('--zero-surface-2', 'rgba(20, 20, 28, 0.78)');
      rootEl.style.setProperty('--zero-surface-3', 'rgba(30, 30, 42, 0.85)');
      rootEl.style.setProperty('--zero-border', 'rgba(255, 255, 255, 0.14)');
      rootEl.style.setProperty('--zero-border-subtle', 'rgba(255, 255, 255, 0.06)');
      rootEl.style.setProperty('--zero-ink-primary', '#FFFFFF');
      rootEl.style.setProperty('--zero-ink-secondary', '#E4E4E7');
      rootEl.style.setProperty('--zero-ink-muted', '#A1A1AA');
      rootEl.style.setProperty('--zero-inverted-bg', '#FFFFFF');
      rootEl.style.setProperty('--zero-inverted-text', '#07040d');
      rootEl.style.setProperty('--zero-nav-bg', 'rgba(10, 10, 16, 0.72)');
      rootEl.style.setProperty('--zero-backdrop', 'rgba(0, 0, 0, 0.75)');

      // Dynamic accent: inherit from the user's active Theme Studio selection
      const fluentTokens = resolveActiveAccentTokens(themeConfig);
      rootEl.style.setProperty('--zero-accent', fluentTokens.hex);
      rootEl.style.setProperty('--zero-dial-stroke', fluentTokens.hex);
      rootEl.style.setProperty('--accent-rgb', fluentTokens.rgb);
      rootEl.style.setProperty('--accent-hex', fluentTokens.hex);
      rootEl.style.setProperty(
        '--accent-badge-gradient',
        `linear-gradient(95deg, #FFFFFF 0%, color-mix(in srgb, ${fluentTokens.hex} 28%, #FFFFFF) 42%, ${fluentTokens.hex} 100%)`
      );
      rootEl.style.setProperty('--accent-badge-text', '#07040d');
      rootEl.style.setProperty('--accent-surface-rgb', fluentTokens.rgb);
      rootEl.style.setProperty('--accent-surface-hex', fluentTokens.hex);
      rootEl.style.setProperty(
        '--accent-surface-badge-gradient',
        `linear-gradient(95deg, #FFFFFF 0%, color-mix(in srgb, ${fluentTokens.hex} 28%, #FFFFFF) 42%, ${fluentTokens.hex} 100%)`
      );
      rootEl.style.setProperty('--accent-surface-badge-text', '#07040d');

      // Liquid Glass Pro dynamic tokens:
      rootEl.style.setProperty('--liquid-accent-vibrant', fluentTokens.hex);
      rootEl.style.setProperty(
        '--liquid-accent-tint',
        `color-mix(in srgb, ${fluentTokens.hex} 28%, #ffffff)`
      );
      rootEl.style.setProperty(
        '--liquid-accent-glow',
        `color-mix(in srgb, ${fluentTokens.hex} 50%, transparent)`
      );
      rootEl.style.setProperty(
        '--liquid-accent-soft-glow',
        `color-mix(in srgb, ${fluentTokens.hex} 22%, transparent)`
      );

      // Fluent Glass glass-tint surfaces respond to accent
      rootEl.style.setProperty('--fg-accent-tint-14', `rgba(${fluentTokens.rgb}, 0.14)`);
      rootEl.style.setProperty('--fg-accent-tint-10', `rgba(${fluentTokens.rgb}, 0.10)`);
      rootEl.style.setProperty('--fg-accent-tint-06', `rgba(${fluentTokens.rgb}, 0.06)`);
      rootEl.style.setProperty('--fg-accent-border-36', `rgba(${fluentTokens.rgb}, 0.36)`);
      rootEl.style.setProperty('--fg-accent-border-22', `rgba(${fluentTokens.rgb}, 0.22)`);
      rootEl.style.setProperty('--fg-accent-border-10', `rgba(${fluentTokens.rgb}, 0.10)`);
      rootEl.style.setProperty('--fg-accent-glow', `rgba(${fluentTokens.rgb}, 0.28)`);
      rootEl.style.setProperty('--fg-accent-pill-shadow', `rgba(${fluentTokens.rgb}, 0.50)`);

      activeAccentTokensRef.current = fluentTokens;

      try {
        window.ZeroNative?.setInterfaceStyle?.('fluent_glass');
        window.ZeroNative?.setActiveThemeAccent?.(
          fluentTokens.hex,
          fluentTokens.rgb,
          fluentTokens.badgeText
        );
      } catch {
        // Ignore on web preview
      }

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', '#000000');
      }
      return;
    }

    if (normalizedEngine === 'classic-v2') {
      rootEl.className = 'dark';
      rootEl.setAttribute('data-zero-theme', 'amoled');
      rootEl.setAttribute('data-zero-has-gradient', 'false');

      rootEl.style.setProperty('--zero-bg-primary', '#08080A');
      rootEl.style.setProperty('--zero-bg-image', 'none');
      rootEl.style.setProperty('--zero-surface-1', 'rgba(17, 17, 22, 0.85)');
      rootEl.style.setProperty('--zero-surface-2', 'rgba(24, 24, 32, 0.9)');
      rootEl.style.setProperty('--zero-surface-3', 'rgba(28, 28, 36, 0.95)');
      rootEl.style.setProperty('--zero-border', 'rgba(255, 255, 255, 0.08)');
      rootEl.style.setProperty('--zero-border-subtle', 'rgba(255, 255, 255, 0.05)');
      rootEl.style.setProperty('--zero-ink-primary', '#FFFFFF');
      rootEl.style.setProperty('--zero-ink-secondary', '#E4E4E7');
      rootEl.style.setProperty('--zero-ink-muted', '#8E8E93');
      rootEl.style.setProperty('--zero-accent', '#FFAA00');
      rootEl.style.setProperty('--zero-dial-stroke', '#FFAA00');
      rootEl.style.setProperty('--accent-hex', '#FFAA00');
      rootEl.style.setProperty('--accent-rgb', '255, 170, 0');
      rootEl.style.setProperty('--accent-badge-text', '#08080A');
      rootEl.style.setProperty('--accent-badge-gradient', 'linear-gradient(135deg, #FFAA00 0%, #FF8800 100%)');

      try {
        window.ZeroNative?.setInterfaceStyle?.('classic');
        window.ZeroNative?.setActiveThemeAccent?.(
          '#FFAA00',
          '255, 170, 0',
          '#08080A'
        );
      } catch {}

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', '#08080A');
      }
      return;
    }

    if (normalizedEngine === 'trantor') {
      rootEl.className = 'dark';
      rootEl.setAttribute('data-zero-theme', 'amoled');
      rootEl.setAttribute('data-zero-has-gradient', 'false');

      rootEl.style.setProperty('--bg-primary', '#07080A');
      rootEl.style.setProperty('--surface-card', '#121418');
      rootEl.style.setProperty('--surface-card-hover', '#1A1D24');
      rootEl.style.setProperty('--border-subtle', 'rgba(255, 255, 255, 0.06)');
      rootEl.style.setProperty('--accent-sage', '#A3E4D7');
      rootEl.style.setProperty('--accent-sage-text', '#0B0C10');
      rootEl.style.setProperty('--text-main', '#F3F4F6');
      rootEl.style.setProperty('--text-muted', '#9CA3AF');

      rootEl.style.setProperty('--zero-bg-primary', '#07080A');
      rootEl.style.setProperty('--zero-bg-image', 'none');
      rootEl.style.setProperty('--zero-surface-1', '#121418');
      rootEl.style.setProperty('--zero-surface-2', '#161920');
      rootEl.style.setProperty('--zero-surface-3', '#1A1D24');
      rootEl.style.setProperty('--zero-border', 'rgba(255, 255, 255, 0.06)');
      rootEl.style.setProperty('--zero-border-subtle', 'rgba(255, 255, 255, 0.04)');
      rootEl.style.setProperty('--zero-ink-primary', '#F3F4F6');
      rootEl.style.setProperty('--zero-ink-secondary', '#E5E7EB');
      rootEl.style.setProperty('--zero-ink-muted', '#9CA3AF');
      rootEl.style.setProperty('--zero-accent', '#A3E4D7');
      rootEl.style.setProperty('--zero-dial-stroke', '#A3E4D7');
      rootEl.style.setProperty('--accent-hex', '#A3E4D7');
      rootEl.style.setProperty('--accent-rgb', '163, 228, 215');
      rootEl.style.setProperty('--accent-badge-text', '#0B0C10');
      rootEl.style.setProperty('--accent-badge-gradient', '#A3E4D7');

      try {
        window.ZeroNative?.setInterfaceStyle?.('classic');
        window.ZeroNative?.setActiveThemeAccent?.(
          '#A3E4D7',
          '163, 228, 215',
          '#0B0C10'
        );
      } catch {}

      const metaTheme = document.querySelector('meta[name="theme-color"]');
      if (metaTheme) {
        metaTheme.setAttribute('content', '#07080A');
      }
      return;
    }

    rootEl.className = runtime.mode === 'light' ? 'light' : 'dark';
    rootEl.setAttribute('data-zero-theme', runtime.family);
    rootEl.setAttribute(
      'data-zero-has-gradient',
      String(themeConfig.family === 'amoled' && themeConfig.amoledGradient !== 'pure')
    );
    Object.entries(runtime.cssVars).forEach(([cssVar, val]) => {
      rootEl.style.setProperty(cssVar, val);
    });

    // Strictly derive global accent tokens (--accent-rgb, --accent-hex, --accent-badge-gradient,
    // --accent-badge-text) directly from Theme Studio so zero color mismatches can occur.
    const activeTokens = resolveActiveAccentTokens(themeConfig);
    const derived = computeDynamicAccentTokens(runtime.cssVars['--zero-accent'] || activeTokens.hex);
    const surfaceHex =
      getRelativeLuminance(derived.hex) < 0.28
        ? mixHexColors(derived.hex, '#FFFFFF', 0.56)
        : derived.hex;
    const surfaceTokens = computeDynamicAccentTokens(surfaceHex);
    activeAccentTokensRef.current = {
      hex: derived.hex,
      rgb: derived.rgb,
      badgeText: derived.badgeText,
    };

    rootEl.style.setProperty('--accent-rgb', derived.rgb);
    rootEl.style.setProperty('--accent-hex', derived.hex);
    rootEl.style.setProperty('--accent-badge-gradient', derived.badgeGradient);
    rootEl.style.setProperty('--accent-badge-text', derived.badgeText);
    rootEl.style.setProperty('--accent-surface-rgb', surfaceTokens.rgb);
    rootEl.style.setProperty('--accent-surface-hex', surfaceTokens.hex);
    rootEl.style.setProperty('--accent-surface-badge-gradient', surfaceTokens.badgeGradient);
    rootEl.style.setProperty('--accent-surface-badge-text', surfaceTokens.badgeText);

    // Keep Liquid Glass tokens synced in all modes
    rootEl.style.setProperty('--liquid-accent-vibrant', derived.hex);
    rootEl.style.setProperty(
      '--liquid-accent-tint',
      `color-mix(in srgb, ${derived.hex} 28%, #ffffff)`
    );
    rootEl.style.setProperty(
      '--liquid-accent-glow',
      `color-mix(in srgb, ${derived.hex} 50%, transparent)`
    );
    rootEl.style.setProperty(
      '--liquid-accent-soft-glow',
      `color-mix(in srgb, ${derived.hex} 22%, transparent)`
    );

    try {
      window.ZeroNative?.setInterfaceStyle?.('classic');
      window.ZeroNative?.setActiveThemeAccent?.(
        derived.hex,
        derived.rgb,
        derived.badgeText
      );
    } catch {
      // Ignore on web preview
    }

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) {
      metaTheme.setAttribute('content', runtime.metaThemeColor);
    }
  }, [themeConfig, interfaceStyle, materialYouSeed, materialYouAmoled]);

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
        const allowedApps = getAllowedBagAppsForNative(activeBag);
        const appsJson = JSON.stringify(allowedApps);
        if (window.ZeroNative.setBagStateWithIdJson) {
          window.ZeroNative.setBagStateWithIdJson(
            activeBag.id,
            activeBag.name,
            appsJson,
            true,
            activeBag.allowSms
          );
        } else {
          window.ZeroNative.setBagStateJson(
            activeBag.name,
            appsJson,
            true,
            activeBag.allowSms
          );
        }
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
        const allowedApps = getAllowedBagAppsForNative(activeBag);
        if (!latestSecurity.restrictions.presetBagEditingDisabled) {
          const appsJson = JSON.stringify(allowedApps);
          if (window.ZeroNative.setBagStateWithIdJson) {
            window.ZeroNative.setBagStateWithIdJson(
              activeBag.id,
              activeBag.name,
              appsJson,
              true,
              activeBag.allowSms
            );
          } else {
            window.ZeroNative.setBagStateJson(
              activeBag.name,
              appsJson,
              true,
              activeBag.allowSms
            );
          }
          const engagePayload = buildEngageSessionPayload({
            bag: activeBag,
            masterTimerSeconds: safeDuration,
            installedApps,
          });
          startNativeEngageSession(engagePayload);
        }
        syncNativeLedger(
          integrityStateRef.current.cumulativeSeconds,
          integrityStateRef.current.usedParachutes,
          integrityStateRef.current.bonusParachutes
        );
        const activeTokensNow = resolveActiveAccentTokens(themeConfig);
        window.ZeroNative.setInterfaceStyle?.(interfaceStyleRef.current);
        if (interfaceStyleRef.current === 'bespoke' || interfaceStyleRef.current === 'minimalist') {
          window.ZeroNative.setActiveThemeAccent?.('#3B82F6', '59, 130, 246', '#FFFFFF');
        } else {
          // fluent_glass and classic both pass the live Theme Studio accent to native
          window.ZeroNative.setActiveThemeAccent?.(
            activeTokensNow.hex,
            activeTokensNow.rgb,
            activeTokensNow.badgeText
          );
        }
        const started = window.ZeroNative.igniteSession(safeDuration, tag);
        if (started === false) {
          stopNativeEngageSession();
          refreshPermissions();
          return false;
        }
      } else if (latestPerms.isNativeAndroid) {
        return false;
      }
    } catch {
      stopNativeEngageSession();
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
      stopNativeEngageSession();
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
      prev.map((b, idx) => {
        if (b.id !== bagId) return b;
        const next = updater(b);
        return sanitizeOccasionBag(
          {
            ...next,
            allowCalls: true,
          },
          idx
        );
      })
    );
  };

  const toggleBagApp = (bagId: string, app: BagApp) => {
    if (isProtectedSystemPackage(app.packageName)) return;
    updateBag(bagId, (bag) => {
      const exists = bag.apps.some((a) => a.packageName === app.packageName);
      if (exists) {
        return { ...bag, apps: bag.apps.filter((a) => a.packageName !== app.packageName) };
      }
      const sanitized = sanitizeBagApp(app);
      if (!sanitized) return bag;
      return { ...bag, apps: [...bag.apps, sanitized] };
    });
  };

  const updateBagAppRule = (
    bagId: string,
    app: BagApp,
    ruleConfig: AppLockRuleConfig
  ): boolean => {
    if (activeLock.isLocked || environmentSecurity.restrictions.presetBagEditingDisabled) {
      return false;
    }
    if (isProtectedSystemPackage(app.packageName)) {
      return false;
    }
    const cleanRule = sanitizeAppRuleConfig(ruleConfig, {
      isCompulsory: isCompulsoryDialerPackage(app),
      defaultMode: 'controlled',
    });
    const cleanApp = sanitizeBagApp({ ...app, ruleConfig: cleanRule });
    if (!cleanApp) return false;

    updateBag(bagId, (bag) => {
      const idx = bag.apps.findIndex((a) => a.packageName === cleanApp.packageName);
      if (idx >= 0) {
        const updatedApps = bag.apps.map((a, i) => (i === idx ? cleanApp : a));
        return { ...bag, apps: updatedApps };
      }
      return { ...bag, apps: [...bag.apps, cleanApp] };
    });
    return true;
  };

  const createCustomBag = (name: string, occasionLabel?: string): OccasionBag | null => {
    if (activeLock.isLocked || environmentSecurity.restrictions.presetBagEditingDisabled) {
      return null;
    }
    const cleanName = name.trim().slice(0, 28);
    if (!cleanName) return null;
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 20);
    const id = `bag-${slug || 'custom'}-${Date.now().toString(36)}`;
    const newBag = sanitizeOccasionBag(
      {
        id,
        name: cleanName,
        occasionLabel: occasionLabel?.trim() || 'Custom Rules & Quotas',
        apps: [],
        allowCalls: true,
        allowSms: false,
        isCustom: true,
      },
      bags.length
    );
    setBags((prev) => [...prev.slice(0, 99), newBag]);
    setActiveBagIdState(newBag.id);
    return newBag;
  };

  const deleteCustomBag = (bagId: string): boolean => {
    if (activeLock.isLocked || environmentSecurity.restrictions.presetBagEditingDisabled) {
      return false;
    }
    const target = bags.find((b) => b.id === bagId);
    if (!target || !target.isCustom || bags.length <= 1) {
      return false;
    }
    const remaining = bags.filter((b) => b.id !== bagId);
    setBags(remaining);
    if (activeBagId === bagId && remaining[0]) {
      setActiveBagIdState(remaining[0].id);
    }
    return true;
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
      const nextBags = (outcome.bags || DEFAULT_BAGS).map((b, idx) =>
        sanitizeOccasionBag(
          {
            ...b,
            allowCalls: true,
          },
          idx
        )
      );
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
      setLastCloudUploadTimestamp(restoredNow);
      setWeeklyCheckNowMs(restoredNow);

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
      localStorage.setItem(UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP, String(restoredNow));

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

  const oneTapSaveBackup = useCallback(async (): Promise<{
    ok: boolean;
    message: string;
  }> => {
    setIsCloudBusy(true);
    try {
      const payload = buildZbakStringRef.current();
      const res = await oneTapSaveZbakToStorage(payload);
      if (res.ok) {
        const ts = res.timestamp || Date.now();
        setLastBackupTimestamp(ts);
        localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(ts));
        setCloudBackupMeta((prev) => ({ ...prev, lastError: null }));
        haptics.thud();
      }
      return { ok: res.ok, message: res.message };
    } finally {
      setIsCloudBusy(false);
    }
  }, []);

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
        const uploadTs = res.lastCloudUploadTimestamp || res.timestamp || Date.now();
        const backupTs = res.timestamp || uploadTs;
        setLastBackupTimestamp(backupTs);
        setLastCloudUploadTimestamp(uploadTs);
        setWeeklyCheckNowMs(uploadTs);
        localStorage.setItem(UI_STORAGE_KEYS.LAST_BACKUP_TIMESTAMP, String(backupTs));
        localStorage.setItem(UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP, String(uploadTs));
        setCloudBackupMeta((prev) => ({ ...prev, lastError: null }));
        void syncCloudReminderSchedule(cloudReminderInterval, uploadTs);
        haptics.milestoneChime();
      }
      return { ok: res.ok, cancelled: res.cancelled, message: res.message };
    } finally {
      setIsCloudBusy(false);
    }
  }, [cloudReminderInterval]);

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
      lastCloudUploadTimestamp,
      reminderInterval: cloudReminderInterval,
      hasPersistedPermission: cloudBackupMeta.hasPersistedPermission,
      lastError: cloudBackupMeta.lastError,
    }),
    [
      autoBackupEnabled,
      cloudBackupMeta,
      lastBackupTimestamp,
      lastCloudUploadTimestamp,
      cloudReminderInterval,
    ]
  );

  const nextCloudReminderInfo = useMemo(
    () =>
      IntegrityEngine.getNextCloudReminderInfo(
        cloudReminderInterval,
        lastCloudUploadTimestamp,
        weeklyCheckNowMs
      ),
    [cloudReminderInterval, lastCloudUploadTimestamp, weeklyCheckNowMs]
  );

  const weeklyBackupDue = nextCloudReminderInfo.isDue;

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
    localStorage.setItem(UI_STORAGE_KEYS.LAST_CLOUD_UPLOAD_TIMESTAMP, String(freshNow));
    localStorage.setItem(UI_STORAGE_KEYS.CLOUD_REMINDER_INTERVAL, 'weekly');

    webStartPerfMsRef.current = null;
    setHasDismissedWelcomeModal(false);
    setOnboardingComplete(false);
    setAutoBackupEnabled(false);
    setLastBackupTimestamp(freshNow);
    setLastCloudUploadTimestamp(freshNow);
    setCloudReminderIntervalState('weekly');
    setWeeklyCheckNowMs(freshNow);
    void syncCloudReminderSchedule('weekly', freshNow);
    setCloudBackupMeta({
      uri: null,
      displayName: null,
      providerLabel: null,
      hasPersistedPermission: false,
      lastError: null,
    });
    setProfile(null);
    setCustomHashtags([]);
    setParachuteRewardEvent(null);
    setJustEarnedParachute(false);
    setSchedules(DEFAULT_SCHEDULES);
    setBags(DEFAULT_BAGS);
    setActiveBagIdState(DEFAULT_BAGS[0].id);
    setThemeState('amoled');
    setThemeConfigState(DEFAULT_THEME_CONFIG);
    localStorage.setItem(UI_STORAGE_KEYS.CLASSIC_DEFAULT_MIGRATED, '1');
    setInterfaceStyleState('classic');
    localStorage.setItem(UI_STORAGE_KEYS.INTERFACE_STYLE, 'classic');
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

  const completeOnboarding = useCallback((options?: {
    schedules?: RecurringSchedule[];
    bags?: OccasionBag[];
    profile?: HabitCalibrationProfile;
  }) => {
    setOnboardingComplete(true);
    localStorage.setItem(UI_STORAGE_KEYS.ONBOARDING_COMPLETE, 'true');
    if (options?.schedules) {
      setSchedules(options.schedules);
      localStorage.setItem(UI_STORAGE_KEYS.SCHEDULES, JSON.stringify(options.schedules));
    }
    if (options?.bags) {
      setBags(options.bags);
      localStorage.setItem(UI_STORAGE_KEYS.BAGS, JSON.stringify(options.bags));
    }
  }, []);

  // NOTE: Notice ZERO direct setters for focus stats, Escape Tickets, or donor badges are exported!
  return {
    theme,
    setTheme,
    themeConfig,
    setThemeConfig,
    interfaceStyle,
    setInterfaceStyle,
    materialYouSeed,
    setMaterialYouSeed,
    materialYouAmoled,
    setMaterialYouAmoled,
    widgetsConfig,
    setWidgetsConfig,
    sleepFarmingMode,
    setSleepFarmingMode,
    profile,
    customHashtags,
    addCustomHashtag,
    removeCustomHashtag,
    isZeroSupporter,
    badgeSummary,
    currentStreak,
    hasClaimedFirstTimeParachute,
    hasClaimedFirstDonationParachute,
    hasDismissedWelcomeModal,
    onboardingComplete,
    setOnboardingComplete,
    completeOnboarding,
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
    updateBagAppRule,
    createCustomBag,
    deleteCustomBag,
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
    lastCloudUploadTimestamp,
    cloudReminderInterval,
    setCloudReminderInterval,
    nextCloudReminderInfo,
    cloudBackupStatus,
    weeklyBackupDue,
    isCloudBusy,
    enableCloudAutoBackup,
    disableCloudAutoBackup,
    syncCloudBackupNow,
    oneTapSaveBackup,
    oneTapCloudUpload,
    restoreBackupFromCloudPicker,
    FIRST_DONATION_BONUS_INR,
  };
}
