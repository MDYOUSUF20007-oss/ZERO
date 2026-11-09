import React, { useState } from 'react';
import type { RecurringSchedule, SessionTag, ThemeStyle, SleepFarmingMode } from '../types';
import {
  Plus,
  Trash2,
  Bell,
  Heart,
  Coffee,
  Copy,
  Check,
  Download,
  RotateCcw,
  ExternalLink,
  Palette,
  QrCode,
  Code2,
  Moon,
  Smartphone,
  Terminal,
  ShieldAlert,
} from 'lucide-react';

interface SchedulesDonateViewProps {
  schedules: RecurringSchedule[];
  onToggleSchedule: (id: string) => void;
  onAddSchedule: (sched: Omit<RecurringSchedule, 'id'>) => void;
  onDeleteSchedule: (id: string) => void;
  onTriggerTestWarning: (scheduleName: string) => void;
  theme: ThemeStyle;
  onThemeChange: (theme: ThemeStyle) => void;
  sleepFarmingMode: SleepFarmingMode;
  onSleepFarmingModeChange: (mode: SleepFarmingMode) => void;
  onExportData: () => void;
  onResetData: () => void;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const TAGS: SessionTag[] = ['Deep Work', 'Study', 'Sleep', 'Detox', 'Family'];

export const SchedulesDonateView: React.FC<SchedulesDonateViewProps> = ({
  schedules,
  onToggleSchedule,
  onAddSchedule,
  onDeleteSchedule,
  onTriggerTestWarning,
  theme,
  onThemeChange,
  sleepFarmingMode,
  onSleepFarmingModeChange,
  onExportData,
  onResetData,
}) => {
  const [activeSection, setActiveSection] = useState<'schedules' | 'support' | 'settings' | 'os_security'>('schedules');
  const [showAddModal, setShowAddModal] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showUPIQR, setShowUPIQR] = useState(false);

