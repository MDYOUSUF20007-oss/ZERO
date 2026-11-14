import React, { useEffect, useState } from 'react';
import { Sparkles, ArrowRight } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface IntentionRitualModalProps {
  tag: string;
  durationFormatted: string;
  onComplete: () => void;
  onSkip: () => void;
}

export const IntentionRitualModal: React.FC<IntentionRitualModalProps> = ({
  tag,
  durationFormatted,
  onComplete,
  onSkip,
}) => {
  const [phase, setPhase] = useState<'inhale' | 'exhale'>('inhale');
  const [countdown, setCountdown] = useState<number>(5);

  useEffect(() => {
    haptics.tick(900);

    const inhaleTimer = setTimeout(() => {
      setPhase('exhale');
      haptics.tick(700);
    }, 2500);

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          haptics.lockEngaged();
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearTimeout(inhaleTimer);
      clearInterval(interval);
    };
  }, [onComplete]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-black/95 backdrop-blur-2xl animate-fadeIn select-none"
    >
      {/* Ambient background glow */}
      <div
        aria-hidden="true"
        className="absolute w-80 h-80 rounded-full pointer-events-none blur-3xl opacity-40 transition-transform duration-1000"
        style={{
          background: 'radial-gradient(circle, var(--accent-primary, #38bdf8) 0%, transparent 70%)',
          transform: phase === 'inhale' ? 'scale(1.2)' : 'scale(0.85)',
        }}
      />

      <div className="relative z-10 flex flex-col items-center text-center max-w-sm w-full">
        {/* Breathing Halo Ring */}
        <div className="relative w-44 h-44 flex items-center justify-center my-6">
          {/* Outer Pulsing Ring */}
          <div
            className="absolute inset-0 rounded-full border-2 border-white/20 transition-all duration-[2400ms] ease-in-out"
            style={{
              borderColor: 'var(--accent-primary, #38bdf8)',
              transform: phase === 'inhale' ? 'scale(1.15)' : 'scale(0.85)',
              opacity: phase === 'inhale' ? 0.9 : 0.35,
              boxShadow:
                phase === 'inhale'
                  ? '0 0 45px var(--accent-primary, rgba(56,189,248,0.5))'
                  : '0 0 15px transparent',
            }}
          />

          {/* Core Breathing Orb */}
          <div
            className="w-28 h-28 rounded-full liquid-glass flex flex-col items-center justify-center transition-all duration-[2400ms] ease-in-out"
            style={{
              transform: phase === 'inhale' ? 'scale(1.08)' : 'scale(0.92)',
              boxShadow: 'inset 0 0 25px rgba(255,255,255,0.15)',
            }}
          >
            <Sparkles size={20} className="theme-text-accent mb-1 animate-pulse" />
            <span className="text-2xl font-bold font-sans tracking-tight text-white tabular-nums">
              {countdown}s
            </span>
          </div>
        </div>

        {/* Phase Guidance Text */}
        <h2 className="text-xl font-bold font-sans tracking-tight text-white mb-1 transition-all duration-500">
          {phase === 'inhale' ? 'Inhale deeply...' : 'Release & Anchor.'}
        </h2>
        <p className="text-xs font-sans text-zinc-300 max-w-xs leading-relaxed mb-4">
          {phase === 'inhale'
            ? 'Clear your mental slate. Step away from the noise.'
            : `Set your undivided intent for #${tag.toUpperCase()} (${durationFormatted}).`}
        </p>

        {/* Skip button for quick entry */}
        <button
          type="button"
          onClick={() => {
            haptics.thud();
            onSkip();
          }}
          className="mt-6 flex items-center gap-1.5 px-4 py-2 rounded-full liquid-pill text-xs font-sans text-zinc-400 hover:text-white transition-all cursor-pointer active:scale-95"
        >
          <span>Enter Void Immediately</span>
          <ArrowRight size={13} />
        </button>
      </div>
    </div>
  );
};
