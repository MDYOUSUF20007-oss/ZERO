import React, { useEffect, useState } from 'react';
import { ArrowUpRight, X } from 'lucide-react';
import { haptics } from '../utils/haptics';
import type { AppBrandVisual } from '../utils/appBrandColors';

interface AppFrictionModalProps {
  appName: string;
  packageName: string;
  visual: AppBrandVisual;
  onConfirm: () => void;
  onCancel: () => void;
}

export const AppFrictionModal: React.FC<AppFrictionModalProps> = ({
  appName,
  packageName,
  visual,
  onConfirm,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(3);
  const isVideoApp =
    appName.toLowerCase().includes('youtube') ||
    appName.toLowerCase().includes('morph') ||
    packageName.toLowerCase().includes('morphe') ||
    packageName.toLowerCase().includes('youtube') ||
    packageName === 'org.zero.tube';

  const [intentInput, setIntentInput] = useState('');
  const intentPassed =
    !isVideoApp ||
    intentInput.trim().toLowerCase() === 'i am productive.' ||
    intentInput.trim().toLowerCase() === 'i am productive';

  useEffect(() => {
    haptics.tick(600);
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn select-none font-sans"
    >
      <div className="relative w-full max-w-sm rounded-[24px] modal-glass p-5 sm:p-6 shadow-2xl border border-white/10 text-center space-y-4">
        {/* Close Button */}
        <button
          type="button"
          onClick={() => {
            haptics.thud();
            onCancel();
          }}
          className="absolute top-4 right-4 w-7 h-7 rounded-full liquid-pill-inactive flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
        >
          <X size={14} />
        </button>

        {/* App Icon Badge */}
        <div className="flex flex-col items-center">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold mb-2 shadow-lg"
            style={{
              backgroundColor: visual.bgColor,
              color: visual.textColor,
              border: `1px solid ${visual.borderColor}`,
            }}
          >
            {visual.initial}
          </div>
          <h3 className="text-base font-bold text-white tracking-wide">
            {appName}
          </h3>
          <span className="text-[10px] font-medium text-cyan-300 uppercase tracking-widest mt-0.5">
            Allowed Bag App
          </span>
        </div>

        {/* Mindful Friction Prompt */}
        <div className="p-3.5 liquid-inset rounded-xl text-xs text-zinc-200 leading-relaxed text-left">
          <p className="font-medium text-white mb-1">
            {isVideoApp ? 'Productive Intent Verification' : 'Take a breath.'}
          </p>
          <p className="text-zinc-400 text-[11px] leading-relaxed">
            {isVideoApp ? (
              <>
                To prevent accidental distraction on video platforms, confirm your study intention by typing{' '}
                <strong className="text-cyan-300 font-mono select-all">&quot;I am productive.&quot;</strong> below:
              </>
            ) : (
              `Is opening ${appName} intentional, or an unconscious reflex habit?`
            )}
          </p>
          {isVideoApp && (
            <input
              type="text"
              autoFocus
              value={intentInput}
              onChange={(e) => setIntentInput(e.target.value)}
              placeholder='Type: "I am productive."'
              className={`w-full mt-2.5 px-3 py-2 rounded-xl bg-black/50 text-xs text-white placeholder-zinc-500 border focus:outline-none ${
                intentPassed && intentInput.trim().length > 0
                  ? 'border-cyan-400/60 ring-1 ring-cyan-400/30'
                  : 'border-white/10'
              }`}
            />
          )}
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            disabled={!intentPassed || secondsLeft > 0}
            onClick={() => {
              if (!intentPassed || secondsLeft > 0) return;
              haptics.tick(900);
              onConfirm();
            }}
            className={`w-full py-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all shadow-md ${
              intentPassed && secondsLeft === 0
                ? 'liquid-pill-active cursor-pointer active:scale-95'
                : 'bg-zinc-800 text-zinc-500 border border-white/5 cursor-not-allowed opacity-60'
            }`}
          >
            <span>Proceed to {appName}</span>
            {secondsLeft > 0 ? (
              <span className="font-mono tabular-nums opacity-75">({secondsLeft}s)</span>
            ) : (
              <ArrowUpRight size={14} />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.thud();
              onCancel();
            }}
            className="w-full py-2.5 liquid-pill text-zinc-300 font-medium text-xs rounded-xl hover:text-white cursor-pointer"
          >
            Stay in The Void
          </button>
        </div>
      </div>
    </div>
  );
};
