import React, { useState, useEffect, useId, useMemo } from 'react';
import type {
  ActiveLockSession,
  ParachuteMetrics,
  OccasionBag,
  ZeroProfile,
  ThemeConfig,
} from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
import { ObsidianCard } from './ObsidianCard';
import { ACCENT_ID_TO_KEY, ACCENT_THEMES } from './ProfileAvatar';
import { resolveActiveAccentTokens } from '../utils/themes';
import { buildPixelClockLayout } from '../utils/pixelFont';
import { resolveAppBrandVisual } from '../utils/appBrandColors';
import {
  Phone,
  AlertTriangle,
  MessageSquare,
  Battery,
  Wifi,
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
  themeConfig,
  onDeployParachute,
}) => {
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
  const gradId = useId().replace(/:/g, '');

  const profileAccentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
  const profileAccentTheme = ACCENT_THEMES[profileAccentKey] || ACCENT_THEMES.Amber;
  const activeTheme = useMemo(
    () =>
      themeConfig
        ? resolveActiveAccentTokens(themeConfig, profileAccentTheme)
        : profileAccentTheme,
    [themeConfig, profileAccentTheme]
  );

  const pixelLayout = useMemo(() => buildPixelClockLayout(clockText, 1, 0.16), [clockText]);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

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
  const phoneBrand = resolveAppBrandVisual({
    packageName: 'com.google.android.dialer',
    appName: 'Phone Calls',
    category: 'calls',
  });
  const smsBrand = resolveAppBrandVisual({
    packageName: 'com.google.android.apps.messaging',
    appName: 'Messages',
    category: 'messages',
  });

  return (
    <div
      data-void-terminal="true"
      className="fixed inset-0 z-50 text-white flex flex-col justify-between px-5 select-none overflow-y-auto bg-dot-matrix font-sans"
      style={{
        backgroundColor: '#000000',
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      {/* Top Bar: System Time & Battery */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between text-xs font-mono text-zinc-400 pt-1 pb-2 shrink-0">
        <span className="font-semibold text-zinc-300 lowercase">{clockText}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              VOID ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-300">
            <Wifi size={12} />
            <div className="flex items-center gap-1">
              <Battery size={14} />
              <span>{batteryPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Tamper Banner */}
      {tamperWarning && (
        <div className="fixed top-14 left-5 right-5 max-w-md mx-auto z-60 bg-red-950/95 border border-red-500 text-red-200 text-xs font-mono px-4 py-2.5 rounded-xl flex items-center gap-2 animate-bounce">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{tamperWarning}</span>
        </div>
      )}

      {/* Center Content Container */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md mx-auto gap-5 py-3">
        {/* 1. PIXELATED GRADIENT CLOCK CONTAINER (Directly Above Timer) */}
        <div
          className="relative w-full rounded-2xl py-3.5 px-4 text-center overflow-hidden transition-all duration-300"
          style={{
            background:
              'linear-gradient(180deg, rgba(20, 20, 24, 0.92) 0%, rgba(8, 8, 10, 0.98) 100%)',
            border: `1px solid rgba(${activeTheme.rgb}, 0.34)`,
            boxShadow: `0 0 24px -5px rgba(${activeTheme.rgb}, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
          }}
        >
          {/* Specular Accent Rim */}
          <div
            aria-hidden="true"
            className="absolute top-0 left-6 right-6 h-[1.5px] pointer-events-none z-20"
            style={{
              background: `linear-gradient(90deg, transparent 0%, ${activeTheme.hex} 50%, transparent 100%)`,
              opacity: 0.78,
            }}
          />

          {/* Dot-Matrix Underlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-dot-matrix-dense pointer-events-none opacity-35"
          />

          {/* Ambient Radial Bloom */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{
              background: `radial-gradient(ellipse 75% 85% at 50% 60%, rgba(${activeTheme.rgb}, 0.16) 0%, transparent 72%)`,
            }}
          />

          {/* Terminal Scanlines Overlay */}
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.34)_50%)] bg-[length:100%_4px] pointer-events-none opacity-45"
          />

          <div className="relative z-10 flex flex-col items-center">
            <div className="text-[9px] font-mono tracking-[0.24em] uppercase text-zinc-400 mb-2">
              SYSTEM TIME // SYNCED
            </div>

            {/* Retro-Digital 5x7 Pixel Matrix Clock with Sharp Vertical Accent Gradient */}
            <svg
              role="img"
              aria-label={pixelLayout.normalizedText}
              viewBox={`0 0 ${pixelLayout.totalCols} ${pixelLayout.totalRows}`}
              className="h-8 sm:h-9 w-auto max-w-full overflow-visible"
              shapeRendering="crispEdges"
              style={{
                filter: `drop-shadow(0 0 10px rgba(${activeTheme.rgb}, 0.34))`,
              }}
            >
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="28%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor={activeTheme.hex} />
                </linearGradient>
              </defs>
              {pixelLayout.rects.map((rect, idx) => (
                <rect
                  key={idx}
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  fill={`url(#${gradId})`}
                />
              ))}
            </svg>
          </div>
        </div>

        {/* Countdown Timer & Focus Subtitle */}
        <div className="flex flex-col items-center text-center">
          <div
            className="text-xs font-mono font-bold tracking-[0.18em] uppercase mb-2.5"
            style={{ color: activeTheme.hex }}
          >
            LOCKED IN #{activeLock.tag}
          </div>

          <div className="text-5xl sm:text-6xl font-black font-mono tracking-tighter text-white drop-shadow-[0_4px_24px_rgba(255,255,255,0.14)]">
            {formatCountdown(activeLock.remainingSeconds)}
          </div>

          <p className="mt-2.5 text-xs font-mono italic text-zinc-400 max-w-xs">
            &ldquo;The obstacle is the way. Stay phone-free.&rdquo;
          </p>
        </div>

        {/* 2. WHATSAPP-STYLE APP BAG DISPLAY (Replacing Plain Tiles) */}
        <div
          className="relative w-full rounded-2xl p-4 overflow-hidden transition-all duration-300"
          style={{
            background:
              'linear-gradient(180deg, rgba(16, 16, 20, 0.94) 0%, rgba(8, 8, 10, 0.98) 100%)',
            border: `1px solid rgba(${activeTheme.rgb}, 0.28)`,
            boxShadow: `0 0 20px -4px rgba(${activeTheme.rgb}, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)`,
          }}
        >
          {/* Header Strip */}
          <div className="flex items-center justify-between gap-2 mb-3 px-0.5">
            <span className="text-[11px] font-mono font-bold tracking-widest uppercase text-zinc-300 truncate">
              BAG: {activeBag.name.toUpperCase()} ({activeBag.apps.length}/{MAX_BAG_APPS} APPS)
            </span>
            <span
              className="text-[10px] font-mono shrink-0"
              style={{
                color: activeBag.apps.length === 0 ? activeTheme.hex : '#34D399',
              }}
            >
              {activeBag.apps.length === 0 ? 'Monk Mode Active' : 'Allowed Apps'}
            </span>
          </div>

          {activeBag.apps.length === 0 ? (
            <div className="space-y-2.5">
              {/* Clean Tactical Empty-State Card with Subtle Accent Border Glow */}
              <div
                className="px-3.5 py-2.5 rounded-xl text-xs font-mono text-zinc-300 leading-relaxed"
                style={{
                  background: 'rgba(9, 9, 12, 0.84)',
                  border: `1px solid rgba(${activeTheme.rgb}, 0.24)`,
                  boxShadow: `inset 0 0 14px rgba(${activeTheme.rgb}, 0.08)`,
                }}
              >
                Monk Mode: Empty Bag.{' '}
                {activeBag.allowSms
                  ? 'Unbagged distraction apps are sealed.'
                  : 'All normal distraction apps & texts are sealed.'}
              </div>

              {/* Compulsory Phone Calls Row (Always ON even in Empty Bag) */}
              <div className="flex flex-col gap-2">
                <a
                  href="tel:"
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]"
                  style={{
                    background: 'rgba(24, 24, 28, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{
                        backgroundColor: phoneBrand.bgColor,
                        color: phoneBrand.textColor,
                        border: `1px solid ${phoneBrand.borderColor}`,
                      }}
                    >
                      <Phone size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white tracking-wide truncate">
                        Phone Calls
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">
                        Compulsory Dialer • Always accessible
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 shrink-0">
                    ALWAYS ON
                  </span>
                </a>

                {activeBag.allowSms && (
                  <a
                    href="sms:"
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]"
                    style={{
                      background: 'rgba(24, 24, 28, 0.78)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                        style={{
                          backgroundColor: smsBrand.bgColor,
                          color: smsBrand.textColor,
                          border: `1px solid ${smsBrand.borderColor}`,
                        }}
                      >
                        <MessageSquare size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white tracking-wide truncate">
                          Messages
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          Normal Texts (SMS)
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 shrink-0">
                      ALLOWED
                    </span>
                  </a>
                )}
              </div>
            </div>
          ) : (
            /* WhatsApp-Style Vertical Rows Matching App Brand Colors */
            <div className="flex flex-col gap-2">
              {activeBag.apps.map((app) => {
                const brand = resolveAppBrandVisual(app, activeTheme.hex);
                return (
                  <div
                    key={app.packageName}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{
                      background: 'rgba(24, 24, 28, 0.80)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md shrink-0"
                        style={{
                          backgroundColor: brand.bgColor,
                          color: brand.textColor,
                          border: `1px solid ${brand.borderColor}`,
                          boxShadow: `0 4px 12px -4px ${brand.bgColor}`,
                        }}
                      >
                        {brand.initial}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-white tracking-wide truncate">
                          {app.appName}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400 truncate">
                          {app.packageName}
                        </div>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 shrink-0">
                      ALLOWED
                    </span>
                  </div>
                );
              })}

              {/* Compulsory Phone Calls Row */}
              <a
                href="tel:"
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]"
                style={{
                  background: 'rgba(24, 24, 28, 0.78)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                    style={{
                      backgroundColor: phoneBrand.bgColor,
                      color: phoneBrand.textColor,
                      border: `1px solid ${phoneBrand.borderColor}`,
                    }}
                  >
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-white tracking-wide truncate">
                      Phone Calls
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400 truncate">
                      Compulsory Dialer • Always ON
                    </div>
                  </div>
                </div>
                <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 shrink-0">
                  ALWAYS ON
                </span>
              </a>

              {activeBag.allowSms && (
                <a
                  href="sms:"
                  className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]"
                  style={{
                    background: 'rgba(24, 24, 28, 0.78)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                  }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-md"
                      style={{
                        backgroundColor: smsBrand.bgColor,
                        color: smsBrand.textColor,
                        border: `1px solid ${smsBrand.borderColor}`,
                      }}
                    >
                      <MessageSquare size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-white tracking-wide truncate">
                        Messages
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400 truncate">
                        Normal Texts (SMS)
                      </div>
                    </div>
                  </div>
                  <span className="text-[9px] font-mono font-black uppercase px-2 py-0.5 rounded bg-emerald-500/12 text-emerald-400 border border-emerald-500/25 shrink-0">
                    ALLOWED
                  </span>
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Footer */}
      <div className="flex flex-col gap-2.5 w-full max-w-md mx-auto pb-2 shrink-0">
        <div className="text-center text-xs font-mono text-zinc-400">
          {escapeBalance > 0
            ? `${escapeBalance} Escape Ticket(s) Available`
            : `0 Escape Tickets Available • ${parachuteMetrics.hoursUntilNextParachute}h to next`}
        </div>

        <button
          type="button"
          disabled={escapeBalance <= 0}
          onClick={() => setShowParachuteConfirm(true)}
          className="w-full py-3.5 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed"
          style={
            escapeBalance > 0
              ? {
                  background: activeTheme.badgeGradient,
                  color: activeTheme.badgeText,
                  boxShadow: `0 0 22px -2px rgba(${activeTheme.rgb}, 0.36)`,
                }
              : {
                  background: 'rgba(24, 24, 28, 0.9)',
                  color: '#A1A1AA',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }
          }
        >
          USE EMERGENCY ESCAPE TICKET
        </button>

        <button
          type="button"
          onClick={() => setShowEmergencyModal(true)}
          className="w-full py-3.5 rounded-2xl font-mono font-bold text-xs uppercase tracking-wider text-zinc-200 hover:text-white transition-all active:scale-[0.98]"
          style={{
            background: 'rgba(24, 24, 28, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
          }}
        >
          EMERGENCY CALL (911 / 112)
        </button>
      </div>

      {/* Emergency SOS Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <ObsidianCard
            accentOverride={{ hex: '#EF4444', rgb: '239, 68, 68' }}
            ambientGlow
            className="w-full max-w-sm font-mono text-left"
            headerClassName="p-5 space-y-4"
            footerClassName="p-4"
            headerContent={
              <>
                <div className="flex items-center gap-2 text-red-400 font-bold text-sm">
                  <Phone size={16} />
                  <span>EMERGENCY CALL ENGINE</span>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Direct emergency lines are never restricted. Choose a line or dial below:
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="tel:911"
                    className="p-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 rounded-xl flex flex-col items-center justify-center text-red-200 font-bold text-sm active:scale-95 transition-all"
                  >
                    <span>911</span>
                    <span className="text-[10px] font-normal text-red-300">Emergency</span>
                  </a>
                  <a
                    href="tel:112"
                    className="p-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 rounded-xl flex flex-col items-center justify-center text-red-200 font-bold text-sm active:scale-95 transition-all"
                  >
                    <span>112</span>
                    <span className="text-[10px] font-normal text-red-300">Global SOS</span>
                  </a>
                </div>

                <div>
                  <label className="text-[11px] text-zinc-400 block mb-1">
                    Custom ICE Contact:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={emergencyNumber}
                      onChange={(e) => setEmergencyNumber(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className="flex-1 obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none"
                    />
                    <a
                      href={`tel:${emergencyNumber}`}
                      className={`px-4 py-2 rounded-xl text-xs font-bold font-mono flex items-center justify-center ${
                        emergencyNumber
                          ? 'bg-red-500 text-white'
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
                onClick={() => setShowEmergencyModal(false)}
                className="w-full py-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-200 text-xs rounded-xl font-bold transition-colors"
              >
                Return to The Void
              </button>
            }
          />
        </div>
      )}

      {/* Escape Ticket Confirm Modal */}
      {showParachuteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <ObsidianCard
            accentOverride={{ hex: activeTheme.hex, rgb: activeTheme.rgb }}
            ambientGlow
            className="w-full max-w-sm font-mono text-left"
            headerClassName="p-5 space-y-3"
            footerClassName="p-4 flex flex-col gap-2"
            headerContent={
              <>
                <div
                  className="flex items-center gap-2 font-bold text-sm"
                  style={{ color: activeTheme.hex }}
                >
                  <AlertTriangle size={18} />
                  <span>USE EMERGENCY ESCAPE TICKET?</span>
                </div>

                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                  <p>
                    You are about to use 1 of your{' '}
                    <strong className="text-white">{parachuteMetrics.currentBalance}</strong>{' '}
                    Emergency Escape Tickets.
                  </p>
                  <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-amber-200 text-[11px]">
                    <strong>Strict Anti-Exploit Rule:</strong> All elapsed time in this session (
                    {Math.floor(activeLock.elapsedSeconds / 60)}m) will be{' '}
                    <strong>permanently voided</strong> and will NOT count toward your next
                    20-hour milestone.
                  </div>
                  <p className="text-zinc-400 text-[11px]">
                    Are you sure you want to surrender this session?
                  </p>
                </div>
              </>
            }
            footerContent={
              <>
                <button
                  onClick={handleConfirmDeploy}
                  className="w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95"
                  style={{
                    background: activeTheme.badgeGradient,
                    color: activeTheme.badgeText,
                  }}
                >
                  Use Escape Ticket (-1 Balance)
                </button>
                <button
                  onClick={() => setShowParachuteConfirm(false)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-white/15"
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
