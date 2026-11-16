import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ActiveLockSession, ParachuteMetrics, OccasionBag, ZeroProfile } from '../types';
import { resolveAppBrandVisual } from '../utils/appBrandColors';
import { voidAudio } from '../utils/voidAudio';
import { haptics } from '../utils/haptics';
import { AmbientBackground } from '../components/AmbientBackground';
import {
  Phone,
  CreditCard,
  QrCode,
  ExternalLink,
  X,
  AlertTriangle,
  Play,
  Pause,
  Headphones,
  MessageSquare,
} from 'lucide-react';

interface AetherialVoidViewProps {
  activeLock: ActiveLockSession;
  parachuteMetrics: ParachuteMetrics;
  activeBag: OccasionBag;
  profile?: ZeroProfile | null;
  onDeployParachute: () => boolean;
}

interface PaymentAppOption {
  packageName: string;
  appName: string;
}

const DEFAULT_PAYMENT_APPS: PaymentAppOption[] = [
  { packageName: 'com.samsung.android.spay', appName: 'Samsung Wallet' },
  { packageName: 'com.navi.finance', appName: 'Navi UPI' },
  { packageName: 'net.one97.paytm', appName: 'Paytm' },
  { packageName: 'com.google.android.apps.nbu.paisa.user', appName: 'Google Pay' },
  { packageName: 'com.phonepe.app', appName: 'PhonePe' },
  { packageName: 'com.dreamplug.androidapp', appName: 'CRED' },
  { packageName: 'in.org.npci.upiapp', appName: 'BHIM UPI' },
];

