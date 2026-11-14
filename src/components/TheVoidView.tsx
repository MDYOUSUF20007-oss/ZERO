import React, { useState, useEffect, useId, useMemo, useRef } from 'react';
import type {
  ActiveLockSession,
  ParachuteMetrics,
  OccasionBag,
  ZeroProfile,
  ThemeConfig,
} from '../types';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { isWorkBag } from '../utils/bagLayout';
import { resolveEffectiveAppRuleConfig } from '../utils/bagAppConfig';
import { buildPixelClockLayout } from '../utils/pixelFont';
import { resolveAppBrandVisual, type AppBrandVisual } from '../utils/appBrandColors';
import { haptics } from '../utils/haptics';
import { voidAudio, FOCUS_SOUND_TRACKS, type FocusSoundTrack } from '../utils/voidAudio';
import { getRandomVoidQuote, type VoidQuote } from '../utils/voidQuotes';
import { AppFrictionModal } from './AppFrictionModal';
import {
  Phone,
  AlertTriangle,
  MessageSquare,
  Battery,
  Wifi,
  Shield,
  Sparkles,
  Lock,
  Volume2,
  VolumeX,
  Coffee,
  Smartphone,
  CheckCircle2,
  X,
  Quote,
  Flame,
} from 'lucide-react';

interface TheVoidViewProps {
  activeLock: ActiveLockSession;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  profile?: ZeroProfile | null;
  themeConfig?: ThemeConfig;
  onDeployParachute: () => boolean;
}

export type PomodoroMode = 'off' | '25_5' | '50_10';

function format12HourClock(date: Date): string {
  const rawHours = date.getHours();
  const suffix = rawHours >= 12 ? 'PM' : 'AM';
  const hour12 = rawHours % 12 === 0 ? 12 : rawHours % 12;
  const mins = date.getMinutes().toString().padStart(2, '0');
  return `${hour12}:${mins} ${suffix}`;
}

