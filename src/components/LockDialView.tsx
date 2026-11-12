import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  SessionTag,
  SessionRecord,
  ParachuteMetrics,
  OccasionBag,
  NativePermissionStatus,
  ZeroProfile,
  CloudReminderInterval,
} from '../types';
import { haptics } from '../utils/haptics';
import {
  DEFAULT_SESSION_TAGS,
  mergeHashtagList,
  normalizeCustomHashtag,
} from '../utils/bagLayout';
import { ProfileAvatar } from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges } from '../utils/achievements';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import {
  ShieldAlert,
  Clock,
  Flame,
  ChevronRight,
  Briefcase,
  Phone,
  MessageSquare,
  Gift,
  Sparkles,
  Ticket,
  UserPlus,
  Trophy,
  Palette,
  CloudUpload,
  Loader2,
  Download,
} from 'lucide-react';

interface LockDialViewProps {
  onIgnite: (durationSeconds: number, tag: SessionTag) => boolean;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  permissions: NativePermissionStatus;
  profile: ZeroProfile | null;
  customHashtags?: string[];
  onAddCustomHashtag?: (tag: string) => string | null;
  isZeroSupporter: boolean;
  sessions: SessionRecord[];
  hasClaimedFirstTimeParachute: boolean;
  todayReclaimedHours: number;
  justEarnedParachute: boolean;
  showWeeklyBackupBanner?: boolean;
  cloudReminderInterval?: CloudReminderInterval;
  isCloudBusy?: boolean;
  onOneTapUpload?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onOneTapSave?: () => Promise<{ ok: boolean; message: string }>;
  onExportZbakData?: () => string;
  onOpenTicketModal: () => void;
  onOpenBagDrawer: () => void;
  onOpenPermissionGate: () => void;
  onOpenProfileModal: () => void;
  onOpenThemes: () => void;
  onOpenManualBackup?: () => void;
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

const MIN_SECS = 5 * 60;
const MAX_SECS = 24 * 3600;
const DIAL_ARC_CIRCUMFERENCE = 829.38;
const UNTIL_TIME_FMT = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
});

function formatDialTime(secs: number): string {
  const hours = Math.floor(secs / 3600);
  const mins = Math.floor((secs % 3600) / 60);
  if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
  if (hours > 0) return `${hours} hr${hours > 1 ? 's' : ''}`;
  return `${mins} min`;
}

function formatUntilTime(secs: number): string {
  return UNTIL_TIME_FMT.format(new Date(Date.now() + secs * 1000));
}

function secsToDialAngle(secs: number): number {
  const pct = (secs - MIN_SECS) / (MAX_SECS - MIN_SECS);
  return Math.min(360, Math.max(0, pct * 360));
}

const DialTickRing = React.memo(function DialTickRing({
  isBespoke,
  isLiquidGlass,
}: {
  isBespoke: boolean;
  isLiquidGlass: boolean;
}) {
  return (
    <circle
      cx="144"
      cy="144"
      r="132"
      fill="none"
      stroke={
        isBespoke
          ? '#262626'
          : isLiquidGlass
          ? 'rgba(255, 255, 255, 0.2)'
          : 'rgba(255, 255, 255, 0.14)'
      }
      strokeOpacity={isBespoke ? '1' : isLiquidGlass ? '0.75' : '0.6'}
      strokeWidth={isBespoke ? '8' : '12'}
      strokeDasharray={isBespoke ? '1.5 8.5' : '2 10'}
    />
  );
});

