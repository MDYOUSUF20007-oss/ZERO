import React from 'react';
import type { AchievementBadgeId, BadgeTierColor, EvaluatedBadge } from '../utils/achievements';
import {
  Crown,
  Rocket,
  Sparkles,
  Compass,
  ShieldCheck,
  Zap,
  Trophy,
  Lock,
} from 'lucide-react';

const TIER_STYLES: Record<
  BadgeTierColor,
  {
    unlockedBox: string;
    pill: string;
    iconBg: string;
    bar: string;
    label: string;
  }
> = {
  gold: {
    unlockedBox:
      'bg-gradient-to-br from-amber-300/20 via-yellow-500/15 to-amber-600/20 border-amber-300/80 shadow-[0_0_20px_rgba(251,191,36,0.28)]',
    pill: 'bg-gradient-to-r from-amber-300 via-yellow-400 to-amber-500 text-black border border-amber-200 shadow-[0_0_12px_rgba(251,191,36,0.5)]',
    iconBg: 'bg-gradient-to-br from-amber-300 to-amber-500 text-black',
    bar: 'bg-amber-400',
    label: 'text-amber-200',
  },
  emerald: {
    unlockedBox: 'bg-emerald-950/40 border-emerald-500/70',
    pill: 'bg-emerald-400/15 text-emerald-300 border border-emerald-400/60',
    iconBg: 'bg-emerald-400 text-black',
    bar: 'bg-emerald-400',
    label: 'text-emerald-300',
  },
  cyan: {
    unlockedBox: 'bg-cyan-950/40 border-cyan-500/70',
    pill: 'bg-cyan-400/15 text-cyan-300 border border-cyan-400/60',
    iconBg: 'bg-cyan-400 text-black',
    bar: 'bg-cyan-400',
    label: 'text-cyan-300',
  },
  indigo: {
    unlockedBox: 'bg-indigo-950/40 border-indigo-400/70',
    pill: 'bg-indigo-400/15 text-indigo-300 border border-indigo-400/60',
    iconBg: 'bg-indigo-400 text-black',
    bar: 'bg-indigo-400',
    label: 'text-indigo-300',
  },
  amber: {
    unlockedBox: 'bg-amber-950/40 border-amber-500/70',
    pill: 'bg-amber-400/15 text-amber-300 border border-amber-400/60',
    iconBg: 'bg-amber-400 text-black',
    bar: 'bg-amber-400',
    label: 'text-amber-300',
  },
  rose: {
    unlockedBox: 'bg-rose-950/40 border-rose-500/70',
    pill: 'bg-rose-400/15 text-rose-300 border border-rose-400/60',
    iconBg: 'bg-rose-400 text-black',
    bar: 'bg-rose-400',
    label: 'text-rose-300',
  },
  platinum: {
    unlockedBox:
      'bg-gradient-to-br from-white/15 via-zinc-300/10 to-amber-200/15 border-white/80 shadow-[0_0_20px_rgba(255,255,255,0.22)]',
    pill: 'bg-gradient-to-r from-white via-zinc-200 to-amber-200 text-black border border-white',
    iconBg: 'bg-white text-black',
    bar: 'bg-white',
    label: 'text-white',
  },
};

export function renderBadgeIcon(id: AchievementBadgeId, size: number = 14) {
  switch (id) {
    case 'zero_supporter':
      return <Crown size={size} />;
    case 'getting_started_1h':
      return <Rocket size={size} />;
    case 'woo_nice_50h':
      return <Sparkles size={size} />;
    case 'long_way_100h':
      return <Compass size={size} />;
    case 'getting_disciplined_250h':
      return <ShieldCheck size={size} />;
    case 'full_control_500h':
      return <Zap size={size} />;
    case 'came_so_far_1000h':
    default:
      return <Trophy size={size} />;
  }
}

export const ZeroSupporterGoldenBadge: React.FC<{
  compact?: boolean;
}> = ({ compact = false }) => (
  <span
    className={`inline-flex items-center gap-1 rounded-full font-mono font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black border border-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.55)] shrink-0 ${
      compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
    }`}
  >
    <Crown size={compact ? 10 : 11} className="shrink-0" />
    <span>ZERO-SUPPORTER</span>
  </span>
);

export const AchievementBadgePill: React.FC<{
  badge: EvaluatedBadge;
}> = ({ badge }) => {
  const style = TIER_STYLES[badge.tierColor];
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-wide ${
        badge.unlocked
          ? style.pill
          : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
      }`}
    >
      {badge.unlocked ? renderBadgeIcon(badge.id, 10) : <Lock size={9} />}
      <span>{badge.title}</span>
    </span>
  );
};

export const AchievementBadgeCard: React.FC<{
  badge: EvaluatedBadge;
  isSelected?: boolean;
  onSelect?: () => void;
}> = ({ badge, isSelected = false, onSelect }) => {
  const style = TIER_STYLES[badge.tierColor];

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-2xl border transition-all font-mono space-y-2 active:scale-[0.99] ${
        badge.unlocked
          ? style.unlockedBox
          : 'bg-zinc-950/70 border-zinc-850 hover:border-zinc-700 opacity-75'
      } ${isSelected ? 'ring-1 ring-white/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              badge.unlocked ? style.iconBg : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
            }`}
          >
            {badge.unlocked ? renderBadgeIcon(badge.id, 14) : <Lock size={12} />}
          </div>
          <div className="min-w-0">
            <div
              className={`text-[11px] font-black uppercase tracking-wide truncate ${
                badge.unlocked ? style.label : 'text-zinc-400'
              }`}
            >
              {badge.title}
            </div>
            <div className="text-[10px] text-zinc-400 truncate">
              {badge.requirementLabel}
            </div>
          </div>
        </div>
        <span
          className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded shrink-0 ${
            badge.unlocked
              ? badge.tierColor === 'gold'
                ? 'bg-amber-400 text-black'
                : 'bg-emerald-950 text-emerald-300 border border-emerald-700/60'
              : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
          }`}
        >
          {badge.unlocked ? 'Earned' : `${badge.progressPct}%`}
        </span>
      </div>

      {!badge.unlocked && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full bg-zinc-900 overflow-hidden border border-zinc-800">
            <div
              className={`h-full rounded-full transition-all ${style.bar}`}
              style={{ width: `${badge.progressPct}%` }}
            />
          </div>
          <div className="text-[9px] text-zinc-500">{badge.progressText}</div>
        </div>
      )}

      {isSelected && (
        <div className="text-[10px] text-zinc-300 pt-1 border-t border-white/10 leading-relaxed">
          {badge.description}
        </div>
      )}
    </button>
  );
};
