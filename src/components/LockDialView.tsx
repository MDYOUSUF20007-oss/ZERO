import React, { useState, useRef, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import type {
  SessionTag,
  SessionRecord,
  ParachuteMetrics,
  OccasionBag,
  NativePermissionStatus,
  ZeroProfile,
  DashboardWidgetsConfig,
} from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
import { haptics } from '../utils/haptics';
import { ACCENT_ID_TO_KEY, ACCENT_STYLES, ProfileAvatar } from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges } from '../utils/achievements';
import {
  computeMiniWeekHeatmap,
  sanitizeWidgetsConfig,
  DEFAULT_WIDGETS_CONFIG,
} from '../utils/heatmapAnalytics';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Flame,
  ChevronRight,
  Briefcase,
  Phone,
  MessageSquare,
  Gift,
  Sparkles,
  UserPlus,
  Trophy,
  Palette,
  CloudUpload,
  CloudCog,
  Loader2,
  Download,
  HardDrive,
} from 'lucide-react';

interface LockDialViewProps {
  onIgnite: (durationSeconds: number, tag: SessionTag) => boolean;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  permissions: NativePermissionStatus;
  profile: ZeroProfile | null;
  isZeroSupporter: boolean;
  sessions: SessionRecord[];
  widgetsConfig?: DashboardWidgetsConfig;
  hasClaimedFirstTimeParachute: boolean;
  todayReclaimedHours: number;
  justEarnedParachute: boolean;
  showWeeklyBackupBanner?: boolean;
  isCloudBusy?: boolean;
  onOneTapUpload?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onTurnOnAutoBackup?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onExportZbakData?: () => string;
  onOpenDashboard: () => void;
  onOpenBagDrawer: () => void;
  onOpenPermissionGate: () => void;
  onOpenProfileModal: () => void;
  onOpenThemes: () => void;
  onOpenManualBackup?: () => void;
}

function getMiniHeatmapCellStyle(
  level: 0 | 1 | 2 | 3 | 4,
  isToday: boolean
): CSSProperties {
  const ringShadow = isToday ? ', 0 0 0 1.5px rgba(255, 255, 255, 0.78)' : '';
  switch (level) {
    case 1:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.18)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.36)',
        boxShadow: isToday ? '0 0 0 1.5px rgba(255, 255, 255, 0.78)' : undefined,
      };
    case 2:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.4)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.58)',
        boxShadow: isToday ? '0 0 0 1.5px rgba(255, 255, 255, 0.78)' : undefined,
      };
    case 3:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.66)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.85)',
        boxShadow: `0 0 8px rgba(var(--accent-rgb, 245, 158, 11), 0.28)${ringShadow}`,
      };
    case 4:
      return {
        background:
          'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.98)',
        boxShadow: `0 0 10px rgba(var(--accent-rgb, 245, 158, 11), 0.45)${ringShadow}`,
      };
    case 0:
    default:
      return {
        background: 'rgba(9, 9, 11, 0.84)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isToday ? '0 0 0 1.5px rgba(255, 255, 255, 0.78)' : undefined,
      };
  }
}

const PRESET_DURATIONS = [
  { label: '5m', seconds: 5 * 60, desc: 'Quick Reset' },
  { label: '15m', seconds: 15 * 60, desc: 'Sprint' },
  { label: '25m', seconds: 25 * 60, desc: 'Pomodoro' },
  { label: '45m', seconds: 45 * 60, desc: 'Deep Focus' },
  { label: '1h', seconds: 60 * 60, desc: 'Standard' },
  { label: '2h', seconds: 120 * 60, desc: 'Deep Work' },
  { label: '4h', seconds: 240 * 60, desc: 'Monk Mode' },
  { label: '8h', seconds: 480 * 60, desc: 'Overnight' },
  { label: '24h', seconds: 1440 * 60, desc: 'Full Detox' },
];

const SESSION_TAGS: SessionTag[] = ['Deep Work', 'Study', 'Family', 'Sleep', 'Detox'];
const MIN_SECS = 5 * 60;
const MAX_SECS = 24 * 3600;

