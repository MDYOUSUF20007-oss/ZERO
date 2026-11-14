import { type CanonicalThemeId, type ThemeEngineDefinition } from './types';
import { fluentEngine } from './engine-fluent';

export * from './types';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  fluent: fluentEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  fluentEngine,
] as const;

export function normalizeThemeId(_raw?: string | null): CanonicalThemeId {
  return 'fluent';
}
