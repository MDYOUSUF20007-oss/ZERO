import React, { useState } from 'react';
import type { ProfileAccent, ProfileAvatarId } from '../types';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { haptics } from '../utils/haptics';

// 1. Dynamic Accent Palette Mapping (matches the 4 Profile Accents)
export const ACCENT_THEMES = {
  Amber: {
    hex: '#F59E0B',
    rgb: '245, 158, 11',
    badgeGradient: 'linear-gradient(135deg, #FBBF24 0%, #D97706 100%)',
    badgeText: '#09090B',
  },
  Emerald: {
    hex: '#10B981',
    rgb: '16, 185, 129',
    badgeGradient: 'linear-gradient(135deg, #34D399 0%, #059669 100%)',
    badgeText: '#09090B',
  },
  Monolith: {
    hex: '#F4F4F5',
    rgb: '244, 244, 245',
    badgeGradient: 'linear-gradient(135deg, #FFFFFF 0%, #A1A1AA 100%)',
    badgeText: '#09090B',
  },
  Signal: {
    hex: '#06B6D4',
    rgb: '6, 182, 212',
    badgeGradient: 'linear-gradient(135deg, #22D3EE 0%, #0891B2 100%)',
    badgeText: '#09090B',
  },
} as const;

export type AccentKey = keyof typeof ACCENT_THEMES;
export type EmblemKey = 'Monk' | 'Void Eye' | 'Sentinel' | 'Spark' | 'Night Owl' | 'Ember';

export const AVATAR_ID_TO_EMBLEM: Record<ProfileAvatarId, EmblemKey> = {
  monk: 'Monk',
  void: 'Void Eye',
  shield: 'Sentinel',
  bolt: 'Spark',
  owl: 'Night Owl',
  flame: 'Ember',
};

export const ACCENT_ID_TO_KEY: Record<ProfileAccent, AccentKey> = {
  amber: 'Amber',
  emerald: 'Emerald',
  white: 'Monolith',
  cyan: 'Signal',
};

export const AVATAR_OPTIONS: Array<{
  id: ProfileAvatarId;
  label: EmblemKey;
}> = [
  { id: 'monk', label: 'Monk' },
  { id: 'void', label: 'Void Eye' },
  { id: 'shield', label: 'Sentinel' },
  { id: 'bolt', label: 'Spark' },
  { id: 'owl', label: 'Night Owl' },
  { id: 'flame', label: 'Ember' },
];

export const ACCENT_STYLES: Record<
  ProfileAccent,
  {
    label: string;
    ring: string;
    badgeBg: string;
    text: string;
    border: string;
    glow: string;
    bar: string;
  }
> = {
  amber: {
    label: 'Amber',
    ring: 'border-amber-400/70 bg-amber-500/15 text-amber-300',
    badgeBg: 'bg-amber-400 text-black',
    text: 'text-amber-300',
    border: 'border-amber-400/50',
    glow: 'shadow-[0_0_24px_rgba(245,158,11,0.3)]',
    bar: 'bg-amber-400',
  },
  emerald: {
    label: 'Emerald',
    ring: 'border-emerald-400/70 bg-emerald-500/15 text-emerald-300',
    badgeBg: 'bg-emerald-400 text-black',
    text: 'text-emerald-300',
    border: 'border-emerald-400/50',
    glow: 'shadow-[0_0_24px_rgba(16,185,129,0.3)]',
    bar: 'bg-emerald-400',
  },
  white: {
    label: 'Monolith',
    ring: 'border-white/70 bg-white/10 text-white',
    badgeBg: 'bg-white text-black',
    text: 'text-zinc-100',
    border: 'border-white/50',
    glow: 'shadow-[0_0_24px_rgba(255,255,255,0.22)]',
    bar: 'bg-white',
  },
  cyan: {
    label: 'Signal',
    ring: 'border-cyan-400/70 bg-cyan-500/15 text-cyan-300',
    badgeBg: 'bg-cyan-400 text-black',
    text: 'text-cyan-300',
    border: 'border-cyan-400/50',
    glow: 'shadow-[0_0_24px_rgba(34,211,238,0.3)]',
    bar: 'bg-cyan-400',
  },
};

