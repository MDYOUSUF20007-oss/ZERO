import React, { type CSSProperties, type FormEventHandler, type ReactNode } from 'react';
import { type AccentKey } from './ProfileAvatar';
import { GlassCard } from './GlassCard';

export interface ObsidianCardProps {
  accent?: AccentKey;
  forceAccent?: boolean;
  accentOverride?: { hex: string; rgb: string };
  headerContent: ReactNode; // Tier 1: Primary icon/emblem, title, metadata, action/stat controls
  footerContent?: ReactNode; // Tier 2: Footer status bar, quote, helper note, timestamps
  overlays?: ReactNode; // Optional background shimmer/watermark bounded inside card
  ambientGlow?: boolean;
  fullWidth?: boolean;
  className?: string;
  headerClassName?: string;
  footerClassName?: string;
  style?: CSSProperties;
  onClick?: (e?: React.SyntheticEvent) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  asButton?: boolean;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  'data-amoled-banner'?: string;
  'data-restricted-guide'?: string;
}

/**
 * Unified Fluent Glass Card Surface
 * Direct pure optical Acrylic glass surface with specular highlights and smooth spring physics.
 */
export const ObsidianCard: React.FC<ObsidianCardProps> = (props) => {
  return <GlassCard {...props} />;
};

export const ZeroCard = ObsidianCard;
