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
  InterfaceStyle,
  SleepFarmingMode,
  NativePermissionStatus,
  NativeAppBuildInfo,
  NativeEnvironmentSecurity,
  ZeroProfile,
  CloudAutoBackupStatus,
} from '../types';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
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
  CloudUpload,
  RefreshCw,
  Loader2,
  KeyRound,
  ShieldCheck,
  HardDrive,
  AlertTriangle,
  Sliders,
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
  interfaceStyle?: InterfaceStyle;
  onInterfaceStyleChange?: (next: InterfaceStyle) => void;
  sectionOverride?: {
    section: 'schedules' | 'themes' | 'settings' | 'os_security' | 'support';
    key: number;
  } | null;
  viewMode?: 'all' | 'settings_os' | 'support';
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
  interfaceStyle: interfaceStyleProp,
  onInterfaceStyleChange,
  sectionOverride = null,
  viewMode = 'all',
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
  const { interfaceStyle: ctxInterfaceStyle, setInterfaceStyle: ctxSetInterfaceStyle, isBespoke } =
    useInterfaceStyle();
  const activeInterfaceStyle = interfaceStyleProp ?? ctxInterfaceStyle;
  const applyInterfaceStyle = onInterfaceStyleChange ?? ctxSetInterfaceStyle;

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

  const effectiveSection =
    viewMode === 'support'
      ? 'support'
      : viewMode === 'settings_os' && activeSection === 'support'
      ? 'schedules'
      : activeSection;
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
    <div
      className={`flex flex-col px-4 py-5 max-w-md mx-auto w-full select-none pb-28 ${
        isBespoke ? 'gap-6 font-sans' : 'gap-5'
      }`}
    >
      {/* View Header */}
      {viewMode === 'support' ? (
        <div className="space-y-1">
          <h1
            className={`text-xl tracking-tight text-white flex items-center gap-2 ${
              isBespoke ? 'font-sans font-bold' : 'font-mono font-black'
            }`}
          >
            <span>KEEP ZERO FREE</span>
          </h1>
          <p className={`text-xs text-zinc-400 ${isBespoke ? 'font-sans' : 'font-mono'}`}>
            100% FOSS • Voluntary UPI / Ko-fi Support &amp; Donor Perks
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <h1
            className={`text-xl tracking-tight text-white flex items-center gap-2 ${
              isBespoke ? 'font-sans font-bold' : 'font-mono font-black'
            }`}
          >
            <span>SETTINGS &amp; OS</span>
          </h1>
          <p className={`text-xs text-zinc-400 ${isBespoke ? 'font-sans' : 'font-mono'}`}>
            Auto-Pilot Schedules, Theme Studio, Backups &amp; Android Guards
          </p>
        </div>
      )}

      {/* Sub-Navigation Bar */}
      {viewMode !== 'support' && (
        <div
          className={`grid ${
            viewMode === 'settings_os' ? 'grid-cols-4' : 'grid-cols-5'
          } gap-1 p-1 ${
            isBespoke
              ? 'bg-black border border-neutral-800 rounded-md text-[11px] font-sans'
              : 'obsidian-shell-bar rounded-2xl text-[10px] font-mono'
          }`}
        >
          <button
            onClick={() => setActiveSection('schedules')}
            className={`py-2 truncate px-1 ${
              isBespoke
                ? `rounded-sm transition-colors duration-75 ${
                    effectiveSection === 'schedules'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white font-medium'
                  }`
                : `rounded-xl transition-all font-semibold ${
                    effectiveSection === 'schedules'
                      ? 'obsidian-pill-active font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
            }`}
          >
            Schedules
          </button>
          <button
            onClick={() => setActiveSection('themes')}
            className={`py-2 truncate px-1 ${
              isBespoke
                ? `rounded-sm transition-colors duration-75 ${
                    effectiveSection === 'themes'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white font-medium'
                  }`
                : `rounded-xl transition-all font-semibold ${
                    effectiveSection === 'themes'
                      ? 'obsidian-pill-active font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
            }`}
          >
            Themes
          </button>
          <button
            onClick={() => setActiveSection('settings')}
            className={`py-2 truncate px-1 ${
              isBespoke
                ? `rounded-sm transition-colors duration-75 ${
                    effectiveSection === 'settings'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white font-medium'
                  }`
                : `rounded-xl transition-all font-semibold ${
                    effectiveSection === 'settings'
                      ? 'obsidian-pill-active font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
            }`}
          >
            Settings
          </button>
          <button
            onClick={() => setActiveSection('os_security')}
            className={`py-2 truncate px-1 ${
              isBespoke
                ? `rounded-sm transition-colors duration-75 ${
                    effectiveSection === 'os_security'
                      ? 'bg-blue-600 text-white font-semibold'
                      : 'text-neutral-400 hover:text-white font-medium'
                  }`
                : `rounded-xl transition-all font-semibold ${
                    effectiveSection === 'os_security'
                      ? 'obsidian-pill-active font-black'
                      : 'text-zinc-400 hover:text-zinc-200'
                  }`
            }`}
          >
            OS
          </button>
          {viewMode === 'all' && (
            <button
              onClick={() => setActiveSection('support')}
              className={`py-2 truncate px-1 ${
                isBespoke
                  ? `rounded-sm transition-colors duration-75 ${
                      effectiveSection === 'support'
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'text-neutral-400 hover:text-white font-medium'
                    }`
                  : `rounded-xl transition-all font-semibold ${
                      effectiveSection === 'support'
                        ? 'obsidian-pill-active font-black'
                        : 'text-zinc-400 hover:text-zinc-200'
                    }`
              }`}
            >
              Support
            </button>
          )}
        </div>
      )}

      {/* SECTION 0: THEME SETTINGS (THEME STUDIO + RUNTIME INTERFACE STYLE SWITCHER) */}
      {effectiveSection === 'themes' && (
        <div className={isBespoke ? 'space-y-5' : 'space-y-4'}>
          <ThemeSelectorCard
            themeConfig={themeConfig}
            onChange={onThemeConfigChange}
          />
          <ObsidianCard
            accent={profileAccentKey}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-4 text-xs text-zinc-300 leading-relaxed' : 'p-3.5 text-[11px] text-zinc-300 leading-relaxed'}
            footerClassName={isBespoke ? 'px-4 py-2.5 flex items-center justify-between text-[11px] text-zinc-400' : 'px-3.5 py-2 flex items-center justify-between text-[10px] text-zinc-400'}
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
                <span className="text-zinc-300 font-semibold">JSON &amp; Auto-Saved</span>
              </>
            }
          />

          {/* Dedicated Runtime Switcher Card at the bottom of Theme Settings */}
          <ObsidianCard
            accent={profileAccentKey}
            ambientGlow={!isBespoke}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-5 space-y-4' : 'p-4 sm:p-5 space-y-3'}
            footerClassName={
              isBespoke
                ? 'px-5 py-3 flex items-center justify-between gap-2 text-[11px] text-zinc-400'
                : 'px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <Sliders
                        size={15}
                        style={{ color: 'var(--accent-hex, var(--zero-accent))' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <h2 className="text-xs text-white font-semibold uppercase tracking-wider">
                        Interface Style
                      </h2>
                      <p className="text-[11px] text-zinc-400 truncate">
                        Instant runtime visual engine switcher
                      </p>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                      isBespoke
                        ? 'rounded-sm border-blue-500/50 bg-blue-600/15 text-blue-300'
                        : 'rounded-full obsidian-pill-active font-black'
                    }`}
                  >
                    {activeInterfaceStyle === 'bespoke' ? 'Bespoke' : 'Classic'}
                  </span>
                </div>

                <div role="radiogroup" aria-label="Interface Style" className="space-y-2.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'classic'}
                    onClick={() => applyInterfaceStyle('classic')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'classic'
                              ? 'bg-neutral-950 border-blue-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'classic'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Classic UI (Default)</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Frosted Obsidian layout style with specular highlights, pill geometry, gradient badges, and ambient glows.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'classic'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'classic' && <Check size={11} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'bespoke'}
                    onClick={() => applyInterfaceStyle('bespoke')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'bespoke'
                              ? 'bg-neutral-950 border-blue-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'bespoke'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Bespoke Minimalist</span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Pure AMOLED #000000 canvas, 1px neutral structural borders, sans typography with tabular telemetry, and instant mechanical controls.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'bespoke'
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'bespoke' && <Check size={11} />}
                    </div>
                  </button>
                </div>
              </>
            }
            footerContent={
              <>
                <span>Applies instantaneously — no restart required</span>
                <span className="text-zinc-300 font-semibold">Saved Locally &amp; Native</span>
              </>
            }
          />
        </div>
      )}

      {/* SECTION 1: AUTO-PILOT RECURRING SCHEDULES */}
      {effectiveSection === 'schedules' && (
        <div className={isBespoke ? 'space-y-5' : 'space-y-4'}>
          <div className="flex items-center justify-between">
            <span
              className={`text-xs uppercase tracking-wider text-zinc-400 font-bold ${
                isBespoke ? 'font-sans' : 'font-mono'
              }`}
            >
              Recurring Schedules (<span className="font-mono tabular-nums">{schedules.length}</span>)
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className={`px-3 py-1.5 font-semibold text-xs flex items-center gap-1.5 ${
                isBespoke
                  ? 'rounded-md bg-blue-600 hover:bg-blue-500 text-white border border-blue-500 transition-colors duration-75 font-sans'
                  : 'obsidian-pill-active font-mono font-black rounded-xl active:scale-95 transition-all'
              }`}
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>

          {/* Schedule List */}
          <div className={isBespoke ? 'space-y-4' : 'space-y-3'}>
            {schedules.map((sched) => (
              <ObsidianCard
                key={sched.id}
                accent={profileAccentKey}
                className={`${isBespoke ? 'font-sans' : 'font-mono'} ${sched.isEnabled ? '' : 'opacity-65'}`}
                headerClassName={isBespoke ? 'p-5' : 'p-4'}
                footerClassName={
                  isBespoke
                    ? 'px-5 py-3 flex items-center justify-between text-[11px] text-zinc-400'
                    : 'px-4 py-2.5 flex items-center justify-between text-[11px] text-zinc-400'
                }
                headerContent={
                  <>
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-semibold text-sm text-zinc-100 flex items-center gap-2 flex-wrap">
                          <span>{sched.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 text-zinc-300 ${
                              isBespoke
                                ? 'rounded-sm bg-neutral-950 border border-neutral-800'
                                : 'rounded obsidian-inset-neutral'
                            }`}
                          >
                            #{sched.tag}
                          </span>
                        </div>
                        <div className="text-xs font-mono tabular-nums text-zinc-400 mt-1">
                          {sched.startTime} – {sched.endTime}
                        </div>
                      </div>

                      {/* Mechanical Switch */}
                      <button
                        onClick={() => onToggleSchedule(sched.id)}
                        aria-label={`Toggle ${sched.name}`}
                        style={
                          sched.isEnabled
                            ? isBespoke
                              ? {
                                  backgroundColor: '#2563EB',
                                  borderColor: '#3B82F6',
                                }
                              : {
                                  background:
                                    'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
                                  borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.75)',
                                }
                            : undefined
                        }
                        className={`relative border shrink-0 ${
                          isBespoke
                            ? `w-11 h-6 rounded-sm transition-colors duration-75 ${
                                sched.isEnabled
                                  ? ''
                                  : 'bg-neutral-950 border-neutral-700'
                              }`
                            : `w-12 h-6 rounded-full transition-colors ${
                                sched.isEnabled
                                  ? ''
                                  : 'obsidian-inset-neutral'
                              }`
                        }`}
                      >
                        <div
                          style={
                            sched.isEnabled
                              ? {
                                  backgroundColor: isBespoke
                                    ? '#FFFFFF'
                                    : 'var(--accent-badge-text, #09090B)',
                                }
                              : undefined
                          }
                          className={`w-4 h-4 transform ${
                            isBespoke
                              ? `rounded-sm transition-transform duration-75 ${
                                  sched.isEnabled
                                    ? 'translate-x-5'
                                    : 'translate-x-1 bg-neutral-500'
                                }`
                              : `rounded-full transition-transform ${
                                  sched.isEnabled
                                    ? 'translate-x-6'
                                    : 'translate-x-1 bg-zinc-500'
                                }`
                          }`}
                        />
                      </button>
                    </div>

                    {/* Days of Week Indicators */}
                    <div className="flex gap-1.5 mt-3 flex-wrap">
                      {DAYS_OF_WEEK.map((day, idx) => (
                        <span
                          key={day}
                          className={`text-[10px] px-2 py-0.5 ${
                            isBespoke
                              ? `rounded-sm font-sans font-semibold border ${
                                  sched.days.includes(idx)
                                    ? 'bg-blue-600 text-white border-blue-500'
                                    : 'bg-neutral-950 text-neutral-500 border-neutral-800'
                                }`
                              : `rounded-md font-mono ${
                                  sched.days.includes(idx)
                                    ? 'obsidian-pill-active font-black'
                                    : 'obsidian-inset-neutral text-zinc-500'
                                }`
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

      {/* SECTION 2: BACKUP & RESTORE EVERYTHING, DISCIPLINE RULES & PROFILE */}
      {effectiveSection === 'settings' && (
        <div className={isBespoke ? 'space-y-5' : 'space-y-4'}>
          {/* CONSOLIDATED CARD #1: BACKUP & RESTORE EVERYTHING */}
          <ObsidianCard
            accent={profileAccentKey}
            ambientGlow={!isBespoke}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
            footerClassName={
              isBespoke
                ? 'px-5 py-3 text-[11px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
                : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={`w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <HardDrive size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-white font-semibold uppercase tracking-wider">
                        Backup and Restore Everything
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Auto-saves on session start &amp; end • .ZBAK &amp; .JSON
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                      isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                    } ${
                      cloudBackupStatus?.enabled
                        ? 'bg-emerald-950/60 border-emerald-500/60 text-emerald-300'
                        : 'obsidian-inset-neutral text-zinc-300'
                    }`}
                  >
                    {cloudBackupStatus?.enabled ? 'Auto-Sync ON' : 'Manual'}
                  </span>
                </div>

                {/* Required Cloud Upload Warning Banner */}
                <div
                  className={`p-3 border flex items-start gap-2.5 ${
                    isBespoke
                      ? 'rounded-md bg-neutral-950 border-amber-500/40 text-zinc-200'
                      : 'rounded-xl bg-amber-950/45 border-amber-500/60 text-amber-100'
                  }`}
                >
                  <AlertTriangle size={15} className="text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px] leading-relaxed">
                    <div className="font-semibold text-amber-300 uppercase tracking-wide">
                      Make sure to upload everything in cloud.
                    </div>
                    <div className={isBespoke ? 'text-zinc-400' : 'text-amber-100/85'}>
                      Auto-Sync saves locally to Device Storage when sessions start or end. Use{' '}
                      <strong className="text-zinc-200">1-Tap Upload (.zbak)</strong> below to send a copy to Drive, OneDrive, or JioDrive.
                    </div>
                  </div>
                </div>

                {/* Auto-Sync Storage File Status */}
                <div
                  className={`p-3 obsidian-inset-neutral space-y-1.5 text-[11px] ${
                    isBespoke ? 'rounded-md' : 'rounded-xl text-[10px]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Storage Sync File:</span>
                    <span className="text-white font-semibold truncate font-mono">
                      {cloudBackupStatus?.enabled
                        ? `${cloudBackupStatus.providerLabel || 'Device Storage'} • ${
                            cloudBackupStatus.displayName || 'zero-backup.zbak'
                          }`
                        : 'Not set (create once to auto-sync)'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Last Backup Saved:</span>
                    <span className="text-zinc-200 font-semibold truncate font-mono tabular-nums">
                      {cloudBackupStatus?.lastBackupTimestamp &&
                      cloudBackupStatus.lastBackupTimestamp > 0
                        ? new Date(cloudBackupStatus.lastBackupTimestamp).toLocaleString()
                        : 'No backup created yet'}
                    </span>
                  </div>
                </div>

                {cloudBackupStatus?.lastError && (
                  <div
                    className={`p-2.5 bg-amber-950/50 border border-amber-700/80 text-amber-200 text-[11px] ${
                      isBespoke ? 'rounded-md' : 'rounded-xl text-[10px]'
                    }`}
                  >
                    {cloudBackupStatus.lastError}
                  </div>
                )}

                {restoreDisabled && (
                  <div
                    className={`p-2.5 bg-amber-950/60 border border-amber-500/70 text-amber-200 text-[11px] leading-relaxed flex items-start gap-2 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl text-[10px]'
                    }`}
                  >
                    <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Integrity Protection Active:</strong> Root access, custom test-keys ROM, or debug emulator detected. Backup restore is disabled; manual exports remain active.
                    </span>
                  </div>
                )}

                {(cloudNotice || backupNotice) && (
                  <div
                    className={`p-2.5 text-[11px] border ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    } ${
                      (cloudNotice || backupNotice)!.ok
                        ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
                        : 'bg-red-950/50 border-red-700 text-red-200'
                    }`}
                  >
                    {(cloudNotice || backupNotice)!.message}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zbak,.json,application/json,application/octet-stream,*/*"
                  onChange={handleFileRestore}
                  className="hidden"
                />

                {/* Auto-Sync File Setup / Controls */}
                {onEnableCloudAutoBackup && (
                  <>
                    {!cloudBackupStatus?.enabled ? (
                      <button
                        type="button"
                        disabled={isCloudBusy}
                        onClick={async () => {
                          setBackupNotice(null);
                          const res = await onEnableCloudAutoBackup();
                          if (!res.cancelled) {
                            setCloudNotice({ ok: res.ok, message: res.message });
                          }
                        }}
                        className={`w-full py-2.5 px-3 obsidian-pill-active font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 ${
                          isBespoke
                            ? 'rounded-md transition-colors duration-75'
                            : 'rounded-xl font-black active:scale-95 transition-all'
                        }`}
                      >
                        {isCloudBusy ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <HardDrive size={14} />
                        )}
                        <span>Create Auto-Sync File in Storage</span>
                      </button>
                    ) : (
                      <div className="grid grid-cols-3 gap-2">
                        {onSyncCloudBackupNow && (
                          <button
                            type="button"
                            disabled={isCloudBusy}
                            onClick={async () => {
                              setBackupNotice(null);
                              const res = await onSyncCloudBackupNow();
                              setCloudNotice(res);
                            }}
                            className={`py-2 px-2 obsidian-pill-active font-semibold text-[10px] uppercase flex items-center justify-center gap-1 disabled:opacity-60 ${
                              isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-black'
                            }`}
                          >
                            <RefreshCw size={11} className={isCloudBusy ? 'animate-spin' : ''} />
                            <span>Sync Now</span>
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isCloudBusy}
                          onClick={async () => {
                            setBackupNotice(null);
                            const res = await onEnableCloudAutoBackup();
                            if (!res.cancelled) {
                              setCloudNotice({ ok: res.ok, message: res.message });
                            }
                          }}
                          className={`py-2 px-2 obsidian-inset-neutral hover:border-white/30 text-white font-semibold text-[10px] uppercase ${
                            isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                          }`}
                        >
                          Change File
                        </button>
                        {onDisableCloudAutoBackup && (
                          <button
                            type="button"
                            disabled={isCloudBusy}
                            onClick={async () => {
                              setBackupNotice(null);
                              await onDisableCloudAutoBackup();
                              setCloudNotice({
                                ok: true,
                                message: 'Automatic storage sync turned off. Weekly 7-day upload reminder re-armed.',
                              });
                            }}
                            className={`py-2 px-2 bg-zinc-950 border border-red-900/70 text-red-400 hover:text-red-300 font-semibold text-[10px] uppercase ${
                              isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                            }`}
                          >
                            Turn Off
                          </button>
                        )}
                      </div>
                    )}
                  </>
                )}

                {/* 1-Tap Upload to Cloud Apps */}
                {onOneTapCloudUpload && (
                  <button
                    type="button"
                    disabled={isCloudBusy}
                    onClick={async () => {
                      setBackupNotice(null);
                      const res = await onOneTapCloudUpload();
                      if (!res.cancelled) {
                        setCloudNotice({ ok: res.ok, message: res.message });
                      }
                    }}
                    className={`w-full py-2.5 px-3 obsidian-inset hover:border-white/30 text-white font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-60 ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl font-black active:scale-95 transition-all'
                    }`}
                  >
                    <CloudUpload size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    <span>1-Tap Upload (.zbak) to Cloud</span>
                  </button>
                )}

                {/* Manual File Restore Buttons */}
                <div className={hasNativeBridge && onRestoreFromCloudPicker ? 'grid grid-cols-2 gap-2' : ''}>
                  {hasNativeBridge && onRestoreFromCloudPicker && (
                    <button
                      type="button"
                      disabled={isCloudBusy || restoreDisabled}
                      onClick={async () => {
                        setCloudNotice(null);
                        const res = await onRestoreFromCloudPicker();
                        if (res.ok) {
                          setBackupNotice({ ok: true, message: res.message });
                          onRestoreSuccess?.();
                        } else if (!res.cancelled) {
                          setBackupNotice({ ok: false, message: res.message });
                        }
                      }}
                      className={`p-2.5 obsidian-inset text-white font-semibold flex items-center justify-center gap-1.5 text-[11px] disabled:opacity-45 disabled:cursor-not-allowed ${
                        isBespoke
                          ? 'rounded-md transition-colors duration-75'
                          : 'rounded-xl font-bold active:scale-95 transition-all'
                      }`}
                    >
                      <Upload size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                      <span>Restore File Picker</span>
                    </button>
                  )}

                  <button
                    type="button"
                    disabled={restoreDisabled}
                    onClick={() => fileInputRef.current?.click()}
                    className={`${
                      hasNativeBridge && onRestoreFromCloudPicker ? '' : 'w-full'
                    } p-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-200 font-semibold flex items-center justify-center gap-1.5 text-[11px] disabled:opacity-45 disabled:cursor-not-allowed ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl font-bold active:scale-95 transition-all'
                    }`}
                  >
                    <Upload size={13} />
                    <span>
                      {hasNativeBridge && onRestoreFromCloudPicker
                        ? 'Browse Device File'
                        : 'Restore .ZBAK / .JSON File'}
                    </span>
                  </button>
                </div>

                {/* Manual Export Buttons (.ZBAK + .JSON) */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCloudNotice(null);
                      if (onExportZbakData) {
                        onExportZbakData();
                      } else {
                        onExportData();
                      }
                      setBackupNotice({
                        ok: true,
                        message: hasNativeBridge
                          ? 'Signed zero-backup.zbak created. Choose Files, Drive, OneDrive, or JioDrive.'
                          : 'Signed .zbak backup file downloaded.',
                      });
                    }}
                    className={`p-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-100 font-semibold flex items-center justify-center gap-1.5 text-[11px] ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl font-bold active:scale-95 transition-all'
                    }`}
                  >
                    <Download size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    <span>Export .ZBAK</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCloudNotice(null);
                      onExportData();
                      setBackupNotice({
                        ok: true,
                        message: hasNativeBridge
                          ? 'JSON backup generated. Choose Save to Files / Drive or Share.'
                          : 'Backup .json file downloaded.',
                      });
                    }}
                    className={`p-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-200 font-semibold flex items-center justify-center gap-1.5 text-[11px] ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl font-bold active:scale-95 transition-all'
                    }`}
                  >
                    <Download size={13} />
                    <span>Export .JSON</span>
                  </button>
                </div>

                {/* Clipboard Copy (.ZBAK / .JSON) + Paste Text Restore */}
                <div className="grid grid-cols-3 gap-1.5">
                  {onBuildZbakString && (
                    <button
                      type="button"
                      onClick={() => {
                        setCloudNotice(null);
                        handleCopy(onBuildZbakString(), 'backup_zbak');
                        setBackupNotice({
                          ok: true,
                          message: 'Signed ZBAK1 token copied to clipboard.',
                        });
                      }}
                      className={`py-2 px-2 obsidian-inset-neutral hover:border-white/25 text-[10px] text-zinc-200 flex items-center justify-center gap-1 font-semibold ${
                        isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                      }`}
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
                      setCloudNotice(null);
                      handleCopy(onBuildBackupJson(), 'backup_json');
                      setBackupNotice({
                        ok: true,
                        message: 'Full JSON backup copied to clipboard.',
                      });
                    }}
                    className={`py-2 px-2 obsidian-inset-neutral hover:border-white/25 text-[10px] text-zinc-200 flex items-center justify-center gap-1 font-semibold ${
                      isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                    }`}
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
                    className={`py-2 px-2 text-[10px] font-semibold flex items-center justify-center truncate disabled:opacity-45 disabled:cursor-not-allowed ${
                      isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                    } ${
                      showPasteRestore
                        ? 'obsidian-pill-active font-bold'
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
                      className={`w-full obsidian-input font-mono p-2.5 text-[11px] outline-none ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handlePasteRestore}
                      className={`w-full py-2.5 obsidian-pill-active font-semibold text-xs uppercase tracking-wider ${
                        isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-black'
                      }`}
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
                      setCloudNotice(null);
                      onResetData();
                      setBackupNotice({ ok: true, message: 'All data reset cleanly to Zero.' });
                    }
                  }}
                  className={`w-full p-2.5 bg-black/75 border border-red-950/90 hover:border-red-700 text-red-400 hover:text-red-300 flex items-center justify-center gap-2 text-xs ${
                    isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl transition-colors'
                  }`}
                >
                  <RotateCcw size={13} />
                  <span>Factory Reset App State</span>
                </button>
              </>
            }
            footerContent={
              <>
                <span>
                  Saves stats, Escape Tickets, donor badges, bags, schedules, widgets &amp; theme.
                </span>
                <span className="font-semibold text-zinc-300 font-mono">SHA-256 .ZBAK &amp; .JSON</span>
              </>
            }
          />

          {/* CARD #2: ANTI-SLEEP-FARMING RULE CARD */}
          <ObsidianCard
            accent={profileAccentKey}
            ambientGlow={!isBespoke}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName="p-5 space-y-3.5"
            footerClassName="px-5 py-3 text-[11px] text-zinc-400 leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-white font-semibold text-sm">
                    <div
                      className={`w-7 h-7 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <Moon size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <span>ANTI-SLEEP-FARMING RULE</span>
                  </div>
                  <span
                    className={`text-[10px] uppercase px-2 py-0.5 obsidian-inset text-white font-semibold ${
                      isBespoke ? 'rounded-sm' : 'rounded-full font-bold'
                    }`}
                  >
                    Integrity
                  </span>
                </div>

                <div className="space-y-2.5 pt-1">
                  <label className="text-[11px] uppercase tracking-wider text-zinc-400 font-semibold block">
                    Select Escape Ticket Rate for #Sleep:
                  </label>

                  {/* Option 1: 0.25x Credit (Recommended) */}
                  <button
                    type="button"
                    onClick={() => onSleepFarmingModeChange('quarter_credit')}
                    className={`w-full p-3.5 text-left text-xs flex items-start justify-between ${
                      isBespoke
                        ? `rounded-md transition-colors duration-75 ${
                            sleepFarmingMode === 'quarter_credit'
                              ? 'bg-neutral-950 border border-blue-500 text-white'
                              : 'bg-black border border-neutral-800 text-neutral-400 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            sleepFarmingMode === 'quarter_credit'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div>
                      <div className="font-semibold flex items-center gap-2 text-zinc-100">
                        <span>
                          <span className="font-mono tabular-nums">0.25x</span> Sleep Ticket Credit
                        </span>
                        <span
                          className={`text-[9px] obsidian-pill-active px-1.5 py-0.5 uppercase ${
                            isBespoke ? 'rounded-sm font-semibold' : 'rounded font-black'
                          }`}
                        >
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
                    className={`w-full p-3.5 text-left text-xs flex items-start justify-between ${
                      isBespoke
                        ? `rounded-md transition-colors duration-75 ${
                            sleepFarmingMode === 'daytime_only'
                              ? 'bg-neutral-950 border border-blue-500 text-white'
                              : 'bg-black border border-neutral-800 text-neutral-400 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            sleepFarmingMode === 'daytime_only'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">
                        Daytime Focus Only (<span className="font-mono tabular-nums">0.0x</span> Sleep Credit)
                      </div>
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
                    className={`w-full p-3.5 text-left text-xs flex items-start justify-between ${
                      isBespoke
                        ? `rounded-md transition-colors duration-75 ${
                            sleepFarmingMode === 'full_credit'
                              ? 'bg-neutral-950 border border-blue-500 text-white'
                              : 'bg-black border border-neutral-800 text-neutral-400 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            sleepFarmingMode === 'full_credit'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-zinc-100">
                        Full <span className="font-mono tabular-nums">1.0x</span> Credit (Relaxed)
                      </div>
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
            className={`${isBespoke ? 'font-sans' : 'font-mono'} text-xs`}
            headerClassName={isBespoke ? 'p-5 space-y-2' : 'p-4 space-y-2'}
            footerClassName={isBespoke ? 'px-5 py-3 text-[11px] text-zinc-300 leading-relaxed' : 'px-4 py-2.5 text-[11px] text-zinc-300 leading-relaxed'}
            headerContent={
              <>
                <div className="flex items-center gap-2 text-zinc-200 font-semibold uppercase tracking-wider">
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
              className={isBespoke ? 'font-sans' : 'font-mono'}
              headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
              footerClassName={isBespoke ? 'px-5 py-2.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400' : 'px-4 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400'}
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-100 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                      <span>Interactive Zero Profile</span>
                    </span>
                    {!hasClaimedFirstTimeParachute && (
                      <span
                        className={`text-[9px] font-semibold uppercase px-2 py-0.5 obsidian-pill-active ${
                          isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                        }`}
                      >
                        +1 Free 🎫 Gift
                      </span>
                    )}
                  </div>

                  {profile ? (
                    <div
                      className={`flex items-center justify-between gap-3 p-3 obsidian-inset-neutral ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <ProfileAvatar
                          avatarId={profile.avatarId}
                          accent={profile.accentColor}
                          size="sm"
                          interactive={!isBespoke}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-semibold text-white truncate">
                              {profile.displayName} ({profile.handle})
                            </span>
                            {supporterBadgeUnlocked && <ZeroSupporterGoldenBadge compact />}
                          </div>
                          <div
                            className={`text-[11px] truncate ${
                              isBespoke
                                ? 'text-blue-400'
                                : (ACCENT_STYLES[profile.accentColor] || ACCENT_STYLES.amber).text
                            }`}
                          >
                            #{profile.primaryMission} •{' '}
                            <span className="font-mono tabular-nums">{profile.dailyGoalHours}h</span>/day target
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={onOpenProfileModal}
                        className={`px-3 py-1.5 bg-zinc-900 border border-white/15 hover:border-white/30 text-[11px] font-semibold text-white shrink-0 ${
                          isBespoke ? 'rounded-md border-neutral-800 bg-neutral-950 transition-colors duration-75' : 'rounded-lg font-bold'
                        }`}
                      >
                        Edit
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={onOpenProfileModal}
                      className={`w-full py-2.5 px-3 obsidian-pill-active font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                        isBespoke
                          ? 'rounded-md transition-colors duration-75'
                          : 'rounded-xl font-black active:scale-95 transition-all'
                      }`}
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
                    <span className="shrink-0 font-mono tabular-nums">{profile.dailyGoalHours}h/day</span>
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
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-5 flex items-center justify-between gap-3' : 'p-4 flex items-center justify-between gap-3'}
            footerClassName={isBespoke ? 'px-5 py-2.5 flex items-center justify-between text-[11px] text-zinc-400' : 'px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400'}
            headerContent={
              <>
                <div className="flex items-center gap-2.5 text-xs text-zinc-100 font-semibold uppercase tracking-wider">
                  <div
                    className={`w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
                    <Palette size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                  <span>Theme Studio &amp; Interface Style</span>
                </div>
                <span
                  className={`px-2.5 py-1.5 obsidian-inset text-[10px] font-semibold text-white uppercase shrink-0 ${
                    isBespoke ? 'rounded-md' : 'rounded-xl font-bold'
                  }`}
                >
                  Customize &rarr;
                </span>
              </>
            }
            footerContent={
              <>
                <span>
                  {activeInterfaceStyle === 'classic'
                    ? 'Classic UI (Default)'
                    : 'Bespoke Minimalist'}
                </span>
                <strong className="text-white uppercase font-mono">
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
      {effectiveSection === 'os_security' && (
        <div className={isBespoke ? 'space-y-5' : 'space-y-4'}>
          <ObsidianCard
            ambientGlow={!isBespoke}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-5 space-y-3' : 'p-4 space-y-2.5'}
            footerClassName={
              isBespoke
                ? 'px-5 py-3 text-[11px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
                : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                    <div
                      className={`w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                      style={{ color: 'var(--accent-hex, #F59E0B)' }}
                    >
                      <Smartphone size={15} />
                    </div>
                    <span>OS PERMISSIONS &amp; SETUP</span>
                  </div>
                  <span
                    className={`text-[10px] px-2.5 py-0.5 obsidian-inset-neutral text-zinc-300 ${
                      isBespoke ? 'rounded-sm font-mono' : 'rounded-full'
                    }`}
                  >
                    {hasNativeBridge ? (isStrictBuild ? 'STRICT APK' : 'STANDARD APK') : 'WEB PREVIEW'}
                  </span>
                </div>

                {/* 1: Core Guard — Usage Access (Standard) or Accessibility Service (Strict) */}
                {(() => {
                  const coreGranted = isStrictBuild ? isAccessibilityOn : hasUsagePerm;
                  const isBlockedNow = permissionPriority.restrictedStatus === 'blocked';
                  return (
                    <div
                      className={`${isBespoke ? 'rounded-md' : 'rounded-xl'} transition-colors ${
                        hasNativeBridge && !coreGranted
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-100">
                        <span>
                          {isStrictBuild ? '1. Accessibility Service' : '1. Usage Access'}
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {hasNativeBridge && coreGranted && (
                            <button
                              type="button"
                              onClick={() => window.ZeroNative?.openAppSettingsDetails()}
                              className={`text-[9px] px-2 py-0.5 obsidian-inset-neutral text-zinc-300 hover:text-white inline-flex items-center gap-1 ${
                                isBespoke ? 'rounded-sm' : 'rounded-full'
                              }`}
                            >
                              App Info <ExternalLink size={9} />
                            </button>
                          )}
                          <span
                            className={`text-[9px] px-2 py-0.5 border font-mono ${
                              isBespoke ? 'rounded-sm' : 'rounded-full'
                            } ${
                              coreGranted
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                                : hasNativeBridge
                                ? 'font-bold'
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
                            className={`w-full py-2 px-3 text-[11px] uppercase tracking-wider ${
                              isBespoke
                                ? 'rounded-md transition-colors duration-75'
                                : 'rounded-xl active:scale-95 transition-all'
                            } ${
                              isBlockedNow
                                ? 'obsidian-inset text-zinc-100 font-semibold'
                                : 'obsidian-pill-active font-bold'
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
                      className={`${isBespoke ? 'rounded-md' : 'rounded-xl'} transition-colors ${
                        isStep2Active
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-100">
                        <span>2. Display Over Other Apps</span>
                        {hasNativeBridge ? (
                          hasOverlayPerm ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 font-mono ${
                                isBespoke ? 'rounded-sm' : 'rounded-full'
                              }`}
                            >
                              GRANTED
                            </span>
                          ) : isStep2Active ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border font-bold font-mono ${
                                isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                              }`}
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
                              className={`px-2.5 py-1 obsidian-inset-neutral text-[10px] font-semibold text-zinc-200 hover:text-white shrink-0 ${
                                isBespoke ? 'rounded-sm transition-colors duration-75' : 'rounded-lg font-bold active:scale-95'
                              }`}
                            >
                              Allow
                            </button>
                          )
                        ) : (
                          <span
                            className={`text-[9px] px-2 py-0.5 border obsidian-inset-neutral text-zinc-400 font-mono ${
                              isBespoke ? 'rounded-sm' : 'rounded-full'
                            }`}
                          >
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
                          className={`w-full py-2 px-3 text-[11px] uppercase tracking-wider obsidian-pill-active font-bold ${
                            isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-black active:scale-95 transition-all'
                          }`}
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
                      className={`${isBespoke ? 'rounded-md' : 'rounded-xl'} transition-colors ${
                        isStep3Active
                          ? 'p-3 obsidian-inset space-y-2'
                          : 'p-2.5 obsidian-inset-neutral space-y-1'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 text-xs font-semibold text-zinc-100">
                        <span>3. Lock &amp; Schedule Alerts</span>
                        {hasNativeBridge ? (
                          hasNotifPerm ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border bg-emerald-500/10 text-emerald-400 border-emerald-500/25 font-mono ${
                                isBespoke ? 'rounded-sm' : 'rounded-full'
                              }`}
                            >
                              GRANTED
                            </span>
                          ) : isStep3Active ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border font-bold font-mono ${
                                isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                              }`}
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
                              className={`px-2.5 py-1 obsidian-inset-neutral text-[10px] font-semibold text-zinc-300 hover:text-white shrink-0 ${
                                isBespoke ? 'rounded-sm transition-colors duration-75' : 'rounded-lg font-bold active:scale-95'
                              }`}
                            >
                              Allow
                            </button>
                          )
                        ) : (
                          <span
                            className={`text-[9px] px-2 py-0.5 border obsidian-inset-neutral text-zinc-400 font-mono ${
                              isBespoke ? 'rounded-sm' : 'rounded-full'
                            }`}
                          >
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
                          className={`w-full py-2 px-3 text-[11px] obsidian-pill-active font-bold uppercase tracking-wider ${
                            isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-black transition-all active:scale-95'
                          }`}
                        >
                          Allow Notifications
                        </button>
                      )}
                    </div>
                  );
                })()}

                {/* 4: LockTaskMode / Device Owner */}
                <div
                  className={`p-2.5 obsidian-inset-neutral space-y-1 ${
                    isBespoke ? 'rounded-md' : 'rounded-xl'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-semibold text-zinc-100">
                    <span>4. Hardware Kiosk (Optional ADB)</span>
                    <span
                      className={`text-[9px] px-2 py-0.5 border font-mono ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        isDeviceOwner
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                          : 'obsidian-inset-neutral text-zinc-400'
                      }`}
                    >
                      {isDeviceOwner ? 'DEVICE OWNER ACTIVE' : 'OPTIONAL'}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 leading-snug">
                    With ADB Device Owner, <code className="font-mono">LockTaskMode</code> engages unbreakable kiosk mode while permitting Bag apps.
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
                  className="font-semibold uppercase tracking-wider hover:brightness-125"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  Re-check Now
                </button>
              </>
            }
          />

          {/* Installed APK Build & Update Signing Key Diagnostic Card */}
          <ObsidianCard
            ambientGlow={!isBespoke}
            className={`${isBespoke ? 'font-sans' : 'font-mono'} text-xs`}
            headerClassName={isBespoke ? 'p-5 space-y-3' : 'p-4 space-y-2.5'}
            footerClassName={isBespoke ? 'px-5 py-3 text-[11px] leading-relaxed' : 'px-4 py-2.5 text-[10px] leading-relaxed'}
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-white font-semibold uppercase tracking-wider">
                    <div
                      className={`w-7 h-7 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
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
                      className={`text-[9px] font-semibold uppercase px-2 py-0.5 border font-mono ${
                        isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                      } ${
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
                  <div
                    className={`p-3 obsidian-inset-neutral space-y-1.5 text-[11px] ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Installed Version:</span>
                      <span className="text-white font-bold font-mono tabular-nums">
                        v{appBuildInfo.versionName} (code {appBuildInfo.versionCode})
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Edition:</span>
                      <span className="text-zinc-200 font-bold uppercase font-mono">{appBuildInfo.edition}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-zinc-400">Cert SHA-256:</span>
                      <span className="text-emerald-400 font-bold font-mono truncate max-w-[190px]">
                        {appBuildInfo.signingSha256 || 'Unavailable'}
                      </span>
                    </div>
                    {environmentSecurity && (
                      <div
                        className={`flex items-center justify-between gap-2 pt-1 border-t ${
                          isBespoke ? 'border-neutral-800' : 'border-white/10'
                        }`}
                      >
                        <span className="text-zinc-400">Runtime Environment:</span>
                        <span
                          className={`font-semibold ${
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
                  <div
                    className={`p-3 obsidian-inset-neutral text-[11px] text-zinc-400 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
                    Permanent APK Release Key: <code className="text-emerald-400 font-mono">A14A36...CE11</code> (V1+V2+V3 signed).
                  </div>
                )}
              </>
            }
            footerContent={
              appBuildInfo && !appBuildInfo.isOfficialReleaseKey ? (
                <div className="text-zinc-300">
                  This device is running an older preview/debug key build. Save a Cloud{' '}
                  <code className="font-mono">.zbak</code> backup in <strong>Settings</strong>,{' '}
                  <strong>Uninstall (for all users)</strong> once, and install the newest signed{' '}
                  <code className="font-mono">ZERO-v*.apk</code> so all future updates install cleanly in-place!
                </div>
              ) : (
                <div className="space-y-1.5 text-zinc-300">
                  <div className="flex items-start gap-1.5">
                    <ShieldCheck size={13} className="shrink-0 mt-0.5 text-emerald-400" />
                    <span>
                      Keep updating within the same edition using a higher version code. If Android ever says &ldquo;App not installed&rdquo;, check that Chrome/Files has <strong>Install unknown apps</strong> allowed and uninstall any duplicate copy from Work Profile / Dual Apps.
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed pl-5">
                    Play Protect &ldquo;App scan recommended&rdquo; on new GitHub APK updates? Every freshly built sideload has a new binary hash not yet on Play Store &mdash; tap <strong>Scan app</strong> once to let Google verify it cleanly and continue installing.
                  </p>
                </div>
              )
            }
          />

          {/* ADB Command Box */}
          <ObsidianCard
            className={`${isBespoke ? 'font-sans' : 'font-mono'} text-xs`}
            headerClassName={isBespoke ? 'p-5 space-y-2.5' : 'p-4 space-y-2'}
            footerClassName={isBespoke ? 'px-5 py-2.5 text-[11px] text-zinc-400 leading-relaxed' : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed'}
            headerContent={
              <>
                <div className="flex items-center justify-between text-zinc-200 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
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
                    className={`text-[10px] text-zinc-200 hover:text-white flex items-center gap-1 px-2.5 py-1 obsidian-inset-neutral ${
                      isBespoke ? 'rounded-sm transition-colors duration-75' : 'rounded-lg'
                    }`}
                  >
                    {copiedId === 'adb_cmd' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    <span>{copiedId === 'adb_cmd' ? 'Copied' : 'Copy ADB'}</span>
                  </button>
                </div>
                <pre
                  className={`p-2.5 obsidian-inset-neutral font-mono text-[10px] text-zinc-200 overflow-x-auto no-scrollbar ${
                    isBespoke ? 'rounded-md' : 'rounded-xl'
                  }`}
                >
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
      {effectiveSection === 'support' && (
        <div className={isBespoke ? 'space-y-5' : 'space-y-4'}>
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            ambientGlow={!isBespoke}
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName="p-5 space-y-3"
            footerClassName="px-5 py-3 flex items-center justify-between text-xs gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                  <div
                    className={`w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
                  >
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
                  1st tip of minimum ₹<span className="font-mono tabular-nums">{FIRST_DONATION_BONUS_INR}</span>: +1 thank-you ticket &amp; Golden{' '}
                  <strong className={isBespoke ? 'text-white' : 'text-amber-300'}>ZERO-SUPPORTER</strong> badge).
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
                  className={`hover:underline flex items-center gap-1 font-semibold ${
                    isBespoke ? 'text-blue-400' : 'text-amber-300 font-bold'
                  }`}
                >
                  <span>Check Updates</span>
                  <ExternalLink size={12} />
                </a>
                <a
                  href={SOURCE_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleOpenExternal(e, SOURCE_URL)}
                  className="text-white hover:underline flex items-center gap-1 font-semibold"
                >
                  <Code2 size={13} />
                  <span>Source Code</span>
                </a>
              </>
            }
          />

          {/* Donation Channels */}
          <div className={isBespoke ? 'space-y-4' : 'space-y-3'}>
            <span
              className={`text-xs uppercase tracking-wider text-zinc-400 font-bold block ${
                isBespoke ? 'font-sans' : 'font-mono'
              }`}
            >
              Support the Project
            </span>

            {/* UPI ID & Scannable QR (Best Offer • No Minimum Limit) */}
            <ObsidianCard
              accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
              ambientGlow={!isBespoke}
              className={isBespoke ? 'font-sans' : 'font-mono'}
              headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
              footerClassName={`px-5 py-2.5 text-[11px] leading-relaxed flex items-center justify-between gap-2 flex-wrap ${
                isBespoke ? 'text-zinc-400' : 'px-4 text-[10px] text-amber-200/90'
              }`}
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        isBespoke
                          ? 'rounded-sm bg-neutral-900 border border-neutral-700 text-white font-semibold'
                          : 'rounded-md bg-amber-400 text-black font-black'
                      }`}
                    >
                      Best Offer • Best Option
                    </span>
                    <span
                      className={`px-2 py-0.5 bg-emerald-950/80 border border-emerald-700/70 text-emerald-300 text-[10px] font-semibold ${
                        isBespoke ? 'rounded-sm' : 'rounded-md font-bold'
                      }`}
                    >
                      NO MINIMUM LIMIT
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-9 h-9 obsidian-icon-box flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                          isBespoke ? 'rounded-md font-mono' : 'rounded-xl'
                        }`}
                      >
                        UPI
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">UPI / Instant Pay</div>
                        <div
                          className={`text-[11px] truncate font-mono ${
                            isBespoke ? 'text-zinc-300' : 'text-amber-200'
                          }`}
                        >
                          {UPI_ID}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setShowUPIQR(!showUPIQR)}
                        className={`p-1.5 ${
                          isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-lg transition-colors'
                        } ${
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
                        className={`p-1.5 obsidian-inset-neutral text-zinc-300 hover:text-white ${
                          isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-lg'
                        }`}
                        title="Copy UPI ID"
                        aria-label="Copy UPI ID"
                      >
                        {copiedId === 'upi' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* 1st Minimum ₹50 Supporter Bonus */}
                  {!hasClaimedFirstDonationParachute ? (
                    <div
                      className={`p-3.5 border space-y-2.5 ${
                        isBespoke
                          ? 'rounded-md bg-neutral-950 border-neutral-800'
                          : 'rounded-xl bg-emerald-950/50 border-emerald-500/50 space-y-2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-emerald-400 text-[11px] font-semibold uppercase">
                          <Gift size={13} className="text-emerald-400 shrink-0" />
                          <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 🎫 &amp; Gold Badge</span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 shrink-0 font-mono ${
                            isBespoke
                              ? 'rounded-sm bg-neutral-900 border border-neutral-700 text-amber-300'
                              : 'rounded bg-amber-400 text-black font-black'
                          }`}
                        >
                          Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        <strong>Strict Rule:</strong> The Golden{' '}
                        <strong className={isBespoke ? 'text-white' : 'text-amber-300'}>ZERO-SUPPORTER</strong> Profile Badge &amp;{' '}
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
                            className={`flex-1 py-2 px-3 text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                              isBespoke
                                ? 'rounded-md bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-semibold transition-colors duration-75'
                                : 'rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black active:scale-95 transition-all'
                            }`}
                          >
                            <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 🎫 &amp; Gold)</span>
                            <ExternalLink size={12} />
                          </a>
                          {onClaimFirstDonationBonus && (
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(true)}
                              className={`px-3 py-2 obsidian-inset-neutral border border-emerald-700/60 text-emerald-300 text-[10px] font-semibold ${
                                isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold'
                              }`}
                            >
                              Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`p-2.5 obsidian-inset-neutral border border-emerald-600/60 space-y-2 ${
                            isBespoke ? 'rounded-md' : 'rounded-xl'
                          }`}
                        >
                          <div className="text-[11px] text-emerald-200">
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
                              className={`flex-1 py-2 px-2.5 text-[10px] uppercase tracking-wider ${
                                isBespoke
                                  ? 'rounded-md bg-emerald-600 hover:bg-emerald-500 border border-emerald-500 text-white font-semibold'
                                  : 'rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-black'
                              }`}
                            >
                              Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(false)}
                              className={`px-2.5 py-2 obsidian-inset-neutral text-zinc-300 text-[10px] font-semibold ${
                                isBespoke ? 'rounded-md' : 'rounded-lg font-bold'
                              }`}
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className={`px-3 py-2 obsidian-inset border border-emerald-700/60 flex items-center justify-between gap-2 flex-wrap text-[11px] text-emerald-300 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl border-amber-500/40 text-[10px]'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 size={12} />
                        <span>Min ₹{FIRST_DONATION_BONUS_INR} 1st Tip Bonus Claimed</span>
                      </span>
                      <ZeroSupporterGoldenBadge compact />
                    </div>
                  )}

                  <a
                    href={UPI_PAY_URL}
                    onClick={(e) => handleOpenExternal(e, UPI_PAY_URL)}
                    className={`w-full py-2.5 px-3 text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      isBespoke
                        ? 'rounded-md obsidian-pill-active font-semibold transition-colors duration-75'
                        : 'rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[11px] active:scale-95 transition-all'
                    }`}
                  >
                    <span>Open UPI App (Any Amount)</span>
                    <ExternalLink size={12} />
                  </a>

                  {showUPIQR && (
                    <div
                      className={`p-3.5 obsidian-inset-neutral flex flex-col items-center justify-center text-center space-y-2 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      {upiQrUrl ? (
                        <div
                          data-qr-surface="true"
                          className={`bg-white p-2 ${isBespoke ? 'rounded-sm' : 'rounded-xl shadow-md'}`}
                        >
                          <img
                            src={upiQrUrl}
                            alt={`UPI QR code for ${UPI_ID}`}
                            className="w-36 h-36 block"
                          />
                        </div>
                      ) : (
                        <div
                          className={`w-36 h-36 bg-black/70 flex items-center justify-center text-[10px] text-zinc-400 ${
                            isBespoke ? 'rounded-sm' : 'rounded-xl'
                          }`}
                        >
                          Generating QR...
                        </div>
                      )}
                      <div className="text-[11px] font-bold font-mono text-zinc-200">{UPI_ID}</div>
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
                  <span className={`font-semibold uppercase tracking-wider ${isBespoke ? 'text-blue-400' : 'text-amber-300 font-bold'}`}>
                    Instant
                  </span>
                </>
              }
            />

            {/* Buy Me a Coffee via Ko-fi */}
            <ObsidianCard
              accent={profileAccentKey}
              className={isBespoke ? 'font-sans' : 'font-mono'}
              headerClassName="p-0"
              footerClassName="px-5 py-2.5 text-[11px] text-zinc-400 flex items-center justify-between gap-2"
              headerContent={
                <a
                  href={KOFI_URL}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => handleOpenExternal(e, KOFI_URL)}
                  className={`w-full p-4 flex items-center justify-between group ${
                    isBespoke ? 'transition-colors duration-75' : 'p-3.5 transition-all active:scale-[0.98]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <Coffee size={17} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white">Buy Me a Coffee (Ko-fi)</div>
                      <div className="text-[11px] text-zinc-400 font-mono truncate">ko-fi.com/mdyousuf2620</div>
                    </div>
                  </div>
                  <ExternalLink size={14} className="text-zinc-400 group-hover:text-white shrink-0 ml-2" />
                </a>
              }
              footerContent={
                <>
                  <span>International &amp; card tips supported via Ko-fi</span>
                  <span className={`font-semibold uppercase ${isBespoke ? 'text-zinc-300' : 'text-amber-300 font-bold'}`}>
                    Optional
                  </span>
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
                className={`${isBespoke ? 'font-sans' : 'font-mono'} text-[11px]`}
                headerClassName="p-4 flex items-center justify-between gap-2"
                headerContent={
                  <>
                    <span className="text-zinc-300">
                      Post-session tip popup blocked for{' '}
                      <strong className="text-white font-mono tabular-nums">{tipSkipRemaining}</strong> more completed{' '}
                      {tipSkipRemaining === 1 ? 'session' : 'sessions'}.
                    </span>
                    {onResetTipPromptBlock && (
                      <button
                        type="button"
                        onClick={onResetTipPromptBlock}
                        className={`px-2.5 py-1 obsidian-inset-neutral text-zinc-200 hover:text-white font-semibold shrink-0 ${
                          isBespoke ? 'rounded-sm transition-colors duration-75' : 'rounded-lg font-bold'
                        }`}
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
            ambientGlow={!isBespoke}
            className={`w-full max-w-sm max-h-full text-left ${isBespoke ? 'font-sans' : 'font-mono'}`}
            headerClassName="p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
            footerClassName="p-4 space-y-2.5"
            headerContent={
              <>
                <div className="font-semibold text-sm text-white">Create Recurring Schedule</div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Schedule Name</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="e.g. Morning Focus"
                    required
                    className={`w-full obsidian-input px-3 py-2 text-xs text-white outline-none ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
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
                        className={`flex-1 py-1.5 text-[10px] font-semibold ${
                          isBespoke
                            ? `rounded-sm border transition-colors duration-75 ${
                                newDays.includes(idx)
                                  ? 'bg-blue-600 text-white border-blue-500'
                                  : 'bg-neutral-950 text-neutral-400 border-neutral-800'
                              }`
                            : `rounded-lg font-bold transition-all ${
                                newDays.includes(idx)
                                  ? 'obsidian-pill-active'
                                  : 'obsidian-inset-neutral text-zinc-400'
                              }`
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
                      className={`w-full obsidian-input font-mono tabular-nums px-3 py-2 text-xs text-white outline-none ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-zinc-400 block mb-1">End Time</label>
                    <input
                      type="time"
                      value={newEndTime}
                      onChange={(e) => setNewEndTime(e.target.value)}
                      className={`w-full obsidian-input font-mono tabular-nums px-3 py-2 text-xs text-white outline-none ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">Focus Tag</label>
                  <select
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    className={`w-full obsidian-input px-3 py-2 text-xs text-white outline-none ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    }`}
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
                <div
                  className={`p-2.5 obsidian-inset-neutral text-[10px] text-zinc-300 flex items-center gap-1.5 ${
                    isBespoke ? 'rounded-md' : 'rounded-xl'
                  }`}
                >
                  <Bell size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0" />
                  <span>Includes automatic 5-minute pre-lock heads-up warning</span>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className={`flex-1 py-2.5 obsidian-pill-active font-semibold text-xs uppercase tracking-wider ${
                      isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-black active:scale-95 transition-all'
                    }`}
                  >
                    Save Schedule
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className={`py-2.5 px-4 obsidian-inset-neutral text-zinc-300 text-xs font-semibold hover:text-white ${
                      isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-xl font-bold transition-colors'
                    }`}
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
