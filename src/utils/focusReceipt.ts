import type { SessionRecord, ZeroProfile } from '../types';

export type FlexPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

export const DEFAULT_FOCUS_RECEIPT_MOTTO = 'Put your phone facedown. Reclaim your hours.';

export const FOCUS_RECEIPT_PERIOD_LABELS: Record<
  FlexPeriod,
  { title: string; tabLabel: string; subtitle: string; daysBack: number | null }
> = {
  today: { title: 'TODAY', tabLabel: 'Today', subtitle: 'Last 24h Focus', daysBack: 1 },
  week: { title: 'THIS WEEK', tabLabel: 'Week', subtitle: 'Past 7 Days', daysBack: 7 },
  month: { title: 'THIS MONTH', tabLabel: 'Month', subtitle: 'Past 30 Days', daysBack: 30 },
  year: { title: 'LAST 1 YEAR', tabLabel: '1 Year', subtitle: 'Past 365 Days', daysBack: 365 },
  all: { title: 'ALL TIME', tabLabel: 'All', subtitle: 'Lifetime Reclaimed', daysBack: null },
};

export const FOCUS_RECEIPT_PERIOD_ORDER: FlexPeriod[] = [
  'today',
  'week',
  'month',
  'year',
  'all',
];

export function formatReceiptDuration(totalSeconds: number): string {
  const safeSeconds = Math.max(0, Number.isFinite(totalSeconds) ? totalSeconds : 0);
  const mins = Math.round(safeSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

export function formatReceiptHandle(profile?: Pick<ZeroProfile, 'handle' | 'displayName'> | null): string {
  const raw = profile?.handle?.trim() || profile?.displayName?.trim() || 'anonymous';
  const stripped = raw.replace(/^@+/, '').toLowerCase();
  return `@${stripped || 'anonymous'}`;
}

export function formatReceiptMotto(profile?: Pick<ZeroProfile, 'motto'> | null): string {
  const cleaned = profile?.motto?.trim() || DEFAULT_FOCUS_RECEIPT_MOTTO;
  return `"${cleaned}"`;
}

export interface ReceiptPeriodStats {
  totalSeconds: number;
  formattedTime: string;
  completedCount: number;
  completionRate: number;
  topTag: string;
}

export function computeReceiptPeriodStats(
  sessions: SessionRecord[],
  period: FlexPeriod,
  totalReclaimedHours: number,
  nowMs: number = Date.now()
): ReceiptPeriodStats {
  const todayStr = new Date(nowMs).toISOString().split('T')[0];
  const daysBack = FOCUS_RECEIPT_PERIOD_LABELS[period].daysBack;
  const cutoff = daysBack ? nowMs - daysBack * 86400 * 1000 : 0;

  const matching = sessions.filter((s) => {
    if (s.status !== 'completed') return false;
    if (period === 'today') return s.dateStr === todayStr;
    if (daysBack === null) return true;
    return s.endTime >= cutoff;
  });

  const totalSeconds =
    period === 'all' && matching.length === 0
      ? Math.round(Math.max(0, totalReclaimedHours) * 3600)
      : matching.reduce((acc, s) => acc + Math.max(0, s.durationSeconds), 0);

  const tagCounts: Record<string, number> = {};
  matching.forEach((s) => {
    tagCounts[s.tag] = (tagCounts[s.tag] || 0) + Math.max(0, s.durationSeconds);
  });
  const topTagEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

  const completedCount = matching.length;
  const totalAttemptsInPeriod = sessions.filter((s) => {
    if (period === 'today') return s.dateStr === todayStr;
    if (daysBack === null) return true;
    return s.endTime >= cutoff;
  }).length;

  const completionRate =
    totalAttemptsInPeriod > 0
      ? Math.round((completedCount / totalAttemptsInPeriod) * 100)
      : 0;

  return {
    totalSeconds,
    formattedTime: formatReceiptDuration(totalSeconds),
    completedCount,
    completionRate,
    topTag: topTagEntry ? `#${topTagEntry[0]}` : '#MonkMode',
  };
}
