export type SessionTag = 'Deep Work' | 'Study' | 'Family' | 'Sleep' | 'Detox' | string;

export type SessionStatus = 'completed' | 'parachuted' | 'active';

export type SleepFarmingMode = 'quarter_credit' | 'daytime_only' | 'full_credit';

export interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number; // Raw time device was locked
  earnedParachuteSeconds: number; // Weighted seconds credited towards 20h Parachute (0 if parachuted or daytime-only sleep)
  weightMultiplier: number; // 1.0, 0.25, or 0.0
  tag: SessionTag;
  status: SessionStatus;
  dateStr: string; // YYYY-MM-DD
}

export type ParachuteLedgerType = 'EARNED' | 'DEPLOYED';

export interface ParachuteLedgerEntry {
  id: string;
  timestamp: number;
  type: ParachuteLedgerType;
  description: string;
  delta: number; // +1 or -1
  tag?: SessionTag;
  note?: string;
}

export type ProfileAvatarId = 'monk' | 'void' | 'shield' | 'bolt' | 'owl' | 'flame';

export type ProfileAccent = 'amber' | 'emerald' | 'white' | 'cyan';

export interface ZeroProfile {
  displayName: string;
  handle: string;
  avatarId: ProfileAvatarId;
  accentColor: ProfileAccent;
  primaryMission: string;
  dailyGoalHours: number;
  motto: string;
  createdAt: number;
  updatedAt: number;
}

export interface ParachuteRewardEvent {
  id: string;
  source: 'first_timer_profile' | 'first_donation_50' | 'milestone_20h';
  delta: number;
  newBalance: number;
  title: string;
  subtitle: string;
}

export interface ParachuteMetrics {
  totalCumulativeSeconds: number; // Cumulative weighted seconds toward parachutes
  totalCumulativeHours: number;
  totalReclaimedHours: number; // Actual hours spent phone-free
  lifetimeEarnedParachutes: number;
  bonusParachutes: number;
  deployedParachutes: number;
  currentBalance: number;
  currentProgressSeconds: number;
  currentProgressHours: number;
  hoursUntilNextParachute: number;
  progressPercentage: number;
  sleepFarmingMode: SleepFarmingMode;
}

export interface RecurringSchedule {
  id: string;
  name: string;
  days: number[]; // 0 = Sun, 1 = Mon, ..., 6 = Sat
  startTime: string; // "09:00"
  endTime: string; // "12:00"
  tag: SessionTag;
  isEnabled: boolean;
  preLockWarningMinutes: number; // 5
}

export interface ActiveLockSession {
  isLocked: boolean;
  tag: SessionTag;
  startTime: number;
  targetEndTime: number;
  durationSeconds: number;
  elapsedSeconds: number;
  remainingSeconds: number;
}

export interface VerifiedNativeCompletionEvent {
  eventId: string;
  sessionId: string;
  tag: SessionTag;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  elapsedMonotonicMs: number;
  usedRebootFallback: boolean;
  monotonicSource: string;
  strictAccessibilityActive: boolean;
  proofDigest: string;
}

export interface NativeStateSnapshot {
  isLocked: boolean;
  sessionId?: string;
  sessionTag?: string;
  startTime?: number;
  targetEndTime?: number;
  durationSeconds?: number;
  elapsedSeconds?: number;
  remainingSeconds?: number;
  elapsedMonotonicMs?: number;
  monotonicNowMs?: number;
  monotonicSource?: string;
  cumulativeSeconds: number;
  deployedCount: number;
  bonusCount?: number;
  strictAccessibilityEnabled?: boolean;
  pendingCompletions?: VerifiedNativeCompletionEvent[];
}

export interface BagApp {
  packageName: string;
  appName: string;
  category?: 'calls' | 'messages' | 'custom';
}

export interface OccasionBag {
  id: string;
  name: string;
  occasionLabel: string;
  apps: BagApp[]; // Strictly capped at 3 custom apps
  allowCalls: boolean;
  allowSms: boolean;
}

export type RestrictedSettingsStatus = 'allowed' | 'blocked' | 'check_app_info';

export interface NativePermissionStatus {
  isNativeAndroid: boolean;
  isStrictAccessibilityBuild: boolean;
  isAccessibilityEnabled: boolean;
  hasOverlayPermission: boolean;
  hasUsageStatsPermission: boolean;
  hasNotificationPermission: boolean;
  hasRestrictedSettingsAllowed?: boolean;
  restrictedSettingsStatus?: RestrictedSettingsStatus;
  isDeviceOwner: boolean;
  strictReady: boolean;
}

export interface NativeAppBuildInfo {
  packageName: string;
  versionName: string;
  versionCode: number;
  edition: 'standard' | 'strict';
  signingSha256: string;
  isOfficialReleaseKey: boolean;
  installerPackageName?: string;
}

