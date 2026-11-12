import React from 'react';
import type { AchievementBadgeId, BadgeTierColor, EvaluatedBadge } from '../utils/achievements';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
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
}> = ({ compact = false }) => {
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();

  if (isLiquidGlass) {
    return (
      <span
        data-gold-badge="true"
        className={`inline-flex items-center gap-1 rounded-full font-sans font-semibold uppercase tracking-wider bg-gradient-to-r from-white/15 via-cyan-300/15 to-sky-400/20 text-cyan-100 border border-cyan-300/40 shadow-[inset_0_1px_0_rgba(255,255,255,0.22)] shrink-0 ${
          compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
        }`}
      >
        <Crown size={compact ? 10 : 11} strokeWidth={1.75} className="shrink-0 text-cyan-300" />
        <span>ZERO-SUPPORTER</span>
      </span>
    );
  }

  if (isBespoke) {
    return (
      <span
        data-gold-badge="true"
        className={`inline-flex items-center gap-1 rounded-sm font-mono font-semibold uppercase tracking-wider bg-neutral-950 text-blue-400 border border-blue-500 shrink-0 ${
          compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
        }`}
      >
        <Crown size={compact ? 10 : 11} className="shrink-0 text-blue-500" />
        <span>ZERO-SUPPORTER</span>
      </span>
    );
  }

  return (
    <span
      data-gold-badge="true"
      className={`inline-flex items-center gap-1 rounded-full font-mono font-black uppercase tracking-wider bg-gradient-to-r from-amber-200 via-yellow-400 to-amber-500 text-black border border-amber-100 shadow-[0_0_16px_rgba(251,191,36,0.55)] shrink-0 ${
        compact ? 'px-2 py-0.5 text-[9px]' : 'px-2.5 py-0.5 text-[10px]'
      }`}
    >
      <Crown size={compact ? 10 : 11} className="shrink-0" />
      <span>ZERO-SUPPORTER</span>
    </span>
  );
};

