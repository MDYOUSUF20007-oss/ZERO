import React, { useEffect, useState } from 'react';
import { Dumbbell, X, ArrowRight, Volume2, VolumeX } from 'lucide-react';
import { haptics } from '../utils/haptics';

export interface ActionReminderAlertModalProps {
  text: string;
  voiceEnabled: boolean;
  onDismiss: () => void;
}

/**
 * Zero-guilt in-app alert card that pops up when a micro-habit reminder triggers.
 * No checkboxes, no streaks, no tracking guilt. Just the next move.
 */
export const ActionReminderAlertModal: React.FC<ActionReminderAlertModalProps> = ({
  text,
  voiceEnabled,
  onDismiss,
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
  }, []);

  const handleDismiss = () => {
    haptics.tick(600);
    setIsVisible(false);
    setTimeout(onDismiss, 200);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Movement Reminder"
      className="fixed inset-0 z-[10050] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md transition-opacity duration-200"
      onClick={handleDismiss}
    >
      <div
        className={`relative w-full max-w-sm rounded-[24px] bg-[#0c1017] border border-emerald-500/30 p-6 shadow-2xl flex flex-col items-center text-center space-y-4 transition-all duration-200 ${
          isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header Badge */}
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-[10px] font-mono tracking-wider font-semibold uppercase">
            <Dumbbell size={12} strokeWidth={2.2} />
            <span>Movement Nudge</span>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`p-1 rounded-full text-xs ${
                voiceEnabled ? 'text-emerald-400' : 'text-zinc-500'
              }`}
              title={voiceEnabled ? 'Voice Enabled' : 'Silent Reminder'}
            >
              {voiceEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            </span>
            <button
              type="button"
              onClick={handleDismiss}
              className="w-7 h-7 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              aria-label="Close"
            >
              <X size={14} />
            </button>
          </div>
        </div>

        {/* Action Typography */}
        <div className="py-3">
          <p className="text-2xl sm:text-3xl font-extrabold text-white font-sans tracking-tight">
            {text}
          </p>
          <p className="text-xs text-zinc-400 mt-2 font-mono">
            Zero guilt. Act on it or dismiss — it&apos;s your move.
          </p>
        </div>

        {/* Primary Action Button */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-sans font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-95 cursor-pointer"
        >
          <span>Make Next Move</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
};
