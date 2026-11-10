import React, { useState, useMemo, useRef, useEffect, type CSSProperties } from 'react';
import type {
  DashboardWidgetsConfig,
  HeatmapTimeframe,
  InsightWidgetId,
  ParachuteMetrics,
  ParachuteLedgerEntry,
  SessionRecord,
  ZeroProfile,
} from '../types';
import { ShareStatsModal } from './ShareStatsModal';
import { ACCENT_ID_TO_KEY, ACCENT_STYLES, ACCENT_THEMES, ProfileAvatar } from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges, type AchievementBadgeId } from '../utils/achievements';
import {
  DEFAULT_WIDGETS_CONFIG,
  WIDGET_LABELS,
  computeHeatmapView,
  computeTimeframeSummary,
  formatDurationCompact,
  getTodayDateStr,
  moveWidgetOrder,
  sanitizeWidgetsConfig,
  shiftDateStr,
  shiftMonthAnchor,
} from '../utils/heatmapAnalytics';
import { haptics } from '../utils/haptics';
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
  LayoutGrid,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  RotateCcw,
  X,
} from 'lucide-react';

interface ParachuteDashboardViewProps {
  parachuteMetrics: ParachuteMetrics;
  ledger: ParachuteLedgerEntry[];
  sessions: SessionRecord[];
  profile: ZeroProfile | null;
  widgetsConfig?: DashboardWidgetsConfig;
  onWidgetsConfigChange?: (next: DashboardWidgetsConfig) => void;
  isZeroSupporter: boolean;
  hasClaimedFirstTimeParachute: boolean;
  todayReclaimedHours: number;
  justEarnedParachute: boolean;
  onOpenProfileModal: () => void;
}

const HEATMAP_TIMEFRAME_OPTIONS: Array<{
  id: HeatmapTimeframe;
  label: string;
}> = [
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
  { id: 'merged_all', label: 'Merged All' },
];

const WEEKDAY_INITIALS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getHeatmapCellStyle(
  level: 0 | 1 | 2 | 3 | 4,
  isSelected: boolean,
  isToday: boolean = false
): CSSProperties {
  const ringShadow = isSelected
    ? ', 0 0 0 2px #FFFFFF'
    : isToday
    ? ', 0 0 0 1.5px rgba(255, 255, 255, 0.72)'
    : '';

  switch (level) {
    case 1:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.16)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.34)',
        boxShadow: isSelected
          ? '0 0 0 2px #FFFFFF'
          : isToday
          ? '0 0 0 1.5px rgba(255, 255, 255, 0.72)'
          : undefined,
      };
    case 2:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.38)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.56)',
        boxShadow: isSelected
          ? '0 0 0 2px #FFFFFF'
          : isToday
          ? '0 0 0 1.5px rgba(255, 255, 255, 0.72)'
          : undefined,
      };
    case 3:
      return {
        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.64)',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.84)',
        boxShadow: `0 0 8px rgba(var(--accent-rgb, 245, 158, 11), 0.25)${ringShadow}`,
      };
    case 4:
      return {
        background:
          'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
        border: '1px solid rgba(var(--accent-rgb, 245, 158, 11), 0.98)',
        boxShadow: `0 0 12px rgba(var(--accent-rgb, 245, 158, 11), 0.48)${ringShadow}`,
      };
    case 0:
    default:
      return {
        background: 'rgba(9, 9, 11, 0.82)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: isSelected
          ? '0 0 0 2px #FFFFFF'
          : isToday
          ? '0 0 0 1.5px rgba(255, 255, 255, 0.72)'
          : undefined,
      };
  }
}

