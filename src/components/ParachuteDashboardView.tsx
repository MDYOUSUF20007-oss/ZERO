import React, { useState, useMemo } from 'react';
import type {
  ParachuteMetrics,
  ParachuteLedgerEntry,
  SessionRecord,
  ZeroProfile,
} from '../types';
import { ShareStatsModal } from './ShareStatsModal';
import { ACCENT_STYLES, ProfileAvatar } from './ProfileAvatar';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges, type AchievementBadgeId } from '../utils/achievements';
import {
  AchievementBadgeCard,
  AchievementBadgePill,
  ZeroSupporterGoldenBadge,
} from './AchievementBadgeChip';
import {
  Flame,
  Award,
  Clock,
  TrendingUp,
  Calendar,
  Share2,
  CheckCircle2,
  AlertOctagon,
  Moon,
  Gift,
  Sparkles,
  SlidersHorizontal,
  Trophy,
} from 'lucide-react';

interface ParachuteDashboardViewProps {
  parachuteMetrics: ParachuteMetrics;
  ledger: ParachuteLedgerEntry[];
  sessions: SessionRecord[];
  profile: ZeroProfile | null;
  isZeroSupporter: boolean;
  hasClaimedFirstTimeParachute: boolean;
  todayReclaimedHours: number;
  justEarnedParachute: boolean;
  onOpenProfileModal: () => void;
}

