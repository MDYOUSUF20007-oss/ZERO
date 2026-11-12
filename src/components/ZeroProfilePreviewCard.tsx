import React from 'react';
import {
  ZeroEmblemIcon,
  type AccentKey,
  type EmblemKey,
} from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

// 3. Upgraded Top Preview Badge Component (Frosted Two-Tier Obsidian)
export interface ZeroProfilePreviewCardProps {
  callsign: string; // e.g., "MDYOUSUF"
  handle: string; // e.g., "@mdyousuf"
  emblem: EmblemKey; // e.g., "Ember"
  accent?: AccentKey; // Deprecated legacy field; Theme Studio drives active colors
  mission: string; // e.g., "#Deep Work"
  dailyGoalHours: number; // Dynamically bound to slider! e.g., 4 -> shows "4h/day"
  pledge: string; // e.g., "Put your phone facedown. Reclaim your hours."
  rankTitle?: string; // Optional override, defaults to "INITIATE"
  isZeroSupporter?: boolean;
}

export const ZeroProfilePreviewCard: React.FC<ZeroProfilePreviewCardProps> = ({
  callsign,
  handle,
  emblem,
  mission,
  dailyGoalHours,
  pledge,
  rankTitle = 'INITIATE',
  isZeroSupporter = false,
}) => {
  const { isBespoke, isLiquidGlass } = useInterfaceStyle();
  const formattedHandle = handle.trim()
    ? handle.trim().startsWith('@')
      ? handle.trim()
      : `@${handle.trim()}`
    : '@anonymous';
  const formattedMission = mission.trim().startsWith('#')
    ? mission.trim()
    : `#${mission.trim() || 'Deep Work'}`;

  if (isLiquidGlass) {
    return (
      <ObsidianCard
        ambientGlow
        className="my-3 font-sans"
        headerClassName="p-5"
        footerClassName="px-5 py-3"
        headerContent={
          <div className="flex items-center justify-between gap-3.5">
            <div className="flex-shrink-0 w-14 h-14 rounded-2xl liquid-inset flex items-center justify-center">
              <ZeroEmblemIcon emblem={emblem} color="#F4F4F5" size={26} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="font-sans text-white font-semibold text-base tracking-wide uppercase truncate">
                  {callsign.trim() || 'ANONYMOUS'}
                </span>
                <span className="px-2.5 py-0.5 rounded-full liquid-pill-active font-sans text-[10px] font-semibold uppercase tracking-wide">
                  {rankTitle}
                </span>
                {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
              </div>

              <p className="mt-1 text-xs font-sans text-zinc-400 truncate">
                <span>{formattedHandle}</span>
                <span className="mx-1.5 text-zinc-600">•</span>
                <span className="text-cyan-300 font-medium">{formattedMission}</span>
              </p>
            </div>

            <div className="flex-shrink-0 px-3 py-2 rounded-xl liquid-inset text-center">
              <div className="text-sm font-bold font-sans tabular-nums text-cyan-200 leading-none">
                {dailyGoalHours}h/day
              </div>
              <div className="mt-1 text-[9px] font-sans tracking-widest uppercase text-zinc-400">
                TARGET
              </div>
            </div>
          </div>
        }
        footerContent={
          <p className="text-xs font-sans italic text-zinc-300 leading-relaxed break-words">
            &ldquo;{pledge.trim() || 'Put your phone facedown. Reclaim your hours.'}&rdquo;
          </p>
        }
      />
    );
  }

  if (isBespoke) {
    return (
      <ObsidianCard
        className="my-3"
        headerClassName="p-5"
        footerClassName="px-5 py-3"
        headerContent={
          <div className="flex items-center justify-between gap-3.5">
            <div className="flex-shrink-0 w-14 h-14 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-center">
              <ZeroEmblemIcon emblem={emblem} color="#3B82F6" size={26} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center flex-wrap gap-1.5">
                <span className="font-sans text-white font-semibold text-base tracking-wide uppercase truncate">
                  {callsign.trim() || 'ANONYMOUS'}
                </span>
                <span className="px-2 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-blue-400 font-mono text-[10px] font-semibold uppercase tracking-widest">
                  {rankTitle}
                </span>
                {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
              </div>

              <p className="mt-1 text-xs font-mono text-neutral-400 truncate">
                <span>{formattedHandle}</span>
                <span className="mx-1.5 text-neutral-600">•</span>
                <span className="text-blue-400">{formattedMission}</span>
              </p>
            </div>

            <div className="flex-shrink-0 px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 text-center">
              <div className="text-sm font-bold font-mono tabular-nums text-blue-400 leading-none">
                {dailyGoalHours}h/day
              </div>
              <div className="mt-1 text-[9px] font-mono tracking-widest uppercase text-neutral-400">
                TARGET
              </div>
            </div>
          </div>
        }
        footerContent={
          <p className="text-xs font-sans text-neutral-300 leading-relaxed break-words">
            &ldquo;{pledge.trim() || 'Put your phone facedown. Reclaim your hours.'}&rdquo;
          </p>
        }
      />
    );
  }

  return (
    <ObsidianCard
      ambientGlow
      className="my-3"
      headerClassName="px-4 pt-4 pb-3.5"
      footerClassName="px-4 py-2.5"
      headerContent={
        <div className="flex items-center justify-between gap-3.5">
          {/* Left: 60x60px Glowing Double-Border Emblem Box */}
          <div
            className="relative flex-shrink-0 w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all duration-300"
            style={{
              background:
                'radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb, 255, 255, 255), 0.2), rgba(10, 10, 12, 0.96))',
              border: '1.5px solid rgba(var(--accent-rgb, 255, 255, 255), 0.65)',
              boxShadow:
                '0 0 18px -2px rgba(var(--accent-rgb, 255, 255, 255), 0.35), inset 0 0 0 2px rgba(var(--accent-rgb, 255, 255, 255), 0.18), inset 0 0 10px rgba(var(--accent-rgb, 255, 255, 255), 0.15)',
            }}
          >
            <ZeroEmblemIcon emblem={emblem} color="var(--accent-hex, #FFFFFF)" size={28} />
          </div>

          {/* Center: Callsign + Rank Pill + Handle & Mission */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center flex-wrap gap-1.5">
              <span className="text-white font-extrabold text-base tracking-wider uppercase truncate">
                {callsign.trim() || 'ANONYMOUS'}
              </span>
              <span
                className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase shadow-sm obsidian-pill-active"
                style={{
                  boxShadow: '0 0 12px rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
                }}
              >
                {rankTitle}
              </span>
              {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
            </div>

            <p className="mt-1 text-xs font-mono text-zinc-400 truncate">
              <span>{formattedHandle}</span>
              <span className="mx-1.5 text-zinc-600">•</span>
              <span style={{ color: 'rgba(var(--accent-rgb, 255, 255, 255), 0.92)' }}>
                {formattedMission}
              </span>
            </p>
          </div>

          {/* Right: Dynamic Target Box (Reflects whatever hours the user sets) */}
          <div
            className="flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all duration-300"
            style={{
              background: 'rgba(9, 9, 11, 0.78)',
              border: '1px solid rgba(var(--accent-rgb, 255, 255, 255), 0.35)',
              boxShadow: 'inset 0 0 12px rgba(var(--accent-rgb, 255, 255, 255), 0.08)',
            }}
          >
            <div
              className="text-sm font-extrabold font-mono leading-none tracking-tight"
              style={{ color: 'var(--accent-hex, #FFFFFF)' }}
            >
              {dailyGoalHours}h/day
            </div>
            <div className="mt-1 text-[9px] font-mono tracking-[0.18em] uppercase text-zinc-400">
              TARGET
            </div>
          </div>
        </div>
      }
      footerContent={
        <p className="text-xs font-mono italic text-zinc-300 leading-relaxed break-words">
          &ldquo;{pledge.trim() || 'Put your phone facedown. Reclaim your hours.'}&rdquo;
        </p>
      }
    />
  );
};
