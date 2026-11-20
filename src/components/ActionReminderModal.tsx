import React, { useState } from 'react';
import {
  Dumbbell,
  X,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Play,
  Clock,
  Sparkles,
} from 'lucide-react';
import {
  type ActionReminderConfig,
  type ActionReminderItem,
  saveActionReminderConfig,
  triggerActionReminder,
} from '../utils/actionReminders';
import { haptics } from '../utils/haptics';

export interface ActionReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: ActionReminderConfig;
  onConfigChange: (updated: ActionReminderConfig) => void;
}

export const ActionReminderModal: React.FC<ActionReminderModalProps> = ({
  isOpen,
  onClose,
  config,
  onConfigChange,
}) => {
  const [newReminderText, setNewReminderText] = useState('');

  if (!isOpen) return null;

  const handleToggleEnabled = () => {
    haptics.tick(600);
    const updated = { ...config, enabled: !config.enabled };
    onConfigChange(updated);
    saveActionReminderConfig(updated);
  };

  const handleToggleVoice = () => {
    haptics.tick(600);
    const updated = { ...config, voiceEnabled: !config.voiceEnabled };
    onConfigChange(updated);
    saveActionReminderConfig(updated);
  };

  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newReminderText.trim();
    if (!text) return;
    haptics.tick(700);

    const newItem: ActionReminderItem = {
      id: `item-${Date.now()}`,
      text,
      enabled: true,
    };
    const updated = {
      ...config,
      items: [newItem, ...config.items],
    };
    onConfigChange(updated);
    saveActionReminderConfig(updated);
    setNewReminderText('');
  };

  const handleToggleItem = (id: string) => {
    haptics.tick(400);
    const updated = {
      ...config,
      items: config.items.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)),
    };
    onConfigChange(updated);
    saveActionReminderConfig(updated);
  };

  const handleDeleteItem = (id: string) => {
    haptics.tick(400);
    const updated = {
      ...config,
      items: config.items.filter((it) => it.id !== id),
    };
    onConfigChange(updated);
    saveActionReminderConfig(updated);
  };

  const handleTriggerNudge = (itemText?: string) => {
    haptics.thud();
    triggerActionReminder(itemText, config);
  };

  const formatIntervalLabel = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    if (minutes % 60 === 0) return `${minutes / 60}h`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  const formatTime12h = (time24: string) => {
    const [h, m] = time24.split(':').map(Number);
    const period = (h || 0) >= 12 ? 'PM' : 'AM';
    const hours12 = (h || 0) % 12 || 12;
    return `${hours12}:${(m || 0).toString().padStart(2, '0')} ${period}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Action & Movement Reminders"
      className="fixed inset-0 z-[10020] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md rounded-[28px] bg-[#0c1017] border border-white/10 p-5 shadow-2xl flex flex-col space-y-4 font-sans select-none max-h-[88vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
              <Dumbbell size={18} strokeWidth={2.2} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide">
                Movement Reminders
              </h3>
              <p className="text-[11px] text-zinc-400 font-mono">
                No tick marks • No guilt • Just the next move
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer transition-colors"
            aria-label="Close"
          >
            <X size={15} />
          </button>
        </div>

        {/* Status / Quick Settings Bar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {/* Master Toggle */}
          <button
            type="button"
            onClick={handleToggleEnabled}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
              config.enabled
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="font-medium">Reminder Status</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                config.enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {config.enabled ? 'Active' : 'Off'}
            </span>
          </button>

          {/* Voice Toggle */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-colors ${
              config.voiceEnabled
                ? 'bg-sky-950/40 border-sky-500/40 text-sky-300'
                : 'bg-zinc-900/60 border-zinc-800 text-zinc-500'
            }`}
          >
            <span className="font-medium flex items-center gap-1.5">
              {config.voiceEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              <span>Voice Cue</span>
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                config.voiceEnabled ? 'bg-sky-500/20 text-sky-400' : 'bg-zinc-800 text-zinc-500'
              }`}
            >
              {config.voiceEnabled ? 'On' : 'Silent'}
            </span>
          </button>
        </div>

        {/* Schedule Summary Banner */}
        <div className="p-3 rounded-2xl bg-zinc-900/60 border border-white/5 flex items-center justify-between text-xs text-zinc-300 font-mono">
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-zinc-400" />
            <span>
              {formatTime12h(config.startTime)} &ndash; {formatTime12h(config.endTime)}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-white/5 text-zinc-300">
            Every {formatIntervalLabel(config.intervalMinutes)}
          </span>
        </div>

        {/* Add Custom Reminder Form */}
        <form onSubmit={handleAddReminder} className="flex gap-2">
          <input
            type="text"
            value={newReminderText}
            onChange={(e) => setNewReminderText(e.target.value)}
            placeholder="e.g. Do 10 pushups, Drink water..."
            className="flex-1 bg-zinc-900/90 border border-zinc-700/80 rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500/70"
          />
          <button
            type="submit"
            disabled={!newReminderText.trim()}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer shrink-0"
          >
            <Plus size={14} />
            <span>Add</span>
          </button>
        </form>

        {/* Active Reminders List */}
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {config.items.length === 0 ? (
            <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 text-center text-xs text-zinc-500 font-mono">
              No reminders added. Tap Add above to create one.
            </div>
          ) : (
            config.items.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 text-xs transition-colors ${
                  item.enabled
                    ? 'bg-zinc-900/70 border-white/10 text-zinc-200'
                    : 'bg-zinc-950/40 border-zinc-900 text-zinc-600 line-through'
                }`}
              >
                <div
                  className="flex items-center gap-2.5 flex-1 min-w-0 cursor-pointer"
                  onClick={() => handleToggleItem(item.id)}
                >
                  <span
                    className={`w-2 h-2 rounded-full shrink-0 ${
                      item.enabled ? 'bg-emerald-400' : 'bg-zinc-700'
                    }`}
                  />
                  <span className="truncate font-sans font-medium">{item.text}</span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleTriggerNudge(item.text)}
                    title="Nudge Now"
                    className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    <Play size={11} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    title="Delete"
                    className="p-1.5 rounded-lg bg-zinc-800/60 hover:bg-red-950/60 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Zero-Guilt Manifesto Note */}
        <div className="p-3 rounded-2xl bg-zinc-950/80 border border-white/5 text-[11px] text-zinc-400 font-mono space-y-1">
          <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
            <Sparkles size={12} />
            <span>Zero-Guilt Philosophy</span>
          </div>
          <p className="leading-relaxed">
            No checklists or streak tracking. When it pops up, you can do it or dismiss it. No guilt, no history logs &mdash; just the next move.
          </p>
        </div>

        {/* Bottom Actions */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            type="button"
            onClick={() => handleTriggerNudge()}
            className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Play size={13} className="text-emerald-400" />
            <span>Nudge Me Now</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center justify-center transition-colors cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
