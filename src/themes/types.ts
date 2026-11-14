export type CanonicalThemeId = 'amoled' | 'fluent' | 'material' | 'classic' | 'minimal';

// Prevents TypeScript TS2367 errors if any legacy component compares against an old theme string
export type InterfaceStyle = CanonicalThemeId | (string & {});
export type ThemeId = InterfaceStyle;

export interface ThemeEngineDefinition {
  id: CanonicalThemeId;
  name: string;
  badge: string;
  description: string;
  swatchBg: string;
  swatchSurface: string;
  swatchAccent: string;
  css: string;
}
