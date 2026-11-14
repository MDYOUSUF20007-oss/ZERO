import React, { useState, useEffect, useId, useMemo } from 'react';
import type {
  ActiveLockSession,
  ParachuteMetrics,
  OccasionBag,
  ZeroProfile,
  ThemeConfig,
} from '../types';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { isWorkBag } from '../utils/bagLayout';
import { formatCompactDuration, resolveEffectiveAppRuleConfig } from '../utils/bagAppConfig';
import { buildPixelClockLayout } from '../utils/pixelFont';
import { resolveAppBrandVisual } from '../utils/appBrandColors';
import { haptics } from '../utils/haptics';
import {
  Phone,
  AlertTriangle,
  MessageSquare,
  Battery,
  Wifi,
  Shield,
  Sparkles,
  Lock,
} from 'lucide-react';

interface TheVoidViewProps {
  activeLock: ActiveLockSession;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  profile?: ZeroProfile | null;
  themeConfig?: ThemeConfig;
  onDeployParachute: () => boolean;
}

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
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showParachuteConfirm, setShowParachuteConfirm] = useState<boolean>(false);
  const [emergencyNumber, setEmergencyNumber] = useState<string>('');
  const [tamperWarning, setTamperWarning] = useState<string | null>(null);
  const [showRetroPixel, setShowRetroPixel] = useState<boolean>(false);

  const gradId = useId().replace(/:/g, '');
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
  const timerPixelLayout = useMemo(() => buildPixelClockLayout(timerText, 1, 0.16), [timerText]);

  const displayPledge =
    profile?.motto?.trim() || 'The obstacle is the way. Stay phone-free.';
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
    if (activeLock.targetEndTime && activeLock.targetEndTime > 0) {
      return format12HourClock(new Date(activeLock.targetEndTime));
    }
    const derived = new Date(Date.now() + activeLock.remainingSeconds * 1000);
    return format12HourClock(derived);
  }, [activeLock.targetEndTime, activeLock.remainingSeconds]);

  useEffect(() => {
    const interval = setInterval(() => {
      setClockText(format12HourClock(new Date()));
      if (window.ZeroNative) {
        try {
          setBatteryPct(window.ZeroNative.getBatteryPercentage());
        } catch {
          // Ignore native battery bridge errors
        }
      }
    }, 1000);

    if (!window.ZeroNative && 'getBattery' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any)
        .getBattery()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .then((battery: any) => {
          setBatteryPct(Math.round(battery.level * 100));
          battery.addEventListener('levelchange', () => {
            setBatteryPct(Math.round(battery.level * 100));
          });
        })
        .catch(() => {});
    }

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setTamperWarning('The Void is armed. Distractions are blocked.');
        setTimeout(() => setTamperWarning(null), 3000);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleConfirmDeploy = () => {
    const success = onDeployParachute();
    if (success) {
      setShowParachuteConfirm(false);
    }
  };

  const escapeBalance = parachuteMetrics.currentBalance;

  // The Allowed Bag Surface
  const renderBagPanel = (compactBottom: boolean) => (
    <div
      className={`relative w-full rounded-[22px] liquid-glass ${
        compactBottom ? 'p-3.5' : 'p-4'
      } overflow-hidden shadow-2xl transition-all duration-200`}
    >
      {/* Specular highlight rim */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-6 right-6 h-px pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.40) 50%, transparent 100%)',
          opacity: 'var(--glass-specular-opacity, 0.50)',
        }}
      />

      {/* Header Strip */}
      <div
        className={`relative z-10 flex items-center justify-between gap-2 px-0.5 ${
          compactBottom ? 'mb-2.5' : 'mb-3.5'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-5 h-5 rounded-lg liquid-inset flex items-center justify-center shrink-0">
            <Lock size={11} className="theme-text-accent" />
          </div>
          <span className="text-[11px] font-sans font-semibold tracking-wider uppercase theme-text-primary truncate">
            BAG: {activeBag.name} ({visibleBagApps.length} APPS)
          </span>
        </div>
        <span className="text-[10px] font-sans font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active shrink-0">
          {visibleBagApps.length === 0 ? 'Monk Mode' : 'Allowed Apps'}
        </span>
      </div>

      <div
        className={`relative z-10 ${
          compactBottom ? 'max-h-[22vh] sm:max-h-[26vh] overflow-y-auto pr-0.5 space-y-2' : 'space-y-2'
        }`}
      >
        {visibleBagApps.length === 0 ? (
          <div className="space-y-2.5">
            {/* Tactical Monk Mode Card */}
            <div className="px-4 py-3 rounded-xl liquid-row text-xs font-sans text-zinc-300 leading-relaxed flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl liquid-inset flex items-center justify-center shrink-0 text-cyan-300">
                <Shield size={16} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div className="text-white font-semibold text-xs">Monk Mode Sealed</div>
                <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">
                  {activeBag.allowSms
                    ? 'All apps are locked. Phone calls & SMS remain available.'
                    : 'Zero distraction apps permitted. Only emergency dialer is open.'}
                </div>
              </div>
            </div>

            {/* Compulsory Phone Calls */}
            <div className="flex flex-col gap-2">
              <a
                href="tel:"
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl liquid-row liquid-spring hover:brightness-110 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="liquid-squircle text-cyan-200">
                    <Phone size={15} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white tracking-wide truncate">
                      Phone Calls
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate font-sans">
                      Compulsory Dialer • Always accessible
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active border shrink-0">
                  ALWAYS ON
                </span>
              </a>

              {activeBag.allowSms && (
                <a
                  href="sms:"
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl liquid-row liquid-spring hover:brightness-110 active:scale-[0.99] cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="liquid-squircle text-cyan-200">
                      <MessageSquare size={15} strokeWidth={1.75} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white tracking-wide truncate">
                        Messages
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate font-sans">
                        Normal Texts (SMS)
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active border shrink-0">
                    ALLOWED
                  </span>
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Allowed Whitelisted Apps */
          <div className="flex flex-col gap-2">
            {visibleBagApps.map((app) => {
              const effRule = resolveEffectiveAppRuleConfig(app);
              const statusLabel =
                effRule.mode === 'controlled'
                  ? effRule.quotaSeconds > 0
                    ? `QUOTA ${formatCompactDuration(effRule.quotaSeconds).toUpperCase()}`
                    : 'CONTROLLED'
                  : 'ALLOWED';
              const brand = resolveAppBrandVisual(app, '#00F2FE');
              return (
                <div
                  key={app.packageName}
                  className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl liquid-row"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 shadow-md border border-white/20"
                      style={{
                        backgroundColor: brand.bgColor,
                        color: brand.textColor,
                      }}
                    >
                      {brand.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white tracking-wide truncate">
                        {app.appName}
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate font-sans">
                        {app.packageName}
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active border shrink-0">
                    {statusLabel}
                  </span>
                </div>
              );
            })}

            {/* Compulsory Phone Calls */}
            <a
              href="tel:"
              className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl liquid-row liquid-spring hover:brightness-110 active:scale-[0.99] cursor-pointer"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="liquid-squircle text-cyan-200">
                  <Phone size={15} strokeWidth={1.75} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white tracking-wide truncate">
                    Phone Calls
                  </div>
                  <div className="text-[10px] text-zinc-400 truncate font-sans">
                    Compulsory Dialer • Always ON
                  </div>
                </div>
              </div>
              <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active border shrink-0">
                ALWAYS ON
              </span>
            </a>

            {activeBag.allowSms && (
              <a
                href="sms:"
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-xl liquid-row liquid-spring hover:brightness-110 active:scale-[0.99] cursor-pointer"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="liquid-squircle text-cyan-200">
                    <MessageSquare size={15} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white tracking-wide truncate">
                      Messages
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate font-sans">
                      Normal Texts (SMS)
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-semibold uppercase px-2 py-0.5 rounded-full liquid-pill-active border shrink-0">
                  ALLOWED
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div
      data-void-terminal="true"
      className="fixed inset-0 z-50 text-white flex flex-col justify-between px-5 select-none overflow-y-auto font-sans bg-black"
      style={{
        backgroundColor: '#000000',
        paddingTop: 'calc(0.75rem + var(--zero-safe-top))',
        paddingBottom: 'calc(0.75rem + var(--zero-safe-bottom))',
      }}
    >
      {/* Dynamic Sub-Surface Ambient Glow Orbs */}
      <div
        aria-hidden="true"
        className="fixed -top-16 -left-16 w-80 h-80 rounded-full pointer-events-none blur-3xl transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle, var(--accent-primary) 0%, var(--accent-soft) 45%, transparent 70%)',
          opacity: gpuThermalSafeguard ? 0.15 : Math.max(0.2, fluentOrbIntensity * 0.75),
        }}
      />
      <div
        aria-hidden="true"
        className="fixed -bottom-20 -right-20 w-96 h-96 rounded-full pointer-events-none blur-3xl transition-all duration-700"
        style={{
          background:
            'radial-gradient(circle, var(--accent-secondary, var(--accent-primary)) 0%, transparent 65%)',
          opacity: gpuThermalSafeguard ? 0.12 : Math.max(0.18, fluentOrbIntensity * 0.6),
        }}
      />

      {/* TOP STATUS BAR: Live Clock, Void Indicator, Battery */}
      <div className="relative z-10 w-full max-w-md mx-auto flex items-center justify-between text-xs font-sans tabular-nums text-zinc-400 pt-1 pb-2 shrink-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-zinc-200 tracking-wide">{clockText}</span>
          <button
            type="button"
            onClick={() => {
              haptics.tick(800);
              setShowRetroPixel(!showRetroPixel);
            }}
            title="Toggle Clock Typography"
            className="text-[10px] px-1.5 py-0.5 rounded-md liquid-pill-inactive text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            {showRetroPixel ? 'Retro 5x7' : 'Modern Glass'}
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full liquid-pill-active text-[10px] font-semibold uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
            <span>VOID ARMED</span>
          </div>

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

      {/* MAIN BODY AREA */}
      <div className="relative z-10 flex-1 w-full max-w-md mx-auto flex flex-col justify-center py-2 space-y-3.5">
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

          {/* Subtitle / Mission Tag */}
          <div className="relative z-10 flex items-center justify-between gap-2 mb-3">
            <span
              data-void-work-hashtag="true"
              className="text-xs font-bold uppercase tracking-wider text-cyan-300 truncate flex items-center gap-1.5"
            >
              <Sparkles size={12} className="theme-text-accent" />
              {workBagActive ? `MISSION ${workTagDisplay}` : `LOCKED IN ${workTagDisplay}`}
            </span>
            <span className="text-[10px] font-mono font-medium text-zinc-400 bg-white/[0.05] px-2 py-0.5 rounded-full border border-white/10">
              Ends {targetEndTimeFormatted}
            </span>
          </div>

          {/* Time Display (Modern Glass vs Retro Pixel) */}
          <div className="relative z-10 py-1 my-1">
            {showRetroPixel ? (
              <div className="flex flex-col items-center justify-center py-2">
                <svg
                  role="img"
                  aria-label={`Remaining lock time ${timerPixelLayout.normalizedText}`}
                  viewBox={`0 0 ${timerPixelLayout.totalCols} ${timerPixelLayout.totalRows}`}
                  className="h-10 sm:h-12 w-auto max-w-full overflow-visible"
                  shapeRendering="crispEdges"
                >
                  <defs>
                    <linearGradient id={timerGradId} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#FFFFFF" />
                      <stop offset="50%" stopColor="var(--liquid-accent-tint, #38bdf8)" />
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
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center">
                <div
                  className="text-5xl sm:text-6xl font-black font-sans tracking-tight tabular-nums select-none"
                  style={{
                    background:
                      'linear-gradient(180deg, #ffffff 0%, var(--liquid-accent-tint, #bae6fd) 60%, var(--liquid-accent-vibrant, #38bdf8) 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    filter: 'drop-shadow(0 0 20px var(--liquid-accent-soft-glow))',
                  }}
                >
                  {timerText}
                </div>
                <div className="flex items-center gap-1.5 text-[10px] uppercase font-semibold tracking-widest text-zinc-400 mt-1">
                  <span>HOURS</span>
                  <span className="text-zinc-600">•</span>
                  <span>MINS</span>
                  <span className="text-zinc-600">•</span>
                  <span>SECS</span>
                </div>
              </div>
            )}
          </div>

          {/* Progress Shimmer Bar */}
          <div className="relative z-10 w-full mt-4 pt-2">
            <div className="w-full h-1.5 rounded-full bg-white/[0.08] overflow-hidden p-0.5">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${progressPct}%`,
                  background:
                    'linear-gradient(90deg, var(--accent-primary) 0%, var(--accent-secondary, var(--accent-primary)) 100%)',
                  boxShadow: '0 0 12px var(--liquid-accent-glow)',
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 mt-1.5">
              <span>{progressPct}% elapsed</span>
              <span>{Math.floor(activeLock.elapsedSeconds / 60)}m focused</span>
            </div>
          </div>

          {/* Motto / Pledge Strip */}
          <div className="relative z-10 mt-3 pt-3 border-t border-white/[0.08]">
            <p className="text-xs font-sans italic text-zinc-300 leading-relaxed break-words">
              &ldquo;{displayPledge}&rdquo;
            </p>
          </div>
        </div>

        {/* ALLOWED APPS BAG CARD */}
        {renderBagPanel(false)}
      </div>

      {/* BOTTOM ACTION DOCK: Escape Ticket + Emergency Call */}
      <div className="relative z-10 flex flex-col gap-2.5 w-full max-w-md mx-auto pt-2 pb-1 shrink-0">
        <div className="text-center text-xs text-zinc-400 font-sans">
          {escapeBalance > 0 ? (
            <>
              <span className="font-semibold text-white tabular-nums">{escapeBalance}</span> Escape
              Ticket{escapeBalance === 1 ? '' : 's'} Available
            </>
          ) : (
            <>
              <span className="font-semibold text-zinc-300 tabular-nums">0</span> Escape Tickets
              Available •{' '}
              <span className="font-semibold text-zinc-300 tabular-nums">
                {parachuteMetrics.hoursUntilNextParachute}h
              </span>{' '}
              to next unlock
            </>
          )}
        </div>

        {/* Primary Action Button: Deploy Escape Ticket */}
        <button
          type="button"
          disabled={escapeBalance <= 0}
          onClick={() => {
            haptics.tick(900);
            setShowParachuteConfirm(true);
          }}
          className={`w-full py-3.5 rounded-2xl font-sans font-semibold text-xs uppercase tracking-wider transition-all duration-150 shadow-lg liquid-spring ${
            escapeBalance > 0
              ? 'liquid-pill-active cursor-pointer active:scale-[0.98]'
              : 'liquid-pill-inactive opacity-40 cursor-not-allowed text-zinc-500'
          }`}
        >
          USE EMERGENCY ESCAPE TICKET
        </button>

        {/* Secondary Action Button: Emergency SOS Dialer */}
        <button
          type="button"
          onClick={() => {
            haptics.tick(700);
            setShowEmergencyModal(true);
          }}
          className="w-full py-3 rounded-2xl liquid-pill font-sans font-semibold text-xs uppercase tracking-wider text-red-300 border border-red-500/25 bg-red-950/25 hover:bg-red-950/40 hover:border-red-500/40 transition-all cursor-pointer active:scale-[0.98]"
        >
          EMERGENCY CALL (911 / 112)
        </button>
      </div>

      {/* EMERGENCY SOS MODAL */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            ambientGlow
            className="w-full max-w-sm text-left font-sans modal-glass shadow-2xl"
            headerClassName="p-5 space-y-4"
            footerClassName="p-4"
            headerContent={
              <>
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <Phone size={16} strokeWidth={1.75} />
                  <span>EMERGENCY CALL ENGINE</span>
                </div>
                <p className="text-xs text-zinc-300 leading-relaxed">
                  Direct emergency lines are never restricted. Choose a line or dial below:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="tel:911"
                    className="p-3.5 liquid-row border-red-500/35 hover:border-red-400/50 rounded-xl flex flex-col items-center justify-center text-red-200 font-sans font-semibold text-sm liquid-spring active:scale-95 cursor-pointer"
                  >
                    <span className="text-base font-bold">911</span>
                    <span className="text-[10px] font-sans text-zinc-400 mt-0.5">Emergency</span>
                  </a>
                  <a
                    href="tel:112"
                    className="p-3.5 liquid-row border-red-500/35 hover:border-red-400/50 rounded-xl flex flex-col items-center justify-center text-red-200 font-sans font-semibold text-sm liquid-spring active:scale-95 cursor-pointer"
                  >
                    <span className="text-base font-bold">112</span>
                    <span className="text-[10px] font-sans text-zinc-400 mt-0.5">Global SOS</span>
                  </a>
                </div>

                <div>
                  <label className="text-xs text-zinc-400 block mb-1.5 font-medium">
                    Custom ICE Contact:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={emergencyNumber}
                      onChange={(e) => setEmergencyNumber(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="flex-1 px-3 py-2 text-xs text-white rounded-xl bg-black/50 border theme-border outline-none focus:border-red-400"
                    />
                    <a
                      href={`tel:${emergencyNumber}`}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl flex items-center justify-center transition-all ${
                        emergencyNumber
                          ? 'bg-red-600 text-white cursor-pointer hover:bg-red-500 active:scale-95'
                          : 'bg-zinc-800 text-zinc-500 pointer-events-none'
                      }`}
                    >
                      Dial
                    </a>
                  </div>
                </div>
              </>
            }
            footerContent={
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-2.5 liquid-pill text-zinc-200 text-xs rounded-xl font-semibold hover:text-white cursor-pointer"
              >
                Return to The Void
              </button>
            }
          />
        </div>
      )}

      {/* ESCAPE TICKET CONFIRM MODAL */}
      {showParachuteConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <ObsidianCard
            ambientGlow
            className="w-full max-w-sm text-left font-sans modal-glass shadow-2xl"
            headerClassName="p-5 space-y-3"
            footerClassName="p-4 flex flex-col gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2 font-semibold text-sm text-amber-300">
                  <AlertTriangle size={18} strokeWidth={1.75} />
                  <span>USE EMERGENCY ESCAPE TICKET?</span>
                </div>

                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
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
              </>
            }
            footerContent={
              <>
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
              </>
            }
          />
        </div>
      )}
    </div>
  );
};
