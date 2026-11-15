import { type CanonicalThemeId, type ThemeEngineDefinition } from './types';
import { fluentEngine } from './engine-fluent';
import { aetherialEngine } from './engine-aetherial';

export * from './types';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  fluent: fluentEngine,
  aetherial: aetherialEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  fluentEngine,
  aetherialEngine,
] as const;

export function normalizeThemeId(raw?: string | null): CanonicalThemeId {
  if (!raw) return 'fluent';
  const cleaned = raw.toLowerCase().trim();
  if (cleaned === 'aetherial' || cleaned === 'aetherial_focus' || cleaned === 'cosmic') {
    return 'aetherial';
  }
  return 'fluent';
}
