import type {
  DashboardWidgetsConfig,
  HeatmapTimeframe,
  InsightWidgetId,
  SessionRecord,
} from '../types';

export const WIDGET_ORDER_DEFAULT: InsightWidgetId[] = [
  'discipline_heatmap',
  'overview_kpis',
  'badges',
  'tag_breakdown',
];

export const WIDGET_LABELS: Record<
  InsightWidgetId,
  { title: string; subtitle: string }
> = {
  discipline_heatmap: {
    title: 'Discipline Heatmap',
    subtitle: 'Daily, Weekly, Monthly & Merged All-Time grid',
  },
  overview_kpis: {
    title: 'Key Focus Metrics (2×2)',
    subtitle: 'Reclaimed hours, streak, completion & avg session',
  },
  badges: {
    title: 'Badges & Achievements',
    subtitle: 'Milestone ranks & Supporter crest progress',
  },
  tag_breakdown: {
    title: 'Focus Time by Tag',
    subtitle: 'Weighted hours across #Deep Work, #Study, #Sleep',
  },
};

export const DEFAULT_WIDGETS_CONFIG: DashboardWidgetsConfig = {
  visible: {
    discipline_heatmap: true,
    overview_kpis: true,
    badges: true,
    tag_breakdown: true,
  },
  order: [...WIDGET_ORDER_DEFAULT],
  defaultTimeframe: 'weekly',
  syncOverviewWithTimeframe: false,
  showDialWidget: false,
};

const VALID_TIMEFRAMES: HeatmapTimeframe[] = ['daily', 'weekly', 'monthly', 'merged_all'];
const SHORT_DAYS_MON_FIRST = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTH_NAMES = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];
const FULL_MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

export function sanitizeWidgetsConfig(
  raw?: Partial<DashboardWidgetsConfig> | null
): DashboardWidgetsConfig {
  const rawOrder = Array.isArray(raw?.order) ? raw.order : [];
  const seen = new Set<InsightWidgetId>();
  const cleanedOrder: InsightWidgetId[] = [];

  for (const id of rawOrder) {
    if (
      (id === 'discipline_heatmap' ||
        id === 'overview_kpis' ||
        id === 'badges' ||
        id === 'tag_breakdown') &&
      !seen.has(id)
    ) {
      seen.add(id);
      cleanedOrder.push(id);
    }
  }
  for (const fallbackId of WIDGET_ORDER_DEFAULT) {
    if (!seen.has(fallbackId)) {
      seen.add(fallbackId);
      cleanedOrder.push(fallbackId);
    }
  }

  const defaultTimeframe: HeatmapTimeframe = VALID_TIMEFRAMES.includes(
    raw?.defaultTimeframe as HeatmapTimeframe
  )
    ? (raw?.defaultTimeframe as HeatmapTimeframe)
    : DEFAULT_WIDGETS_CONFIG.defaultTimeframe;

  return {
    visible: {
      discipline_heatmap:
        typeof raw?.visible?.discipline_heatmap === 'boolean'
          ? raw.visible.discipline_heatmap
          : true,
      overview_kpis:
        typeof raw?.visible?.overview_kpis === 'boolean'
          ? raw.visible.overview_kpis
          : true,
      badges: typeof raw?.visible?.badges === 'boolean' ? raw.visible.badges : true,
      tag_breakdown:
        typeof raw?.visible?.tag_breakdown === 'boolean'
          ? raw.visible.tag_breakdown
          : true,
    },
    order: cleanedOrder,
    defaultTimeframe,
    syncOverviewWithTimeframe:
      typeof raw?.syncOverviewWithTimeframe === 'boolean'
        ? raw.syncOverviewWithTimeframe
        : false,
    showDialWidget:
      typeof raw?.showDialWidget === 'boolean' ? raw.showDialWidget : true,
  };
}

