import React, { useState, useRef, useEffect } from 'react';
import { toDataURL as generateQrDataUrl } from 'qrcode';
import {
  FIRST_DONATION_BONUS_INR,
  KOFI_URL,
  RELEASES_URL,
  SOURCE_URL,
  UPI_ID,
  UPI_PAY_URL,
  UPI_FIFTY_RS_PAY_URL,
  copyTextSafely,
  handleOpenExternalUrl,
} from '../utils/supportLinks';
import type {
  RecurringSchedule,
  SessionTag,
  ThemeConfig,
  SleepFarmingMode,
  NativePermissionStatus,
  NativeAppBuildInfo,
  NativeEnvironmentSecurity,
  ZeroProfile,
  CloudAutoBackupStatus,
} from '../types';
import { evaluatePermissionPriority } from '../utils/permissionPriority';
import { RestrictedSettingsGuideCard } from './RestrictedSettingsGuideCard';
import { ACCENT_STYLES, ProfileAvatar } from './ProfileAvatar';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ThemeSelectorCard } from './ThemeSelectorCard';
import { DonorPerksBadgesCard } from './DonorPerksBadgesCard';
import {
  Plus,
  Trash2,
  Bell,
  Heart,
  Coffee,
  Copy,
  Check,
  Download,
  Upload,
  RotateCcw,
  ExternalLink,
  Palette,
  QrCode,
  Code2,
  Moon,
  Smartphone,
  Terminal,
  ShieldAlert,
  Gift,
  Sparkles,
  CheckCircle2,
  UserPlus,
  Cloud,
  CloudCog,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Loader2,
  Settings,
  KeyRound,
  ShieldCheck,
} from 'lucide-react';

