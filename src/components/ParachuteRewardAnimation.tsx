import React, { useState } from 'react';
import type { ParachuteRewardEvent } from '../types';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import { haptics } from '../utils/haptics';
import confetti from 'canvas-confetti';
import { Sparkles, X, CheckCircle2 } from 'lucide-react';

interface ParachuteRewardAnimationProps {
  reward: ParachuteRewardEvent | null;
  onDismiss: () => void;
}

export const ParachuteRewardAnimation: React.FC<ParachuteRewardAnimationProps> = ({
  reward,
  onDismiss,
}) => {
  const [tappedPulse, setTappedPulse] = useState(false);

  if (!reward) return null;

  const handleCardBoost = () => {
    haptics.milestoneChime();
    setTappedPulse(true);
    setTimeout(() => setTappedPulse(false), 600);
    try {
      confetti({
        particleCount: 70,
        spread: 65,
        origin: { y: 0.55 },
        colors: ['#FFFFFF', '#F59E0B', '#10B981'],
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
      className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/15 to-transparent animate-parachute-shimmer"
    />
  );

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
        accent="Amber"
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
                className="absolute w-28 h-28 rounded-full border border-amber-400/40 animate-ring-burst"
              />
              <div
                aria-hidden="true"
                className="absolute w-24 h-24 rounded-full bg-amber-500/15 blur-xl"
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
                <span className="absolute -top-2.5 -right-2.5 px-2 py-0.5 rounded-full bg-emerald-400 text-black text-[11px] font-black shadow-md border border-black">
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
                <div className="text-xl font-black text-amber-300 flex items-center gap-1.5">
                  <span>{reward.newBalance}</span>
                  <span className="text-xs font-normal text-zinc-400">Ready</span>
                </div>
              </div>
              <div className="flex items-center gap-1 text-emerald-400 text-[11px] font-bold bg-emerald-950/70 border border-emerald-700/60 px-2.5 py-1 rounded-xl">
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
