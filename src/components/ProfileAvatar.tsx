import React, { useState } from 'react';
import type { ProfileAccent, ProfileAvatarId } from '../types';
import { haptics } from '../utils/haptics';

export const AVATAR_OPTIONS: Array<{
  id: ProfileAvatarId;
  label: string;
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

interface ProfileAvatarProps {
  avatarId: ProfileAvatarId;
  accent?: ProfileAccent;
  size?: 'sm' | 'md' | 'lg';
  interactive?: boolean;
  onPulse?: () => void;
}

function renderAvatarSvg(avatarId: ProfileAvatarId, px: number) {
  switch (avatarId) {
    case 'void':
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z" />
          <circle cx="12" cy="12" r="3" fill="currentColor" />
        </svg>
      );
    case 'shield':
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2 4 5.5v6.5c0 5 3.4 9.2 8 10 4.6-.8 8-5 8-10V5.5L12 2Z" />
          <path d="m9.5 12 1.8 1.8 3.5-3.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    case 'bolt':
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z" strokeLinejoin="round" />
        </svg>
      );
    case 'owl':
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3a9 9 0 0 0 9 9 9 9 0 1 1-9-9Z" />
          <path d="M17 4v4m2-2h-4" strokeLinecap="round" />
        </svg>
      );
    case 'flame':
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 2c2 3.2 5 5.4 5 10a5 5 0 1 1-10 0c0-2.1.8-4 2-5.6.3 1.4 1.2 2.2 2 2.2.2-2.6.5-4.7 1-6.6Z" />
        </svg>
      );
    case 'monk':
    default:
      return (
        <svg width={px} height={px} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="9" />
          <circle cx="12" cy="12" r="3.2" fill="currentColor" />
        </svg>
      );
  }
}

export const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  avatarId,
  accent = 'amber',
  size = 'md',
  interactive = false,
  onPulse,
}) => {
  const [pulsing, setPulsing] = useState(false);
  const style = ACCENT_STYLES[accent] || ACCENT_STYLES.amber;

  const boxSize =
    size === 'lg' ? 'w-14 h-14 rounded-2xl' : size === 'sm' ? 'w-9 h-9 rounded-xl' : 'w-11 h-11 rounded-2xl';
  const iconPx = size === 'lg' ? 26 : size === 'sm' ? 18 : 22;

  const handleClick = (e: React.MouseEvent) => {
    if (!interactive) return;
    e.stopPropagation();
    haptics.tick(960);
    setPulsing(true);
    setTimeout(() => setPulsing(false), 550);
    onPulse?.();
  };

  if (interactive) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-label="Interactive profile emblem"
        className={`${boxSize} border-2 flex items-center justify-center shrink-0 transition-transform duration-300 ${
          style.ring
        } ${pulsing ? `scale-110 rotate-6 ${style.glow}` : 'hover:scale-105 active:scale-95'}`}
      >
        {renderAvatarSvg(avatarId, iconPx)}
      </button>
    );
  }

  return (
    <div
      className={`${boxSize} border-2 flex items-center justify-center shrink-0 ${style.ring}`}
    >
      {renderAvatarSvg(avatarId, iconPx)}
    </div>
  );
};