const DialWheelSection = React.memo(function DialWheelSection({
  durationSeconds,
  onSelectDuration,
  isBespoke,
  isLiquidGlass,
}: {
  durationSeconds: number;
  onSelectDuration: (secs: number) => void;
  isBespoke: boolean;
  isLiquidGlass: boolean;
}) {
  const dialRef = useRef<HTMLDivElement>(null);
  const arcRef = useRef<SVGCircleElement>(null);
  const knobLayerRef = useRef<HTMLDivElement>(null);
  const durationTextRef = useRef<HTMLDivElement>(null);
  const untilTextRef = useRef<HTMLSpanElement>(null);

  const isDraggingRef = useRef<boolean>(false);
  const dialCenterRef = useRef<{ cx: number; cy: number }>({ cx: 0, cy: 0 });
  const latestSecsRef = useRef<number>(durationSeconds);
  const pendingCoordsRef = useRef<{ x: number; y: number } | null>(null);
  const rafIdRef = useRef<number | null>(null);
  const lastTouchAtRef = useRef<number>(0);
  const onSelectDurationRef = useRef(onSelectDuration);

  useEffect(() => {
    onSelectDurationRef.current = onSelectDuration;
  }, [onSelectDuration]);

  const applyDialVisuals = useCallback((secs: number) => {
    const angle = secsToDialAngle(secs);
    if (arcRef.current) {
      arcRef.current.setAttribute(
        'stroke-dasharray',
        `${(angle / 360) * DIAL_ARC_CIRCUMFERENCE} ${DIAL_ARC_CIRCUMFERENCE}`
      );
    }
    if (knobLayerRef.current) {
      knobLayerRef.current.style.transform = `rotate(${angle}deg)`;
    }
    if (durationTextRef.current) {
      durationTextRef.current.textContent = formatDialTime(secs);
    }
    if (untilTextRef.current) {
      untilTextRef.current.textContent = formatUntilTime(secs);
    }
  }, []);

  useEffect(() => {
    if (!isDraggingRef.current) {
      latestSecsRef.current = durationSeconds;
      applyDialVisuals(durationSeconds);
    }
  }, [durationSeconds, applyDialVisuals]);

  const computeAndApplyCoords = useCallback(
    (clientX: number, clientY: number) => {
      const { cx, cy } = dialCenterRef.current;
      const dx = clientX - cx;
      const dy = clientY - cy;

      let theta = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (theta < 0) theta += 360;

      const rawSecs = MIN_SECS + (theta / 360) * (MAX_SECS - MIN_SECS);
      const steppedMins = Math.round(rawSecs / 300) * 5;
      const clampedSecs = Math.min(MAX_SECS, Math.max(MIN_SECS, steppedMins * 60));

      if (clampedSecs !== latestSecsRef.current) {
        latestSecsRef.current = clampedSecs;
        haptics.tick(700 + (clampedSecs / MAX_SECS) * 600);
        applyDialVisuals(clampedSecs);
      }
    },
    [applyDialVisuals]
  );

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (!dialRef.current || e.touches.length === 0) return;
      lastTouchAtRef.current = Date.now();
      const rect = dialRef.current.getBoundingClientRect();
      dialCenterRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      };
      isDraggingRef.current = true;
      dialRef.current.dataset.dialDragging = 'true';
      computeAndApplyCoords(e.touches[0].clientX, e.touches[0].clientY);
    },
    [computeAndApplyCoords]
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (Date.now() - lastTouchAtRef.current < 500) return;
      if (!dialRef.current) return;
      const rect = dialRef.current.getBoundingClientRect();
      dialCenterRef.current = {
        cx: rect.left + rect.width / 2,
        cy: rect.top + rect.height / 2,
      };
      isDraggingRef.current = true;
      dialRef.current.dataset.dialDragging = 'true';
      computeAndApplyCoords(e.clientX, e.clientY);
    },
    [computeAndApplyCoords]
  );

  useEffect(() => {
    const flushPending = () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      const coords = pendingCoordsRef.current;
      pendingCoordsRef.current = null;
      if (coords && isDraggingRef.current) {
        computeAndApplyCoords(coords.x, coords.y);
      }
    };

    const scheduleMove = (clientX: number, clientY: number) => {
      if (!isDraggingRef.current) return;
      pendingCoordsRef.current = { x: clientX, y: clientY };
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const coords = pendingCoordsRef.current;
          pendingCoordsRef.current = null;
          if (coords && isDraggingRef.current) {
            computeAndApplyCoords(coords.x, coords.y);
          }
        });
      }
    };

    const onMouseMove = (e: MouseEvent) => scheduleMove(e.clientX, e.clientY);
    const onTouchMove = (e: TouchEvent) => {
      if (!isDraggingRef.current || e.touches.length === 0) return;
      scheduleMove(e.touches[0].clientX, e.touches[0].clientY);
    };

    const onEnd = () => {
      if (!isDraggingRef.current) return;
      flushPending();
      isDraggingRef.current = false;
      if (dialRef.current) {
        delete dialRef.current.dataset.dialDragging;
      }
      haptics.thud();
      onSelectDurationRef.current(latestSecsRef.current);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onEnd);
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onEnd);
    window.addEventListener('touchcancel', onEnd);
    window.addEventListener('blur', onEnd);

    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
      window.removeEventListener('touchcancel', onEnd);
      window.removeEventListener('blur', onEnd);
    };
  }, [computeAndApplyCoords]);

  const initialAngle = secsToDialAngle(durationSeconds);

  return (
    <div className="my-auto flex flex-col items-center justify-center relative w-full py-2">
      <div
        ref={dialRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
        className={
          isBespoke
            ? 'zero-dial-surface relative w-64 h-64 sm:w-72 sm:h-72 rounded-md bg-black border border-neutral-800 flex items-center justify-center cursor-grab active:cursor-grabbing'
            : 'zero-dial-surface zero-dial-ring obsidian-dial-bezel relative w-60 h-60 sm:w-68 sm:h-68 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow'
        }
        style={{ touchAction: 'none' }}
      >
        <svg
          className={`absolute pointer-events-none ${
            isBespoke ? 'inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)]' : 'inset-0 w-full h-full'
          }`}
          viewBox="0 0 288 288"
        >
          {isLiquidGlass && (
            <defs>
              <linearGradient id="zeroLiquidDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="50%" stopColor="#00F2FE" />
                <stop offset="100%" stopColor="#4FACFE" />
              </linearGradient>
            </defs>
          )}
          <DialTickRing isBespoke={isBespoke} isLiquidGlass={isLiquidGlass} />
          <circle
            ref={arcRef}
            cx="144"
            cy="144"
            r="132"
            fill="none"
            stroke={
              isBespoke
                ? '#2563EB'
                : isLiquidGlass
                ? 'url(#zeroLiquidDialGrad)'
                : 'var(--accent-hex, #FFFFFF)'
            }
            strokeWidth={isBespoke ? '4' : '5'}
            strokeDasharray={`${(initialAngle / 360) * DIAL_ARC_CIRCUMFERENCE} ${DIAL_ARC_CIRCUMFERENCE}`}
            strokeLinecap={isBespoke ? 'butt' : 'round'}
            transform="rotate(-90 144 144)"
            className="zero-dial-arc transition-[stroke-dasharray] duration-75"
          />
        </svg>

        <div
          ref={knobLayerRef}
          className={`zero-dial-knob-layer absolute pointer-events-none transition-transform duration-75 ${
            isBespoke ? 'inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)]' : 'w-full h-full'
          }`}
          style={{ transform: `rotate(${initialAngle}deg)` }}
        >
          {isBespoke ? (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-4 rounded-none bg-blue-500 border border-black" />
          ) : (
            <div
              className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full border"
              style={{
                backgroundColor: isLiquidGlass ? '#E0F7FF' : 'var(--accent-hex, #FFFFFF)',
                borderColor: '#09090B',
                boxShadow: isLiquidGlass
                  ? '0 0 14px rgba(0, 242, 254, 0.85)'
                  : '0 0 14px var(--accent-hex, rgba(255, 255, 255, 0.75))',
              }}
            />
          )}
        </div>

        <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
          <span
            className={
              isLiquidGlass
                ? 'text-[11px] font-sans tracking-[0.14em] text-zinc-400 uppercase mb-1 font-medium'
                : isBespoke
                ? 'text-[11px] font-sans tracking-[0.14em] text-neutral-400 uppercase mb-1.5 font-medium'
                : 'text-[11px] font-mono tracking-widest text-zinc-400 uppercase mb-1 font-semibold'
            }
          >
            Lock Duration
          </span>
          <div
            ref={durationTextRef}
            className={
              isLiquidGlass
                ? 'font-sans tabular-nums text-4xl font-semibold tracking-tight liquid-metric'
                : isBespoke
                ? 'font-mono tabular-nums text-4xl font-semibold tracking-tight text-neutral-50'
                : 'font-mono text-4xl font-black tracking-tight text-white drop-shadow'
            }
          >
            {formatDialTime(durationSeconds)}
          </div>
          <div
            className={
              isLiquidGlass || isBespoke
                ? 'flex items-center gap-1.5 mt-2 text-xs font-sans text-zinc-400'
                : 'flex items-center gap-1.5 mt-1.5 text-xs font-mono text-zinc-400'
            }
          >
            <Clock
              size={12}
              strokeWidth={1.75}
              style={
                isBespoke || isLiquidGlass ? undefined : { color: 'var(--accent-hex, #A1A1AA)' }
              }
              className={isLiquidGlass ? 'text-cyan-300' : isBespoke ? 'text-blue-500' : undefined}
            />
            <span>
              Until{' '}
              <span ref={untilTextRef} className="font-mono tabular-nums text-zinc-200">
                {formatUntilTime(durationSeconds)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Quick-Preset Chips */}
      <div
        className={`flex items-center justify-center flex-wrap max-w-sm ${
          isBespoke || isLiquidGlass ? 'gap-2 mt-5' : 'gap-1.5 mt-4'
        }`}
      >
        {PRESET_DURATIONS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              haptics.thud();
              onSelectDuration(preset.seconds);
            }}
            className={
              isLiquidGlass
                ? `px-3 py-1.5 text-xs font-sans tabular-nums rounded-xl ${
                    durationSeconds === preset.seconds
                      ? 'liquid-pill-active font-semibold'
                      : 'liquid-pill text-zinc-300'
                  }`
                : isBespoke
                ? `px-3 py-1.5 text-xs font-mono tabular-nums rounded-md border transition-colors duration-75 ${
                    durationSeconds === preset.seconds
                      ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                      : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                  }`
                : `px-2.5 py-1 text-xs font-mono rounded-lg transition-all ${
                    durationSeconds === preset.seconds
                      ? 'obsidian-pill-active font-black'
                      : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
                  }`
            }
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
});

