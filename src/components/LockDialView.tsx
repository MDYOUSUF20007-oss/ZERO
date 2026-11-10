import React, { useState, useRef, useEffect, useCallback } from 'react';
import type {
  SessionTag,
  ParachuteMetrics,
  OccasionBag,
  NativePermissionStatus,
} from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
import { haptics } from '../utils/haptics';
import {
  ShieldAlert,
  ShieldCheck,
  Clock,
  Flame,
  ChevronRight,
  Briefcase,
  Phone,
  MessageSquare,
} from 'lucide-react';

interface LockDialViewProps {
  onIgnite: (durationSeconds: number, tag: SessionTag) => boolean;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  permissions: NativePermissionStatus;
  onOpenDashboard: () => void;
  onOpenBagDrawer: () => void;
  onOpenPermissionGate: () => void;
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

export const LockDialView: React.FC<LockDialViewProps> = ({
  onIgnite,
  parachuteMetrics,
  activeBag,
  permissions,
  onOpenDashboard,
  onOpenBagDrawer,
  onOpenPermissionGate,
}) => {
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

  const MIN_SECS = 5 * 60;
  const MAX_SECS = 24 * 3600;

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

  return (
    <div className="flex flex-col items-center justify-between min-h-[calc(100vh-80px)] px-4 py-3 pb-24 max-w-md mx-auto w-full select-none gap-3">
      {/* Top Banner: Parachute Balance & Milestone Progress */}
      <button
        onClick={onOpenDashboard}
        className="w-full bg-zinc-950/80 border border-zinc-800 hover:border-zinc-600 rounded-2xl p-3 flex items-center justify-between transition-all group active:scale-[0.98] shadow-brutal"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center font-mono text-base group-hover:border-amber-400/50 transition-colors">
            🪂
          </div>
          <div className="text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-sm text-zinc-100">
                {parachuteMetrics.currentBalance} {parachuteMetrics.currentBalance === 1 ? 'Parachute' : 'Parachutes'}
              </span>
              <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 font-semibold">
                Earned-Only
              </span>
            </div>
            <p className="text-xs text-zinc-400 font-mono">
              {parachuteMetrics.hoursUntilNextParachute}h to next (+1 per 20h)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-zinc-400 group-hover:text-zinc-200">
          <div className="w-12 bg-zinc-800 rounded-full h-1.5 overflow-hidden">
            <div
              className="bg-zinc-200 h-full rounded-full transition-all"
              style={{ width: `${parachuteMetrics.progressPercentage}%` }}
            />
          </div>
          <ChevronRight size={16} />
        </div>
      </button>

      {/* Native Android Strict Permission Banner */}
      {permissions.isNativeAndroid && (
        <button
          type="button"
          onClick={onOpenPermissionGate}
          className={`w-full px-3.5 py-2 rounded-2xl border font-mono text-[11px] flex items-center justify-between transition-all ${
            permissions.strictReady
              ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
              : 'bg-amber-950/40 border-amber-500/70 text-amber-200 animate-pulse'
          }`}
        >
          <div className="flex items-center gap-2">
            {permissions.strictReady ? (
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
            ) : (
              <ShieldAlert size={14} className="text-amber-400 shrink-0" />
            )}
            <span className="font-bold truncate">
              {permissions.strictReady
                ? permissions.isStrictAccessibilityBuild
                  ? 'Strict Accessibility Guard: Armed'
                  : 'Overlay + Usage Guard: Armed'
                : 'Permissions Required Before Locking'}
            </span>
          </div>
          <span className="text-[10px] underline shrink-0 ml-2">
            {permissions.strictReady ? 'Check' : 'Grant Now'}
          </span>
        </button>
      )}

      {/* Center: Tactile Duration Dial Wheel */}
      <div className="my-auto flex flex-col items-center justify-center relative w-full py-2">
        <div
          ref={dialRef}
          onMouseDown={startDialScrub}
          onTouchStart={startDialScrub}
          className="relative w-60 h-60 sm:w-68 sm:h-68 rounded-full border-2 border-zinc-800/80 bg-zinc-950 flex items-center justify-center cursor-grab active:cursor-grabbing shadow-2xl transition-shadow hover:border-zinc-700"
          style={{ touchAction: 'none' }}
        >
          <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 288 288">
            <circle
              cx="144"
              cy="144"
              r="132"
              fill="none"
              stroke="rgba(255, 255, 255, 0.05)"
              strokeWidth="12"
              strokeDasharray="2 10"
            />
            <circle
              cx="144"
              cy="144"
              r="132"
              fill="none"
              stroke="#EDEDED"
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
            <div className="absolute top-1 left-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] border border-black" />
          </div>

          <div className="flex flex-col items-center justify-center z-10 pointer-events-none">
            <span className="text-[11px] font-mono tracking-widest text-zinc-400 uppercase mb-1 font-semibold">
              Lock Duration
            </span>
            <div className="font-mono text-4xl font-black tracking-tight text-white drop-shadow">
              {formatDialTime(durationSeconds)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5 text-xs font-mono text-zinc-400">
              <Clock size={12} className="text-zinc-500" />
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
              className={`px-2.5 py-1 text-xs font-mono rounded-lg border transition-all ${
                durationSeconds === preset.seconds
                  ? 'bg-zinc-100 text-black border-zinc-100 font-bold shadow-sm'
                  : 'bg-zinc-900/80 text-zinc-400 border-zinc-800 hover:text-zinc-200 hover:border-zinc-700'
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
                className="flex-1 bg-zinc-900 border border-zinc-700 text-xs text-white rounded-xl px-3 py-2 font-mono outline-none focus:border-zinc-400"
              />
              <button
                type="submit"
                className="bg-zinc-200 text-black text-xs font-mono font-bold px-3 py-2 rounded-xl"
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
                  className={`px-3 py-1.5 rounded-xl text-xs font-mono whitespace-nowrap transition-all border ${
                    selectedTag === tag
                      ? 'bg-zinc-200 text-black border-white font-bold'
                      : 'bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700'
                  }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Active Bag Card (4 Occasion Bags x Max 3 Apps + Calls/SMS) */}
        <button
          type="button"
          onClick={onOpenBagDrawer}
          className="w-full p-3 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-between transition-all text-left font-mono group active:scale-[0.99]"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white shrink-0">
              <Briefcase size={16} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-bold text-white truncate">
                  Bag: {activeBag.name}
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 shrink-0">
                  {activeBag.apps.length}/{MAX_BAG_APPS} apps
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-zinc-400 mt-0.5 flex-wrap">
                <span className={activeBag.allowCalls ? 'text-emerald-400 flex items-center gap-0.5' : 'flex items-center gap-0.5'}>
                  <Phone size={10} /> {activeBag.allowCalls ? 'Calls ON' : 'Calls Off'}
                </span>
                <span className={activeBag.allowSms ? 'text-emerald-400 flex items-center gap-0.5' : 'flex items-center gap-0.5'}>
                  <MessageSquare size={10} /> {activeBag.allowSms ? 'SMS ON' : 'SMS Off'}
                </span>
                {activeBag.apps.length > 0 && (
                  <span className="text-zinc-300 truncate max-w-[140px]">
                    • {activeBag.apps.map((a) => a.appName).join(', ')}
                  </span>
                )}
              </div>
            </div>
          </div>
          <span className="text-[11px] font-bold text-zinc-300 group-hover:text-white shrink-0 ml-2 flex items-center gap-0.5">
            Pack <ChevronRight size={14} />
          </span>
        </button>

        {/* 3-Second Hold to Ignite Button */}
        <div className="w-full flex flex-col items-center">
          <button
            onMouseDown={startHold}
            onMouseUp={cancelHold}
            onMouseLeave={cancelHold}
            onTouchStart={startHold}
            onTouchEnd={cancelHold}
            onTouchCancel={cancelHold}
            className={`relative w-full h-15 py-4 rounded-2xl border-2 font-mono font-black text-sm tracking-wider uppercase overflow-hidden transition-all select-none shadow-brutal flex items-center justify-center ${
              isHolding
                ? 'border-white bg-zinc-900 text-white scale-[0.99]'
                : 'border-zinc-700 bg-zinc-950 text-zinc-100 hover:border-zinc-500 hover:bg-zinc-900 active:scale-[0.99]'
            }`}
            style={{ touchAction: 'none' }}
          >
            <div
              className="absolute left-0 top-0 bottom-0 bg-white transition-all pointer-events-none"
              style={{
                width: `${holdProgress * 100}%`,
                opacity: isHolding ? 0.95 : 0,
              }}
            />

            <div
              className={`relative z-10 flex items-center justify-center gap-2 transition-colors ${
                holdProgress > 0.5 ? 'text-black font-extrabold' : 'text-zinc-100'
              }`}
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
                  <ShieldAlert size={18} />
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
