import { type CanonicalThemeId, type ThemeEngineDefinition } from './types';
import { amoledEngine } from './engine-amoled';
import { fluentEngine } from './engine-fluent';
import { materialEngine } from './engine-material';
import { classicEngine } from './engine-classic';
import { minimalEngine } from './engine-minimal';

export * from './types';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  amoled: amoledEngine,
  fluent: fluentEngine,
  material: materialEngine,
  classic: classicEngine,
  minimal: minimalEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  amoledEngine,
  fluentEngine,
  materialEngine,
  classicEngine,
  minimalEngine,
] as const;

export function normalizeThemeId(raw: string | null | undefined): CanonicalThemeId {
  if (!raw) return 'amoled';
  const cleaned = raw.trim().toLowerCase();
  switch (cleaned) {
    case 'amoled':
    case 'onyx':
    case 'dark-amoled':
      return 'amoled';
    case 'fluent':
    case 'fluent-glass':
    case 'liquid-glass':
    case 'glass':
      return 'fluent';
    case 'material':
    case 'material-you':
    case 'mat-studio':
    case 'fintech':
    case 'trantor':
      return 'material';
    case 'classic':
    case 'default':
    case 'slate':
    case 'classic-v2':
      return 'classic';
    case 'minimal':
    case 'minimalist':
    case 'kindle':
    case 'monochrome':
    case 'bespoke':
      return 'minimal';
    default:
      return 'amoled';
  }
}