export function moveWidgetOrder(
  order: InsightWidgetId[],
  id: InsightWidgetId,
  direction: 'up' | 'down'
): InsightWidgetId[] {
  const next = [...order];
  const idx = next.indexOf(id);
  if (idx === -1) return next;
  const swapIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (swapIdx < 0 || swapIdx >= next.length) return next;
  const tmp = next[swapIdx];
  next[swapIdx] = next[idx];
  next[idx] = tmp;
  return next;
}

export function getTodayDateStr(nowMs: number = Date.now()): string {
  return new Date(nowMs).toISOString().split('T')[0];
}

export function parseDateStrUtc(dateStr: string): Date {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(`${dateStr}T00:00:00.000Z`);
    if (!Number.isNaN(d.getTime())) return d;
  }
  const fallback = new Date();
  return new Date(`${fallback.toISOString().split('T')[0]}T00:00:00.000Z`);
}

export function shiftDateStr(dateStr: string, deltaDays: number): string {
  const d = parseDateStrUtc(dateStr);
  d.setUTCDate(d.getUTCDate() + deltaDays);
  return d.toISOString().split('T')[0];
}

export function shiftMonthAnchor(dateStr: string, deltaMonths: number): string {
  const d = parseDateStrUtc(dateStr);
  const year = d.getUTCFullYear();
  const month = d.getUTCMonth();
  const target = new Date(Date.UTC(year, month + deltaMonths, 1));
  return target.toISOString().split('T')[0];
}

/**
 * Converts JS getUTCDay() (0=Sun..6=Sat) to Mon-first index (0=Mon..6=Sun).
 */
export function toMonFirstDayIndex(dateStr: string): number {
  const day = parseDateStrUtc(dateStr).getUTCDay();
  return (day + 6) % 7;
}

export function getMondayWeekStartStr(dateStr: string): string {
  const offset = toMonFirstDayIndex(dateStr);
  return shiftDateStr(dateStr, -offset);
}

