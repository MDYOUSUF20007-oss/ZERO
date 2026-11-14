export type SessionTag = 'Deep Work' | 'Study' | 'Family' | 'Sleep' | 'Detox' | string;

export type SessionStatus = 'completed' | 'parachuted' | 'active';

export type SleepFarmingMode = 'quarter_credit' | 'daytime_only' | 'full_credit';

export interface SessionRecord {
  id: string;
  startTime: number;
  endTime: number;
  durationSeconds: number; // Raw time device was locked
  earnedParachuteSeconds: number; // Weighted seconds credited towards 35h Parachute (0 if parachuted or daytime-only sleep)
  weightMultiplier: number; // 1.0, 0.25, or 0.0
  tag: SessionTag;
  status: SessionStatus;
  dateStr: string; // YYYY-MM-DD
  reflectionNote?: string;
  flowRating?: 'deep_flow' | 'steady' | 'challenging';
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
  source: 'first_timer_profile' | 'first_donation_50' | 'milestone_20h' | 'milestone_35h';
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
  burnTheBoats?: boolean;
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

export type AppAccessMode = 'hard_block' | 'controlled' | 'unrestricted';

export type ShortVideoAction = 'overlay' | 'back_action';

export interface AppLockRuleConfig {
  mode: AppAccessMode;
  quotaSeconds: number;
  maxContinuousSeconds: number;
  cooldownSeconds: number;
  frictionEnabled: boolean;
  frictionDelaySeconds: number;
  showBreathingCircle: boolean;
  requireIntentText: boolean;
  minIntentChars: number;
  reEntryGraceSeconds: number;
  blockShortVideos: boolean;
  shortVideoAction: ShortVideoAction;
  scrollVelocityLimit: number;
  nudgeIntervalSeconds: number;
}

export interface EngageSessionPayload {
  bagId: string;
  bagName: string;
  masterTimerSeconds: number;
  allowSms: boolean;
  compulsoryPackages: string[];
  appConfigs: Record<string, AppLockRuleConfig>;
}

export interface BagApp {
  packageName: string;
  appName: string;
  category?: 'calls' | 'messages' | 'assistant' | 'custom';
  iconBgColor?: string;
  ruleConfig?: AppLockRuleConfig;
}

export interface OccasionBag {
  id: string;
  name: string;
  occasionLabel: string;
  apps: BagApp[];
  allowCalls: boolean;
  allowSms: boolean;
  isCustom?: boolean;
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

export interface NativeEnvironmentSecurity {
  isSignatureValid: boolean;
  isRooted: boolean;
  isEmulator: boolean;
  isCompromised: boolean;
  restrictions: {
    backupRestoreDisabled: boolean;
    presetBagEditingDisabled: boolean;
  };
  reasons: string[];
}

export type LaunchModePreset = 'recommended' | 'full_productive' | 'explore';
export type FrictionLevel = 'gentle' | 'moderate' | 'ironclad';

export interface HabitCalibrationProfile {
  primaryGoal: string;
  distractionTriggers: string[];
  distractionApps: string[];
  frictionLevel: FrictionLevel;
  vulnerabilityWindow: string;
  dailyReclaimTargetHours: number;
  launchMode: LaunchModePreset;
  calibratedAt: number;
}

export interface ThemeModConfig {
  id: string;
  name: string;
  description: string;
  author: string;
  version: string;
  family: ThemeFamily;
  amoledGradient?: AmoledGradientId;
  baseColor?: string;
  accentColor?: string;
  paperColor?: string;
  inkAccent?: string;
  cssVars?: Record<string, string>;
}

export interface GithubContributor {
  login: string;
  avatar_url: string;
  html_url: string;
  contributions: number;
  role?: string;
}

export interface AppUpdateReleaseInfo {
  latestVersion: string;
  currentVersion: string;
  releaseNotes: string;
  apkDownloadUrl: string | null;
  htmlUrl: string;
  hasUpdate: boolean;
  publishedAt: string;
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
  habitCalibration?: HabitCalibrationProfile | null;
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
  habitCalibration?: HabitCalibrationProfile | null;
  // Full Compact Logs for Exact Heatmap / Analytics Restoration
  sessions: SessionRecord[];
  ledger: ParachuteLedgerEntry[];
}

export type CloudReminderInterval = 'weekly' | 'monthly' | 'off';

export interface CloudAutoBackupStatus {
  supported: boolean;
  enabled: boolean;
  uri: string | null;
  displayName: string | null;
  providerLabel: string | null;
  lastBackupTimestamp: number;
  lastCloudUploadTimestamp?: number;
  reminderInterval?: CloudReminderInterval;
  hasPersistedPermission: boolean;
  lastError?: string | null;
}

export type AppTheme = 'onyx' | 'fintech' | 'fluent';

export type ThemeFamily = 'amoled' | 'kindle' | 'matte';

export type EngineType = 'classic' | 'classic-v2' | 'material-you' | 'fluent' | 'minimalist' | 'trantor' | 'onyx' | 'fintech';
export type ClassicPreset = 'amoled' | 'paper-kindle' | 'matte-studio';
export type ClassicV2Surface = 'obsidian' | 'pitch-black' | 'carbon';
export type ClassicV2Accent = '#FFAA00' | '#FF7700' | '#FFD000' | '#FF9500' | '#10B981';
export type TrantorSurface = 'matte' | 'pitch-black' | 'graphite';
export type TrantorAccent = '#A3E4D7' | '#6EE7B7' | '#5EEAD4' | '#93C5FD' | '#FDE047';
export type M3Palette = 'deep-purple' | 'cyber-cyan' | 'neon-emerald' | 'crimson-pulse';

export type InterfaceStyle =
  | 'classic'
  | 'classic-v2'
  | 'material-you'
  | 'fluent'
  | 'minimalist'
  | 'bespoke'
  | 'fluent_glass'
  | 'trantor'
  | 'onyx'
  | 'fintech'
  | 'amoled'
  | 'material'
  | 'minimal';

export type MaterialYouSeed = 'purple' | 'cyan' | 'emerald' | 'crimson';

export type AmoledGradientId =
  | 'pure'
  | 'ember'
  | 'aurora'
  | 'cosmic'
  | 'crimson'
  | 'cobalt'
  | 'solar_gold'
  | 'jade_matrix'
  | 'indigo_abyss'
  | 'rose_quartz'
  | 'arctic_teal'
  | 'bronze_dusk'
  | 'vermilion_heat'
  | 'graphite_silver';

export type KindlePaperPresetId =
  | 'classic'
  | 'warm'
  | 'sage'
  | 'slate'
  | 'blush'
  | 'parchment'
  | 'matcha'
  | 'cobalt_ink'
  | 'plum_ink'
  | 'charcoal_ink'
  | 'custom';

export type MatteStudioPresetId =
  | 'graphite'
  | 'taupe'
  | 'nordic'
  | 'olive'
  | 'espresso'
  | 'obsidian_gold'
  | 'steel_blue'
  | 'terracotta'
  | 'amethyst'
  | 'alpine_mint'
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

export type HeatmapTimeframe = 'daily' | 'weekly' | 'monthly' | 'merged_all';

export type InsightWidgetId =
  | 'overview_kpis'
  | 'discipline_heatmap'
  | 'badges'
  | 'tag_breakdown';

export interface DashboardWidgetsConfig {
  visible: Record<InsightWidgetId, boolean>;
  order: InsightWidgetId[];
  defaultTimeframe: HeatmapTimeframe;
  syncOverviewWithTimeframe: boolean;
  showDialWidget: boolean;
}

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
  getEnvironmentSecurityJson?(): string;
  requestNextMissingPermission(): void;
  getInstalledAppsJson(): string;
  setBagStateJson(bagName: StringOrStr, appsJson: string, allowCalls: boolean, allowSms: boolean): void;
  setBagStateWithIdJson?(bagId: string, bagName: string, appsJson: string, allowCalls: boolean, allowSms: boolean): void;
  getBagStateJson(): string;
  shareImageBase64(base64Png: string, fileName: string, caption: string): void;
  saveImageToGallery?(base64Png: string, fileName: string): void;
  exportBackupJson(jsonContent: string, fileName: string): void;
  openExternalUrl?(url: string): void;
  startLockTaskMode(): void;
  stopLockTaskMode(): void;
  syncLedgerState(cumulativeSeconds: number, deployedCount: IntOrNum): void;
  syncLedgerStateWithBonus?(cumulativeSeconds: number, deployedCount: IntOrNum, bonusCount: IntOrNum): void;
  igniteSession(durationSeconds: number, tag: string): boolean;
  startEngageSessionJson?(payloadJson: string): boolean;
  stopEngageSession?(): void;
  getEngageSessionStateJson?(): string;
  deployParachute(): boolean;
  getBatteryPercentage(): number;
  getNativeStateJson(): string;
  acknowledgeVerifiedCompletions?(eventIdsJson: string): void;
  setActiveThemeAccent?(accentHex: string, accentRgb: string, badgeTextHex: string): void;
  setInterfaceStyle?(style: InterfaceStyle): void;
  setRoutinesJson?(routinesJson: string): void;
  syncRoutinesToNative?(routinesJson: string): void;
  verifyAuthorIntegrity?(): boolean;
  exitApp?(): void;
}

type StringOrStr = string;
type IntOrNum = number;

declare global {
  interface Window {
    ZeroNative?: ZeroNativeBridgeInterface;
  }
}