// 2. Upgraded Multi-Layered Vector Emblem Icons (Drop-in SVG Renderer)
export const ZeroEmblemIcon: React.FC<{
  emblem: EmblemKey;
  color: string;
  size?: number;
}> = ({ emblem, color, size = 28 }) => {
  switch (emblem) {
    case 'Monk':
      // Concentric Zen Halo + Floating Meditation Core + 4 Cardinal Ticks
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <circle
            cx="12"
            cy="12"
            r="9.5"
            stroke={color}
            strokeWidth="1.2"
            strokeOpacity="0.35"
            strokeDasharray="3 2"
          />
          <circle cx="12" cy="12" r="6.5" stroke={color} strokeWidth="1.75" />
          <circle cx="12" cy="12" r="2.5" fill={color} />
          <path
            d="M12 1.5V3.5M12 20.5V22.5M1.5 12H3.5M20.5 12H22.5"
            stroke={color}
            strokeWidth="1.3"
            strokeLinecap="round"
            strokeOpacity="0.6"
          />
        </svg>
      );

    case 'Void Eye':
      // Cybernetic All-Seeing Geometry + Vertical Slit Pupil + Outer Rays
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M1.75 12C3.6 7.5 7.4 4.75 12 4.75C16.6 4.75 20.4 7.5 22.25 12C20.4 16.5 16.6 19.25 12 19.25C7.4 19.25 3.6 16.5 1.75 12Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="4" stroke={color} strokeWidth="1.4" strokeOpacity="0.85" />
          <ellipse cx="12" cy="12" rx="1.3" ry="2.8" fill={color} />
          <path
            d="M12 2V3.2M12 20.8V22M7 3.2L7.6 4.3M17 3.2L16.4 4.3"
            stroke={color}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeOpacity="0.45"
          />
        </svg>
      );

    case 'Sentinel':
      // Tactical Double-Layered Aegis Shield + Precision Core Check
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2.25L4.25 5.6V11.4C4.25 16.55 7.55 21.15 12 22.5C16.45 21.15 19.75 16.55 19.75 11.4V5.6L12 2.25Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M12 5.1L6.75 7.4V11.3C6.75 15.1 9.05 18.5 12 19.65C14.95 18.5 17.25 15.1 17.25 11.3V7.4L12 5.1Z"
            stroke={color}
            strokeWidth="1.1"
            strokeOpacity="0.35"
            strokeLinejoin="round"
          />
          <path
            d="M9.25 12.1L11.15 14L15 9.85"
            stroke={color}
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'Spark':
      // High-Voltage Split Lightning Bolt + Energy Orbit Nodes
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M13.2 2.25L5.25 13.2H11.5L10.3 21.75L18.75 10.6H12.4L13.2 2.25Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinejoin="round"
          />
          <path
            d="M13.2 2.25L5.25 13.2H11.5L10.3 21.75L18.75 10.6H12.4L13.2 2.25Z"
            fill={color}
            fillOpacity="0.18"
          />
          <circle cx="4.5" cy="6.5" r="1" fill={color} fillOpacity="0.55" />
          <circle cx="19.5" cy="17.5" r="1" fill={color} fillOpacity="0.55" />
        </svg>
      );

    case 'Night Owl':
      // Sharp Crescent Moon + 4-Point Polaris Star + Constellation Nodes
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M19.8 14.6A8.25 8.25 0 0 1 9.4 4.2A8.25 8.25 0 1 0 19.8 14.6Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M19.8 14.6A8.25 8.25 0 0 1 9.4 4.2A8.25 8.25 0 1 0 19.8 14.6Z"
            fill={color}
            fillOpacity="0.14"
          />
          <path
            d="M16.5 4.25L17.25 6.5L19.5 7.25L17.25 8L16.5 10.25L15.75 8L13.5 7.25L15.75 6.5L16.5 4.25Z"
            fill={color}
          />
          <circle cx="13.2" cy="11.2" r="0.9" fill={color} fillOpacity="0.65" />
        </svg>
      );

    case 'Ember':
    default:
      // Twin-Crown Sacred Flame + Inner Core + Rising Sparks
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
          <path
            d="M12.3 2.25C12.5 5.6 9.8 7.5 9.8 10.4C9.8 11.7 10.7 12.6 11.9 12.6C13.2 12.6 14 11.5 14.1 10.1C16.6 11.6 17.75 13.9 17.75 16.15C17.75 19.65 15.15 22 12 22C8.6 22 6.25 19.45 6.25 15.95C6.25 11.65 9.6 7.85 12.3 2.25Z"
            stroke={color}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12 14.4C10.75 15.3 10.1 16.45 10.1 17.65C10.1 18.85 10.95 19.75 12 19.75C13.05 19.75 13.9 18.85 13.9 17.65C13.9 16.45 13.25 15.3 12 14.4Z"
            fill={color}
          />
          <circle cx="16.5" cy="6.5" r="1" fill={color} fillOpacity="0.6" />
          <circle cx="7.2" cy="8.5" r="0.8" fill={color} fillOpacity="0.4" />
        </svg>
      );
  }
};

interface ProfileAvatarProps {
  avatarId: ProfileAvatarId;
  accent?: ProfileAccent;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  glowHighlighted?: boolean;
  onPulse?: () => void;
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarId,
  size = 'md',
  interactive = false,
  glowHighlighted = false,
  onPulse,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const [pulsing, setPulsing] = useState(false);
  const emblem = AVATAR_ID_TO_EMBLEM[avatarId] || 'Monk';

