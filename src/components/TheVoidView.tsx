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
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import {
  computeDynamicAccentTokens,
  DEFAULT_THEME_CONFIG,
  getRelativeLuminance,
  mixHexColors,
  resolveActiveAccentTokens,
} from '../utils/themes';
import { isWorkBag } from '../utils/bagLayout';
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

function darkenRgb(rgbStr: string, factor: number): string {
  const parts = rgbStr.split(',').map((s) => Number(s.trim()));
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return '#18181B';
  }
  const f = Math.max(0, Math.min(1, 1 - factor));
  const [r, g, b] = parts.map((c) => Math.max(0, Math.min(255, Math.round(c * f))));
  return `rgb(${r}, ${g}, ${b})`;
}

export const TheVoidView: React.FC<TheVoidViewProps> = ({
  activeLock,
  parachuteMetrics,
  activeBag,
  profile = null,
  themeConfig,
  onDeployParachute,
}) => {
  const { isBespoke } = useInterfaceStyle();
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
  const timerGradId = `${gradId}-timer`;

  const activeTheme = useMemo(() => {
    const resolved = resolveActiveAccentTokens(themeConfig ?? DEFAULT_THEME_CONFIG);
    // TheVoidView always sits on pure #000000 black; ensure dark E-Ink accents (e.g. Newsprint) remain crisp.
    if (getRelativeLuminance(resolved.hex) < 0.24) {
      return computeDynamicAccentTokens(mixHexColors(resolved.hex, '#FFFFFF', 0.48));
    }
    return resolved;
  }, [themeConfig]);

  const workBagActive = isWorkBag(activeBag?.id, activeBag?.name);

  const badgeAccentStyle: React.CSSProperties = isBespoke
    ? {
        backgroundColor: 'rgba(59, 130, 246, 0.14)',
        color: '#60A5FA',
        borderColor: 'rgba(59, 130, 246, 0.35)',
      }
    : {
        backgroundColor: `rgba(${activeTheme.rgb}, 0.14)`,
        color: activeTheme.hex,
        borderColor: `rgba(${activeTheme.rgb}, 0.34)`,
      };

  const formatCountdown = (totalSec: number) => {
    const safeSec = Math.max(0, Math.floor(totalSec));
    const hours = Math.floor(safeSec / 3600);
    const mins = Math.floor((safeSec % 3600) / 60);
    const secs = safeSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  };

  const pixelLayout = useMemo(() => buildPixelClockLayout(clockText, 1, 0.16), [clockText]);
  const timerText = formatCountdown(activeLock.remainingSeconds);
  const timerPixelLayout = useMemo(() => buildPixelClockLayout(timerText, 1, 0.16), [timerText]);
  const displayPledge =
    profile?.motto?.trim() || 'The obstacle is the way. Stay phone-free.';
  const normalizedWorkTag = (activeLock.tag || 'Deep Work').replace(/^#+/, '').trim() || 'Deep Work';
  const workTagDisplay = `#${normalizedWorkTag.toUpperCase()}`;
  const workTagSizeClass =
    workTagDisplay.length <= 12
      ? 'text-[3.35rem] sm:text-[4.25rem] leading-[1.02]'
      : workTagDisplay.length <= 18
      ? 'text-[2.75rem] sm:text-[3.4rem] leading-[1.05]'
      : 'text-[2.25rem] sm:text-[2.85rem] leading-[1.08]';

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
  const phoneBrand = isBespoke
    ? {
        bgColor: 'rgba(59, 130, 246, 0.14)',
        textColor: '#60A5FA',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        initial: 'P',
      }
    : {
        bgColor: `rgba(${activeTheme.rgb}, 0.14)`,
        textColor: activeTheme.hex,
        borderColor: `rgba(${activeTheme.rgb}, 0.35)`,
        initial: 'P',
      };
  const smsBrand = isBespoke
    ? {
        bgColor: 'rgba(59, 130, 246, 0.14)',
        textColor: '#60A5FA',
        borderColor: 'rgba(59, 130, 246, 0.35)',
        initial: 'M',
      }
    : {
        bgColor: `rgba(${activeTheme.rgb}, 0.14)`,
        textColor: activeTheme.hex,
        borderColor: `rgba(${activeTheme.rgb}, 0.35)`,
        initial: 'M',
      };

  const renderBagPanel = (compactBottom: boolean) => (
    <div
      className={
        isBespoke
          ? `relative w-full rounded-md ${compactBottom ? 'p-3.5' : 'p-5'} bg-black border border-neutral-800`
          : `relative w-full rounded-2xl ${compactBottom ? 'p-3' : 'p-4'} overflow-hidden transition-all duration-300`
      }
      style={
        isBespoke
          ? undefined
          : {
              background:
                'linear-gradient(180deg, rgba(16, 16, 20, 0.94) 0%, rgba(8, 8, 10, 0.98) 100%)',
              border: `1px solid rgba(${activeTheme.rgb}, 0.28)`,
              boxShadow: `0 0 20px -4px rgba(${activeTheme.rgb}, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.06)`,
            }
      }
    >
      {/* Header Strip */}
      <div className={`flex items-center justify-between gap-2 px-0.5 ${compactBottom ? 'mb-2.5' : 'mb-3.5'}`}>
        <span
          className={`text-[11px] tracking-widest uppercase text-neutral-300 truncate ${
            isBespoke ? 'font-sans font-semibold' : 'font-mono font-bold'
          }`}
        >
          BAG: {activeBag.name.toUpperCase()} (
          <span className="font-mono tabular-nums">
            {activeBag.apps.length}/{MAX_BAG_APPS}
          </span>{' '}
          APPS)
        </span>
        <span
          className={`text-[10px] shrink-0 ${
            isBespoke ? 'font-sans font-medium' : 'font-mono font-bold'
          }`}
          style={{
            color: isBespoke ? '#3B82F6' : activeTheme.hex,
          }}
        >
          {activeBag.apps.length === 0 ? 'Monk Mode Active' : 'Allowed Apps'}
        </span>
      </div>

      <div className={compactBottom ? 'max-h-[22vh] sm:max-h-[26vh] overflow-y-auto pr-0.5' : ''}>
        {activeBag.apps.length === 0 ? (
          <div className="space-y-2.5">
            {/* Tactical Empty-State Card */}
            <div
              className={
                isBespoke
                  ? 'px-4 py-3 rounded-md bg-neutral-950 border border-neutral-800 text-xs font-sans text-neutral-300 leading-relaxed'
                  : 'px-3.5 py-2.5 rounded-xl text-xs font-mono text-zinc-300 leading-relaxed'
              }
              style={
                isBespoke
                  ? undefined
                  : {
                      background: 'rgba(9, 9, 12, 0.84)',
                      border: `1px solid rgba(${activeTheme.rgb}, 0.24)`,
                      boxShadow: `inset 0 0 14px rgba(${activeTheme.rgb}, 0.08)`,
                    }
              }
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
                className={
                  isBespoke
                    ? 'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors duration-75'
                    : 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]'
                }
                style={
                  isBespoke
                    ? undefined
                    : {
                        background: 'rgba(24, 24, 28, 0.78)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl shadow-md'
                    }`}
                    style={{
                      backgroundColor: phoneBrand.bgColor,
                      color: phoneBrand.textColor,
                      border: `1px solid ${phoneBrand.borderColor}`,
                    }}
                  >
                    <Phone size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white tracking-wide truncate">
                      Phone Calls
                    </div>
                    <div
                      className={`text-[10px] text-neutral-400 truncate ${
                        isBespoke ? 'font-sans' : 'font-mono'
                      }`}
                    >
                      Compulsory Dialer • Always accessible
                    </div>
                  </div>
                </div>
                <span
                  style={badgeAccentStyle}
                  className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                    isBespoke ? 'rounded-sm' : 'rounded font-black'
                  }`}
                >
                  ALWAYS ON
                </span>
              </a>

              {activeBag.allowSms && (
                <a
                  href="sms:"
                  className={
                    isBespoke
                      ? 'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors duration-75'
                      : 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]'
                  }
                  style={
                    isBespoke
                      ? undefined
                      : {
                          background: 'rgba(24, 24, 28, 0.78)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl shadow-md'
                      }`}
                      style={{
                        backgroundColor: smsBrand.bgColor,
                        color: smsBrand.textColor,
                        border: `1px solid ${smsBrand.borderColor}`,
                      }}
                    >
                      <MessageSquare size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white tracking-wide truncate">
                        Messages
                      </div>
                      <div
                        className={`text-[10px] text-neutral-400 truncate ${
                          isBespoke ? 'font-sans' : 'font-mono'
                        }`}
                      >
                        Normal Texts (SMS)
                      </div>
                    </div>
                  </div>
                  <span
                    style={badgeAccentStyle}
                    className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                      isBespoke ? 'rounded-sm' : 'rounded font-black'
                    }`}
                  >
                    ALLOWED
                  </span>
                </a>
              )}
            </div>
          </div>
        ) : (
          /* Vertical Rows Matching App Brand Colors */
          <div className="flex flex-col gap-2">
            {activeBag.apps.map((app) => {
              const brand = resolveAppBrandVisual(
                app,
                isBespoke ? '#3B82F6' : activeTheme.hex
              );
              return (
                <div
                  key={app.packageName}
                  className={
                    isBespoke
                      ? 'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800'
                      : 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all'
                  }
                  style={
                    isBespoke
                      ? undefined
                      : {
                          background: 'rgba(24, 24, 28, 0.80)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                        }
                  }
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 flex items-center justify-center font-bold text-sm shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl font-black shadow-md'
                      }`}
                      style={{
                        backgroundColor: brand.bgColor,
                        color: brand.textColor,
                        border: `1px solid ${brand.borderColor}`,
                        boxShadow: isBespoke ? 'none' : `0 4px 12px -4px ${brand.bgColor}`,
                      }}
                    >
                      {brand.initial}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white tracking-wide truncate">
                        {app.appName}
                      </div>
                      <div className="text-[10px] font-mono text-neutral-400 truncate">
                        {app.packageName}
                      </div>
                    </div>
                  </div>
                  <span
                    style={badgeAccentStyle}
                    className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                      isBespoke ? 'rounded-sm' : 'rounded font-black'
                    }`}
                  >
                    ALLOWED
                  </span>
                </div>
              );
            })}

            {/* Compulsory Phone Calls Row */}
            <a
              href="tel:"
              className={
                isBespoke
                  ? 'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors duration-75'
                  : 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]'
              }
              style={
                isBespoke
                  ? undefined
                  : {
                      background: 'rgba(24, 24, 28, 0.78)',
                      border: '1px solid rgba(255, 255, 255, 0.06)',
                    }
              }
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                    isBespoke ? 'rounded-md' : 'rounded-xl shadow-md'
                  }`}
                  style={{
                    backgroundColor: phoneBrand.bgColor,
                    color: phoneBrand.textColor,
                    border: `1px solid ${phoneBrand.borderColor}`,
                  }}
                >
                  <Phone size={16} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white tracking-wide truncate">
                    Phone Calls
                  </div>
                  <div
                    className={`text-[10px] text-neutral-400 truncate ${
                      isBespoke ? 'font-sans' : 'font-mono'
                    }`}
                  >
                    Compulsory Dialer • Always ON
                  </div>
                </div>
              </div>
              <span
                style={badgeAccentStyle}
                className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                  isBespoke ? 'rounded-sm' : 'rounded font-black'
                }`}
              >
                ALWAYS ON
              </span>
            </a>

            {activeBag.allowSms && (
              <a
                href="sms:"
                className={
                  isBespoke
                    ? 'flex items-center justify-between gap-3 px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 transition-colors duration-75'
                    : 'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all active:scale-[0.99]'
                }
                style={
                  isBespoke
                    ? undefined
                    : {
                        background: 'rgba(24, 24, 28, 0.78)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                      }
                }
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`w-9 h-9 flex items-center justify-center shrink-0 ${
                      isBespoke ? 'rounded-md' : 'rounded-xl shadow-md'
                    }`}
                    style={{
                      backgroundColor: smsBrand.bgColor,
                      color: smsBrand.textColor,
                      border: `1px solid ${smsBrand.borderColor}`,
                    }}
                  >
                    <MessageSquare size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white tracking-wide truncate">
                      Messages
                    </div>
                    <div
                      className={`text-[10px] text-neutral-400 truncate ${
                        isBespoke ? 'font-sans' : 'font-mono'
                      }`}
                    >
                      Normal Texts (SMS)
                    </div>
                  </div>
                </div>
                <span
                  style={badgeAccentStyle}
                  className={`text-[9px] font-mono font-semibold uppercase px-2 py-0.5 border shrink-0 ${
                    isBespoke ? 'rounded-sm' : 'rounded font-black'
                  }`}
                >
                  ALLOWED
                </span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );

  const dualTimepieceSection = (
    <div className="flex flex-col items-center w-full gap-3">
      {/* 1. PIXELATED CLOCK CONTAINER (Directly Above Timer) */}
      <div
        data-void-clock-card="true"
        className={
          isBespoke
            ? 'relative w-full rounded-md py-4 px-5 text-center border'
            : 'relative w-full rounded-2xl py-3.5 px-4 text-center overflow-hidden transition-all duration-300'
        }
        style={
          isBespoke
            ? {
                backgroundColor: '#000000',
                borderColor: '#262626',
              }
            : {
                background:
                  'linear-gradient(180deg, rgba(20, 20, 24, 0.92) 0%, rgba(8, 8, 10, 0.98) 100%)',
                border: `1px solid rgba(${activeTheme.rgb}, 0.34)`,
                boxShadow: `0 0 24px -5px rgba(${activeTheme.rgb}, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.08)`,
              }
        }
      >
        {!isBespoke && (
          <>
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
          </>
        )}

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={`text-[10px] tracking-[0.2em] uppercase mb-2 ${
              isBespoke ? 'font-sans font-medium' : 'text-[9px] font-mono tracking-[0.24em]'
            }`}
            style={{ color: '#A1A1AA' }}
          >
            SYSTEM TIME // SYNCED
          </div>

          {/* Retro-Digital 5x7 Pixel Matrix Clock */}
          <svg
            role="img"
            aria-label={pixelLayout.normalizedText}
            viewBox={`0 0 ${pixelLayout.totalCols} ${pixelLayout.totalRows}`}
            className="h-8 sm:h-9 w-auto max-w-full overflow-visible"
            shapeRendering="crispEdges"
            style={
              isBespoke
                ? undefined
                : {
                    filter: `drop-shadow(0 0 10px rgba(${activeTheme.rgb}, 0.34))`,
                  }
            }
          >
            {!isBespoke && (
              <defs>
                <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFFFF" />
                  <stop offset="28%" stopColor="#FFFFFF" />
                  <stop offset="100%" stopColor={activeTheme.hex} />
                </linearGradient>
              </defs>
            )}
            {pixelLayout.rects.map((rect, idx) => (
              <rect
                key={idx}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                fill={isBespoke ? '#FAFAFA' : `url(#${gradId})`}
              />
            ))}
          </svg>
        </div>
      </div>

      {/* 2. INVERTED POLARITY PIXELATED TIMER CONTAINER (#FAFAFA light card, #000000 5x7 pixels) */}
      <div
        data-void-inverted-timer="true"
        className={
          isBespoke
            ? 'relative w-full rounded-md py-4 px-5 text-center border'
            : 'relative w-full rounded-2xl py-4 px-4 text-center overflow-hidden transition-all duration-300'
        }
        style={
          isBespoke
            ? {
                backgroundColor: '#FAFAFA',
                borderColor: '#D4D4D8',
              }
            : {
                background: 'linear-gradient(180deg, #FFFFFF 0%, #F4F4F5 100%)',
                border: `1.5px solid rgba(${activeTheme.rgb}, 0.62)`,
                boxShadow: `0 0 24px -5px rgba(${activeTheme.rgb}, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.9)`,
              }
        }
      >
        {!isBespoke && (
          <>
            {/* Inverted Specular Rim */}
            <div
              aria-hidden="true"
              className="absolute top-0 left-6 right-6 h-[1.5px] pointer-events-none z-20"
              style={{
                background: `linear-gradient(90deg, transparent 0%, ${darkenRgb(
                  activeTheme.rgb,
                  0.25
                )} 50%, transparent 100%)`,
                opacity: 0.78,
              }}
            />

            {/* Inverted Dark Dot-Matrix Underlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage: 'radial-gradient(rgba(0, 0, 0, 0.085) 1.1px, transparent 1.1px)',
                backgroundSize: '14px 14px',
              }}
            />

            {/* Faint Accent Wash */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 75% 85% at 50% 58%, rgba(${activeTheme.rgb}, 0.11) 0%, transparent 72%)`,
              }}
            />

            {/* Subtle Dark Scanlines Overlay */}
            <div
              aria-hidden="true"
              className="absolute inset-0 pointer-events-none"
              style={{
                backgroundImage:
                  'linear-gradient(rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 0.055) 50%)',
                backgroundSize: '100% 4px',
              }}
            />
          </>
        )}

        <div className="relative z-10 flex flex-col items-center">
          <div
            className={
              isBespoke
                ? 'text-[10px] font-sans font-semibold tracking-[0.2em] uppercase mb-2'
                : 'text-[9px] font-mono font-bold tracking-[0.22em] uppercase mb-2'
            }
            style={{
              color: isBespoke ? '#1D4ED8' : darkenRgb(activeTheme.rgb, 0.65),
            }}
          >
            {workBagActive ? 'WORK BAG COUNTDOWN' : `LOCKED IN #${activeLock.tag}`}
          </div>

          {/* Inverted 5x7 Pixel Matrix Countdown */}
          <svg
            role="img"
            aria-label={`Remaining lock time ${timerPixelLayout.normalizedText}`}
            viewBox={`0 0 ${timerPixelLayout.totalCols} ${timerPixelLayout.totalRows}`}
            className="h-9 sm:h-11 w-auto max-w-full overflow-visible"
            shapeRendering="crispEdges"
          >
            {!isBespoke && (
              <defs>
                <linearGradient id={timerGradId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#000000" />
                  <stop offset="28%" stopColor="#000000" />
                  <stop offset="100%" stopColor={darkenRgb(activeTheme.rgb, 0.78)} />
                </linearGradient>
              </defs>
            )}
            {timerPixelLayout.rects.map((rect, idx) => (
              <rect
                key={idx}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                fill={isBespoke ? '#000000' : `url(#${timerGradId})`}
              />
            ))}
          </svg>
        </div>
      </div>
    </div>
  );

  return (
    <div
      data-void-terminal="true"
      className={`fixed inset-0 z-50 text-white flex flex-col justify-between px-5 select-none overflow-y-auto font-sans ${
        isBespoke ? 'bg-black' : 'bg-dot-matrix'
      }`}
      style={{
        backgroundColor: '#000000',
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      {/* Top Bar: System Time & Battery */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between text-xs font-mono tabular-nums text-neutral-400 pt-1 pb-2 shrink-0">
        <span className="font-semibold text-neutral-300 lowercase">{clockText}</span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span
              className={
                isBespoke
                  ? 'w-1.5 h-1.5 rounded-none'
                  : 'w-1.5 h-1.5 rounded-full animate-pulse'
              }
              style={{ backgroundColor: isBespoke ? '#3B82F6' : activeTheme.hex }}
            />
            <span
              className={`text-[10px] uppercase tracking-wider text-neutral-400 font-semibold ${
                isBespoke ? 'font-sans' : ''
              }`}
            >
              VOID ACTIVE
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-neutral-300">
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
        <div
          className={`fixed top-14 left-5 right-5 max-w-md mx-auto z-60 bg-red-950/95 border border-red-500 text-red-200 text-xs px-4 py-2.5 flex items-center gap-2 ${
            isBespoke ? 'rounded-md font-sans' : 'rounded-xl font-mono animate-bounce'
          }`}
        >
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{tamperWarning}</span>
        </div>
      )}

      {workBagActive ? (
        <>
          {/* Work Bag Top Section: Clock + Countdown Timer */}
          <div className="w-full max-w-md mx-auto pt-1 shrink-0">
            {dualTimepieceSection}
          </div>

          {/* Work Bag Middle Spotlight: Hero #HASHTAG larger than both clock and timer */}
          <div className="flex-1 min-h-[124px] w-full max-w-md mx-auto flex flex-col items-center justify-center text-center px-2 py-3">
            <span
              className={`text-[10px] uppercase tracking-[0.26em] text-neutral-400 mb-1.5 ${
                isBespoke ? 'font-sans font-semibold' : 'font-mono font-bold'
              }`}
            >
              WORK BAG MISSION
            </span>
            <div
              data-void-work-hashtag="true"
              className={`${workTagSizeClass} font-black tracking-tight break-words max-w-full ${
                isBespoke ? 'font-sans' : 'font-mono'
              }`}
              style={{
                color: isBespoke ? '#3B82F6' : activeTheme.hex,
                textShadow: isBespoke
                  ? 'none'
                  : `0 0 32px rgba(${activeTheme.rgb}, 0.36)`,
              }}
            >
              {workTagDisplay}
            </div>
            <p
              className={`mt-2 text-xs italic text-neutral-400 text-center max-w-xs ${
                isBespoke ? 'font-sans' : 'font-mono'
              }`}
            >
              &ldquo;{displayPledge}&rdquo;
            </p>
          </div>
        </>
      ) : (
        /* Standard Non-Work Bag Layout */
        <div className="flex flex-col items-center justify-center my-auto w-full max-w-md mx-auto gap-5 py-3">
          {dualTimepieceSection}
          <p
            className={`mt-0.5 text-xs italic text-neutral-400 text-center max-w-xs ${
              isBespoke ? 'font-sans' : 'font-mono'
            }`}
          >
            &ldquo;{displayPledge}&rdquo;
          </p>
          {renderBagPanel(false)}
        </div>
      )}

      {/* Bottom Action Footer (Work Bag apps placed here when Work Bag active) */}
      <div className="flex flex-col gap-2.5 w-full max-w-md mx-auto pb-2 shrink-0">
        {workBagActive && renderBagPanel(true)}
        <div
          className={`text-center text-xs text-neutral-400 ${
            isBespoke ? 'font-sans' : 'font-mono'
          }`}
        >
          {escapeBalance > 0 ? (
            <>
              <span className="font-mono tabular-nums">{escapeBalance}</span> Escape Ticket(s)
              Available
            </>
          ) : (
            <>
              <span className="font-mono tabular-nums">0</span> Escape Tickets Available •{' '}
              <span className="font-mono tabular-nums">
                {parachuteMetrics.hoursUntilNextParachute}h
              </span>{' '}
              to next
            </>
          )}
        </div>

        <button
          type="button"
          disabled={escapeBalance <= 0}
          onClick={() => setShowParachuteConfirm(true)}
          className={
            isBespoke
              ? `w-full py-3.5 rounded-md border font-sans font-semibold text-xs uppercase tracking-wider transition-colors duration-75 disabled:opacity-40 disabled:cursor-not-allowed ${
                  escapeBalance > 0
                    ? 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white'
                    : 'bg-neutral-950 border-neutral-800 text-neutral-500'
                }`
              : 'w-full py-3.5 rounded-2xl font-mono font-black text-xs uppercase tracking-wider transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed'
          }
          style={
            isBespoke
              ? undefined
              : escapeBalance > 0
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
          className={
            isBespoke
              ? 'w-full py-3.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 font-sans font-semibold text-xs uppercase tracking-wider text-neutral-200 hover:text-white transition-colors duration-75'
              : 'w-full py-3.5 rounded-2xl font-mono font-bold text-xs uppercase tracking-wider text-zinc-200 hover:text-white transition-all active:scale-[0.98]'
          }
          style={
            isBespoke
              ? undefined
              : {
                  background: 'rgba(24, 24, 28, 0.92)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                }
          }
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
            className={`w-full max-w-sm text-left ${isBespoke ? 'font-sans' : 'font-mono'}`}
            headerClassName="p-5 space-y-4"
            footerClassName="p-4"
            headerContent={
              <>
                <div className="flex items-center gap-2 text-red-400 font-semibold text-sm">
                  <Phone size={16} />
                  <span>EMERGENCY CALL ENGINE</span>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Direct emergency lines are never restricted. Choose a line or dial below:
                </p>

                <div className="grid grid-cols-2 gap-2.5">
                  <a
                    href="tel:911"
                    className={
                      isBespoke
                        ? 'p-3 bg-neutral-950 hover:border-red-700 border border-neutral-800 rounded-md flex flex-col items-center justify-center text-red-300 font-mono font-semibold text-sm transition-colors duration-75'
                        : 'p-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 rounded-xl flex flex-col items-center justify-center text-red-200 font-bold text-sm active:scale-95 transition-all'
                    }
                  >
                    <span>911</span>
                    <span className="text-[10px] font-sans font-normal text-neutral-400">
                      Emergency
                    </span>
                  </a>
                  <a
                    href="tel:112"
                    className={
                      isBespoke
                        ? 'p-3 bg-neutral-950 hover:border-red-700 border border-neutral-800 rounded-md flex flex-col items-center justify-center text-red-300 font-mono font-semibold text-sm transition-colors duration-75'
                        : 'p-3 bg-red-950/40 hover:bg-red-900/60 border border-red-800/80 rounded-xl flex flex-col items-center justify-center text-red-200 font-bold text-sm active:scale-95 transition-all'
                    }
                  >
                    <span>112</span>
                    <span className="text-[10px] font-sans font-normal text-neutral-400">
                      Global SOS
                    </span>
                  </a>
                </div>

                <div>
                  <label className="text-xs text-neutral-400 block mb-1.5">
                    Custom ICE Contact:
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="tel"
                      value={emergencyNumber}
                      onChange={(e) => setEmergencyNumber(e.target.value)}
                      placeholder="e.g. +1 555-0199"
                      className={`flex-1 obsidian-input px-3 py-2 text-xs font-mono text-white outline-none ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    />
                    <a
                      href={`tel:${emergencyNumber}`}
                      className={`px-4 py-2 text-xs font-semibold flex items-center justify-center transition-colors duration-75 ${
                        isBespoke ? 'rounded-md font-sans' : 'rounded-xl font-mono font-bold'
                      } ${
                        emergencyNumber
                          ? 'bg-red-600 text-white'
                          : 'bg-neutral-900 text-neutral-500 pointer-events-none'
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
                className={
                  isBespoke
                    ? 'w-full py-2.5 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 text-xs rounded-md font-semibold transition-colors duration-75'
                    : 'w-full py-2.5 obsidian-inset-neutral hover:border-white/25 text-zinc-200 text-xs rounded-xl font-bold transition-colors'
                }
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
            accentOverride={
              isBespoke
                ? { hex: '#3B82F6', rgb: '59, 130, 246' }
                : { hex: activeTheme.hex, rgb: activeTheme.rgb }
            }
            ambientGlow
            className={`w-full max-w-sm text-left ${isBespoke ? 'font-sans' : 'font-mono'}`}
            headerClassName="p-5 space-y-3"
            footerClassName="p-4 flex flex-col gap-2"
            headerContent={
              <>
                <div
                  className={`flex items-center gap-2 font-semibold text-sm ${
                    isBespoke ? 'text-blue-500' : 'font-bold'
                  }`}
                  style={isBespoke ? undefined : { color: activeTheme.hex }}
                >
                  <AlertTriangle size={18} />
                  <span>USE EMERGENCY ESCAPE TICKET?</span>
                </div>

                <div className="space-y-3 text-xs text-neutral-300 leading-relaxed">
                  <p>
                    You are about to use 1 of your{' '}
                    <strong className="text-white font-mono tabular-nums">
                      {parachuteMetrics.currentBalance}
                    </strong>{' '}
                    Emergency Escape Tickets.
                  </p>
                  <div
                    style={
                      isBespoke
                        ? undefined
                        : {
                            backgroundColor: `rgba(${activeTheme.rgb}, 0.1)`,
                            border: `1px solid rgba(${activeTheme.rgb}, 0.36)`,
                            color: '#E4E4E7',
                          }
                    }
                    className={
                      isBespoke
                        ? 'p-3.5 bg-neutral-950 border border-neutral-800 rounded-md text-neutral-300 text-xs'
                        : 'p-3 rounded-xl text-[11px]'
                    }
                  >
                    <strong className={isBespoke ? 'text-neutral-100' : undefined}>
                      Strict Anti-Exploit Rule:
                    </strong>{' '}
                    All elapsed time in this session (
                    <span className="font-mono tabular-nums">
                      {Math.floor(activeLock.elapsedSeconds / 60)}m
                    </span>
                    ) will be <strong>permanently voided</strong> and will NOT count toward your next
                    20-hour milestone.
                  </div>
                  <p className="text-neutral-400 text-xs">
                    Are you sure you want to surrender this session?
                  </p>
                </div>
              </>
            }
            footerContent={
              <>
                <button
                  onClick={handleConfirmDeploy}
                  className={
                    isBespoke
                      ? 'w-full py-3 bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider rounded-md transition-colors duration-75'
                      : 'w-full py-3 font-black text-xs uppercase tracking-wider rounded-xl transition-all active:scale-95'
                  }
                  style={
                    isBespoke
                      ? undefined
                      : {
                          background: activeTheme.badgeGradient,
                          color: activeTheme.badgeText,
                        }
                  }
                >
                  Use Escape Ticket (-1 Balance)
                </button>
                <button
                  onClick={() => setShowParachuteConfirm(false)}
                  className={
                    isBespoke
                      ? 'w-full py-2.5 bg-neutral-950 hover:border-neutral-700 text-neutral-300 font-medium text-xs rounded-md border border-neutral-800 transition-colors duration-75'
                      : 'w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-white/15'
                  }
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