export const AetherialVoidView: React.FC<AetherialVoidViewProps> = ({
  activeLock,
  parachuteMetrics,
  activeBag,
  profile: _profile,
  onDeployParachute,
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [showBreakConfirm, setShowBreakConfirm] = useState(false);
  const [breakReason, setBreakReason] = useState('');
  const [installedPaymentApps, setInstalledPaymentApps] = useState<PaymentAppOption[]>([]);
  const hasPlayedZenChimeRef = useRef(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.ZeroNative?.getInstalledPaymentAppsJson) {
      try {
        const raw = window.ZeroNative.getInstalledPaymentAppsJson();
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setInstalledPaymentApps(parsed);
          }
        }
      } catch (err) {
        console.warn('Failed to parse installed payment apps', err);
      }
    }
  }, []);

  // Completion chime
  useEffect(() => {
    if (activeLock.remainingSeconds <= 0 && !hasPlayedZenChimeRef.current) {
      hasPlayedZenChimeRef.current = true;
      voidAudio.playZenBowl();
    }
  }, [activeLock.remainingSeconds]);

  const handleToggleAudio = () => {
    haptics.tick(700);
    if (isPlayingAudio) {
      voidAudio.stop();
      setIsPlayingAudio(false);
    } else {
      voidAudio.play('gamma40');
      setIsPlayingAudio(true);
    }
  };

  const handleOpenDialer = () => {
    haptics.tick(700);
    if (typeof window !== 'undefined' && window.ZeroNative?.launchDialerApp) {
      const launched = window.ZeroNative.launchDialerApp();
      if (launched) return;
    }
    window.location.href = 'tel:';
  };

  const handleOpenPaymentApp = (packageName?: string) => {
    haptics.thud();
    setShowPaymentModal(false);
    if (typeof window !== 'undefined' && window.ZeroNative?.launchPaymentApp) {
      const targetPkg = packageName || '';
      const launched = window.ZeroNative.launchPaymentApp(targetPkg);
      if (launched) return;
    }
    if (packageName && !packageName.startsWith('upi:')) {
      window.location.href = `intent:#Intent;package=${packageName};end`;
    } else {
      window.location.href = 'upi://pay';
    }
  };

  const handleLaunchBagApp = (packageName: string) => {
    haptics.thud();
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchBagApp) {
      const launched = (window.ZeroNative as any).launchBagApp(packageName);
      if (launched) return;
    }
    window.location.href = `intent:#Intent;package=${packageName};end`;
  };

  const handleConfirmBreak = () => {
    if (!breakReason.trim()) return;
    haptics.parachuteDeploy();
    setShowBreakConfirm(false);
    setBreakReason('');
    onDeployParachute();
  };

  const perimeter = 741.4;
  const progressFraction =
    activeLock.durationSeconds > 0
      ? Math.max(0, Math.min(1, activeLock.remainingSeconds / activeLock.durationSeconds))
      : 0;
  const strokeOffset = perimeter - progressFraction * perimeter;

  const formatTime = (totalSec: number) => {
    const s = Math.max(0, Math.floor(totalSec));
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return {
      m: mins.toString().padStart(2, '0'),
      s: secs.toString().padStart(2, '0'),
    };
  };

  const timeDisplay = formatTime(activeLock.remainingSeconds);
  const elapsedMins = Math.floor(activeLock.elapsedSeconds / 60);

  const targetTimeStr = useMemo(() => {
    const finish = new Date(Date.now() + activeLock.remainingSeconds * 1000);
    const rawH = finish.getHours();
    const suf = rawH >= 12 ? 'PM' : 'AM';
    const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
    const m = finish.getMinutes().toString().padStart(2, '0');
    return `${h12}:${m} ${suf}`;
  }, [activeLock.remainingSeconds]);

  const paymentOptions = useMemo(() => {
    if (installedPaymentApps.length > 0) return installedPaymentApps;
    return DEFAULT_PAYMENT_APPS;
  }, [installedPaymentApps]);

  const visibleBagApps = (activeBag?.apps || []).slice(0, 3);

  return (
    <div
      data-void-terminal="true"
      className="fixed inset-0 z-50 flex flex-col justify-between overflow-x-hidden overflow-y-auto select-none px-4 py-3 sm:px-6 bg-[#11131b] text-[#e2e1ed] font-sans"
      style={{
        paddingTop: 'calc(0.75rem + var(--zero-safe-top))',
        paddingBottom: 'calc(0.75rem + var(--zero-safe-bottom))',
      }}
    >
      {/* Minimal Living 2-Corner Ambient Mesh Background */}
      <AmbientBackground />

      {/* Header */}
      <header className="relative z-10 w-full flex items-center justify-between pb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-bold tracking-tight text-[#c4e7ff]">ZERO-NOISE</span>
          <span className="text-[10px] text-[#bdc8d1] uppercase px-2 py-0.5 rounded-full bg-[#282a32]/60 font-semibold tracking-wide">
            FOCUS SESSION
          </span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#1d1f28]/60 backdrop-blur-md border border-white/5">
          <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
          <span className="text-[11px] text-[#4edea3] font-semibold">Active Session</span>
        </div>
      </header>

      {/* Main Focus Core */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center space-y-4 my-auto">
        {/* Mission Tag */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#282a32]/60 backdrop-blur-xl border border-white/5 shadow-sm">
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="text-[11px] font-semibold text-[#e2e1ed] tracking-wider uppercase">
            #{activeLock.tag || activeBag.name || 'DEEP FOCUS'}
          </span>
          <span className="text-[#3e484f] text-[11px]">·</span>
          <span className="text-[11px] text-[#c4e7ff]">Shielded Perimeter</span>
        </div>

        {/* Giant Circular Arc Progress Hub */}
        <div className="relative w-[280px] h-[280px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 280 280">
            {/* Background Track */}
            <circle
              className="text-[#33343d]/40"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="currentColor"
              strokeWidth="7"
            />
            {/* Active Glow */}
            <circle
              className="opacity-25 blur-sm"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="#38bdf8"
              strokeDasharray="741.4"
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              strokeWidth="12"
            />
            {/* Foreground Arc */}
            <circle
              className="transition-all duration-1000 ease-out"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="url(#voidTimerGrad)"
              strokeDasharray="741.4"
              strokeDashoffset={strokeOffset}
              strokeLinecap="round"
              strokeWidth="7"
            />
            <defs>
              <linearGradient id="voidTimerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="70%" stopColor="#7bd0ff" />
                <stop offset="100%" stopColor="#4edea3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Digital Timer */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] shadow-[0_0_16px_#38bdf8] mb-1.5 animate-ping opacity-75" />
            <div className="flex items-baseline justify-center tracking-tight text-[#e2e1ed]">
              <span className="text-5xl sm:text-6xl font-light drop-shadow-[0_0_24px_rgba(56,189,248,0.25)] tabular-nums">
                {timeDisplay.m}
              </span>
              <span className="text-5xl sm:text-6xl font-extralight text-[#38bdf8] animate-pulse px-0.5">
                :
              </span>
              <span className="text-5xl sm:text-6xl font-light drop-shadow-[0_0_24px_rgba(56,189,248,0.25)] tabular-nums">
                {timeDisplay.s}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-[#0c0e16]/60 backdrop-blur-md border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
              <span className="text-[11px] text-[#bdc8d1] font-medium">
                Target {targetTimeStr} · {elapsedMins}m elapsed
              </span>
            </div>
          </div>
        </div>

        {/* Ambient Sound Card */}
        <div className="w-full max-w-sm flex items-center justify-between p-3 rounded-2xl bg-[#191b24]/70 backdrop-blur-xl border border-white/5 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#38bdf8]/15 flex items-center justify-center text-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.15)] shrink-0">
              <Headphones size={18} />
            </div>
            <div>
              <div className="text-xs font-semibold text-[#e2e1ed]">Binaural Alpha Waves (40Hz)</div>
              <div className="text-[10px] text-[#bdc8d1]">Deep Cognitive Synchronization</div>
            </div>
          </div>
          <button
            type="button"
            onClick={handleToggleAudio}
            className="w-8 h-8 rounded-full bg-[#282a32] flex items-center justify-center text-[#e2e1ed] hover:text-[#38bdf8] transition-colors active:scale-95 cursor-pointer"
          >
            {isPlayingAudio ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
          </button>
        </div>
      </main>

      {/* Floating Bottom Allowed Apps Dock (Includes Phone & Pay) */}
      <footer className="relative z-10 w-full max-w-md mx-auto pt-2 space-y-2">
        <div className="w-full rounded-[22px] p-2 bg-[#191b24]/90 backdrop-blur-xl border border-white/10 shadow-2xl flex items-center justify-around gap-2">
          {/* 1. Compulsory Phone / Caller */}
          <button
            type="button"
            onClick={handleOpenDialer}
            aria-label="Open Phone Dialer"
            className="flex flex-col items-center gap-1 p-1 rounded-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-[#16A34A] text-white border border-[#4edea3]/40">
              <Phone size={20} strokeWidth={2.2} />
            </div>
            <span className="text-[10px] font-medium text-[#bdc8d1]">Phone</span>
          </button>

          {/* 2. Permitted Bag Apps */}
          {visibleBagApps.map((app) => {
            const brand = resolveAppBrandVisual(app);
            return (
              <button
                key={app.packageName}
                type="button"
                onClick={() => handleLaunchBagApp(app.packageName)}
                className="flex flex-col items-center gap-1 p-1 rounded-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-transform"
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-bold shadow-md select-none"
                  style={{
                    backgroundColor: brand.bgColor,
                    color: brand.textColor,
                    border: `1px solid ${brand.borderColor}`,
                  }}
                >
                  {brand.initial}
                </div>
                <span className="text-[10px] font-medium text-[#bdc8d1] max-w-[54px] truncate text-center">
                  {app.appName}
                </span>
              </button>
            );
          })}

          {/* 3. SMS if allowed */}
          {activeBag.allowSms && (
            <button
              type="button"
              onClick={() => (window.location.href = 'sms:')}
              className="flex flex-col items-center gap-1 p-1 rounded-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-transform"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-[#0284C7] text-white border border-[#38bdf8]/40 shadow-md">
                <MessageSquare size={18} strokeWidth={2} />
              </div>
              <span className="text-[10px] font-medium text-[#bdc8d1]">SMS</span>
            </button>
          )}

          {/* 4. Compulsory Pay / UPI */}
          <button
            type="button"
            onClick={() => {
              haptics.tick(700);
              setShowPaymentModal(true);
            }}
            aria-label="Open Payment or UPI Apps"
            className="flex flex-col items-center gap-1 p-1 rounded-xl hover:scale-105 active:scale-95 cursor-pointer shrink-0 transition-transform"
          >
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-md bg-gradient-to-br from-[#00a572] to-[#005236] text-white border border-[#4edea3]/40">
              <CreditCard size={20} strokeWidth={2.2} />
            </div>
            <span className="text-[10px] font-medium text-[#4edea3]">Pay</span>
          </button>
        </div>

        {/* Action Controls: Emergency Dial & Escape */}
        <div className="grid grid-cols-2 gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              haptics.thud();
              setShowEmergencyModal(true);
            }}
            className="py-3 px-4 rounded-xl bg-[#282a32]/80 hover:bg-[#33343d] text-xs font-semibold text-[#bdc8d1] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/5 active:scale-95"
          >
            <Phone size={14} className="text-[#ffb4ab]" />
            <span>Emergency Call</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.thud();
              setShowBreakConfirm(true);
            }}
            className="py-3 px-4 rounded-xl bg-[#282a32]/80 hover:bg-[#33343d] text-xs font-semibold text-[#bdc8d1] hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2 border border-white/5 active:scale-95"
          >
            <AlertTriangle size={14} className="text-[#fbbf24]" />
            <span>Escape ({parachuteMetrics.currentBalance})</span>
          </button>
        </div>
      </footer>

      {/* QUICK PAYMENT & UPI MODAL */}
      {showPaymentModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
        >
          <div className="relative w-full max-w-sm rounded-[28px] bg-[#191b24] p-5 shadow-2xl border border-white/10 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-[#00a572]/20 flex items-center justify-center text-[#4edea3] border border-[#00a572]/30">
                  <CreditCard size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white tracking-wide">Quick Pay &amp; UPI</h3>
                  <p className="text-[10px] text-[#bdc8d1]">Real-world transactions unlocked</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPaymentModal(false)}
                className="w-7 h-7 rounded-full bg-[#282a32] flex items-center justify-center text-[#bdc8d1] hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#bdc8d1] leading-relaxed">
              Pay at stores, scan merchant QR codes, or access Samsung Wallet &amp; UPI apps without breaking your focus lock.
            </p>

            {/* Universal Scan & Pay */}
            <button
              type="button"
              onClick={() => handleOpenPaymentApp('')}
              className="w-full flex items-center justify-between p-3 rounded-2xl bg-gradient-to-r from-[#00a572] to-[#005236] text-white font-medium text-xs shadow-lg transition-transform active:scale-95 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white">
                  <QrCode size={18} />
                </div>
                <div className="text-left">
                  <div className="font-bold text-sm">Scan &amp; Pay (Any UPI)</div>
                  <div className="text-[10px] text-[#4edea3]">Launches universal UPI scanner</div>
                </div>
              </div>
              <ExternalLink size={16} className="text-[#4edea3]" />
            </button>

            {/* Apps Grid */}
            <div className="space-y-1.5 pt-1">
              <div className="text-[10px] font-semibold text-[#87929a] uppercase tracking-wider">
                Direct App Launch
              </div>
              <div className="grid grid-cols-2 gap-2 max-h-52 overflow-y-auto pr-0.5 no-scrollbar">
                {paymentOptions.map((opt) => {
                  const brand = resolveAppBrandVisual({ appName: opt.appName, packageName: opt.packageName });
                  return (
                    <button
                      key={opt.packageName}
                      type="button"
                      onClick={() => handleOpenPaymentApp(opt.packageName)}
                      className="flex items-center gap-2 p-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-left transition-colors cursor-pointer active:scale-95"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold shrink-0 shadow-sm"
                        style={{
                          backgroundColor: brand.bgColor,
                          color: brand.textColor,
                          border: `1px solid ${brand.borderColor}`,
                        }}
                      >
                        {brand.initial}
                      </div>
                      <div className="truncate">
                        <div className="text-xs font-medium text-[#e2e1ed] truncate">{opt.appName}</div>
                        <div className="text-[9px] text-[#87929a]">Open App</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPaymentModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#282a32] text-[#bdc8d1] font-semibold text-xs hover:text-white cursor-pointer"
            >
              Back to Void
            </button>
          </div>
        </div>
      )}

      {/* Emergency Dial Modal */}
      {showEmergencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
        >
          <div className="relative w-full max-w-sm rounded-[24px] bg-[#191b24] p-5 shadow-2xl border border-white/10 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Phone size={16} className="text-[#ffb4ab]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Emergency Protocol
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowEmergencyModal(false)}
                className="w-7 h-7 rounded-full bg-[#282a32] flex items-center justify-center text-[#bdc8d1] hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#bdc8d1] leading-relaxed">
              If you face an urgent situation, initiate a call immediately:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => (window.location.href = 'tel:911')}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Call 911
              </button>
              <button
                type="button"
                onClick={() => (window.location.href = 'tel:112')}
                className="py-2.5 px-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs uppercase tracking-wider cursor-pointer"
              >
                Call 112
              </button>
            </div>

            <button
              type="button"
              onClick={() => setShowEmergencyModal(false)}
              className="w-full py-2.5 rounded-xl bg-[#282a32] text-[#bdc8d1] text-xs font-semibold hover:text-white cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Emergency Escape Break Confirmation Modal */}
      {showBreakConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
        >
          <div className="relative w-full max-w-sm rounded-[24px] bg-[#191b24] p-5 shadow-2xl border border-white/10 space-y-4 font-sans select-none">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle size={16} className="text-[#fbbf24]" />
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Emergency Escape Ticket
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowBreakConfirm(false)}
                className="w-7 h-7 rounded-full bg-[#282a32] flex items-center justify-center text-[#bdc8d1] hover:text-white cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>

            <p className="text-xs text-[#bdc8d1] leading-relaxed">
              You are about to use 1 of your{' '}
              <strong className="text-white">{parachuteMetrics.currentBalance}</strong> Emergency Escape Tickets.
            </p>

            <div className="p-3 rounded-xl bg-[#fbbf24]/10 border border-[#fbbf24]/30 text-xs text-[#bdc8d1]">
              <strong className="text-[#fbbf24] block mb-1">Anti-Exploit Rule:</strong>
              Elapsed session time ({elapsedMins}m) will be voided and will NOT count toward your 35-hour milestone.
            </div>

            <div className="space-y-1.5 pt-1">
              <label className="text-[11px] font-semibold text-[#fbbf24] uppercase tracking-wider block">
                Why am I breaking this session?
              </label>
              <textarea
                rows={2}
                placeholder="Type your reflection to stay conscious..."
                value={breakReason}
                onChange={(e) => setBreakReason(e.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-[#282a32] text-xs text-white placeholder-[#87929a] outline-none focus:ring-1 focus:ring-[#fbbf24] resize-none"
                autoFocus
              />
            </div>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={!breakReason.trim()}
                onClick={handleConfirmBreak}
                className="w-full py-3 rounded-xl bg-[#fbbf24] hover:bg-amber-400 disabled:opacity-40 text-black font-bold text-xs uppercase tracking-wider transition-all cursor-pointer active:scale-95 shadow-md"
              >
                Confirm Break &amp; Deploy (-1 Ticket)
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowBreakConfirm(false);
                  setBreakReason('');
                }}
                className="w-full py-2.5 rounded-xl bg-[#282a32] text-[#bdc8d1] text-xs font-semibold hover:text-white cursor-pointer"
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
