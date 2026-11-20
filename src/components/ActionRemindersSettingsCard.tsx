import React, { useState, useEffect } from 'react';
import {
  Dumbbell,
  Volume2,
  VolumeX,
  Clock,
  Plus,
  Trash2,
  Play,
  Sparkles,
  Sliders,
} from 'lucide-react';
import {
  type ActionReminderConfig,
  type ActionReminderItem,
  getActionReminderConfig,
  saveActionReminderConfig,
  triggerActionReminder,
} from '../utils/actionReminders';
import { haptics } from '../utils/haptics';

export const ActionRemindersSettingsCard: React.FC = () => {
  const [config, setConfig] = useState<ActionReminderConfig>(getActionReminderConfig);
  const [newItemText, setNewItemText] = useState('');
  const [isCustomInterval, setIsCustomInterval] = useState(false);
  const [customIntervalInput, setCustomIntervalInput] = useState(String(config.intervalMinutes));

  useEffect(() => {
    const handleConfigUpdate = (e: CustomEvent<ActionReminderConfig>) => {
      if (e.detail) setConfig(e.detail);
    };
    window.addEventListener('zero:action_reminder_config_updated', handleConfigUpdate as EventListener);
    return () => {
      window.removeEventListener('zero:action_reminder_config_updated', handleConfigUpdate as EventListener);
    };
  }, []);

  const updateConfig = (next: ActionReminderConfig) => {
    setConfig(next);
    saveActionReminderConfig(next);
  };

  const handleToggleMaster = () => {
    haptics.tick(600);
    updateConfig({ ...config, enabled: !config.enabled });
  };

  const handleToggleVoice = () => {
    haptics.tick(600);
    updateConfig({ ...config, voiceEnabled: !config.voiceEnabled });
  };

  const handleStartTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ ...config, startTime: e.target.value });
  };

  const handleEndTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateConfig({ ...config, endTime: e.target.value });
  };

  const handleSetInterval = (minutes: number) => {
    haptics.tick(500);
    setIsCustomInterval(false);
    updateConfig({ ...config, intervalMinutes: minutes });
  };

  const handleApplyCustomInterval = () => {
    const val = parseInt(customIntervalInput, 10);
    if (!isNaN(val) && val > 0) {
      haptics.tick(600);
      updateConfig({ ...config, intervalMinutes: val });
    }
  };

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    const text = newItemText.trim();
    if (!text) return;
    haptics.tick(700);

    const newItem: ActionReminderItem = {
      id: `item-${Date.now()}`,
      text,
      enabled: true,
    };
    updateConfig({
      ...config,
      items: [newItem, ...config.items],
    });
    setNewItemText('');
  };

  const handleToggleItem = (id: string) => {
    haptics.tick(400);
    updateConfig({
      ...config,
      items: config.items.map((it) => (it.id === id ? { ...it, enabled: !it.enabled } : it)),
    });
  };

  const handleDeleteItem = (id: string) => {
    haptics.tick(400);
    updateConfig({
      ...config,
      items: config.items.filter((it) => it.id !== id),
    });
  };

  const handleTestNudge = (itemText?: string) => {
    haptics.thud();
    triggerActionReminder(itemText, config);
  };

  const intervalPresets = [
    { label: '30m', minutes: 30 },
    { label: 'Every 1h', minutes: 60 },
    { label: 'Every 2h', minutes: 120 },
    { label: 'Every 3h', minutes: 180 },
  ];

  return (
    <div
      className="rounded-3xl p-4 sm:p-5 space-y-4"
      style={{
        backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
        border: '1px solid var(--border-subtle)',
      }}
    >
      {/* Header with Master Switch */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5 min-w-0">
          <div
            className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
            style={{
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            <Dumbbell size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className="text-sm font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Movement &amp; Action Reminders
              </h3>
              <span
                className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-primary)',
                }}
              >
                {config.voiceEnabled ? 'VOICE ON' : 'SILENT'}
              </span>
            </div>
            <p
              className="text-[11px] leading-relaxed mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Periodic nudges (e.g. &ldquo;Do 10 pushups&rdquo;, &ldquo;Drink water&rdquo;) with or without voice. Built on zero guilt: no checklists, no streaks, no history &mdash; just your next move.
            </p>
          </div>
        </div>

        {/* Master ON/OFF Switch */}
        <button
          type="button"
          role="switch"
          aria-checked={config.enabled}
          aria-label="Toggle Movement & Action Reminders"
          onClick={handleToggleMaster}
          className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5"
          style={{
            backgroundColor: config.enabled ? 'var(--accent-primary)' : 'var(--bg-input)',
            border: `1px solid ${config.enabled ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full transition-transform"
            style={{
              backgroundColor: config.enabled ? 'var(--text-on-accent)' : 'var(--text-muted)',
              transform: config.enabled ? 'translateX(20px)' : 'translateX(0px)',
            }}
          />
        </button>
      </div>

      {config.enabled && (
        <div className="space-y-4 pt-1">
          {/* Voice Speech Toggle Row */}
          <div
            className="p-3 rounded-2xl flex items-center justify-between gap-3 text-xs"
            style={{
              backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-2.5">
              <div
                className="p-2 rounded-xl"
                style={{
                  backgroundColor: config.voiceEnabled ? 'var(--accent-soft)' : 'var(--bg-input)',
                  color: config.voiceEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
                }}
              >
                {config.voiceEnabled ? <Volume2 size={15} /> : <VolumeX size={15} />}
              </div>
              <div>
                <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Voice Announcement (TTS)
                </p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {config.voiceEnabled
                    ? 'Speaks reminder prompt aloud + soft harmonic chime'
                    : 'Silent notification and visual pop-up only'}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleToggleVoice}
              className="px-3 py-1.5 rounded-xl font-mono text-[11px] font-bold cursor-pointer transition-colors"
              style={{
                backgroundColor: config.voiceEnabled ? 'var(--accent-primary)' : 'var(--bg-input)',
                color: config.voiceEnabled ? 'var(--text-on-accent)' : 'var(--text-muted)',
                border: '1px solid var(--border-subtle)',
              }}
            >
              {config.voiceEnabled ? 'ENABLED' : 'DISABLED'}
            </button>
          </div>

          {/* Active Hours Window (e.g. 06:00 to 22:00) */}
          <div
            className="p-3.5 rounded-2xl space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              <Clock size={13} style={{ color: 'var(--accent-primary)' }} />
              <span>Active Time Window</span>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                  START TIME
                </label>
                <input
                  type="time"
                  value={config.startTime}
                  onChange={handleStartTimeChange}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
              <div>
                <label className="block text-[10px] font-mono mb-1" style={{ color: 'var(--text-muted)' }}>
                  END TIME
                </label>
                <input
                  type="time"
                  value={config.endTime}
                  onChange={handleEndTimeChange}
                  className="w-full px-3 py-2 rounded-xl text-xs font-mono font-bold focus:outline-none"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    border: '1px solid var(--border-strong)',
                    color: 'var(--text-primary)',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Frequency & Custom Interval */}
          <div
            className="p-3.5 rounded-2xl space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
              <div className="flex items-center gap-1.5">
                <Sliders size={13} style={{ color: 'var(--accent-primary)' }} />
                <span>Reminder Interval</span>
              </div>
              <span className="text-[10px] font-mono" style={{ color: 'var(--accent-primary)' }}>
                Every {config.intervalMinutes < 60 ? `${config.intervalMinutes}m` : `${config.intervalMinutes / 60}h`}
              </span>
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {intervalPresets.map((preset) => (
                <button
                  key={preset.minutes}
                  type="button"
                  onClick={() => handleSetInterval(preset.minutes)}
                  className="py-2 px-1.5 rounded-xl text-[11px] font-mono font-bold transition-colors cursor-pointer text-center"
                  style={{
                    backgroundColor:
                      !isCustomInterval && config.intervalMinutes === preset.minutes
                        ? 'var(--accent-primary)'
                        : 'var(--bg-input)',
                    color:
                      !isCustomInterval && config.intervalMinutes === preset.minutes
                        ? 'var(--text-on-accent)'
                        : 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* Custom Interval Option */}
            <div className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min="5"
                max="720"
                value={customIntervalInput}
                onChange={(e) => {
                  setCustomIntervalInput(e.target.value);
                  setIsCustomInterval(true);
                }}
                placeholder="Custom minutes"
                className="w-28 px-3 py-1.5 rounded-xl text-xs font-mono focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                minutes
              </span>
              <button
                type="button"
                onClick={handleApplyCustomInterval}
                className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors ml-auto"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  border: '1px solid var(--accent-border)',
                  color: 'var(--accent-primary)',
                }}
              >
                Apply Custom
              </button>
            </div>
          </div>

          {/* Custom Reminders List & Add Form */}
          <div
            className="p-3.5 rounded-2xl space-y-3"
            style={{
              backgroundColor: 'var(--bg-card, rgba(255,255,255,0.03))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                Custom Reminders ({config.items.length})
              </span>
              <button
                type="button"
                onClick={() => handleTestNudge()}
                className="flex items-center gap-1 text-[11px] font-mono cursor-pointer"
                style={{ color: 'var(--accent-primary)' }}
              >
                <Play size={11} />
                <span>Test Nudge</span>
              </button>
            </div>

            {/* Add Input */}
            <form onSubmit={handleAddItem} className="flex gap-2">
              <input
                type="text"
                value={newItemText}
                onChange={(e) => setNewItemText(e.target.value)}
                placeholder="e.g. Do 10 pushups, Drink water..."
                className="flex-1 px-3 py-2 rounded-xl text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                disabled={!newItemText.trim()}
                className="px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-40"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                }}
              >
                <Plus size={14} />
                <span>Add</span>
              </button>
            </form>

            {/* List */}
            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
              {config.items.map((item) => (
                <div
                  key={item.id}
                  className="p-2.5 rounded-xl flex items-center justify-between gap-2 text-xs transition-colors"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    className="flex items-center gap-2 flex-1 min-w-0 cursor-pointer"
                    onClick={() => handleToggleItem(item.id)}
                  >
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{
                        backgroundColor: item.enabled ? 'var(--status-success)' : 'var(--text-muted)',
                      }}
                    />
                    <span
                      className={`truncate font-medium ${item.enabled ? '' : 'line-through'}`}
                      style={{
                        color: item.enabled ? 'var(--text-primary)' : 'var(--text-muted)',
                      }}
                    >
                      {item.text}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleTestNudge(item.text)}
                      title="Test this prompt"
                      className="p-1 rounded-lg cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      <Play size={11} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item.id)}
                      title="Delete"
                      className="p-1 rounded-lg cursor-pointer hover:text-red-400"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Zero-Guilt Manifesto Box */}
          <div
            className="p-3 rounded-2xl text-[11px] space-y-1 font-mono"
            style={{
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <div className="flex items-center gap-1.5 font-bold" style={{ color: 'var(--accent-primary)' }}>
              <Sparkles size={12} />
              <span>Zero-Guilt Philosophy</span>
            </div>
            <p className="leading-relaxed">
              No tick marks, streaks, or completion history. When the nudge appears, you can do it or dismiss it. No guilt &mdash; just keep moving forward.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
