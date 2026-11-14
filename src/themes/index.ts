import { type CanonicalThemeId, type ThemeEngineDefinition } from './types';
import { materialEngine } from './engine-material';
import { fluentEngine } from './engine-fluent';
import { minimalEngine } from './engine-minimal';
import { classicEngine } from './engine-classic';

export * from './types';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  material: materialEngine,
  fluent: fluentEngine,
  minimal: minimalEngine,
  classic: classicEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  materialEngine,
  fluentEngine,
  minimalEngine,
  classicEngine,
] as const;

export function normalizeThemeId(raw: string | null | undefined): CanonicalThemeId {
  if (!raw) return 'material';
  const cleaned = raw.trim().toLowerCase();
  switch (cleaned) {
    case 'material':
    case 'material-you':
    case 'mat-studio':
    case 'fintech':
    case 'trantor':
      return 'material';
    case 'fluent':
    case 'fluent-glass':
    case 'liquid-glass':
    case 'glass':
      return 'fluent';
    case 'minimal':
    case 'minimalist':
    case 'kindle':
    case 'monochrome':
    case 'bespoke':
      return 'minimal';
    case 'classic':
    case 'default':
    case 'slate':
    case 'classic-v2':
    case 'onyx':
    case 'amoled':
    case 'dark-amoled':
      return 'classic';
    default:
      return 'material';
  }
}
