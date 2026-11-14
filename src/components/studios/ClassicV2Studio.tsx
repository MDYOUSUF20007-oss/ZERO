import React, { useState, useEffect } from 'react';
import {
  Shield,
  Clock,
  Lock,
  Unlock,
  Flame,
  Trophy,
  Smartphone,
  Settings,
  Sparkles,
  ShieldAlert,
  ChevronRight,
  BarChart2,
  Check,
} from 'lucide-react';
import { useInterfaceStyle } from '../../context/InterfaceStyleContext';
import type { ClassicV2Surface } from '../../types';
import { haptics } from '../../utils/haptics';

const ACCENT_OPTIONS = [
  { hex: '#FFAA00', name: 'Amber Gold', desc: 'Hardware default' },
  { hex: '#FF7700', name: 'Electric Flame', desc: 'Vibrant ignition' },
  { hex: '#FFD000', name: 'Cyber Gold', desc: 'High luminance' },
  { hex: '#FF9500', name: 'Sunset Glow', desc: 'Warm amber' },
  { hex: '#10B981', name: 'Shield Emerald', desc: 'Security tint' },
];

const SURFACE_OPTIONS: { id: ClassicV2Surface; label: string; bgHex: string; desc: string }[] = [
  { id: 'obsidian', label: 'Pure Obsidian', bgHex: '#08080A', desc: 'Subtle deep charcoal glow' },
  { id: 'pitch-black', label: 'True AMOLED', bgHex: '#000000', desc: 'Zero-watt OLED pixels' },
  { id: 'carbon', label: 'Carbon Matte', bgHex: '#121217', desc: 'Soft low-glare texture' },
];

