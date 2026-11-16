import React, { useState, useMemo } from 'react';
import type { ParachuteMetrics, SessionRecord, ZeroProfile } from '../types';
import {
  BarChart3,
  Calendar,
  Flame,
  Ticket,
  Brain,
  Timer,
  TrendingDown,
  Award,
  ShieldCheck,
  CheckCircle2,
  Lock,
} from 'lucide-react';

interface AetherialAnalyticsViewProps {
  parachuteMetrics: ParachuteMetrics;
  sessions: SessionRecord[];
  profile?: ZeroProfile | null;
  currentStreak: number;
  todayReclaimedHours: number;
}

export const AetherialAnalyticsView: React.FC<AetherialAnalyticsViewProps> = ({
  parachuteMetrics,
  sessions,
  currentStreak,
  todayReclaimedHours,
}) => {
  const [filterPeriod, setFilterPeriod] = useState<'week' | 'today' | 'month' | 'all'>('week');

  const totalSessionHours = useMemo(() => {
    const totalSec = sessions.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
    return Math.round((totalSec / 3600) * 10) / 10;
  }, [sessions]);

  // Compute 35 cells for 5 weeks x 7 days
  const matrixCells = useMemo(() => {
    // Generate 35 cells with realistic focus intensities based on sessions
    const cells = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      // Mock / session driven intensity: 0 to 4
      const level = (i * 7 + 3) % 5;
      cells.push({ id: i, level });
    }
    return cells;
  }, []);

  const getCellColor = (lvl: number) => {
    switch (lvl) {
      case 1:
        return 'bg-[#4edea3]/30';
      case 2:
        return 'bg-[#4edea3]/60';
      case 3:
        return 'bg-[#38bdf8]/70';
      case 4:
        return 'bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.4)]';
      default:
        return 'bg-[#33343d]/60';
    }
  };

  const nextPassProgress = useMemo(() => {
    // 35 hours per parachute milestone
    const pct = Math.min(100, Math.max(0, Math.round(parachuteMetrics.progressPercentage || 0)));
    const hours = Math.floor((parachuteMetrics.currentProgressSeconds || 0) / 3600);
    return { pct, hours };
  }, [parachuteMetrics]);

  return (
    <div className="flex-1 flex flex-col relative w-full px-4 sm:px-6 pt-4 pb-28 select-none font-sans text-[#e2e1ed] space-y-4">
      {/* Header Section with Title & Filter Pills */}
      <div className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-[#38bdf8] uppercase tracking-wider">
              Cognitive Performance
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e2e1ed] tracking-tight">
              Discipline Insights
            </h1>
          </div>
          <div className="w-10 h-10 rounded-full bg-[#1d1f28] flex items-center justify-center text-[#38bdf8] shadow-sm border border-white/5">
            <BarChart3 size={20} />
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto py-1 no-scrollbar">
          {[
            { id: 'week', label: 'This Week' },
            { id: 'today', label: 'Today' },
            { id: 'month', label: 'This Month' },
            { id: 'all', label: 'All-Time' },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilterPeriod(item.id as any)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all shrink-0 active:scale-95 cursor-pointer ${
                filterPeriod === item.id
                  ? 'bg-[#38bdf8] text-[#001e2c] shadow-[0_0_16px_rgba(56,189,248,0.35)]'
                  : 'bg-[#282a32]/60 text-[#bdc8d1] hover:text-[#e2e1ed] border border-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Screen Time Today Overview Analytical Card */}
      <div className="rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-12 -left-10 w-36 h-36 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div>
            <div className="flex items-center gap-1.5">
              <Timer size={16} className="text-[#38bdf8]" />
              <span className="text-[11px] font-bold text-[#bdc8d1] uppercase tracking-wider">
                Screen Time Today
              </span>
            </div>
            <div className="flex items-baseline gap-2 mt-1">
              <h2 className="text-3xl font-bold text-[#e2e1ed] tracking-tight">
                {Math.floor(todayReclaimedHours || 2)}h {Math.round(((todayReclaimedHours || 2.23) % 1) * 60)}m
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] text-[11px] font-semibold flex items-center gap-0.5">
                <TrendingDown size={13} />
                −42% vs yesterday
              </span>
            </div>
            <p className="text-[11px] text-[#bdc8d1] mt-1 flex items-center gap-1.5">
              <span>3h 30m ceiling</span>
              <span>•</span>
              <span className="text-[#4edea3] font-semibold">1h 16m left</span>
              <span>•</span>
              <span className="text-[#38bdf8]">Healthy Zone</span>
            </p>
          </div>

          {/* Circular Ring Indicator */}
          <div className="relative w-16 h-16 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" fill="none" r="26" stroke="#282a32" strokeWidth="4.5" />
              <circle
                className="drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                cx="32"
                cy="32"
                fill="none"
                r="26"
                stroke="#38bdf8"
                strokeDasharray="163.36"
                strokeDashoffset="58.8"
                strokeLinecap="round"
                strokeWidth="4.5"
              />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xs font-bold text-[#e2e1ed] leading-none">64%</span>
              <span className="text-[9px] text-[#87929a] leading-none mt-0.5">of cap</span>
            </div>
          </div>
        </div>

        {/* Dual Distribution Bar */}
        <div className="mt-4 pt-1 relative z-10">
          <div className="h-2.5 w-full rounded-full bg-[#33343d]/60 overflow-hidden flex p-0.5 gap-0.5">
            <div
              className="h-full rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.6)]"
              style={{ width: '78%' }}
            />
            <div className="h-full rounded-full bg-[#a7a9ff]" style={{ width: '22%' }} />
          </div>
          <div className="flex items-center justify-between text-xs mt-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_6px_rgba(56,189,248,0.6)]" />
              <span className="text-[#e2e1ed] font-medium">
                Study &amp; Tools <span className="text-[#87929a]">1h 45m</span>
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#a7a9ff]" />
              <span className="text-[#87929a]">
                Distractions <span className="text-[#e2e1ed] font-medium">29m</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Momentum Trio Cards */}
      <div className="grid grid-cols-3 gap-2 relative z-10">
        <div className="rounded-xl bg-[#191b24]/90 p-3 flex flex-col justify-between shadow-md border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#87929a] uppercase tracking-wider font-semibold">Focus</span>
            <Brain size={14} className="text-[#38bdf8]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold text-[#e2e1ed]">94</span>
            <span className="text-xs text-[#87929a]">/100</span>
          </div>
          <span className="text-[10px] text-[#4edea3] font-semibold truncate">Peak state ↗</span>
        </div>

        <div className="rounded-xl bg-[#191b24]/90 p-3 flex flex-col justify-between shadow-md border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#87929a] uppercase tracking-wider font-semibold">Passes</span>
            <Ticket size={14} className="text-[#4edea3]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold text-[#e2e1ed]">{parachuteMetrics.currentBalance}</span>
            <span className="text-xs text-[#4edea3] font-semibold ml-1">Left</span>
          </div>
          <span className="text-[10px] text-[#87929a] truncate">Emergency use</span>
        </div>

        <div className="rounded-xl bg-[#191b24]/90 p-3 flex flex-col justify-between shadow-md border border-white/5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#87929a] uppercase tracking-wider font-semibold">Streak</span>
            <Flame size={14} className="text-[#fbbf24]" />
          </div>
          <div className="my-1">
            <span className="text-xl font-bold text-[#fbbf24]">{currentStreak}</span>
            <span className="text-xs text-[#87929a] ml-1">Days</span>
          </div>
          <span className="text-[10px] text-[#87929a] truncate">Best: 12 days</span>
        </div>
      </div>

      {/* Focus Consistency Matrix (7x5 Grid) */}
      <div className="rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5 relative overflow-hidden">
        <div className="absolute -top-12 -right-12 w-40 h-40 bg-[#4edea3]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar size={18} className="text-[#4edea3]" />
            <h2 className="text-sm font-bold text-[#e2e1ed]">Focus Consistency Matrix</h2>
          </div>
          <span className="text-[10px] text-[#4edea3] bg-[#00a572]/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
            Active Orbit
          </span>
        </div>

        {/* 7 Columns x 5 Weeks Grid */}
        <div className="flex flex-col space-y-2 mb-3">
          {/* Weekday Indicators */}
          <div className="grid grid-cols-7 gap-1.5 text-center text-[#87929a] text-[10px] font-bold">
            <span>M</span>
            <span>T</span>
            <span>W</span>
            <span>T</span>
            <span>F</span>
            <span>S</span>
            <span>S</span>
          </div>

          {/* 35 Cells Matrix */}
          <div className="grid grid-cols-7 gap-1.5">
            {matrixCells.map((c) => (
              <div
                key={c.id}
                className={`h-6 rounded-md flex items-center justify-center transition-all hover:scale-105 cursor-pointer ${getCellColor(
                  c.level
                )}`}
              />
            ))}
          </div>
        </div>

        {/* Matrix Legend */}
        <div className="flex items-center justify-between pt-1 text-[#87929a] text-[10px]">
          <span>Less Focus</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-[#33343d]" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4edea3]/30" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#4edea3]/60" />
            <span className="w-2.5 h-2.5 rounded-sm bg-[#38bdf8]" />
          </div>
          <span>Deep Focus (&gt;4h/day)</span>
        </div>

        {/* Cohort Callout Banner */}
        <div className="mt-4 p-3 rounded-xl bg-[#282a32]/70 border border-white/5 flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-[#00a572]/20 flex items-center justify-center text-[#4edea3] shrink-0">
            <ShieldCheck size={18} />
          </div>
          <p className="text-xs text-[#e2e1ed]">
            <strong className="text-[#38bdf8]">{totalSessionHours || 28.5} hrs</strong> logged ·{' '}
            <span className="text-[#4edea3] font-semibold">Top 5%</span> of student cohort
          </p>
        </div>
      </div>

      {/* Attention Distribution Section */}
      <div className="rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#e2e1ed]">Attention Distribution</h2>
          <span className="text-[11px] text-[#87929a]">Last 7 Days</span>
        </div>

        <div className="h-3 w-full rounded-full bg-[#33343d]/60 overflow-hidden flex p-0.5 gap-0.5">
          <div className="h-full rounded-full bg-[#38bdf8]" style={{ width: '68%' }} />
          <div className="h-full rounded-full bg-[#3e484f]" style={{ width: '22%' }} />
          <div className="h-full rounded-full bg-[#a7a9ff]" style={{ width: '10%' }} />
        </div>

        <div className="flex items-center justify-between text-xs pt-1">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#38bdf8]" />
            <span className="text-[#e2e1ed]">68% Deep Study</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3e484f]" />
            <span className="text-[#87929a]">22% Utilities</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#a7a9ff]" />
            <span className="text-[#87929a]">10% Leisure</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 pt-2">
          <div className="rounded-xl bg-[#282a32]/60 p-3 border border-white/5">
            <span className="text-[10px] text-[#4edea3] uppercase font-bold">Hours Saved</span>
            <div className="text-xl font-bold text-[#e2e1ed] mt-1">14.2h</div>
            <p className="text-[10px] text-[#87929a]">Reclaimed from social feeds</p>
          </div>
          <div className="rounded-xl bg-[#282a32]/60 p-3 border border-white/5">
            <span className="text-[10px] text-[#38bdf8] uppercase font-bold">Avg Session</span>
            <div className="text-xl font-bold text-[#e2e1ed] mt-1">48m</div>
            <p className="text-[10px] text-[#4edea3]">+12m vs previous cycle</p>
          </div>
        </div>
      </div>

      {/* The Escape Chamber Section */}
      <div className="rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5 relative overflow-hidden">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#282a32] flex items-center justify-center text-[#38bdf8] shadow-inner">
              <Ticket size={20} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-[#e2e1ed]">Escape Chamber</h2>
              <span className="text-[11px] text-[#87929a]">Emergency unlock autonomy</span>
            </div>
          </div>
          <div className="px-3 py-1 rounded-full bg-[#00a572]/20 text-[#4edea3] text-xs font-bold shadow-sm">
            {parachuteMetrics.currentBalance} Available
          </div>
        </div>

        {/* Circular Ring & Milestone Progress */}
        <div className="mt-4 p-3 rounded-xl bg-[#282a32]/60 border border-white/5 flex items-center gap-4">
          <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 64 64">
              <circle cx="32" cy="32" fill="none" r="26" stroke="#33343d" strokeWidth="4.5" />
              <circle
                className="drop-shadow-[0_0_6px_rgba(56,189,248,0.7)]"
                cx="32"
                cy="32"
                fill="none"
                r="26"
                stroke="#38bdf8"
                strokeDasharray="163.36"
                strokeDashoffset={163.36 - (nextPassProgress.pct / 100) * 163.36}
                strokeLinecap="round"
                strokeWidth="4.5"
              />
            </svg>
            <span className="absolute w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-[#e2e1ed]">Next Pass Progress</span>
              <span className="font-bold text-[#38bdf8]">{nextPassProgress.pct}%</span>
            </div>
            <p className="text-[11px] text-[#bdc8d1] mt-0.5">
              <strong className="text-[#e2e1ed]">{nextPassProgress.hours}h</strong> / 35h verified deep work
            </p>
            <div className="w-full h-1.5 rounded-full bg-[#33343d] mt-2 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#4edea3] to-[#38bdf8] rounded-full"
                style={{ width: `${nextPassProgress.pct}%` }}
              />
            </div>
          </div>
        </div>

        <p className="mt-2 text-[11px] text-[#87929a] flex items-center gap-1.5 px-1">
          <CheckCircle2 size={13} className="text-[#4edea3]" />
          Earned through genuine verified focus time. Zero paywalls.
        </p>
      </div>

      {/* Discipline Relics Section */}
      <div className="flex flex-col space-y-2 pb-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Award size={18} className="text-[#38bdf8]" />
            <h2 className="text-sm font-bold text-[#e2e1ed]">Discipline Relics</h2>
          </div>
          <span className="text-[11px] font-semibold text-[#4edea3] bg-[#00a572]/20 px-2 py-0.5 rounded-full">
            3 / 8
          </span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 no-scrollbar">
          {/* Badge 1 */}
          <div className="w-36 shrink-0 rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col items-center text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-[#00a572]/20 flex items-center justify-center text-[#4edea3] relative mb-2 shadow-[0_0_16px_rgba(78,222,163,0.3)]">
              <Award size={22} />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#4edea3] flex items-center justify-center text-[#001e2c] text-[10px] font-bold">
                ✓
              </span>
            </div>
            <span className="text-xs font-semibold text-[#e2e1ed] truncate w-full">First 10h</span>
            <span className="text-[10px] text-[#4edea3] mt-0.5">Unlocked 🏅</span>
            <span className="text-[10px] text-[#87929a] mt-1">Foundational Focus</span>
          </div>

          {/* Badge 2 */}
          <div className="w-36 shrink-0 rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col items-center text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] relative mb-2 shadow-[0_0_16px_rgba(56,189,248,0.3)]">
              <Flame size={22} />
              <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-[#4edea3] flex items-center justify-center text-[#001e2c] text-[10px] font-bold">
                ✓
              </span>
            </div>
            <span className="text-xs font-semibold text-[#e2e1ed] truncate w-full">7-Day Streak</span>
            <span className="text-[10px] text-[#38bdf8] mt-0.5">Unlocked ⚡</span>
            <span className="text-[10px] text-[#87929a] mt-1">Zero Breakdowns</span>
          </div>

          {/* Badge 3 */}
          <div className="w-36 shrink-0 rounded-xl bg-[#191b24]/90 p-3.5 flex flex-col items-center text-center border border-white/5">
            <div className="w-12 h-12 rounded-full bg-[#282a32] flex items-center justify-center text-[#87929a] relative mb-2">
              <ShieldCheck size={22} />
              <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-[#38bdf8] animate-pulse" />
            </div>
            <span className="text-xs font-semibold text-[#e2e1ed] truncate w-full">Centurion</span>
            <span className="text-[10px] text-[#7bd0ff] mt-0.5">62% (62/100h)</span>
            <div className="w-16 h-1 bg-[#33343d] rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-[#38bdf8] rounded-full" style={{ width: '62%' }} />
            </div>
          </div>

          {/* Badge 4 */}
          <div className="w-36 shrink-0 rounded-xl bg-[#191b24]/50 p-3.5 flex flex-col items-center text-center border border-white/5 opacity-50">
            <div className="w-12 h-12 rounded-full bg-[#282a32] flex items-center justify-center text-[#87929a] mb-2">
              <Lock size={20} />
            </div>
            <span className="text-xs font-semibold text-[#87929a] truncate w-full">Zero Monk</span>
            <span className="text-[10px] text-[#87929a] mt-0.5">Locked 🔒</span>
            <span className="text-[10px] text-[#87929a] mt-1">10h Continuous</span>
          </div>
        </div>
      </div>
    </div>
  );
};