export interface ZeroBackupPayload {
  schemaVersion: number;
  appName: 'Zero';
  exportedAt: string;
  cumulativeSeconds: number;
  totalReclaimedSeconds: number;
  usedParachutes: number;
  bonusParachutes?: number;
  hasClaimedFirstTimeParachute?: boolean;
  hasClaimedFirstDonationParachute?: boolean;
  profile?: ZeroProfile | null;
  sleepFarmingMode: SleepFarmingMode;
  ledger: ParachuteLedgerEntry[];
  sessions: SessionRecord[];
  schedules: RecurringSchedule[];
  bags: OccasionBag[];
  activeBagId: string;
  theme: ThemeStyle;
  themeConfig?: ThemeConfig;
  onboardingComplete?: boolean;
}

export interface ZeroZbakPayload {
  schema: 'zero.zbak.v1';
  appName: 'Zero';
  exportedAt: string;
  exportedAtMs: number;
  onboardingComplete: true;
  // Focus Statistics
  cumulativeSeconds: number;
  totalReclaimedSeconds: number;
  totalCompletedSessions: number;
  currentStreak: number;
  // Escape Tickets & Anti-Cheat Balances
  usedParachutes: number;
  bonusParachutes: number;
  remainingEscapeTickets: number;
  hasClaimedFirstTimeParachute: boolean;
  // Donor Badges & Status
  hasClaimedFirstDonationParachute: boolean;
  isZeroSupporter: boolean;
  unlockedBadgeIds: string[];
  // Preset Bags, Schedules, Theme & Profile
  bags: OccasionBag[];
  activeBagId: string;
  schedules: RecurringSchedule[];
  sleepFarmingMode: SleepFarmingMode;
  theme: ThemeStyle;
  themeConfig: ThemeConfig;
  profile: ZeroProfile | null;
  // Full Compact Logs for Exact Heatmap / Analytics Restoration
  sessions: SessionRecord[];
  ledger: ParachuteLedgerEntry[];
}

export interface CloudAutoBackupStatus {
  supported: boolean;
  enabled: boolean;
  uri: string | null;
  displayName: string | null;
  providerLabel: string | null;
  lastBackupTimestamp: number;
  hasPersistedPermission: boolean;
  lastError?: string | null;
}

export type ThemeFamily = 'amoled' | 'kindle' | 'matte';

export type AmoledGradientId =
  | 'pure'
  | 'ember'
  | 'aurora'
  | 'cosmic'
  | 'crimson'
  | 'cobalt';

export type KindlePaperPresetId = 'classic' | 'warm' | 'sage' | 'slate' | 'blush' | 'custom';

export type MatteStudioPresetId =
  | 'graphite'
  | 'taupe'
  | 'nordic'
  | 'olive'
  | 'espresso'
  | 'custom';

export interface ThemeConfig {
  family: ThemeFamily;
  amoledGradient: AmoledGradientId;
  kindlePreset: KindlePaperPresetId;
  kindlePaperColor: string;
  kindleInkAccent: string;
  mattePreset: MatteStudioPresetId;
  matteBaseColor: string;
  matteAccentColor: string;
}

export type ThemeStyle = 'amoled' | 'kindle' | 'matte' | 'monochrome' | 'oled' | 'amber' | 'emerald';

export interface ZeroNativeBridgeInterface {
  isStrictAccessibilityBuild(): boolean;
  isDeviceOwner(): boolean;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  hasUsageStatsPermission(): boolean;
  requestUsageStatsPermission(): void;
  hasNotificationPermission(): boolean;
  requestNotificationPermission(): void;
  isAccessibilityEnabled(): boolean;
  openAccessibilitySettings(): void;
  openAppSettingsDetails(): void;
  getRestrictedSettingsStatus?(): RestrictedSettingsStatus;
  hasRestrictedSettingsAllowed?(): boolean;
  getPermissionStatusJson(): string;
  getAppBuildInfoJson?(): string;
  requestNextMissingPermission(): void;
  getInstalledAppsJson(): string;
  setBagStateJson(bagName: StringOrStr, appsJson: string, allowCalls: boolean, allowSms: boolean): void;
  getBagStateJson(): string;
  shareImageBase64(base64Png: string, fileName: string, caption: string): void;
  exportBackupJson(jsonContent: string, fileName: string): void;
  openExternalUrl?(url: string): void;
  startLockTaskMode(): void;
  stopLockTaskMode(): void;
  syncLedgerState(cumulativeSeconds: number, deployedCount: IntOrNum): void;
  syncLedgerStateWithBonus?(cumulativeSeconds: number, deployedCount: IntOrNum, bonusCount: IntOrNum): void;
  igniteSession(durationSeconds: number, tag: string): boolean;
  deployParachute(): boolean;
  getBatteryPercentage(): number;
  getNativeStateJson(): string;
  acknowledgeVerifiedCompletions?(eventIdsJson: string): void;
}

type StringOrStr = string;
type IntOrNum = number;

declare global {
  interface Window {
    ZeroNative?: ZeroNativeBridgeInterface;
  }
}