function formatShortDateLabel(dateStr: string): string {
  const d = parseDateStrUtc(dateStr);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}`;
}

function formatFullDateLabel(dateStr: string): string {
  const d = parseDateStrUtc(dateStr);
  return `${MONTH_NAMES[d.getUTCMonth()]} ${String(d.getUTCDate()).padStart(2, '0')}, ${d.getUTCFullYear()}`;
}

export function computeIntensityLevel(
  seconds: number,
  targetSeconds: number
): 0 | 1 | 2 | 3 | 4 {
  if (seconds <= 0) return 0;
  const safeTarget = Math.max(60, targetSeconds);
  const ratio = seconds / safeTarget;
  if (ratio < 0.25) return 1;
  if (ratio < 0.6) return 2;
  if (ratio < 1.0) return 3;
  return 4;
}

export function formatDurationCompact(totalSeconds: number): string {
  const safe = Math.max(0, Math.round(totalSeconds));
  if (safe === 0) return '0m';
  const totalMins = Math.max(1, Math.round(safe / 60));
  if (totalMins < 60) return `${totalMins}m`;
  const hrs = Math.floor(totalMins / 60);
  const mins = totalMins % 60;
  return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
}

export interface HourlyHeatmapCell {
  hour: number;
  hourLabel: string;
  seconds: number;
  hours: number;
  minutes: number;
  sessionCount: number;
  level: 0 | 1 | 2 | 3 | 4;
  detailLabel: string;
}

export interface DayHeatmapCell {
  dateStr: string;
  dayShort: string;
  dayNum: number;
  monthShort: string;
  isToday: boolean;
  isFuture: boolean;
  seconds: number;
  hours: number;
  sessionCount: number;
  goalMet: boolean;
  level: 0 | 1 | 2 | 3 | 4;
  detailLabel: string;
}

export interface HeatmapViewResult {
  timeframe: HeatmapTimeframe;
  anchorDateStr: string;
  todayStr: string;
  periodLabel: string;
  canGoNext: boolean;
  totalSeconds: number;
  totalHours: number;
  sessionCount: number;
  activeCount: number;
  goalMetDays: number;
  peakLabel: string;
  peakHours: number;
  hourlyCells: HourlyHeatmapCell[];
  weekCells: DayHeatmapCell[];
  monthLeadingEmpty: number;
  monthCells: DayHeatmapCell[];
  mergedCells: DayHeatmapCell[];
  mergedSpanDays: number;
  mergedWeekCount: number;
  mergedBestDay: { dateStr: string; hours: number } | null;
  mergedLongestStreak: number;
}

interface DailyAggregate {
  seconds: number;
  sessionCount: number;
}

function buildCompletedDayMap(sessions: SessionRecord[]): Record<string, DailyAggregate> {
  const map: Record<string, DailyAggregate> = {};
  for (const s of sessions) {
    if (s.status !== 'completed') continue;
    const key = /^\d{4}-\d{2}-\d{2}$/.test(s.dateStr)
      ? s.dateStr
      : getTodayDateStr(s.endTime || Date.now());
    if (!map[key]) {
      map[key] = { seconds: 0, sessionCount: 0 };
    }
    map[key].seconds += Math.max(0, Math.round(s.durationSeconds));
    map[key].sessionCount += 1;
  }
  return map;
}

function makeDayCell(
  dateStr: string,
  todayStr: string,
  agg: DailyAggregate | undefined,
  dailyTargetSeconds: number
): DayHeatmapCell {
  const d = parseDateStrUtc(dateStr);
  const monIdx = toMonFirstDayIndex(dateStr);
  const seconds = agg?.seconds || 0;
  const sessionCount = agg?.sessionCount || 0;
  const hours = Number((seconds / 3600).toFixed(1));
  const goalMet = seconds >= dailyTargetSeconds && seconds > 0;
  return {
    dateStr,
    dayShort: SHORT_DAYS_MON_FIRST[monIdx],
    dayNum: d.getUTCDate(),
    monthShort: MONTH_NAMES[d.getUTCMonth()],
    isToday: dateStr === todayStr,
    isFuture: dateStr > todayStr,
    seconds,
    hours,
    sessionCount,
    goalMet,
    level: computeIntensityLevel(seconds, dailyTargetSeconds),
    detailLabel: `${formatFullDateLabel(dateStr)} • ${formatDurationCompact(seconds)} (${sessionCount} ${
      sessionCount === 1 ? 'lock' : 'locks'
    })`,
  };
}

function computeLongestStreakFromMap(dayMap: Record<string, DailyAggregate>): number {
  const activeDates = Object.keys(dayMap)
    .filter((k) => dayMap[k].seconds > 0)
    .sort();
  if (activeDates.length === 0) return 0;

  let best = 1;
  let run = 1;
  for (let i = 1; i < activeDates.length; i++) {
    if (shiftDateStr(activeDates[i - 1], 1) === activeDates[i]) {
      run++;
      if (run > best) best = run;
    } else {
      run = 1;
    }
  }
  return best;
}

export function computeHeatmapView(params: {
  sessions: SessionRecord[];
  timeframe: HeatmapTimeframe;
  anchorDateStr?: string;
  nowMs?: number;
  dailyGoalHours?: number;
  useUtc?: boolean;
}): HeatmapViewResult {
  const {
    sessions,
    timeframe,
    nowMs = Date.now(),
    dailyGoalHours = 4,
    useUtc = true,
  } = params;

  const todayStr = getTodayDateStr(nowMs);
  const safeAnchor =
    params.anchorDateStr && /^\d{4}-\d{2}-\d{2}$/.test(params.anchorDateStr)
      ? params.anchorDateStr > todayStr
        ? todayStr
        : params.anchorDateStr
      : todayStr;

  const dailyTargetSeconds = Math.max(1, dailyGoalHours) * 3600;
  const dayMap = buildCompletedDayMap(sessions);

  // 1. DAILY (24 hourly tiles for anchorDateStr)
  const hourlyBuckets = Array.from({ length: 24 }, (_, hour) => ({
    hour,
    seconds: 0,
    sessionCount: 0,
  }));

  const daySessions = sessions.filter(
    (s) => s.status === 'completed' && s.dateStr === safeAnchor
  );
  for (const s of daySessions) {
    let rem = Math.max(0, Math.round(s.durationSeconds));
    if (rem <= 0) continue;
    const endDate = new Date(s.endTime || nowMs);
    const endHour = useUtc ? endDate.getUTCHours() : endDate.getHours();
    const endMinSec =
      (useUtc ? endDate.getUTCMinutes() : endDate.getMinutes()) * 60 +
      (useUtc ? endDate.getUTCSeconds() : endDate.getSeconds());

    let h = endMinSec === 0 && endHour > 0 ? endHour - 1 : endHour;
    let firstBucket = true;
    const touchedHours = new Set<number>();

    while (rem > 0 && h >= 0) {
      const cap = firstBucket ? (endMinSec > 0 ? Math.min(3600, endMinSec) : 3600) : 3600;
      const room = Math.max(0, cap);
      const take = h === 0 ? rem : Math.min(rem, room);
      hourlyBuckets[h].seconds += take;
      touchedHours.add(h);
      rem -= take;
      firstBucket = false;
      h--;
    }

    for (const th of touchedHours) {
      hourlyBuckets[th].sessionCount += 1;
    }
  }

  const hourlyCells: HourlyHeatmapCell[] = hourlyBuckets.map((b) => {
    const minutes = Math.round(b.seconds / 60);
    const hours = Number((b.seconds / 3600).toFixed(2));
    const hourLabel = `${String(b.hour).padStart(2, '0')}`;
    const level: 0 | 1 | 2 | 3 | 4 =
      b.seconds <= 0
        ? 0
        : b.seconds <= 900
        ? 1
        : b.seconds <= 1800
        ? 2
        : b.seconds <= 2700
        ? 3
        : 4;
    return {
      hour: b.hour,
      hourLabel,
      seconds: b.seconds,
      hours,
      minutes,
      sessionCount: b.sessionCount,
      level,
      detailLabel: `${hourLabel}:00–${hourLabel}:59 • ${formatDurationCompact(b.seconds)} (${b.sessionCount} ${
        b.sessionCount === 1 ? 'session' : 'sessions'
      })`,
    };
  });

  // 2. WEEKLY (Mon..Sun around anchorDateStr)
  const weekStartStr = getMondayWeekStartStr(safeAnchor);
  const weekCells: DayHeatmapCell[] = Array.from({ length: 7 }, (_, i) => {
    const dateStr = shiftDateStr(weekStartStr, i);
    return makeDayCell(dateStr, todayStr, dayMap[dateStr], dailyTargetSeconds);
  });

  // 3. MONTHLY (Calendar month matrix for anchorDateStr's YYYY-MM)
  const anchorUtc = parseDateStrUtc(safeAnchor);
  const monthYear = anchorUtc.getUTCFullYear();
  const monthIdx = anchorUtc.getUTCMonth();
  const daysInMonth = new Date(Date.UTC(monthYear, monthIdx + 1, 0)).getUTCDate();
  const firstDayOfMonthStr = new Date(Date.UTC(monthYear, monthIdx, 1))
    .toISOString()
    .split('T')[0];
  const monthLeadingEmpty = toMonFirstDayIndex(firstDayOfMonthStr);
  const monthCells: DayHeatmapCell[] = Array.from({ length: daysInMonth }, (_, i) => {
    const dateStr = new Date(Date.UTC(monthYear, monthIdx, i + 1))
      .toISOString()
      .split('T')[0];
    return makeDayCell(dateStr, todayStr, dayMap[dateStr], dailyTargetSeconds);
  });

  // 4. MERGED ALL (All completed session dates + min 16-week baseline aligned Mon..Sun)
  const thisMondayStr = getMondayWeekStartStr(todayStr);
  const baselineStartStr = shiftDateStr(thisMondayStr, -(15 * 7)); // 16 weeks minimum
  const thisSundayStr = shiftDateStr(thisMondayStr, 6);

  const completedDates = Object.keys(dayMap).sort();
  let mergedStartStr = baselineStartStr;
  if (completedDates.length > 0 && completedDates[0] < mergedStartStr) {
    mergedStartStr = getMondayWeekStartStr(completedDates[0]);
  }

  const mergedCells: DayHeatmapCell[] = [];
  let cursor = mergedStartStr;
  // Cap loop safely at 10 years (~3700 days) to prevent any corrupt historic date from stalling UI
  const hardFloorStr = shiftDateStr(todayStr, -3650);
  if (cursor < hardFloorStr) {
    cursor = getMondayWeekStartStr(hardFloorStr);
  }
  while (cursor <= thisSundayStr) {
    mergedCells.push(
      makeDayCell(cursor, todayStr, dayMap[cursor], dailyTargetSeconds)
    );
    cursor = shiftDateStr(cursor, 1);
  }

  let mergedBestDay: { dateStr: string; hours: number } | null = null;
  for (const [dKey, agg] of Object.entries(dayMap)) {
    if (agg.seconds <= 0) continue;
    const h = Number((agg.seconds / 3600).toFixed(1));
    if (!mergedBestDay || agg.seconds > mergedBestDay.hours * 3600 - 1) {
      if (!mergedBestDay || h > mergedBestDay.hours || (h === mergedBestDay.hours && dKey > mergedBestDay.dateStr)) {
        mergedBestDay = { dateStr: dKey, hours: h };
      }
    }
  }
  // Exact max comparison using raw seconds
  let maxDaySeconds = 0;
  mergedBestDay = null;
  for (const [dKey, agg] of Object.entries(dayMap)) {
    if (agg.seconds > maxDaySeconds) {
      maxDaySeconds = agg.seconds;
      mergedBestDay = {
        dateStr: dKey,
        hours: Number((agg.seconds / 3600).toFixed(1)),
      };
    }
  }

  const mergedLongestStreak = computeLongestStreakFromMap(dayMap);
  const mergedWeekCount = Math.ceil(mergedCells.length / 7);
  const mergedActiveCells = mergedCells.filter((c) => c.seconds > 0);

  // Scoped metrics based on active timeframe
  if (timeframe === 'daily') {
    const totalSeconds = hourlyCells.reduce((acc, h) => acc + h.seconds, 0);
    const activeHours = hourlyCells.filter((h) => h.seconds > 0);
    const peakHour = hourlyCells.reduce(
      (best, cur) => (cur.seconds > best.seconds ? cur : best),
      hourlyCells[0]
    );
    return {
      timeframe,
      anchorDateStr: safeAnchor,
      todayStr,
      periodLabel:
        safeAnchor === todayStr
          ? `Today • ${formatShortDateLabel(safeAnchor)}`
          : formatFullDateLabel(safeAnchor),
      canGoNext: safeAnchor < todayStr,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      sessionCount: daySessions.length,
      activeCount: activeHours.length,
      goalMetDays: totalSeconds >= dailyTargetSeconds ? 1 : 0,
      peakLabel: peakHour && peakHour.seconds > 0 ? `${peakHour.hourLabel}:00` : 'None',
      peakHours: peakHour ? Number((peakHour.seconds / 3600).toFixed(1)) : 0,
      hourlyCells,
      weekCells,
      monthLeadingEmpty,
      monthCells,
      mergedCells,
      mergedSpanDays: mergedActiveCells.length,
      mergedWeekCount,
      mergedBestDay,
      mergedLongestStreak,
    };
  }

  if (timeframe === 'weekly') {
    const totalSeconds = weekCells.reduce((acc, c) => acc + c.seconds, 0);
    const sessionCount = weekCells.reduce((acc, c) => acc + c.sessionCount, 0);
    const activeDays = weekCells.filter((c) => c.seconds > 0).length;
    const goalMetDays = weekCells.filter((c) => c.goalMet).length;
    const peakDay = weekCells.reduce(
      (best, cur) => (cur.seconds > best.seconds ? cur : best),
      weekCells[0]
    );
    const weekEndStr = shiftDateStr(weekStartStr, 6);
    return {
      timeframe,
      anchorDateStr: safeAnchor,
      todayStr,
      periodLabel:
        weekStartStr === thisMondayStr
          ? `This Week • ${formatShortDateLabel(weekStartStr)}–${formatShortDateLabel(weekEndStr)}`
          : `${formatShortDateLabel(weekStartStr)} – ${formatShortDateLabel(weekEndStr)}`,
      canGoNext: weekEndStr < todayStr,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      sessionCount,
      activeCount: activeDays,
      goalMetDays,
      peakLabel: peakDay && peakDay.seconds > 0 ? `${peakDay.dayShort} (${peakDay.hours}h)` : 'None',
      peakHours: peakDay ? peakDay.hours : 0,
      hourlyCells,
      weekCells,
      monthLeadingEmpty,
      monthCells,
      mergedCells,
      mergedSpanDays: mergedActiveCells.length,
      mergedWeekCount,
      mergedBestDay,
      mergedLongestStreak,
    };
  }

  if (timeframe === 'monthly') {
    const totalSeconds = monthCells.reduce((acc, c) => acc + c.seconds, 0);
    const sessionCount = monthCells.reduce((acc, c) => acc + c.sessionCount, 0);
    const activeDays = monthCells.filter((c) => c.seconds > 0).length;
    const goalMetDays = monthCells.filter((c) => c.goalMet).length;
    const peakDay = monthCells.reduce(
      (best, cur) => (cur.seconds > best.seconds ? cur : best),
      monthCells[0]
    );
    const todayUtc = parseDateStrUtc(todayStr);
    const canGoNext =
      monthYear < todayUtc.getUTCFullYear() ||
      (monthYear === todayUtc.getUTCFullYear() && monthIdx < todayUtc.getUTCMonth());

    return {
      timeframe,
      anchorDateStr: safeAnchor,
      todayStr,
      periodLabel: `${FULL_MONTH_NAMES[monthIdx]} ${monthYear}`,
      canGoNext,
      totalSeconds,
      totalHours: Number((totalSeconds / 3600).toFixed(1)),
      sessionCount,
      activeCount: activeDays,
      goalMetDays,
      peakLabel:
        peakDay && peakDay.seconds > 0
          ? `${peakDay.monthShort} ${peakDay.dayNum} (${peakDay.hours}h)`
          : 'None',
      peakHours: peakDay ? peakDay.hours : 0,
      hourlyCells,
      weekCells,
      monthLeadingEmpty,
      monthCells,
      mergedCells,
      mergedSpanDays: mergedActiveCells.length,
      mergedWeekCount,
      mergedBestDay,
      mergedLongestStreak,
    };
  }

  // MERGED_ALL
  const allCompleted = sessions.filter((s) => s.status === 'completed');
  const totalSeconds = allCompleted.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);
  const firstActiveDate = completedDates[0] || mergedStartStr;

  return {
    timeframe: 'merged_all',
    anchorDateStr: safeAnchor,
    todayStr,
    periodLabel: `All Merged (${formatShortDateLabel(firstActiveDate)} – Today)`,
    canGoNext: false,
    totalSeconds,
    totalHours: Number((totalSeconds / 3600).toFixed(1)),
    sessionCount: allCompleted.length,
    activeCount: mergedActiveCells.length,
    goalMetDays: mergedCells.filter((c) => c.goalMet).length,
    peakLabel: mergedBestDay
      ? `${formatShortDateLabel(mergedBestDay.dateStr)} (${mergedBestDay.hours}h)`
      : 'None',
    peakHours: mergedBestDay ? mergedBestDay.hours : 0,
    hourlyCells,
    weekCells,
    monthLeadingEmpty,
    monthCells,
    mergedCells,
    mergedSpanDays: mergedCells.filter((c) => !c.isFuture).length,
    mergedWeekCount,
    mergedBestDay,
    mergedLongestStreak,
  };
}

export interface TimeframeSummaryResult {
  timeframe: HeatmapTimeframe;
  scopeLabel: string;
  totalHours: number;
  totalParachuteHours: number;
  completedCount: number;
  abortedCount: number;
  completionRate: number;
  avgSessionMins: number;
  tagBreakdown: Array<{ tag: string; hours: number; pct: number }>;
}

export function computeTimeframeSummary(params: {
  sessions: SessionRecord[];
  timeframe: HeatmapTimeframe;
  anchorDateStr?: string;
  nowMs?: number;
}): TimeframeSummaryResult {
  const { sessions, timeframe, nowMs = Date.now() } = params;
  const todayStr = getTodayDateStr(nowMs);
  const safeAnchor =
    params.anchorDateStr && /^\d{4}-\d{2}-\d{2}$/.test(params.anchorDateStr)
      ? params.anchorDateStr
      : todayStr;

  const weekStartStr = getMondayWeekStartStr(safeAnchor);
  const weekEndStr = shiftDateStr(weekStartStr, 6);
  const monthPrefix = safeAnchor.slice(0, 7); // YYYY-MM

  const inScope = (s: SessionRecord) => {
    if (timeframe === 'merged_all') return true;
    const dStr = s.dateStr || getTodayDateStr(s.endTime || nowMs);
    if (timeframe === 'daily') return dStr === safeAnchor;
    if (timeframe === 'weekly') return dStr >= weekStartStr && dStr <= weekEndStr;
    return dStr.startsWith(monthPrefix);
  };

  const scoped = sessions.filter(inScope);
  const completed = scoped.filter((s) => s.status === 'completed');
  const abortedCount = scoped.filter((s) => s.status === 'parachuted').length;
  const totalSec = completed.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);
  const parachuteSec = completed.reduce(
    (acc, s) => acc + Math.max(0, s.earnedParachuteSeconds),
    0
  );

  const tagMap: Record<string, number> = {};
  for (const s of completed) {
    tagMap[s.tag] = (tagMap[s.tag] || 0) + s.durationSeconds / 3600;
  }
  const tagEntries = Object.entries(tagMap).sort((a, b) => b[1] - a[1]);
  const maxTag = Math.max(...tagEntries.map((e) => e[1]), 1);

  const scopeLabel =
    timeframe === 'daily'
      ? safeAnchor === todayStr
        ? 'Today'
        : safeAnchor
      : timeframe === 'weekly'
      ? 'This Week'
      : timeframe === 'monthly'
      ? FULL_MONTH_NAMES[parseDateStrUtc(safeAnchor).getUTCMonth()]
      : 'All Time';

  return {
    timeframe,
    scopeLabel,
    totalHours: Number((totalSec / 3600).toFixed(1)),
    totalParachuteHours: Number((parachuteSec / 3600).toFixed(1)),
    completedCount: completed.length,
    abortedCount,
    completionRate:
      scoped.length > 0 ? Math.round((completed.length / scoped.length) * 100) : 0,
    avgSessionMins:
      completed.length > 0 ? Math.round(totalSec / completed.length / 60) : 0,
    tagBreakdown: tagEntries.map(([tag, hours]) => ({
      tag,
      hours: Number(hours.toFixed(1)),
      pct: Math.round((hours / maxTag) * 100),
    })),
  };
}

export function computeMiniWeekHeatmap(
  sessions: SessionRecord[],
  dailyGoalHours: number = 4,
  nowMs: number = Date.now()
): {
  weekCells: DayHeatmapCell[];
  weekTotalHours: number;
  goalMetDays: number;
} {
  const res = computeHeatmapView({
    sessions,
    timeframe: 'weekly',
    nowMs,
    dailyGoalHours,
  });
  return {
    weekCells: res.weekCells,
    weekTotalHours: res.totalHours,
    goalMetDays: res.goalMetDays,
  };
}
