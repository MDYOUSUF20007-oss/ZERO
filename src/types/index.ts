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

export interface ParachuteMetrics {
  totalCumulativeSeconds: number; // Cumulative weighted seconds toward parachutes
  totalCumulativeHours: number;
  totalReclaimedHours: number; // Actual hours spent phone-free
  lifetimeEarnedParachutes: number;
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

export type ThemeStyle = 'monochrome' | 'oled' | 'amber' | 'emerald';

export interface ZeroNativeBridgeInterface {
  isStrictAccessibilityBuild(): boolean;
  isDeviceOwner(): boolean;
  hasOverlayPermission(): boolean;
  requestOverlayPermission(): void;
  isAccessibilityEnabled(): boolean;
  openAccessibilitySettings(): void;
  startLockTaskMode(): void;
  stopLockTaskMode(): void;
  syncLedgerState(cumulativeSeconds: number, deployedCount: number): void;
  igniteSession(durationSeconds: number, tag: string): void;
  deployParachute(): boolean;
  getBatteryPercentage(): number;
  getNativeStateJson(): string;
}

declare global {
  interface Window {
    ZeroNative?: ZeroNativeBridgeInterface;
  }
}
