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

const DialTickRing = React.memo(function DialTickRing() {
  return (
    <circle
      cx="144"
      cy="144"
      r="132"
      fill="none"
      stroke="rgba(255, 255, 255, 0.18)"
      strokeOpacity="0.85"
      strokeWidth="9"
      strokeDasharray="1.5 8.5"
    />
  );
});

const DialWheelSection = React.memo(function DialWheelSection({
  durationSeconds,
  onSelectDuration,
}: {
  durationSeconds: number;
  onSelectDuration: (secs: number) => void;
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
      if (e.cancelable) e.preventDefault();
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
    window.addEventListener('touchmove', onTouchMove, { passive: false });
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
        className="zero-dial-surface zero-dial-ring liquid-dial-outer relative w-60 h-60 sm:w-68 sm:h-68 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing transition-shadow"
        style={{ touchAction: 'none' }}
      >
        <svg
          className="absolute pointer-events-none inset-0 w-full h-full"
          viewBox="0 0 288 288"
        >
          <defs>
            <linearGradient id="zeroLiquidDialGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" style={{ stopColor: '#ffffff' }} />
              <stop offset="50%" style={{ stopColor: 'var(--liquid-accent-tint)' }} />
              <stop offset="100%" style={{ stopColor: 'var(--liquid-accent-vibrant)' }} />
            </linearGradient>
          </defs>
          <DialTickRing />
          <circle
            ref={arcRef}
            cx="144"
            cy="144"
            r="132"
            fill="none"
            stroke="url(#zeroLiquidDialGrad)"
            strokeWidth="5"
            strokeDasharray={`${(initialAngle / 360) * DIAL_ARC_CIRCUMFERENCE} ${DIAL_ARC_CIRCUMFERENCE}`}
            strokeLinecap="round"
            transform="rotate(-90 144 144)"
            className="zero-dial-arc transition-[stroke-dasharray] duration-75"
          />
        </svg>

        <div
          ref={knobLayerRef}
          className="zero-dial-knob-layer absolute pointer-events-none transition-transform duration-75 w-full h-full"
          style={{ transform: `rotate(${initialAngle}deg)` }}
        >
          <div
            className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full border border-white/60 flex items-center justify-center"
            style={{
              backgroundColor: '#ffffff',
              boxShadow: '0 0 16px #ffffff, 0 0 26px var(--liquid-accent-vibrant)',
            }}
          >
            <div
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: 'var(--liquid-accent-vibrant)' }}
            />
          </div>
        </div>

        <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
          <span className="text-[11px] font-sans tracking-[0.14em] text-zinc-400 uppercase mb-1 font-medium">
            Lock Duration
          </span>
          <div
            ref={durationTextRef}
            className="font-sans tabular-nums text-4xl font-semibold tracking-tight liquid-metric"
          >
            {formatDialTime(durationSeconds)}
          </div>
          <div className="flex items-center gap-1.5 mt-2 text-xs font-sans text-zinc-400">
            <Clock size={12} strokeWidth={1.75} className="text-cyan-300" />
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
      <div className="flex items-center justify-center flex-wrap max-w-sm gap-2 mt-5">
        {PRESET_DURATIONS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => {
              haptics.thud();
              onSelectDuration(preset.seconds);
            }}
            className={`px-3 py-1.5 text-xs font-sans tabular-nums rounded-xl liquid-spring hover:scale-[1.02] active:scale-[0.97] ${
              durationSeconds === preset.seconds
                ? 'liquid-pill-active font-semibold'
                : 'liquid-pill-inactive font-normal'
            }`}
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
    <div className="flex-1 flex flex-col items-center justify-between max-w-md mx-auto w-full select-none px-4 py-4 pb-32 gap-5 font-sans">
      {/* Interactive Profile Strip + Compact Escape Ticket + 1-Tap Theme Studio Shortcut */}
      <div className="w-full flex items-stretch gap-2">
        {profile ? (
          <ObsidianCard
            fullWidth={false}
            className="flex-1 min-w-0"
            headerClassName="p-3 flex items-center justify-between gap-2.5"
            headerContent={
              <>
                <ProfileAvatar
                  avatarId={profile.avatarId}
                  size="sm"
                  interactive
                />
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="flex-1 min-w-0 text-left group flex items-center justify-between gap-1.5 font-sans"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="truncate font-semibold text-xs text-white">
                        {profile.displayName}
                      </span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-300/35 text-cyan-200 shrink-0">
                        {profileRank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                    <div className="truncate mt-0.5 flex items-center gap-1.5 text-[11px] text-zinc-400">
                      <span>
                        <span className="font-mono tabular-nums">
                          {todayReclaimedHours}h / {profile.dailyGoalHours}h
                        </span>{' '}
                        • #{profile.primaryMission}
                      </span>
                      {badgeSummary.unlockedBadges.length > 0 && (
                        <span className="inline-flex items-center gap-0.5 shrink-0 font-mono tabular-nums text-cyan-200 font-semibold">
                          <Trophy size={9} strokeWidth={1.75} />
                          {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <div className="w-8 liquid-track rounded-full h-1.5 hidden sm:block overflow-hidden">
                      <div
                        className="h-full liquid-mercury-fill"
                        style={{ width: `${dailyGoalPct}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-zinc-400 group-hover:text-white font-medium transition-colors duration-75">
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
            headerClassName="p-3 flex items-center justify-between gap-2.5 font-sans"
            headerContent={
              <>
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="liquid-squircle text-cyan-200">
                    {hasClaimedFirstTimeParachute ? (
                      <UserPlus size={15} strokeWidth={1.75} />
                    ) : (
                      <Gift size={15} strokeWidth={1.75} />
                    )}
                  </div>
                  <div className="text-left min-w-0">
                    <div className="text-xs truncate font-semibold text-white">
                      {hasClaimedFirstTimeParachute ? 'Create Profile' : 'Profile • +1 Ticket'}
                    </div>
                    <div className="text-[10px] truncate text-cyan-200/80">
                      {hasClaimedFirstTimeParachute ? 'Goal & emblem' : 'Free starter ticket'}
                    </div>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl liquid-pill-active text-[10px] font-semibold uppercase tracking-wide shrink-0">
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
          className={`shrink-0 ${justEarnedParachute ? 'border-cyan-400/60' : ''}`}
          headerClassName="flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-sans text-zinc-300 hover:text-white transition-colors duration-75"
          title={`Escape Tickets (${parachuteMetrics.currentBalance}) — Tap to inspect ticket`}
          aria-label={`View Escape Ticket (${parachuteMetrics.currentBalance} available)`}
          headerContent={
            <>
              <div className="h-6 px-2 obsidian-icon-box flex items-center justify-center gap-1 rounded-xl">
                <Ticket
                  size={12}
                  strokeWidth={1.75}
                  className="text-cyan-200 shrink-0"
                />
                <span className="text-[11px] font-sans tabular-nums font-semibold leading-none text-white">
                  {parachuteMetrics.currentBalance}
                </span>
              </div>
              <span className="text-[9px] uppercase tracking-wider leading-none font-medium text-zinc-400">
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
          headerClassName="flex-1 px-2.5 py-2 flex flex-col items-center justify-center gap-1 font-sans text-zinc-300 hover:text-white transition-colors duration-75"
          title="Open Theme Studio (AMOLED, Paper Kindle, Matte)"
          aria-label="Open Theme Studio"
          headerContent={
            <>
              <div
                className="w-6 h-6 obsidian-icon-box flex items-center justify-center rounded-xl"
                style={{
                  background:
                    'linear-gradient(135deg, #ffffff 0%, var(--liquid-accent-tint) 50%, var(--liquid-accent-vibrant) 100%)',
                  border: '1px solid rgba(255, 255, 255, 0.95)',
                  boxShadow: '0 2px 10px var(--liquid-accent-glow)',
                  color: '#07040d',
                }}
              >
                <Palette
                  size={12}
                  strokeWidth={2}
                  className="text-[#07040d]"
                  style={{ color: '#07040d' }}
                />
              </div>
              <span className="text-[9px] uppercase tracking-wider leading-none font-medium text-zinc-400">
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
          headerClassName="px-4 py-3 font-sans text-xs flex items-center justify-between gap-2"
          footerClassName="px-4 py-2 font-sans text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center gap-2 min-w-0">
                <ShieldAlert
                  size={14}
                  strokeWidth={1.75}
                  className="shrink-0 text-cyan-200"
                />
                <span className="truncate font-semibold text-white">
                  Permissions Required Before Locking
                </span>
              </div>
              <span className="text-[10px] px-2.5 py-1 rounded-xl liquid-pill-active font-semibold uppercase tracking-wide shrink-0 ml-2">
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
          accentOverride={{ hex: '#4FACFE', rgb: '79, 172, 254' }}
          headerClassName="p-5 font-sans space-y-3"
          footerClassName="px-5 py-2.5 font-sans"
          headerContent={
            <>
              {showWeeklyBackupBanner && (
                <>
                  <div className="flex items-start gap-3">
                    <div className="liquid-squircle text-cyan-200">
                      <CloudUpload size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-semibold text-white leading-snug">
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
                      className="w-full py-2.5 px-3 rounded-xl liquid-pill-active font-semibold text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-60 liquid-spring active:scale-[0.98]"
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
                          className="py-2 px-3 rounded-xl liquid-pill font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 disabled:opacity-60 liquid-spring active:scale-[0.98]"
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
                          className="py-2 px-3 rounded-xl liquid-pill font-medium text-[11px] uppercase tracking-wide flex items-center justify-center gap-1.5 liquid-spring active:scale-[0.98]"
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
                <div className="text-[11px] px-3 py-2 rounded-xl liquid-row text-zinc-200">
                  {cloudBannerMsg}
                </div>
              )}
            </>
          }
          footerContent={
            <div className="text-[11px] text-zinc-400 leading-snug">
              Saves only your stats, Escape Tickets &amp; donor perks (<code className="font-mono">zero-backup.zbak</code>).
            </div>
          }
        />
      )}

      {/* Center: Tactile Duration Dial Wheel */}
      <DialWheelSection
        durationSeconds={durationSeconds}
        onSelectDuration={setDurationSeconds}
      />

      {/* Bottom Area: The 4-Bag Selector, Tags & Hold to Lock */}
      <div className="w-full flex flex-col items-center mt-auto gap-4">
        {/* Session Tags */}
        <div className="w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-sans uppercase tracking-wider text-zinc-400 font-medium">
              Session Focus Tag
            </span>
            <button
              onClick={() => setIsAddingTag(!isAddingTag)}
              className="text-[11px] font-sans text-zinc-400 hover:text-white transition-colors duration-75"
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
                className="flex-1 obsidian-input text-xs text-white rounded-xl px-3 py-2 font-sans outline-none"
              />
              <button
                type="submit"
                className="liquid-pill-active text-xs font-sans font-semibold px-4 py-2 rounded-xl uppercase tracking-wide liquid-spring active:scale-[0.97]"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-sans whitespace-nowrap liquid-spring hover:scale-[1.02] active:scale-[0.97] ${
                    selectedTag === tag
                      ? 'liquid-pill-active font-semibold'
                      : 'liquid-pill-inactive font-normal'
                  }`}
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
          headerClassName="p-4 flex items-center justify-between gap-3 text-left font-sans group"
          footerClassName="px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap font-sans text-[11px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="liquid-squircle text-cyan-200">
                  <Briefcase size={16} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs truncate font-semibold text-white">
                      Bag: {activeBag.name}
                    </span>
                    <span className="text-[10px] font-sans tabular-nums px-2 py-0.5 rounded-full liquid-row text-zinc-200 shrink-0">
                      {activeBag.apps.length} app{activeBag.apps.length === 1 ? '' : 's'}
                    </span>
                  </div>
                  <div className="truncate mt-0.5 text-[11px] text-zinc-400">
                    {activeBag.occasionLabel}
                  </div>
                </div>
              </div>
              <span className="text-xs font-medium text-zinc-300 group-hover:text-white shrink-0 ml-2 flex items-center gap-0.5 transition-colors duration-75">
                Pack <ChevronRight size={14} strokeWidth={1.75} />
              </span>
            </>
          }
          footerContent={
            <>
              <div className="flex items-center gap-3">
                <span className="text-cyan-200 flex items-center gap-1 font-medium">
                  <Phone size={10} strokeWidth={1.75} /> Calls Always ON
                </span>
                <span
                  className={
                    activeBag.allowSms
                      ? 'text-cyan-200 flex items-center gap-1 font-medium'
                      : 'flex items-center gap-1'
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
            className={`relative w-full h-14 py-4 rounded-2xl liquid-glass font-sans font-extrabold text-sm tracking-wide uppercase overflow-hidden select-none flex items-center justify-center liquid-spring ${
              isHolding ? 'scale-[0.98]' : 'active:scale-[0.98]'
            }`}
            style={{
              touchAction: 'none',
              backgroundColor: 'var(--accent-soft)',
              backdropFilter: 'var(--surface-blur, blur(14px))',
              WebkitBackdropFilter: 'var(--surface-blur, blur(14px))',
              border: '1px solid var(--accent-border)',
              boxShadow: isHolding
                ? 'inset 0 1px 0 rgba(255, 255, 255, 0.45), 0 0 28px var(--liquid-accent-glow)'
                : 'inset 0 1px 0 rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.30)), 0 8px 20px -4px var(--liquid-accent-soft-glow)',
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute top-0 left-4 right-4 h-[1.5px]"
              style={{
                opacity: 'var(--glass-specular-opacity, 0.60)',
                background:
                  'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.48) 50%, transparent 100%)',
              }}
            />
            <div
              className="absolute left-0 top-0 bottom-0 pointer-events-none transition-all"
              style={{
                width: `${holdProgress * 100}%`,
                opacity: isHolding ? 0.98 : 0,
                background:
                  'linear-gradient(90deg, #ffffff 0%, var(--liquid-accent-tint) 45%, var(--liquid-accent-vibrant) 100%)',
              }}
            />

            <div
              className={`relative z-10 flex items-center justify-center gap-2 transition-colors duration-75 ${
                holdProgress > 0.4
                  ? 'font-extrabold text-[#07040d]'
                  : 'text-zinc-100'
              }`}
            >
              {isHolding ? (
                <>
                  <Flame size={18} strokeWidth={1.75} />
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
                    className="text-cyan-200"
                  />
                  <span>Grant Permissions to Lock</span>
                </>
              ) : (
                <>
                  <ShieldAlert
                    size={18}
                    strokeWidth={1.75}
                    className="text-cyan-200"
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
