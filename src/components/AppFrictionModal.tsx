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
  packageName: _packageName,
  visual,
  onConfirm,
  onCancel,
}) => {
  const [secondsLeft, setSecondsLeft] = useState<number>(3);

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
        <div className="p-3.5 liquid-inset rounded-xl text-xs text-zinc-200 leading-relaxed">
          <p className="font-medium text-white mb-1">Take a breath.</p>
          <p className="text-zinc-400 text-[11px]">
            Is opening {appName} intentional, or an unconscious reflex habit?
          </p>
        </div>

        {/* Action Controls */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={() => {
              haptics.tick(900);
              onConfirm();
            }}
            className="w-full py-3 rounded-xl liquid-pill-active font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
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
