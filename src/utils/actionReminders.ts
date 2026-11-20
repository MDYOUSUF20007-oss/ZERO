/**
 * Action & Movement Reminders Engine (Zero-Guilt Micro-Habit Nudges)
 * 
 * Supports:
 * - Time window filtering (e.g., 06:00 to 22:00)
 * - Custom interval scheduling (every 30m, 1h, 2h, custom hours/minutes)
 * - Voice synthesis (speechSynthesis API) toggleable: runs with or without voice
 * - Web Audio harmonic chime
 * - Browser/system notification integration
 * - Zero guilt philosophy: no streaks, no ticks, no history, just the next move.
 */

export interface ActionReminderItem {
  id: string;
  text: string;
  enabled: boolean;
}

export interface ActionReminderConfig {
  enabled: boolean;
  voiceEnabled: boolean;
  startTime: string; // '06:00' (24-hour format)
  endTime: string; // '22:00' (24-hour format)
  intervalMinutes: number; // e.g. 60 for 1 hour, 120 for 2 hours
  lastTriggeredAt: number | null;
  items: ActionReminderItem[];
}

const STORAGE_KEY = 'zero_action_reminders_config_v1';

export const DEFAULT_ACTION_REMINDER_ITEMS: ActionReminderItem[] = [
  { id: 'item-1', text: 'Do 10 pushups', enabled: true },
  { id: 'item-2', text: 'Do 20 pushups', enabled: true },
  { id: 'item-3', text: 'Drink a glass of water', enabled: true },
  { id: 'item-4', text: '15 bodyweight squats', enabled: true },
  { id: 'item-5', text: 'Stretch neck & shoulders', enabled: true },
  { id: 'item-6', text: '30s plank & deep breath', enabled: true },
];

export const DEFAULT_ACTION_REMINDER_CONFIG: ActionReminderConfig = {
  enabled: true,
  voiceEnabled: true,
  startTime: '06:00',
  endTime: '22:00',
  intervalMinutes: 60, // 1 hour
  lastTriggeredAt: null,
  items: DEFAULT_ACTION_REMINDER_ITEMS,
};

export const getActionReminderConfig = (): ActionReminderConfig => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_ACTION_REMINDER_CONFIG;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_ACTION_REMINDER_CONFIG,
      ...parsed,
      items: Array.isArray(parsed.items) && parsed.items.length > 0
        ? parsed.items
        : DEFAULT_ACTION_REMINDER_ITEMS,
    };
  } catch {
    return DEFAULT_ACTION_REMINDER_CONFIG;
  }
};

export const saveActionReminderConfig = (config: ActionReminderConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    window.dispatchEvent(new CustomEvent('zero:action_reminder_config_updated', { detail: config }));
  } catch {
    // Ignore storage quota errors
  }
};

/**
 * Checks if current time is within the start and end time window (24h 'HH:MM')
 */
export const isWithinTimeWindow = (startTime: string, endTime: string, date = new Date()): boolean => {
  const currentMinutes = date.getHours() * 60 + date.getMinutes();

  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);

  const startMinutes = (startH || 0) * 60 + (startM || 0);
  const endMinutes = (endH || 0) * 60 + (endM || 0);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }
  // Overnight window (e.g. 22:00 to 06:00)
  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
};

/**
 * Checks if a reminder should trigger according to interval & time window
 */
export const shouldTriggerReminder = (config: ActionReminderConfig, now = Date.now()): boolean => {
  if (!config.enabled) return false;
  if (!isWithinTimeWindow(config.startTime, config.endTime, new Date(now))) return false;

  const activeItems = config.items.filter((i) => i.enabled);
  if (activeItems.length === 0) return false;

  if (!config.lastTriggeredAt) return true;

  const elapsedMs = now - config.lastTriggeredAt;
  const intervalMs = config.intervalMinutes * 60 * 1000;
  return elapsedMs >= intervalMs;
};

let audioCtx: AudioContext | null = null;

/**
 * Soft harmonic dual-chime using Web Audio API
 */
export const playActionChime = (): void => {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    if (!audioCtx) audioCtx = new AudioCtx();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const t0 = audioCtx.currentTime;

    // Tone 1: 523.25 Hz (C5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(523.25, t0);
    gain1.gain.setValueAtTime(0.12, t0);
    gain1.gain.exponentialRampToValueAtTime(0.001, t0 + 0.35);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(t0);
    osc1.stop(t0 + 0.36);

    // Tone 2: 783.99 Hz (G5) slightly delayed
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(783.99, t0 + 0.12);
    gain2.gain.setValueAtTime(0.14, t0 + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, t0 + 0.55);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(t0 + 0.12);
    osc2.stop(t0 + 0.56);
  } catch {
    // Ignore audio errors
  }
};

/**
 * Speaks text using SpeechSynthesis API (runs with or without voice)
 */
export const speakActionPrompt = (text: string): void => {
  try {
    if (!('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel(); // cancel any active speech

    const utterance = new SpeechSynthesisUtterance(`Reminder: ${text}`);
    utterance.rate = 0.98;
    utterance.pitch = 1.05;

    // Try finding an English natural voice
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.default)
    ) || voices.find((v) => v.lang.startsWith('en'));

    if (preferredVoice) utterance.voice = preferredVoice;

    window.speechSynthesis.speak(utterance);
  } catch {
    // Speech unavailable
  }
};

/**
 * Dispatches browser/OS notification if allowed
 */
export const dispatchSystemNotification = (title: string, body: string): void => {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag: 'zero-action-reminder',
      });
    }
  } catch {
    // Notification error
  }
};

/**
 * Triggers a reminder immediately:
 * 1. Plays chime
 * 2. If voiceEnabled, speaks prompt
 * 3. Sends system notification
 * 4. Broadcasts custom event so in-app UI can show the pop-up
 */
export const triggerActionReminder = (
  itemText?: string,
  configOverride?: ActionReminderConfig
): { text: string; id: string } => {
  const config = configOverride || getActionReminderConfig();
  const activeItems = config.items.filter((i) => i.enabled);
  
  let targetText = itemText;
  let targetId = 'custom';

  if (!targetText) {
    if (activeItems.length > 0) {
      const selected = activeItems[Math.floor(Math.random() * activeItems.length)];
      targetText = selected.text;
      targetId = selected.id;
    } else {
      targetText = 'Do 10 pushups';
      targetId = 'fallback';
    }
  }

  // 1. Play soft audio chime
  playActionChime();

  // 2. Voice announcement if enabled
  if (config.voiceEnabled) {
    // Short delay so chime leads into speech smoothly
    setTimeout(() => {
      speakActionPrompt(targetText!);
    }, 280);
  }

  // 3. System notification
  dispatchSystemNotification('Zero Reminder', targetText);

  // 4. Update lastTriggeredAt
  const updatedConfig: ActionReminderConfig = {
    ...config,
    lastTriggeredAt: Date.now(),
  };
  saveActionReminderConfig(updatedConfig);

  // 5. Broadcast to in-app event bus
  const payload = { text: targetText, id: targetId, timestamp: Date.now() };
  window.dispatchEvent(
    new CustomEvent('zero:action_reminder_alert', {
      detail: payload,
    })
  );

  return { text: targetText, id: targetId };
};