export const ParachuteDashboardView: React.FC<ParachuteDashboardViewProps> = ({
  parachuteMetrics,
  ledger,
  sessions,
  profile,
  isZeroSupporter,
  hasClaimedFirstTimeParachute,
  todayReclaimedHours,
  justEarnedParachute,
  onOpenProfileModal,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sessions'>('overview');
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<AchievementBadgeId | null>(null);

  const totalParachuteHours = parachuteMetrics.totalCumulativeHours;
  const totalReclaimedHours = parachuteMetrics.totalReclaimedHours;

  const totalSessions = sessions.length;
  const completedSessions = sessions.filter((s) => s.status === 'completed').length;
  const parachutedSessions = sessions.filter((s) => s.status === 'parachuted').length;
  const completionRate =
    totalSessions > 0 ? Math.round((completedSessions / totalSessions) * 100) : 0;

  const avgSessionMins = useMemo(() => {
    if (completedSessions === 0) return 0;
    const sum = sessions
      .filter((s) => s.status === 'completed')
      .reduce((acc, s) => acc + s.durationSeconds, 0);
    return Math.round(sum / completedSessions / 60);
  }, [sessions, completedSessions]);

  // Honest Daily Streak (0 when no completed sessions)
  const currentStreak = useMemo(() => {
    const completed = sessions.filter((s) => s.status === 'completed');
    if (completed.length === 0) return 0;
    const completedDates = new Set(completed.map((s) => s.dateStr));
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const str = d.toISOString().split('T')[0];
      if (completedDates.has(str)) {
        streak++;
      } else if (i === 0) {
        continue;
      } else {
        break;
      }
    }
    return streak;
  }, [sessions]);

  const tagBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    sessions
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        map[s.tag] = (map[s.tag] || 0) + s.durationSeconds / 3600;
      });

    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(...entries.map((e) => e[1]), 1);
    return entries.map(([tag, hours]) => ({
      tag,
      hours: Number(hours.toFixed(1)),
      pct: Math.round((hours / maxVal) * 100),
    }));
  }, [sessions]);

  const heatmapData = useMemo(() => {
    const dailyHoursMap: Record<string, number> = {};
    sessions
      .filter((s) => s.status === 'completed')
      .forEach((s) => {
        dailyHoursMap[s.dateStr] = (dailyHoursMap[s.dateStr] || 0) + s.durationSeconds / 3600;
      });

    const days = [];
    const today = new Date();
    for (let i = 111; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const hours = dailyHoursMap[dateStr] || 0;
      let level = 0;
      if (hours > 0 && hours < 1.5) level = 1;
      else if (hours >= 1.5 && hours < 3.5) level = 2;
      else if (hours >= 3.5 && hours < 6) level = 3;
      else if (hours >= 6) level = 4;

      days.push({
        dateStr,
        dayOfWeek: d.getDay(),
        hours: Number(hours.toFixed(1)),
        level,
      });
    }
    return days;
  }, [sessions]);

  const badgeSummary = useMemo(
    () =>
      evaluateBadges({
        sessions,
        totalReclaimedHours,
        isZeroSupporter,
      }),
    [sessions, totalReclaimedHours, isZeroSupporter]
  );
  const unlockedFocusBadges = badgeSummary.unlockedBadges.filter(
    (b) => b.id !== 'zero_supporter'
  );

  const profileRank = getZeroRankFromHours(totalReclaimedHours);
  const profileAccent = profile
    ? ACCENT_STYLES[profile.accentColor] || ACCENT_STYLES.amber
    : ACCENT_STYLES.amber;
  const dailyGoalPct = profile
    ? Math.min(100, Math.round((todayReclaimedHours / Math.max(1, profile.dailyGoalHours)) * 100))
    : 0;
  const milestoneEarnedCount = Math.max(
    0,
    parachuteMetrics.lifetimeEarnedParachutes - parachuteMetrics.bonusParachutes
  );

  return (
    <div className="flex flex-col gap-5 px-4 py-4 max-w-md mx-auto w-full select-none pb-24">
      {/* Header + Shareable Flex Stats Card Trigger */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-xl font-mono font-black tracking-tight text-white flex items-center gap-2">
            <span>ESCAPE TICKETS &amp; METRICS</span>
          </h1>
          <p className="text-xs font-mono text-zinc-400">
            100% Real Focus Metrics • Zero Fake Data
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowShareModal(true)}
          className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-mono font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all shrink-0"
        >
          <Share2 size={13} />
          <span>Flex Stats</span>
        </button>
      </div>

      {/* Interactive Zero Profile Card */}
      {profile ? (
        <div
          className={`bg-zinc-950 border-2 rounded-3xl p-4 font-mono space-y-3 transition-all ${profileAccent.border} ${profileAccent.glow}`}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileAvatar
                avatarId={profile.avatarId}
                accent={profile.accentColor}
                size="md"
                interactive
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-sm text-white truncate">
                    {profile.displayName}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${profileAccent.badgeBg}`}
                  >
                    {profileRank.title}
                  </span>
                  {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {profile.handle} • #{profile.primaryMission}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onOpenProfileModal}
              className="px-2.5 py-1.5 rounded-xl bg-zinc-900 border border-zinc-700 hover:border-zinc-500 text-[10px] font-bold text-zinc-200 flex items-center gap-1 shrink-0"
            >
              <SlidersHorizontal size={11} />
              <span>Edit</span>
            </button>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-zinc-400">Daily Goal Progress</span>
              <span className={`font-bold ${profileAccent.text}`}>
                {todayReclaimedHours} / {profile.dailyGoalHours}h today ({dailyGoalPct}%)
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-zinc-900 border border-zinc-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${profileAccent.bar}`}
                style={{ width: `${dailyGoalPct}%` }}
              />
            </div>
          </div>

          {unlockedFocusBadges.length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1 border-t border-zinc-900">
              {unlockedFocusBadges.map((b) => (
                <AchievementBadgePill key={b.id} badge={b} />
              ))}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 text-[10px] text-zinc-400 pt-1 border-t border-zinc-900">
            <span className="italic truncate">&ldquo;{profile.motto}&rdquo;</span>
            {profileRank.nextTitle && (
              <span className="shrink-0 text-zinc-500">
                {profileRank.hoursToNext}h to {profileRank.nextTitle}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-amber-500/10 border-2 border-amber-400/60 rounded-3xl p-4 font-mono flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-400/15 border border-amber-400/40 flex items-center justify-center text-amber-300 shrink-0">
              <Gift size={18} />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-black text-white">
                {hasClaimedFirstTimeParachute
                  ? 'Make Your Interactive Profile'
                  : 'Make Profile & Claim +1 Free 🎫'}
              </div>
              <p className="text-[11px] text-zinc-300 leading-snug mt-0.5">
                Pick an interactive emblem, daily target hours &amp; personal pledge.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenProfileModal}
            className="px-3 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 active:scale-95 transition-all"
          >
            <Sparkles size={12} />
            <span>Create</span>
          </button>
        </div>
      )}

      {/* Hero 20-Hour Escape Ticket Progression Card */}
      <div
        className={`bg-zinc-950 border-2 rounded-3xl p-5 shadow-brutal relative overflow-hidden transition-all ${
          justEarnedParachute
            ? 'border-amber-400 ring-2 ring-amber-400/40 shadow-[0_0_32px_rgba(245,158,11,0.3)] animate-parachute-card-pop'
            : 'border-zinc-800'
        }`}
      >
        {justEarnedParachute && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-parachute-shimmer"
          />
        )}
        <div className="absolute right-3 -bottom-4 text-7xl opacity-5 pointer-events-none select-none font-mono">
          🎫
        </div>

        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-12 h-12 rounded-2xl bg-amber-500/10 border flex items-center justify-center text-2xl shadow-inner ${
                justEarnedParachute
                  ? 'border-amber-400 shadow-[0_0_18px_rgba(245,158,11,0.45)]'
                  : 'border-amber-500/40'
              }`}
            >
              <span className={parachuteMetrics.currentBalance > 0 ? 'animate-parachute-float inline-block' : ''}>
                🎫
              </span>
            </div>
            <div>
              <div className="text-[11px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
                Emergency Escape Tickets
              </div>
              <div className="text-3xl font-mono font-black text-white flex items-baseline gap-2">
                <span>{parachuteMetrics.currentBalance}</span>
                <span className="text-xs font-normal text-zinc-400">
                  {parachuteMetrics.currentBalance === 1 ? 'Ticket Ready' : 'Tickets Ready'}
                </span>
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full border font-semibold ${
              parachuteMetrics.bonusParachutes > 0
                ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                : 'bg-zinc-900 border-zinc-700 text-zinc-300'
            }`}
          >
            {parachuteMetrics.bonusParachutes > 0
              ? `${milestoneEarnedCount} EARNED + ${parachuteMetrics.bonusParachutes} GIFT`
              : 'EARNED-ONLY'}
          </span>
        </div>

        {/* 20-Hour Progress Bar */}
        <div className="space-y-2 mt-4 pt-3 border-t border-zinc-900">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-300 font-semibold">Next Escape Ticket Progress</span>
            <span className="font-bold text-amber-400">
              {parachuteMetrics.currentProgressHours} / 20.0 hrs
            </span>
          </div>

          <div className="w-full bg-zinc-900 rounded-full h-3 p-0.5 border border-zinc-800 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-500 to-amber-300 h-full rounded-full transition-all duration-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]"
              style={{ width: `${parachuteMetrics.progressPercentage}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-1">
            <span>{parachuteMetrics.hoursUntilNextParachute} hours remaining</span>
            <span>{parachuteMetrics.progressPercentage}% completed</span>
          </div>
        </div>

        <div className="mt-4 p-2.5 bg-zinc-900/60 rounded-xl border border-zinc-850 flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <div className="flex items-center gap-1.5">
            <Moon size={13} className="text-amber-400 shrink-0" />
            <span>Anti-Sleep Rule:</span>
          </div>
          <span className="text-amber-300 font-bold">
            {parachuteMetrics.sleepFarmingMode === 'quarter_credit'
              ? '0.25x Sleep Rate'
              : parachuteMetrics.sleepFarmingMode === 'daytime_only'
              ? 'Daytime Only'
              : 'Full 1.0x Rate'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-zinc-950 border border-zinc-800 rounded-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'overview'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'ledger'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ticket Log
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'sessions'
              ? 'bg-zinc-200 text-black shadow-sm'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          History ({sessions.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono mb-1">
                <Clock size={13} className="text-zinc-300" />
                <span>Total Reclaimed</span>
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {totalReclaimedHours}h
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                ({totalParachuteHours}h Escape Ticket eligible)
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono mb-1">
                <Flame size={13} className="text-amber-500" />
                <span>Current Streak</span>
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {currentStreak} Days
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {currentStreak > 0 ? 'Consistent discipline' : 'Complete a session today'}
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono mb-1">
                <TrendingUp size={13} className="text-emerald-400" />
                <span>Completion Rate</span>
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {completionRate}%
              </div>
              <span className="text-[10px] font-mono text-zinc-400">
                {completedSessions} done / {parachutedSessions} aborted
              </span>
            </div>

            <div className="bg-zinc-950 border border-zinc-850 p-3.5 rounded-2xl">
              <div className="flex items-center gap-1.5 text-zinc-400 text-[11px] font-mono mb-1">
                <Award size={13} className="text-cyan-400" />
                <span>Avg Session</span>
              </div>
              <div className="font-mono text-2xl font-black text-white">
                {avgSessionMins}m
              </div>
              <span className="text-[10px] font-mono text-zinc-400">Mean locked duration</span>
            </div>
          </div>

          {/* Badges & Focus Achievements */}
          <div className="bg-zinc-950 border-2 border-zinc-800 p-4 rounded-3xl space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-mono text-white font-black uppercase tracking-wider">
                <Trophy size={14} className="text-amber-400" />
                <span>Badges &amp; Achievements</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length} Earned
                </span>
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="text-[10px] font-mono font-black uppercase px-2 py-0.5 rounded-lg bg-zinc-900 border border-zinc-700 hover:border-amber-400 text-zinc-200 hover:text-amber-300 transition-colors"
                >
                  Flex
                </button>
              </div>
            </div>

            <p className="text-[10px] font-mono text-zinc-400">
              Tap any badge to inspect unlock criteria. All earned badges &amp; the Golden{' '}
              <strong className="text-amber-300">ZERO-SUPPORTER</strong> crest (unlocks strictly on
              your 1st minimum ₹50 tip) appear on your Flex Receipt card.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {badgeSummary.badges.map((badge) => (
                <AchievementBadgeCard
                  key={badge.id}
                  badge={badge}
                  isSelected={selectedBadgeId === badge.id}
                  onSelect={() =>
                    setSelectedBadgeId((prev) => (prev === badge.id ? null : badge.id))
                  }
                />
              ))}
            </div>
          </div>

          {/* GitHub-Style Contribution Heatmap */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-xs font-mono text-zinc-300 font-bold">
                <Calendar size={13} />
                <span>DISCIPLINE HEATMAP (PAST 16 WEEKS)</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-400">
                <span>Less</span>
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-900 border border-zinc-850" />
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-700" />
                <span className="w-2.5 h-2.5 rounded-sm bg-zinc-400" />
                <span className="w-2.5 h-2.5 rounded-sm bg-white" />
                <span>More</span>
              </div>
            </div>

            <div className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto no-scrollbar py-1">
              {heatmapData.map((d, idx) => {
                let bg = 'bg-zinc-900 border border-zinc-850';
                if (d.level === 1) bg = 'bg-zinc-700 border border-zinc-600';
                if (d.level === 2) bg = 'bg-zinc-500 border border-zinc-400';
                if (d.level === 3) bg = 'bg-zinc-300 border border-white';
                if (d.level === 4) bg = 'bg-white shadow-[0_0_8px_rgba(255,255,255,0.7)]';

                return (
                  <div
                    key={idx}
                    title={`${d.dateStr}: ${d.hours}h blocked`}
                    className={`w-3 h-3 rounded-[3px] transition-all hover:scale-125 cursor-pointer ${bg}`}
                  />
                );
              })}
            </div>
            <div className="text-[10px] font-mono text-zinc-400 mt-2 text-right">
              {completedSessions} completed sessions across 112 days
            </div>
          </div>

          {/* Tag Breakdown Bar Chart */}
          <div className="bg-zinc-950 border border-zinc-850 p-4 rounded-2xl space-y-3">
            <div className="text-xs font-mono text-zinc-300 font-bold uppercase tracking-wider">
              Focus Time by Tag
            </div>
            {tagBreakdown.length === 0 ? (
              <p className="text-[11px] font-mono text-zinc-500 py-2">
                No completed sessions yet. Lock your phone on the Dial tab to start tracking real focus hours.
              </p>
            ) : (
              <div className="space-y-2.5">
                {tagBreakdown.map((item) => (
                  <div key={item.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-300 font-medium">#{item.tag}</span>
                      <span className="text-zinc-400 font-bold">{item.hours} hrs</span>
                    </div>
                    <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-zinc-850">
                      <div
                        className="bg-zinc-300 h-full rounded-full transition-all"
                        style={{ width: `${item.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-400">
            Immutable log of Escape Tickets earned via 20-hour milestones and emergency exits.
          </div>

          {ledger.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 font-mono text-xs">
              No escape ticket transactions yet. Complete 20 hours of blockage to earn your first ticket!
            </div>
          ) : (
            <div className="space-y-2">
              {ledger.map((entry) => (
                <div
                  key={entry.id}
                  className={`bg-zinc-950 border rounded-2xl p-3.5 font-mono text-xs flex items-start justify-between gap-3 ${
                    entry.type === 'EARNED'
                      ? 'border-emerald-500/40 text-emerald-200'
                      : 'border-amber-500/40 text-amber-200'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs mt-0.5 ${
                        entry.type === 'EARNED'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {entry.type === 'EARNED' ? '+1' : '-1'}
                    </div>
                    <div>
                      <div className="font-bold text-zinc-100">{entry.description}</div>
                      {entry.note && (
                        <div className="text-[10px] text-zinc-400 mt-0.5 italic">{entry.note}</div>
                      )}
                      <div className="text-[11px] text-zinc-400 mt-1 flex items-center gap-2">
                        <span>{new Date(entry.timestamp).toLocaleDateString()}</span>
                        {entry.tag && <span className="text-zinc-400">#{entry.tag}</span>}
                      </div>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                      entry.type === 'EARNED'
                        ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border border-amber-800'
                    }`}
                  >
                    {entry.type}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'sessions' && (
        <div className="space-y-2.5">
          <div className="text-xs font-mono text-zinc-400">
            Recent blocking sessions. Escaped sessions award 0 ticket seconds (Anti-Exploit).
          </div>

          {sessions.length === 0 ? (
            <div className="bg-zinc-950 border border-zinc-850 rounded-2xl p-8 text-center text-zinc-500 font-mono text-xs">
              No completed sessions yet. Your real detox history will appear here once you lock in.
            </div>
          ) : (
            <div className="space-y-2 max-h-[460px] overflow-y-auto no-scrollbar pr-0.5">
              {sessions.map((sess) => {
                const isSleep = sess.tag === 'Sleep';
                const isAborted = sess.status === 'parachuted';

                return (
                  <div
                    key={sess.id}
                    className="bg-zinc-950 border border-zinc-850 p-3 rounded-2xl flex items-center justify-between font-mono text-xs hover:border-zinc-700 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      {sess.status === 'completed' ? (
                        <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                      ) : (
                        <AlertOctagon size={16} className="text-amber-400 shrink-0" />
                      )}
                      <div>
                        <div className="text-zinc-200 font-bold flex items-center gap-1.5">
                          <span>#{sess.tag} — {Math.round(sess.durationSeconds / 60)} min</span>
                          {isSleep && sess.weightMultiplier < 1.0 && (
                            <span className="text-[9px] px-1 py-0.2 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                              {sess.weightMultiplier}x sleep
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-zinc-500">
                          {sess.dateStr} • {sess.status === 'completed' ? 'Completed' : 'Used Escape Ticket'}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div
                        className={`font-bold ${
                          isAborted
                            ? 'text-red-400'
                            : isSleep
                            ? 'text-amber-300'
                            : 'text-zinc-200'
                        }`}
                      >
                        {isAborted
                          ? '0h (Voided)'
                          : `+${(sess.earnedParachuteSeconds / 3600).toFixed(1)}h`}
                      </div>
                      <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400">
                        {isAborted ? 'escaped' : sess.status}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      <ShareStatsModal
        isOpen={showShareModal}
        sessions={sessions}
        parachuteMetrics={parachuteMetrics}
        currentStreak={currentStreak}
        profile={profile}
        isZeroSupporter={isZeroSupporter}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
};