export const ClassicV2Studio: React.FC = () => {
  const {
    classicV2Surface,
    setClassicV2Surface,
    classicV2Accent,
    setClassicV2Accent,
  } = useInterfaceStyle();

  // Demo Interactive State
  const [demoTab, setDemoTab] = useState<'focus' | 'analytics' | 'bags' | 'settings'>('focus');
  const [isLocked, setIsLocked] = useState(false);
  const [lockDurationMinutes, setLockDurationMinutes] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [activeBag, setActiveBag] = useState('Deep Work');
  const [escapeTickets, setEscapeTickets] = useState(3);
  const [streakDays, setStreakDays] = useState(12);
  const [totalLockedMinutes, setTotalLockedMinutes] = useState(1420);
  const [showEscapeModal, setShowEscapeModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // System Preferences Toggles
  const [strictLock, setStrictLock] = useState(true);
  const [hapticFeedback, setHapticFeedback] = useState(true);
  const [amoledTrueBlack, setAmoledTrueBlack] = useState(classicV2Surface === 'pitch-black');

  const bags = [
    { id: '1', name: 'Deep Work', apps: ['Slack', 'Gmail', 'Notion'], isStrict: true, icon: '💼' },
    { id: '2', name: 'Digital Detox', apps: ['Instagram', 'TikTok', 'YouTube', 'X'], isStrict: true, icon: '🌙' },
    { id: '3', name: 'Study Session', apps: ['Canvas', 'Anki', 'Kindle'], isStrict: false, icon: '📚' },
  ];

  // Timer Tick Effect
  useEffect(() => {
    let interval: ReturnJSInterval | null = null;
    if (isLocked && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            setIsLocked(false);
            setStreakDays((s) => s + 1);
            showToast('Focus session successfully completed! Streak +1');
            return 0;
          }
          return prev - 1;
        });
        setTotalLockedMinutes((m) => m + 1 / 60);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isLocked, timeLeft]);

  type ReturnJSInterval = ReturnType<typeof setInterval>;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const startLock = () => {
    haptics.tick(750);
    setTimeLeft(lockDurationMinutes * 60);
    setIsLocked(true);
    showToast(`Onyx Shield engaged for ${lockDurationMinutes} minutes.`);
  };

  const requestEmergencyEscape = () => {
    haptics.thud();
    if (escapeTickets > 0) {
      setShowEscapeModal(true);
    } else {
      showToast('No Escape Tickets remaining! You must push through.');
    }
  };

  const confirmEscape = () => {
    haptics.lockEngaged();
    setEscapeTickets((t) => Math.max(0, t - 1));
    setIsLocked(false);
    setShowEscapeModal(false);
    showToast('Emergency escape executed. Ticket consumed.');
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="p-4 rounded-2xl bg-[#111116]/80 border border-white/[0.08] backdrop-blur-xl relative overflow-hidden">
        <div
          className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: classicV2Accent }}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-[#141419] border border-white/10 flex items-center justify-center shadow-lg"
              style={{ borderColor: `${classicV2Accent}40` }}
            >
              <Shield className="w-5 h-5" style={{ color: classicV2Accent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-wide">Classic UI Version 2</h3>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border"
                  style={{
                    backgroundColor: `${classicV2Accent}15`,
                    color: classicV2Accent,
                    borderColor: `${classicV2Accent}35`,
                  }}
                >
                  Beta Test
                </span>
              </div>
              <p className="text-xs text-[#8E8E93]">Hardware Accessibility Shield & Onyx Obsidian</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#141419] border border-white/5 px-2.5 py-1 rounded-full text-xs font-mono text-white">
              <Flame className="w-3.5 h-3.5" style={{ color: classicV2Accent }} />
              <span>{streakDays}d streak</span>
            </div>
            <div className="flex items-center gap-1.5 bg-[#141419] border border-white/5 px-2.5 py-1 rounded-full text-xs font-mono text-white">
              <Trophy className="w-3.5 h-3.5 text-amber-400" />
              <span>{escapeTickets} tickets</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Darkness Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Surface Texture Canvas</span>
          <span className="text-zinc-500 font-mono text-[10px]">Pure Onyx Scope</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {SURFACE_OPTIONS.map((surf) => {
            const isSelected = classicV2Surface === surf.id;
            return (
              <button
                key={surf.id}
                type="button"
                onClick={() => {
                  haptics.tick(750);
                  setClassicV2Surface(surf.id);
                  if (surf.id === 'pitch-black') setAmoledTrueBlack(true);
                }}
                className={`p-3 text-left rounded-xl border transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'border-amber-400/60 bg-zinc-900/90 shadow-md'
                    : 'border-zinc-800/80 bg-zinc-950/40 hover:border-zinc-700'
                }`}
                style={{
                  borderColor: isSelected ? classicV2Accent : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: surf.bgHex }}
                    />
                    <span className="text-xs font-bold text-white">{surf.label}</span>
                  </div>
                  {isSelected && <Check size={13} style={{ color: classicV2Accent }} />}
                </div>
                <span className="text-[10px] text-zinc-400">{surf.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Accent Palette Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Onyx Hardware Accent</span>
          <span className="text-zinc-500 font-mono text-[10px]">High-Contrast Glow</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {ACCENT_OPTIONS.map((item) => {
            const isSelected = classicV2Accent.toLowerCase() === item.hex.toLowerCase();
            return (
              <button
                key={item.hex}
                type="button"
                onClick={() => {
                  haptics.tick(750);
                  setClassicV2Accent(item.hex);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-zinc-900 border-white/40 shadow-lg'
                    : 'bg-zinc-950/40 border-zinc-800 hover:border-zinc-700'
                }`}
                style={{
                  borderColor: isSelected ? item.hex : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-4 h-4 rounded-full shadow-inner border border-black/30"
                    style={{ backgroundColor: item.hex }}
                  />
                  {isSelected && <Check size={12} style={{ color: item.hex }} />}
                </div>
                <div className="text-[11px] font-semibold text-white leading-tight truncate">{item.name}</div>
                <div className="text-[9px] text-zinc-500 font-mono">{item.hex}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Interactive Onyx Shield Showcase */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Interactive Live Test</span>
            <span className="text-[10px] font-mono text-[#8E8E93]">Hardware Shield UI</span>
          </div>
          <span className="text-[10px] text-zinc-500">v2.4.0 Engine</span>
        </div>

        {/* Embedded Interactive Frame */}
        <div
          className="rounded-3xl border border-white/10 p-4 sm:p-5 relative overflow-hidden transition-colors"
          style={{
            backgroundColor: classicV2Surface === 'pitch-black' ? '#000000' : classicV2Surface === 'carbon' ? '#121217' : '#08080A',
          }}
        >
          {/* Subtle Ambient Radial Glow */}
          <div
            className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-40 blur-3xl pointer-events-none rounded-full opacity-15"
            style={{
              background: `radial-gradient(circle, ${classicV2Accent} 0%, transparent 70%)`,
            }}
          />

          {/* Toast Notification */}
          {toastMessage && (
            <div
              className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-[#141419]/95 border px-4 py-2 rounded-2xl shadow-2xl flex items-center space-x-2 text-xs font-medium text-white backdrop-blur-xl animate-fade-in"
              style={{ borderColor: `${classicV2Accent}50` }}
            >
              <Sparkles className="w-4 h-4" style={{ color: classicV2Accent }} />
              <span>{toastMessage}</span>
            </div>
          )}

          {/* Escape Modal */}
          {showEscapeModal && (
            <div className="absolute inset-0 z-40 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md rounded-3xl">
              <div className="bg-[#121217] border border-red-500/30 rounded-2xl p-5 max-w-xs w-full shadow-2xl space-y-3">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
                    <ShieldAlert className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white">Emergency Escape</h4>
                    <p className="text-[10px] text-[#8E8E93]">Use 1 of {escapeTickets} tickets?</p>
                  </div>
                </div>
                <p className="text-xs text-[#8E8E93] leading-relaxed">
                  Breaking Onyx shield logs an interruption in discipline analytics.
                </p>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowEscapeModal(false)}
                    className="flex-1 py-2 bg-[#1C1C24] hover:bg-[#252530] text-white text-xs font-medium rounded-xl transition border border-white/5"
                  >
                    Stay
                  </button>
                  <button
                    type="button"
                    onClick={confirmEscape}
                    className="flex-1 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-semibold rounded-xl shadow-md transition"
                  >
                    Break Shield
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Demo Content Views */}
          {demoTab === 'focus' && (
            <div className="space-y-4">
              {/* Active Bag Card */}
              <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2.5">
                    <span className="text-lg">💼</span>
                    <div>
                      <span className="text-[9px] uppercase font-mono tracking-widest text-[#8E8E93]">Active Bag</span>
                      <h4 className="text-xs font-semibold text-white">{activeBag}</h4>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDemoTab('bags')}
                    className="px-2.5 py-1 rounded-lg bg-[#1C1C24] hover:bg-[#252530] border border-white/5 text-[10px] font-medium transition flex items-center gap-1"
                    style={{ color: classicV2Accent }}
                  >
                    Switch <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {bags.find((b) => b.name === activeBag)?.apps.map((app, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded-lg bg-[#181820] border border-white/5 text-[#8E8E93] font-mono"
                    >
                      {app}
                    </span>
                  ))}
                </div>
              </div>

              {/* Central Dial Container */}
              <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 shadow-xl flex flex-col items-center justify-center">
                {/* Timer Circle */}
                <div className="relative w-48 h-48 flex items-center justify-center my-2">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="42" className="stroke-[#1C1C24]" strokeWidth="4" fill="none" />
                    <circle
                      cx="50"
                      cy="50"
                      r="42"
                      style={{ stroke: classicV2Accent }}
                      className="transition-all duration-500 ease-out"
                      strokeWidth="4"
                      strokeDasharray="264"
                      strokeDashoffset={isLocked ? 264 - 264 * (timeLeft / (lockDurationMinutes * 60)) : 264}
                      strokeLinecap="round"
                      fill="none"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    {isLocked ? (
                      <>
                        <span
                          className="text-[9px] font-mono tracking-widest uppercase mb-1 flex items-center gap-1"
                          style={{ color: classicV2Accent }}
                        >
                          <Lock className="w-2.5 h-2.5 animate-pulse" /> Shield Active
                        </span>
                        <h2 className="text-3xl font-extrabold tracking-tight text-white font-mono">
                          {formatTime(timeLeft)}
                        </h2>
                        <p className="text-[10px] text-[#8E8E93]">Distractions blocked</p>
                      </>
                    ) : (
                      <>
                        <span className="text-[9px] font-mono tracking-widest text-[#8E8E93] uppercase mb-0.5">
                          Lock Duration
                        </span>
                        <div className="flex items-baseline space-x-1">
                          <h2 className="text-4xl font-black text-white font-mono tracking-tighter">
                            {lockDurationMinutes}
                          </h2>
                          <span className="text-xs font-semibold" style={{ color: classicV2Accent }}>
                            MIN
                          </span>
                        </div>
                        <p className="text-[9px] text-[#8E8E93] mt-0.5">Quick adjust below</p>
                      </>
                    )}
                  </div>
                </div>

                {/* Duration Pickers */}
                {!isLocked && (
                  <div className="w-full space-y-3 mt-1">
                    <div className="flex justify-center gap-1.5 flex-wrap">
                      {[15, 25, 45, 60, 90].map((mins) => (
                        <button
                          key={mins}
                          type="button"
                          onClick={() => {
                            haptics.tick(750);
                            setLockDurationMinutes(mins);
                          }}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-medium transition border ${
                            lockDurationMinutes === mins
                              ? 'text-black font-bold shadow-md'
                              : 'bg-[#181820] text-[#8E8E93] border-white/5 hover:text-white'
                          }`}
                          style={
                            lockDurationMinutes === mins
                              ? { backgroundColor: classicV2Accent, borderColor: classicV2Accent }
                              : undefined
                          }
                        >
                          {mins}m
                        </button>
                      ))}
                    </div>

                    <input
                      type="range"
                      min="5"
                      max="120"
                      step="5"
                      value={lockDurationMinutes}
                      onChange={(e) => setLockDurationMinutes(Number(e.target.value))}
                      className="w-full h-1.5 rounded-lg cursor-pointer bg-[#1C1C24]"
                      style={{ accentColor: classicV2Accent }}
                    />
                  </div>
                )}

                {/* Action Button */}
                <div className="w-full mt-4">
                  {isLocked ? (
                    <button
                      type="button"
                      onClick={requestEmergencyEscape}
                      className="w-full py-3 rounded-xl bg-red-500/10 border border-red-500/25 hover:bg-red-500/20 text-red-400 font-semibold text-xs transition flex items-center justify-center space-x-2"
                    >
                      <Unlock className="w-3.5 h-3.5" />
                      <span>Emergency Escape ({escapeTickets} left)</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={startLock}
                      className="w-full py-3 rounded-xl text-black font-bold text-xs tracking-wide shadow-lg transition flex items-center justify-center space-x-2"
                      style={{
                        background: `linear-gradient(135deg, ${classicV2Accent} 0%, #FF8800 100%)`,
                      }}
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>Engage Onyx Shield</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 gap-2.5">
                <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 shadow-lg">
                  <div className="flex items-center space-x-1.5 text-[#8E8E93] mb-1">
                    <Clock className="w-3.5 h-3.5" style={{ color: classicV2Accent }} />
                    <span className="text-[11px] font-medium">Total Focus</span>
                  </div>
                  <span className="text-lg font-bold font-mono text-white">
                    {Math.floor(totalLockedMinutes / 60)}h {Math.round(totalLockedMinutes % 60)}m
                  </span>
                </div>

                <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3 shadow-lg">
                  <div className="flex items-center space-x-1.5 text-[#8E8E93] mb-1">
                    <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[11px] font-medium">Accessibility</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                    <span className="text-xs font-semibold text-emerald-400">Native Active</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {demoTab === 'analytics' && (
            <div className="space-y-3">
              <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="text-[9px] font-mono tracking-widest text-[#8E8E93] uppercase">
                      Discipline Metrics
                    </span>
                    <h4 className="text-sm font-bold text-white">Activity Heatmap</h4>
                  </div>
                  <BarChart2 className="w-4 h-4" style={{ color: classicV2Accent }} />
                </div>
                <div className="h-24 w-full bg-[#0E0E13] rounded-xl border border-white/5 p-3 flex flex-col justify-between">
                  <div className="flex justify-between items-center text-[10px] text-[#8E8E93]">
                    <span>Weekly Output</span>
                    <span className="font-mono" style={{ color: classicV2Accent }}>
                      +18% vs last week
                    </span>
                  </div>
                  <div className="flex items-end justify-between h-12 gap-1.5">
                    {[40, 65, 30, 85, 95, 70, 90].map((val, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${val}%`,
                            background: `linear-gradient(to top, ${classicV2Accent}30, ${classicV2Accent})`,
                          }}
                        />
                        <span className="text-[8px] font-mono text-[#8E8E93]">
                          {['M', 'T', 'W', 'T', 'F', 'S', 'S'][i]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {demoTab === 'bags' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white">App Bags</h4>
                <button
                  type="button"
                  onClick={() => showToast('Custom bag builder unlocked in ZERO Pro.')}
                  className="px-2 py-0.5 rounded-lg text-black font-bold text-[10px]"
                  style={{ backgroundColor: classicV2Accent }}
                >
                  + New Bag
                </button>
              </div>
              <div className="space-y-2">
                {bags.map((b) => (
                  <div
                    key={b.id}
                    onClick={() => {
                      setActiveBag(b.name);
                      showToast(`Switched active bag to ${b.name}`);
                    }}
                    className={`bg-[#111116]/80 backdrop-blur-xl border rounded-xl p-3 transition cursor-pointer ${
                      activeBag === b.name ? 'shadow-md' : 'border-white/[0.08] hover:border-white/20'
                    }`}
                    style={{
                      borderColor: activeBag === b.name ? classicV2Accent : undefined,
                    }}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">{b.icon}</span>
                        <div>
                          <h5 className="text-xs font-semibold text-white">{b.name}</h5>
                          <span className="text-[9px] text-[#8E8E93] font-mono">{b.apps.length} apps restricted</span>
                        </div>
                      </div>
                      {activeBag === b.name && (
                        <span
                          className="px-2 py-0.5 rounded-full text-[9px] font-mono border"
                          style={{
                            backgroundColor: `${classicV2Accent}20`,
                            color: classicV2Accent,
                            borderColor: `${classicV2Accent}50`,
                          }}
                        >
                          Active
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {b.apps.map((app, idx) => (
                        <span
                          key={idx}
                          className="text-[9px] px-1.5 py-0.5 rounded bg-[#181820] text-[#8E8E93] border border-white/5 font-mono"
                        >
                          {app}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {demoTab === 'settings' && (
            <div className="space-y-2">
              <div className="bg-[#111116]/80 backdrop-blur-xl border border-white/[0.08] rounded-xl p-3.5 space-y-3">
                <h5 className="text-xs font-bold text-white">Onyx System Preferences</h5>

                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <div>
                    <span className="text-xs text-white block font-medium">Strict Accessibility Lock</span>
                    <span className="text-[10px] text-[#8E8E93]">Prevent recent apps & bypass</span>
                  </div>
                  <div
                    onClick={() => setStrictLock(!strictLock)}
                    className="w-9 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: strictLock ? classicV2Accent : '#27272A' }}
                  >
                    <div
                      className={`w-4 h-4 bg-black rounded-full shadow-md transition-transform ${
                        strictLock ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5 border-b border-white/5">
                  <div>
                    <span className="text-xs text-white block font-medium">Haptic Feedback</span>
                    <span className="text-[10px] text-[#8E8E93]">Micro-vibrations on dial rotation</span>
                  </div>
                  <div
                    onClick={() => setHapticFeedback(!hapticFeedback)}
                    className="w-9 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: hapticFeedback ? classicV2Accent : '#27272A' }}
                  >
                    <div
                      className={`w-4 h-4 bg-black rounded-full shadow-md transition-transform ${
                        hapticFeedback ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between py-1.5">
                  <div>
                    <span className="text-xs text-white block font-medium">AMOLED True-Black Mode</span>
                    <span className="text-[10px] text-[#8E8E93]">Pure #000000 obsidian</span>
                  </div>
                  <div
                    onClick={() => {
                      const next = !amoledTrueBlack;
                      setAmoledTrueBlack(next);
                      setClassicV2Surface(next ? 'pitch-black' : 'obsidian');
                    }}
                    className="w-9 h-5 rounded-full relative p-0.5 cursor-pointer transition-colors"
                    style={{ backgroundColor: amoledTrueBlack ? classicV2Accent : '#27272A' }}
                  >
                    <div
                      className={`w-4 h-4 bg-black rounded-full shadow-md transition-transform ${
                        amoledTrueBlack ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Floating Pill Navigation Dock */}
          <div className="mt-4 pt-2 flex justify-center">
            <nav className="bg-[#111116]/90 backdrop-blur-2xl border border-white/10 rounded-full px-2 py-1 shadow-2xl flex items-center space-x-1">
              {[
                { id: 'focus' as const, icon: Shield, label: 'Focus' },
                { id: 'analytics' as const, icon: BarChart2, label: 'Analytics' },
                { id: 'bags' as const, icon: Smartphone, label: 'Bags' },
                { id: 'settings' as const, icon: Settings, label: 'Settings' },
              ].map((tab) => {
                const Icon = tab.icon;
                const isActive = demoTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      haptics.tick(750);
                      setDemoTab(tab.id);
                    }}
                    className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full transition-all text-xs ${
                      isActive ? 'font-bold text-black shadow-md' : 'text-[#8E8E93] hover:text-white'
                    }`}
                    style={isActive ? { backgroundColor: classicV2Accent } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      </div>
    </div>
  );
};
