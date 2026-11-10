import React, { useState, useEffect } from 'react';
import type { ActiveLockSession, ParachuteMetrics, OccasionBag } from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
import { ObsidianCard } from './ObsidianCard';
import {
  Phone,
  AlertTriangle,
  ShieldCheck,
  Battery,
  Wifi,
  Flame,
  Briefcase,
  MessageSquare,
} from 'lucide-react';

interface TheVoidViewProps {
  activeLock: ActiveLockSession;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  onDeployParachute: () => boolean;
}

export const TheVoidView: React.FC<TheVoidViewProps> = ({
  activeLock,
  parachuteMetrics,
  activeBag,
  onDeployParachute,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [batteryPct, setBatteryPct] = useState<number>(100);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showParachuteConfirm, setShowParachuteConfirm] = useState<boolean>(false);
  const [emergencyNumber, setEmergencyNumber] = useState<string>('');
  const [tamperWarning, setTamperWarning] = useState<string | null>(null);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    if (window.ZeroNative) {
      try {
        setBatteryPct(window.ZeroNative.getBatteryPercentage());
      } catch {
        // Ignore
      }
    } else if ('getBattery' in navigator) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigator as any).getBattery().then((battery: any) => {
        setBatteryPct(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryPct(Math.round(battery.level * 100));
        });
      }).catch(() => {});
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

  return (
    <div
      className="fixed inset-0 z-50 zero-app-shell flex flex-col justify-between items-center px-6 select-none overflow-hidden bg-dot-matrix"
      style={{
        paddingTop: 'calc(1.25rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1.25rem + var(--zero-safe-bottom))',
      }}
    >
      {/* Top Status Bar */}
      <div className="w-full max-w-md flex items-center justify-between text-xs font-mono text-zinc-300 pt-2 border-b border-zinc-900 pb-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-white tracking-wider">{currentTimeStr}</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] uppercase font-semibold text-zinc-300">VOID ACTIVE</span>
          </div>
          <div className="flex items-center gap-1.5 text-zinc-200">
            <Wifi size={13} />
            <div className="flex items-center gap-1">
              <Battery size={15} />
              <span>{batteryPct}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Anti-Tamper Banner */}
      {tamperWarning && (
        <div className="absolute top-16 left-6 right-6 max-w-md mx-auto bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono px-4 py-2.5 rounded-xl shadow-brutal-red flex items-center gap-2 animate-bounce">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{tamperWarning}</span>
        </div>
      )}

      {/* Center Void Countdown & Active Bag Status */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md text-center">
        <div className="relative mb-5">
          <div className="w-20 h-20 rounded-full obsidian-dial-bezel flex items-center justify-center relative">
            <div
              className="absolute inset-0 rounded-full animate-ping opacity-25"
              style={{ border: '1px solid var(--accent-hex, rgba(255,255,255,0.2))' }}
            />
            <span className="font-mono text-2xl font-black text-white">0</span>
          </div>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full obsidian-inset text-white font-mono text-xs uppercase tracking-wider mb-4 font-bold">
          <Flame size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
          <span>LOCKED IN #{activeLock.tag}</span>
        </div>

        <div className="font-mono text-5xl sm:text-6xl font-black tracking-tighter text-white mb-2 drop-shadow-[0_4px_24px_rgba(255,255,255,0.15)]">
          {formatCountdown(activeLock.remainingSeconds)}
        </div>

        <p className="text-xs font-mono text-zinc-300 tracking-wide max-w-xs mt-1">
          &ldquo;The obstacle is the way. Put your phone facedown.&rdquo;
        </p>

        {/* Active Bag Card */}
        <ObsidianCard
          ambientGlow
          className="mt-6 font-mono text-left"
          headerClassName="p-4 space-y-2.5"
          footerClassName="px-4 py-2 text-[10px] text-zinc-400 flex items-center justify-between gap-2"
          headerContent={
            <>
              <div className="flex items-center justify-between text-[11px] text-zinc-400">
                <span className="flex items-center gap-1.5 font-bold text-white">
                  <Briefcase size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} /> Bag: {activeBag.name}
                </span>
                <span className="px-1.5 py-0.5 rounded obsidian-inset-neutral text-zinc-300 text-[10px]">
                  {activeBag.apps.length}/{MAX_BAG_APPS} apps
                </span>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <a
                  href="tel:"
                  className="px-2.5 py-1.5 rounded-xl obsidian-inset-neutral text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                >
                  <Phone size={11} /> Phone Calls (Always ON)
                </a>
                {activeBag.allowSms && (
                  <a
                    href="sms:"
                    className="px-2.5 py-1.5 rounded-xl obsidian-inset-neutral text-emerald-300 text-[11px] font-bold flex items-center gap-1"
                  >
                    <MessageSquare size={11} /> Normal SMS
                  </a>
                )}
                {activeBag.apps.map((app) => (
                  <span
                    key={app.packageName}
                    className="px-2.5 py-1.5 rounded-xl obsidian-pill-active text-[11px] font-black"
                  >
                    {app.appName}
                  </span>
                ))}
                {!activeBag.allowSms && activeBag.apps.length === 0 && (
                  <span className="text-[11px] text-zinc-400 w-full mt-1">
                    Monk Mode Bag: Apps &amp; SMS sealed (Phone calls always allowed).
                  </span>
                )}
              </div>
            </>
          }
          footerContent={
            <>
              <span className="flex items-center gap-1.5 text-emerald-300 font-semibold">
                <ShieldCheck size={12} className="text-emerald-400" />
                <span>Strict Guard Active</span>
              </span>
              <span>Unbagged Apps Sealed</span>
            </>
          }
        />
      </div>

      {/* Bottom Actions */}
      <div className="w-full max-w-md flex flex-col gap-3 pb-4">
        {parachuteMetrics.currentBalance > 0 ? (
          <ObsidianCard
            asButton
            onClick={() => setShowParachuteConfirm(true)}
            accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
            ambientGlow
            className="font-mono"
            headerClassName="px-4 py-3 flex items-center justify-between gap-2"
            footerClassName="px-4 py-1.5 text-[10px] text-amber-200/80 flex items-center justify-between gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center text-base shrink-0">
                    🎫
                  </div>
                  <div className="text-left">
                    <div className="font-bold text-sm tracking-wide text-amber-200">
                      Use Emergency Escape Ticket
                    </div>
                    <div className="text-[11px] text-amber-300/85">
                      {parachuteMetrics.currentBalance} Available in Vault
                    </div>
                  </div>
                </div>
                <div className="text-xs uppercase font-black bg-amber-400 text-black px-2.5 py-1 rounded-lg shrink-0">
                  ESCAPE
                </div>
              </>
            }
            footerContent={
              <>
                <span>Consumes 1 ticket &amp; voids current session</span>
                <span className="text-amber-300 font-bold uppercase">Emergency Exit</span>
              </>
            }
          />
        ) : (
          <ObsidianCard
            className="font-mono text-xs"
            headerClassName="px-4 py-3 flex items-center justify-between gap-2"
            footerClassName="px-4 py-2 text-[10px] text-zinc-400 flex items-center justify-between gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2">
                  <span className="text-lg opacity-50">🎫</span>
                  <span className="font-semibold text-zinc-200">0 Escape Tickets Available</span>
                </div>
                <span className="px-2 py-0.5 rounded obsidian-inset-neutral text-[10px] text-zinc-400 font-bold">
                  LOCKED
                </span>
              </>
            }
            footerContent={
              <>
                <span>Earn 1 ticket every 20h completed focus</span>
                <span className="text-amber-300 font-bold">{parachuteMetrics.hoursUntilNextParachute}h left</span>
              </>
            }
          />
        )}

        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full h-12 obsidian-shell-bar active:scale-[0.98] border border-white/15 rounded-2xl flex items-center justify-center gap-2 font-mono text-xs text-zinc-200 hover:text-white transition-all"
        >
          <Phone size={14} className="text-red-400" />
          <span>Emergency Call (911 / 112 / ICE)</span>
        </button>
      </div>

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
                  <label className="text-[11px] text-zinc-400 block mb-1">Custom ICE Contact:</label>
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
                        emergencyNumber ? 'bg-red-500 text-white' : 'bg-zinc-800 text-zinc-500 pointer-events-none'
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

      {showParachuteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <ObsidianCard
            accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
            ambientGlow
            className="w-full max-w-sm font-mono text-left"
            headerClassName="p-5 space-y-3"
            footerClassName="p-4 flex flex-col gap-2"
            headerContent={
              <>
                <div className="flex items-center gap-2 text-amber-400 font-bold text-sm">
                  <AlertTriangle size={18} />
                  <span>USE EMERGENCY ESCAPE TICKET?</span>
                </div>

                <div className="space-y-3 text-xs text-zinc-300 leading-relaxed">
                  <p>
                    You are about to use 1 of your{' '}
                    <strong className="text-white">{parachuteMetrics.currentBalance}</strong> Emergency
                    Escape Tickets.
                  </p>
                  <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-amber-200 text-[11px]">
                    <strong>Strict Anti-Exploit Rule:</strong> All elapsed time in this session ({Math.floor(activeLock.elapsedSeconds / 60)}m) will be <strong>permanently voided</strong> and will NOT count toward your next 20-hour milestone.
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
                  className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all"
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
