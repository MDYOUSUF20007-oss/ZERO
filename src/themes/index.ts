import { type CanonicalThemeId, type ThemeEngineDefinition } from './types';
import { fluentEngine } from './engine-fluent';
import { aetherialEngine } from './engine-aetherial';
import { aeroEngine } from './engine-aero';

export * from './types';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  fluent: fluentEngine,
  aetherial: aetherialEngine,
  aero: aeroEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  fluentEngine,
  aetherialEngine,
  aeroEngine,
] as const;

export function normalizeThemeId(raw?: string | null): CanonicalThemeId {
  if (!raw) return 'fluent';
  const cleaned = raw.toLowerCase().trim();
  if (cleaned === 'aero' || cleaned === 'aero_ui' || cleaned === 'aeroui') {
    return 'aero';
  }
  if (cleaned === 'aetherial' || cleaned === 'aetherial_focus' || cleaned === 'cosmic') {
    return 'aetherial';
  }
  return 'fluent';
}