export const AchievementBadgePill: React.FC<{
  badge: EvaluatedBadge;
}> = ({ badge }) => {
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();
  const style = TIER_STYLES[badge.tierColor];

  if (isLiquidGlass) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-sans text-[10px] font-semibold uppercase tracking-wide border ${
          badge.unlocked
            ? badge.tierColor === 'gold'
              ? 'bg-gradient-to-r from-white/15 via-cyan-300/15 to-sky-400/20 text-cyan-100 border-cyan-300/40'
              : 'bg-cyan-400/15 text-cyan-100 border-cyan-300/35'
            : 'bg-white/[0.04] text-zinc-400 border-white/[0.08]'
        }`}
      >
        {badge.unlocked ? renderBadgeIcon(badge.id, 10) : <Lock size={9} strokeWidth={1.75} />}
        <span>{badge.title}</span>
      </span>
    );
  }

  if (isBespoke) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-sm font-mono text-[9px] font-semibold uppercase tracking-wide border ${
          badge.unlocked
            ? 'bg-neutral-950 text-blue-400 border-blue-500/70'
            : 'bg-neutral-950 text-neutral-500 border-neutral-800'
        }`}
      >
        {badge.unlocked ? renderBadgeIcon(badge.id, 10) : <Lock size={9} />}
        <span>{badge.title}</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-black uppercase tracking-wide ${
        badge.unlocked
          ? badge.tierColor === 'gold'
            ? style.pill
            : 'border'
          : 'bg-zinc-900 text-zinc-500 border border-zinc-800'
      }`}
      style={
        badge.unlocked && badge.tierColor !== 'gold'
          ? {
              background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
              borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.55)',
              color: 'var(--accent-hex, #FFFFFF)',
            }
          : undefined
      }
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
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();
  const style = TIER_STYLES[badge.tierColor];
  const isGoldUnlocked = badge.unlocked && badge.tierColor === 'gold';

  if (isLiquidGlass) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-3.5 rounded-2xl liquid-spring font-sans space-y-2.5 ${
          badge.unlocked
            ? 'liquid-inset'
            : 'liquid-row opacity-90 hover:brightness-110'
        } ${isSelected ? 'ring-1 ring-cyan-300/50' : ''}`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`!w-8 !h-8 !rounded-xl flex items-center justify-center shrink-0 ${
                badge.unlocked
                  ? 'liquid-pill-active'
                  : 'liquid-squircle text-zinc-400'
              }`}
            >
              {badge.unlocked ? (
                renderBadgeIcon(badge.id, 14)
              ) : (
                <Lock size={12} strokeWidth={1.75} />
              )}
            </div>
            <div className="min-w-0">
              <div
                className={`text-xs font-semibold uppercase tracking-wide truncate ${
                  badge.unlocked ? 'text-white' : 'text-zinc-300'
                }`}
              >
                {badge.title}
              </div>
              <div className="text-[11px] text-zinc-400 truncate mt-0.5">
                {badge.requirementLabel}
              </div>
            </div>
          </div>
          <span
            className={`text-[10px] font-semibold tabular-nums uppercase px-2 py-0.5 rounded-full shrink-0 ${
              badge.unlocked ? 'liquid-pill-active' : 'liquid-pill text-zinc-400'
            }`}
          >
            {badge.unlocked ? 'Earned' : `${badge.progressPct}%`}
          </span>
        </div>

        {!badge.unlocked && (
          <div className="space-y-1.5">
            <div className="w-full h-1.5 rounded-full liquid-track">
              <div
                className="h-full liquid-mercury-fill"
                style={{ width: `${badge.progressPct}%` }}
              />
            </div>
            <div className="text-[10px] tabular-nums text-zinc-400">{badge.progressText}</div>
          </div>
        )}

        {isSelected && (
          <div className="text-xs text-zinc-300 pt-2 border-t border-white/[0.08] leading-relaxed">
            {badge.description}
          </div>
        )}
      </button>
    );
  }

  if (isBespoke) {
    return (
      <button
        type="button"
        onClick={onSelect}
        className={`w-full text-left p-4 rounded-md border transition-colors duration-75 font-sans space-y-2.5 ${
          badge.unlocked
            ? 'bg-black border-neutral-700 hover:border-neutral-500'
            : 'bg-neutral-950 border-neutral-800 hover:border-neutral-600'
        } ${isSelected ? 'border-blue-500 ring-1 ring-blue-500/40' : ''}`}
      >
        <div className="flex items-start justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className={`w-8 h-8 rounded-sm flex items-center justify-center shrink-0 ${
                badge.unlocked
                  ? 'bg-blue-600 text-white'
                  : 'bg-black border border-neutral-800 text-neutral-500'
              }`}
            >
              {badge.unlocked ? renderBadgeIcon(badge.id, 14) : <Lock size={12} />}
            </div>
            <div className="min-w-0">
              <div
                className={`text-xs font-semibold uppercase tracking-wide truncate ${
                  badge.unlocked ? 'text-white' : 'text-neutral-300'
                }`}
              >
                {badge.title}
              </div>
              <div className="font-mono text-[10px] text-neutral-400 truncate mt-0.5">
                {badge.requirementLabel}
              </div>
            </div>
          </div>
          <span
            className={`font-mono tabular-nums text-[10px] font-semibold uppercase px-2 py-0.5 rounded-sm border shrink-0 ${
              badge.unlocked
                ? 'bg-neutral-950 text-blue-400 border-blue-500/50'
                : 'bg-black border-neutral-800 text-neutral-400'
            }`}
          >
            {badge.unlocked ? 'Earned' : `${badge.progressPct}%`}
          </span>
        </div>

        {!badge.unlocked && (
          <div className="space-y-1.5">
            <div className="w-full h-1.5 rounded-none bg-neutral-900 overflow-hidden">
              <div
                className="h-full rounded-none bg-blue-600 transition-all duration-75"
                style={{ width: `${badge.progressPct}%` }}
              />
            </div>
            <div className="font-mono tabular-nums text-[10px] text-neutral-400">
              {badge.progressText}
            </div>
          </div>
        )}

        {isSelected && (
          <div className="font-sans text-xs text-neutral-300 pt-2 border-t border-neutral-800 leading-relaxed">
            {badge.description}
          </div>
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left p-3 rounded-2xl border transition-all font-mono space-y-2 active:scale-[0.99] ${
        badge.unlocked
          ? isGoldUnlocked
            ? style.unlockedBox
            : 'obsidian-inset'
          : 'obsidian-inset-neutral hover:border-white/25 opacity-90'
      } ${isSelected ? 'ring-1 ring-white/50' : ''}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${
              badge.unlocked
                ? isGoldUnlocked
                  ? style.iconBg
                  : 'obsidian-pill-active'
                : 'obsidian-inset-neutral text-zinc-400'
            }`}
          >
            {badge.unlocked ? renderBadgeIcon(badge.id, 14) : <Lock size={12} />}
          </div>
          <div className="min-w-0">
            <div
              className={`text-[11px] font-black uppercase tracking-wide truncate ${
                badge.unlocked
                  ? isGoldUnlocked
                    ? style.label
                    : ''
                  : 'text-zinc-300'
              }`}
              style={
                badge.unlocked && !isGoldUnlocked
                  ? { color: 'var(--accent-hex, #FFFFFF)' }
                  : undefined
              }
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
              ? isGoldUnlocked
                ? 'bg-amber-400 text-black'
                : 'obsidian-pill-active'
              : 'obsidian-inset-neutral text-zinc-400'
          }`}
        >
          {badge.unlocked ? 'Earned' : `${badge.progressPct}%`}
        </span>
      </div>

      {!badge.unlocked && (
        <div className="space-y-1">
          <div className="w-full h-1.5 rounded-full obsidian-inset-neutral overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${badge.progressPct}%`,
                background: isGoldUnlocked
                  ? '#FBBF24'
                  : 'var(--accent-badge-gradient, linear-gradient(135deg, #FFFFFF 0%, #D4D4D8 100%))',
              }}
            />
          </div>
          <div className="text-[9px] text-zinc-400">{badge.progressText}</div>
        </div>
      )}

      {isSelected && (
        <div className="text-[10px] text-zinc-300 pt-1.5 border-t border-white/10 leading-relaxed">
          {badge.description}
        </div>
      )}
    </button>
  );
};