export const TheVoidView: React.FC<TheVoidViewProps> = ({
  activeLock,
  parachuteMetrics,
  activeBag,
  profile = null,
  onDeployParachute,
}) => {
  const { fluentOrbIntensity, gpuThermalSafeguard } = useInterfaceStyle();
  const [clockText, setClockText] = useState<string>(() => format12HourClock(new Date()));
  const [batteryPct, setBatteryPct] = useState<number>(() => {
    if (typeof window !== 'undefined' && window.ZeroNative) {
      try {
        return window.ZeroNative.getBatteryPercentage();
      } catch {
        return 100;
      }
    }
    return 100;
  });

  // Modals & warnings
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showParachuteConfirm, setShowParachuteConfirm] = useState<boolean>(false);
  const [emergencyNumber, setEmergencyNumber] = useState<string>('');
  const [tamperWarning, setTamperWarning] = useState<string | null>(null);

  // Quotes under Chronometer
  const [currentQuote, setCurrentQuote] = useState<VoidQuote>(() =>
    getRandomVoidQuote(profile?.motto)
  );

  // Feature 1: Built-in Offline Focus Audio
  const [activeSound, setActiveSound] = useState<FocusSoundTrack>('none');
  const [soundVolume, setSoundVolume] = useState<number>(0.5);
  const [showAudioDrawer, setShowAudioDrawer] = useState<boolean>(false);

  // Feature 3: Optional Pomodoro Mode ('off' | '25_5' | '50_10')
  const [pomodoroMode, setPomodoroMode] = useState<PomodoroMode>('off');
  const [pomodoroIsBreak, setPomodoroIsBreak] = useState<boolean>(false);
  const [pomodoroBreakSecondsLeft, setPomodoroBreakSecondsLeft] = useState<number>(0);

  // Feature 4: Flip-to-Focus AMOLED Blackout Sensor
  const [flipToFocusEnabled, setFlipToFocusEnabled] = useState<boolean>(true);
  const [isDeviceFaceDown, setIsDeviceFaceDown] = useState<boolean>(false);
  const wasFaceDownRef = useRef<boolean>(false);

  // Mindful Micro-Friction Interstitial state
  const [frictionTarget, setFrictionTarget] = useState<{
    appName: string;
    packageName: string;
    visual: AppBrandVisual;
  } | null>(null);

  const hasPlayedCompletionChimeRef = useRef(false);

  const gradId = useId().replace(/:/g, '');
  const clockGradId = `${gradId}-clock`;
  const timerGradId = `${gradId}-timer`;

  const workBagActive = isWorkBag(activeBag?.id, activeBag?.name);
  const visibleBagApps = useMemo(
    () =>
      (activeBag?.apps || []).filter(
        (app) => resolveEffectiveAppRuleConfig(app).mode !== 'hard_block'
      ),
    [activeBag]
  );

  const formatCountdown = (totalSec: number) => {
    const safeSec = Math.max(0, Math.floor(totalSec));
    const hours = Math.floor(safeSec / 3600);
    const mins = Math.floor((safeSec % 3600) / 60);
    const secs = safeSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const timerText = formatCountdown(activeLock.remainingSeconds);
  const clockPixelLayout = useMemo(() => buildPixelClockLayout(clockText, 1, 0.16), [clockText]);
  const timerPixelLayout = useMemo(() => buildPixelClockLayout(timerText, 1, 0.16), [timerText]);

  const normalizedWorkTag =
    (activeLock.tag || 'Deep Work').replace(/^#+/, '').trim() || 'Deep Work';
  const workTagDisplay = `#${normalizedWorkTag.toUpperCase()}`;

  const progressPct =
    activeLock.durationSeconds > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((activeLock.elapsedSeconds / activeLock.durationSeconds) * 100))
        )
      : 0;

  const targetEndTimeFormatted = useMemo(() => {
    const finishDate = new Date(Date.now() + activeLock.remainingSeconds * 1000);
    return format12HourClock(finishDate);
  }, [activeLock.remainingSeconds]);

  // Real-time 12-hour clock updater & battery monitor
  useEffect(() => {
    const timer = setInterval(() => {
      setClockText(format12HourClock(new Date()));
      if (typeof window !== 'undefined' && window.ZeroNative) {
        try {
          setBatteryPct(window.ZeroNative.getBatteryPercentage());
        } catch {}
      }
    }, 1000);

    const checkNavBattery = async () => {
      if (typeof navigator !== 'undefined' && 'getBattery' in navigator) {
        try {
          const b = await (navigator as unknown as { getBattery: () => Promise<{ level: number }> }).getBattery();
          setBatteryPct(Math.round(b.level * 100));
        } catch {}
      }
    };
    checkNavBattery();

    return () => clearInterval(timer);
  }, []);

  // Keyboard anti-tamper listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'F11' || e.key === 'F12') {
        e.preventDefault();
        haptics.thud();
        setTamperWarning('The Void is sealed. Escape key intercepts are blocked.');
        setTimeout(() => setTamperWarning(null), 3500);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Completion Tibetan Singing Bowl Acoustic Reward
  useEffect(() => {
    if (activeLock.remainingSeconds <= 0 && !hasPlayedCompletionChimeRef.current) {
      hasPlayedCompletionChimeRef.current = true;
      voidAudio.playZenBowl();
    }
  }, [activeLock.remainingSeconds]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      voidAudio.stop();
    };
  }, []);

  // Feature 4: Flip-to-Focus Orientation Sensor
  useEffect(() => {
    if (!flipToFocusEnabled || typeof window === 'undefined') return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      const beta = event.beta;
      if (beta === null) return;

      const isFaceDown = Math.abs(beta) > 140;

      if (isFaceDown && !wasFaceDownRef.current) {
        wasFaceDownRef.current = true;
        setIsDeviceFaceDown(true);
        haptics.tick(900);
      } else if (!isFaceDown && wasFaceDownRef.current) {
        wasFaceDownRef.current = false;
        setIsDeviceFaceDown(false);
        haptics.tick(600);
      }
    };

    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, [flipToFocusEnabled]);

  // Feature 3: Pomodoro Interval Engine
  useEffect(() => {
    if (pomodoroMode === 'off') {
      setPomodoroIsBreak(false);
      setPomodoroBreakSecondsLeft(0);
      return;
    }

    const focusSpan = pomodoroMode === '25_5' ? 25 * 60 : 50 * 60;
    const breakSpan = pomodoroMode === '25_5' ? 5 * 60 : 10 * 60;
    const cycleSpan = focusSpan + breakSpan;

    const cyclePos = activeLock.elapsedSeconds % cycleSpan;

    if (cyclePos >= focusSpan) {
      const remainingBreak = cycleSpan - cyclePos;
      setPomodoroIsBreak(true);
      setPomodoroBreakSecondsLeft(remainingBreak);
    } else {
      setPomodoroIsBreak(false);
      setPomodoroBreakSecondsLeft(0);
    }
  }, [pomodoroMode, activeLock.elapsedSeconds]);

  // Sound player helpers
  const handleSelectSound = (trackId: FocusSoundTrack) => {
    haptics.thud();
    if (trackId === activeSound) {
      voidAudio.stop();
      setActiveSound('none');
    } else {
      voidAudio.play(trackId);
      setActiveSound(trackId);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    setSoundVolume(newVol);
    voidAudio.setVolume(newVol);
  };

  const handleEmergencyCall = (num: string) => {
    haptics.thud();
    window.location.href = `tel:${num}`;
  };

  const handleConfirmDeploy = () => {
    if (activeLock.burnTheBoats) {
      haptics.thud();
      setTamperWarning('Burn the Boats is active. Escape tickets are strictly disabled for this session.');
      setTimeout(() => setTamperWarning(null), 3500);
      return;
    }
    haptics.parachuteDeploy();
    setShowParachuteConfirm(false);
    onDeployParachute();
  };

  const handleTogglePomodoro = () => {
    haptics.thud();
    if (pomodoroMode === 'off') {
      setPomodoroMode('25_5');
    } else if (pomodoroMode === '25_5') {
      setPomodoroMode('50_10');
    } else {
      setPomodoroMode('off');
    }
  };

  const handleNextQuote = () => {
    haptics.tick(850);
    setCurrentQuote(getRandomVoidQuote(profile?.motto));
  };

  const handleRequestAppOpen = (appName: string, packageName: string, visual: AppBrandVisual) => {
    haptics.tick(700);
    setFrictionTarget({ appName, packageName, visual });
  };

  const handleExecuteAppOpen = () => {
    if (!frictionTarget) return;
    const { packageName, appName } = frictionTarget;
    setFrictionTarget(null);

    if (packageName.startsWith('tel:') || packageName.startsWith('sms:')) {
      window.location.href = packageName;
      return;
    }

    if (typeof window !== 'undefined' && window.ZeroNative?.openExternalUrl) {
      window.ZeroNative.openExternalUrl(`intent:#Intent;package=${packageName};end`);
    } else {
      window.location.href = `intent:#Intent;package=${packageName};end`;
    }
    haptics.thud();
    alert(`Simulation Mode: Launching ${appName} (${packageName})`);
  };

  return (
    <div
      data-void-terminal="true"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none bg-black text-white px-4 py-3 sm:px-6"
      style={{
        paddingTop: 'calc(0.75rem + var(--zero-safe-top))',
        paddingBottom: 'calc(0.75rem + var(--zero-safe-bottom))',
      }}
    >
      {/* FEATURE 4: FLIP-TO-FOCUS PURE AMOLED BLACKOUT OVERLAY */}
      {isDeviceFaceDown && (
        <div
          role="presentation"
          className="fixed inset-0 z-[250] bg-black flex flex-col items-center justify-center p-6 text-center select-none"
        >
          <div className="w-2 h-2 rounded-full bg-cyan-400/40 animate-ping mb-3" />
          <p className="text-[11px] font-sans tracking-widest uppercase text-zinc-600">
            FLIP-TO-FOCUS • RESTING IN THE VOID
          </p>
        </div>
      )}

      {/* Dynamic Sub-Surface Ambient Glow Orbs */}
      <div
        aria-hidden="true"
        className="fixed -top-20 -left-20 w-80 h-80 rounded-full pointer-events-none blur-3xl transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle, var(--accent-primary, #38bdf8) 0%, var(--accent-soft, rgba(56,189,248,0.3)) 45%, transparent 70%)',
          opacity: gpuThermalSafeguard ? 0.15 : Math.max(0.2, fluentOrbIntensity * 0.75),
        }}
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-24 -right-24 w-96 h-96 rounded-full pointer-events-none blur-3xl transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle, var(--accent-secondary, var(--accent-primary, #38bdf8)) 0%, transparent 65%)',
          opacity: gpuThermalSafeguard ? 0.12 : Math.max(0.18, fluentOrbIntensity * 0.6),
        }}
      />

      {/* TOP STATUS BAR: Live Clock, Status, Battery, Controls */}
      <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between text-xs font-sans tabular-nums text-zinc-400 pt-1 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200 tracking-wide">{clockText}</span>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full liquid-pill-active text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>VOID ARMED</span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Flip to focus sensor status pill */}
          <button
            type="button"
            onClick={() => {
              haptics.tick(700);
              setFlipToFocusEnabled(!flipToFocusEnabled);
            }}
            title="Toggle Flip-To-Focus AMOLED Dimming"
            className={`p-1.5 rounded-lg liquid-spring cursor-pointer ${
              flipToFocusEnabled
                ? 'liquid-pill-active text-cyan-300'
                : 'liquid-pill-inactive text-zinc-500'
            }`}
          >
            <Smartphone size={13} strokeWidth={1.75} />
          </button>

          {/* Sound drawer trigger */}
          <button
            type="button"
            onClick={() => {
              haptics.thud();
              setShowAudioDrawer(!showAudioDrawer);
            }}
            title="Offline Focus Audio Soundscapes"
            className={`flex items-center gap-1 px-2 py-0.5 rounded-lg liquid-spring cursor-pointer ${
              activeSound !== 'none'
                ? 'liquid-pill-active text-cyan-300 font-semibold'
                : 'liquid-pill-inactive text-zinc-400'
            }`}
          >
            {activeSound !== 'none' ? (
              <>
                <Volume2 size={12} className="animate-pulse" />
                <span className="text-[10px] uppercase">{activeSound}</span>
              </>
            ) : (
              <>
                <VolumeX size={12} />
                <span className="text-[10px] uppercase">Audio</span>
              </>
            )}
          </button>

          <div className="flex items-center gap-1.5 text-zinc-300">
            <Wifi size={12} className="text-zinc-400" />
            <div className="flex items-center gap-1">
              <Battery size={13} className="text-zinc-300" />
              <span className="text-[11px] font-mono">{batteryPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* ANTI-TAMPER BANNER */}
      {tamperWarning && (
        <div className="fixed top-14 left-5 right-5 max-w-md mx-auto z-60 bg-red-950/90 border border-red-500/60 text-red-200 text-xs px-4 py-2.5 rounded-2xl font-sans backdrop-blur-md shadow-2xl flex items-center gap-2.5 animate-fadeIn">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span className="font-medium">{tamperWarning}</span>
        </div>
      )}

      {/* FEATURE 1: OFFLINE FOCUS AUDIO SOUNDSCAPE DRAWER */}
      {showAudioDrawer && (
        <div className="relative z-20 w-full max-w-md mx-auto mb-2 p-3.5 rounded-2xl liquid-glass border border-white/10 shadow-2xl animate-fadeIn">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2">
              <Sparkles size={13} className="theme-text-accent" />
              <span className="text-xs font-semibold uppercase tracking-wider text-white">
                Offline Focus Soundscapes
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowAudioDrawer(false)}
              className="text-[10px] text-zinc-400 hover:text-white px-2 py-0.5 rounded-md liquid-pill-inactive cursor-pointer"
            >
              Done
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 mb-3">
            {FOCUS_SOUND_TRACKS.map((track) => (
              <button
                key={track.id}
                type="button"
                onClick={() => handleSelectSound(track.id)}
                className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-left liquid-spring cursor-pointer transition-all ${
                  activeSound === track.id
                    ? 'liquid-pill-active border-cyan-400/40 text-white font-semibold'
                    : 'liquid-pill-inactive text-zinc-300 hover:text-white'
                }`}
              >
                <span className="text-sm">{track.emoji}</span>
                <div className="min-w-0">
                  <div className="text-[11px] font-sans truncate">{track.name}</div>
                  <div className="text-[9px] text-zinc-400 truncate">
                    {track.id === 'gamma40' ? '40Hz Beats' : track.id === 'none' ? 'Mute' : 'Noise'}
                  </div>
                </div>
              </button>
            ))}
          </div>

          {activeSound !== 'none' && (
            <div className="flex items-center gap-3 pt-1 border-t border-white/5">
              <Volume2 size={13} className="text-zinc-400 shrink-0" />
              <input
                type="range"
                min="0.05"
                max="1"
                step="0.05"
                value={soundVolume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <span className="text-[10px] font-mono text-zinc-400 tabular-nums shrink-0">
                {Math.round(soundVolume * 100)}%
              </span>
            </div>
          )}
        </div>
      )}

      {/* MAIN BODY AREA */}
      <div className="relative z-10 flex-1 w-full max-w-md mx-auto flex flex-col justify-center py-2 space-y-3">
        {/* HERO CHRONOMETER GLASS CARD */}
        <div
          data-void-inverted-timer="true"
          className="relative w-full rounded-[26px] liquid-glass p-5 sm:p-6 text-center overflow-hidden shadow-2xl transition-all duration-200"
        >
          {/* Top specular highlight rim */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-6 right-6 h-[1.5px] pointer-events-none z-20"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.70) 50%, transparent 100%)',
              opacity: 'var(--glass-specular-opacity, 0.60)',
            }}
          />

          {/* Mission Tag & Pomodoro Indicator */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            <span
              data-void-work-hashtag="true"
              className="text-xs font-bold uppercase tracking-wider text-cyan-300 truncate flex items-center gap-1.5"
            >
              <Sparkles size={12} className="theme-text-accent" />
              {workBagActive ? `MISSION ${workTagDisplay}` : `LOCKED IN ${workTagDisplay}`}
            </span>

            {/* Pomodoro Mode Trigger / Break Indicator */}
            <button
              type="button"
              onClick={handleTogglePomodoro}
              className={`flex items-center gap-1 text-[10px] font-mono font-medium px-2 py-0.5 rounded-full border transition-all cursor-pointer ${
                pomodoroIsBreak
                  ? 'bg-amber-500/20 text-amber-200 border-amber-400/40 animate-pulse'
                  : pomodoroMode !== 'off'
                  ? 'bg-cyan-500/15 text-cyan-300 border-cyan-400/30'
                  : 'text-zinc-400 bg-white/[0.05] border-white/10 hover:text-white'
              }`}
            >
              <Coffee size={10} />
              <span>
                {pomodoroIsBreak
                  ? `Break: ${formatCountdown(pomodoroBreakSecondsLeft)}`
                  : pomodoroMode === 'off'
                  ? 'Continuous'
                  : pomodoroMode === '25_5'
                  ? 'Pomo 25/5'
                  : 'Pomo 50/10'}
              </span>
            </button>
          </div>

          {/* UNIQUE 5x7 DOT-MATRIX PIXELATED TIME DISPLAY */}
          <div className="relative z-10 py-1 my-1">
            {/* System Clock (5x7 Dot-Matrix Pixel Layout) */}
            <div className="flex flex-col items-center justify-center pt-0.5 pb-2">
              <span className="text-[9.5px] font-mono tracking-widest uppercase text-zinc-400 mb-1">
                SYSTEM TIME // SYNCED
              </span>
              <svg
                role="img"
                aria-label={`System Time ${clockPixelLayout.normalizedText}`}
                viewBox={`0 0 ${clockPixelLayout.totalCols} ${clockPixelLayout.totalRows}`}
                className="h-6 sm:h-7 w-auto max-w-full overflow-visible"
                shapeRendering="crispEdges"
              >
                <defs>
                  <linearGradient id={clockGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="100%" stopColor="rgba(255,255,255,0.72)" />
                  </linearGradient>
                </defs>
                {clockPixelLayout.rects.map((rect, idx) => (
                  <rect
                    key={idx}
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    fill={`url(#${clockGradId})`}
                  />
                ))}
              </svg>
            </div>

            {/* Glowing Accent Divider */}
            <div className="w-24 h-[1px] mx-auto bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent my-1" />

            {/* Countdown Timer (5x7 Dot-Matrix Pixel Layout with Radiant Theme Gradient) */}
            <div className="flex flex-col items-center justify-center pt-2 pb-1">
              <span className="text-[9.5px] font-mono tracking-widest uppercase text-cyan-300 mb-1.5 flex items-center gap-1.5">
                <Lock size={10} className="theme-text-accent" />
                <span>COUNTDOWN TIMER // SEALED</span>
              </span>
              <svg
                role="img"
                aria-label={`Remaining lock time ${timerPixelLayout.normalizedText}`}
                viewBox={`0 0 ${timerPixelLayout.totalCols} ${timerPixelLayout.totalRows}`}
                className="h-12 sm:h-14 w-auto max-w-full overflow-visible filter drop-shadow-[0_0_24px_var(--liquid-accent-soft-glow)]"
                shapeRendering="crispEdges"
              >
                <defs>
                  <linearGradient id={timerGradId} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#FFFFFF" />
                    <stop offset="45%" stopColor="var(--liquid-accent-tint, #38bdf8)" />
                    <stop offset="100%" stopColor="var(--liquid-accent-vibrant, #00f0ff)" />
                  </linearGradient>
                </defs>
                {timerPixelLayout.rects.map((rect, idx) => (
                  <rect
                    key={idx}
                    x={rect.x}
                    y={rect.y}
                    width={rect.w}
                    height={rect.h}
                    fill={`url(#${timerGradId})`}
                  />
                ))}
              </svg>
              <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mt-2">
                <span>Target Finish {targetEndTimeFormatted}</span>
              </div>
            </div>
          </div>

          {/* Smooth Progress Track */}
          <div className="relative z-10 mt-3.5 pt-2 border-t border-white/[0.08]">
            <div className="flex items-center justify-between text-[11px] font-sans font-medium text-zinc-400 mb-1.5 tabular-nums">
              <span>{Math.floor(activeLock.elapsedSeconds / 60)}m completed</span>
              <span className="text-zinc-200 font-semibold">{progressPct}%</span>
              <span>{Math.ceil(activeLock.remainingSeconds / 60)}m left</span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${progressPct}%`,
                  background:
                    'linear-gradient(90deg, var(--accent-primary, #38bdf8), var(--accent-secondary, #00f0ff))',
                  boxShadow: '0 0 10px var(--liquid-accent-soft-glow)',
                }}
              />
            </div>
          </div>
        </div>

        {/* STOIC / MINDFUL FOCUS QUOTE UNDERNEATH THE CHRONOMETER */}
        <div
          onClick={handleNextQuote}
          title="Tap to cycle focus wisdom"
          className="relative w-full rounded-2xl liquid-glass px-4 py-3 flex items-start gap-3 cursor-pointer liquid-spring hover:brightness-110 active:scale-[0.99] transition-all border border-white/10 shadow-lg"
        >
          <div className="w-7 h-7 rounded-xl liquid-inset flex items-center justify-center shrink-0 mt-0.5 text-cyan-300">
            <Quote size={13} className="theme-text-accent" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-zinc-200 italic font-serif leading-relaxed line-clamp-2">
              &ldquo;{currentQuote.quote}&rdquo;
            </p>
            <div className="flex items-center justify-between gap-2 mt-1">
              <span className="text-[10px] font-sans font-semibold uppercase tracking-wider text-cyan-300">
                — {currentQuote.author}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 uppercase tracking-widest">
                Tap to cycle
              </span>
            </div>
          </div>
        </div>

        {/* Status Anti-Tamper Indicator */}
        <div className="flex items-center justify-between px-1 text-[11px] font-sans text-zinc-400">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 size={12} className="text-cyan-400" />
            <span>Anti-Tamper Watchdog Active</span>
          </div>
          {activeLock.burnTheBoats && (
            <span className="text-amber-400 font-semibold flex items-center gap-1 text-[10px] uppercase">
              <Flame size={11} />
              <span>Boats Burned</span>
            </span>
          )}
        </div>
      </div>

      {/* FLOATING BOTTOM ALLOWED APPS DOCK (NOT A LIST, ICONS AT BOTTOM) */}
      <div className="relative z-10 w-full max-w-md mx-auto mb-2 shrink-0">
        <div className="text-[10px] font-sans font-semibold tracking-wider uppercase text-zinc-400 px-1 mb-1.5 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Lock size={10} className="theme-text-accent" />
            <span>Bag: {activeBag.name}</span>
          </span>
          <span className="text-cyan-300">
            {pomodoroIsBreak
              ? '☕ Mindful Break'
              : visibleBagApps.length === 0
              ? 'Monk Mode'
              : `${visibleBagApps.length} Apps Allowed`}
          </span>
        </div>

        <div className="w-full rounded-[22px] liquid-glass p-2 border border-white/10 shadow-2xl flex items-center justify-center gap-3 overflow-x-auto no-scrollbar">
          {visibleBagApps.length === 0 ? (
            <div className="flex items-center justify-center gap-4 py-1">
              {/* Compulsory Phone Icon */}
              <button
                type="button"
                onClick={() =>
                  handleRequestAppOpen('Phone Calls', 'tel:', {
                    bgColor: '#16A34A',
                    textColor: '#FFFFFF',
                    borderColor: 'rgba(255,255,255,0.2)',
                    initial: 'P',
                  })
                }
                className="flex flex-col items-center gap-1 p-1 rounded-xl liquid-spring hover:scale-105 active:scale-95 cursor-pointer"
              >
                <div className="w-12 h-12 rounded-2xl liquid-inset flex items-center justify-center text-cyan-300 shadow-md">
                  <Phone size={18} strokeWidth={2} />
                </div>
                <span className="text-[10px] font-sans font-medium text-zinc-300">Dialer</span>
              </button>

              {activeBag.allowSms && (
                <button
                  type="button"
                  onClick={() =>
                    handleRequestAppOpen('SMS Messaging', 'sms:', {
                      bgColor: '#0284C7',
                      textColor: '#FFFFFF',
                      borderColor: 'rgba(255,255,255,0.2)',
                      initial: 'S',
                    })
                  }
                  className="flex flex-col items-center gap-1 p-1 rounded-xl liquid-spring hover:scale-105 active:scale-95 cursor-pointer"
                >
                  <div className="w-12 h-12 rounded-2xl liquid-inset flex items-center justify-center text-cyan-300 shadow-md">
                    <MessageSquare size={18} strokeWidth={2} />
                  </div>
                  <span className="text-[10px] font-sans font-medium text-zinc-300">SMS</span>
                </button>
              )}

              <div className="flex items-center gap-1.5 text-zinc-500 text-[10px] font-sans px-2">
                <Shield size={12} className="text-cyan-400/60" />
                <span>Monk Mode</span>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-start sm:justify-center gap-3 w-full overflow-x-auto no-scrollbar py-0.5 px-1">
              {visibleBagApps.map((app) => {
                const brand = resolveAppBrandVisual(app);
                return (
                  <button
                    key={app.packageName}
                    type="button"
                    onClick={() => handleRequestAppOpen(app.appName, app.packageName, brand)}
                    className="flex flex-col items-center gap-1 p-1 rounded-xl liquid-spring hover:scale-105 active:scale-95 cursor-pointer shrink-0"
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center text-base font-bold shadow-md select-none transition-transform"
                      style={{
                        backgroundColor: brand.bgColor,
                        color: brand.textColor,
                        border: `1px solid ${brand.borderColor}`,
                      }}
                    >
                      {brand.initial}
                    </div>
                    <span className="text-[10px] font-sans font-medium text-zinc-300 max-w-[54px] truncate text-center">
                      {app.appName}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM ACTION BAR: Emergency Call & Emergency Escape Ticket */}
      <div className="relative z-10 w-full max-w-md mx-auto pt-1 pb-1 shrink-0 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => {
            haptics.thud();
            setShowEmergencyModal(true);
          }}
          className="flex items-center justify-center gap-2 py-3 px-4 rounded-2xl liquid-pill text-xs font-sans font-medium text-zinc-300 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <Phone size={14} className="text-red-400" />
          <span>Emergency Call</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (activeLock.burnTheBoats) {
              haptics.thud();
              setTamperWarning('Burn the Boats is active. Escape tickets are strictly disabled for this session.');
              setTimeout(() => setTamperWarning(null), 3500);
              return;
            }
            haptics.thud();
            setShowParachuteConfirm(true);
          }}
          className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-xs font-sans font-medium transition-all cursor-pointer active:scale-95 ${
            activeLock.burnTheBoats
              ? 'bg-amber-950/40 border border-amber-500/30 text-amber-300'
              : 'liquid-pill text-zinc-300 hover:text-white'
          }`}
        >
          {activeLock.burnTheBoats ? (
            <>
              <Flame size={14} className="text-amber-400 animate-pulse" />
              <span>Boats Burned</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} className="text-amber-400" />
              <span>Escape ({parachuteMetrics.currentBalance})</span>
            </>
          )}
        </button>
      </div>

      {/* MINDFUL MICRO-FRICTION INTERSTITIAL BEFORE OPENING BAG APP */}
      {frictionTarget && (
        <AppFrictionModal
          appName={frictionTarget.appName}
          packageName={frictionTarget.packageName}
          visual={frictionTarget.visual}
          onConfirm={handleExecuteAppOpen}
          onCancel={() => setFrictionTarget(null)}
        />
      )}

      {/* EMERGENCY CALL MODAL */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
        >
          <div className="relative w-full max-w-sm rounded-[24px] modal-glass p-5 shadow-2xl border border-white/10 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-red-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Emergency Protocol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="w-7 h-7 rounded-full liquid-pill-inactive flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-zinc-300 leading-relaxed">
              If you are facing an urgent safety situation, you can immediately initiate a call to
              emergency services or your emergency ICE contacts.
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleEmergencyCall('911')}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Call 911
              </button>
              <button
                type="button"
                onClick={() => handleEmergencyCall('112')}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Call 112 (EU/Global)
              </button>
            </div>

            <div className="pt-1">
              <div className="text-[11px] font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Or Dial Specific ICE Number:
              </div>
              <div className="flex gap-2">
                <input
                  type="tel"
                  placeholder="Enter phone number..."
                  value={emergencyNumber}
                  onChange={(e) => setEmergencyNumber(e.target.value)}
                  className="flex-1 px-3 py-2 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-red-400"
                />
                <button
                  type="button"
                  disabled={!emergencyNumber.trim()}
                  onClick={() => handleEmergencyCall(emergencyNumber)}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-40 text-white text-xs font-bold uppercase transition-colors cursor-pointer"
                >
                  Dial
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="w-full py-2.5 liquid-pill text-zinc-300 font-medium text-xs rounded-xl hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* EMERGENCY ESCAPE TICKET CONFIRMATION MODAL */}
      {showParachuteConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
        >
          <div className="relative w-full max-w-sm rounded-[24px] modal-glass p-5 shadow-2xl border border-white/10 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-amber-400" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Emergency Escape Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowParachuteConfirm(false)}
                className="w-7 h-7 rounded-full liquid-pill-inactive flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 leading-relaxed font-sans">
              <p>
                You are about to use 1 of your{' '}
                <strong className="text-white tabular-nums">
                  {parachuteMetrics.currentBalance}
                </strong>{' '}
                Emergency Escape Tickets.
              </p>

              <div className="p-3.5 liquid-inset rounded-xl text-zinc-200 text-xs border border-amber-500/30 bg-amber-500/10">
                <strong className="text-amber-200 block mb-1">Strict Anti-Exploit Rule:</strong>
                All elapsed time in this session (
                <span className="font-semibold text-white tabular-nums">
                  {Math.floor(activeLock.elapsedSeconds / 60)}m
                </span>
                ) will be <strong>permanently voided</strong> and will NOT count toward your next
                35-hour milestone.
              </div>

              <p className="text-zinc-400 text-xs">
                Are you sure you want to surrender this focus session?
              </p>
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={handleConfirmDeploy}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-sans font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Use Escape Ticket (-1 Balance)
              </button>
              <button
                type="button"
                onClick={() => setShowParachuteConfirm(false)}
                className="w-full py-2.5 liquid-pill text-zinc-300 font-medium text-xs rounded-xl hover:text-white cursor-pointer"
              >
                Cancel &amp; Stay Focused
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
