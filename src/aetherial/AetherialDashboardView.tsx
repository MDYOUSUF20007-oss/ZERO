import React, { useState, useMemo } from 'react';
import type { ZeroProfile, OccasionBag, ParachuteMetrics, SessionRecord } from '../types';
import { voidAudio } from '../utils/voidAudio';
import { haptics } from '../utils/haptics';
import {
  Sparkles,
  Timer,
  TrendingDown,
  Play,
  Briefcase,
  Flame,
  Ticket,
  Brain,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AetherialDashboardViewProps {
  profile?: ZeroProfile | null;
  activeBag: OccasionBag;
  bags: OccasionBag[];
  parachuteMetrics: ParachuteMetrics;
  sessions: SessionRecord[];
  currentStreak: number;
  todayReclaimedHours: number;
  onSelectActiveBag: (id: string) => void;
  onIgniteSession: (durationSeconds: number, tag: string) => boolean;
  onOpenBagDrawer?: () => void;
}

export const AetherialDashboardView: React.FC<AetherialDashboardViewProps> = ({
  profile,
  activeBag,
  bags,
  parachuteMetrics,
  sessions: _sessions,
  currentStreak,
  todayReclaimedHours,
  onSelectActiveBag,
  onIgniteSession,
  onOpenBagDrawer,
}) => {
  const [selectedDuration, setSelectedDuration] = useState<number>(50);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(false);

  const userName = profile?.displayName || 'Explorer';
  const motto = profile?.motto || 'Your attention is your superpower';

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const handleStartSession = () => {
    haptics.lockEngaged();
    onIgniteSession(selectedDuration * 60, activeBag.name);
  };

  const handleToggleSound = () => {
    haptics.tick(700);
    if (isAudioMuted) {
      voidAudio.play('gamma40');
      setIsAudioMuted(false);
    } else {
      voidAudio.stop();
      setIsAudioMuted(true);
    }
  };

  const focusScore = useMemo(() => {
    const base = 85;
    const bonus = Math.min(15, currentStreak * 2);
    return Math.min(99, base + bonus);
  }, [currentStreak]);

  const presetDurations = [
    { label: '25m Pomodoro', mins: 25 },
    { label: '50m Deep Block', mins: 50 },
    { label: '90m Exam Prep', mins: 90 },
  ];

  return (
    <div className="flex-1 flex flex-col relative w-full px-4 sm:px-6 pt-4 pb-28 select-none font-sans text-[#e2e1ed] space-y-4">
      {/* Greeting & Daily State of Mind */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-[#e2e1ed]">
              {greeting}, {userName}
            </h1>
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-ping" />
          </div>
          <p className="text-xs text-[#bdc8d1] mt-0.5">
            Let&apos;s protect your cognitive bandwidth today.
          </p>
        </div>
        <div className="w-10 h-10 rounded-full bg-[#282a32] flex items-center justify-center text-[#38bdf8] shadow-sm">
          <Sparkles size={20} />
        </div>
      </div>

      {/* Motivational Insight Pill */}
      <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#191b24]/90 border border-white/5 shadow-sm max-w-fit">
        <Sparkles size={14} className="text-[#38bdf8]" />
        <span className="text-[11px] font-semibold text-[#c4e7ff] tracking-tight">{motto}</span>
        <span className="text-[#87929a] text-[11px]">· Day {Math.max(1, currentStreak)}</span>
      </div>

      {/* Screen Time Dial & Cognitive Load Hero Card */}
      <div className="relative w-full rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5 overflow-hidden">
        {/* Atmospheric auras */}
        <div className="absolute -top-12 -right-12 w-48 h-48 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-44 h-44 bg-[#4edea3]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col">
          {/* Card Top Meta */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Timer size={18} className="text-[#38bdf8]" />
              <span className="text-xs font-semibold text-[#bdc8d1] uppercase tracking-wider">
                Screen Time Today
              </span>
            </div>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] flex items-center gap-1">
              <TrendingDown size={13} />
              −42% vs yesterday
            </span>
          </div>

          {/* Main Dial & Quantitative Readout */}
          <div className="flex items-center justify-between mt-4 gap-4">
            <div className="flex flex-col justify-center">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-light text-[#e2e1ed] tracking-tight">
                  {Math.floor(todayReclaimedHours || 2)}
                  <span className="text-xl font-normal text-[#bdc8d1]">h </span>
                  {Math.round(((todayReclaimedHours || 2.23) % 1) * 60)}
                  <span className="text-xl font-normal text-[#bdc8d1]">m</span>
                </span>
              </div>
              <p className="text-xs text-[#bdc8d1] mt-1">
                Goal: <strong className="text-[#e2e1ed]">3h 30m</strong> ceiling
              </p>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#282a32]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
                  <span className="text-[11px] text-[#e2e1ed] font-medium">1h 16m left</span>
                </div>
                <span className="text-[11px] text-[#87929a]">Healthy zone</span>
              </div>
            </div>

            {/* Circular Progress Ring (64%) */}
            <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle
                  className="text-[#33343d]"
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="currentColor"
                  strokeWidth="7"
                />
                <circle
                  cx="50"
                  cy="50"
                  fill="transparent"
                  r="40"
                  stroke="url(#dashboardRingGrad)"
                  strokeDasharray="251.2"
                  strokeDashoffset="90"
                  strokeLinecap="round"
                  strokeWidth="7.5"
                />
                <defs>
                  <linearGradient id="dashboardRingGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#38bdf8" />
                    <stop offset="100%" stopColor="#4edea3" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.7)] flex items-center justify-center" />
                <span className="text-[10px] text-[#bdc8d1] font-bold mt-1">64%</span>
              </div>
            </div>
          </div>

          {/* Category Split Micro-bar */}
          <div className="mt-4 pt-2">
            <div className="w-full h-2 rounded-full bg-[#33343d] flex overflow-hidden p-0.5">
              <div className="h-full bg-[#38bdf8] rounded-full" style={{ width: '78%' }} />
              <div className="h-full bg-[#ffb4ab] rounded-full ml-1" style={{ width: '22%' }} />
            </div>
            <div className="flex items-center justify-between mt-2 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
                <span className="text-[#e2e1ed] font-medium">Study &amp; Tools</span>
                <span className="text-[#87929a]">1h 45m</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#ffb4ab]" />
                <span className="text-[#e2e1ed] font-medium">Distractions</span>
                <span className="text-[#87929a]">29m</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Ignite Focus Block */}
      <div className="flex flex-col space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-[#e2e1ed]">Ignite Focus</h2>
            <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
          </div>
          <span className="text-xs text-[#38bdf8] font-medium">Deep Work Sentinel</span>
        </div>

        {/* Duration Slider / Presets */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {presetDurations.map((p) => {
            const isSel = selectedDuration === p.mins;
            return (
              <button
                key={p.mins}
                type="button"
                onClick={() => {
                  haptics.tick(700);
                  setSelectedDuration(p.mins);
                }}
                className={`px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap active:scale-95 transition-all cursor-pointer ${
                  isSel
                    ? 'bg-[#38bdf8] text-[#001e2c] shadow-[0_0_16px_rgba(56,189,248,0.4)]'
                    : 'bg-[#191b24]/80 text-[#87929a] hover:text-[#e2e1ed] border border-white/5'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        {/* Active Study Bag Selection Strip */}
        <div className="rounded-xl bg-[#191b24]/80 backdrop-blur-md p-3.5 flex flex-col space-y-2 border border-white/5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase size={16} className="text-[#38bdf8]" />
              <span className="text-xs font-semibold text-[#e2e1ed]">Target Study Bag</span>
            </div>
            <button
              type="button"
              onClick={onOpenBagDrawer}
              className="text-[11px] text-[#4edea3] font-semibold bg-[#00a572]/20 px-2 py-0.5 rounded-full hover:bg-[#00a572]/30 cursor-pointer"
            >
              Active Shield: {activeBag.name}
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
            {bags.map((b) => {
              const isCur = b.id === activeBag.id;
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    haptics.tick(600);
                    onSelectActiveBag(b.id);
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 whitespace-nowrap cursor-pointer transition-all ${
                    isCur
                      ? 'bg-[#282a32] text-[#38bdf8] border border-[#38bdf8]/40 shadow-sm'
                      : 'bg-[#1d1f28] text-[#87929a] hover:text-[#e2e1ed] border border-white/5'
                  }`}
                >
                  <span>{(b as any).icon || '🎒'}</span>
                  <span>{b.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Big Start Focus Button */}
        <button
          type="button"
          onClick={handleStartSession}
          className="relative group w-full py-4 px-6 rounded-full bg-[#38bdf8] text-[#001e2c] flex items-center justify-center gap-3 shadow-[0_0_24px_rgba(56,189,248,0.38)] active:scale-[0.98] transition-all cursor-pointer font-bold text-base"
        >
          <Play size={20} fill="currentColor" />
          <span>Ignite {selectedDuration}m Focus Session</span>
        </button>
      </div>

      {/* Daily Momentum Mini KPI Bento Grid */}
      <div className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between px-1">
          <span className="text-sm font-bold text-[#e2e1ed]">Daily Momentum</span>
          <span className="text-xs text-[#38bdf8]">Real-time telemetry</span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          {/* Focus Score */}
          <div className="rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col justify-between shadow-sm border border-white/5">
            <div className="flex items-center justify-between text-[#87929a] mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Score</span>
              <Brain size={16} className="text-[#38bdf8]" />
            </div>
            <div className="flex items-baseline gap-0.5">
              <span className="text-2xl font-bold text-[#38bdf8]">{focusScore}</span>
              <span className="text-xs text-[#87929a]">/100</span>
            </div>
            <span className="text-[10px] text-[#4edea3] mt-1 font-semibold flex items-center gap-0.5">
              Peak state ↗
            </span>
          </div>

          {/* Escape Passes */}
          <div className="rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col justify-between shadow-sm border border-white/5">
            <div className="flex items-center justify-between text-[#87929a] mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Passes</span>
              <Ticket size={16} className="text-[#4edea3]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#e2e1ed]">
                {parachuteMetrics.currentBalance}
              </span>
              <span className="text-xs text-[#4edea3] font-semibold">left</span>
            </div>
            <span className="text-[10px] text-[#87929a] mt-1">Emergency use</span>
          </div>

          {/* Streak */}
          <div className="rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col justify-between shadow-sm border border-white/5">
            <div className="flex items-center justify-between text-[#87929a] mb-1">
              <span className="text-[11px] uppercase tracking-wider font-semibold">Streak</span>
              <Flame size={16} className="text-[#fbbf24]" />
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-[#fbbf24]">{currentStreak}</span>
              <span className="text-xs text-[#87929a]">Days</span>
            </div>
            <span className="text-[10px] text-[#87929a] mt-1">
              Best: {Math.max(currentStreak, 7)}d
            </span>
          </div>
        </div>
      </div>

      {/* Deep Study Ambient Companion Preview */}
      <div className="rounded-xl bg-[#191b24]/70 backdrop-blur-sm p-3.5 flex items-center justify-between shadow-sm border border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#282a32] flex items-center justify-center text-[#38bdf8]">
            {isAudioMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </div>
          <div className="flex flex-col">
            <span className="text-xs font-semibold text-[#e2e1ed]">
              Soundscape: Lo-Fi Deep Space
            </span>
            <span className="text-[11px] text-[#bdc8d1]">432Hz Binaural Focus • Ready</span>
          </div>
        </div>
        <button
          type="button"
          onClick={handleToggleSound}
          className="w-9 h-9 rounded-full bg-[#33343d] flex items-center justify-center text-[#e2e1ed] hover:text-[#38bdf8] active:scale-95 transition-all cursor-pointer"
        >
          {isAudioMuted ? <Play size={16} fill="currentColor" /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
};
