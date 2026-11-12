import React, { useState } from 'react';
import type { ParachuteRewardEvent } from '../types';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { mixHexColors } from '../utils/themes';
import { haptics } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2, Ticket } from 'lucide-react';

interface ParachuteRewardAnimationProps {
  reward: ParachuteRewardEvent | null;
  onDismiss: () => void;
}

export const ParachuteRewardAnimation: React.FC<ParachuteRewardAnimationProps> = ({
  reward,
  onDismiss,
}) => {
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();
  const [tappedPulse, setTappedPulse] = useState(false);

  if (!reward) return null;

  const handleCardBoost = () => {
    haptics.milestoneChime();
    setTappedPulse(true);
    setTimeout(() => setTappedPulse(false), isBespoke ? 180 : 600);
    try {
      const liveAccent =
        (typeof document !== 'undefined'
          ? getComputedStyle(document.documentElement).getPropertyValue('--accent-hex').trim()
          : '') || '#FFFFFF';
      const confettiHex = liveAccent.startsWith('#') ? liveAccent : '#FFFFFF';
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.55 },
        colors: isLiquidGlass
          ? ['#FFFFFF', '#00F2FE', '#4FACFE']
          : isBespoke
          ? ['#FFFFFF', '#2563EB', '#3B82F6']
          : ['#FFFFFF', confettiHex, mixHexColors(confettiHex, '#FFFFFF', 0.38)],
      });
    } catch {
      // Ignore in headless environments
    }
  };

  const sourceBadge =
    reward.source === 'first_timer_profile'
      ? 'FIRST-TIMER GIFT'
      : reward.source === 'first_donation_50'
      ? 'MIN ₹50 SUPPORTER BONUS'
      : '20-HOUR MILESTONE';

  const shimmerOverlay = (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 -translate-x-full animate-parachute-shimmer"
      style={{
        background:
          'linear-gradient(90deg, transparent, rgba(var(--accent-rgb, 255, 255, 255), 0.16), transparent)',
      }}
    />
  );

  if (isLiquidGlass) {
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm flex items-center justify-center px-4"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-label="Escape Ticket Unlocked Celebration"
      >
        <ObsidianCard
          ambientGlow
          onClick={(e) => e?.stopPropagation()}
          className={`w-full max-w-sm font-sans animate-parachute-card-pop transition-transform ${
            tappedPulse ? 'scale-[1.02]' : ''
          }`}
          headerClassName="p-6 pb-5 text-center space-y-5 relative"
          footerClassName="p-4 space-y-3"
          headerContent={
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="absolute top-3.5 right-3.5 p-1.5 rounded-xl liquid-pill text-zinc-400 hover:text-white z-10"
                aria-label="Close Escape Ticket Celebration"
              >
                <X size={15} strokeWidth={1.75} />
              </button>

              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-400/15 border border-cyan-300/35 text-cyan-200 text-[10px] font-semibold uppercase tracking-widest">
                  <Sparkles size={12} strokeWidth={1.75} />
                  <span>{sourceBadge}</span>
                </span>
              </div>

              <div className="relative h-32 flex items-center justify-center">
                <div
                  aria-hidden="true"
                  className="absolute w-28 h-28 rounded-full border border-cyan-300/30 animate-ring-burst"
                />
                <div
                  aria-hidden="true"
                  className="absolute w-24 h-24 rounded-full blur-xl bg-cyan-400/15"
                />
                <button
                  type="button"
                  onClick={handleCardBoost}
                  title="Tap to celebrate!"
                  className="relative z-10 w-24 h-24 rounded-3xl liquid-inset flex items-center justify-center animate-parachute-descend liquid-spring cursor-pointer"
                >
                  <Ticket size={40} strokeWidth={1.75} className="text-cyan-200 animate-parachute-float" />
                  <span className="absolute -top-2.5 -right-2.5 px-2.5 py-0.5 rounded-full liquid-pill-active text-[11px] font-semibold tabular-nums">
                    +{reward.delta}
                  </span>
                </button>
              </div>

              <div className="space-y-1.5 relative z-10">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  {reward.title}
                </h2>
                {reward.source === 'first_donation_50' && (
                  <div className="flex justify-center pt-1">
                    <ZeroSupporterGoldenBadge />
                  </div>
                )}
                <p className="text-xs text-zinc-300 leading-relaxed">
                  {reward.subtitle}
                </p>
              </div>
            </>
          }
          footerContent={
            <>
              <div className="liquid-row rounded-2xl p-3.5 flex items-center justify-between gap-2">
                <div className="text-left">
                  <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-medium">
                    Escape Ticket Balance
                  </div>
                  <div className="text-xl font-semibold flex items-center gap-1.5 mt-0.5">
                    <span className="liquid-metric">{reward.newBalance}</span>
                    <span className="text-xs font-normal text-zinc-400">Ready</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] font-medium bg-cyan-400/15 border border-cyan-300/35 text-cyan-200 px-2.5 py-1 rounded-xl shrink-0">
                  <CheckCircle2 size={13} strokeWidth={1.75} />
                  <span>Added to Vault</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="w-full py-3 rounded-2xl liquid-pill-active font-semibold text-xs uppercase tracking-wider"
              >
                Awesome • Back to Focus
              </button>
            </>
          }
        />
      </div>
    );
  }

  if (isBespoke) {
    return (
      <div
        className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center px-4"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
        onClick={onDismiss}
        role="dialog"
        aria-modal="true"
        aria-label="Escape Ticket Unlocked Celebration"
      >
        <ObsidianCard
          onClick={(e) => e?.stopPropagation()}
          className="w-full max-w-sm font-sans"
          headerClassName="p-6 text-center space-y-5 relative"
          footerClassName="p-5 space-y-3"
          headerContent={
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="absolute top-4 right-4 p-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors duration-75 z-10"
                aria-label="Close Escape Ticket Celebration"
              >
                <X size={15} />
              </button>

              <div className="flex justify-center">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-sm bg-neutral-950 border border-blue-500/60 text-blue-400 font-mono text-[10px] font-semibold uppercase tracking-widest">
                  <Sparkles size={11} />
                  <span>{sourceBadge}</span>
                </span>
              </div>

              <div className="flex items-center justify-center py-2">
                <button
                  type="button"
                  onClick={handleCardBoost}
                  title="Tap to acknowledge"
                  className={`relative w-20 h-20 rounded-md bg-neutral-950 border flex items-center justify-center transition-colors duration-75 cursor-pointer ${
                    tappedPulse ? 'border-blue-400' : 'border-neutral-800 hover:border-blue-500'
                  }`}
                >
                  <Ticket size={34} className="text-blue-500" />
                  <span className="absolute -top-2 -right-2 px-2 py-0.5 rounded-sm bg-blue-600 border border-blue-400 text-white font-mono tabular-nums text-[11px] font-semibold">
                    +{reward.delta}
                  </span>
                </button>
              </div>

              <div className="space-y-1.5">
                <h2 className="text-lg font-semibold text-white tracking-tight">
                  {reward.title}
                </h2>
                {reward.source === 'first_donation_50' && (
                  <div className="flex justify-center pt-1">
                    <ZeroSupporterGoldenBadge />
                  </div>
                )}
                <p className="text-xs text-neutral-300 leading-relaxed">
                  {reward.subtitle}
                </p>
              </div>
            </>
          }
          footerContent={
            <>
              <div className="bg-neutral-950 border border-neutral-800 rounded-md p-4 flex items-center justify-between gap-2">
                <div className="text-left">
                  <div className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
                    Escape Ticket Balance
                  </div>
                  <div className="font-mono tabular-nums text-xl font-bold text-blue-400 flex items-center gap-1.5 mt-0.5">
                    <span>{reward.newBalance}</span>
                    <span className="font-sans text-xs font-normal text-neutral-400">Ready</span>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 text-blue-400 font-mono text-[10px] font-semibold uppercase bg-black border border-blue-500/40 px-2.5 py-1 rounded-sm shrink-0">
                  <CheckCircle2 size={12} />
                  <span>Added to Vault</span>
                </div>
              </div>

              <button
                type="button"
                onClick={onDismiss}
                className="w-full py-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider transition-colors duration-75"
              >
                Awesome • Back to Focus
              </button>
            </>
          }
        />
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/90 backdrop-blur-sm flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
      onClick={onDismiss}
      role="dialog"
      aria-modal="true"
      aria-label="Escape Ticket Unlocked Celebration"
    >
      <ObsidianCard
        ambientGlow
        overlays={shimmerOverlay}
        onClick={(e) => e?.stopPropagation()}
        className={`w-full max-w-sm font-mono animate-parachute-card-pop transition-transform ${
          tappedPulse ? 'scale-[1.03]' : ''
        }`}
        headerClassName="p-6 pb-5 text-center space-y-5 relative"
        footerClassName="p-4 space-y-3"
        headerContent={
          <>
            <button
              type="button"
              onClick={onDismiss}
              className="absolute top-3.5 right-3.5 p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white z-10"
              aria-label="Close Escape Ticket Celebration"
            >
              <X size={15} />
            </button>

            {/* Source Badge */}
            <div className="flex justify-center">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full obsidian-pill-active text-[10px] font-black uppercase tracking-widest">
                <Sparkles size={12} />
                <span>{sourceBadge}</span>
              </span>
            </div>

            {/* Descending + Floating Escape Ticket Graphic with Expanding Halo Rings */}
            <div className="relative h-32 flex items-center justify-center">
              <div
                aria-hidden="true"
                className="absolute w-28 h-28 rounded-full border animate-ring-burst"
                style={{ borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.42)' }}
              />
              <div
                aria-hidden="true"
                className="absolute w-24 h-24 rounded-full blur-xl"
                style={{ backgroundColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.16)' }}
              />
              <button
                type="button"
                onClick={handleCardBoost}
                title="Tap to celebrate!"
                className="relative z-10 w-24 h-24 rounded-3xl obsidian-icon-box flex items-center justify-center animate-parachute-descend active:scale-95 transition-transform cursor-pointer"
              >
                <span className="text-5xl animate-parachute-float select-none" aria-hidden="true">
                  🎫
                </span>
                <span className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full obsidian-pill-active text-[11px] font-black shadow-md">
                  +{reward.delta}
                </span>
              </button>
            </div>

            {/* Title & Explanation */}
            <div className="space-y-1.5 relative z-10">
              <h2 className="text-lg font-black text-white tracking-tight">
                {reward.title}
              </h2>
              {reward.source === 'first_donation_50' && (
                <div className="flex justify-center pt-1">
                  <ZeroSupporterGoldenBadge />
                </div>
              )}
              <p className="text-xs text-zinc-300 leading-relaxed">
                {reward.subtitle}
              </p>
            </div>
          </>
        }
        footerContent={
          <>
            <div className="obsidian-inset-neutral rounded-2xl p-3 flex items-center justify-between">
              <div className="text-left">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400">
                  Escape Ticket Balance
                </div>
                <div
                  className="text-xl font-black flex items-center gap-1.5"
                  style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                >
                  <span>{reward.newBalance}</span>
                  <span className="text-xs font-normal text-zinc-400">Ready</span>
                </div>
              </div>
              <div
                className="flex items-center gap-1 text-[11px] font-bold border px-2.5 py-1 rounded-xl"
                style={{
                  background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                  borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.4)',
                  color: 'var(--accent-hex, #FFFFFF)',
                }}
              >
                <CheckCircle2 size={13} />
                <span>Added to Vault</span>
              </div>
            </div>

            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-3 rounded-2xl obsidian-pill-active font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Awesome • Back to Focus
            </button>
          </>
        }
      />
    </div>
  );
};
