import React, { useState, useEffect } from 'react';
import type { ActiveLockSession, ParachuteMetrics } from '../types';
import { Phone, AlertTriangle, ShieldCheck, RefreshCw, FastForward, Battery, Wifi, Flame } from 'lucide-react';

interface TheVoidViewProps {
  activeLock: ActiveLockSession;
  parachuteMetrics: ParachuteMetrics;
  onDeployParachute: () => boolean;
  onSimulateReboot: () => void;
  onFastForward: (seconds: number) => void;
}

export const TheVoidView: React.FC<TheVoidViewProps> = ({
  activeLock,
  parachuteMetrics,
  onDeployParachute,
  onSimulateReboot,
  onFastForward,
}) => {
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');
  const [batteryPct, setBatteryPct] = useState<number>(84);
  const [showEmergencyModal, setShowEmergencyModal] = useState<boolean>(false);
  const [showParachuteConfirm, setShowParachuteConfirm] = useState<boolean>(false);
  const [emergencyNumber, setEmergencyNumber] = useState<string>('');
  const [tamperWarning, setTamperWarning] = useState<string | null>(null);

  // Format countdown HH:MM:SS
  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const mins = Math.floor((totalSec % 3600) / 60);
    const secs = totalSec % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Live system clock & real Battery API if supported
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);

    // Battery API
    if ('getBattery' in navigator) {
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

  // Anti-escape keyboard interception (Escape, Backspace, Tab)
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
    <div className="fixed inset-0 z-50 bg-black text-white flex flex-col justify-between items-center p-6 select-none overflow-hidden bg-dot-matrix">
      {/* Top OS Status Bar Simulator */}
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

      {/* Anti-Tamper Notice Banner */}
      {tamperWarning && (
        <div className="absolute top-16 left-6 right-6 max-w-md mx-auto bg-red-950/90 border border-red-500 text-red-200 text-xs font-mono px-4 py-2.5 rounded-xl shadow-brutal-red flex items-center gap-2 animate-bounce">
          <AlertTriangle size={16} className="text-red-400 shrink-0" />
          <span>{tamperWarning}</span>
        </div>
      )}

      {/* Center Void Display: Focus Session Info & Giant Monospace Countdown */}
      <div className="flex flex-col items-center justify-center my-auto w-full max-w-md text-center">
        {/* Subtle pulsating void emblem */}
        <div className="relative mb-6">
          <div className="w-24 h-24 rounded-full border border-zinc-800 bg-zinc-950 flex items-center justify-center shadow-2xl relative">
            <div className="absolute inset-0 rounded-full border border-white/10 animate-ping opacity-25" />
            <span className="font-mono text-3xl font-black text-zinc-400">0</span>
          </div>
        </div>

        {/* Tag Pill */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300 font-mono text-xs uppercase tracking-wider mb-4 font-semibold">
          <Flame size={12} className="text-amber-400" />
          <span>LOCKED IN #{activeLock.tag}</span>
        </div>

        {/* Big Monospace Countdown Timer */}
        <div className="font-mono text-5xl sm:text-6xl font-black tracking-tighter text-white mb-2 drop-shadow-[0_4px_24px_rgba(255,255,255,0.15)]">
          {formatCountdown(activeLock.remainingSeconds)}
        </div>

        <p className="text-xs font-mono text-zinc-300 tracking-wide max-w-xs mt-1">
          "The obstacle is the way. Put your phone facedown."
        </p>

        {/* Anti-Tamper Watchdog Indicator & Debug Controls */}
        <div className="mt-8 flex flex-col items-center gap-2 w-full">
          <div className="flex items-center gap-1.5 text-[11px] font-mono text-zinc-300 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-850">
            <ShieldCheck size={14} className="text-emerald-400" />
            <span>Anti-Tamper Watchdog Armed</span>
          </div>

          {/* Interactive Simulation Pills (proves reboot persistence and testability) */}
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={onSimulateReboot}
              title="Simulates restarting phone or browser reload to test persistent lock recovery"
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono rounded-lg text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <RefreshCw size={12} />
              <span>Simulate Reboot</span>
            </button>
            <button
              onClick={() => onFastForward(600)}
              title="Fast-forward timer by 10 minutes for testing"
              className="px-2.5 py-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-[11px] font-mono rounded-lg text-zinc-200 flex items-center gap-1.5 transition-colors"
            >
              <FastForward size={12} />
              <span>Fast-Forward 10m</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Actions: Emergency Dial & Deploy Parachute */}
      <div className="w-full max-w-md flex flex-col gap-3 pb-4">
        {/* Parachute Unlock Button */}
        {parachuteMetrics.currentBalance > 0 ? (
          <button
            onClick={() => setShowParachuteConfirm(true)}
            className="w-full h-14 bg-amber-500/10 hover:bg-amber-500/20 active:scale-[0.98] border border-amber-500/50 rounded-2xl flex items-center justify-between px-4 font-mono transition-all shadow-brutal text-amber-200"
          >
            <div className="flex items-center gap-2.5">
              <span className="text-xl">🪂</span>
              <div className="text-left">
                <div className="font-bold text-sm tracking-wide">Deploy Emergency Parachute</div>
                <div className="text-[11px] text-amber-300/80">
                  {parachuteMetrics.currentBalance} Available (Consumes 1 & voids session)
                </div>
              </div>
            </div>
            <div className="text-xs uppercase font-extrabold bg-amber-500 text-black px-2.5 py-1 rounded-lg">
              UNLOCK
            </div>
          </button>
        ) : (
          <div className="w-full p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between text-zinc-300 font-mono text-xs">
            <div className="flex items-center gap-2">
              <span className="text-lg opacity-40">🪂</span>
              <div className="text-left">
                <span className="font-semibold text-zinc-300">0 Parachutes Available</span>
                <p className="text-[11px] text-zinc-400">
                  Earn 1 per 20h completed blockage ({parachuteMetrics.hoursUntilNextParachute}h left)
                </p>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded bg-zinc-900 text-[10px] text-zinc-400 font-bold border border-zinc-800">
              LOCKED
            </span>
          </div>
        )}

        {/* Emergency Call Button */}
        <button
          onClick={() => setShowEmergencyModal(true)}
          className="w-full h-12 bg-zinc-950 hover:bg-zinc-900 active:scale-[0.98] border border-zinc-800 rounded-2xl flex items-center justify-center gap-2 font-mono text-xs text-zinc-400 hover:text-zinc-200 transition-all"
        >
          <Phone size={14} className="text-red-400" />
          <span>Emergency Call (911 / 112 / ICE)</span>
        </button>
      </div>

      {/* Emergency Call Modal */}
      {showEmergencyModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border-2 border-zinc-700 rounded-2xl p-5 shadow-2xl font-mono text-left">
            <div className="flex items-center gap-2 text-red-400 font-bold text-sm mb-3">
              <Phone size={16} />
              <span>EMERGENCY CALL ENGINE</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Direct emergency lines are never restricted. Choose a line or dial below:
            </p>

            <div className="grid grid-cols-2 gap-2 mb-4">
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

            <div className="mb-4">
              <label className="text-[11px] text-zinc-400 block mb-1">Custom ICE Contact:</label>
              <div className="flex gap-2">
                <input
                  type="tel"
                  value={emergencyNumber}
                  onChange={(e) => setEmergencyNumber(e.target.value)}
                  placeholder="e.g. +1 555-0199"
                  className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
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

            <button
              onClick={() => setShowEmergencyModal(false)}
              className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 text-xs rounded-xl font-bold border border-zinc-800"
            >
              Return to The Void
            </button>
          </div>
        </div>
      )}

      {/* Parachute Deployment Confirmation Dialog */}
      {showParachuteConfirm && (
        <div className="fixed inset-0 z-60 bg-black/95 flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-zinc-950 border-2 border-amber-500/80 rounded-2xl p-6 shadow-brutal font-mono text-left">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-sm mb-3">
              <AlertTriangle size={18} />
              <span>DEPLOY EMERGENCY PARACHUTE?</span>
            </div>

            <div className="space-y-3 text-xs text-zinc-300 mb-5 leading-relaxed">
              <p>
                You are about to deploy 1 of your{' '}
                <strong className="text-white">{parachuteMetrics.currentBalance}</strong> earned Parachutes.
              </p>
              <div className="p-3 bg-amber-950/30 border border-amber-800/60 rounded-xl text-amber-200 text-[11px]">
                <strong>Strict Anti-Exploit Rule:</strong> All elapsed time in this session ({Math.floor(activeLock.elapsedSeconds / 60)}m) will be <strong>permanently voided</strong> and will NOT count toward your next 20-hour milestone.
              </div>
              <p className="text-zinc-400 text-[11px]">
                Are you sure you want to surrender this session?
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <button
                onClick={handleConfirmDeploy}
                className="w-full py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-black font-black text-xs uppercase tracking-wider rounded-xl transition-all"
              >
                Yes, Deploy Parachute (-1 Balance)
              </button>
              <button
                onClick={() => setShowParachuteConfirm(false)}
                className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-bold text-xs rounded-xl border border-zinc-800"
              >
                Cancel & Stay Focused
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