export const LockDialView: React.FC<LockDialViewProps> = ({
  onIgnite,
  parachuteMetrics,
  activeBag,
  permissions,
  profile,
  customHashtags = [],
  onAddCustomHashtag,
  isZeroSupporter,
  sessions,
  hasClaimedFirstTimeParachute,
  todayReclaimedHours,
  justEarnedParachute,
  showWeeklyBackupBanner = false,
  cloudReminderInterval = 'weekly',
  isCloudBusy = false,
  onOneTapUpload,
  onOneTapSave,
  onExportZbakData,
  onOpenTicketModal,
  onOpenBagDrawer,
  onOpenPermissionGate,
  onOpenProfileModal,
  onOpenThemes,
  onOpenManualBackup,
}) => {
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();
  const isModernFont = isBespoke || isLiquidGlass;
  const [cloudBannerMsg, setCloudBannerMsg] = useState<string>('');
  const [durationSeconds, setDurationSeconds] = useState<number>(45 * 60);
  const [selectedTag, setSelectedTag] = useState<SessionTag>('Deep Work');
  const [customTagInput, setCustomTagInput] = useState('');
  const [isAddingTag, setIsAddingTag] = useState(false);
  const [localExtraTags, setLocalExtraTags] = useState<string[]>([]);

  // Hold-to-lock states
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [isHolding, setIsHolding] = useState<boolean>(false);
  const holdStartTimeRef = useRef<number | null>(null);
  const holdAnimFrameRef = useRef<number | null>(null);

  const allTags = useMemo(
    () => mergeHashtagList([...customHashtags, ...localExtraTags], DEFAULT_SESSION_TAGS),
    [customHashtags, localExtraTags]
  );

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
    const cleaned = normalizeCustomHashtag(customTagInput);
    if (!cleaned) return;
    const added = onAddCustomHashtag?.(cleaned) ?? cleaned;
    setLocalExtraTags((prev) => mergeHashtagList([...prev, added], []));
    setSelectedTag(added);
    setCustomTagInput('');
    setIsAddingTag(false);
    haptics.tick(880);
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
  const dailyGoalPct = profile
    ? Math.min(100, Math.round((todayReclaimedHours / Math.max(1, profile.dailyGoalHours)) * 100))
    : 0;

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-between max-w-md mx-auto w-full select-none ${
        isLiquidGlass
          ? 'px-4 py-4 pb-32 gap-5 font-sans'
          : isBespoke
          ? 'px-4 py-4 pb-24 gap-5 font-sans'
          : 'px-4 py-3 pb-24 gap-3'
      }`}
    >
      {/* Interactive Profile Strip + Compact Escape Ticket + 1-Tap Theme Studio Shortcut */}
      <div className={`w-full flex items-stretch ${isModernFont ? 'gap-2' : 'gap-1.5'}`}>
        {profile ? (
          <ObsidianCard
            fullWidth={false}
            className="flex-1 min-w-0"
            headerClassName={
              isModernFont
                ? 'p-3 flex items-center justify-between gap-2.5'
                : 'p-2.5 flex items-center justify-between gap-2'
            }
            headerContent={
              <>
                <ProfileAvatar
                  avatarId={profile.avatarId}
                  size="sm"
                  interactive={!isBespoke}
                />
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className={`flex-1 min-w-0 text-left group flex items-center justify-between gap-1.5 ${
                    isModernFont ? 'font-sans' : 'font-mono'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span
                        className={`truncate ${
                          isBespoke
                            ? 'font-semibold text-xs text-neutral-50'
                            : isLiquidGlass
                            ? 'font-semibold text-xs text-white'
                            : 'font-bold text-xs text-white'
                        }`}
                      >
                        {profile.displayName}
                      </span>
                      <span
                        className={
                          isLiquidGlass
                            ? 'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-300/35 text-cyan-200 shrink-0'
                            : isBespoke
                            ? 'text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-blue-400 shrink-0'
                            : 'text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 obsidian-pill-active'
                        }
                      >
                        {profileRank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                    <div
                      className={`truncate mt-0.5 flex items-center gap-1.5 ${
                        isModernFont ? 'text-[11px] text-zinc-400' : 'text-[10px] text-zinc-400'
                      }`}
                    >
                      <span>
                        <span className="font-mono tabular-nums">
                          {todayReclaimedHours}h / {profile.dailyGoalHours}h
                        </span>{' '}
                        • #{profile.primaryMission}
                      </span>
                      {badgeSummary.unlockedBadges.length > 0 && (
                        <span
                          className={`inline-flex items-center gap-0.5 shrink-0 font-mono tabular-nums ${
                            isLiquidGlass
                              ? 'text-cyan-200 font-semibold'
                              : isBespoke
                              ? 'text-blue-400 font-semibold'
                              : 'font-bold'
                          }`}
                          style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        >
                          <Trophy size={9} strokeWidth={1.75} />
                          {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div
                      className={
                        isLiquidGlass
                          ? 'w-8 liquid-track rounded-full h-1.5 hidden sm:block'
                          : isBespoke
                          ? 'w-7 bg-neutral-950 border border-neutral-800 rounded-none h-1.5 overflow-hidden hidden sm:block'
                          : 'w-7 bg-zinc-900 border border-white/10 rounded-full h-1.5 overflow-hidden hidden sm:block'
                      }
                    >
                      <div
                        className={
                          isLiquidGlass
                            ? 'h-full liquid-mercury-fill'
                            : isBespoke
                            ? 'h-full rounded-none bg-blue-600 transition-all duration-75'
                            : 'h-full rounded-full transition-all'
                        }
                        style={{
                          width: `${dailyGoalPct}%`,
                          ...(isLiquidGlass
                            ? {}
                            : {
                                background: isBespoke
                                  ? '#2563EB'
                                  : 'var(--accent-badge-gradient, #FFFFFF)',
                              }),
                        }}
                      />
                    </div>
                    <span
                      className={
                        isModernFont
                          ? 'text-[11px] text-zinc-400 group-hover:text-white font-medium transition-colors duration-75'
                          : 'text-[10px] text-zinc-400 group-hover:text-white font-bold'
                      }
                    >
                      Edit
                    </span>
                  </div>
                </button>
              </>
            }
          />
        ) : (
          <ObsidianCard
            asButton
            fullWidth={false}
            onClick={onOpenProfileModal}
            className="flex-1 min-w-0"
            headerClassName={
              isModernFont
                ? 'p-3 flex items-center justify-between gap-2.5 font-sans'
                : 'p-2.5 flex items-center justify-between gap-2 font-mono'
            }
            headerContent={
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className={
                      isLiquidGlass
                        ? 'liquid-squircle text-cyan-200'
                        : `w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                            isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                          }`
                    }
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  >
                    {hasClaimedFirstTimeParachute ? (
                      <UserPlus size={15} strokeWidth={1.75} />
                    ) : (
                      <Gift size={15} strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div
                      className={`text-xs truncate ${
                        isModernFont ? 'font-semibold text-white' : 'font-bold text-white'
                      }`}
                    >
                      {hasClaimedFirstTimeParachute ? 'Create Profile' : 'Profile • +1 Ticket'}
                    </div>
                    <div
                      className={`text-[10px] truncate ${
                        isLiquidGlass
                          ? 'text-cyan-200/80'
                          : isBespoke
                          ? 'text-neutral-400'
                          : ''
                      }`}
                      style={
                        isModernFont
                          ? undefined
                          : { color: 'var(--accent-hex, #FFFFFF)', opacity: 0.8 }
                      }
                    >
                      {hasClaimedFirstTimeParachute ? 'Goal & emblem' : 'Free starter ticket'}
                    </div>
                  </div>
                </div>
                <span
                  className={
                    isLiquidGlass
                      ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-pill-active text-[10px] font-semibold uppercase tracking-wide shrink-0'
                      : isBespoke
                      ? 'inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-blue-600 border border-blue-500 text-white text-[10px] font-semibold uppercase tracking-wide shrink-0'
                      : 'inline-flex items-center gap-1 px-2 py-1 rounded-lg obsidian-pill-active text-[10px] font-black uppercase shrink-0'
                  }
                >
                  <Sparkles size={10} strokeWidth={1.75} />
                  <span>{hasClaimedFirstTimeParachute ? 'Set' : 'Claim'}</span>
                </span>
              </>
            }
          />
        )}

        {/* Compact Escape Ticket Shortcut (left of Theme) */}
        <ObsidianCard
          asButton
          fullWidth={false}
          onClick={() => {
            haptics.tick(860);
            onOpenTicketModal();
          }}
          style={
            justEarnedParachute && !isBespoke && !isLiquidGlass
              ? { boxShadow: '0 0 0 2px var(--accent-hex, #FFFFFF)' }
              : undefined
          }
          className={`shrink-0 ${
            justEarnedParachute
              ? isBespoke || isLiquidGlass
                ? 'border-cyan-400/60'
                : 'animate-parachute-card-pop'
              : ''
          }`}
          headerClassName={
            isModernFont
              ? 'flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-sans text-zinc-300 hover:text-white transition-colors duration-75'
              : 'flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-mono text-zinc-300 hover:text-white'
          }
          title={`Escape Tickets (${parachuteMetrics.currentBalance}) — Tap to inspect ticket`}
          aria-label={`View Escape Ticket (${parachuteMetrics.currentBalance} available)`}
          headerContent={
            <>
              <div
                className={`h-6 px-2 obsidian-icon-box flex items-center justify-center gap-1 ${
                  isBespoke ? 'rounded-sm' : isLiquidGlass ? 'rounded-xl' : 'rounded-lg'
                }`}
              >
                {isBespoke || isLiquidGlass ? (
                  <Ticket
                    size={12}
                    strokeWidth={1.75}
                    className={isLiquidGlass ? 'text-cyan-200 shrink-0' : 'text-blue-500 shrink-0'}
                  />
                ) : (
                  <span
                    className={`text-xs leading-none ${
                      justEarnedParachute ? 'animate-parachute-float inline-block' : ''
                    }`}
                  >
                    🎫
                  </span>
                )}
                <span
                  className={
                    isModernFont
                      ? 'text-[11px] font-sans tabular-nums font-semibold leading-none text-white'
                      : 'text-[11px] font-black leading-none'
                  }
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                >
                  {parachuteMetrics.currentBalance}
                </span>
              </div>
              <span
                className={`text-[9px] uppercase tracking-wider leading-none ${
                  isModernFont ? 'font-medium text-zinc-400' : 'font-bold'
                }`}
              >
                {parachuteMetrics.currentBalance === 1 ? 'Ticket' : 'Tickets'}
              </span>
            </>
          }
        />

        <ObsidianCard
          asButton
          fullWidth={false}
          onClick={() => {
            haptics.tick(820);
            onOpenThemes();
          }}
          className="shrink-0"
          headerClassName={
            isModernFont
              ? 'flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-sans text-zinc-300 hover:text-white transition-colors duration-75'
              : 'flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-mono text-zinc-300 hover:text-white'
          }
          title="Open Theme Studio (AMOLED, Paper Kindle, Matte)"
          aria-label="Open Theme Studio"
          headerContent={
            <>
              <div
                className={`w-6 h-6 obsidian-icon-box flex items-center justify-center ${
                  isBespoke ? 'rounded-sm' : isLiquidGlass ? 'rounded-xl' : 'rounded-lg'
                }`}
              >
                <Palette
                  size={12}
                  strokeWidth={1.75}
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  className={
                    isLiquidGlass ? 'text-cyan-200' : isBespoke ? 'text-blue-500' : undefined
                  }
                />
              </div>
              <span
                className={`text-[9px] uppercase tracking-wider leading-none ${
                  isModernFont ? 'font-medium text-zinc-400' : 'font-bold'
                }`}
              >
                Theme
              </span>
            </>
          }
        />
      </div>

      {/* Native Android Strict Permission Banner — only shown when permissions are NOT armed yet */}
      {permissions.isNativeAndroid && !permissions.strictReady && (
        <ObsidianCard
          asButton
          onClick={onOpenPermissionGate}
          headerClassName={
            isModernFont
              ? 'px-4 py-3 font-sans text-xs flex items-center justify-between gap-2'
              : 'px-3.5 py-2.5 font-mono text-[11px] flex items-center justify-between gap-2'
          }
          footerClassName={
            isModernFont
              ? 'px-4 py-2 font-sans text-[10px] text-zinc-400'
              : 'px-3.5 py-1.5 font-mono text-[10px] text-zinc-400'
          }
          headerContent={
            <>
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert
                  size={14}
                  strokeWidth={1.75}
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  className={
                    isLiquidGlass
                      ? 'shrink-0 text-cyan-200'
                      : isBespoke
                      ? 'shrink-0 text-blue-500'
                      : 'shrink-0'
                  }
                />
                <span
                  className={`truncate ${
                    isModernFont ? 'font-semibold text-white' : 'font-bold text-zinc-100'
                  }`}
                >
                  Permissions Required Before Locking
                </span>
              </div>
              <span
                className={
                  isLiquidGlass
                    ? 'text-[10px] px-2.5 py-1 rounded-xl liquid-pill-active font-semibold uppercase tracking-wide shrink-0 ml-2'
                    : isBespoke
                    ? 'text-[10px] px-2.5 py-1 rounded-md bg-blue-600 border border-blue-500 text-white font-semibold uppercase tracking-wide shrink-0 ml-2'
                    : 'text-[10px] px-2 py-0.5 rounded-lg obsidian-pill-active font-black uppercase tracking-wider shrink-0 ml-2'
                }
              >
                Grant Now
              </span>
            </>
          }
          footerContent={
            <span>
              Order: Usage / Accessibility -&gt; App Info (if denied) -&gt; Overlay
            </span>
          }
        />
      )}

      {/* Weekly / Monthly Cloud Upload Reminder Banner */}
      {(showWeeklyBackupBanner || cloudBannerMsg) && (
        <ObsidianCard
          data-amoled-banner="true"
          accentOverride={
            isBespoke || isLiquidGlass
              ? { hex: '#4FACFE', rgb: '79, 172, 254' }
              : { hex: '#8B5CF6', rgb: '139, 92, 246' }
          }
          headerClassName={
            isModernFont ? 'p-5 font-sans space-y-3' : 'p-3.5 font-mono space-y-2.5'
          }
          footerClassName={isModernFont ? 'px-5 py-2.5 font-sans' : 'px-3.5 py-2 font-mono'}
          style={
            isBespoke || isLiquidGlass
              ? undefined
              : {
                  backgroundColor: '#000000',
                  borderColor: 'rgba(139, 92, 246, 0.58)',
                  boxShadow: '0 0 24px -10px rgba(139, 92, 246, 0.45)',
                  color: '#FFFFFF',
                }
          }
          headerContent={
            <>
              {showWeeklyBackupBanner && (
                <>
                  <div className="flex items-start gap-3">
                    <div
                      className={
                        isLiquidGlass
                          ? 'liquid-squircle text-cyan-200'
                          : `flex items-center justify-center shrink-0 border ${
                              isBespoke
                                ? 'w-8 h-8 rounded-md bg-neutral-950 border-neutral-800 text-blue-500'
                                : 'w-7 h-7 rounded-xl'
                            }`
                      }
                      style={
                        isBespoke || isLiquidGlass
                          ? undefined
                          : {
                              backgroundColor: 'rgba(139, 92, 246, 0.14)',
                              borderColor: 'rgba(139, 92, 246, 0.45)',
                              color: '#A78BFA',
                            }
                      }
                    >
                      <CloudUpload size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div
                        className={
                          isModernFont
                            ? 'text-xs font-semibold text-white leading-snug'
                            : 'amoled-banner-title text-[11px] font-black text-white leading-snug'
                        }
                      >
                        {cloudReminderInterval === 'monthly'
                          ? 'Monthly Cloud Upload Due — Keep your donor perks & stats safe'
                          : 'Weekly Cloud Upload Due — Keep your donor perks & stats safe'}
                      </div>
                    </div>
                  </div>

                  {onOneTapUpload && (
                    <button
                      type="button"
                      disabled={isCloudBusy}
                      onClick={async () => {
                        haptics.tick(860);
                        const res = await onOneTapUpload();
                        if (!res.cancelled && res.message) {
                          setCloudBannerMsg(res.message);
                          setTimeout(() => setCloudBannerMsg(''), 4500);
                        }
                      }}
                      className={
                        isLiquidGlass
                          ? 'w-full py-2.5 px-3 rounded-xl liquid-pill-active font-semibold text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-60'
                          : isBespoke
                          ? 'w-full py-2.5 px-3 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75 disabled:opacity-60'
                          : 'w-full py-2.5 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60'
                      }
                      style={
                        isBespoke || isLiquidGlass
                          ? undefined
                          : {
                              backgroundColor: '#8B5CF6',
                              color: '#FFFFFF',
                            }
                      }
                    >
                      {isCloudBusy ? (
                        <Loader2 size={12} strokeWidth={1.75} className="animate-spin" />
                      ) : (
                        <CloudUpload size={12} strokeWidth={1.75} />
                      )}
                      <span>Upload Stats to Cloud</span>
                    </button>
                  )}

                  {(onOneTapSave || onExportZbakData || onOpenManualBackup) && (
                    <div className="grid grid-cols-2 gap-2.5">
                      {(onOneTapSave || onExportZbakData) && (
                        <button
                          type="button"
                          disabled={isCloudBusy}
                          onClick={async () => {
                            haptics.tick(820);
                            if (onOneTapSave) {
                              const res = await onOneTapSave();
                              setCloudBannerMsg(res.message);
                            } else {
                              onExportZbakData?.();
                              setCloudBannerMsg('Saved zero-backup.zbak to storage.');
                            }
                            setTimeout(() => setCloudBannerMsg(''), 4500);
                          }}
                          className={
                            isLiquidGlass
                              ? 'py-2 px-3 rounded-xl liquid-pill font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-60'
                              : isBespoke
                              ? 'py-2 px-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75 disabled:opacity-60'
                              : 'amoled-banner-secondary py-1.5 px-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-60'
                          }
                          style={
                            isBespoke || isLiquidGlass
                              ? undefined
                              : {
                                  backgroundColor: '#09090B',
                                  borderColor: 'rgba(139, 92, 246, 0.35)',
                                  color: '#DDD6FE',
                                }
                          }
                        >
                          <Download size={11} strokeWidth={1.75} />
                          <span>One-Tap Save</span>
                        </button>
                      )}
                      {onOpenManualBackup && (
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(820);
                            onOpenManualBackup();
                          }}
                          className={
                            isLiquidGlass
                              ? 'py-2 px-3 rounded-xl liquid-pill font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5'
                              : isBespoke
                              ? 'py-2 px-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75'
                              : 'amoled-banner-secondary py-1.5 px-2.5 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                          }
                          style={
                            isBespoke || isLiquidGlass
                              ? undefined
                              : {
                                  backgroundColor: '#09090B',
                                  borderColor: 'rgba(139, 92, 246, 0.35)',
                                  color: '#DDD6FE',
                                }
                          }
                        >
                          <Clock size={11} strokeWidth={1.75} />
                          <span>Timer / Settings &rarr;</span>
                        </button>
                      )}
                    </div>
                  )}
                </>
              )}

              {cloudBannerMsg && (
                <div
                  className={
                    isModernFont
                      ? 'text-[11px] px-3 py-2 rounded-xl liquid-row text-zinc-200'
                      : 'text-[10px] px-2.5 py-1.5 rounded-lg border'
                  }
                  style={
                    isModernFont
                      ? undefined
                      : {
                          backgroundColor: 'rgba(139, 92, 246, 0.12)',
                          borderColor: 'rgba(139, 92, 246, 0.4)',
                          color: '#E9D5FF',
                        }
                  }
                >
                  {cloudBannerMsg}
                </div>
              )}
            </>
          }
          footerContent={
            <div
              className={
                isModernFont
                  ? 'text-[11px] text-zinc-400 leading-snug'
                  : 'amoled-banner-sub text-[10px] leading-snug'
              }
              style={isModernFont ? undefined : { color: '#C4B5FD' }}
            >
              Saves only your stats, Escape Tickets &amp; donor perks (<code className="font-mono">zero-backup.zbak</code>).
            </div>
          }
        />
      )}

      {/* Center: Tactile Duration Dial Wheel */}
      <DialWheelSection
        durationSeconds={durationSeconds}
        onSelectDuration={setDurationSeconds}
        isBespoke={isBespoke}
        isLiquidGlass={isLiquidGlass}
      />

      {/* Bottom Area: The 4-Bag Selector, Tags & Hold to Lock */}
      <div className={`w-full flex flex-col items-center mt-auto ${isModernFont ? 'gap-4' : 'gap-3'}`}>
        {/* Session Tags */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span
              className={
                isModernFont
                  ? 'text-[11px] font-sans uppercase tracking-wider text-zinc-400 font-medium'
                  : 'text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold'
              }
            >
              Session Focus Tag
            </span>
            <button
              onClick={() => setIsAddingTag(!isAddingTag)}
              className={
                isModernFont
                  ? 'text-[11px] font-sans text-zinc-400 hover:text-white transition-colors duration-75'
                  : 'text-[11px] font-mono text-zinc-400 hover:text-zinc-200'
              }
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
                className={
                  isLiquidGlass
                    ? 'flex-1 obsidian-input text-xs text-white rounded-xl px-3 py-2 font-sans outline-none'
                    : isBespoke
                    ? 'flex-1 obsidian-input text-xs text-neutral-100 rounded-md px-3 py-2 font-sans outline-none'
                    : 'flex-1 obsidian-input text-xs text-white rounded-xl px-3 py-2 font-mono outline-none'
                }
              />
              <button
                type="submit"
                className={
                  isLiquidGlass
                    ? 'liquid-pill-active text-xs font-sans font-semibold px-4 py-2 rounded-xl uppercase tracking-wide'
                    : isBespoke
                    ? 'bg-blue-600 border border-blue-500 text-white text-xs font-sans font-semibold px-4 py-2 rounded-md uppercase tracking-wide transition-colors duration-75'
                    : 'obsidian-pill-active text-xs font-mono font-black px-3.5 py-2 rounded-xl uppercase'
                }
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
                  className={
                    isLiquidGlass
                      ? `px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap ${
                          selectedTag === tag
                            ? 'liquid-pill-active font-semibold'
                            : 'liquid-pill text-zinc-300 font-medium'
                        }`
                      : isBespoke
                      ? `px-3 py-1.5 rounded-md text-xs font-sans font-medium whitespace-nowrap border transition-colors duration-75 ${
                          selectedTag === tag
                            ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-200'
                        }`
                      : `px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all ${
                          selectedTag === tag
                            ? 'obsidian-pill-active font-black'
                            : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
                        }`
                  }
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Bag Card */}
        <ObsidianCard
          asButton
          onClick={onOpenBagDrawer}
          headerClassName={
            isModernFont
              ? 'p-4 flex items-center justify-between gap-3 text-left font-sans group'
              : 'p-3.5 flex items-center justify-between gap-2 text-left font-mono group'
          }
          footerClassName={
            isModernFont
              ? 'px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap font-sans text-[11px] text-zinc-400'
              : 'px-3.5 py-2 flex items-center justify-between gap-2 flex-wrap font-mono text-[10px] text-zinc-400'
          }
          headerContent={
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={
                    isLiquidGlass
                      ? 'liquid-squircle text-cyan-200'
                      : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                          isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                        }`
                  }
                >
                  <Briefcase
                    size={16}
                    strokeWidth={1.75}
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-xs truncate ${
                        isModernFont ? 'font-semibold text-white' : 'font-bold text-white'
                      }`}
                    >
                      Bag: {activeBag.name}
                    </span>
                    <span
                      className={
                        isLiquidGlass
                          ? 'text-[10px] font-sans tabular-nums px-2 py-0.5 rounded-full liquid-row text-zinc-200 shrink-0'
                          : isBespoke
                          ? 'text-[10px] font-mono tabular-nums px-1.5 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-300 shrink-0'
                          : 'text-[10px] px-1.5 py-0.5 rounded obsidian-inset-neutral text-zinc-300 shrink-0'
                      }
                    >
                      {activeBag.apps.length} app{activeBag.apps.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div
                    className={`truncate mt-0.5 ${
                      isModernFont ? 'text-[11px] text-zinc-400' : 'text-[10px] text-zinc-400'
                    }`}
                  >
                    {activeBag.occasionLabel}
                  </div>
                </div>
              </div>
              <span
                className={
                  isModernFont
                    ? 'text-xs font-medium text-zinc-300 group-hover:text-white shrink-0 ml-2 flex items-center gap-0.5 transition-colors duration-75'
                    : 'text-[11px] font-bold text-zinc-300 group-hover:text-white shrink-0 ml-2 flex items-center gap-0.5'
                }
              >
                Pack <ChevronRight size={14} strokeWidth={1.75} />
              </span>
            </>
          }
          footerContent={
            <>
              <div className="flex items-center gap-3">
                <span
                  className={
                    isLiquidGlass
                      ? 'text-cyan-200 flex items-center gap-1 font-medium'
                      : isBespoke
                      ? 'text-blue-400 flex items-center gap-1 font-medium'
                      : 'flex items-center gap-1 font-medium'
                  }
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                >
                  <Phone size={10} strokeWidth={1.75} /> Calls Always ON
                </span>
                <span
                  className={
                    activeBag.allowSms
                      ? isLiquidGlass
                        ? 'text-cyan-200 flex items-center gap-1 font-medium'
                        : isBespoke
                        ? 'text-blue-400 flex items-center gap-1 font-medium'
                        : 'flex items-center gap-1 font-medium'
                      : 'flex items-center gap-1'
                  }
                  style={
                    !isModernFont && activeBag.allowSms
                      ? { color: 'var(--accent-hex, #FFFFFF)' }
                      : undefined
                  }
                >
                  <MessageSquare size={10} strokeWidth={1.75} />{' '}
                  {activeBag.allowSms ? 'SMS ON' : 'SMS Off'}
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
            className={
              isLiquidGlass
                ? `relative w-full h-14 py-4 rounded-2xl liquid-card font-sans font-semibold text-sm tracking-wide uppercase overflow-hidden select-none flex items-center justify-center liquid-spring ${
                    isHolding ? 'scale-[0.98]' : ''
                  }`
                : isBespoke
                ? `relative w-full h-14 py-4 rounded-md bg-black border font-sans font-semibold text-sm tracking-wide uppercase overflow-hidden transition-colors duration-75 select-none flex items-center justify-center ${
                    isHolding ? 'border-blue-500' : 'border-neutral-800 hover:border-neutral-700'
                  }`
                : `relative w-full h-15 py-4 rounded-2xl obsidian-shell-bar border font-mono font-black text-sm tracking-wider uppercase overflow-hidden transition-all select-none flex items-center justify-center ${
                    isHolding ? 'scale-[0.99]' : 'active:scale-[0.99]'
                  }`
            }
            style={
              isBespoke || isLiquidGlass
                ? { touchAction: 'none' }
                : {
                    touchAction: 'none',
                    borderColor: isHolding
                      ? 'var(--accent-hex, #FFFFFF)'
                      : 'rgba(var(--accent-rgb, 255, 255, 255), 0.5)',
                    boxShadow: isHolding
                      ? '0 0 28px -2px rgba(var(--accent-rgb, 255, 255, 255), 0.52), inset 0 1px 0 rgba(255,255,255,0.16)'
                      : '0 0 22px -6px rgba(var(--accent-rgb, 255, 255, 255), 0.28), inset 0 1px 0 rgba(255,255,255,0.14)',
                  }
            }
          >
            {!isBespoke && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute top-0 left-4 right-4 h-[1.5px] opacity-80"
                style={{
                  background: isLiquidGlass
                    ? 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.48) 50%, transparent 100%)'
                    : 'linear-gradient(90deg, transparent 0%, var(--accent-hex, #FFFFFF) 50%, transparent 100%)',
                }}
              />
            )}
            <div
              className={`absolute left-0 top-0 bottom-0 pointer-events-none ${
                isBespoke ? 'transition-none' : 'transition-all'
              }`}
              style={{
                width: `${holdProgress * 100}%`,
                opacity: isHolding ? (isBespoke ? 1 : 0.96) : 0,
                background: isLiquidGlass
                  ? 'linear-gradient(90deg, rgba(79, 172, 254, 0.88) 0%, rgba(0, 242, 254, 0.95) 85%, #FFFFFF 100%)'
                  : isBespoke
                  ? '#2563EB'
                  : 'var(--accent-badge-gradient, linear-gradient(135deg, #FFFFFF 0%, #D4D4D8 100%))',
              }}
            />

            <div
              className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-75 ${
                holdProgress > 0.5
                  ? isLiquidGlass
                    ? 'font-semibold text-zinc-950'
                    : isBespoke
                    ? 'font-semibold text-white'
                    : 'font-black'
                  : 'text-zinc-100'
              }`}
              style={
                isBespoke || isLiquidGlass
                  ? undefined
                  : {
                      color:
                        holdProgress > 0.5
                          ? 'var(--accent-badge-text, #09090B)'
                          : undefined,
                    }
              }
            >
              {isHolding ? (
                <>
                  <Flame
                    size={18}
                    strokeWidth={1.75}
                    className={isBespoke || isLiquidGlass ? '' : 'animate-bounce'}
                  />
                  <span>
                    Arming...{' '}
                    <span className="font-mono tabular-nums">
                      {Math.ceil((1 - holdProgress) * 3)}s
                    </span>
                  </span>
                </>
              ) : permissions.isNativeAndroid && !permissions.strictReady ? (
                <>
                  <ShieldAlert
                    size={18}
                    strokeWidth={1.75}
                    className={
                      isLiquidGlass
                        ? 'text-cyan-200'
                        : isBespoke
                        ? 'text-blue-500'
                        : undefined
                    }
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
                  <span>Grant Permissions to Lock</span>
                </>
              ) : (
                <>
                  <ShieldAlert
                    size={18}
                    strokeWidth={1.75}
                    className={
                      isLiquidGlass
                        ? 'text-cyan-200'
                        : isBespoke
                        ? 'text-blue-500'
                        : undefined
                    }
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
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