  // New Schedule Form State
  const [newName, setNewName] = useState('Afternoon Focus');
  const [newDays, setNewDays] = useState<number[]>([1, 2, 3, 4, 5]);
  const [newStartTime, setNewStartTime] = useState('14:00');
  const [newEndTime, setNewEndTime] = useState('16:30');
  const [newTag, setNewTag] = useState<SessionTag>('Deep Work');

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleCreateSchedule = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || newDays.length === 0) return;

    onAddSchedule({
      name: newName.trim(),
      days: newDays,
      startTime: newStartTime,
      endTime: newEndTime,
      tag: newTag,
      isEnabled: true,
      preLockWarningMinutes: 5,
    });

    setShowAddModal(false);
  };

  const toggleDaySelection = (dayIndex: number) => {
    if (newDays.includes(dayIndex)) {
      setNewDays(newDays.filter((d) => d !== dayIndex));
    } else {
      setNewDays([...newDays, dayIndex].sort());
    }
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4 max-w-md mx-auto w-full select-none pb-24">
      {/* View Header */}
      <div>
        <h1 className="text-xl font-mono font-black tracking-tight text-white flex items-center gap-2">
          <span>SCHEDULES & RULES</span>
        </h1>
        <p className="text-xs font-mono text-zinc-400">
          Auto-Pilot Blocks, Anti-Exploit Rules & Ethical Support
        </p>
      </div>

      {/* Sub-Nav Pill */}
      <div className="grid grid-cols-4 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl text-[11px] font-mono">
        <button
          onClick={() => setActiveSection('schedules')}
          className={`py-2 rounded-xl transition-all font-semibold ${
            activeSection === 'schedules'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Schedules
        </button>
        <button
          onClick={() => setActiveSection('settings')}
          className={`py-2 rounded-xl transition-all font-semibold ${
            activeSection === 'settings'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Rules
        </button>
        <button
          onClick={() => setActiveSection('os_security')}
          className={`py-2 rounded-xl transition-all font-semibold ${
            activeSection === 'os_security'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          OS Security
        </button>
        <button
          onClick={() => setActiveSection('support')}
          className={`py-2 rounded-xl transition-all font-semibold ${
            activeSection === 'support'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Support
        </button>
      </div>

      {/* SECTION 1: AUTO-PILOT RECURRING SCHEDULES */}
      {activeSection === 'schedules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold">
              Recurring Schedules ({schedules.length})
            </span>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-3 py-1.5 bg-zinc-200 hover:bg-white text-black font-mono font-bold text-xs rounded-xl flex items-center gap-1 active:scale-95 transition-all shadow-sm"
            >
              <Plus size={14} />
              <span>Add Schedule</span>
            </button>
          </div>

          {/* Schedule List */}
          <div className="space-y-3">
            {schedules.map((sched) => (
              <div
                key={sched.id}
                className={`bg-zinc-950 border rounded-2xl p-4 transition-all shadow-brutal ${
                  sched.isEnabled ? 'border-zinc-800' : 'border-zinc-900 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-mono font-bold text-sm text-zinc-100 flex items-center gap-2">
                      <span>{sched.name}</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400">
                        #{sched.tag}
                      </span>
                    </div>
                    <div className="text-xs font-mono text-zinc-400 mt-1">
                      {sched.startTime} – {sched.endTime}
                    </div>
                  </div>

                  {/* Toggle Switch */}
                  <button
                    onClick={() => onToggleSchedule(sched.id)}
                    className={`w-12 h-6 rounded-full transition-colors relative border ${
                      sched.isEnabled
                        ? 'bg-white border-white'
                        : 'bg-zinc-900 border-zinc-800'
                    }`}
                  >
                    <div
                      className={`w-4 h-4 rounded-full transition-transform transform ${
                        sched.isEnabled
                          ? 'translate-x-6 bg-black'
                          : 'translate-x-1 bg-zinc-600'
                      }`}
                    />
                  </button>
                </div>

                {/* Days of Week Pills */}
                <div className="flex gap-1 mt-3">
                  {DAYS_OF_WEEK.map((day, idx) => (
                    <span
                      key={day}
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md ${
                        sched.days.includes(idx)
                          ? 'bg-zinc-200 text-black font-bold'
                          : 'bg-zinc-900 text-zinc-600'
                      }`}
                    >
                      {day}
                    </span>
                  ))}
                </div>

                {/* Footer: 5-min warning heads-up indicator & delete */}
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-900 text-[11px] font-mono text-zinc-500">
                  <div className="flex items-center gap-1.5 text-zinc-400">
                    <Bell size={12} className="text-amber-400" />
                    <span>5-min heads-up alert enabled</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onTriggerTestWarning(sched.name)}
                      className="text-[10px] text-zinc-400 hover:text-zinc-200 underline"
                      title="Simulates 5-minute pre-lock heads-up warning notification"
                    >
                      Test Warning
                    </button>
                    <button
                      onClick={() => onDeleteSchedule(sched.id)}
                      className="text-red-400 hover:text-red-300 p-1"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SECTION 2: DISCIPLINE RULES & ANTI-SLEEP-FARMING */}
      {activeSection === 'settings' && (
        <div className="space-y-4">
          {/* ANTI-SLEEP-FARMING RULE CARD */}
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
                <Moon size={16} className="text-amber-400" />
                <span>ANTI-SLEEP-FARMING RULE</span>
              </div>
              <span className="text-[10px] font-mono uppercase bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30">
                Integrity
              </span>
            </div>

            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              If a user locks their phone for 8 hours every night while asleep, they could farm a free Parachute every 2.5 nights without resisting waking temptation.
            </p>

            <div className="space-y-2 pt-2">
              <label className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-bold block">
                Select Parachute Rate for #Sleep:
              </label>

              {/* Option 1: 0.25x Credit (Recommended) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('quarter_credit')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'quarter_credit'
                    ? 'border-amber-400 bg-amber-950/20 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold flex items-center gap-2 text-zinc-100">
                    <span>0.25x Sleep Parachute Credit</span>
                    <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.2 rounded font-black uppercase">
                      Recommended
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    An 8-hour sleep session earns 2.0 hours towards the 20h Parachute milestone. Keeps rewards meaningful.
                  </p>
                </div>
                {sleepFarmingMode === 'quarter_credit' && (
                  <Check size={16} className="text-amber-400 shrink-0 mt-0.5" />
                )}
              </button>

              {/* Option 2: Daytime Hours Only (0.0x Sleep) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('daytime_only')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'daytime_only'
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-100">Daytime Focus Only (0.0x Sleep Credit)</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Parachutes can only be earned during daytime waking hours. Sleep blocks still track total reclaimed time, but 0h toward Parachutes.
                  </p>
                </div>
                {sleepFarmingMode === 'daytime_only' && (
                  <Check size={16} className="text-white shrink-0 mt-0.5" />
                )}
              </button>

              {/* Option 3: Full Credit (1.0x) */}
              <button
                type="button"
                onClick={() => onSleepFarmingModeChange('full_credit')}
                className={`w-full p-3 rounded-2xl border text-left font-mono text-xs transition-all flex items-start justify-between ${
                  sleepFarmingMode === 'full_credit'
                    ? 'border-white bg-zinc-900 text-white'
                    : 'border-zinc-850 bg-zinc-900/50 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div>
                  <div className="font-bold text-zinc-100">Full 1.0x Credit (Relaxed)</div>
                  <p className="text-[11px] text-zinc-400 mt-1">
                    Every hour locked (day or night) counts 1:1 toward emergency parachutes.
                  </p>
                </div>
                {sleepFarmingMode === 'full_credit' && (
                  <Check size={16} className="text-white shrink-0 mt-0.5" />
                )}
              </button>
            </div>
          </div>

          {/* ABORTED SESSION PENALTY EXPLANATION */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center gap-2 text-zinc-300 font-bold uppercase tracking-wider">
              <ShieldAlert size={14} className="text-red-400" />
              <span>Aborted Session Penalty (Anti-Exploit)</span>
            </div>
            <p className="text-zinc-400 leading-relaxed text-[11px]">
              Deploying an emergency Parachute forfeits all accumulated hours in that specific broken session toward the 20-hour meter.
            </p>
            <div className="p-2.5 bg-zinc-900 rounded-xl text-[11px] text-zinc-300 border border-zinc-800">
              <strong>Example:</strong> If you set a 4-hour lock and deploy a parachute at hour 3, you lose 1 Parachute and receive <strong>0 hours</strong> toward your next one. This prevents locking for 20 hours just to refund the parachute used to exit.
            </div>
          </div>

          {/* Theme Palette */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              <Palette size={14} />
              <span>Color Themes</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => onThemeChange('oled')}
                className={`p-3 rounded-xl border text-left font-mono text-xs transition-all ${
                  theme === 'oled'
                    ? 'border-white bg-zinc-900 text-white font-bold'
                    : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-black border border-white mb-1.5" />
                Pure OLED Void
              </button>

              <button
                onClick={() => onThemeChange('monochrome')}
                className={`p-3 rounded-xl border text-left font-mono text-xs transition-all ${
                  theme === 'monochrome'
                    ? 'border-white bg-zinc-900 text-white font-bold'
                    : 'border-zinc-850 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="w-4 h-4 rounded-full bg-zinc-300 mb-1.5" />
                Neo Monochrome
              </button>
            </div>
          </div>

          {/* Data Management: Export & Reset */}
          <div className="space-y-2">
            <button
              onClick={onExportData}
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-center gap-2 text-xs font-mono text-zinc-200 transition-colors shadow-sm"
            >
              <Download size={14} />
              <span>Export Full JSON Ledger & Sessions Backup</span>
            </button>

            <button
              onClick={() => {
                if (window.confirm('Reset all Zero data to factory defaults? This clears your Parachutes and streaks.')) {
                  onResetData();
                }
              }}
              className="w-full p-3.5 bg-zinc-950 border border-red-950/80 hover:border-red-800 text-red-400 hover:text-red-300 rounded-2xl flex items-center justify-center gap-2 text-xs font-mono transition-colors"
            >
              <RotateCcw size={14} />
              <span>Factory Reset App State</span>
            </button>
          </div>
        </div>
      )}

      {/* SECTION 3: ANDROID OS-LEVEL ENFORCEMENT & ARCHITECTURE */}
      {activeSection === 'os_security' && (
        <div className="space-y-4">
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3 font-mono">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Smartphone size={16} className="text-emerald-400" />
              <span>OS-LEVEL ENFORCEMENT ARCHITECTURE</span>
            </div>
            <p className="text-xs text-zinc-300 leading-relaxed">
              To guarantee that users cannot bypass Zero by swiping home, opening the notification drawer, or rebooting the phone, Zero integrates with 4 core Android OS security APIs:
            </p>

            {/* Feature 1: LockTaskMode / Device Owner */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>1. DevicePolicyManager.setLockTaskPackages()</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  KIOSK PINNING
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Locks The Void activity into true Kiosk mode. Completely disables the Home gesture, Recent Apps button, and Power Menu.
              </p>
            </div>

            {/* Feature 2: Accessibility Service */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>2. ZeroAccessibilityService</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  ANTI-DRAWER
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Detects attempts to swipe down the status bar or quick settings panel, immediately collapsing it with <code>GLOBAL_ACTION_BACK</code>.
              </p>
            </div>

            {/* Feature 3: SYSTEM_ALERT_WINDOW */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>3. SYSTEM_ALERT_WINDOW Overlay</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  TOPMOST LAYER
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Draws directly over system popups and incoming floating notifications using <code>TYPE_APPLICATION_OVERLAY</code>.
              </p>
            </div>

            {/* Feature 4: Priority 999 BootReceiver */}
            <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 space-y-1">
              <div className="flex items-center justify-between text-xs font-bold text-zinc-100">
                <span>4. Anti-Tamper BootReceiver</span>
                <span className="text-[9px] bg-emerald-950 text-emerald-300 px-1.5 py-0.5 rounded border border-emerald-800">
                  REBOOT WATCHDOG
                </span>
              </div>
              <p className="text-[11px] text-zinc-400">
                Catches <code>ACTION_BOOT_COMPLETED</code> at system startup. If the target timestamp has not expired, The Void re-launches before the user can unlock.
              </p>
            </div>
          </div>

          {/* ADB Command Box */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-2 font-mono text-xs">
            <div className="flex items-center justify-between text-zinc-300 font-bold uppercase tracking-wider">
              <div className="flex items-center gap-1.5">
                <Terminal size={14} className="text-cyan-400" />
                <span>ADB Device Owner Setup (Optional)</span>
              </div>
              <button
                onClick={() =>
                  handleCopy(
                    'adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver',
                    'adb_cmd'
                  )
                }
                className="text-[10px] text-zinc-400 hover:text-white flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800"
              >
                {copiedId === 'adb_cmd' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                <span>{copiedId === 'adb_cmd' ? 'Copied' : 'Copy ADB'}</span>
              </button>
            </div>
            <pre className="p-2.5 bg-black rounded-xl text-[10px] text-emerald-300 overflow-x-auto no-scrollbar border border-zinc-900">
              adb shell dpm set-device-owner org.zero.detox/.receiver.ZeroDeviceAdminReceiver
            </pre>
            <p className="text-zinc-500 text-[10px] leading-relaxed">
              Enables permanent kiosk mode without showing the standard Android unpinning confirmation prompt.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 4: KEEP ZERO FREE (ETHICAL SUPPORT & DONATE) */}
      {activeSection === 'support' && (
        <div className="space-y-4">
          {/* Manifesto Card */}
          <div className="bg-zinc-950 border-2 border-zinc-800 rounded-3xl p-5 shadow-brutal space-y-3">
            <div className="flex items-center gap-2 text-white font-mono font-bold text-sm">
              <Heart size={16} className="text-red-500 fill-red-500" />
              <span>THE ZERO PROMISE</span>
            </div>
            <p className="text-xs font-mono text-zinc-300 leading-relaxed">
              Zero is 100% free, libre, and open-source software (FOSS). There are no paywalls,
              no subscriptions, no analytics trackers, and no advertisements.
            </p>
            <p className="text-xs font-mono text-zinc-400 leading-relaxed">
              We believe your attention belongs to you—not to algorithms or paywalled apps.
              Emergency Parachutes can never be purchased; they are strictly earned by staying
              focused.
            </p>
            <div className="pt-2 flex items-center justify-between text-xs font-mono border-t border-zinc-900 text-zinc-400">
              <span>License: GPLv3 / MIT</span>
              <a
                href="https://github.com/zero-detox/zero"
                target="_blank"
                rel="noreferrer"
                className="text-white hover:underline flex items-center gap-1 font-bold"
              >
                <Code2 size={13} />
                <span>Source Code</span>
              </a>
            </div>
          </div>

          {/* Donation Channels */}
          <div className="space-y-2">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 font-bold block">
              Support the Project
            </span>

            {/* GitHub Sponsors */}
            <a
              href="https://github.com/sponsors"
              target="_blank"
              rel="noreferrer"
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
                  <Code2 size={18} />
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-white">GitHub Sponsors</div>
                  <div className="text-[11px] font-mono text-zinc-400">github.com/sponsors/zero-detox</div>
                </div>
              </div>
              <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </a>

            {/* Buy Me a Coffee */}
            <a
              href="https://buymeacoffee.com"
              target="_blank"
              rel="noreferrer"
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                  <Coffee size={18} />
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-white">Buy Me a Coffee</div>
                  <div className="text-[11px] font-mono text-zinc-400">buymeacoffee.com/zerodetox</div>
                </div>
              </div>
              <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </a>

            {/* Liberapay */}
            <a
              href="https://liberapay.com"
              target="_blank"
              rel="noreferrer"
              className="w-full p-3.5 bg-zinc-950 border border-zinc-800 hover:border-zinc-600 rounded-2xl flex items-center justify-between transition-all group active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-yellow-500 font-mono font-bold text-sm">
                  LP
                </div>
                <div>
                  <div className="font-mono font-bold text-xs text-white">Liberapay</div>
                  <div className="text-[11px] font-mono text-zinc-400">liberapay.com/zerodetox</div>
                </div>
              </div>
              <ExternalLink size={14} className="text-zinc-500 group-hover:text-zinc-200" />
            </a>

            {/* UPI ID */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white font-mono font-bold text-xs">
                    UPI
                  </div>
                  <div>
                    <div className="font-mono font-bold text-xs text-white">UPI / Instant Pay</div>
                    <div className="text-[11px] font-mono text-zinc-400">zerofoss@upi</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowUPIQR(!showUPIQR)}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                    title="Toggle QR Code"
                  >
                    <QrCode size={14} />
                  </button>
                  <button
                    onClick={() => handleCopy('zerofoss@upi', 'upi')}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white"
                  >
                    {copiedId === 'upi' ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              {showUPIQR && (
                <div className="p-3 bg-zinc-900 rounded-xl flex flex-col items-center justify-center text-center">
                  <div className="w-32 h-32 bg-white p-2 rounded-lg flex items-center justify-center">
                    <div className="w-full h-full bg-black flex items-center justify-center text-white text-[10px] font-mono p-1 text-center font-bold">
                      UPI QR: zerofoss@upi
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 mt-2">
                    Scan via Google Pay, PhonePe, or Paytm
                  </span>
                </div>
              )}
            </div>

            {/* Crypto Monero / Bitcoin */}
            <div className="p-3.5 bg-zinc-950 border border-zinc-800 rounded-2xl flex items-center justify-between">
              <div>
                <div className="font-mono font-bold text-xs text-white">Bitcoin (BTC)</div>
                <div className="text-[11px] font-mono text-zinc-500 truncate max-w-[200px]">
                  bc1q9v8k7y3n4...2w8p
                </div>
              </div>
              <button
                onClick={() => handleCopy('bc1q9v8k7y3n4wz0detoxfocusreclaim2w8p', 'btc')}
                className="p-2 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-400 hover:text-white text-xs font-mono flex items-center gap-1"
              >
                {copiedId === 'btc' ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                <span>Copy</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4">
          <form
            onSubmit={handleCreateSchedule}
            className="w-full max-w-sm bg-zinc-950 border-2 border-zinc-700 rounded-2xl p-5 shadow-2xl font-mono text-left space-y-4"
          >
            <div className="font-bold text-sm text-white">Create Recurring Schedule</div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Schedule Name</label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Morning Focus"
                required
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              />
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Active Days</label>
              <div className="flex gap-1">
                {DAYS_OF_WEEK.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => toggleDaySelection(idx)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold ${
                      newDays.includes(idx)
                        ? 'bg-white text-black'
                        : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
                    }`}
                  >
                    {day[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">Start Time</label>
                <input
                  type="time"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-zinc-400 block mb-1">End Time</label>
                <input
                  type="time"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 block mb-1">Focus Tag</label>
              <select
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
              >
                {TAGS.map((t) => (
                  <option key={t} value={t}>
                    #{t}
                  </option>
                ))}
              </select>
            </div>

            <div className="p-2.5 bg-zinc-900 rounded-xl text-[10px] text-zinc-400 flex items-center gap-1.5">
              <Bell size={12} className="text-amber-400 shrink-0" />
              <span>Includes automatic 5-minute pre-lock heads-up warning</span>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2.5 bg-white text-black rounded-xl font-bold text-xs uppercase"
              >
                Save Schedule
              </button>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="py-2.5 px-4 bg-zinc-900 text-zinc-300 rounded-xl text-xs font-bold border border-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
