import type { SessionRecord } from '../types';

export type AchievementBadgeId =
  | 'zero_supporter'
  | 'getting_started_1h'
  | 'woo_nice_50h'
  | 'long_way_100h'
  | 'getting_disciplined_250h'
  | 'full_control_500h'
  | 'came_so_far_1000h';

export type BadgeTierColor =
  | 'gold'
  | 'emerald'
  | 'cyan'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'platinum';

export interface AchievementDefinition {
  id: AchievementBadgeId;
  title: string;
  requirementLabel: string;
  description: string;
  kind: 'supporter' | 'single_session_hours' | 'total_hours';
  thresholdHours: number;
  tierColor: BadgeTierColor;
}

export interface EvaluatedBadge extends AchievementDefinition {
  unlocked: boolean;
  progressPct: number;
  progressText: string;
}

export interface BadgeEvaluationSummary {
  badges: EvaluatedBadge[];
  unlockedBadges: EvaluatedBadge[];
  isZeroSupporter: boolean;
  effectiveTotalHours: number;
  maxCompletedSessionHours: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  {
    id: 'zero_supporter',
    title: 'ZERO-SUPPORTER',
    requirementLabel: 'Min ₹50 1st Tip',
    description:
      'Golden crest unlocked strictly after your 1st tip of minimum ₹50 (also gifts +1 Escape Ticket).',
    kind: 'supporter',
    thresholdHours: 0,
    tierColor: 'gold',
  },
  {
    id: 'getting_started_1h',
    title: 'GETTING STARTED',
    requirementLabel: '1st 1h Session',
    description: 'Completed your first 1-hour (or longer) distraction-free lock session.',
    kind: 'single_session_hours',
    thresholdHours: 1,
    tierColor: 'emerald',
  },
  {
    id: 'woo_nice_50h',
    title: 'WOO NICE!',
    requirementLabel: '50h Focus',
    description: 'Reclaimed 50 cumulative phone-free hours across completed sessions.',
    kind: 'total_hours',
    thresholdHours: 50,
    tierColor: 'cyan',
  },
  {
    id: 'long_way_100h',
    title: 'LONG WAY',
    requirementLabel: '100h Focus',
    description: 'Crossed 100 cumulative hours of phone-free discipline.',
    kind: 'total_hours',
    thresholdHours: 100,
    tierColor: 'indigo',
  },
  {
    id: 'getting_disciplined_250h',
    title: 'GETTING DISCIPLINED',
    requirementLabel: '250h Focus',
    description: 'Forged 250 hours of reclaimed focus away from screen distractions.',
    kind: 'total_hours',
    thresholdHours: 250,
    tierColor: 'amber',
  },
  {
    id: 'full_control_500h',
    title: 'FULL CONTROL !',
    requirementLabel: '500h Focus',
    description: 'Completed 500 hours phone-free. Habits obey intent.',
    kind: 'total_hours',
    thresholdHours: 500,
    tierColor: 'rose',
  },
  {
    id: 'came_so_far_1000h',
    title: 'CAME SO FAR',
    requirementLabel: '1000h Focus',
    description: 'Reclaimed 1,000+ hours of real life from algorithmic noise.',
    kind: 'total_hours',
    thresholdHours: 1000,
    tierColor: 'platinum',
  },
];

export function evaluateBadges(input: {
  sessions: SessionRecord[];
  totalReclaimedHours: number;
  isZeroSupporter: boolean;
}): BadgeEvaluationSummary {
  const completed = input.sessions.filter((s) => s.status === 'completed');
  const maxSessionSeconds = completed.reduce(
    (max, s) => Math.max(max, Math.max(0, s.durationSeconds || 0)),
    0
  );
  const completedHoursFromSessions =
    completed.reduce((sum, s) => sum + Math.max(0, s.durationSeconds || 0), 0) / 3600;

  const maxCompletedSessionHours = Number((maxSessionSeconds / 3600).toFixed(2));
  const effectiveTotalHours = Math.max(
    0,
    Math.max(Number(input.totalReclaimedHours) || 0, completedHoursFromSessions)
  );

  const badges: EvaluatedBadge[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    if (def.kind === 'supporter') {
      return {
        ...def,
        unlocked: Boolean(input.isZeroSupporter),
        progressPct: input.isZeroSupporter ? 100 : 0,
        progressText: input.isZeroSupporter
          ? 'Unlocked'
          : 'Min ₹50 1st tip unlocks gold crest',
      };
    }

    if (def.kind === 'single_session_hours') {
      const unlocked = maxSessionSeconds >= def.thresholdHours * 3600;
      const pct = unlocked
        ? 100
        : Math.min(99, Math.round((maxSessionSeconds / (def.thresholdHours * 3600)) * 100));
      return {
        ...def,
        unlocked,
        progressPct: pct,
        progressText: unlocked
          ? 'Unlocked'
          : `Best lock: ${Math.floor(maxSessionSeconds / 60)}m / 60m`,
      };
    }

    const unlocked = effectiveTotalHours >= def.thresholdHours;
    const pct = unlocked
      ? 100
      : Math.min(99, Math.round((effectiveTotalHours / def.thresholdHours) * 100));
    const displayCur = Number(effectiveTotalHours.toFixed(1));
    return {
      ...def,
      unlocked,
      progressPct: pct,
      progressText: unlocked ? 'Unlocked' : `${displayCur}h / ${def.thresholdHours}h`,
    };
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);

  return {
    badges,
    unlockedBadges,
    isZeroSupporter: Boolean(input.isZeroSupporter),
    effectiveTotalHours: Number(effectiveTotalHours.toFixed(1)),
    maxCompletedSessionHours,
  };
}
