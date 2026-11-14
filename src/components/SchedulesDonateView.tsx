import React, { useState, useEffect } from 'react';
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
import type { CloudReminderScheduleInfo } from '../core/integrity/IntegrityEngine';
import type {
  RecurringSchedule,
  SessionTag,
  ThemeConfig,
  InterfaceStyle,
  MaterialYouSeed,
  SleepFarmingMode,
  NativePermissionStatus,
  NativeAppBuildInfo,
  NativeEnvironmentSecurity,
  ZeroProfile,
  CloudAutoBackupStatus,
  CloudReminderInterval,
} from '../types';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { evaluatePermissionPriority } from '../utils/permissionPriority';
import { RestrictedSettingsGuideCard } from './RestrictedSettingsGuideCard';
import { ProfileAvatar } from './ProfileAvatar';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ThemeStudio } from './ThemeStudio';
import { DonorPerksBadgesCard } from './DonorPerksBadgesCard';
import { ObsidianCard } from './ObsidianCard';
import { CreditsModal } from './CreditsModal';
import {
  getAllThemeMods,
  applyThemeModStyles,
  removeActiveModStyles,
  getActiveThemeModId,
  saveUserCustomMod,
  validateThemeModJson,
} from '../utils/themeMods';
import { isOvernightSchedule } from '../utils/routineEngine';
import { haptics } from '../utils/haptics';
import {
  Plus,
  Trash2,
  Bell,
  Heart,
  Coffee,
  Copy,
  Check,
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
  Loader2,
  KeyRound,
  ShieldCheck,
  HardDrive,
  Sliders,
  Save,
  Ticket,
  Users,
  Target,
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
  materialYouSeed?: MaterialYouSeed;
  onMaterialYouSeedChange?: (next: MaterialYouSeed) => void;
  materialYouAmoled?: boolean;
  onMaterialYouAmoledChange?: (next: boolean) => void;
  sectionOverride?: {
    section: 'schedules' | 'themes' | 'settings' | 'os_security' | 'support';
    key: number;
  } | null;
  viewMode?: 'all' | 'settings_os' | 'support';
  sleepFarmingMode: SleepFarmingMode;
  onSleepFarmingModeChange: (mode: SleepFarmingMode) => void;
  onExportZbakData?: () => string;
  onOneTapSaveBackup?: () => Promise<{ ok: boolean; message: string }>;
  onImportData: (rawJson: string) => { ok: boolean; message: string };
  onResetData: () => void;
  cloudBackupStatus?: CloudAutoBackupStatus;
  cloudReminderInterval?: CloudReminderInterval;
  lastCloudUploadTimestamp?: number;
  nextCloudReminderInfo?: CloudReminderScheduleInfo;
  onCloudReminderIntervalChange?: (next: CloudReminderInterval) => void;
  isCloudBusy?: boolean;
  onEnableCloudAutoBackup?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onDisableCloudAutoBackup?: () => Promise<void>;
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
  onRecalibrateHabitProfile?: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TAGS: SessionTag[] = ['Deep Work', 'Study', 'Sleep', 'Detox', 'Family'];

const REMINDER_OPTIONS: Array<{ id: CloudReminderInterval; label: string }> = [
  { id: 'weekly', label: '1 Week' },
  { id: 'monthly', label: '1 Month' },
  { id: 'off', label: 'Off' },
];

function formatCloudReminderCountdown(
  interval: CloudReminderInterval,
  info?: CloudReminderScheduleInfo,
  lastCloudUploadTs?: number
): string {
  if (interval === 'off') return 'Reminders paused';
  if (info?.isDue) return 'Due now — upload to reset timer';
  const targetMs =
    info?.nextReminderAtMs ??
    (lastCloudUploadTs && lastCloudUploadTs > 0
      ? lastCloudUploadTs + (interval === 'monthly' ? 30 : 7) * 24 * 60 * 60 * 1000
      : null);
  if (!targetMs) return 'Due now — upload to reset timer';
  const remainingMs = Math.max(0, targetMs - Date.now());
  if (remainingMs <= 0) return 'Due now — upload to reset timer';
  const totalHours = Math.floor(remainingMs / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  const mins = Math.max(1, Math.floor((remainingMs % (60 * 60 * 1000)) / (60 * 1000)));
  if (days > 0) return `Next reminder in ${days}d ${hours}h`;
  if (hours > 0) return `Next reminder in ${hours}h ${mins}m`;
  return `Next reminder in ${mins}m`;
}

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
  materialYouSeed: materialYouSeedProp,
  onMaterialYouSeedChange,
  materialYouAmoled: materialYouAmoledProp,
  onMaterialYouAmoledChange,
  sectionOverride = null,
  viewMode = 'all',
  sleepFarmingMode,
  onSleepFarmingModeChange,
  onExportZbakData,
  onOneTapSaveBackup,
  onImportData,
  onResetData,
  cloudBackupStatus,
  cloudReminderInterval = 'weekly',
  lastCloudUploadTimestamp,
  nextCloudReminderInfo,
  onCloudReminderIntervalChange,
  isCloudBusy = false,
  onEnableCloudAutoBackup,
  onDisableCloudAutoBackup,
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
  onRecalibrateHabitProfile,
}) => {
  const {
    interfaceStyle: ctxInterfaceStyle,
    setInterfaceStyle: ctxSetInterfaceStyle,
    isBespoke,
    isFluentGlass,
    isMaterialYou,
    materialYouSeed: ctxMaterialYouSeed,
    setMaterialYouSeed: ctxSetMaterialYouSeed,
    materialYouAmoled: ctxMaterialYouAmoled,
    setMaterialYouAmoled: ctxSetMaterialYouAmoled,
  } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass || isMaterialYou;
  const activeInterfaceStyle = interfaceStyleProp ?? ctxInterfaceStyle;
  const applyInterfaceStyle = onInterfaceStyleChange ?? ctxSetInterfaceStyle;
  const activeMaterialYouSeed = materialYouSeedProp ?? ctxMaterialYouSeed ?? 'purple';
  const applyMaterialYouSeed = onMaterialYouSeedChange ?? ctxSetMaterialYouSeed ?? (() => {});
  const activeMaterialYouAmoled = materialYouAmoledProp ?? ctxMaterialYouAmoled ?? false;
  const applyMaterialYouAmoled = onMaterialYouAmoledChange ?? ctxSetMaterialYouAmoled ?? (() => {});

  const [cloudNotice, setCloudNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const supporterBadgeUnlocked = Boolean(isZeroSupporter ?? hasClaimedFirstDonationParachute);
  const restoreDisabled = Boolean(environmentSecurity?.restrictions?.backupRestoreDisabled);
  const [activeSection, setActiveSection] = useState<'schedules' | 'themes' | 'settings' | 'os_security' | 'support'>(
    sectionOverride?.section || 'schedules'
  );
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCreditsModal, setShowCreditsModal] = useState(false);
  const [themeModsList, setThemeModsList] = useState(() => getAllThemeMods());
  const [activeModId, setActiveModId] = useState<string | null>(() => getActiveThemeModId());
  const [showImportModModal, setShowImportModModal] = useState(false);
  const [importModJson, setImportModJson] = useState('');
  const [importModError, setImportModError] = useState<string | null>(null);

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
  const [backupNotice, setBackupNotice] = useState<{ ok: boolean; message: string } | null>(null);

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
      className={`flex flex-col px-4 py-5 max-w-md mx-auto w-full select-none ${
        isFluentGlass ? 'gap-5 font-sans pb-32' : isBespoke ? 'gap-6 font-sans pb-28' : 'gap-5 pb-28'
      }`}
    >
      {/* View Header */}
      {viewMode === 'support' ? (
        <div className="space-y-1">
          <h1
            className={`text-xl tracking-tight text-white flex items-center gap-2 ${
              isFluentGlass
                ? 'font-sans font-semibold liquid-metric'
                : isBespoke
                ? 'font-sans font-bold'
                : 'font-mono font-black'
            }`}
          >
            <span>KEEP ZERO FREE</span>
          </h1>
          <p className={`text-xs text-zinc-400 ${isModernFont ? 'font-sans' : 'font-mono'}`}>
            100% FOSS • Voluntary UPI / Ko-fi Support &amp; Donor Perks
          </p>
        </div>
      ) : (
        <div className="space-y-1">
          <h1
            className={`text-xl tracking-tight text-white flex items-center gap-2 ${
              isFluentGlass
                ? 'font-sans font-semibold liquid-metric'
                : isBespoke
                ? 'font-sans font-bold'
                : 'font-mono font-black'
            }`}
          >
            <span>SETTINGS &amp; OS</span>
          </h1>
          <p className={`text-xs text-zinc-400 ${isModernFont ? 'font-sans' : 'font-mono'}`}>
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
            isFluentGlass
              ? 'liquid-track rounded-full text-[11px] font-sans'
              : isBespoke
              ? 'bg-black border border-neutral-800 rounded-md text-[11px] font-sans'
              : 'obsidian-shell-bar rounded-2xl text-[10px] font-mono'
          }`}
        >
          <button
            onClick={() => setActiveSection('schedules')}
            className={`py-2 truncate px-1 ${
              isFluentGlass
                ? `rounded-full font-medium liquid-spring ${
                    effectiveSection === 'schedules'
                      ? 'liquid-pill-active font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`
                : isBespoke
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
              isFluentGlass
                ? `rounded-full font-medium liquid-spring ${
                    effectiveSection === 'themes'
                      ? 'liquid-pill-active font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`
                : isBespoke
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
              isFluentGlass
                ? `rounded-full font-medium liquid-spring ${
                    effectiveSection === 'settings'
                      ? 'liquid-pill-active font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`
                : isBespoke
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
              isFluentGlass
                ? `rounded-full font-medium liquid-spring ${
                    effectiveSection === 'os_security'
                      ? 'liquid-pill-active font-semibold'
                      : 'text-zinc-400 hover:text-white'
                  }`
                : isBespoke
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
                isFluentGlass
                  ? `rounded-full font-medium liquid-spring ${
                      effectiveSection === 'support'
                        ? 'liquid-pill-active font-semibold'
                        : 'text-zinc-400 hover:text-white'
                    }`
                  : isBespoke
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
        <div className={isBespoke || isFluentGlass ? 'space-y-5' : 'space-y-4'}>
          <ThemeStudio
            themeConfig={themeConfig}
            onChange={onThemeConfigChange}
          />

          {/* Theme Mods & Community Themes Card */}
          <ObsidianCard
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 sm:p-5 space-y-3'}
            footerClassName={isModernFont ? 'px-5 py-3 flex items-center justify-between text-[11px] text-zinc-400' : 'px-4 sm:px-5 py-2.5 flex items-center justify-between text-[10px] text-zinc-400'}
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md' : 'rounded-xl'
                            }`
                      }
                    >
                      <Sparkles size={15} />
                    </div>
                    <div>
                      <h2 className="text-xs text-white font-semibold uppercase tracking-wider">
                        Community Theme Mods
                      </h2>
                      <p className="text-[11px] text-zinc-400">
                        Custom stylesheets &amp; verified palettes
                      </p>
                    </div>
                  </div>
                  {activeModId && (
                    <button
                      type="button"
                      onClick={() => {
                        removeActiveModStyles();
                        setActiveModId(null);
                      }}
                      className="px-2 py-0.5 rounded text-[10px] font-mono bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30 transition-colors"
                    >
                      Clear Mod
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {themeModsList.map((mod) => {
                    const isModActive = activeModId === mod.id;
                    return (
                      <button
                        key={mod.id}
                        type="button"
                        onClick={() => {
                          applyThemeModStyles(mod);
                          setActiveModId(mod.id);
                        }}
                        className={`p-3 text-left rounded-xl border transition-all ${
                          isModActive
                            ? 'border-blue-500 bg-blue-500/15 ring-1 ring-blue-500/50'
                            : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-semibold text-xs text-white truncate">{mod.name}</span>
                          {isModActive && <Check size={13} className="text-blue-400 shrink-0" />}
                        </div>
                        <p className="text-[10px] text-zinc-400 line-clamp-2 leading-relaxed">{mod.description}</p>
                        <div className="text-[9px] font-mono text-zinc-500 mt-2 truncate">by {mod.author}</div>
                      </button>
                    );
                  })}
                </div>

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowImportModModal(true)}
                    className="flex-1 py-2 px-3 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 text-xs font-semibold text-zinc-300 flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Upload size={13} />
                    <span>Import Mod JSON</span>
                  </button>
                </div>
              </>
            }
            footerContent={
              <>
                <span>Safe CSS Variables Sandbox</span>
                <span className="text-zinc-300 font-semibold">{themeModsList.length} Mods Available</span>
              </>
            }
          />
          <ObsidianCard
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-4 text-xs text-zinc-300 leading-relaxed' : 'p-3.5 text-[11px] text-zinc-300 leading-relaxed'}
            footerClassName={isModernFont ? 'px-4 py-2.5 flex items-center justify-between text-[11px] text-zinc-400' : 'px-3.5 py-2 flex items-center justify-between text-[10px] text-zinc-400'}
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
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 sm:p-5 space-y-3'}
            footerClassName={
              isModernFont
                ? 'px-5 py-3 flex items-center justify-between gap-2 text-[11px] text-zinc-400'
                : 'px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md' : 'rounded-xl'
                            }`
                      }
                    >
                      <Sliders
                        size={15}
                        strokeWidth={1.75}
                        style={
                          isFluentGlass ? undefined : { color: 'var(--accent-hex, var(--zero-accent))' }
                        }
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
                    className={`text-[10px] font-semibold uppercase px-2.5 py-0.5 border shrink-0 ${
                      isMaterialYou
                        ? 'rounded-full border-transparent font-bold bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                        : isFluentGlass
                        ? 'rounded-full liquid-pill-active font-bold border-transparent'
                        : isBespoke
                        ? 'rounded-sm border-blue-500/50 bg-blue-600/15 text-blue-300'
                        : 'rounded-full obsidian-pill-active font-black'
                    }`}
                  >
                    {activeInterfaceStyle === 'material-you'
                      ? 'Material You'
                      : activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                      ? 'Fluent Glass'
                      : activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'
                      ? 'Bespoke'
                      : 'Classic'}
                  </span>
                </div>

                <div role="radiogroup" aria-label="Interface Style" className="space-y-2.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'classic'}
                    onClick={() => applyInterfaceStyle('classic')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'classic'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
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
                          ? isBespoke
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'obsidian-pill-active'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'classic' && <Check size={11} strokeWidth={1.75} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'classic-v2'}
                    onClick={() => applyInterfaceStyle('classic-v2')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'classic-v2'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'classic-v2'
                              ? 'bg-neutral-950 border-amber-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'classic-v2'
                              ? 'obsidian-inset text-white border-amber-500/50'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Classic UI Version 2 (Beta Test)</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-mono bg-amber-500/15 text-amber-400 border border-amber-500/30">
                          Onyx
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Hardware Accessibility Shield aesthetic: Pure #08080A obsidian canvas, warm amber #FFAA00 accents, rounded-3xl tactile cards, and floating pill dock.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'classic-v2'
                          ? isBespoke
                            ? 'bg-amber-600 border-amber-500 text-white'
                            : 'bg-gradient-to-r from-amber-400 to-amber-600 text-black font-bold'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'classic-v2' && <Check size={11} strokeWidth={2} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'trantor'}
                    onClick={() => applyInterfaceStyle('trantor')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'trantor'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'trantor'
                              ? 'bg-[#121418] border-teal-400 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'trantor'
                              ? 'bg-[#121418] border border-teal-400/60 text-white shadow-sm'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Trantor Sage-Obsidian</span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded-full font-mono bg-teal-500/15 text-teal-300 border border-teal-500/30">
                          Fintech
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        High-end dark mobile wallet aesthetic: #121418 matte surfaces, crisp Sage Mint (#A3E4D7) inversions, and flat layered depth.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'trantor'
                          ? 'bg-[#A3E4D7] border-[#A3E4D7] text-[#0B0C10] font-bold'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'trantor' && <Check size={11} strokeWidth={2} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'}
                    onClick={() => applyInterfaceStyle('minimalist')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'
                              ? 'bg-neutral-950 border-blue-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'
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
                        activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist'
                          ? isBespoke
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'obsidian-pill-active'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {(activeInterfaceStyle === 'bespoke' || activeInterfaceStyle === 'minimalist') && <Check size={11} strokeWidth={1.75} />}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'}
                    onClick={() => applyInterfaceStyle('fluent')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                              ? 'bg-neutral-950 border-blue-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Fluent Glass</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 font-semibold tracking-wider ${
                            isFluentGlass
                              ? 'rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/35'
                              : isBespoke
                              ? 'rounded-sm bg-blue-600/20 text-blue-300 border border-blue-500/40'
                              : 'rounded-full obsidian-pill-active font-black'
                          }`}
                        >
                          Fluent 2
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Pitch-black #000000 AMOLED canvas with drifting sub-surface ambient orbs, specular Acrylic refraction cards, mercury gauges, and a floating pill dock.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                          ? isBespoke
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'obsidian-pill-active'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {(activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent') && (
                        <Check size={11} strokeWidth={1.75} />
                      )}
                    </div>
                  </button>

                  <button
                    type="button"
                    role="radio"
                    aria-checked={activeInterfaceStyle === 'material-you'}
                    onClick={() => applyInterfaceStyle('material-you')}
                    className={`w-full p-3.5 text-left flex items-start justify-between gap-3 ${
                      isMaterialYou
                        ? `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'material-you'
                              ? 'bg-[var(--md-surface-container-high)] text-white'
                              : 'bg-[var(--md-surface-container)] text-zinc-400'
                          }`
                        : isFluentGlass
                        ? `rounded-2xl liquid-spring ${
                            activeInterfaceStyle === 'material-you'
                              ? 'liquid-inset text-white'
                              : 'liquid-row text-zinc-400 hover:text-zinc-200'
                          }`
                        : isBespoke
                        ? `rounded-md border transition-colors duration-75 ${
                            activeInterfaceStyle === 'material-you'
                              ? 'bg-neutral-950 border-blue-500 text-white'
                              : 'bg-black border-neutral-800 text-neutral-300 hover:border-neutral-600'
                          }`
                        : `rounded-2xl transition-all ${
                            activeInterfaceStyle === 'material-you'
                              ? 'obsidian-inset text-white'
                              : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                          }`
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-white flex items-center gap-2 flex-wrap">
                        <span>Material You</span>
                        <span
                          className={`text-[9px] uppercase px-1.5 py-0.5 font-semibold tracking-wider ${
                            isMaterialYou
                              ? 'rounded-full bg-[var(--md-primary-container)] text-[var(--md-on-primary-container)]'
                              : isFluentGlass
                              ? 'rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/35'
                              : isBespoke
                              ? 'rounded-sm bg-blue-600/20 text-blue-300 border border-blue-500/40'
                              : 'rounded-full obsidian-pill-active font-black'
                          }`}
                        >
                          M3
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                        Stepped tonal surface elevation, pill shapes, dynamic seed palettes, spring motion, and true AMOLED mode.
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 mt-0.5 border flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-sm' : 'rounded-full'
                      } ${
                        activeInterfaceStyle === 'material-you'
                          ? isMaterialYou
                            ? 'bg-[var(--md-primary)] text-[var(--md-on-primary)] border-[var(--md-primary)]'
                            : isBespoke
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'obsidian-pill-active'
                          : 'border-neutral-600 bg-transparent'
                      }`}
                    >
                      {activeInterfaceStyle === 'material-you' && (
                        <Check size={11} strokeWidth={1.75} />
                      )}
                    </div>
                  </button>
                </div>

                {activeInterfaceStyle === 'material-you' && (
                  <div className="pt-3 border-t border-zinc-800/80 space-y-3">
                    <div>
                      <label className="text-[11px] font-semibold text-zinc-300 block mb-2">
                        Tonal Seed Palette
                      </label>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        {(
                          [
                            { id: 'purple', name: 'Deep Purple', color: '#D0BCFF', bg: '#4F378B' },
                            { id: 'cyan', name: 'Cyber Cyan', color: '#66E3FF', bg: '#004E5F' },
                            { id: 'emerald', name: 'Neon Emerald', color: '#6DD58C', bg: '#005227' },
                            { id: 'crimson', name: 'Crimson Pulse', color: '#FFB2BE', bg: '#7D293A' },
                          ] as const
                        ).map((seed) => {
                          const isSelected = activeMaterialYouSeed === seed.id;
                          return (
                            <button
                              key={seed.id}
                              type="button"
                              onClick={() => applyMaterialYouSeed(seed.id)}
                              className={`p-2.5 rounded-xl border text-left flex items-center gap-2.5 transition-all ${
                                isSelected
                                  ? 'border-[var(--md-primary)] bg-[var(--md-surface-container-high)] text-white shadow-sm'
                                  : 'border-zinc-800 bg-[var(--md-surface-container-low)] text-zinc-400 hover:border-zinc-700'
                              }`}
                            >
                              <div
                                className="w-5 h-5 rounded-full shrink-0 flex items-center justify-center border border-white/20"
                                style={{ backgroundColor: seed.color }}
                              >
                                {isSelected && (
                                  <div
                                    className="w-2 h-2 rounded-full"
                                    style={{ backgroundColor: seed.bg }}
                                  />
                                )}
                              </div>
                              <span className="text-xs font-medium truncate">{seed.name}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div>
                        <span className="text-xs font-semibold text-white block">
                          AMOLED Pitch-Black
                        </span>
                        <span className="text-[10px] text-zinc-400 block">
                          Forces true #000000 background canvas
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => applyMaterialYouAmoled(!activeMaterialYouAmoled)}
                        className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                          activeMaterialYouAmoled
                            ? 'bg-[var(--md-primary)]'
                            : 'bg-zinc-800 border border-zinc-700'
                        }`}
                        aria-pressed={activeMaterialYouAmoled}
                      >
                        <div
                          className={`w-5 h-5 rounded-full transition-transform ${
                            activeMaterialYouAmoled
                              ? 'translate-x-5 bg-[var(--md-on-primary)]'
                              : 'translate-x-0 bg-zinc-400'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
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
          <div className={isModernFont ? 'space-y-4' : 'space-y-3'}>
            {schedules.map((sched) => (
              <ObsidianCard
                key={sched.id}
                className={`${isModernFont ? 'font-sans' : 'font-mono'} ${sched.isEnabled ? '' : 'opacity-65'}`}
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
                            ? isFluentGlass
                              ? {
                                  background: 'linear-gradient(135deg, var(--liquid-accent-vibrant), var(--liquid-accent-tint))',
                                  borderColor: 'rgba(255, 255, 255, 0.45)',
                                  boxShadow: '0 0 12px var(--liquid-accent-soft-glow)',
                                }
                              : isBespoke
                              ? {
                                  backgroundColor: '#2563EB',
                                  borderColor: '#3B82F6',
                                }
                              : {
                                  background:
                                    'var(--accent-badge-gradient, linear-gradient(135deg, #FFFFFF 0%, #D4D4D8 100%))',
                                  borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.75)',
                                }
                            : undefined
                        }
                        className={`relative border shrink-0 toggle-track ${
                          isBespoke
                            ? `w-11 h-6 rounded-sm transition-colors duration-75 ${
                                sched.isEnabled
                                  ? ''
                                  : 'bg-neutral-950 border-neutral-700'
                              }`
                            : isFluentGlass
                            ? `w-12 h-6 rounded-full transition-colors ${
                                sched.isEnabled
                                  ? ''
                                  : 'liquid-track'
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
                                  backgroundColor: isBespoke || isFluentGlass
                                    ? '#FFFFFF'
                                    : 'var(--accent-badge-text, #09090B)',
                                }
                              : undefined
                          }
                          className={`w-4 h-4 transform toggle-thumb ${
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
                            isFluentGlass
                              ? `rounded-full font-sans font-semibold ${
                                  sched.days.includes(idx)
                                    ? 'liquid-pill-active'
                                    : 'liquid-pill-inactive'
                                }`
                              : isBespoke
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
                      <Bell
                        size={12}
                        className={isBespoke ? 'shrink-0 text-blue-500' : 'shrink-0'}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
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
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 space-y-3.5'}
            footerClassName={
              isModernFont
                ? 'px-5 py-3 text-[11px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
                : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                            }`
                      }
                    >
                      <HardDrive
                        size={16}
                        strokeWidth={1.75}
                        style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-white font-semibold uppercase tracking-wider">
                        Backup and Restore Everything
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        Our stats, Escape Tickets, donor perks &amp; config (.zbak)
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                      isBespoke ? 'rounded-sm' : 'rounded-full font-black'
                    } ${
                      cloudBackupStatus?.enabled
                        ? isBespoke
                          ? 'bg-blue-600/15 border-blue-500/60 text-blue-300'
                          : 'obsidian-pill-active'
                        : 'obsidian-inset-neutral text-zinc-300'
                    }`}
                  >
                    {cloudBackupStatus?.enabled ? 'Auto-Sync ON' : 'Manual'}
                  </span>
                </div>

                {/* Compact Sync & Upload Status */}
                <div
                  className={`p-3 obsidian-inset-neutral space-y-1.5 text-[11px] ${
                    isBespoke ? 'rounded-md bg-neutral-950 border border-neutral-800' : 'rounded-xl text-[10px]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Storage Auto-Sync:</span>
                    <span className="text-white font-semibold truncate font-mono">
                      {cloudBackupStatus?.enabled
                        ? `${cloudBackupStatus.providerLabel || 'Device Storage'} • ${
                            cloudBackupStatus.displayName || 'zero-backup.zbak'
                          }`
                        : 'Not set'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Last Saved:</span>
                    <span className="text-zinc-200 font-semibold truncate font-mono tabular-nums">
                      {cloudBackupStatus?.lastBackupTimestamp &&
                      cloudBackupStatus.lastBackupTimestamp > 0
                        ? new Date(cloudBackupStatus.lastBackupTimestamp).toLocaleString()
                        : 'Not saved yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-zinc-400">Last Cloud Upload:</span>
                    <span className="text-zinc-200 font-semibold truncate font-mono tabular-nums">
                      {lastCloudUploadTimestamp && lastCloudUploadTimestamp > 0
                        ? new Date(lastCloudUploadTimestamp).toLocaleString()
                        : 'Not uploaded yet'}
                    </span>
                  </div>
                </div>

                {cloudBackupStatus?.lastError && (
                  <div
                    className={`p-2.5 bg-red-950/50 border border-red-700/80 text-red-200 text-[11px] ${
                      isBespoke ? 'rounded-md' : 'rounded-xl text-[10px]'
                    }`}
                  >
                    {cloudBackupStatus.lastError}
                  </div>
                )}

                {restoreDisabled && (
                  <div
                    className={`p-2.5 bg-red-950/50 border border-red-700/80 text-red-200 text-[11px] leading-relaxed flex items-start gap-2 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl text-[10px]'
                    }`}
                  >
                    <ShieldAlert size={13} className="text-red-400 shrink-0 mt-0.5" />
                    <span>
                      <strong>Integrity Protection Active:</strong> Root access, custom test-keys ROM, or debug emulator detected. Backup restore is disabled; saves and uploads remain active.
                    </span>
                  </div>
                )}

                {(cloudNotice || backupNotice) && (
                  <div
                    className={`p-2.5 text-[11px] border ${
                      isBespoke ? 'rounded-md' : 'rounded-xl'
                    } ${
                      (cloudNotice || backupNotice)!.ok
                        ? isBespoke
                          ? 'bg-neutral-950 border-blue-500/60 text-blue-300'
                          : 'obsidian-inset text-zinc-100'
                        : 'bg-red-950/50 border-red-700 text-red-200'
                    }`}
                    style={
                      !isBespoke && (cloudNotice || backupNotice)!.ok
                        ? { color: 'var(--accent-hex, #FFFFFF)' }
                        : undefined
                    }
                  >
                    {(cloudNotice || backupNotice)!.message}
                  </div>
                )}

                {/* 1. Create Auto-Sync File in Storage */}
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
                        className={`w-full py-2.5 px-3 font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-60 ${
                          isBespoke
                            ? 'rounded-md bg-blue-600 hover:bg-blue-500 border border-blue-500 text-white transition-colors duration-75'
                            : 'rounded-xl obsidian-pill-active font-black active:scale-95 transition-all'
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
                      <div
                        className={`p-2.5 border flex items-center justify-between gap-2 ${
                          isBespoke
                            ? 'rounded-md bg-neutral-950 border-neutral-800'
                            : 'rounded-xl obsidian-inset-neutral'
                        }`}
                      >
                        <div className="min-w-0">
                          <div
                            className={`text-[11px] font-semibold truncate ${
                              isBespoke ? 'text-blue-400' : ''
                            }`}
                            style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                          >
                            Auto-Sync Linked
                          </div>
                          <div className="text-[10px] text-zinc-400 truncate font-mono">
                            {cloudBackupStatus.displayName || 'zero-backup.zbak'}
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
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
                            className={`py-1.5 px-2.5 obsidian-inset-neutral hover:border-white/30 text-white font-semibold text-[10px] uppercase ${
                              isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-lg font-bold'
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
                                  message: 'Auto-sync storage file unlinked.',
                                });
                              }}
                              className={`py-1.5 px-2.5 bg-zinc-950 border border-red-900/70 text-red-400 hover:text-red-300 font-semibold text-[10px] uppercase ${
                                isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-lg font-bold'
                              }`}
                            >
                              Turn Off
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* 2 & 3. One-Tap Save + Restore Data Picker */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={isCloudBusy}
                    onClick={async () => {
                      setCloudNotice(null);
                      if (onOneTapSaveBackup) {
                        const res = await onOneTapSaveBackup();
                        setBackupNotice({ ok: res.ok, message: res.message });
                      } else if (onExportZbakData) {
                        onExportZbakData();
                        setBackupNotice({
                          ok: true,
                          message: 'Saved zero-backup.zbak to storage.',
                        });
                      }
                    }}
                    className={`p-2.5 font-semibold flex items-center justify-center gap-1.5 text-[11px] disabled:opacity-60 ${
                      isBespoke
                        ? 'rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-neutral-100 transition-colors duration-75'
                        : 'rounded-xl obsidian-inset-neutral hover:border-white/25 text-white font-bold active:scale-95 transition-all'
                    }`}
                  >
                    <Save
                      size={13}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      className={isBespoke ? 'text-blue-400' : undefined}
                    />
                    <span>One-Tap Save</span>
                  </button>

                  {onRestoreFromCloudPicker && (
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
                      className={`p-2.5 font-semibold flex items-center justify-center gap-1.5 text-[11px] disabled:opacity-45 disabled:cursor-not-allowed ${
                        isBespoke
                          ? 'rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-neutral-100 transition-colors duration-75'
                          : 'rounded-xl obsidian-inset text-white font-bold active:scale-95 transition-all'
                      }`}
                    >
                      <Upload
                        size={13}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        className={isBespoke ? 'text-blue-400' : undefined}
                      />
                      <span>Restore Data Picker</span>
                    </button>
                  )}
                </div>

                {/* 4. Upload Stats to Cloud (opens chosen cloud app) */}
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
                    className={`w-full py-2.5 px-3 font-semibold text-xs flex items-center justify-center gap-2 disabled:opacity-60 ${
                      isBespoke
                        ? 'rounded-md bg-neutral-950 border border-neutral-800 hover:border-blue-500 text-neutral-100 transition-colors duration-75'
                        : 'rounded-xl obsidian-inset hover:border-white/30 text-white font-black active:scale-95 transition-all'
                    }`}
                  >
                    {isCloudBusy ? (
                      <Loader2 size={14} className="animate-spin" />
                    ) : (
                      <CloudUpload
                        size={14}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        className={isBespoke ? 'text-blue-400' : undefined}
                      />
                    )}
                    <span>Upload Stats to Cloud</span>
                  </button>
                )}

                {/* Cloud Upload Reminder Timer (1 Week / 1 Month / Off) */}
                {onCloudReminderIntervalChange && (
                  <div
                    className={`p-3 border space-y-2.5 ${
                      isBespoke
                        ? 'rounded-md bg-neutral-950 border-neutral-800'
                        : 'rounded-xl obsidian-inset-neutral'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="flex items-center gap-1.5 text-[11px] font-semibold text-white uppercase tracking-wider">
                        <Bell
                          size={12}
                          style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                          className={isBespoke ? 'text-blue-400' : undefined}
                        />
                        <span>Cloud Upload Reminder</span>
                      </span>
                      <span
                        className={`text-[10px] font-mono tabular-nums ${
                          nextCloudReminderInfo?.isDue
                            ? isBespoke
                              ? 'text-blue-400 font-semibold'
                              : 'font-bold'
                            : 'text-zinc-400'
                        }`}
                        style={
                          nextCloudReminderInfo?.isDue && !isBespoke
                            ? { color: 'var(--accent-hex, #FFFFFF)' }
                            : undefined
                        }
                      >
                        {formatCloudReminderCountdown(
                          cloudReminderInterval,
                          nextCloudReminderInfo,
                          lastCloudUploadTimestamp
                        )}
                      </span>
                    </div>

                    <div
                      role="radiogroup"
                      aria-label="Cloud Upload Reminder Timer"
                      className="grid grid-cols-3 gap-1.5"
                    >
                      {REMINDER_OPTIONS.map((opt) => {
                        const selected = cloudReminderInterval === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            role="radio"
                            aria-checked={selected}
                            onClick={() => onCloudReminderIntervalChange(opt.id)}
                            className={`py-2 px-2 text-[11px] font-semibold ${
                              isBespoke
                                ? `rounded-md border transition-colors duration-75 ${
                                    selected
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600 hover:text-neutral-200'
                                  }`
                                : `rounded-lg transition-all ${
                                    selected
                                      ? 'obsidian-pill-active font-black'
                                      : 'bg-black/50 border border-white/10 text-zinc-400 hover:text-white'
                                  }`
                            }`}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Subtle Bottom Reset Divider */}
                <div
                  className={`pt-2 border-t ${
                    isBespoke ? 'border-neutral-800' : 'border-white/10'
                  }`}
                >
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
                    className={`w-full py-2 px-3 bg-black/75 border border-red-950/90 hover:border-red-700 text-red-400 hover:text-red-300 flex items-center justify-center gap-2 text-[11px] font-medium ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl transition-colors'
                    }`}
                  >
                    <RotateCcw size={12} />
                    <span>Factory Reset App State</span>
                  </button>
                </div>
              </>
            }
            footerContent={
              <>
                <span>
                  Our stats, Escape Tickets &amp; donor perks &mdash; zero telemetry.
                </span>
                <span className="font-semibold text-zinc-300 font-mono">SHA-256 .ZBAK</span>
              </>
            }
          />

          {/* CARD #2: ANTI-SLEEP-FARMING RULE CARD */}
          <ObsidianCard
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName="p-5 space-y-3.5"
            footerClassName="px-5 py-3 text-[11px] text-zinc-400 leading-relaxed"
            headerContent={
              <>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-7 h-7 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                            }`
                      }
                    >
                      <Moon
                        size={15}
                        strokeWidth={1.75}
                        style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
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
                      <Check
                        size={16}
                        style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                        className="shrink-0 mt-0.5"
                      />
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
                      <Check
                        size={16}
                        style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                        className="shrink-0 mt-0.5"
                      />
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
                      <Check
                        size={16}
                        style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                        className="shrink-0 mt-0.5"
                      />
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
                  Using an Emergency Escape Ticket forfeits all accumulated hours in that specific broken session toward the 35-hour meter.
                </p>
              </>
            }
            footerContent={
              <div>
                <strong className="text-white">Example:</strong> If you set a 4-hour lock and use an escape ticket at hour 3, you spend 1 Escape Ticket and receive <strong className="text-red-300">0 hours</strong> toward your next one.
              </div>
            }
          />

          {/* CARD: Habit Calibration Profile */}
          <ObsidianCard
            className={isBespoke ? 'font-sans' : 'font-mono'}
            headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
            footerClassName={isBespoke ? 'px-5 py-2.5 flex items-center justify-between text-[11px] text-zinc-400' : 'px-4 py-2 flex items-center justify-between text-[10px] text-zinc-400'}
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs text-zinc-100 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                    <Target
                      size={14}
                      className={isBespoke ? 'text-blue-500' : undefined}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
                    <span>Habit Calibration Profile</span>
                  </span>
                  <span className="text-[10px] font-mono text-zinc-400">5 Questions</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Recalibrate your primary focus goal, distraction triggers, friction delay, vulnerability window, and daily reclaim target.
                </p>
                {onRecalibrateHabitProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tick(900);
                      onRecalibrateHabitProfile();
                    }}
                    className={`w-full py-2.5 px-3 obsidian-pill-active font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      isBespoke
                        ? 'rounded-md transition-colors duration-75'
                        : 'rounded-xl font-black active:scale-95 transition-all'
                    }`}
                  >
                    <Sliders size={14} />
                    <span>Re-calibrate Habit Profile</span>
                  </button>
                )}
              </>
            }
            footerContent={
              <span>Tunes recommended routines and friction engine</span>
            }
          />

          {/* CARD #5: Interactive Profile Card */}
          {onOpenProfileModal && (
            <ObsidianCard
              className={isBespoke ? 'font-sans' : 'font-mono'}
              headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
              footerClassName={isBespoke ? 'px-5 py-2.5 flex items-center justify-between gap-2 text-[11px] text-zinc-400' : 'px-4 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400'}
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs text-zinc-100 font-semibold uppercase tracking-wider flex items-center gap-1.5">
                      <UserPlus
                        size={14}
                        className={isBespoke ? 'text-blue-500' : undefined}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
                      <span>Interactive Zero Profile</span>
                    </span>
                    {!hasClaimedFirstTimeParachute && (
                      <span
                        className={`text-[9px] font-semibold uppercase px-2 py-0.5 inline-flex items-center gap-1 ${
                          isFluentGlass
                            ? 'liquid-pill-active rounded-full font-bold'
                            : `obsidian-pill-active ${isBespoke ? 'rounded-sm' : 'rounded-full font-black'}`
                        }`}
                      >
                        {isFluentGlass ? (
                          <>
                            <span>+1 Free</span>
                            <Ticket size={11} strokeWidth={1.75} />
                            <span>Gift</span>
                          </>
                        ) : (
                          <span>+1 Free 🎫 Gift</span>
                        )}
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
                            className={`text-[11px] truncate ${isBespoke ? 'text-blue-400' : ''}`}
                            style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                      <Sparkles size={14} strokeWidth={1.75} />
                      <span>
                        {hasClaimedFirstTimeParachute
                          ? 'Create Interactive Profile'
                          : isFluentGlass
                          ? 'Make Profile & Claim +1 Free Ticket'
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
            onClick={() => setActiveSection('themes')}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-5 flex items-center justify-between gap-3' : 'p-4 flex items-center justify-between gap-3'}
            footerClassName={isModernFont ? 'px-5 py-2.5 flex items-center justify-between text-[11px] text-zinc-400' : 'px-4 py-2 flex items-center justify-between text-[11px] text-zinc-400'}
            headerContent={
              <>
                <div className="flex items-center gap-2.5 text-xs text-zinc-100 font-semibold uppercase tracking-wider">
                  <div
                    className={
                      isFluentGlass
                        ? 'liquid-squircle text-cyan-200'
                        : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                            isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                          }`
                    }
                  >
                    <Palette
                      size={15}
                      strokeWidth={1.75}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
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
                  {activeInterfaceStyle === 'fluent_glass' || activeInterfaceStyle === 'fluent'
                    ? 'Fluent Glass'
                    : activeInterfaceStyle === 'material-you'
                    ? 'Material You (M3)'
                    : activeInterfaceStyle === 'trantor'
                    ? 'Trantor Sage-Obsidian'
                    : activeInterfaceStyle === 'classic-v2'
                    ? 'Classic UI Version 2 (Beta Test)'
                    : activeInterfaceStyle === 'classic'
                    ? 'Classic UI (Default)'
                    : 'Bespoke Minimalist'}
                </span>
                <strong className="text-white uppercase font-mono">
                  {activeInterfaceStyle === 'fluent_glass'
                    ? 'Pitch #000000 + Fluent Acrylic'
                    : themeConfig.family === 'amoled'
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
        <div className={isModernFont ? 'space-y-5' : 'space-y-4'}>
          <ObsidianCard
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName={isModernFont ? 'p-5 space-y-3' : 'p-4 space-y-2.5'}
            footerClassName={
              isModernFont
                ? 'px-5 py-3 text-[11px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
                : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
            }
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md text-blue-400' : 'rounded-xl'
                            }`
                      }
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      <Smartphone size={15} strokeWidth={1.75} />
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
                              hasNativeBridge && !coreGranted && isBlockedNow
                                ? 'bg-red-950/60 text-red-300 border-red-700/70 font-bold'
                                : hasNativeBridge && (coreGranted || !isBlockedNow)
                                ? isBespoke
                                  ? 'bg-blue-600/15 text-blue-400 border-blue-500/40 font-semibold'
                                  : 'font-bold'
                                : 'obsidian-inset-neutral text-zinc-400'
                            }`}
                            style={
                              !isBespoke && hasNativeBridge && (coreGranted || !isBlockedNow)
                                ? {
                                    background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                                    borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                                    color: 'var(--accent-hex, #FFFFFF)',
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
                              className={`text-[9px] px-2 py-0.5 border font-mono ${
                                isBespoke
                                  ? 'rounded-sm bg-blue-600/15 text-blue-400 border-blue-500/40'
                                  : 'rounded-full font-bold'
                              }`}
                              style={
                                isBespoke
                                  ? undefined
                                  : {
                                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                                      color: 'var(--accent-hex, #FFFFFF)',
                                    }
                              }
                            >
                              GRANTED
                            </span>
                          ) : isStep2Active ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border font-bold font-mono ${
                                isBespoke
                                  ? 'rounded-sm bg-blue-600/15 text-blue-400 border-blue-500/40'
                                  : 'rounded-full font-black'
                              }`}
                              style={
                                isBespoke
                                  ? undefined
                                  : {
                                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                                      color: 'var(--accent-hex, #FFFFFF)',
                                    }
                              }
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
                              className={`text-[9px] px-2 py-0.5 border font-mono ${
                                isBespoke
                                  ? 'rounded-sm bg-blue-600/15 text-blue-400 border-blue-500/40'
                                  : 'rounded-full font-bold'
                              }`}
                              style={
                                isBespoke
                                  ? undefined
                                  : {
                                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                                      color: 'var(--accent-hex, #FFFFFF)',
                                    }
                              }
                            >
                              GRANTED
                            </span>
                          ) : isStep3Active ? (
                            <span
                              className={`text-[9px] px-2 py-0.5 border font-bold font-mono ${
                                isBespoke
                                  ? 'rounded-sm bg-blue-600/15 text-blue-400 border-blue-500/40'
                                  : 'rounded-full font-black'
                              }`}
                              style={
                                isBespoke
                                  ? undefined
                                  : {
                                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                                      color: 'var(--accent-hex, #FFFFFF)',
                                    }
                              }
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
                          ? isBespoke
                            ? 'bg-blue-600/15 text-blue-400 border-blue-500/40'
                            : 'font-bold'
                          : 'obsidian-inset-neutral text-zinc-400'
                      }`}
                      style={
                        !isBespoke && isDeviceOwner
                          ? {
                              background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                              borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                              color: 'var(--accent-hex, #FFFFFF)',
                            }
                          : undefined
                      }
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
                  className={`font-semibold uppercase tracking-wider hover:brightness-125 ${
                    isBespoke ? 'text-blue-400' : ''
                  }`}
                  style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                      } ${
                        appBuildInfo && !appBuildInfo.isOfficialReleaseKey
                          ? 'text-red-400'
                          : isBespoke
                          ? 'text-blue-400'
                          : ''
                      }`}
                      style={
                        isBespoke || (appBuildInfo && !appBuildInfo.isOfficialReleaseKey)
                          ? undefined
                          : { color: 'var(--accent-hex, #FFFFFF)' }
                      }
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
                          ? isBespoke
                            ? 'bg-blue-600/15 text-blue-400 border-blue-500/40'
                            : 'font-bold'
                          : 'bg-red-950/60 text-red-300 border-red-700/70'
                      }`}
                      style={
                        !isBespoke && appBuildInfo.isOfficialReleaseKey
                          ? {
                              background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                              borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                              color: 'var(--accent-hex, #FFFFFF)',
                            }
                          : undefined
                      }
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
                      <span
                        className={`font-bold font-mono truncate max-w-[190px] ${
                          isBespoke ? 'text-blue-400' : ''
                        }`}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      >
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
                            environmentSecurity.isCompromised
                              ? 'text-red-400'
                              : isBespoke
                              ? 'text-blue-400'
                              : ''
                          }`}
                          style={
                            !isBespoke && !environmentSecurity.isCompromised
                              ? { color: 'var(--accent-hex, #FFFFFF)' }
                              : undefined
                          }
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
                    Permanent APK Release Key:{' '}
                    <code
                      className={`font-mono font-bold ${isBespoke ? 'text-blue-400' : ''}`}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      A14A36...CE11
                    </code>{' '}
                    (V1+V2+V3 signed).
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
                    <ShieldCheck
                      size={13}
                      className={`shrink-0 mt-0.5 ${isBespoke ? 'text-blue-400' : ''}`}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
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
                        isBespoke ? 'rounded-md text-blue-400' : 'rounded-xl'
                      }`}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                    {copiedId === 'adb_cmd' ? (
                      <Check
                        size={12}
                        className={isBespoke ? 'text-blue-400' : ''}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
                    ) : (
                      <Copy size={12} />
                    )}
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
                  className={`hover:underline font-semibold ${isBespoke ? 'text-blue-400' : ''}`}
                  style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
        <div className={isModernFont ? 'space-y-5' : 'space-y-4'}>
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            ambientGlow={!isBespoke}
            className={isModernFont ? 'font-sans' : 'font-mono'}
            headerClassName="p-5 space-y-3"
            footerClassName="px-5 py-3 flex items-center justify-between text-xs gap-2"
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5 text-white font-semibold text-sm">
                    <div
                      className={
                        isFluentGlass
                          ? 'liquid-squircle text-rose-300'
                          : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                              isBespoke ? 'rounded-md' : 'rounded-xl'
                            }`
                      }
                    >
                      <Heart size={15} strokeWidth={1.75} className="text-red-400 fill-red-400" />
                    </div>
                    <span>THE ZERO-DISTRACTIONS PROMISE</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      haptics.tick(900);
                      setShowCreditsModal(true);
                    }}
                    className="px-3 py-1 text-xs font-bold rounded-lg bg-white text-black hover:bg-zinc-200 transition-colors shadow-sm flex items-center gap-1.5 shrink-0"
                  >
                    <Users size={12} />
                    <span>Credits</span>
                  </button>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Zero App (Zero-Distractions) is 100% free, libre, and open-source software (FOSS). There are no paywalls,
                  no subscriptions, no analytics trackers, and no advertisements.
                </p>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  We believe your attention belongs to you—not to algorithms or paywalled apps.
                  Emergency Escape Tickets can never be purchased outright; earn 1 every 35 focus
                  hours, plus one-time free gifts (+1 starter on first profile, and strictly on your
                  1st tip of minimum ₹<span className="font-mono tabular-nums">{FIRST_DONATION_BONUS_INR}</span>: +1 thank-you ticket &amp; Golden{' '}
                  <strong className="text-white">ZERO-SUPPORTER</strong> badge).
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
                    isBespoke ? 'text-blue-400' : 'font-bold'
                  }`}
                  style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
              ambientGlow={!isBespoke}
              className={isBespoke ? 'font-sans' : 'font-mono'}
              headerClassName={isBespoke ? 'p-5 space-y-3.5' : 'p-4 space-y-3'}
              footerClassName={`px-5 py-2.5 text-[11px] leading-relaxed flex items-center justify-between gap-2 flex-wrap text-zinc-400 ${
                isBespoke ? '' : 'px-4 text-[10px]'
              }`}
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                        isBespoke
                          ? 'rounded-sm obsidian-pill-active font-semibold'
                          : 'rounded-md obsidian-pill-active font-black'
                      }`}
                    >
                      Best Offer • Best Option
                    </span>
                    <span
                      className={`px-2 py-0.5 obsidian-inset text-[10px] font-semibold ${
                        isBespoke ? 'rounded-sm text-blue-400' : 'rounded-md font-bold'
                      }`}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      NO MINIMUM LIMIT
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={
                          isFluentGlass
                            ? 'liquid-squircle font-bold text-xs text-cyan-200'
                            : `w-9 h-9 obsidian-icon-box flex items-center justify-center font-bold text-xs shrink-0 ${
                                isBespoke ? 'rounded-md font-mono text-blue-400' : 'rounded-xl text-white'
                              }`
                        }
                        style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      >
                        UPI
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-xs text-white">UPI / Instant Pay</div>
                        <div
                          className={`text-[11px] truncate font-mono ${
                            isBespoke ? 'text-zinc-300' : ''
                          }`}
                          style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                        {copiedId === 'upi' ? (
                          <Check
                            size={14}
                            className={isBespoke ? 'text-blue-400' : ''}
                            style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                          />
                        ) : (
                          <Copy size={14} />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* 1st Minimum ₹50 Supporter Bonus */}
                  {!hasClaimedFirstDonationParachute ? (
                    <div
                      className={`p-3.5 obsidian-inset space-y-2.5 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl space-y-2'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div
                          className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase ${
                            isFluentGlass ? 'text-cyan-200' : isBespoke ? 'text-blue-400' : ''
                          }`}
                          style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        >
                          <Gift size={13} strokeWidth={1.75} className="shrink-0" />
                          <span>
                            {isFluentGlass
                              ? `1st Tip ₹${FIRST_DONATION_BONUS_INR}+ = +1 Ticket & Supporter Badge`
                              : `1st Tip ₹${FIRST_DONATION_BONUS_INR}+ = +1 🎫 & Gold Badge`}
                          </span>
                        </div>
                        <span
                          className={`text-[9px] font-semibold uppercase px-1.5 py-0.5 obsidian-inset-neutral text-zinc-200 shrink-0 font-mono ${
                            isBespoke ? 'rounded-sm' : 'rounded font-bold'
                          }`}
                        >
                          Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-300 leading-relaxed">
                        <strong>Strict Rule:</strong> The{' '}
                        {isFluentGlass ? 'Platinum ' : 'Golden '}
                        <strong className="text-white">ZERO-SUPPORTER</strong> Profile Badge &amp;{' '}
                        <strong>
                          +1 Free Emergency Escape Ticket{isFluentGlass ? '' : ' (🎫)'}
                        </strong>{' '}
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
                            className={`flex-1 py-2 px-3 obsidian-pill-active text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                              isBespoke
                                ? 'rounded-md font-semibold transition-colors duration-75'
                                : isFluentGlass
                                ? 'rounded-xl font-bold liquid-spring'
                                : 'rounded-xl font-black active:scale-95 transition-all'
                            }`}
                          >
                            <span>
                              {isFluentGlass
                                ? `Tip ₹${FIRST_DONATION_BONUS_INR}+ (+1 Ticket & Badge)`
                                : `Tip ₹${FIRST_DONATION_BONUS_INR}+ (+1 🎫 & Gold)`}
                            </span>
                            <ExternalLink size={12} strokeWidth={1.75} />
                          </a>
                          {onClaimFirstDonationBonus && (
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(true)}
                              className={`px-3 py-2 obsidian-inset-neutral text-zinc-200 hover:text-white text-[10px] font-semibold ${
                                isBespoke
                                  ? 'rounded-md transition-colors duration-75'
                                  : isFluentGlass
                                  ? 'rounded-xl liquid-pill font-semibold'
                                  : 'rounded-xl font-bold'
                              }`}
                            >
                              Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                            </button>
                          )}
                        </div>
                      ) : (
                        <div
                          className={`p-2.5 obsidian-inset-neutral space-y-2 ${
                            isBespoke ? 'rounded-md' : 'rounded-xl'
                          }`}
                        >
                          <div className="text-[11px] text-zinc-200">
                            Confirm you sent your <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                            to unlock the {isFluentGlass ? 'Platinum ' : 'Golden '}
                            <strong className="text-white">ZERO-SUPPORTER</strong> Badge &amp;{' '}
                            <strong>
                              +1 Free Emergency Escape Ticket{isFluentGlass ? '' : ' (🎫)'}
                            </strong>
                            :
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onClaimFirstDonationBonus?.();
                                setConfirmingDonationClaim(false);
                              }}
                              className={`flex-1 py-2 px-2.5 obsidian-pill-active text-[10px] uppercase tracking-wider ${
                                isBespoke
                                  ? 'rounded-md font-semibold'
                                  : 'rounded-lg font-black'
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
                      className={`px-3 py-2 obsidian-inset flex items-center justify-between gap-2 flex-wrap text-[11px] ${
                        isBespoke ? 'rounded-md text-blue-400' : 'rounded-xl text-[10px]'
                      }`}
                      style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                    className={`w-full py-2.5 px-3 obsidian-pill-active text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 ${
                      isBespoke
                        ? 'rounded-md font-semibold transition-colors duration-75'
                        : 'rounded-xl font-black text-[11px] active:scale-95 transition-all'
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
                  <span
                    className={`font-semibold uppercase tracking-wider ${
                      isBespoke ? 'text-blue-400' : 'font-bold'
                    }`}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  >
                    Instant
                  </span>
                </>
              }
            />

            {/* Buy Me a Coffee via Ko-fi */}
            <ObsidianCard
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
                        isBespoke ? 'rounded-md text-blue-400' : 'rounded-xl'
                      }`}
                    >
                      <Coffee
                        size={17}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
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
                  <span
                    className={`font-semibold uppercase ${
                      isBespoke ? 'text-zinc-300' : 'font-bold'
                    }`}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  >
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
          className={`fixed inset-0 z-60 flex items-center justify-center px-4 ${
            isFluentGlass ? 'bg-black/75 backdrop-blur-sm' : 'bg-black/90'
          }`}
          style={{
            paddingTop: 'calc(1rem + var(--zero-safe-top))',
            paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
          }}
        >
          <ObsidianCard
            onSubmit={handleCreateSchedule}
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
                          isFluentGlass
                            ? `rounded-full font-sans ${
                                newDays.includes(idx)
                                  ? 'liquid-pill-active'
                                  : 'liquid-pill-inactive'
                              }`
                            : isBespoke
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

                {isOvernightSchedule(newStartTime, newEndTime) && (
                  <div className="p-2.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 text-[11px] font-mono flex items-center gap-2">
                    <Moon size={14} className="text-indigo-400 shrink-0" />
                    <span>Overnight Shift: Crosses midnight into next morning</span>
                  </div>
                )}

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
                  <Bell
                    size={12}
                    className={`shrink-0 ${isBespoke ? 'text-blue-400' : ''}`}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
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
      {/* Credits & Contributors Modal */}
      <CreditsModal
        isOpen={showCreditsModal}
        onClose={() => setShowCreditsModal(false)}
      />

      {/* Import Theme Mod JSON Modal */}
      {showImportModModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="max-w-md w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
              <h3 className="text-sm font-bold text-white">Import Theme Mod JSON</h3>
              <button
                type="button"
                onClick={() => {
                  setShowImportModModal(false);
                  setImportModError(null);
                  setImportModJson('');
                }}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-zinc-400">
              Paste a custom ThemeModConfig JSON string with custom variables and colors.
            </p>
            <textarea
              value={importModJson}
              onChange={(e) => {
                setImportModJson(e.target.value);
                setImportModError(null);
              }}
              rows={6}
              placeholder='{ "id": "my_theme", "name": "My Custom Theme", "family": "matte", ... }'
              className="w-full p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-mono text-white outline-none focus:border-blue-500 resize-none"
            />
            {importModError && (
              <div className="text-[11px] font-mono text-red-400 bg-red-500/10 p-2 rounded-lg border border-red-500/20">
                {importModError}
              </div>
            )}
            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowImportModModal(false);
                  setImportModError(null);
                  setImportModJson('');
                }}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const check = validateThemeModJson(importModJson);
                  if (!check.ok) {
                    setImportModError(check.error);
                    return;
                  }
                  saveUserCustomMod(check.mod);
                  setThemeModsList(getAllThemeMods());
                  applyThemeModStyles(check.mod);
                  setActiveModId(check.mod.id);
                  setShowImportModModal(false);
                  setImportModJson('');
                  setImportModError(null);
                }}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-colors"
              >
                Import &amp; Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