interface SchedulesDonateViewProps {
  schedules: RecurringSchedule[];
  permissions: NativePermissionStatus;
  appBuildInfo?: NativeAppBuildInfo | null;
  environmentSecurity?: NativeEnvironmentSecurity;
  onRefreshPermissions: () => void;
  onToggleSchedule: (id: string) => void;
  onAddSchedule: (sched: Omit<RecurringSchedule, 'id'>) => void;
  onDeleteSchedule: (id: string) => void;
  onTriggerTestWarning: (scheduleName: string) => void;
  themeConfig: ThemeConfig;
  onThemeConfigChange: (next: ThemeConfig) => void;
  sectionOverride?: {
    section: 'schedules' | 'themes' | 'settings' | 'os_security' | 'support';
    key: number;
  } | null;
  sleepFarmingMode: SleepFarmingMode;
  onSleepFarmingModeChange: (mode: SleepFarmingMode) => void;
  onBuildBackupJson: () => string;
  onExportData: () => string;
  onImportData: (rawJson: string) => { ok: boolean; message: string };
  onResetData: () => void;
  cloudBackupStatus?: CloudAutoBackupStatus;
  isCloudBusy?: boolean;
  onEnableCloudAutoBackup?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onDisableCloudAutoBackup?: () => Promise<void>;
  onSyncCloudBackupNow?: () => Promise<{ ok: boolean; message: string }>;
  onOneTapCloudUpload?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onRestoreFromCloudPicker?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onRestoreSuccess?: () => void;
  tipSkipRemaining?: number;
  onResetTipPromptBlock?: () => void;
  profile?: ZeroProfile | null;
  isZeroSupporter?: boolean;
  remainingEscapeTickets?: number;
  hasClaimedFirstTimeParachute?: boolean;
  hasClaimedFirstDonationParachute?: boolean;
  onOpenProfileModal?: () => void;
  onClaimFirstDonationBonus?: () => boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TAGS: SessionTag[] = ['Deep Work', 'Study', 'Sleep', 'Detox', 'Family'];

export const SchedulesDonateView: React.FC<SchedulesDonateViewProps> = ({
  schedules,
  permissions,
  appBuildInfo = null,
  environmentSecurity,
  onRefreshPermissions,
  onToggleSchedule,
  onAddSchedule,
  onDeleteSchedule,
  onTriggerTestWarning,
  themeConfig,
  onThemeConfigChange,
  sectionOverride = null,
  sleepFarmingMode,
  onSleepFarmingModeChange,
  onBuildBackupJson,
  onExportData,
  onImportData,
  onResetData,
  cloudBackupStatus,
  isCloudBusy = false,
  onEnableCloudAutoBackup,
  onDisableCloudAutoBackup,
  onSyncCloudBackupNow,
  onOneTapCloudUpload,
  onRestoreFromCloudPicker,
  onRestoreSuccess,
  tipSkipRemaining = 0,
  onResetTipPromptBlock,
  profile = null,
  isZeroSupporter,
  remainingEscapeTickets = 0,
  hasClaimedFirstTimeParachute = false,
  hasClaimedFirstDonationParachute = false,
  onOpenProfileModal,
  onClaimFirstDonationBonus,
}) => {
  const [cloudNotice, setCloudNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const supporterBadgeUnlocked = Boolean(isZeroSupporter ?? hasClaimedFirstDonationParachute);
  const restoreDisabled = Boolean(environmentSecurity?.restrictions?.backupRestoreDisabled);
  const [activeSection, setActiveSection] = useState<'schedules' | 'themes' | 'settings' | 'os_security' | 'support'>(
    sectionOverride?.section || 'schedules'
  );
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (sectionOverride?.section) {
      setActiveSection(sectionOverride.section);
    }
  }, [sectionOverride?.key, sectionOverride?.section]);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUPIQR, setShowUPIQR] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState<string>('');
  const [confirmingDonationClaim, setConfirmingDonationClaim] = useState(false);
  const [showPasteRestore, setShowPasteRestore] = useState(false);
  const [pasteJsonInput, setPasteJsonInput] = useState('');
  const [backupNotice, setBackupNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!showUPIQR || upiQrUrl) return;
    let cancelled = false;
    generateQrDataUrl(UPI_PAY_URL, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setUpiQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [showUPIQR, upiQrUrl]);

  const hasNativeBridge = permissions.isNativeAndroid;
  const isStrictBuild = permissions.isStrictAccessibilityBuild;
  const hasOverlayPerm = permissions.hasOverlayPermission;
  const hasUsagePerm = permissions.hasUsageStatsPermission;
  const hasNotifPerm = permissions.hasNotificationPermission;
  const isDeviceOwner = permissions.isDeviceOwner;
  const isAccessibilityOn = permissions.isAccessibilityEnabled;
  const permissionPriority = evaluatePermissionPriority(permissions);

  // New Schedule Form State
  const [newName, setNewName] = useState('Afternoon Focus');
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('16:30');
  const [newTag, setNewTag] = useState<SessionTag>('Deep Work');

  const handleFileRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      const result = onImportData(content);
      setBackupNotice(result);
    };
    reader.onerror = () => {
      setBackupNotice({ ok: false, message: 'Failed to read selected backup file.' });
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handlePasteRestore = () => {
    const res = onImportData(pasteJsonInput);
    setBackupNotice(res);
    if (res.ok) {
      setPasteJsonInput('');
      setShowPasteRestore(false);
    }
  };

  const handleOpenExternal = (e: React.MouseEvent, url: string) => {
    handleOpenExternalUrl(e, url);
  };

  const handleCopy = async (text: string, id: string) => {
    await copyTextSafely(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newDays.length === 0) return;

    onAddSchedule({
      name: newName.trim(),
      days: newDays,
      startTime: newStartTime,
      endTime: newEndTime,
      tag: newTag,
      isEnabled: true,
      preLockWarningMinutes: 5,
    });

    setShowAddModal(false);
  };

  const toggleDaySelection = (dayIndex: number) => {
    if (newDays.includes(dayIndex)) {
      setNewDays(newDays.filter((d) => d !== dayIndex));
    } else {
      setNewDays([...newDays, dayIndex].sort());
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4 max-w-md mx-auto w-full select-none pb-24">
      {/* View Header */}
      <div>
        <h1 className="text-xl font-mono font-black tracking-tight text-white flex items-center gap-2">
          <span>THEMES, SETTINGS &amp; OS</span>
        </h1>
        <p className="text-xs font-mono text-zinc-400">
          Auto-Pilot Schedules, Theme Studio, Donor Perks &amp; Ethical Support
        </p>
      </div>

      {/* Sub-Nav Pill */}
      <div className="grid grid-cols-5 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl text-[10px] font-mono">
        <button
          onClick={() => setActiveSection('schedules')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'schedules'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveSection('themes')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'themes'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Themes
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'settings'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveSection('os_security')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'os_security'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          OS
        </button>
        <button
          onClick={() => setActiveSection('support')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'support'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Support
        </button>
      </div>

      {/* SECTION 0: THEME STUDIO (AMOLED + GRADIENTS, PAPER LIKE KINDLE, MATTE STUDIO) */}
      {activeSection === 'themes' && (
        <div className="space-y-4">
          <ThemeSelectorCard
            themeConfig={themeConfig}
            onChange={onThemeConfigChange}
          />
          <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-3.5 font-mono text-[11px] text-zinc-400 leading-relaxed">
            Pick between <strong className="text-zinc-200">AMOLED</strong> (pure black &amp; subtle
            gradients), <strong className="text-zinc-200">Paper like Kindle</strong> (E-Ink light
            mode with custom paper &amp; ink pickers), or{' '}
            <strong className="text-zinc-200">Matte Studio</strong> (charcoal studio finishes with
            custom surface &amp; accent colors). Changes save locally and export inside JSON backups.
          </div>
        </div>
      )}

      {/* SECTION 1: AUTO-PILOT RECURRING SCHEDULES */}
      {activeSection === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Recurring Schedules ({schedules.length})
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className={`bg-zinc-950 border rounded-2xl p-4 transition-all shadow-brutal ${
                  sched.isEnabled ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <span>{sched.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        #{sched.tag}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 mt-1">
                      {sched.startTime} – {sched.endTime}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => onToggleSchedule(sched.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative border ${
                      sched.isEnabled
                        ? 'bg-white border-white'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform transform ${
                        sched.isEnabled
                          ? 'translate-x-6 bg-black'
                          : 'translate-x-1 bg-zinc-600'
                      }`}
                    />
                  </button>
                </div>

                {/* Days of Week Pills */}
                <div className="flex gap-1 mt-3">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <span
                      key={day}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        sched.days.includes(idx)
                          ? 'bg-zinc-200 text-black font-bold'
                          : 'bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Footer: 5-min warning heads-up indicator & delete */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900 text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Bell size={12} className="text-amber-400" />
                    <span>5-min heads-up alert enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTriggerTestWarning(sched.name)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                      title="Simulates 5-minute pre-lock heads-up warning notification"
                    >
                      Test Warning
                    </button>
                    <button
                      onClick={() => onDeleteSchedule(sched.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: DISCIPLINE RULES & ANTI-SLEEP-FARMING */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          {/* ANTI-SLEEP-FARMING RULE CARD */}
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
                <Moon size={16} className="text-amber-400" />
                <span>ANTI-SLEEP-FARMING RULE</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Integrity
              </span>
            </div>

            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              If a user locks their phone for 8 hours every night while asleep, they could farm a free Emergency Escape Ticket every 2.5 nights without resisting waking temptation.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Select Escape Ticket Rate for #Sleep:
              </label>

              {/* Option 1: 0.25x Credit (Recommended) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('quarter_credit')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'quarter_credit'
                    ? 'border-amber-400 bg-amber-950/20 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-2 text-zinc-100">
                    <span>0.25x Sleep Ticket Credit</span>
                    <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-black uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    An 8-hour sleep session earns 2.0 hours towards the 20h Escape Ticket milestone. Keeps rewards meaningful.
                  </p>
                </div>
                {sleepFarmingMode === 'quarter_credit' && (
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}
              </button>

              {/* Option 2: Daytime Hours Only (0.0x Sleep) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('daytime_only')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'daytime_only'
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-100">Daytime Focus Only (0.0x Sleep Credit)</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Escape Tickets can only be earned during daytime waking hours. Sleep blocks still track total reclaimed time, but 0h toward Escape Tickets.
                  </p>
                </div>
                {sleepFarmingMode === 'daytime_only' && (
                  <Check size={16} className="text-white shrink-0 mt-0.5" />
                )}
              </button>

              {/* Option 3: Full Credit (1.0x) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('full_credit')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'full_credit'
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-100">Full 1.0x Credit (Relaxed)</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Every hour locked (day or night) counts 1:1 toward emergency escape tickets.
                  </p>
                </div>
                {sleepFarmingMode === 'full_credit' && (
                  <Check size={16} className="text-white shrink-0 mt-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* ABORTED SESSION PENALTY EXPLANATION */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <ShieldAlert size={14} className="text-red-400" />
              <span>Aborted Session Penalty (Anti-Exploit)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Using an Emergency Escape Ticket forfeits all accumulated hours in that specific broken session toward the 20-hour meter.
            </p>
            <div className="p-2.5 bg-zinc-900 rounded-xl text-[11px] text-zinc-300 border border-zinc-800">
              <strong>Example:</strong> If you set a 4-hour lock and use an escape ticket at hour 3, you spend 1 Escape Ticket and receive <strong>0 hours</strong> toward your next one. This prevents locking for 20 hours just to refund the ticket used to exit.
            </div>
          </div>

          {/* Interactive Profile Card */}
          {onOpenProfileModal && (
            <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl space-y-3 font-mono">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-zinc-200 font-bold uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus size={14} className="text-amber-400" />
                  <span>Interactive Zero Profile</span>
                </span>
                {!hasClaimedFirstTimeParachute && (
                  <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-amber-400 text-black">
                    +1 Free 🎫 Gift
                  </span>
                )}
              </div>

              {profile ? (
                <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-black border border-zinc-800">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <ProfileAvatar
                      avatarId={profile.avatarId}
                      accent={profile.accentColor}
                      size="sm"
                      interactive
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-bold text-white truncate">
                          {profile.displayName} ({profile.handle})
                        </span>
                        {supporterBadgeUnlocked && <ZeroSupporterGoldenBadge compact />}
                      </div>
                      <div
                        className={`text-[10px] truncate ${
                          (ACCENT_STYLES[profile.accentColor] || ACCENT_STYLES.amber).text
                        }`}
                      >
                        #{profile.primaryMission} • {profile.dailyGoalHours}h/day target
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={onOpenProfileModal}
                    className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-[11px] font-bold text-white shrink-0"
                  >
                    Edit
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Sparkles size={14} />
                  <span>
                    {hasClaimedFirstTimeParachute
                      ? 'Create Interactive Profile'
                      : 'Make Profile & Claim +1 Free 🎫'}
                  </span>
                </button>
              )}
            </div>
          )}

          {/* Theme Studio Launcher */}
          <button
            type="button"
            onClick={() => setActiveSection('themes')}
            className="w-full bg-zinc-950 border border-zinc-850 hover:border-zinc-700 p-4 rounded-2xl flex items-center justify-between gap-3 text-left font-mono transition-all"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-zinc-200 font-bold uppercase tracking-wider">
                <Palette size={14} style={{ color: 'var(--zero-accent)' }} />
                <span>Theme Studio</span>
              </div>
              <div className="text-[11px] text-zinc-400">
                Active:{' '}
                <strong className="text-white uppercase">
                  {themeConfig.family === 'amoled'
                    ? `AMOLED (${themeConfig.amoledGradient})`
                    : themeConfig.family === 'kindle'
                    ? 'Paper like Kindle'
                    : 'Matte Studio'}
                </strong>
              </div>
            </div>
            <span className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 text-[10px] font-bold text-white uppercase shrink-0">
              Customize →
            </span>
          </button>

          {/* DONOR PERKS & BADGES (STATUS, SIGNED TOKEN & KO-FI MANUAL SUPPORT) */}
          <DonorPerksBadgesCard
            isZeroSupporter={supporterBadgeUnlocked}
            hasClaimedFirstDonationParachute={hasClaimedFirstDonationParachute}
            remainingEscapeTickets={remainingEscapeTickets}
            cloudAutoBackupEnabled={Boolean(cloudBackupStatus?.enabled)}
            environmentSecurity={environmentSecurity}
            onClaimFirstDonationBonus={onClaimFirstDonationBonus}
            onImportData={onImportData}
            onRestoreSuccess={onRestoreSuccess}
          />

          {/* UNIVERSAL CLOUD AUTO-BACKUP & 1-TAP RESTORE (.zbak SAF) */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl space-y-3 font-mono">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-white font-bold uppercase tracking-wider">
                <Cloud size={15} style={{ color: '#8B5CF6' }} />
                <span>Universal Cloud Auto-Backup</span>
              </div>
              <span
                className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                  cloudBackupStatus?.enabled
                    ? 'bg-emerald-950/60 border-emerald-600/70 text-emerald-300'
                    : 'bg-zinc-900 border-zinc-700 text-zinc-400'
                }`}
              >
                {cloudBackupStatus?.enabled ? 'Auto-Sync ON' : 'Weekly / Manual'}
              </span>
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              100% serverless &amp; API-key-free. Signs stats, donor badges, Escape Tickets &amp; Preset Bags into{' '}
              <code>zero-backup.zbak</code> (SHA-256 HMAC protected against edits) inside Google Drive, OneDrive, JioDrive, or Downloads.
            </p>

            {/* Active Sync Destination Card */}
            <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-1 text-[11px]">
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Cloud Target:</span>
                <span className="text-white font-bold truncate">
                  {cloudBackupStatus?.enabled
                    ? `${cloudBackupStatus.providerLabel || 'Cloud Storage'} • ${
                        cloudBackupStatus.displayName || 'zero-backup.zbak'
                      }`
                    : 'Not linked (weekly reminder active)'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-zinc-400">Last Cloud Save:</span>
                <span className="text-zinc-200 font-semibold">
                  {cloudBackupStatus?.lastBackupTimestamp &&
                  cloudBackupStatus.lastBackupTimestamp > 0
                    ? new Date(cloudBackupStatus.lastBackupTimestamp).toLocaleString()
                    : 'Never synced'}
                </span>
              </div>
            </div>

            {cloudBackupStatus?.lastError && (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-700/80 text-amber-200 text-[10px]">
                {cloudBackupStatus.lastError}
              </div>
            )}

            {cloudNotice && (
              <div
                className={`p-2.5 rounded-xl text-[11px] border ${
                  cloudNotice.ok
                    ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/50 border-red-700 text-red-200'
                }`}
              >
                {cloudNotice.message}
              </div>
            )}

            {/* Mode A Controls */}
            {onEnableCloudAutoBackup && (
              <>
                {!cloudBackupStatus?.enabled ? (
                  <button
                    type="button"
                    disabled={isCloudBusy}
                    onClick={async () => {
                      const res = await onEnableCloudAutoBackup();
                      if (!res.cancelled) {
                        setCloudNotice({ ok: res.ok, message: res.message });
                      }
                    }}
                    className="w-full py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-60"
                    style={{
                      backgroundColor: '#8B5CF6',
                      color: '#FFFFFF',
                    }}
                  >
                    {isCloudBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CloudCog size={14} />
                    )}
                    <span>Enable Automatic Cloud Backup</span>
                  </button>
                ) : (
                  <div className="grid grid-cols-3 gap-2">
                    {onSyncCloudBackupNow && (
                      <button
                        type="button"
                        disabled={isCloudBusy}
                        onClick={async () => {
                          const res = await onSyncCloudBackupNow();
                          setCloudNotice(res);
                        }}
                        className="py-2 px-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[10px] uppercase flex items-center justify-center gap-1 disabled:opacity-60"
                      >
                        <RefreshCw size={11} className={isCloudBusy ? 'animate-spin' : ''} />
                        <span>Sync Now</span>
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isCloudBusy}
                      onClick={async () => {
                        const res = await onEnableCloudAutoBackup();
                        if (!res.cancelled) {
                          setCloudNotice({ ok: res.ok, message: res.message });
                        }
                      }}
                      className="py-2 px-2 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-white font-bold text-[10px] uppercase"
                    >
                      Change File
                    </button>
                    {onDisableCloudAutoBackup && (
                      <button
                        type="button"
                        disabled={isCloudBusy}
                        onClick={async () => {
                          await onDisableCloudAutoBackup();
                          setCloudNotice({
                            ok: true,
                            message: 'Automatic Cloud Backup turned off. Weekly 7-day reminder re-armed.',
                          });
                        }}
                        className="py-2 px-2 rounded-xl bg-zinc-950 border border-red-900/70 text-red-400 hover:text-red-300 font-bold text-[10px] uppercase"
                      >
                        Turn Off
                      </button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Mode B Manual Upload + 1-Tap Cloud Restore */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {onOneTapCloudUpload && (
                <button
                  type="button"
                  disabled={isCloudBusy}
                  onClick={async () => {
                    const res = await onOneTapCloudUpload();
                    if (!res.cancelled) {
                      setCloudNotice({ ok: res.ok, message: res.message });
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  <CloudUpload size={14} style={{ color: '#A78BFA' }} />
                  <span>1-Tap Upload (.zbak)</span>
                </button>
              )}

              {onRestoreFromCloudPicker && (
                <button
                  type="button"
                  disabled={isCloudBusy || restoreDisabled}
                  onClick={async () => {
                    const res = await onRestoreFromCloudPicker();
                    if (res.ok) {
                      setCloudNotice({ ok: true, message: res.message });
                      onRestoreSuccess?.();
                    } else if (!res.cancelled) {
                      setCloudNotice({ ok: false, message: res.message });
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-zinc-200 hover:bg-white text-black font-black text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <CloudDownload size={14} />
                  <span>Restore Backup from Cloud (Drive / OneDrive / JioDrive)</span>
                </button>
              )}
            </div>

            {restoreDisabled && (
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-[10px] leading-relaxed flex items-start gap-2">
                <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" />
                <span>
                  <strong>Integrity Protection Active:</strong> Root access, custom test-keys ROM, or debug emulator detected. Cloud backup restore is disabled to prevent stat or ticket tampering.
                </span>
              </div>
            )}
          </div>

          {/* Data Management: Full Export, Restore & Reset */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl space-y-3 font-mono">
            <div className="text-xs text-zinc-200 font-bold uppercase tracking-wider">
              Backup &amp; Restore Everything
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Save all sessions, 20h Escape Ticket progress, streaks, schedules, themes, and all 4 Bags to a local <code>.json</code> file or restore a <code>.zbak</code> / <code>.json</code> archive.
            </p>

            {restoreDisabled && (
              <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-[10px]">
                File &amp; JSON restore are disabled in this rooted or emulator environment. Exports stay active.
              </div>
            )}

            {backupNotice && (
              <div
                className={`p-2.5 rounded-xl text-[11px] border ${
                  backupNotice.ok
                    ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/50 border-red-700 text-red-200'
                }`}
              >
                {backupNotice.message}
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".zbak,.json,application/json,application/octet-stream"
              onChange={handleFileRestore}
              className="hidden"
            />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onExportData();
                  setBackupNotice({
                    ok: true,
                    message: hasNativeBridge
                      ? 'Backup generated. Choose Save to Files / Drive or Share.'
                      : 'Backup .json file downloaded.',
                  });
                }}
                className="p-3 bg-zinc-200 hover:bg-white text-black font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors"
              >
                <Download size={14} />
                <span>Export Backup</span>
              </button>

              <button
                type="button"
                disabled={restoreDisabled}
                onClick={() => fileInputRef.current?.click()}
                className="p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <Upload size={14} />
                <span>Restore File</span>
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleCopy(onBuildBackupJson(), 'backup_json');
                  setBackupNotice({ ok: true, message: 'Full JSON backup copied to clipboard.' });
                }}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[11px] text-zinc-300 flex items-center justify-center gap-1.5"
              >
                {copiedId === 'backup_json' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>Copy JSON Backup</span>
              </button>

              <button
                type="button"
                disabled={restoreDisabled}
                onClick={() => setShowPasteRestore(!showPasteRestore)}
                className="flex-1 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 rounded-xl text-[11px] text-zinc-300 disabled:opacity-45 disabled:cursor-not-allowed"
              >
                {showPasteRestore ? 'Hide Paste Box' : 'Paste JSON to Restore'}
              </button>
            </div>

            {showPasteRestore && !restoreDisabled && (
              <div className="space-y-2 pt-1">
                <textarea
                  rows={4}
                  value={pasteJsonInput}
                  onChange={(e) => setPasteJsonInput(e.target.value)}
                  placeholder="Paste your Zero JSON backup text here..."
                  className="w-full bg-black border border-zinc-700 rounded-xl p-2.5 text-[11px] text-zinc-200 outline-none"
                />
                <button
                  type="button"
                  onClick={handlePasteRestore}
                  className="w-full py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase"
                >
                  Restore Pasted Backup
                </button>
              </div>
            )}

            <button
              onClick={() => {
                if (window.confirm('Reset all Zero data to factory defaults? This clears your Escape Tickets, bags, and streaks.')) {
                  onResetData();
                  setBackupNotice({ ok: true, message: 'All data reset cleanly to Zero.' });
                }
              }}
              className="w-full p-3 bg-zinc-950 border border-red-950/80 hover:border-red-800 text-red-400 hover:text-red-300 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
            >
              <RotateCcw size={14} />
              <span>Factory Reset App State</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: ANDROID OS-LEVEL ENFORCEMENT & ARCHITECTURE */}
      {activeSection === 'os_security' && (
        <div className="space-y-4">
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3 font-mono">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Smartphone size={16} className="text-emerald-400 shrink-0" />
                <span>OS PERMISSIONS &amp; PRIORITY</span>
              </div>
              <button
                type="button"
                onClick={onRefreshPermissions}
                className="text-[10px] px-2 py-0.5 rounded-md bg-zinc-900 border border-zinc-800 text-zinc-300"
              >
                {hasNativeBridge ? (isStrictBuild ? 'STRICT EDITION' : 'STANDARD EDITION') : 'WEB PREVIEW'}
              </button>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              Priority setup order:{' '}
              <strong className="text-white">
                1. Restricted Settings Check &rarr; 2.{' '}
                {isStrictBuild ? 'Accessibility Service' : 'Usage Access (Find Zero)'} &rarr; 3.
                Display Over Apps &rarr; 4. Notifications
              </strong>
              .
            </p>

            {hasNativeBridge && !permissionPriority.allRecommendedGranted && (
              <button
                type="button"
                onClick={() => window.ZeroNative?.requestNextMissingPermission()}
                className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                {permissionPriority.nextButtonLabel}
              </button>
            )}

            {/* 1: Check Allow Restricted Settings + App Info Shortcut */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>1. Allow Restricted Settings Check</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    permissionPriority.restrictedStatus === 'allowed'
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : permissionPriority.restrictedStatus === 'blocked'
                      ? 'bg-amber-950 text-amber-300 border-amber-700'
                      : 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                  }`}
                >
                  {hasNativeBridge
                    ? permissionPriority.restrictedStatus === 'allowed'
                      ? 'ALLOWED'
                      : permissionPriority.restrictedStatus === 'blocked'
                      ? 'BLOCKED — OPEN APP INFO'
                      : 'CHECK APP INFO'
                    : 'SIDELOAD GUARD'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Direct shortcut to Zero&rsquo;s system App Info page to toggle <strong>&#8942; &rarr; Allow restricted settings</strong> on Android 13–16.
              </p>
              {hasNativeBridge && (
                <button
                  type="button"
                  onClick={() => window.ZeroNative?.openAppSettingsDetails()}
                  className="w-full py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                >
                  <Settings size={13} />
                  <span>Open Zero App Info (Shortcut)</span>
                  <ExternalLink size={12} />
                </button>
              )}
            </div>

            {/* 2A: Usage Access (Standard Sideload Edition) */}
            {!isStrictBuild && (
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                  <span>2. Usage Access Guard (Find Zero)</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      hasUsagePerm
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {hasNativeBridge ? (hasUsagePerm ? 'GRANTED' : 'MISSING') : 'FOREGROUND MONITOR'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Lets Zero enforce your 4 Bags + Calls/SMS and snap The Void back over blocked distractions.
                </p>
                {hasNativeBridge && !hasUsagePerm && (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.requestUsageStatsPermission()}
                      className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-[11px] rounded-xl uppercase tracking-wider active:scale-95 transition-all"
                    >
                      Grant Usage Access -&gt; Find Zero
                    </button>
                    <RestrictedSettingsGuideCard
                      restrictedStatus={permissionPriority.restrictedStatus}
                      isStrictBuild={false}
                      onOpenAppInfo={() => window.ZeroNative?.openAppSettingsDetails()}
                      compact
                    />
                  </div>
                )}
              </div>
            )}

            {/* 2B: Accessibility Service (Strict Edition) */}
            {isStrictBuild && (
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2.5">
                <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                  <span>2. Accessibility Service</span>
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded border ${
                      isAccessibilityOn
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {hasNativeBridge ? (isAccessibilityOn ? 'GRANTED' : 'MISSING') : 'STRICT APK ONLY'}
                  </span>
                </div>
                <p className="text-[11px] text-zinc-400">
                  Instantly blocks Notification pull-down, Quick Settings, Recents, Settings, and unbagged apps without Screen Pinning prompts.
                </p>
                {hasNativeBridge && !isAccessibilityOn && (
                  <div className="space-y-2.5">
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.openAccessibilitySettings()}
                      className="w-full py-2 bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] rounded-xl uppercase tracking-wider active:scale-95 transition-all"
                    >
                      Enable Accessibility Service -&gt; Find Zero
                    </button>
                    <RestrictedSettingsGuideCard
                      restrictedStatus={permissionPriority.restrictedStatus}
                      isStrictBuild={true}
                      onOpenAppInfo={() => window.ZeroNative?.openAppSettingsDetails()}
                      compact
                    />
                  </div>
                )}
              </div>
            )}

            {/* 3: SYSTEM_ALERT_WINDOW */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>3. Display Over Other Apps</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    hasOverlayPerm
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {hasNativeBridge ? (hasOverlayPerm ? 'GRANTED' : 'REQUIRED ON ANDROID') : 'TOPMOST LAYER'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Required on Android 10–16 so Zero can bring The Void back on top of any app from background services.
              </p>
              {hasNativeBridge && !hasOverlayPerm && (
                <button
                  type="button"
                  onClick={() => window.ZeroNative?.requestOverlayPermission()}
                  className="w-full py-2 bg-white hover:bg-zinc-200 text-black font-bold text-[11px] rounded-xl active:scale-95 transition-all"
                >
                  Grant Display Over Other Apps
                </button>
              )}
            </div>

            {/* 4: Notifications */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>4. Lock &amp; Pre-Lock Notifications</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    hasNotifPerm
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-amber-950 text-amber-300 border-amber-800'
                  }`}
                >
                  {hasNativeBridge ? (hasNotifPerm ? 'GRANTED' : 'MISSING (STEP 4)') : 'ALERT READY'}
                </span>
              </div>
              {hasNativeBridge && !hasNotifPerm && (
                <button
                  type="button"
                  onClick={() => window.ZeroNative?.requestNotificationPermission()}
                  className="w-full py-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-[11px] rounded-xl"
                >
                  Allow Notifications
                </button>
              )}
            </div>

            {/* 5: LockTaskMode / Device Owner */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>5. Hardware Kiosk (Optional ADB)</span>
                <span
                  className={`text-[9px] px-1.5 py-0.5 rounded border ${
                    isDeviceOwner
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                      : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                  }`}
                >
                  {isDeviceOwner ? 'DEVICE OWNER ACTIVE' : 'OPTIONAL'}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                When provisioned via ADB Device Owner, <code>LockTaskMode</code> engages unbreakable system kiosk mode while still permitting your packed Bag apps.
              </p>
            </div>
          </div>

          {/* Installed APK Build & Update Signing Key Diagnostic Card */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-2xl space-y-2.5 font-mono text-xs">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-white font-bold uppercase tracking-wider">
                <KeyRound size={14} className="text-emerald-400 shrink-0" />
                <span>Installed Build &amp; Update Key</span>
              </div>
              {appBuildInfo && (
                <span
                  className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    appBuildInfo.isOfficialReleaseKey
                      ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                      : 'bg-amber-950 text-amber-300 border-amber-700'
                  }`}
                >
                  {appBuildInfo.isOfficialReleaseKey ? 'Update Key Verified' : 'Debug / Preview Key'}
                </span>
              )}
            </div>

            {appBuildInfo ? (
              <div className="p-3 rounded-xl bg-black border border-zinc-800 space-y-1 text-[11px]">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Installed Version:</span>
                  <span className="text-white font-bold">
                    v{appBuildInfo.versionName} (code {appBuildInfo.versionCode})
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Edition:</span>
                  <span className="text-zinc-200 font-bold uppercase">{appBuildInfo.edition}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-zinc-400">Cert SHA-256:</span>
                  <span className="text-emerald-300 font-bold truncate max-w-[190px]">
                    {appBuildInfo.signingSha256 || 'Unavailable'}
                  </span>
                </div>
                {environmentSecurity && (
                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-zinc-900">
                    <span className="text-zinc-400">Runtime Environment:</span>
                    <span
                      className={`font-bold ${
                        environmentSecurity.isCompromised ? 'text-amber-300' : 'text-emerald-300'
                      }`}
                    >
                      {environmentSecurity.isCompromised
                        ? `Restricted (${environmentSecurity.reasons.join(', ') || 'compromised'})`
                        : 'Verified Device & R8'}
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-2.5 rounded-xl bg-black border border-zinc-800 text-[11px] text-zinc-400">
                Permanent APK Release Key: <code className="text-emerald-300">A14A36...CE11</code> (V1+V2+V3 signed).
              </div>
            )}

            {appBuildInfo && !appBuildInfo.isOfficialReleaseKey ? (
              <div className="p-2.5 rounded-xl bg-amber-950/50 border border-amber-600/70 text-amber-200 text-[10px] leading-relaxed">
                This device is running an older preview/debug key build. Save a Cloud{' '}
                <code>.zbak</code> backup in <strong>Settings</strong>,{' '}
                <strong>Uninstall (for all users)</strong> once, and install the newest signed{' '}
                <code>ZERO-v*.apk</code> so all future updates install cleanly in-place!
              </div>
            ) : (
              <div className="flex items-start gap-1.5 text-[10px] text-emerald-300 leading-relaxed">
                <ShieldCheck size={13} className="shrink-0 mt-0.5 text-emerald-400" />
                <span>
                  Keep updating within the same edition using a higher version code. If Android ever says &ldquo;App not installed&rdquo;, check that Chrome/Files has <strong>Install unknown apps</strong> allowed and uninstall any old duplicate copy from Work Profile / Dual Apps.
                </span>
              </div>
            )}
          </div>

          {/* ADB Command Box */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Terminal size={14} className="text-cyan-400" />
                <span>ADB Device Owner Setup (Optional)</span>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    'adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver',
                    'adb_cmd'
                  )
                }
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
              >
                {copiedId === 'adb_cmd' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedId === 'adb_cmd' ? 'Copied' : 'Copy ADB'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-black rounded-xl text-[10px] text-emerald-300 overflow-x-auto no-scrollbar border border-zinc-900">
              adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver
            </pre>
            <p className="text-zinc-500 text-[10px] leading-relaxed">
              Also check{' '}
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => handleOpenExternal(e, RELEASES_URL)}
                className="text-amber-300 hover:underline font-semibold"
              >
                GitHub Releases
              </a>{' '}
              anytime for the latest APK updates.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 4: KEEP ZERO FREE (ETHICAL SUPPORT & DONATE) */}
      {activeSection === 'support' && (
        <div className="space-y-4">
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3">
            <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
              <Heart size={16} className="text-red-500 fill-red-500" />
              <span>THE ZERO PROMISE</span>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              Zero is 100% free, libre, and open-source software (FOSS). There are no paywalls,
              no subscriptions, no analytics trackers, and no advertisements.
            </p>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              We believe your attention belongs to you—not to algorithms or paywalled apps.
              Emergency Escape Tickets can never be purchased outright; earn 1 every 20 focus
              hours, plus one-time free gifts (+1 starter on first profile, and strictly on your
              1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}: +1 thank-you ticket &amp; Golden{' '}
              <strong className="text-amber-300">ZERO-SUPPORTER</strong> badge).
            </p>
            <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-zinc-900 text-zinc-400 gap-2">
              <a
                href={RELEASES_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => handleOpenExternal(e, RELEASES_URL)}
                className="text-amber-300 hover:underline flex items-center gap-1 font-bold"
              >
                <span>Check Updates</span>
                <ExternalLink size={12} />
              </a>
              <a
                href={SOURCE_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => handleOpenExternal(e, SOURCE_URL)}
                className="text-white hover:underline flex items-center gap-1 font-bold"
              >
                <Code2 size={13} />
                <span>Source Code</span>
              </a>
            </div>
          </div>

          {/* Donation Channels */}
          <div className="space-y-2.5">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold block">
              Support the Project
            </span>

            {/* UPI ID & Scannable QR (Best Offer • No Minimum Limit) */}
            <div className="p-3.5 bg-amber-500/10 border-2 border-amber-400/60 rounded-2xl space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black font-mono text-[10px] font-black uppercase tracking-wider">
                  Best Offer • Best Option
                </span>
                <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 font-mono text-[10px] font-bold">
                  NO MINIMUM LIMIT
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-mono font-bold text-xs shrink-0">
                    UPI
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono font-bold text-xs text-white">UPI / Instant Pay</div>
                    <div className="text-[11px] font-mono text-amber-200 truncate">{UPI_ID}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowUPIQR(!showUPIQR)}
                    className={`p-1.5 rounded-lg border transition-colors ${
                      showUPIQR
                        ? 'bg-zinc-200 text-black border-white'
                        : 'bg-zinc-900 border-zinc-700 text-zinc-400 hover:text-white'
                    }`}
                    title="Toggle QR Code"
                    aria-label="Toggle UPI QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy(UPI_ID, 'upi')}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                    title="Copy UPI ID"
                    aria-label="Copy UPI ID"
                  >
                    {copiedId === 'upi' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <p className="text-[11px] font-mono text-zinc-300 leading-relaxed">
                UPI has <strong>no minimum limit</strong> — tip even ₹1 or any amount you want with zero platform fees.
              </p>

              {/* 1st Minimum ₹50 Supporter Bonus */}
              {!hasClaimedFirstDonationParachute ? (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-2">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-mono font-black uppercase">
                      <Gift size={13} className="text-emerald-400 shrink-0" />
                      <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 🎫 &amp; Gold Badge</span>
                    </div>
                    <span className="text-[9px] font-mono font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black shrink-0">
                      Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                    </span>
                  </div>
                  <p className="text-[10px] font-mono text-zinc-300 leading-relaxed">
                    <strong>Strict Rule:</strong> The Golden{' '}
                    <strong className="text-amber-300">ZERO-SUPPORTER</strong> Profile Badge &amp;{' '}
                    <strong>+1 Free Emergency Escape Ticket (🎫)</strong>{' '}
                    <strong>ONLY unlock after your 1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                    (smaller tips have no minimum limit via UPI but do not unlock the badge).
                  </p>
                  {!confirmingDonationClaim ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={UPI_FIFTY_RS_PAY_URL}
                        onClick={(e) => {
                          handleOpenExternal(e, UPI_FIFTY_RS_PAY_URL);
                          setConfirmingDonationClaim(true);
                        }}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-mono font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                      >
                        <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 🎫 &amp; Gold)</span>
                        <ExternalLink size={12} />
                      </a>
                      {onClaimFirstDonationBonus && (
                        <button
                          type="button"
                          onClick={() => setConfirmingDonationClaim(true)}
                          className="px-3 py-2 rounded-xl bg-zinc-900 border border-emerald-700/60 text-emerald-200 font-mono text-[10px] font-bold"
                        >
                          Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-xl bg-black/70 border border-emerald-600/60 space-y-2 font-mono">
                      <div className="text-[10px] text-emerald-200">
                        Confirm you sent your <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                        to unlock the Golden{' '}
                        <strong className="text-amber-300">ZERO-SUPPORTER</strong> Badge &amp;{' '}
                        <strong>+1 Free Emergency Escape Ticket (🎫)</strong>:
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClaimFirstDonationBonus?.();
                            setConfirmingDonationClaim(false);
                          }}
                          className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[10px] uppercase tracking-wider"
                        >
                          Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDonationClaim(false)}
                          className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="px-3 py-2 rounded-xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-between gap-2 flex-wrap text-[10px] font-mono text-emerald-300">
                  <span className="flex items-center gap-1.5 font-bold">
                    <CheckCircle2 size={12} />
                    <span>Min ₹{FIRST_DONATION_BONUS_INR} 1st Tip Bonus Claimed</span>
                  </span>
                  <ZeroSupporterGoldenBadge compact />
                </div>
              )}

              <a
                href={UPI_PAY_URL}
                onClick={(e) => handleOpenExternal(e, UPI_PAY_URL)}
                className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
              >
                <span>Open UPI App (Any Amount)</span>
                <ExternalLink size={12} />
              </a>

              {showUPIQR && (
                <div className="p-3.5 bg-zinc-900 rounded-xl flex flex-col items-center justify-center text-center space-y-2 border border-zinc-800">
                  {upiQrUrl ? (
                    <div data-qr-surface="true" className="bg-white p-2 rounded-xl shadow-md">
                      <img
                        src={upiQrUrl}
                        alt={`UPI QR code for ${UPI_ID}`}
                        className="w-36 h-36 block"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-zinc-950 rounded-xl flex items-center justify-center text-[10px] font-mono text-zinc-400">
                      Generating QR...
                    </div>
                  )}
                  <div className="text-[11px] font-mono font-bold text-zinc-200">{UPI_ID}</div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    Scan via Google Pay, PhonePe, Paytm, or BHIM
                  </div>
                </div>
              )}
            </div>

            {/* Buy Me a Coffee via Ko-fi */}
            <a
              href={KOFI_URL}
              target="_blank"
              rel="noreferrer"
              onClick={(e) => handleOpenExternal(e, KOFI_URL)}
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Coffee size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-mono font-bold text-xs text-white">Buy Me a Coffee (Ko-fi)</div>
                  <div className="text-[11px] font-mono text-zinc-400 truncate">ko-fi.com/mdyousuf2620</div>
                </div>
              </div>
              <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-200 shrink-0 ml-2" />
            </a>

            {/* Donor Perks & Badges (Manual Ko-fi Verification & Signed Token) */}
            <DonorPerksBadgesCard
              isZeroSupporter={supporterBadgeUnlocked}
              hasClaimedFirstDonationParachute={hasClaimedFirstDonationParachute}
              remainingEscapeTickets={remainingEscapeTickets}
              cloudAutoBackupEnabled={Boolean(cloudBackupStatus?.enabled)}
              environmentSecurity={environmentSecurity}
              onClaimFirstDonationBonus={onClaimFirstDonationBonus}
              onImportData={onImportData}
              onRestoreSuccess={onRestoreSuccess}
            />

            {tipSkipRemaining > 0 && (
              <div className="p-3 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between gap-2 font-mono text-[11px]">
                <span className="text-zinc-400">
                  Post-session tip popup blocked for{' '}
                  <strong className="text-white">{tipSkipRemaining}</strong> more completed{' '}
                  {tipSkipRemaining === 1 ? 'session' : 'sessions'}.
                </span>
                {onResetTipPromptBlock && (
                  <button
                    type="button"
                    onClick={onResetTipPromptBlock}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-200 hover:text-white font-bold shrink-0"
                  >
                    Unblock
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div
          className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center px-4"
          style={{
            paddingTop: 'calc(1rem + var(--zero-safe-top))',
            paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
          }}
        >
          <form
            onSubmit={handleCreateSchedule}
            className="w-full max-w-sm bg-zinc-950 border-2 border-zinc-700 rounded-2xl p-5 shadow-2xl font-mono text-left space-y-4"
          >
            <div className="font-bold text-sm text-white">Create Recurring Schedule</div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Schedule Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Morning Focus"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Active Days</label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDaySelection(idx)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                      newDays.includes(idx)
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">End Time</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Focus Tag</label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-zinc-900 rounded-xl text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Bell size={12} className="text-amber-400 shrink-0" />
              <span>Includes automatic 5-minute pre-lock heads-up warning</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-white text-black rounded-xl font-bold text-xs uppercase"
              >
                Save Schedule
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="py-2.5 px-4 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