  const boxSize = isBespoke
    ? size === 'lg'
      ? 'w-14 h-14 rounded-md'
      : size === 'sm'
      ? 'w-9 h-9 rounded-sm'
      : 'w-11 h-11 rounded-md'
    : size === 'lg'
    ? 'w-14 h-14 rounded-2xl'
    : size === 'sm'
    ? 'w-9 h-9 rounded-xl'
    : 'w-11 h-11 rounded-2xl';
  const iconPx = size === 'lg' ? 28 : size === 'sm' ? 20 : 24;

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    haptics.tick(960);
    setPulsing(true);
    setTimeout(() => setPulsing(false), isBespoke || isFluentGlass ? 180 : 550);
    onPulse?.();
  };

  if (isFluentGlass) {
    const highlighted = glowHighlighted || pulsing;
    const glassClass = highlighted ? 'liquid-inset' : 'liquid-squircle';
    const glassColor = highlighted ? '#7DD3FC' : '#F4F4F5';
    const scaleCls = pulsing ? 'scale-105' : '';

    if (interactive) {
      return (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Interactive profile emblem"
          style={{ width: undefined, height: undefined }}
          className={`${boxSize} ${glassClass} liquid-spring ${scaleCls} flex items-center justify-center shrink-0`}
        >
          <ZeroEmblemIcon emblem={emblem} color={glassColor} size={iconPx} />
        </button>
      );
    }

    return (
      <div
        style={{ width: undefined, height: undefined }}
        className={`${boxSize} ${glassClass} ${scaleCls} flex items-center justify-center shrink-0`}
      >
        <ZeroEmblemIcon emblem={emblem} color={glassColor} size={iconPx} />
      </div>
    );
  }

  if (isBespoke) {
    const bespokeBorderClass = pulsing
      ? 'border-blue-400'
      : glowHighlighted
      ? 'border-blue-500'
      : 'border-neutral-800';
    const bespokeIconColor = '#3B82F6';

    if (interactive) {
      return (
        <button
          type="button"
          onClick={handleClick}
          aria-label="Interactive profile emblem"
          className={`${boxSize} border ${bespokeBorderClass} bg-neutral-950 hover:border-neutral-600 flex items-center justify-center shrink-0 transition-colors duration-75`}
        >
          <ZeroEmblemIcon emblem={emblem} color={bespokeIconColor} size={iconPx} />
        </button>
      );
    }

    return (
      <div
        className={`${boxSize} border ${bespokeBorderClass} bg-neutral-950 flex items-center justify-center shrink-0 transition-colors duration-75`}
      >
        <ZeroEmblemIcon emblem={emblem} color={bespokeIconColor} size={iconPx} />
      </div>
    );
  }

  const boxGlowStyle: React.CSSProperties =
    glowHighlighted || pulsing
      ? {
          background:
            'radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb, 255, 255, 255), 0.24), rgba(10, 10, 12, 0.96))',
          borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.72)',
          boxShadow: pulsing
            ? '0 0 24px rgba(var(--accent-rgb, 255, 255, 255), 0.42), inset 0 0 8px rgba(var(--accent-rgb, 255, 255, 255), 0.2)'
            : '0 0 14px -1px rgba(var(--accent-rgb, 255, 255, 255), 0.42), inset 0 0 8px rgba(var(--accent-rgb, 255, 255, 255), 0.18)',
        }
      : {
          background:
            'radial-gradient(circle at 50% 35%, rgba(var(--accent-rgb, 255, 255, 255), 0.14), rgba(10, 10, 12, 0.94))',
          borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.45)',
          boxShadow:
            '0 0 10px -2px rgba(var(--accent-rgb, 255, 255, 255), 0.2), inset 0 0 6px rgba(var(--accent-rgb, 255, 255, 255), 0.08)',
        };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Interactive profile emblem"
        style={boxGlowStyle}
        className={`${boxSize} border-2 flex items-center justify-center shrink-0 transition-all duration-300 ${
          pulsing ? 'scale-110 rotate-6' : 'hover:scale-105 active:scale-95'
        }`}
      >
        <ZeroEmblemIcon emblem={emblem} color="var(--accent-hex, #FFFFFF)" size={iconPx} />
      </button>
    );
  }

  return (
    <div
      style={boxGlowStyle}
      className={`${boxSize} border-2 flex items-center justify-center shrink-0 transition-all duration-300`}
    >
      <ZeroEmblemIcon emblem={emblem} color="var(--accent-hex, #FFFFFF)" size={iconPx} />
    </div>
  );
};
