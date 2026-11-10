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
import { ACCENT_ID_TO_KEY, ACCENT_STYLES, ProfileAvatar } from './ProfileAvatar';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ThemeSelectorCard } from './ThemeSelectorCard';
import { DonorPerksBadgesCard } from './DonorPerksBadgesCard';
import { ObsidianCard } from './ObsidianCard';
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
  KeyRound,
  ShieldCheck,
  HardDrive,
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
  onBuildZbakString?: () => string;
  onExportData: () => string;
  onExportZbakData?: () => string;
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
  onBuildZbakString,
  onExportData,
  onExportZbakData,
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
  const profileAccentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
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

      {/* Frosted Obsidian Sub-Nav Pill */}
      <div className="grid grid-cols-5 gap-1 p-1 obsidian-shell-bar rounded-2xl text-[10px] font-mono">
        <button
          onClick={() => setActiveSection('schedules')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'schedules'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveSection('themes')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'themes'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Themes
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'settings'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Settings
        </button>
        <button
          onClick={() => setActiveSection('os_security')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'os_security'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          OS
        </button>
        <button
          onClick={() => setActiveSection('support')}
          className={`py-2 rounded-xl transition-all font-semibold truncate px-1 ${
            activeSection === 'support'
              ? 'obsidian-pill-active font-black'
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
          <ObsidianCard
            accent={profileAccentKey}
            className="font-mono"
            headerClassName="p-3.5 text-[11px] text-zinc-300 leading-relaxed"
            footerClassName="px-3.5 py-2 flex items-center justify-between text-[10px] text-zinc-400"
            headerContent={
              <p>
                Pick between <strong className="text-white">AMOLED</strong> (pure black &amp; subtle
                gradients), <strong className="text-white">Paper like Kindle</strong> (E-Ink light
                mode with custom paper &amp; ink pickers), or{' '}
                <strong className="text-white">Matte Studio</strong> (charcoal studio finishes with
                custom surface &amp; accent colors).
              </p>
            }
            footerContent={
              <>
                <span>Contrast-Protected Cards</span>
                <span className="text-zinc-300 font-bold">JSON &amp; Auto-Saved</span>
              </>
            }
          />
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
              className="px-3 py-1.5 obsidian-pill-active font-mono font-black text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            {schedules.map((sched) => (
              <ObsidianCard
                key={sched.id}
                accent={profileAccentKey}
                className={`font-mono ${sched.isEnabled ? '' : 'opacity-65'}`}
                headerClassName="p-4"
                footerClassName="px-4 py-2.5 flex items-center justify-between text-[11px] text-zinc-400"
                headerContent={
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-bold text-sm text-zinc-100 flex items-center gap-2 flex-wrap">
                          <span>{sched.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded obsidian-inset-neutral text-zinc-300">
                            #{sched.tag}
                          </span>
                        </div>
                        <div className="text-xs text-zinc-400 mt-1">
                          {sched.startTime} – {sched.endTime}
                        </div>
                      </div>

                      {/* Toggle Switch */}
                      <button
                        onClick={() => onToggleSchedule(sched.id)}
                        style={
                          sched.isEnabled
                            ? {
                                background:
                                  'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
                                borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.75)',
                              }
                            : undefined
                        }
                        className={`w-12 h-6 rounded-full transition-colors relative border shrink-0 ${
                          sched.isEnabled
                            ? ''
                            : 'obsidian-inset-neutral'
                        }`}
                      >
                        <div
                          style={
                            sched.isEnabled
                              ? { backgroundColor: 'var(--accent-badge-text, #09090B)' }
                              : undefined
                          }
                          className={`w-4 h-4 rounded-full transition-transform transform ${
                            sched.isEnabled
                              ? 'translate-x-6'
                              : 'translate-x-1 bg-zinc-500'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Days of Week Pills */}
                    <div className="flex gap-1 mt-3 flex-wrap">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                            sched.days.includes(idx)
                              ? 'obsidian-pill-active font-black'
                              : 'obsidian-inset-neutral text-zinc-500'
                          }`}
                        >
                          {day}
                        </span>
                      ))}
                    </div>
                  </>
                }
                footerContent={
                  <>
                    <div className="flex items-center gap-1.5 text-zinc-300">
                      <Bell size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0" />
                      <span>5-min heads-up alert enabled</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onTriggerTestWarning(sched.name)}
                        className="text-[10px] text-zinc-300 hover:text-white underline"
                        title="Simulates 5-minute pre-lock heads-up warning notification"
                      >
                        Test Warning
                      </button>
                      <button
                        onClick={() => onDeleteSchedule(sched.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        aria-label={`Delete ${sched.name}`}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </>
                }
              />
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: MANUAL BACKUP & RESTORE, CLOUD SYNC & DISCIPLINE RULES */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          {/* CARD #1: MANUAL BACKUP & RESTORE OPTIONS (.ZBAK + .JSON EXPORT / FILE RESTORE / CLIPBOARD / RESET) */}
          <ObsidianCard
            accent={profileAccentKey}
            ambientGlow
            className="font-mono"
            headerClassName="p-4 space-y-3"
            footerClassName="px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap"
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                      <HardDrive size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-white font-black uppercase tracking-wider">
                        Manual Backup &amp; Restore
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate">
                        Full .ZBAK (Signed) &amp; .JSON Portable Options
                      </div>
                    </div>
                  </div>
                  <div className="px-2.5 py-1.5 rounded-xl obsidian-inset text-center shrink-0">
                    <div
                      className="text-[10px] font-extrabold leading-none"
                      style={{ color: 'var(--accent-hex, #F59E0B)' }}
                    >
                      {cloudBackupStatus?.lastBackupTimestamp &&
                      cloudBackupStatus.lastBackupTimestamp > 0
                        ? 'SAVED'
                        : 'READY'}
                    </div>
                    <div className="mt-0.5 text-[8px] uppercase tracking-wider text-zinc-400">
                      MANUAL
                    </div>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl obsidian-inset-neutral flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-zinc-400">Last Backup Timestamp:</span>
                  <span className="text-zinc-200 font-bold truncate">
                    {cloudBackupStatus?.lastBackupTimestamp &&
                    cloudBackupStatus.lastBackupTimestamp > 0
                      ? new Date(cloudBackupStatus.lastBackupTimestamp).toLocaleString()
                      : 'No export created yet'}
                  </span>
                </div>

                {restoreDisabled && (
                  <div className="p-2.5 rounded-xl bg-amber-950/60 border border-amber-500/70 text-amber-200 text-[10px]">
                    File &amp; text restore are disabled in this rooted, test-keys ROM, or debug emulator environment. Manual exports remain active.
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
                  accept=".zbak,.json,application/json,application/octet-stream,*/*"
                  onChange={handleFileRestore}
                  className="hidden"
                />

                {/* Manual Export Buttons (.ZBAK + .JSON) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (onExportZbakData) {
                        onExportZbakData();
                      } else {
                        onExportData();
                      }
                      setBackupNotice({
                        ok: true,
                        message: hasNativeBridge
                          ? 'Signed zero-backup.zbak created. Choose Save to Files, Drive, OneDrive or JioDrive.'
                          : 'Signed .zbak backup file downloaded.',
                      });
                    }}
                    className="p-3 obsidian-pill-active font-black rounded-xl flex items-center justify-center gap-1.5 text-xs active:scale-95 transition-all"
                  >
                    <Download size={14} />
                    <span>Export .ZBAK</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onExportData();
                      setBackupNotice({
                        ok: true,
                        message: hasNativeBridge
                          ? 'JSON backup generated. Choose Save to Files / Drive or Share.'
                          : 'Backup .json file downloaded.',
                      });
                    }}
                    className="p-3 obsidian-shell-bar text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-xs hover:border-white/30 active:scale-95 transition-all"
                  >
                    <Download size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    <span>Export .JSON</span>
                  </button>
                </div>

                {/* Manual File Restore Buttons */}
                <div className={hasNativeBridge && onRestoreFromCloudPicker ? 'grid grid-cols-2 gap-2' : ''}>
                  {hasNativeBridge && onRestoreFromCloudPicker && (
                    <button
                      type="button"
                      disabled={isCloudBusy || restoreDisabled}
                      onClick={async () => {
                        const res = await onRestoreFromCloudPicker();
                        if (res.ok) {
                          setBackupNotice({ ok: true, message: res.message });
                          onRestoreSuccess?.();
                        } else if (!res.cancelled) {
                          setBackupNotice({ ok: false, message: res.message });
                        }
                      }}
                      className="p-2.5 obsidian-inset text-white font-bold rounded-xl flex items-center justify-center gap-1.5 text-[11px] active:scale-95 transition-all disabled:opacity-45 disabled:cursor-not-allowed"
                    >
                      <Upload size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                      <span>Pick Cloud / Device File</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={restoreDisabled}
                    onClick={() => fileInputRef.current?.click()}
                    className={`${
                      hasNativeBridge && onRestoreFromCloudPicker ? '' : 'w-full'
                    } p-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-200 font-bold rounded-xl flex items-center justify-center gap-1.5 text-[11px] active:scale-95 transition-all disabled:opacity-45 disabled:cursor-not-allowed`}
                  >
                    <Upload size={13} />
                    <span>
                      {hasNativeBridge && onRestoreFromCloudPicker
                        ? 'Browse Local File'
                        : 'Restore .ZBAK / .JSON File'}
                    </span>
                  </button>
                </div>

                {/* Clipboard Copy (.ZBAK / .JSON) + Paste Text Restore */}
                <div className="grid grid-cols-3 gap-1.5">
                  {onBuildZbakString && (
                    <button
                      type="button"
                      onClick={() => {
                        handleCopy(onBuildZbakString(), 'backup_zbak');
                        setBackupNotice({
                          ok: true,
                          message: 'Signed ZBAK1 token copied to clipboard.',
                        });
                      }}
                      className="py-2 px-2 obsidian-inset-neutral hover:border-white/25 rounded-xl text-[10px] text-zinc-200 flex items-center justify-center gap-1 font-bold"
                    >
                      {copiedId === 'backup_zbak' ? (
                        <Check size={11} className="text-emerald-400 shrink-0" />
                      ) : (
                        <Copy size={11} className="shrink-0" />
                      )}
                      <span className="truncate">Copy .ZBAK</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      handleCopy(onBuildBackupJson(), 'backup_json');
                      setBackupNotice({
                        ok: true,
                        message: 'Full JSON backup copied to clipboard.',
                      });
                    }}
                    className="py-2 px-2 obsidian-inset-neutral hover:border-white/25 rounded-xl text-[10px] text-zinc-200 flex items-center justify-center gap-1 font-bold"
                  >
                    {copiedId === 'backup_json' ? (
                      <Check size={11} className="text-emerald-400 shrink-0" />
                    ) : (
                      <Copy size={11} className="shrink-0" />
                    )}
                    <span className="truncate">Copy .JSON</span>
                  </button>

                  <button
                    type="button"
                    disabled={restoreDisabled}
                    onClick={() => setShowPasteRestore(!showPasteRestore)}
                    className={`py-2 px-2 rounded-xl text-[10px] font-bold flex items-center justify-center truncate disabled:opacity-45 disabled:cursor-not-allowed ${
                      showPasteRestore
                        ? 'obsidian-pill-active font-black'
                        : 'obsidian-inset-neutral hover:border-white/25 text-zinc-200'
                    }`}
                  >
                    {showPasteRestore ? 'Hide Paste' : 'Paste Backup'}
                  </button>
                </div>

                {showPasteRestore && !restoreDisabled && (
                  <div className="space-y-2 pt-1">
                    <textarea
                      rows={4}
                      value={pasteJsonInput}
                      onChange={(e) => setPasteJsonInput(e.target.value)}
                      placeholder="Paste signed ZBAK1... token or full Zero JSON backup text here..."
                      className="w-full obsidian-input rounded-xl p-2.5 text-[11px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handlePasteRestore}
                      className="w-full py-2.5 rounded-xl obsidian-pill-active font-black text-xs uppercase tracking-wider"
                    >
                      Restore Pasted Backup
                    </button>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        'Reset all Zero data to factory defaults? This clears your Escape Tickets, bags, and streaks.'
                      )
                    ) {
                      onResetData();
                      setBackupNotice({ ok: true, message: 'All data reset cleanly to Zero.' });
                    }
                  }}
                  className="w-full p-2.5 bg-black/75 border border-red-950/90 hover:border-red-700 text-red-400 hover:text-red-300 rounded-xl flex items-center justify-center gap-2 text-xs transition-colors"
                >
                  <RotateCcw size={13} />
                  <span>Factory Reset App State</span>
                </button>
              </>
            }
            footerContent={
              <>
                <span>
                  Exports stats, 20h meter, donor badges, bags, schedules, widgets &amp; theme.
                </span>
                <span className="font-bold text-zinc-300">.ZBAK &amp; .JSON</span>
              </>
            }
          />

          {/* CARD #2: UNIVERSAL CLOUD AUTO-BACKUP & 1-TAP RESTORE (.zbak SAF) */}
          <ObsidianCard
            accentOverride={{ hex: '#8B5CF6', rgb: '139, 92, 246' }}
            ambientGlow
            className="font-mono"
            headerClassName="p-4 space-y-3"
            footerClassName="px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed"
            headerContent={
              <>
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

                {/* Active Sync Destination Card */}
                <div className="p-3 rounded-xl obsidian-inset-neutral space-y-1 text-[11px]">
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
                          className="py-2 px-2 rounded-xl obsidian-inset-neutral hover:border-white/30 text-white font-bold text-[10px] uppercase"
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
                      className="py-2.5 px-3 rounded-xl obsidian-inset-neutral hover:border-white/25 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-60"
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
                      className="py-2.5 px-3 rounded-xl obsidian-pill-active font-black text-[11px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <CloudDownload size={14} />
                      <span>Restore from Cloud Picker</span>
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
              </>
            }
            footerContent={
              <p>
                100% serverless &amp; API-key-free. Signs stats, donor badges, Escape Tickets &amp; Preset Bags into <code>zero-backup.zbak</code> (SHA-256 HMAC protected) in Google Drive, OneDrive, JioDrive, or Downloads.
              </p>
            }
          />

          {/* CARD #3: ANTI-SLEEP-FARMING RULE CARD */}
          <ObsidianCard
            accent={profileAccentKey}
            ambientGlow
            className="font-mono"
            headerClassName="p-5 space-y-3"
            footerClassName="px-5 py-2.5 text-[11px] text-zinc-400 leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-bold text-sm">
                    <div className="w-7 h-7 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                      <Moon size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <span>ANTI-SLEEP-FARMING RULE</span>
                  </div>
                  <span className="text-[10px] uppercase px-2 py-0.5 rounded-full obsidian-inset text-white font-bold">
                    Integrity
                  </span>
                </div>

                <div className="space-y-2 pt-1">
                  <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-bold block">
                    Select Escape Ticket Rate for #Sleep:
                  </label>

                  {/* Option 1: 0.25x Credit (Recommended) */}
                  <button
                    type="button"
                    onClick={() => onSleepFarmingModeChange('quarter_credit')}
                    className={`w-full p-3 rounded-2xl text-left text-xs transition-all flex items-start justify-between ${
                      sleepFarmingMode === 'quarter_credit'
                        ? 'obsidian-inset text-white'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="font-bold flex items-center gap-2 text-zinc-100">
                        <span>0.25x Sleep Ticket Credit</span>
                        <span className="text-[9px] obsidian-pill-active px-1.5 py-0.5 rounded font-black uppercase">
                          Recommended
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        An 8-hour sleep session earns 2.0 hours towards the 20h Escape Ticket milestone. Keeps rewards meaningful.
                      </p>
                    </div>
                    {sleepFarmingMode === 'quarter_credit' && (
                      <Check size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* Option 2: Daytime Hours Only (0.0x Sleep) */}
                  <button
                    type="button"
                    onClick={() => onSleepFarmingModeChange('daytime_only')}
                    className={`w-full p-3 rounded-2xl text-left text-xs transition-all flex items-start justify-between ${
                      sleepFarmingMode === 'daytime_only'
                        ? 'obsidian-inset text-white'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-zinc-100">Daytime Focus Only (0.0x Sleep Credit)</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Escape Tickets can only be earned during daytime waking hours. Sleep blocks still track total reclaimed time, but 0h toward Escape Tickets.
                      </p>
                    </div>
                    {sleepFarmingMode === 'daytime_only' && (
                      <Check size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0 mt-0.5" />
                    )}
                  </button>

                  {/* Option 3: Full Credit (1.0x) */}
                  <button
                    type="button"
                    onClick={() => onSleepFarmingModeChange('full_credit')}
                    className={`w-full p-3 rounded-2xl text-left text-xs transition-all flex items-start justify-between ${
                      sleepFarmingMode === 'full_credit'
                        ? 'obsidian-inset text-white'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-zinc-100">Full 1.0x Credit (Relaxed)</div>
                      <p className="text-[11px] text-zinc-400 mt-1">
                        Every hour locked (day or night) counts 1:1 toward emergency escape tickets.
                      </p>
                    </div>
                    {sleepFarmingMode === 'full_credit' && (
                      <Check size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0 mt-0.5" />
                    )}
                  </button>
                </div>
              </>
            }
            footerContent={
              <p>
                Prevents farming a free Emergency Escape Ticket every 2.5 nights overnight without resisting waking temptation.
              </p>
            }
          />

          {/* CARD #4: ABORTED SESSION PENALTY EXPLANATION */}
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            className="font-mono text-xs"
            headerClassName="p-4 space-y-2"
            footerClassName="px-4 py-2.5 text-[11px] text-zinc-300 leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center gap-2 text-zinc-200 font-bold uppercase tracking-wider">
                  <ShieldAlert size={14} className="text-red-400 shrink-0" />
                  <span>Aborted Session Penalty (Anti-Exploit)</span>
                </div>
                <p className="text-zinc-300 leading-relaxed text-[11px]">
                  Using an Emergency Escape Ticket forfeits all accumulated hours in that specific broken session toward the 20-hour meter.
                </p>
              </>
            }
            footerContent={
              <div>
                <strong className="text-white">Example:</strong> If you set a 4-hour lock and use an escape ticket at hour 3, you spend 1 Escape Ticket and receive <strong className="text-red-300">0 hours</strong> toward your next one.
              </div>
            }
          />

          {/* CARD #5: Interactive Profile Card */}
          {onOpenProfileModal && (
            <ObsidianCard
              accent={profileAccentKey}
              className="font-mono"
              headerClassName="p-4 space-y-3"
              footerClassName="px-4 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-100 font-bold uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                      <span>Interactive Zero Profile</span>
                    </span>
                    {!hasClaimedFirstTimeParachute && (
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full obsidian-pill-active">
                        +1 Free 🎫 Gift
                      </span>
                    )}
                  </div>

                  {profile ? (
                    <div className="flex items-center justify-between gap-3 p-3 rounded-xl obsidian-inset-neutral">
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
                        className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-white/15 hover:border-white/30 text-[11px] font-bold text-white shrink-0"
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenProfileModal}
                      className="w-full py-2.5 px-3 rounded-xl obsidian-pill-active font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <Sparkles size={14} />
                      <span>
                        {hasClaimedFirstTimeParachute
                          ? 'Create Interactive Profile'
                          : 'Make Profile & Claim +1 Free 🎫'}
                      </span>
                    </button>
                  )}
                </>
              }
              footerContent={
                profile ? (
                  <>
                    <span className="italic text-zinc-300 break-words">&ldquo;{profile.motto}&rdquo;</span>
                    <span className="shrink-0">{profile.dailyGoalHours}h/day</span>
                  </>
                ) : (
                  <span>Customize your callsign, emblem SVG &amp; daily lock goal</span>
                )
              }
            />
          )}

          {/* CARD #6: Theme Studio Launcher */}
          <ObsidianCard
            asButton
            accent={profileAccentKey}
            onClick={() => setActiveSection('themes')}
            className="font-mono"
            headerClassName="p-4 flex items-center justify-between gap-3"
            footerClassName="px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400"
            headerContent={
              <>
                <div className="flex items-center gap-2.5 text-xs text-zinc-100 font-bold uppercase tracking-wider">
                  <div className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                    <Palette size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                  <span>Theme Studio</span>
                </div>
                <span className="px-2.5 py-1.5 rounded-xl obsidian-inset text-[10px] font-bold text-white uppercase shrink-0">
                  Customize &rarr;
                </span>
              </>
            }
            footerContent={
              <>
                <span>Active Theme:</span>
                <strong className="text-white uppercase">
                  {themeConfig.family === 'amoled'
                    ? `AMOLED (${themeConfig.amoledGradient})`
                    : themeConfig.family === 'kindle'
                    ? 'Paper like Kindle'
                    : 'Matte Studio'}
                </strong>
              </>
            }
          />

          {/* CARD #7: DONOR PERKS & BADGES */}
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
        </div>
      )}

      {/* SECTION 3: ANDROID OS-LEVEL ENFORCEMENT & ARCHITECTURE */}
      {activeSection === 'os_security' && (
        <div className="space-y-4">
          <ObsidianCard
            ambientGlow
            className="font-mono"
            headerClassName="p-4 space-y-2.5"
            footerClassName="px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap"
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                    <div
                      className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{ color: 'var(--accent-hex, #F59E0B)' }}
                    >
                      <Smartphone size={15} />
                    </div>
                    <span>OS PERMISSIONS &amp; SETUP</span>
                  </div>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full obsidian-inset-neutral text-zinc-300">
                    {hasNativeBridge ? (isStrictBuild ? 'STRICT APK' : 'STANDARD APK') : 'WEB PREVIEW'}
                  </span>
                </div>

                {/* 1: Core Guard — Usage Access (Standard) or Accessibility Service (Strict) */}
                {(() => {
                  const coreGranted = isStrictBuild ? isAccessibilityOn : hasUsagePerm;
                  const isBlockedNow = permissionPriority.restrictedStatus === 'blocked';
                  return (
                    <div
                      className={`rounded-xl transition-colors ${
                        hasNativeBridge && !coreGranted
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-100">
                        <span>
                          {isStrictBuild ? '1. Accessibility Service' : '1. Usage Access'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasNativeBridge && coreGranted && (
                            <button
                              type="button"
                              onClick={() => window.ZeroNative?.openAppSettingsDetails()}
                              className="text-[9px] px-2 py-0.5 rounded-full obsidian-inset-neutral text-zinc-300 hover:text-white inline-flex items-center gap-1"
                            >
                              App Info <ExternalLink size={9} />
                            </button>
                          )}
                          <span
                            className={`text-[9px] px-2 py-0.5 rounded-full border ${
                              coreGranted
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : hasNativeBridge
                                ? 'font-black'
                                : 'obsidian-inset-neutral text-zinc-400'
                            }`}
                            style={
                              hasNativeBridge && !coreGranted
                                ? {
                                    background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                                    borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                                    color: 'var(--accent-hex, #F59E0B)',
                                  }
                                : undefined
                            }
                          >
                            {hasNativeBridge
                              ? coreGranted
                                ? 'GRANTED'
                                : isBlockedNow
                                ? 'BLOCKED'
                                : 'STEP 1'
                              : isStrictBuild
                              ? 'STRICT APK ONLY'
                              : 'FOREGROUND MONITOR'}
                          </span>
                        </div>
                      </div>

                      {(!hasNativeBridge || !coreGranted) && (
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          {isStrictBuild
                            ? 'Blocks Notification pull-down, Quick Settings, Recents, Settings, and unbagged apps.'
                            : 'Select Zero-Distractions in Usage Access so The Void enforces your Bag.'}
                        </p>
                      )}

                      {hasNativeBridge && !coreGranted && (
                        <div className="space-y-2 pt-0.5">
                          <button
                            type="button"
                            onClick={() =>
                              isStrictBuild
                                ? window.ZeroNative?.openAccessibilitySettings()
                                : window.ZeroNative?.requestUsageStatsPermission()
                            }
                            className={`w-full py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider active:scale-95 transition-all ${
                              isBlockedNow
                                ? 'obsidian-inset text-zinc-100 font-bold'
                                : 'obsidian-pill-active font-black'
                            }`}
                          >
                            {isStrictBuild ? 'Enable Accessibility Service' : 'Grant Usage Access'}
                          </button>
                          <RestrictedSettingsGuideCard
                            restrictedStatus={permissionPriority.restrictedStatus}
                            isStrictBuild={isStrictBuild}
                            onOpenAppInfo={() => window.ZeroNative?.openAppSettingsDetails()}
                            compact
                          />
                        </div>
                      )}
                    </div>
                  );
                })()}

                {/* 2: SYSTEM_ALERT_WINDOW */}
                {(() => {
                  const isStep2Active =
                    hasNativeBridge && permissionPriority.coreGuardGranted && !hasOverlayPerm;
                  return (
                    <div
                      className={`rounded-xl transition-colors ${
                        isStep2Active
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-100">
                        <span>2. Display Over Other Apps</span>
                        {hasNativeBridge ? (
                          hasOverlayPerm ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                              GRANTED
                            </span>
                          ) : isStep2Active ? (
                            <span
                              className="text-[9px] px-2 py-0.5 rounded-full border font-black"
                              style={{
                                background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                                borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                                color: 'var(--accent-hex, #F59E0B)',
                              }}
                            >
                              STEP 2
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => window.ZeroNative?.requestOverlayPermission()}
                              className="px-2.5 py-1 rounded-lg obsidian-inset-neutral text-[10px] font-bold text-zinc-200 hover:text-white active:scale-95 shrink-0"
                            >
                              Allow
                            </button>
                          )
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full border obsidian-inset-neutral text-zinc-400">
                            TOPMOST LAYER
                          </span>
                        )}
                      </div>
                      {(!hasNativeBridge || isStep2Active) && (
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Allows The Void to snap back on screen over blocked apps from background services.
                        </p>
                      )}
                      {isStep2Active && (
                        <button
                          type="button"
                          onClick={() => window.ZeroNative?.requestOverlayPermission()}
                          className="w-full py-2 px-3 rounded-xl text-[11px] uppercase tracking-wider active:scale-95 transition-all obsidian-pill-active font-black"
                        >
                          Allow Display Over Other Apps
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 3: Notifications */}
                {(() => {
                  const isStep3Active =
                    hasNativeBridge &&
                    permissionPriority.coreGuardGranted &&
                    hasOverlayPerm &&
                    !hasNotifPerm;
                  return (
                    <div
                      className={`rounded-xl transition-colors ${
                        isStep3Active
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-bold text-zinc-100">
                        <span>3. Lock &amp; Schedule Alerts</span>
                        {hasNativeBridge ? (
                          hasNotifPerm ? (
                            <span className="text-[9px] px-2 py-0.5 rounded-full border bg-emerald-500/10 text-emerald-400 border-emerald-500/25">
                              GRANTED
                            </span>
                          ) : isStep3Active ? (
                            <span
                              className="text-[9px] px-2 py-0.5 rounded-full border font-black"
                              style={{
                                background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                                borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                                color: 'var(--accent-hex, #F59E0B)',
                              }}
                            >
                              OPTIONAL
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => window.ZeroNative?.requestNotificationPermission()}
                              className="px-2.5 py-1 rounded-lg obsidian-inset-neutral text-[10px] font-bold text-zinc-300 hover:text-white active:scale-95 shrink-0"
                            >
                              Allow
                            </button>
                          )
                        ) : (
                          <span className="text-[9px] px-2 py-0.5 rounded-full border obsidian-inset-neutral text-zinc-400">
                            ALERT READY
                          </span>
                        )}
                      </div>
                      {(!hasNativeBridge || isStep3Active) && (
                        <p className="text-[11px] text-zinc-400 leading-snug">
                          Live lock countdown notifications &amp; 5-minute pre-lock schedule warnings.
                        </p>
                      )}
                      {isStep3Active && (
                        <button
                          type="button"
                          onClick={() => window.ZeroNative?.requestNotificationPermission()}
                          className="w-full py-2 px-3 rounded-xl text-[11px] transition-all active:scale-95 obsidian-pill-active font-black uppercase tracking-wider"
                        >
                          Allow Notifications
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 4: LockTaskMode / Device Owner */}
                <div className="p-2.5 obsidian-inset-neutral rounded-xl space-y-1">
                  <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                    <span>4. Hardware Kiosk (Optional ADB)</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 rounded-full border ${
                        isDeviceOwner
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'obsidian-inset-neutral text-zinc-400'
                      }`}
                    >
                      {isDeviceOwner ? 'DEVICE OWNER ACTIVE' : 'OPTIONAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    With ADB Device Owner, <code>LockTaskMode</code> engages unbreakable kiosk mode while permitting Bag apps.
                  </p>
                </div>
              </>
            }
            footerContent={
              <>
                <span>
                  {permissionPriority.allRecommendedGranted
                    ? 'All Android permissions armed'
                    : 'Only open App Info -> ⋮ -> Allow restricted settings if blocked'}
                </span>
                <button
                  type="button"
                  onClick={onRefreshPermissions}
                  className="font-bold uppercase tracking-wider hover:brightness-125"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  Re-check Now
                </button>
              </>
            }
          />

          {/* Installed APK Build & Update Signing Key Diagnostic Card */}
          <ObsidianCard
            ambientGlow
            className="font-mono text-xs"
            headerClassName="p-4 space-y-2.5"
            footerClassName="px-4 py-2.5 text-[10px] leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-bold uppercase tracking-wider">
                    <div
                      className="w-7 h-7 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{
                        color:
                          appBuildInfo && !appBuildInfo.isOfficialReleaseKey
                            ? 'var(--accent-hex, #F59E0B)'
                            : '#34D399',
                      }}
                    >
                      <KeyRound size={13} />
                    </div>
                    <span>Installed Build &amp; Update Key</span>
                  </div>
                  {appBuildInfo && (
                    <span
                      className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                        appBuildInfo.isOfficialReleaseKey
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'obsidian-inset text-zinc-200'
                      }`}
                    >
                      {appBuildInfo.isOfficialReleaseKey ? 'Update Key Verified' : 'Debug / Preview Key'}
                    </span>
                  )}
                </div>

                {appBuildInfo ? (
                  <div className="p-3 rounded-xl obsidian-inset-neutral space-y-1 text-[11px]">
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
                      <span className="text-emerald-400 font-bold truncate max-w-[190px]">
                        {appBuildInfo.signingSha256 || 'Unavailable'}
                      </span>
                    </div>
                    {environmentSecurity && (
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                        <span className="text-zinc-400">Runtime Environment:</span>
                        <span
                          className={`font-bold ${
                            environmentSecurity.isCompromised ? 'text-amber-300' : 'text-emerald-400'
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
                  <div className="p-2.5 rounded-xl obsidian-inset-neutral text-[11px] text-zinc-400">
                    Permanent APK Release Key: <code className="text-emerald-400">A14A36...CE11</code> (V1+V2+V3 signed).
                  </div>
                )}
              </>
            }
            footerContent={
              appBuildInfo && !appBuildInfo.isOfficialReleaseKey ? (
                <div className="text-zinc-300">
                  This device is running an older preview/debug key build. Save a Cloud{' '}
                  <code>.zbak</code> backup in <strong>Settings</strong>,{' '}
                  <strong>Uninstall (for all users)</strong> once, and install the newest signed{' '}
                  <code>ZERO-v*.apk</code> so all future updates install cleanly in-place!
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-zinc-300">
                  <ShieldCheck size={13} className="shrink-0 mt-0.5 text-emerald-400" />
                  <span>
                    Keep updating within the same edition using a higher version code. If Android ever says &ldquo;App not installed&rdquo;, check that Chrome/Files has <strong>Install unknown apps</strong> allowed and uninstall any old duplicate copy from Work Profile / Dual Apps.
                  </span>
                </div>
              )
            }
          />

          {/* ADB Command Box */}
          <ObsidianCard
            className="font-mono text-xs"
            headerClassName="p-4 space-y-2"
            footerClassName="px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center justify-between text-zinc-200 font-bold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-7 h-7 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{ color: 'var(--accent-hex, #F59E0B)' }}
                    >
                      <Terminal size={13} />
                    </div>
                    <span>ADB Device Owner Setup (Optional)</span>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      handleCopy(
                        'adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver',
                        'adb_cmd'
                      )
                    }
                    className="text-[10px] text-zinc-200 hover:text-white flex items-center gap-1 px-2.5 py-1 rounded-lg obsidian-inset-neutral"
                  >
                    {copiedId === 'adb_cmd' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedId === 'adb_cmd' ? 'Copied' : 'Copy ADB'}</span>
                  </button>
                </div>
                <pre className="p-2.5 obsidian-inset-neutral rounded-xl text-[10px] text-zinc-200 overflow-x-auto no-scrollbar">
                  adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver
                </pre>
              </>
            }
            footerContent={
              <p>
                Also check{' '}
                <a
                  href={RELEASES_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleOpenExternal(e, RELEASES_URL)}
                  className="hover:underline font-semibold"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  GitHub Releases
                </a>{' '}
                anytime for the latest APK updates.
              </p>
            }
          />
        </div>
      )}

      {/* SECTION 4: KEEP ZERO FREE (ETHICAL SUPPORT & DONATE) */}
      {activeSection === 'support' && (
        <div className="space-y-4">
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            ambientGlow
            className="font-mono"
            headerClassName="p-5 space-y-3"
            footerClassName="px-5 py-3 flex items-center justify-between text-xs gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2.5 text-white font-bold text-sm">
                  <div className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                    <Heart size={15} className="text-red-500 fill-red-500" />
                  </div>
                  <span>THE ZERO-DISTRACTIONS PROMISE</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Zero App (Zero-Distractions) is 100% free, libre, and open-source software (FOSS). There are no paywalls,
                  no subscriptions, no analytics trackers, and no advertisements.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We believe your attention belongs to you—not to algorithms or paywalled apps.
                  Emergency Escape Tickets can never be purchased outright; earn 1 every 20 focus
                  hours, plus one-time free gifts (+1 starter on first profile, and strictly on your
                  1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}: +1 thank-you ticket &amp; Golden{' '}
                  <strong className="text-amber-300">ZERO-SUPPORTER</strong> badge).
                </p>
              </>
            }
            footerContent={
              <>
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
              </>
            }
          />

          {/* Donation Channels */}
          <div className="space-y-3">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold block">
              Support the Project
            </span>

            {/* UPI ID & Scannable QR (Best Offer • No Minimum Limit) */}
            <ObsidianCard
              accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
              ambientGlow
              className="font-mono"
              headerClassName="p-4 space-y-3"
              footerClassName="px-4 py-2.5 text-[10px] text-amber-200/90 leading-relaxed flex items-center justify-between gap-2 flex-wrap"
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                      Best Offer • Best Option
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 text-[10px] font-bold">
                      NO MINIMUM LIMIT
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center text-white font-bold text-xs shrink-0">
                        UPI
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">UPI / Instant Pay</div>
                        <div className="text-[11px] text-amber-200 truncate">{UPI_ID}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowUPIQR(!showUPIQR)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          showUPIQR
                            ? 'obsidian-pill-active font-bold'
                            : 'obsidian-inset-neutral text-zinc-300 hover:text-white'
                        }`}
                        title="Toggle QR Code"
                        aria-label="Toggle UPI QR Code"
                      >
                        <QrCode size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCopy(UPI_ID, 'upi')}
                        className="p-1.5 rounded-lg obsidian-inset-neutral text-zinc-300 hover:text-white"
                        title="Copy UPI ID"
                        aria-label="Copy UPI ID"
                      >
                        {copiedId === 'upi' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* 1st Minimum ₹50 Supporter Bonus */}
                  {!hasClaimedFirstDonationParachute ? (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-2">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-black uppercase">
                          <Gift size={13} className="text-emerald-400 shrink-0" />
                          <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 🎫 &amp; Gold Badge</span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black shrink-0">
                          Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed">
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
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 🎫 &amp; Gold)</span>
                            <ExternalLink size={12} />
                          </a>
                          {onClaimFirstDonationBonus && (
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(true)}
                              className="px-3 py-2 rounded-xl obsidian-inset-neutral border border-emerald-700/60 text-emerald-200 text-[10px] font-bold"
                            >
                              Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl obsidian-inset-neutral border border-emerald-600/60 space-y-2">
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
                              className="px-2.5 py-2 rounded-lg obsidian-inset-neutral text-zinc-300 text-[10px] font-bold"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl obsidian-inset border border-amber-500/40 flex items-center justify-between gap-2 flex-wrap text-[10px] text-emerald-300">
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
                    className="w-full py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <span>Open UPI App (Any Amount)</span>
                    <ExternalLink size={12} />
                  </a>

                  {showUPIQR && (
                    <div className="p-3.5 obsidian-inset-neutral rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      {upiQrUrl ? (
                        <div data-qr-surface="true" className="bg-white p-2 rounded-xl shadow-md">
                          <img
                            src={upiQrUrl}
                            alt={`UPI QR code for ${UPI_ID}`}
                            className="w-36 h-36 block"
                          />
                        </div>
                      ) : (
                        <div className="w-36 h-36 bg-black/70 rounded-xl flex items-center justify-center text-[10px] text-zinc-400">
                          Generating QR...
                        </div>
                      )}
                      <div className="text-[11px] font-bold text-zinc-200">{UPI_ID}</div>
                      <div className="text-[10px] text-zinc-400">
                        Scan via Google Pay, PhonePe, Paytm, or BHIM
                      </div>
                    </div>
                  )}
                </>
              }
              footerContent={
                <>
                  <span>
                    UPI has <strong>no minimum limit</strong> — tip even ₹1 with 0% platform fees.
                  </span>
                  <span className="text-amber-300 font-bold uppercase tracking-wider">Instant</span>
                </>
              }
            />

            {/* Buy Me a Coffee via Ko-fi */}
            <ObsidianCard
              accent={profileAccentKey}
              className="font-mono"
              headerClassName="p-0"
              footerClassName="px-4 py-2 text-[10px] text-zinc-400 flex items-center justify-between gap-2"
              headerContent={
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleOpenExternal(e, KOFI_URL)}
                  className="w-full p-3.5 flex items-center justify-between transition-all group active:scale-[0.98]"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                      <Coffee size={17} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-xs text-white">Buy Me a Coffee (Ko-fi)</div>
                      <div className="text-[11px] text-zinc-400 truncate">ko-fi.com/mdyousuf2620</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-zinc-400 group-hover:text-white shrink-0 ml-2" />
                </a>
              }
              footerContent={
                <>
                  <span>International &amp; card tips supported via Ko-fi</span>
                  <span className="text-amber-300 font-bold uppercase">Optional</span>
                </>
              }
            />

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
              <ObsidianCard
                accent={profileAccentKey}
                className="font-mono text-[11px]"
                headerClassName="p-3.5 flex items-center justify-between gap-2"
                headerContent={
                  <>
                    <span className="text-zinc-300">
                      Post-session tip popup blocked for{' '}
                      <strong className="text-white">{tipSkipRemaining}</strong> more completed{' '}
                      {tipSkipRemaining === 1 ? 'session' : 'sessions'}.
                    </span>
                    {onResetTipPromptBlock && (
                      <button
                        type="button"
                        onClick={onResetTipPromptBlock}
                        className="px-2.5 py-1 rounded-lg obsidian-inset-neutral text-zinc-200 hover:text-white font-bold shrink-0"
                      >
                        Unblock
                      </button>
                    )}
                  </>
                }
              />
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
          <ObsidianCard
            onSubmit={handleCreateSchedule}
            accent={profileAccentKey}
            ambientGlow
            className="w-full max-w-sm max-h-full font-mono text-left"
            headerClassName="p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
            footerClassName="p-4 space-y-2.5"
            headerContent={
              <>
                <div className="font-bold text-sm text-white">Create Recurring Schedule</div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Schedule Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Morning Focus"
                    required
                    className="w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none"
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
                        className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          newDays.includes(idx)
                            ? 'obsidian-pill-active'
                            : 'obsidian-inset-neutral text-zinc-400'
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
                      className="w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className="w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Focus Tag</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className="w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none"
                  >
                    {TAGS.map((t) => (
                      <option key={t} value={t}>
                        #{t}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            }
            footerContent={
              <>
                <div className="p-2.5 obsidian-inset-neutral rounded-xl text-[10px] text-zinc-300 flex items-center gap-1.5">
                  <Bell size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0" />
                  <span>Includes automatic 5-minute pre-lock heads-up warning</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-2.5 obsidian-pill-active rounded-xl font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Save Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="py-2.5 px-4 obsidian-inset-neutral text-zinc-300 rounded-xl text-xs font-bold hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </>
            }
          />
        </div>
      )}
    </div>
  );
};