export const LockDialView: React.FC<LockDialViewProps> = ({
  onIgnite,
  parachuteMetrics,
  activeBag,
  permissions,
  profile,
  isZeroSupporter,
  sessions,
  widgetsConfig,
  hasClaimedFirstTimeParachute,
  todayReclaimedHours,
  justEarnedParachute,
  showWeeklyBackupBanner = false,
  isCloudBusy = false,
  onOneTapUpload,
  onTurnOnAutoBackup,
  onExportZbakData,
  onOpenDashboard,
  onOpenBagDrawer,
  onOpenPermissionGate,
  onOpenProfileModal,
  onOpenThemes,
  onOpenManualBackup,
}) => {
  const [cloudBannerMsg, setCloudBannerMsg] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number>(45 * 60);
  const [selectedTag, setSelectedTag] = useState<SessionTag>('Deep Work');
  const [customTagInput, setCustomTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [allTags, setAllTags] = useState<SessionTag[]>(SESSION_TAGS);

  // Hold-to-lock states
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdStartTimeRef = useRef<number | null>(null);
  const holdAnimFrameRef = useRef<number | null>(null);

  const dialRef = useRef<HTMLDivElement>(null);
  const isDraggingDial = useRef<boolean>(false);

  const targetTimeStr = React.useMemo(() => {
    const d = new Date(Date.now() + durationSeconds * 1000);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }, [durationSeconds]);

  const formatDialTime = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
    return `${mins} min`;
  };

  const currentAngle = React.useMemo(() => {
    const pct = (durationSeconds - MIN_SECS) / (MAX_SECS - MIN_SECS);
    return Math.min(360, Math.max(0, pct * 360));
  }, [durationSeconds]);

  const handleDialMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      const dx = clientX - centerX;
      const dy = clientY - centerY;

      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      const rawSecs = MIN_SECS + (theta / 360) * (MAX_SECS - MIN_SECS);
      const steppedMins = Math.round(rawSecs / 300) * 5;
      const clampedSecs = Math.min(MAX_SECS, Math.max(MIN_SECS, steppedMins * 60));

      if (clampedSecs !== durationSeconds) {
        haptics.tick(700 + (clampedSecs / MAX_SECS) * 600);
        setDurationSeconds(clampedSecs);
      }
    },
    [durationSeconds]
  );

  const startDialScrub = (e: React.MouseEvent | React.TouchEvent) => {
    isDraggingDial.current = true;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    handleDialMove(clientX, clientY);
  };

  useEffect(() => {
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingDial.current) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      handleDialMove(clientX, clientY);
    };
    const onEnd = () => {
      if (isDraggingDial.current) {
        isDraggingDial.current = false;
        haptics.thud();
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [handleDialMove]);

  const HOLD_DURATION_MS = 3000;

  const triggerIgnition = useCallback(() => {
    setIsHolding(false);
    setHoldProgress(0);
    holdStartTimeRef.current = null;
    if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);

    if (permissions.isNativeAndroid && !permissions.strictReady) {
      onOpenPermissionGate();
      return;
    }

    const started = onIgnite(durationSeconds, selectedTag);
    if (started === false) {
      onOpenPermissionGate();
    }
  }, [durationSeconds, selectedTag, onIgnite, permissions.isNativeAndroid, permissions.strictReady, onOpenPermissionGate]);

  const updateHold = useCallback(() => {
    if (!holdStartTimeRef.current) return;
    const elapsed = Date.now() - holdStartTimeRef.current;
    const prog = Math.min(1, elapsed / HOLD_DURATION_MS);
    setHoldProgress(prog);

    if (prog >= 1) {
      triggerIgnition();
    } else {
      holdAnimFrameRef.current = requestAnimationFrame(updateHold);
    }
  }, [triggerIgnition]);

  const startHold = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (permissions.isNativeAndroid && !permissions.strictReady) {
      haptics.tick(500);
      onOpenPermissionGate();
      return;
    }
    setIsHolding(true);
    setHoldProgress(0);
    holdStartTimeRef.current = Date.now();
    haptics.startHoldCharge();
    holdAnimFrameRef.current = requestAnimationFrame(updateHold);
  };

  const cancelHold = () => {
    if (isHolding) {
      setIsHolding(false);
      setHoldProgress(0);
      holdStartTimeRef.current = null;
      haptics.stopHoldCharge();
      if (holdAnimFrameRef.current) cancelAnimationFrame(holdAnimFrameRef.current);
    }
  };

  const handleAddCustomTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (customTagInput.trim()) {
      const tag = customTagInput.trim();
      if (!allTags.includes(tag)) {
        setAllTags([...allTags, tag]);
      }
      setSelectedTag(tag);
      setCustomTagInput('');
      setIsAddingTag(false);
    }
  };

  const profileRank = getZeroRankFromHours(parachuteMetrics.totalReclaimedHours);
  const badgeSummary = useMemo(
    () =>
      evaluateBadges({
        sessions,
        totalReclaimedHours: parachuteMetrics.totalReclaimedHours,
        isZeroSupporter,
      }),
    [sessions, parachuteMetrics.totalReclaimedHours, isZeroSupporter]
  );
  const resolvedWidgets = useMemo(
    () => sanitizeWidgetsConfig(widgetsConfig ?? DEFAULT_WIDGETS_CONFIG),
    [widgetsConfig]
  );
  const miniWeek = useMemo(
    () => computeMiniWeekHeatmap(sessions, profile?.dailyGoalHours || 4),
    [sessions, profile?.dailyGoalHours]
  );
  const profileAccentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
  const profileAccent = profile
    ? ACCENT_STYLES[profile.accentColor] || ACCENT_STYLES.amber
    : ACCENT_STYLES.amber;
  const dailyGoalPct = profile
    ? Math.min(100, Math.round((todayReclaimedHours / Math.max(1, profile.dailyGoalHours)) * 100))
    : 0;
  const balanceBadgeText =
    parachuteMetrics.bonusParachutes > 0
      ? parachuteMetrics.lifetimeEarnedParachutes === parachuteMetrics.bonusParachutes
        ? 'Starter Gift Ready'
        : `+${parachuteMetrics.bonusParachutes} Bonus + Earned`
      : 'Earned-Only';

  return (
    <div className="flex-1 flex flex-col items-center justify-between px-4 py-3 pb-24 max-w-md mx-auto w-full select-none gap-3">
      {/* Interactive Profile Strip + 1-Tap Theme Studio Shortcut */}
      <div className="w-full flex items-stretch gap-2">
        {profile ? (
          <ObsidianCard
            accent={profileAccentKey}
            fullWidth={false}
            className="flex-1 min-w-0"
            headerClassName="p-2.5 flex items-center justify-between gap-2.5"
            headerContent={
              <>
                <ProfileAvatar
                  avatarId={profile.avatarId}
                  accent={profile.accentColor}
                  size="sm"
                  interactive
                />
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="flex-1 min-w-0 text-left font-mono group flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-bold text-xs text-white truncate">
                        {profile.displayName}
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${profileAccent.badgeBg}`}
                      >
                        {profileRank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5 flex items-center gap-1.5">
                      <span>
                        {todayReclaimedHours}h / {profile.dailyGoalHours}h • #{profile.primaryMission}
                      </span>
                      {badgeSummary.unlockedBadges.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-amber-300 font-bold shrink-0">
                          <Trophy size={9} />
                          {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-8 bg-zinc-900 border border-white/10 rounded-full h-1.5 overflow-hidden hidden sm:block">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${dailyGoalPct}%`,
                          background: 'var(--accent-badge-gradient, #F59E0B)',
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-400 group-hover:text-white font-bold">
                      Edit
                    </span>
                  </div>
                </button>
              </>
            }
          />
        ) : (
          <ObsidianCard
            accent={profileAccentKey}
            asButton
            fullWidth={false}
            onClick={onOpenProfileModal}
            className="flex-1 min-w-0"
            headerClassName="p-2.5 px-3 flex items-center justify-between gap-2 font-mono"
            headerContent={
              <>
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0" style={{ color: 'var(--accent-hex, #F59E0B)' }}>
                    {hasClaimedFirstTimeParachute ? <UserPlus size={15} /> : <Gift size={15} />}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {hasClaimedFirstTimeParachute
                        ? 'Create Profile'
                        : 'Make Profile • +1 Free 🎫'}
                    </div>
                    <div className="text-[10px] text-amber-200/80 truncate">
                      {hasClaimedFirstTimeParachute
                        ? 'Emblem, daily goal & pledge'
                        : 'Free starter Escape Ticket'}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg obsidian-pill-active text-[10px] font-black uppercase shrink-0">
                  <Sparkles size={11} />
                  <span>{hasClaimedFirstTimeParachute ? 'Create' : 'Claim'}</span>
                </span>
              </>
            }
          />
        )}

        <ObsidianCard
          accent={profileAccentKey}
          asButton
          fullWidth={false}
          onClick={() => {
            haptics.tick(820);
            onOpenThemes();
          }}
          className="shrink-0"
          headerClassName="flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-mono text-zinc-300 hover:text-white"
          title="Open Theme Studio (AMOLED, Paper Kindle, Matte)"
          aria-label="Open Theme Studio"
          headerContent={
            <>
              <div className="w-6 h-6 rounded-lg obsidian-icon-box flex items-center justify-center">
                <Palette size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wider">Theme</span>
            </>
          }
        />
      </div>

      {/* Top Banner: Escape Ticket Balance & Milestone Progress (Two-Tier ObsidianCard) */}
      <ObsidianCard
        asButton
        accent={profileAccentKey}
        onClick={onOpenDashboard}
        className={
          justEarnedParachute
            ? 'ring-2 ring-amber-400/50 animate-parachute-card-pop'
            : ''
        }
        overlays={
          justEarnedParachute ? (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-parachute-shimmer"
            />
          ) : undefined
        }
        headerClassName="p-3.5 flex items-center justify-between gap-2 group"
        footerClassName="px-3.5 py-2 flex items-center justify-between gap-2 text-[11px] font-mono text-zinc-400"
        headerContent={
          <>
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center font-mono text-base shrink-0 transition-transform ${
                  justEarnedParachute ? 'scale-105' : ''
                }`}
              >
                <span className={justEarnedParachute ? 'animate-parachute-float inline-block' : ''}>
                  🎫
                </span>
              </div>
              <div className="text-left min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-mono font-bold text-sm text-zinc-100">
                    {parachuteMetrics.currentBalance}{' '}
                    {parachuteMetrics.currentBalance === 1 ? 'Escape Ticket' : 'Escape Tickets'}
                  </span>
                  <span
                    className={`text-[10px] uppercase font-mono px-1.5 py-0.5 rounded font-semibold ${
                      justEarnedParachute || parachuteMetrics.bonusParachutes > 0
                        ? 'obsidian-inset text-amber-300'
                        : 'obsidian-inset-neutral text-zinc-300'
                    }`}
                  >
                    {balanceBadgeText}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200 shrink-0">
              <div className="w-12 bg-zinc-900 border border-white/10 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${parachuteMetrics.progressPercentage}%`,
                    background: 'var(--accent-badge-gradient, #F59E0B)',
                  }}
                />
              </div>
              <ChevronRight size={16} />
            </div>
          </>
        }
        footerContent={
          <>
            <span>{parachuteMetrics.hoursUntilNextParachute}h to next (+1 per 20h milestone)</span>
            <span className="font-bold" style={{ color: 'var(--accent-hex, #F59E0B)' }}>
              {parachuteMetrics.progressPercentage}%
            </span>
          </>
        }
      />

      {/* Native Android Strict Permission Banner */}
      {permissions.isNativeAndroid && (
        <ObsidianCard
          asButton
          onClick={onOpenPermissionGate}
          headerClassName="px-3.5 py-2.5 font-mono text-[11px] flex items-center justify-between gap-2"
          footerClassName="px-3.5 py-1.5 font-mono text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center gap-2 min-w-0">
                {permissions.strictReady ? (
                  <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
                ) : (
                  <ShieldAlert
                    size={14}
                    style={{ color: 'var(--accent-hex, #F59E0B)' }}
                    className="shrink-0"
                  />
                )}
                <span className="font-bold truncate text-zinc-100">
                  {permissions.strictReady
                    ? !permissions.hasNotificationPermission
                      ? 'Guard Armed • Optional Notifications'
                      : permissions.isStrictAccessibilityBuild
                      ? 'Strict Accessibility Guard: Armed'
                      : 'Overlay + Usage Guard: Armed'
                    : 'Permissions Required Before Locking'}
                </span>
              </div>
              {permissions.strictReady ? (
                <span
                  className="text-[10px] font-bold shrink-0 ml-2"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  Check
                </span>
              ) : (
                <span className="text-[10px] px-2 py-0.5 rounded-lg obsidian-pill-active font-black uppercase tracking-wider shrink-0 ml-2">
                  Grant Now
                </span>
              )}
            </>
          }
          footerContent={
            permissions.strictReady && permissions.hasNotificationPermission ? undefined : (
              <span>
                {permissions.strictReady
                  ? 'Tap to enable lock countdown & 5-minute schedule alerts.'
                  : 'Order: Usage / Accessibility -> App Info (if denied) -> Overlay'}
              </span>
            )
          }
        />
      )}

      {/* Mode B: Weekly 1-Tap Cloud Backup Reminder Banner (Pure AMOLED #000000 + Purple #8B5CF6) */}
      {(showWeeklyBackupBanner || cloudBannerMsg) && (
        <ObsidianCard
          data-amoled-banner="true"
          accentOverride={{ hex: '#8B5CF6', rgb: '139, 92, 246' }}
          headerClassName="p-3.5 font-mono space-y-2.5"
          footerClassName="px-3.5 py-2 font-mono"
          style={{
            backgroundColor: '#000000',
            borderColor: 'rgba(139, 92, 246, 0.58)',
            boxShadow: '0 0 24px -10px rgba(139, 92, 246, 0.45)',
            color: '#FFFFFF',
          }}
          headerContent={
            <>
              {showWeeklyBackupBanner && (
                <>
                  <div className="flex items-start gap-2.5">
                    <div
                      className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0 border"
                      style={{
                        backgroundColor: 'rgba(139, 92, 246, 0.14)',
                        borderColor: 'rgba(139, 92, 246, 0.45)',
                        color: '#A78BFA',
                      }}
                    >
                      <CloudUpload size={14} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="amoled-banner-title text-[11px] font-black text-white leading-snug">
                        Weekly Backup Due — Keep your donor badges &amp; stats safe
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      disabled={isCloudBusy}
                      onClick={async () => {
                        if (!onOneTapUpload) return;
                        haptics.tick(860);
                        const res = await onOneTapUpload();
                        if (!res.cancelled && res.message) {
                          setCloudBannerMsg(res.message);
                          setTimeout(() => setCloudBannerMsg(''), 4500);
                        }
                      }}
                      className="py-2 px-2.5 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                      style={{
                        backgroundColor: '#8B5CF6',
                        color: '#FFFFFF',
                      }}
                    >
                      {isCloudBusy ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <CloudUpload size={12} />
                      )}
                      <span>1-Tap Upload</span>
                    </button>

                    <button
                      type="button"
                      disabled={isCloudBusy}
                      onClick={async () => {
                        if (!onTurnOnAutoBackup) return;
                        haptics.tick(900);
                        const res = await onTurnOnAutoBackup();
                        if (!res.cancelled && res.message) {
                          setCloudBannerMsg(res.message);
                          setTimeout(() => setCloudBannerMsg(''), 4500);
                        }
                      }}
                      className="amoled-banner-secondary py-2 px-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60"
                      style={{
                        backgroundColor: '#09090B',
                        borderColor: 'rgba(139, 92, 246, 0.45)',
                        color: '#E9D5FF',
                      }}
                    >
                      <CloudCog size={12} />
                      <span>Turn On Auto-Backup</span>
                    </button>
                  </div>

                  {(onExportZbakData || onOpenManualBackup) && (
                    <div className="grid grid-cols-2 gap-2">
                      {onExportZbakData && (
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(820);
                            onExportZbakData();
                            setCloudBannerMsg('Saved signed zero-backup.zbak manually.');
                            setTimeout(() => setCloudBannerMsg(''), 4500);
                          }}
                          className="amoled-banner-secondary py-1.5 px-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          style={{
                            backgroundColor: '#09090B',
                            borderColor: 'rgba(139, 92, 246, 0.35)',
                            color: '#DDD6FE',
                          }}
                        >
                          <Download size={11} />
                          <span>Export .zbak</span>
                        </button>
                      )}
                      {onOpenManualBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(820);
                            onOpenManualBackup();
                          }}
                          className="amoled-banner-secondary py-1.5 px-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          style={{
                            backgroundColor: '#09090B',
                            borderColor: 'rgba(139, 92, 246, 0.35)',
                            color: '#DDD6FE',
                          }}
                        >
                          <HardDrive size={11} />
                          <span>Manual Options &rarr;</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {cloudBannerMsg && (
                <div
                  className="text-[10px] px-2.5 py-1.5 rounded-lg border"
                  style={{
                    backgroundColor: 'rgba(139, 92, 246, 0.12)',
                    borderColor: 'rgba(139, 92, 246, 0.4)',
                    color: '#E9D5FF',
                  }}
                >
                  {cloudBannerMsg}
                </div>
              )}
            </>
          }
          footerContent={
            <div
              className="amoled-banner-sub text-[10px] leading-snug"
              style={{ color: '#C4B5FD' }}
            >
              Signed <code>zero-backup.zbak</code> saves to Drive, OneDrive, JioDrive or device storage.
            </div>
          }
        />
      )}

      {/* Optional Compact 7-Day Discipline Widget Strip (Toggled in Insights -> Widgets) */}
      {resolvedWidgets.showDialWidget && (
        <ObsidianCard
          asButton
          accent={profileAccentKey}
          onClick={onOpenDashboard}
          className="font-mono"
          headerClassName="p-3 flex items-center justify-between gap-2.5"
          footerClassName="px-3 py-1.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex-1 min-w-0 space-y-1.5 text-left">
                <div className="flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-zinc-400">
                  <span>7-Day Discipline</span>
                  <span style={{ color: 'var(--accent-hex, #F59E0B)' }}>
                    {miniWeek.goalMetDays}/7 Goal
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {miniWeek.weekCells.map((cell) => (
                    <div
                      key={cell.dateStr}
                      style={getMiniHeatmapCellStyle(cell.level, cell.isToday)}
                      className="h-7 rounded-lg flex flex-col items-center justify-center"
                      title={cell.detailLabel}
                    >
                      <span
                        className="text-[8px] font-black leading-none"
                        style={{
                          color:
                            cell.level === 4
                              ? 'var(--accent-badge-text, #09090B)'
                              : cell.isToday
                              ? '#FFFFFF'
                              : '#A1A1AA',
                        }}
                      >
                        {cell.dayShort[0]}
                      </span>
                      <span
                        className="text-[7px] font-bold leading-none mt-0.5"
                        style={{
                          color:
                            cell.level === 4
                              ? 'var(--accent-badge-text, #09090B)'
                              : cell.seconds > 0
                              ? '#E4E4E7'
                              : '#52525B',
                        }}
                      >
                        {cell.seconds > 0 ? `${cell.hours}h` : '·'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="px-2.5 py-2 rounded-xl obsidian-inset flex flex-col items-center justify-center shrink-0 min-w-[66px]">
                <span
                  className="text-sm font-black leading-none"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  {miniWeek.weekTotalHours}h
                </span>
                <span className="text-[8px] font-bold uppercase tracking-widest text-zinc-400 mt-1">
                  WEEK
                </span>
              </div>
            </>
          }
          footerContent={
            <>
              <span>Weekly discipline pulse</span>
              <span className="font-bold text-zinc-300">Daily / Monthly / All &rarr;</span>
            </>
          }
        />
      )}

      {/* Center: Tactile Duration Dial Wheel */}
      <div className="my-auto flex flex-col items-center justify-center relative w-full py-2">
        <div
          ref={dialRef}
          onMouseDown={startDialScrub}
          onTouchStart={startDialScrub}
          className="zero-dial-ring obsidian-dial-bezel relative w-60 h-60 sm:w-68 sm:h-68 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow"
          style={{ touchAction: 'none' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 288">
            <circle
              cx="144"
              cy="144"
              r="132"
              fill="none"
              stroke="rgba(255, 255, 255, 0.14)"
              strokeOpacity="0.6"
              strokeWidth="12"
              strokeDasharray="2 10"
            />
            <circle
              cx="144"
              cy="144"
              r="132"
              fill="none"
              stroke="var(--accent-hex, #F59E0B)"
              strokeWidth="5"
              strokeDasharray={`${(currentAngle / 360) * 829.38} 829.38`}
              strokeLinecap="round"
              transform="rotate(-90 144 144)"
              className="transition-[stroke-dasharray] duration-75"
            />
          </svg>

          <div
            className="absolute w-full h-full pointer-events-none transition-transform duration-75"
            style={{ transform: `rotate(${currentAngle}deg)` }}
          >
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border"
              style={{
                backgroundColor: 'var(--accent-hex, #F59E0B)',
                borderColor: '#09090B',
                boxShadow: '0 0 14px var(--accent-hex, rgba(245, 158, 11, 0.75))',
              }}
            />
          </div>

          <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
            <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase mb-1 font-semibold">
              Lock Duration
            </span>
            <div className="font-mono text-4xl font-black tracking-tight text-white drop-shadow">
              {formatDialTime(durationSeconds)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-zinc-400">
              <Clock size={12} style={{ color: 'var(--accent-hex, #A1A1AA)' }} />
              <span>Until {targetTimeStr}</span>
            </div>
          </div>
        </div>

        {/* Quick-Preset Chips */}
        <div className="flex items-center justify-center gap-1.5 flex-wrap max-w-sm mt-4">
          {PRESET_DURATIONS.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                haptics.thud();
                setDurationSeconds(preset.seconds);
              }}
              className={`px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                durationSeconds === preset.seconds
                  ? 'obsidian-pill-active font-black'
                  : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Bottom Area: The 4-Bag Selector, Tags & Hold to Lock */}
      <div className="w-full flex flex-col items-center gap-3 mt-auto">
        {/* Session Tags */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
              Session Focus Tag
            </span>
            <button
              onClick={() => setIsAddingTag(!isAddingTag)}
              className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200"
            >
              {isAddingTag ? 'Cancel' : '+ Custom'}
            </button>
          </div>

          {isAddingTag ? (
            <form onSubmit={handleAddCustomTag} className="flex gap-2 mb-1">
              <input
                type="text"
                value={customTagInput}
                onChange={(e) => setCustomTagInput(e.target.value)}
                placeholder="e.g. Thesis, Meditation..."
                maxLength={20}
                autoFocus
                className="flex-1 obsidian-input text-xs text-white rounded-xl px-3 py-2 font-mono outline-none"
              />
              <button
                type="submit"
                className="obsidian-pill-active text-xs font-mono font-black px-3.5 py-2 rounded-xl uppercase"
              >
                Add
              </button>
            </form>
          ) : (
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-0.5">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    haptics.tick(900);
                    setSelectedTag(tag);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
                    selectedTag === tag
                      ? 'obsidian-pill-active font-black'
                      : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Bag Card (Two-Tier Frosted Obsidian) */}
        <ObsidianCard
          asButton
          accent={profileAccentKey}
          onClick={onOpenBagDrawer}
          headerClassName="p-3.5 flex items-center justify-between gap-2 text-left font-mono group"
          footerClassName="px-3.5 py-2 flex items-center justify-between gap-2 flex-wrap font-mono text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                  <Briefcase size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-bold text-white truncate">
                      Bag: {activeBag.name}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded obsidian-inset-neutral text-zinc-300 shrink-0">
                      {activeBag.apps.length}/{MAX_BAG_APPS} apps
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                    {activeBag.occasionLabel}
                  </div>
                </div>
              </div>
              <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white shrink-0 ml-2 flex items-center gap-0.5">
                Pack <ChevronRight size={14} />
              </span>
            </>
          }
          footerContent={
            <>
              <div className="flex items-center gap-2.5">
                <span className={activeBag.allowCalls ? 'text-emerald-400 flex items-center gap-1 font-semibold' : 'flex items-center gap-1'}>
                  <Phone size={10} /> {activeBag.allowCalls ? 'Calls ON' : 'Calls Off'}
                </span>
                <span className={activeBag.allowSms ? 'text-emerald-400 flex items-center gap-1 font-semibold' : 'flex items-center gap-1'}>
                  <MessageSquare size={10} /> {activeBag.allowSms ? 'SMS ON' : 'SMS Off'}
                </span>
              </div>
              <span className="text-zinc-300 break-words">
                {activeBag.apps.length > 0
                  ? activeBag.apps.map((a) => a.appName).join(', ')
                  : 'Monk Mode (0 apps)'}
              </span>
            </>
          }
        />

        {/* 3-Second Hold to Ignite Button */}
        <div className="w-full flex flex-col items-center">
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            className={`relative w-full h-15 py-4 rounded-2xl obsidian-shell-bar border font-mono font-black text-sm tracking-wider uppercase overflow-hidden transition-all select-none flex items-center justify-center ${
              isHolding ? 'scale-[0.99]' : 'active:scale-[0.99]'
            }`}
            style={{
              touchAction: 'none',
              borderColor: isHolding
                ? 'var(--accent-hex, #FFFFFF)'
                : 'rgba(var(--accent-rgb, 245, 158, 11), 0.5)',
              boxShadow: isHolding
                ? '0 0 28px -2px rgba(var(--accent-rgb, 245, 158, 11), 0.52), inset 0 1px 0 rgba(255,255,255,0.16)'
                : '0 0 22px -6px rgba(var(--accent-rgb, 245, 158, 11), 0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-4 right-4 h-[1.5px] opacity-80"
              style={{
                background:
                  'linear-gradient(90deg, transparent 0%, var(--accent-hex, #F59E0B) 50%, transparent 100%)',
              }}
            />
            <div
              className="absolute left-0 top-0 bottom-0 transition-all pointer-events-none"
              style={{
                width: `${holdProgress * 100}%`,
                opacity: isHolding ? 0.96 : 0,
                background:
                  'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
              }}
            />

            <div
              className={`relative z-10 flex items-center justify-center gap-2 transition-colors ${
                holdProgress > 0.5 ? 'font-black' : 'text-zinc-100'
              }`}
              style={{
                color:
                  holdProgress > 0.5
                    ? 'var(--accent-badge-text, #09090B)'
                    : undefined,
              }}
            >
              {isHolding ? (
                <>
                  <Flame size={18} className="animate-bounce" />
                  <span>Arming... {Math.ceil((1 - holdProgress) * 3)}s</span>
                </>
              ) : permissions.isNativeAndroid && !permissions.strictReady ? (
                <>
                  <ShieldAlert size={18} className="text-amber-400" />
                  <span>Grant Permissions to Lock</span>
                </>
              ) : (
                <>
                  <ShieldAlert size={18} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  <span>Hold 3s to Lock</span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
