import React from 'react';
import {
  ACCENT_THEMES,
  ZeroEmblemIcon,
  type AccentKey,
  type EmblemKey,
} from './ProfileAvatar';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';

// 3. Upgraded Top Preview Badge Component (Frosted Two-Tier Obsidian)
export interface ZeroProfilePreviewCardProps {
  callsign: string; // e.g., "MDYOUSUF"
  handle: string; // e.g., "@mdyousuf"
  emblem: EmblemKey; // e.g., "Ember"
  accent: AccentKey; // e.g., "Amber"
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
  accent,
  mission,
  dailyGoalHours,
  pledge,
  rankTitle = 'INITIATE',
  isZeroSupporter = false,
}) => {
  const theme = ACCENT_THEMES[accent] || ACCENT_THEMES.Amber;
  const formattedHandle = handle.trim()
    ? handle.trim().startsWith('@')
      ? handle.trim()
      : `@${handle.trim()}`
    : '@anonymous';
  const formattedMission = mission.trim().startsWith('#')
    ? mission.trim()
    : `#${mission.trim() || 'Deep Work'}`;

  return (
    <div
      className="relative w-full rounded-2xl overflow-hidden transition-all duration-300 my-3"
      style={{
        background: 'linear-gradient(180deg, rgba(26, 26, 30, 0.96) 0%, rgba(12, 12, 14, 0.99) 100%)',
        border: `1px solid rgba(${theme.rgb}, 0.42)`,
        boxShadow: `0 0 28px -4px rgba(${theme.rgb}, 0.24), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)`,
      }}
    >
      {/* Top Specular Metallic Highlight Line */}
      <div
        className="absolute top-0 left-6 right-6 h-[1.5px] pointer-events-none"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${theme.hex} 50%, transparent 100%)`,
          opacity: 0.85,
        }}
      />

      {/* Ambient Radial Backlight Behind Emblem */}
      <div
        className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none blur-2xl"
        style={{
          background: `radial-gradient(circle, rgba(${theme.rgb}, 0.28) 0%, transparent 70%)`,
        }}
      />

      {/* TIER 1: Emblem + Identity + Dynamic Target Stat Box */}
      <div className="relative z-10 flex items-center justify-between gap-3.5 px-4 pt-4 pb-3.5">
        {/* Left: 60x60px Glowing Double-Border Emblem Box */}
        <div
          className="relative flex-shrink-0 w-[60px] h-[60px] rounded-2xl flex items-center justify-center transition-all duration-300"
          style={{
            background: `radial-gradient(circle at 50% 35%, rgba(${theme.rgb}, 0.2), rgba(10, 10, 12, 0.96))`,
            border: `1.5px solid rgba(${theme.rgb}, 0.65)`,
            boxShadow: `0 0 18px -2px rgba(${theme.rgb}, 0.35), inset 0 0 0 2px rgba(${theme.rgb}, 0.18), inset 0 0 10px rgba(${theme.rgb}, 0.15)`,
          }}
        >
          <ZeroEmblemIcon emblem={emblem} color={theme.hex} size={28} />
        </div>

        {/* Center: Callsign + Rank Pill + Handle & Mission */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center flex-wrap gap-1.5">
            <span className="text-white font-extrabold text-base tracking-wider uppercase truncate">
              {callsign.trim() || 'ANONYMOUS'}
            </span>
            <span
              className="px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest uppercase shadow-sm"
              style={{
                background: theme.badgeGradient,
                color: theme.badgeText,
                boxShadow: `0 0 12px rgba(${theme.rgb}, 0.35)`,
              }}
            >
              {rankTitle}
            </span>
            {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
          </div>

          <p className="mt-1 text-xs font-mono text-zinc-400 truncate">
            <span>{formattedHandle}</span>
            <span className="mx-1.5 text-zinc-600">•</span>
            <span style={{ color: `rgba(${theme.rgb}, 0.9)` }}>{formattedMission}</span>
          </p>
        </div>

        {/* Right: Dynamic Target Box (Reflects whatever hours the user sets) */}
        <div
          className="flex-shrink-0 px-3 py-2 rounded-xl text-center transition-all duration-300"
          style={{
            background: 'rgba(9, 9, 11, 0.78)',
            border: `1px solid rgba(${theme.rgb}, 0.35)`,
            boxShadow: `inset 0 0 12px rgba(${theme.rgb}, 0.08)`,
          }}
        >
          <div
            className="text-sm font-extrabold font-mono leading-none tracking-tight"
            style={{ color: theme.hex }}
          >
            {dailyGoalHours}h/day
          </div>
          <div className="mt-1 text-[9px] font-mono tracking-[0.18em] uppercase text-zinc-400">
            TARGET
          </div>
        </div>
      </div>

      {/* TIER 2: Full-Width Lock Pledge Footer (Never Truncates) */}
      <div
        className="relative z-10 px-4 py-2.5 border-t"
        style={{
          background: 'rgba(5, 5, 7, 0.65)',
          borderColor: 'rgba(255, 255, 255, 0.07)',
        }}
      >
        <p className="text-xs font-mono italic text-zinc-300 leading-relaxed break-words">
          &ldquo;{pledge.trim() || 'Put your phone facedown. Reclaim your hours.'}&rdquo;
        </p>
      </div>
    </div>
  );
};