export const ParachuteDashboardView: React.FC<ParachuteDashboardViewProps> = ({
  parachuteMetrics,
  ledger,
  sessions,
  profile,
  widgetsConfig,
  onWidgetsConfigChange,
  isZeroSupporter,
  hasClaimedFirstTimeParachute,
  todayReclaimedHours,
  justEarnedParachute,
  onOpenProfileModal,
}) => {
  const [localWidgetsFallback, setLocalWidgetsFallback] = useState<DashboardWidgetsConfig>(
    () => sanitizeWidgetsConfig(widgetsConfig ?? DEFAULT_WIDGETS_CONFIG)
  );
  const safeWidgets = useMemo(
    () => sanitizeWidgetsConfig(widgetsConfig ?? localWidgetsFallback),
    [widgetsConfig, localWidgetsFallback]
  );

  const commitWidgetsConfig = (next: DashboardWidgetsConfig) => {
    const clean = sanitizeWidgetsConfig(next);
    setLocalWidgetsFallback(clean);
    onWidgetsConfigChange?.(clean);
  };

  const [activeTab, setActiveTab] = useState<'overview' | 'ledger' | 'sessions'>('overview');
  const [showWidgetCustomizer, setShowWidgetCustomizer] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [selectedBadgeId, setSelectedBadgeId] = useState<AchievementBadgeId | null>(null);
  const [heatmapTimeframe, setHeatmapTimeframe] = useState<HeatmapTimeframe>(
    safeWidgets.defaultTimeframe
  );
  const [anchorDateStr, setAnchorDateStr] = useState<string>(() => getTodayDateStr());
  const [selectedCell, setSelectedCell] = useState<{ key: string; detail: string } | null>(
    null
  );
  const mergedScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (heatmapTimeframe === 'merged_all' && mergedScrollRef.current) {
      mergedScrollRef.current.scrollLeft = mergedScrollRef.current.scrollWidth;
    }
  }, [heatmapTimeframe, sessions.length]);

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

  const allTimeTagBreakdown = useMemo(() => {
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

  const heatmapView = useMemo(
    () =>
      computeHeatmapView({
        sessions,
        timeframe: heatmapTimeframe,
        anchorDateStr,
        dailyGoalHours: profile?.dailyGoalHours ?? 4,
        useUtc: false,
      }),
    [sessions, heatmapTimeframe, anchorDateStr, profile?.dailyGoalHours]
  );

  const scopedSummary = useMemo(
    () =>
      computeTimeframeSummary({
        sessions,
        timeframe: heatmapTimeframe,
        anchorDateStr,
      }),
    [sessions, heatmapTimeframe, anchorDateStr]
  );

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
  const profileAccentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
  const profileAccentTheme = ACCENT_THEMES[profileAccentKey] || ACCENT_THEMES.Amber;
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

  const handleSelectTimeframe = (tf: HeatmapTimeframe) => {
    haptics.tick(820);
    setHeatmapTimeframe(tf);
    setAnchorDateStr(getTodayDateStr());
    setSelectedCell(null);
  };

  const handleShiftPeriod = (direction: -1 | 1) => {
    haptics.tick(760);
    setSelectedCell(null);
    const today = getTodayDateStr();
    if (heatmapTimeframe === 'daily') {
      const next = shiftDateStr(anchorDateStr, direction);
      setAnchorDateStr(next > today ? today : next);
    } else if (heatmapTimeframe === 'weekly') {
      const next = shiftDateStr(anchorDateStr, direction * 7);
      setAnchorDateStr(next > today ? today : next);
    } else if (heatmapTimeframe === 'monthly') {
      const next = shiftMonthAnchor(anchorDateStr, direction);
      setAnchorDateStr(next > today ? today : next);
    }
  };

  const kpiSyncActive = safeWidgets.syncOverviewWithTimeframe;
  const displayedReclaimedHours = kpiSyncActive
    ? scopedSummary.totalHours
    : totalReclaimedHours;
  const displayedCompletedCount = kpiSyncActive
    ? scopedSummary.completedCount
    : completedSessions;
  const displayedAbortedCount = kpiSyncActive
    ? scopedSummary.abortedCount
    : parachutedSessions;
  const displayedCompletionRate = kpiSyncActive
    ? scopedSummary.completionRate
    : completionRate;
  const displayedAvgMins = kpiSyncActive
    ? scopedSummary.avgSessionMins
    : avgSessionMins;
  const displayedTagBreakdown = kpiSyncActive
    ? scopedSummary.tagBreakdown
    : allTimeTagBreakdown;

  const visibleWidgetCount = safeWidgets.order.filter((id) => safeWidgets.visible[id]).length;

  const renderWidget = (widgetId: InsightWidgetId) => {
    if (!safeWidgets.visible[widgetId]) return null;

    if (widgetId === 'overview_kpis') {
      return (
        <div key="overview_kpis" className="space-y-2">
          {kpiSyncActive && (
            <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 px-1">
              <span className="uppercase tracking-wider">Metrics Synced to Heatmap</span>
              <span className="px-2 py-0.5 rounded-md obsidian-inset font-bold text-white uppercase">
                {scopedSummary.scopeLabel}
              </span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-3.5"
              footerClassName="px-3.5 py-2"
              headerContent={
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-1">
                      <Clock size={12} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                      <span>{kpiSyncActive ? `${scopedSummary.scopeLabel}` : 'Reclaimed'}</span>
                    </div>
                    <div className="font-mono text-2xl font-black text-white">
                      {displayedReclaimedHours}h
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl obsidian-inset flex items-center justify-center shrink-0">
                    <Clock size={14} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                </div>
              }
              footerContent={
                <span className="text-[10px] font-mono text-zinc-400 block">
                  {kpiSyncActive
                    ? `${scopedSummary.totalParachuteHours}h weighted tickets`
                    : `${totalParachuteHours}h Escape Ticket eligible`}
                </span>
              }
            />

            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-3.5"
              footerClassName="px-3.5 py-2"
              headerContent={
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-1">
                      <Flame size={12} className="text-amber-500" />
                      <span>Current Streak</span>
                    </div>
                    <div className="font-mono text-2xl font-black text-white">
                      {currentStreak} Days
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl obsidian-inset flex items-center justify-center shrink-0">
                    <Flame size={14} className="text-amber-400" />
                  </div>
                </div>
              }
              footerContent={
                <span className="text-[10px] font-mono text-zinc-400 block">
                  {currentStreak > 0 ? 'Consistent discipline' : 'Complete a session today'}
                </span>
              }
            />

            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-3.5"
              footerClassName="px-3.5 py-2"
              headerContent={
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-1">
                      <TrendingUp size={12} className="text-emerald-400" />
                      <span>Completion</span>
                    </div>
                    <div className="font-mono text-2xl font-black text-white">
                      {displayedCompletionRate}%
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl obsidian-inset flex items-center justify-center shrink-0">
                    <TrendingUp size={14} className="text-emerald-400" />
                  </div>
                </div>
              }
              footerContent={
                <span className="text-[10px] font-mono text-zinc-400 block">
                  {displayedCompletedCount} done / {displayedAbortedCount} aborted
                </span>
              }
            />

            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-3.5"
              footerClassName="px-3.5 py-2"
              headerContent={
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] font-mono uppercase tracking-wider mb-1">
                      <Award size={12} className="text-cyan-400" />
                      <span>Avg Session</span>
                    </div>
                    <div className="font-mono text-2xl font-black text-white">
                      {displayedAvgMins}m
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-xl obsidian-inset flex items-center justify-center shrink-0">
                    <Award size={14} className="text-cyan-400" />
                  </div>
                </div>
              }
              footerContent={
                <span className="text-[10px] font-mono text-zinc-400 block">
                  Mean locked duration
                </span>
              }
            />
          </div>
        </div>
      );
    }

    if (widgetId === 'discipline_heatmap') {
      return (
        <ObsidianCard
          key="discipline_heatmap"
          accent={profileAccentKey}
          ambientGlow
          className="font-mono"
          headerClassName="p-4 space-y-3"
          footerClassName="px-4 py-2.5 flex items-center justify-between gap-2 text-[10px] font-mono text-zinc-400"
          headerContent={
            <>
              {/* Title Row + Scoped Target Pill */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                    <Calendar size={16} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-black text-white uppercase tracking-wider">
                      Discipline Heatmap
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">
                      {heatmapView.periodLabel}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-1.5 rounded-xl obsidian-inset text-center shrink-0">
                  <div
                    className="text-xs font-extrabold leading-none"
                    style={{ color: 'var(--accent-hex, #F59E0B)' }}
                  >
                    {heatmapView.totalHours}h
                  </div>
                  <div className="mt-0.5 text-[8px] tracking-[0.16em] uppercase text-zinc-400">
                    {heatmapTimeframe === 'merged_all' ? 'MERGED' : 'FOCUS'}
                  </div>
                </div>
              </div>

              {/* Dynamic Timeframe Segmented Switcher */}
              <div className="obsidian-shell-bar rounded-xl p-1 grid grid-cols-4 gap-1 text-[10px]">
                {HEATMAP_TIMEFRAME_OPTIONS.map((opt) => {
                  const active = heatmapTimeframe === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleSelectTimeframe(opt.id)}
                      className={`py-1.5 px-1 rounded-lg transition-all truncate ${
                        active
                          ? 'obsidian-pill-active font-black'
                          : 'text-zinc-400 hover:text-zinc-200 font-semibold'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {/* Period Navigation Strip (Daily / Weekly / Monthly) */}
              {heatmapTimeframe !== 'merged_all' && (
                <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-xl obsidian-inset-neutral text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleShiftPeriod(-1)}
                    className="p-1 rounded-lg bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white active:scale-95"
                    aria-label="Previous Period"
                  >
                    <ChevronLeft size={13} />
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-zinc-200 truncate">
                      {heatmapView.periodLabel}
                    </span>
                    {heatmapView.canGoNext && (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tick(840);
                          setAnchorDateStr(getTodayDateStr());
                          setSelectedCell(null);
                        }}
                        className="px-1.5 py-0.5 rounded bg-zinc-800 border border-white/15 text-[9px] font-bold uppercase text-white hover:border-white/30"
                      >
                        Today
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!heatmapView.canGoNext}
                    onClick={() => handleShiftPeriod(1)}
                    className="p-1 rounded-lg bg-zinc-900/80 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
                    aria-label="Next Period"
                  >
                    <ChevronRight size={13} />
                  </button>
                </div>
              )}

              {/* VIEW 1: DAILY (24-Hour Grid) */}
              {heatmapTimeframe === 'daily' && (
                <div className="space-y-2">
                  <div className="grid grid-cols-6 gap-1.5">
                    {heatmapView.hourlyCells.map((cell) => {
                      const key = `hr_${cell.hour}`;
                      const isSel = selectedCell?.key === key;
                      return (
                        <button
                          key={cell.hour}
                          type="button"
                          onClick={() => {
                            haptics.tick(720);
                            setSelectedCell(
                              isSel ? null : { key, detail: cell.detailLabel }
                            );
                          }}
                          style={getHeatmapCellStyle(cell.level, isSel)}
                          className="h-11 rounded-xl flex flex-col items-center justify-center px-1 transition-all active:scale-95"
                          title={cell.detailLabel}
                        >
                          <span
                            className="text-[9px] font-bold leading-none"
                            style={{
                              color:
                                cell.level === 4
                                  ? 'var(--accent-badge-text, #09090B)'
                                  : cell.level > 0
                                  ? '#FFFFFF'
                                  : '#71717A',
                            }}
                          >
                            {cell.hourLabel}h
                          </span>
                          <span
                            className="text-[8px] mt-1 font-extrabold leading-none truncate max-w-full"
                            style={{
                              color:
                                cell.level === 4
                                  ? 'var(--accent-badge-text, #09090B)'
                                  : cell.seconds > 0
                                  ? '#E4E4E7'
                                  : '#3F3F46',
                            }}
                          >
                            {cell.seconds > 0 ? formatDurationCompact(cell.seconds) : '·'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 2: WEEKLY (Mon–Sun Columns) */}
              {heatmapTimeframe === 'weekly' && (
                <div className="grid grid-cols-7 gap-1.5">
                  {heatmapView.weekCells.map((cell) => {
                    const key = `wk_${cell.dateStr}`;
                    const isSel = selectedCell?.key === key;
                    return (
                      <button
                        key={cell.dateStr}
                        type="button"
                        onClick={() => {
                          haptics.tick(760);
                          setSelectedCell(
                            isSel ? null : { key, detail: cell.detailLabel }
                          );
                        }}
                        style={getHeatmapCellStyle(cell.level, isSel, cell.isToday)}
                        className="h-20 rounded-xl p-1.5 flex flex-col items-center justify-between transition-all active:scale-95"
                        title={cell.detailLabel}
                      >
                        <span
                          className="text-[9px] font-black uppercase leading-none"
                          style={{
                            color:
                              cell.level === 4
                                ? 'var(--accent-badge-text, #09090B)'
                                : cell.isToday
                                ? '#FFFFFF'
                                : '#A1A1AA',
                          }}
                        >
                          {cell.dayShort}
                        </span>

                        <span
                          className="text-[11px] font-black leading-none"
                          style={{
                            color:
                              cell.level === 4
                                ? 'var(--accent-badge-text, #09090B)'
                                : cell.seconds > 0
                                ? '#FFFFFF'
                                : '#52525B',
                          }}
                        >
                          {cell.seconds > 0 ? `${cell.hours}h` : '0h'}
                        </span>

                        <div className="flex items-center gap-0.5">
                          <span
                            className="text-[8px] font-bold"
                            style={{
                              color:
                                cell.level === 4
                                  ? 'var(--accent-badge-text, #09090B)'
                                  : '#71717A',
                            }}
                          >
                            {cell.dayNum}
                          </span>
                          {cell.goalMet && (
                            <span
                              className="w-1.5 h-1.5 rounded-full"
                              style={{
                                backgroundColor:
                                  cell.level === 4
                                    ? 'var(--accent-badge-text, #09090B)'
                                    : 'var(--accent-hex, #F59E0B)',
                              }}
                            />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* VIEW 3: MONTHLY (Calendar Grid) */}
              {heatmapTimeframe === 'monthly' && (
                <div className="space-y-1.5">
                  <div className="grid grid-cols-7 gap-1 text-center text-[9px] font-bold text-zinc-400 uppercase">
                    {WEEKDAY_INITIALS.map((d, i) => (
                      <div key={i}>{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: heatmapView.monthLeadingEmpty }, (_, idx) => (
                      <div key={`empty_${idx}`} className="h-9" />
                    ))}
                    {heatmapView.monthCells.map((cell) => {
                      const key = `mo_${cell.dateStr}`;
                      const isSel = selectedCell?.key === key;
                      return (
                        <button
                          key={cell.dateStr}
                          type="button"
                          onClick={() => {
                            haptics.tick(760);
                            setSelectedCell(
                              isSel ? null : { key, detail: cell.detailLabel }
                            );
                          }}
                          style={getHeatmapCellStyle(cell.level, isSel, cell.isToday)}
                          className={`h-9 rounded-lg flex flex-col items-center justify-center transition-all active:scale-95 ${
                            cell.isFuture ? 'opacity-40' : ''
                          }`}
                          title={cell.detailLabel}
                        >
                          <span
                            className="text-[10px] font-bold leading-none"
                            style={{
                              color:
                                cell.level === 4
                                  ? 'var(--accent-badge-text, #09090B)'
                                  : cell.seconds > 0
                                  ? '#FFFFFF'
                                  : '#71717A',
                            }}
                          >
                            {cell.dayNum}
                          </span>
                          {cell.seconds > 0 && (
                            <span
                              className="text-[7px] font-bold mt-0.5 leading-none"
                              style={{
                                color:
                                  cell.level === 4
                                    ? 'var(--accent-badge-text, #09090B)'
                                    : '#E4E4E7',
                              }}
                            >
                              {cell.hours}h
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* VIEW 4: MERGED ALL (Lifetime Merged Matrix) */}
              {heatmapTimeframe === 'merged_all' && (
                <div className="space-y-3">
                  {/* Merged Summary Mini-Stat Tiles */}
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    <div className="p-2 rounded-xl obsidian-inset-neutral">
                      <div className="text-xs font-black text-white">
                        {heatmapView.totalHours}h
                      </div>
                      <div className="text-[8px] uppercase text-zinc-400 mt-0.5">All Hours</div>
                    </div>
                    <div className="p-2 rounded-xl obsidian-inset-neutral">
                      <div className="text-xs font-black text-white">
                        {heatmapView.activeCount}d
                      </div>
                      <div className="text-[8px] uppercase text-zinc-400 mt-0.5">Active</div>
                    </div>
                    <div className="p-2 rounded-xl obsidian-inset-neutral">
                      <div
                        className="text-xs font-black truncate"
                        style={{ color: 'var(--accent-hex, #F59E0B)' }}
                      >
                        {heatmapView.mergedBestDay
                          ? `${heatmapView.mergedBestDay.hours}h`
                          : '0h'}
                      </div>
                      <div className="text-[8px] uppercase text-zinc-400 mt-0.5">Best Day</div>
                    </div>
                    <div className="p-2 rounded-xl obsidian-inset-neutral">
                      <div className="text-xs font-black text-emerald-300">
                        {heatmapView.mergedLongestStreak}d
                      </div>
                      <div className="text-[8px] uppercase text-zinc-400 mt-0.5">Max Streak</div>
                    </div>
                  </div>

                  {/* Continuous Mon..Sun Matrix Across ALL Session History */}
                  <div className="flex gap-1.5 items-start">
                    <div className="grid grid-rows-7 gap-1 py-1 text-[8px] font-bold text-zinc-500 shrink-0 leading-3">
                      <span className="h-3 flex items-center">M</span>
                      <span className="h-3" />
                      <span className="h-3 flex items-center">W</span>
                      <span className="h-3" />
                      <span className="h-3 flex items-center">F</span>
                      <span className="h-3" />
                      <span className="h-3" />
                    </div>
                    <div
                      ref={mergedScrollRef}
                      className="grid grid-flow-col grid-rows-7 gap-1 overflow-x-auto no-scrollbar py-1 flex-1"
                    >
                      {heatmapView.mergedCells.map((cell) => {
                        const key = `mg_${cell.dateStr}`;
                        const isSel = selectedCell?.key === key;
                        return (
                          <button
                            key={cell.dateStr}
                            type="button"
                            onClick={() => {
                              haptics.tick(720);
                              setSelectedCell(
                                isSel ? null : { key, detail: cell.detailLabel }
                              );
                            }}
                            title={cell.detailLabel}
                            style={getHeatmapCellStyle(cell.level, isSel, cell.isToday)}
                            className={`w-3 h-3 rounded-[3px] transition-transform hover:scale-125 ${
                              cell.isFuture ? 'opacity-25' : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[9px] text-zinc-400">
                    <span>
                      Merged across {heatmapView.mergedWeekCount} weeks (earliest &rarr; today)
                    </span>
                    <div className="flex items-center gap-1">
                      <span>Less</span>
                      {([0, 1, 2, 3, 4] as const).map((lvl) => (
                        <span
                          key={lvl}
                          style={getHeatmapCellStyle(lvl, false)}
                          className="w-2.5 h-2.5 rounded-[2px] inline-block"
                        />
                      ))}
                      <span>More</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Intensity Legend (Daily / Weekly / Monthly) */}
              {heatmapTimeframe !== 'merged_all' && (
                <div className="flex items-center justify-between text-[9px] text-zinc-400 pt-0.5">
                  <span>
                    Tap any {heatmapTimeframe === 'daily' ? 'hour' : 'day'} tile to inspect
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <span>Less</span>
                    {([0, 1, 2, 3, 4] as const).map((lvl) => (
                      <span
                        key={lvl}
                        style={getHeatmapCellStyle(lvl, false)}
                        className="w-2.5 h-2.5 rounded-[2px] inline-block"
                      />
                    ))}
                    <span>More</span>
                  </div>
                </div>
              )}
            </>
          }
          footerContent={
            selectedCell ? (
              <div className="w-full flex items-center justify-between gap-2">
                <span className="text-zinc-200 font-bold truncate">{selectedCell.detail}</span>
                <button
                  type="button"
                  onClick={() => setSelectedCell(null)}
                  className="text-zinc-400 hover:text-white shrink-0"
                  aria-label="Clear selected cell detail"
                >
                  <X size={12} />
                </button>
              </div>
            ) : (
              <>
                <span>
                  Peak: <strong className="text-zinc-200">{heatmapView.peakLabel}</strong>
                </span>
                <span className="text-zinc-300 font-semibold">
                  {heatmapTimeframe === 'daily'
                    ? `${heatmapView.sessionCount} locks • ${heatmapView.activeCount} active hrs`
                    : `${heatmapView.sessionCount} locks • ${heatmapView.goalMetDays} goal days`}
                </span>
              </>
            )
          }
        />
      );
    }

    if (widgetId === 'badges') {
      return (
        <ObsidianCard
          key="badges"
          accent={profileAccentKey}
          headerClassName="p-4 space-y-3"
          footerClassName="px-4 py-2.5 text-[10px] font-mono text-zinc-400 leading-relaxed"
          headerContent={
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-mono text-white font-black uppercase tracking-wider">
                  <div className="w-7 h-7 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                    <Trophy size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                  <span>Badges &amp; Achievements</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-lg obsidian-inset text-white">
                    {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length} Earned
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowShareModal(true)}
                    className="text-[10px] font-mono font-black uppercase px-2.5 py-1 rounded-lg obsidian-pill-active"
                  >
                    Flex
                  </button>
                </div>
              </div>

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
            </>
          }
          footerContent={
            <p>
              Tap any badge to inspect unlock criteria. All earned badges &amp; the Golden{' '}
              <strong className="text-amber-300">ZERO-SUPPORTER</strong> crest (unlocks strictly
              on your 1st minimum ₹50 tip) appear on your Flex Receipt card.
            </p>
          }
        />
      );
    }

    // tag_breakdown
    return (
      <ObsidianCard
        key="tag_breakdown"
        accent={profileAccentKey}
        headerClassName="p-4 space-y-3"
        footerClassName="px-4 py-2 flex items-center justify-between text-[10px] font-mono text-zinc-400"
        headerContent={
          <>
            <div className="flex items-center justify-between gap-2">
              <div className="text-xs font-mono text-zinc-200 font-bold uppercase tracking-wider">
                Focus Time by Tag
              </div>
              {kpiSyncActive && (
                <span className="text-[9px] font-mono px-2 py-0.5 rounded-md obsidian-inset text-white font-bold uppercase">
                  {scopedSummary.scopeLabel}
                </span>
              )}
            </div>
            {displayedTagBreakdown.length === 0 ? (
              <p className="text-[11px] font-mono text-zinc-400 py-1">
                {kpiSyncActive
                  ? `No completed sessions recorded in ${scopedSummary.scopeLabel}.`
                  : 'No completed sessions yet. Lock your phone on the Dial tab to start tracking real focus hours.'}
              </p>
            ) : (
              <div className="space-y-2.5">
                {displayedTagBreakdown.map((item) => (
                  <div key={item.tag} className="space-y-1">
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="text-zinc-200 font-medium">#{item.tag}</span>
                      <span className="text-zinc-300 font-bold">{item.hours} hrs</span>
                    </div>
                    <div className="w-full obsidian-inset-neutral rounded-full h-2 overflow-hidden p-[1px]">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${item.pct}%`,
                          background:
                            'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        }
        footerContent={
          <>
            <span>Primary Focus Tag</span>
            <span className="font-bold text-zinc-200">
              {displayedTagBreakdown.length > 0
                ? `#${displayedTagBreakdown[0].tag} (${displayedTagBreakdown[0].hours}h)`
                : 'None yet'}
            </span>
          </>
        }
      />
    );
  };

  return (
    <div className="flex flex-col gap-5 px-4 py-4 max-w-md mx-auto w-full select-none pb-24">
      {/* Header + Widget Options & Flex Stats Triggers */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h1 className="text-xl font-mono font-black tracking-tight text-white flex items-center gap-2 truncate">
            <span>ESCAPE TICKETS &amp; METRICS</span>
          </h1>
          <p className="text-xs font-mono text-zinc-400">
            100% Real Focus Metrics • Zero Fake Data
          </p>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.tick(780);
              setActiveTab('overview');
              setShowWidgetCustomizer((prev) => !prev);
            }}
            className={`px-2.5 py-2 rounded-xl font-mono font-bold text-[11px] uppercase tracking-wider flex items-center gap-1 active:scale-95 transition-all ${
              showWidgetCustomizer
                ? 'obsidian-pill-active font-black'
                : 'obsidian-shell-bar text-zinc-200 hover:text-white'
            }`}
            title="Configure Dashboard Widgets"
          >
            <LayoutGrid size={13} />
            <span>Widgets</span>
          </button>

          <button
            type="button"
            onClick={() => setShowShareModal(true)}
            className="px-3 py-2 rounded-xl obsidian-pill-active font-mono font-black text-[11px] uppercase tracking-wider flex items-center gap-1.5 active:scale-95 transition-all"
          >
            <Share2 size={13} />
            <span>Flex</span>
          </button>
        </div>
      </div>

      {/* Collapsible Widget Options Customizer */}
      {showWidgetCustomizer && (
        <ObsidianCard
          accent={profileAccentKey}
          ambientGlow
          className="font-mono"
          headerClassName="p-4 space-y-3.5"
          footerClassName="px-4 py-2.5 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs text-white font-black uppercase tracking-wider">
                  <div className="w-7 h-7 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0">
                    <LayoutGrid size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} />
                  </div>
                  <span>Widget Options</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowWidgetCustomizer(false)}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                  aria-label="Close Widget Options"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Order + Visibility */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  Reorder &amp; Toggle Analytics Widgets
                </div>
                {safeWidgets.order.map((wId, idx) => {
                  const meta = WIDGET_LABELS[wId];
                  const isVisible = safeWidgets.visible[wId];
                  return (
                    <div
                      key={wId}
                      className={`p-2.5 rounded-xl flex items-center justify-between gap-2 transition-all ${
                        isVisible ? 'obsidian-inset-neutral' : 'bg-black/50 border border-white/5 opacity-60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate">
                          {meta.title}
                        </div>
                        <div className="text-[9px] text-zinc-400 truncate">{meta.subtitle}</div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => {
                            haptics.tick(720);
                            commitWidgetsConfig({
                              ...safeWidgets,
                              order: moveWidgetOrder(safeWidgets.order, wId, 'up'),
                            });
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30"
                          aria-label={`Move ${meta.title} up`}
                        >
                          <ArrowUp size={11} />
                        </button>
                        <button
                          type="button"
                          disabled={idx === safeWidgets.order.length - 1}
                          onClick={() => {
                            haptics.tick(720);
                            commitWidgetsConfig({
                              ...safeWidgets,
                              order: moveWidgetOrder(safeWidgets.order, wId, 'down'),
                            });
                          }}
                          className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30"
                          aria-label={`Move ${meta.title} down`}
                        >
                          <ArrowDown size={11} />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(800);
                            commitWidgetsConfig({
                              ...safeWidgets,
                              visible: {
                                ...safeWidgets.visible,
                                [wId]: !isVisible,
                              },
                            });
                          }}
                          className={`p-1.5 rounded-lg transition-all ${
                            isVisible
                              ? 'obsidian-pill-active'
                              : 'bg-zinc-900 border border-white/10 text-zinc-400'
                          }`}
                          aria-label={`${isVisible ? 'Hide' : 'Show'} ${meta.title}`}
                        >
                          {isVisible ? <Eye size={12} /> : <EyeOff size={12} />}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Default Heatmap Timeframe */}
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                  Default Heatmap Timeframe
                </div>
                <div className="obsidian-shell-bar rounded-xl p-1 grid grid-cols-4 gap-1 text-[10px]">
                  {HEATMAP_TIMEFRAME_OPTIONS.map((opt) => {
                    const active = safeWidgets.defaultTimeframe === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => {
                          haptics.tick(820);
                          commitWidgetsConfig({
                            ...safeWidgets,
                            defaultTimeframe: opt.id,
                          });
                          handleSelectTimeframe(opt.id);
                        }}
                        className={`py-1.5 px-1 rounded-lg truncate transition-all ${
                          active
                            ? 'obsidian-pill-active font-black'
                            : 'text-zinc-400 hover:text-zinc-200 font-semibold'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic Sync & Dial Widget Toggles */}
              <div className="grid grid-cols-1 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(800);
                    commitWidgetsConfig({
                      ...safeWidgets,
                      syncOverviewWithTimeframe: !safeWidgets.syncOverviewWithTimeframe,
                    });
                  }}
                  className={`p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
                    safeWidgets.syncOverviewWithTimeframe
                      ? 'obsidian-inset'
                      : 'obsidian-inset-neutral'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">
                      Sync KPIs &amp; Tags with Timeframe
                    </div>
                    <div className="text-[9px] text-zinc-400">
                      Filter Reclaimed, Completion &amp; Tags by Daily / Weekly / Monthly / Merged
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                      safeWidgets.syncOverviewWithTimeframe
                        ? 'obsidian-pill-active'
                        : 'bg-zinc-900 border border-white/10 text-zinc-400'
                    }`}
                  >
                    {safeWidgets.syncOverviewWithTimeframe ? 'ON' : 'OFF'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(800);
                    commitWidgetsConfig({
                      ...safeWidgets,
                      showDialWidget: !safeWidgets.showDialWidget,
                    });
                  }}
                  className={`p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
                    safeWidgets.showDialWidget ? 'obsidian-inset' : 'obsidian-inset-neutral'
                  }`}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">
                      Compact 7-Day Widget on Dial Screen
                    </div>
                    <div className="text-[9px] text-zinc-400">
                      Pin your live weekly discipline strip above the Dial wheel
                    </div>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase shrink-0 ${
                      safeWidgets.showDialWidget
                        ? 'obsidian-pill-active'
                        : 'bg-zinc-900 border border-white/10 text-zinc-400'
                    }`}
                  >
                    {safeWidgets.showDialWidget ? 'PINNED' : 'HIDDEN'}
                  </span>
                </button>
              </div>
            </>
          }
          footerContent={
            <>
              <span>
                {visibleWidgetCount}/{safeWidgets.order.length} widgets visible
              </span>
              <button
                type="button"
                onClick={() => {
                  haptics.tick(700);
                  commitWidgetsConfig(DEFAULT_WIDGETS_CONFIG);
                  handleSelectTimeframe(DEFAULT_WIDGETS_CONFIG.defaultTimeframe);
                }}
                className="flex items-center gap-1 text-zinc-300 hover:text-white font-bold uppercase"
              >
                <RotateCcw size={11} />
                <span>Reset Defaults</span>
              </button>
            </>
          }
        />
      )}

      {/* Interactive Zero Profile Card (Matching ZeroProfilePreviewCard Two-Tier Obsidian) */}
      {profile ? (
        <ObsidianCard
          accent={profileAccentKey}
          ambientGlow
          className="font-mono"
          headerClassName="p-4 space-y-3"
          footerClassName="px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <ProfileAvatar
                    avatarId={profile.avatarId}
                    accent={profile.accentColor}
                    size="md"
                    interactive
                  />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-extrabold text-sm text-white uppercase tracking-wider truncate">
                        {profile.displayName}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest shadow-sm"
                        style={{
                          background: profileAccentTheme.badgeGradient,
                          color: profileAccentTheme.badgeText,
                        }}
                      >
                        {profileRank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                    <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                      <span>{profile.handle}</span>
                      <span className="mx-1.5 text-zinc-600">•</span>
                      <span style={{ color: 'var(--accent-hex, #F59E0B)' }}>
                        #{profile.primaryMission}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Frosted Accent Target Box matching ZeroProfilePreviewCard */}
                <div className="flex-shrink-0 px-2.5 py-2 rounded-xl obsidian-inset text-center">
                  <div
                    className="text-xs font-extrabold leading-none"
                    style={{ color: 'var(--accent-hex, #F59E0B)' }}
                  >
                    {profile.dailyGoalHours}h/day
                  </div>
                  <div className="mt-1 text-[8px] tracking-[0.18em] uppercase text-zinc-400">
                    TARGET
                  </div>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-400">Today&rsquo;s Progress</span>
                  <span className={`font-bold ${profileAccent.text}`}>
                    {todayReclaimedHours} / {profile.dailyGoalHours}h ({dailyGoalPct}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full obsidian-inset-neutral overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${dailyGoalPct}%`,
                      background:
                        'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
                    }}
                  />
                </div>
              </div>

              {unlockedFocusBadges.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/10">
                  {unlockedFocusBadges.map((b) => (
                    <AchievementBadgePill key={b.id} badge={b} />
                  ))}
                </div>
              )}
            </>
          }
          footerContent={
            <>
              <span className="italic text-zinc-300 break-words">
                &ldquo;{profile.motto}&rdquo;
              </span>
              <div className="flex items-center gap-2 shrink-0">
                {profileRank.nextTitle && (
                  <span className="text-zinc-400 font-semibold">
                    {profileRank.hoursToNext}h to {profileRank.nextTitle}
                  </span>
                )}
                <button
                  type="button"
                  onClick={onOpenProfileModal}
                  className="px-2 py-1 rounded-lg bg-zinc-900 border border-white/15 hover:border-white/30 text-[10px] font-bold text-zinc-200 flex items-center gap-1"
                >
                  <SlidersHorizontal size={10} />
                  <span>Edit</span>
                </button>
              </div>
            </>
          }
        />
      ) : (
        <ObsidianCard
          accent="Amber"
          ambientGlow
          className="font-mono"
          headerClassName="p-4 flex items-center justify-between gap-3"
          footerClassName="px-4 py-2 text-[11px] text-zinc-400"
          headerContent={
            <>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl obsidian-icon-box flex items-center justify-center text-amber-300 shrink-0">
                  <Gift size={18} />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-black text-white">
                    {hasClaimedFirstTimeParachute
                      ? 'Make Your Interactive Profile'
                      : 'Make Profile & Claim +1 Free 🎫'}
                  </div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">
                    Personalized rank card &amp; daily target meter
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onOpenProfileModal}
                className="px-3 py-2 rounded-xl obsidian-pill-active font-black text-[10px] uppercase tracking-wider flex items-center gap-1 shrink-0 active:scale-95 transition-all"
              >
                <Sparkles size={12} />
                <span>Create</span>
              </button>
            </>
          }
          footerContent={
            <span>Pick an interactive emblem, daily target hours &amp; personal pledge.</span>
          }
        />
      )}

      {/* Hero 20-Hour Escape Ticket Progression Card */}
      <ObsidianCard
        accent={profileAccentKey}
        ambientGlow
        className={justEarnedParachute ? 'animate-parachute-card-pop' : ''}
        overlays={
          <>
            {justEarnedParachute && (
              <div
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-amber-400/20 to-transparent animate-parachute-shimmer"
              />
            )}
            <div
              aria-hidden="true"
              className="absolute right-3 bottom-9 text-7xl opacity-5 pointer-events-none select-none font-mono"
            >
              🎫
            </div>
          </>
        }
        headerClassName="p-5 space-y-4"
        footerClassName="px-5 py-2.5 flex items-center justify-between text-[11px] font-mono text-zinc-300"
        headerContent={
          <>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl obsidian-icon-box flex items-center justify-center text-2xl shrink-0">
                  <span
                    className={
                      parachuteMetrics.currentBalance > 0
                        ? 'animate-parachute-float inline-block'
                        : ''
                    }
                  >
                    🎫
                  </span>
                </div>
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
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
              <div className="px-2.5 py-1.5 rounded-xl obsidian-inset text-center shrink-0">
                <div
                  className="text-xs font-extrabold font-mono leading-none"
                  style={{ color: 'var(--accent-hex, #F59E0B)' }}
                >
                  {parachuteMetrics.progressPercentage}%
                </div>
                <div className="mt-1 text-[8px] font-mono tracking-wider uppercase text-zinc-400">
                  {parachuteMetrics.bonusParachutes > 0
                    ? `${milestoneEarnedCount}E + ${parachuteMetrics.bonusParachutes}G`
                    : 'EARNED'}
                </div>
              </div>
            </div>

            {/* 20-Hour Progress Bar */}
            <div className="space-y-2 pt-3 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-300 font-semibold">Next Escape Ticket Progress</span>
                <span className="font-bold" style={{ color: 'var(--accent-hex, #F59E0B)' }}>
                  {parachuteMetrics.currentProgressHours} / 20.0 hrs
                </span>
              </div>

              <div className="w-full obsidian-inset-neutral rounded-full h-3 p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${parachuteMetrics.progressPercentage}%`,
                    background:
                      'var(--accent-badge-gradient, linear-gradient(135deg, #FBBF24 0%, #D97706 100%))',
                    boxShadow: '0 0 12px rgba(var(--accent-rgb, 245, 158, 11), 0.45)',
                  }}
                />
              </div>

              <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 pt-0.5">
                <span>{parachuteMetrics.hoursUntilNextParachute} hours remaining</span>
                <span>20h monotonic threshold</span>
              </div>
            </div>
          </>
        }
        footerContent={
          <>
            <div className="flex items-center gap-1.5">
              <Moon size={13} style={{ color: 'var(--accent-hex, #F59E0B)' }} className="shrink-0" />
              <span>Anti-Sleep Rule:</span>
            </div>
            <span className="font-bold" style={{ color: 'var(--accent-hex, #F59E0B)' }}>
              {parachuteMetrics.sleepFarmingMode === 'quarter_credit'
                ? '0.25x Sleep Rate'
                : parachuteMetrics.sleepFarmingMode === 'daytime_only'
                ? 'Daytime Only'
                : 'Full 1.0x Rate'}
            </span>
          </>
        }
      />

      {/* Frosted Obsidian Tabs */}
      <div className="grid grid-cols-3 gap-1 p-1 obsidian-shell-bar rounded-2xl">
        <button
          onClick={() => setActiveTab('overview')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'overview'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Analytics
        </button>
        <button
          onClick={() => setActiveTab('ledger')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'ledger'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          Ticket Log
        </button>
        <button
          onClick={() => setActiveTab('sessions')}
          className={`py-2 text-xs font-mono rounded-xl transition-all font-semibold ${
            activeTab === 'sessions'
              ? 'obsidian-pill-active font-black'
              : 'text-zinc-400 hover:text-zinc-200'
          }`}
        >
          History ({sessions.length})
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-4">
          {visibleWidgetCount === 0 ? (
            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-6 text-center space-y-3 font-mono"
              headerContent={
                <>
                  <div className="text-xs text-zinc-300">
                    All analytics widgets are hidden.
                  </div>
                  <button
                    type="button"
                    onClick={() => commitWidgetsConfig(DEFAULT_WIDGETS_CONFIG)}
                    className="px-3.5 py-2 rounded-xl obsidian-pill-active font-black text-xs uppercase"
                  >
                    Restore Default Widgets
                  </button>
                </>
              }
            />
          ) : (
            safeWidgets.order.map((wId) => renderWidget(wId))
          )}
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="space-y-3">
          <div className="text-xs font-mono text-zinc-400">
            Immutable log of Escape Tickets earned via 20-hour milestones and emergency exits.
          </div>

          {ledger.length === 0 ? (
            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-6 text-center text-zinc-300 font-mono text-xs"
              footerClassName="px-4 py-2 text-center text-[10px] font-mono text-zinc-400"
              headerContent={
                <span>
                  No escape ticket transactions yet. Complete 20 hours of blockage to earn your first ticket!
                </span>
              }
              footerContent={<span>20h monotonic focus = +1 Emergency Escape Ticket</span>}
            />
          ) : (
            <div className="space-y-2.5">
              {ledger.map((entry) => {
                const isEarned = entry.type === 'EARNED';
                return (
                  <ObsidianCard
                    key={entry.id}
                    accentOverride={
                      isEarned
                        ? { hex: '#10B981', rgb: '16, 185, 129' }
                        : { hex: '#F59E0B', rgb: '245, 158, 11' }
                    }
                    className="font-mono text-xs"
                    headerClassName="p-3.5 flex items-start justify-between gap-3"
                    footerClassName="px-3.5 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
                    headerContent={
                      <>
                        <div className="flex items-start gap-2.5 min-w-0">
                          <div
                            className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 ${
                              isEarned
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-amber-500/20 text-amber-400'
                            }`}
                          >
                            {isEarned ? '+1' : '-1'}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-zinc-100 break-words">
                              {entry.description}
                            </div>
                          </div>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase shrink-0 ${
                            isEarned
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                              : 'bg-amber-950 text-amber-300 border border-amber-800'
                          }`}
                        >
                          {entry.type}
                        </span>
                      </>
                    }
                    footerContent={
                      <div className="w-full space-y-1">
                        {entry.note && (
                          <div className="text-[10px] text-zinc-300 italic break-words">
                            {entry.note}
                          </div>
                        )}
                        <div className="flex items-center justify-between gap-2">
                          <span>{new Date(entry.timestamp).toLocaleString()}</span>
                          {entry.tag && <span className="font-semibold text-zinc-300">#{entry.tag}</span>}
                        </div>
                      </div>
                    }
                  />
                );
              })}
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
            <ObsidianCard
              accent={profileAccentKey}
              headerClassName="p-6 text-center text-zinc-300 font-mono text-xs"
              footerClassName="px-4 py-2 text-center text-[10px] font-mono text-zinc-400"
              headerContent={
                <span>
                  No completed sessions yet. Your real detox history will appear here once you lock in.
                </span>
              }
              footerContent={<span>Verified via native Android monotonic clock</span>}
            />
          ) : (
            <div className="space-y-2.5 max-h-[480px] overflow-y-auto no-scrollbar pr-0.5">
              {sessions.map((sess) => {
                const isSleep = sess.tag === 'Sleep';
                const isAborted = sess.status === 'parachuted';

                return (
                  <ObsidianCard
                    key={sess.id}
                    accentOverride={
                      isAborted
                        ? { hex: '#F59E0B', rgb: '245, 158, 11' }
                        : { hex: '#10B981', rgb: '16, 185, 129' }
                    }
                    className="font-mono text-xs"
                    headerClassName="p-3.5 flex items-center justify-between gap-2"
                    footerClassName="px-3.5 py-2 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
                    headerContent={
                      <>
                        <div className="flex items-center gap-2.5 min-w-0">
                          {sess.status === 'completed' ? (
                            <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
                          ) : (
                            <AlertOctagon size={16} className="text-amber-400 shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-zinc-100 font-bold flex items-center gap-1.5 flex-wrap">
                              <span>
                                #{sess.tag} — {Math.round(sess.durationSeconds / 60)} min
                              </span>
                              {isSleep && sess.weightMultiplier < 1.0 && (
                                <span className="text-[9px] px-1.5 py-0.5 bg-amber-950 text-amber-300 border border-amber-800 rounded">
                                  {sess.weightMultiplier}x sleep
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div
                            className={`font-bold ${
                              isAborted
                                ? 'text-red-400'
                                : isSleep
                                ? 'text-amber-300'
                                : 'text-emerald-300'
                            }`}
                          >
                            {isAborted
                              ? '0h (Voided)'
                              : `+${(sess.earnedParachuteSeconds / 3600).toFixed(1)}h`}
                          </div>
                        </div>
                      </>
                    }
                    footerContent={
                      <>
                        <span>
                          {sess.dateStr} •{' '}
                          {sess.status === 'completed' ? 'Completed' : 'Used Escape Ticket'}
                        </span>
                        <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-zinc-900 border border-white/10 text-zinc-300 font-bold">
                          {isAborted ? 'escaped' : sess.status}
                        </span>
                      </>
                    }
                  />
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
