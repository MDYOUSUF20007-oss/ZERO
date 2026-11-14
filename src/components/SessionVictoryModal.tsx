import React, { useState } from 'react';
import { Trophy, Check, Bookmark } from 'lucide-react';
import { haptics } from '../utils/haptics';

interface SessionVictoryModalProps {
  durationSeconds: number;
  sessionTag: string;
  onSave: (accomplishmentNote: string, rating: 'deep_flow' | 'steady' | 'challenging') => void;
  onDismiss: () => void;
}

export const SessionVictoryModal: React.FC<SessionVictoryModalProps> = ({
  durationSeconds,
  sessionTag,
  onSave,
  onDismiss,
}) => {
  const [note, setNote] = useState<string>('');
  const [rating, setRating] = useState<'deep_flow' | 'steady' | 'challenging'>('deep_flow');
  const [parkedThoughts] = useState<Array<{ id: string; text: string; timestamp: number }>>(() => {
    try {
      return JSON.parse(localStorage.getItem('zero_parked_thoughts_v1') || '[]');
    } catch {
      return [];
    }
  });

  const clearParkedThoughts = () => {
    try {
      localStorage.removeItem('zero_parked_thoughts_v1');
    } catch {}
  };

  const formatReclaimed = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const mins = Math.floor((secs % 3600) / 60);
    if (hours > 0 && mins > 0) return `${hours}h ${mins}m`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    return `${Math.max(1, mins)} minute${mins === 1 ? '' : 's'}`;
  };

  const handleFinish = () => {
    clearParkedThoughts();
    haptics.milestoneChime();
    onSave(note.trim(), rating);
  };

  const handleDismiss = () => {
    clearParkedThoughts();
    haptics.thud();
    onDismiss();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl animate-fadeIn select-none font-sans"
    >
      <div className="relative w-full max-w-sm rounded-[26px] modal-glass p-6 shadow-2xl border border-white/10 text-center space-y-4">
        {/* Victory Icon Emblem */}
        <div className="flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl liquid-glass flex items-center justify-center mb-2 shadow-lg border border-amber-400/30 bg-amber-500/10">
            <Trophy size={28} className="text-amber-400 animate-bounce" />
          </div>
          <span className="text-[10px] font-bold text-amber-300 uppercase tracking-widest">
            Session Victorious
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            +{formatReclaimed(durationSeconds)} Reclaimed
          </h2>
          <span className="text-xs text-zinc-400 mt-0.5">
            Undivided focus in #{sessionTag}
          </span>
        </div>

        {/* Reflection Note Input */}
        <div className="text-left space-y-1.5 pt-1">
          <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
            What did you build or accomplish?
          </label>
          <input
            type="text"
            placeholder="e.g. Read chapter 4, fixed critical bug..."
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={60}
            className="w-full px-3.5 py-2.5 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 outline-none focus:ring-1 focus:ring-cyan-400"
          />
        </div>

        {/* Focus Flow Rating */}
        <div className="text-left space-y-1.5">
          <label className="text-[11px] font-semibold text-zinc-300 uppercase tracking-wider block">
            Session Flow State:
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {(
              [
                { id: 'deep_flow', label: 'Deep Flow', emoji: '🌊' },
                { id: 'steady', label: 'Steady', emoji: '🎯' },
                { id: 'challenging', label: 'Tough', emoji: '⚡' },
              ] as const
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  haptics.thud();
                  setRating(opt.id);
                }}
                className={`py-2 px-1 rounded-xl text-center liquid-spring transition-all cursor-pointer ${
                  rating === opt.id
                    ? 'liquid-pill-active font-semibold text-white border-cyan-400/40'
                    : 'liquid-pill-inactive text-zinc-400 hover:text-white'
                }`}
              >
                <div className="text-sm">{opt.emoji}</div>
                <div className="text-[10px] mt-0.5">{opt.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Unsealed Parked Thoughts */}
        {parkedThoughts.length > 0 && (
          <div className="text-left space-y-1.5 p-3 rounded-xl liquid-inset border border-cyan-400/20 bg-cyan-500/5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1.5">
                <Bookmark size={11} />
                <span>Unsealed Parked Thoughts ({parkedThoughts.length})</span>
              </span>
            </div>
            <ul className="space-y-1 max-h-24 overflow-y-auto pr-1">
              {parkedThoughts.map((t) => (
                <li key={t.id} className="text-xs text-zinc-300 flex items-start gap-1.5">
                  <span className="text-cyan-400 mt-0.5">•</span>
                  <span className="break-words">{t.text}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Buttons */}
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={handleFinish}
            className="w-full py-3 rounded-xl liquid-pill-active font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer active:scale-95 shadow-md"
          >
            <Check size={14} />
            <span>Save to Focus Diary</span>
          </button>

          <button
            type="button"
            onClick={handleDismiss}
            className="w-full py-2 liquid-pill text-zinc-400 hover:text-white text-xs rounded-xl cursor-pointer"
          >
            Skip Note
          </button>
        </div>
      </div>
    </div>
  );
};
