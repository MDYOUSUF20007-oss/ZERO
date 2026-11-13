import type {
  AmoledGradientId,
  InterfaceStyle,
  KindlePaperPresetId,
  MatteStudioPresetId,
  ThemeConfig,
  ThemeFamily,
  ThemeStyle,
} from '../types';

export function normalizeInterfaceStyle(value: unknown): InterfaceStyle {
  if (value === 'bespoke') return 'bespoke';
  if (value === 'fluent_glass') return 'fluent_glass';
  // Legacy alias: treat old persisted 'liquid_glass' as 'fluent_glass'
  if (value === 'liquid_glass') return 'fluent_glass';
  return 'classic';
}

export interface AmoledGradientPreset {
  id: AmoledGradientId;
  label: string;
  tagline: string;
  previewCss: string;
  backgroundCss: string;
  accentHex: string;
}

export interface KindlePaperPreset {
  id: Exclude<KindlePaperPresetId, 'custom'>;
  label: string;
  paperColor: string;
  inkAccent: string;
}

export interface MatteStudioPreset {
  id: Exclude<MatteStudioPresetId, 'custom'>;
  label: string;
  baseColor: string;
  accentColor: string;
}

export const AMOLED_GRADIENTS: AmoledGradientPreset[] = [
  {
    id: 'pure',
    label: 'Pure Pitch',
    tagline: 'True 0% pixel glow',
    previewCss: '#000000',
    backgroundCss: '#000000',
    accentHex: '#FFFFFF',
  },
  {
    id: 'ember',
    label: 'Abyssal Ember',
    tagline: 'Warm obsidian halo',
    previewCss: 'radial-gradient(circle at 30% 20%, #78350F, #1C0B02 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(245, 158, 11, 0.20) 0%, rgba(69, 26, 3, 0.28) 42%, #000000 80%)',
    accentHex: '#F59E0B',
  },
  {
    id: 'aurora',
    label: 'Midnight Aurora',
    tagline: 'Deep emerald & pine',
    previewCss: 'radial-gradient(circle at 30% 20%, #065F46, #022C22 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(16, 185, 129, 0.22) 0%, rgba(6, 78, 59, 0.28) 42%, #000000 80%)',
    accentHex: '#34D399',
  },
  {
    id: 'cosmic',
    label: 'Cosmic Dusk',
    tagline: 'Ultraviolet obsidian',
    previewCss: 'radial-gradient(circle at 30% 20%, #5B21B6, #1E1B4B 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(167, 139, 250, 0.22) 0%, rgba(49, 46, 129, 0.30) 44%, #000000 80%)',
    accentHex: '#C4B5FD',
  },
  {
    id: 'crimson',
    label: 'Crimson Void',
    tagline: 'Dark ruby obsidian',
    previewCss: 'radial-gradient(circle at 30% 20%, #9F1239, #2B0613 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(251, 113, 133, 0.21) 0%, rgba(136, 19, 55, 0.28) 42%, #000000 80%)',
    accentHex: '#FB7185',
  },
  {
    id: 'cobalt',
    label: 'Cobalt Cyber',
    tagline: 'Deep arctic sapphire',
    previewCss: 'radial-gradient(circle at 30% 20%, #0369A1, #082F49 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(56, 189, 248, 0.22) 0%, rgba(12, 74, 110, 0.28) 42%, #000000 80%)',
    accentHex: '#38BDF8',
  },
  {
    id: 'solar_gold',
    label: 'Solar Gold',
    tagline: 'Molten bullion champagne',
    previewCss: 'radial-gradient(circle at 30% 20%, #CA8A04, #422006 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(250, 204, 21, 0.22) 0%, rgba(113, 63, 18, 0.28) 42%, #000000 80%)',
    accentHex: '#FACC15',
  },
  {
    id: 'jade_matrix',
    label: 'Jade Matrix',
    tagline: 'Mint phosphor void',
    previewCss: 'radial-gradient(circle at 30% 20%, #0F766E, #042F2E 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(45, 212, 191, 0.22) 0%, rgba(19, 78, 74, 0.28) 42%, #000000 80%)',
    accentHex: '#2DD4BF',
  },
  {
    id: 'indigo_abyss',
    label: 'Indigo Abyss',
    tagline: 'Midnight prism vault',
    previewCss: 'radial-gradient(circle at 30% 20%, #3730A3, #1E1B4B 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(129, 140, 248, 0.24) 0%, rgba(49, 46, 129, 0.30) 44%, #000000 80%)',
    accentHex: '#818CF8',
  },
  {
    id: 'rose_quartz',
    label: 'Rose Quartz',
    tagline: 'Velvet magenta dusk',
    previewCss: 'radial-gradient(circle at 30% 20%, #A21CAF, #4A044E 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(244, 114, 182, 0.22) 0%, rgba(112, 26, 117, 0.28) 42%, #000000 80%)',
    accentHex: '#F472B6',
  },
  {
    id: 'arctic_teal',
    label: 'Arctic Cyan',
    tagline: 'Cryo glacier pulse',
    previewCss: 'radial-gradient(circle at 30% 20%, #0E7490, #083344 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(34, 211, 238, 0.22) 0%, rgba(22, 78, 99, 0.28) 42%, #000000 80%)',
    accentHex: '#22D3EE',
  },
  {
    id: 'bronze_dusk',
    label: 'Bronze Dusk',
    tagline: 'Warm copper monolith',
    previewCss: 'radial-gradient(circle at 30% 20%, #9A3412, #431407 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(251, 146, 60, 0.22) 0%, rgba(124, 45, 18, 0.28) 42%, #000000 80%)',
    accentHex: '#FB923C',
  },
  {
    id: 'vermilion_heat',
    label: 'Vermilion Heat',
    tagline: 'Laser coral ignition',
    previewCss: 'radial-gradient(circle at 30% 20%, #B91C1C, #450A0A 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(248, 113, 113, 0.22) 0%, rgba(127, 29, 29, 0.28) 42%, #000000 80%)',
    accentHex: '#F87171',
  },
  {
    id: 'graphite_silver',
    label: 'Titanium Mist',
    tagline: 'Brushed chrome rim',
    previewCss: 'radial-gradient(circle at 30% 20%, #52525B, #18181B 55%, #000000 100%)',
    backgroundCss:
      'radial-gradient(ellipse 95% 48% at 50% 0%, rgba(212, 212, 216, 0.16) 0%, rgba(39, 39, 42, 0.28) 42%, #000000 80%)',
    accentHex: '#D4D4D8',
  },
];

export const KINDLE_PAPER_PRESETS: KindlePaperPreset[] = [
  { id: 'classic', label: 'Paperwhite', paperColor: '#F4F1EA', inkAccent: '#B45309' },
  { id: 'warm', label: 'Warm Sepia', paperColor: '#EDE0C6', inkAccent: '#9A3412' },
  { id: 'sage', label: 'Botanical Sage', paperColor: '#E3EDE3', inkAccent: '#047857' },
  { id: 'slate', label: 'Cool E-Ink', paperColor: '#E9EDF2', inkAccent: '#1D4ED8' },
  { id: 'blush', label: 'Soft Dusk', paperColor: '#F5E9EC', inkAccent: '#9F1239' },
  { id: 'parchment', label: 'Parchment', paperColor: '#F6EBD8', inkAccent: '#92400E' },
  { id: 'matcha', label: 'Matcha Folio', paperColor: '#E4ECD9', inkAccent: '#3F6212' },
  { id: 'cobalt_ink', label: 'Cobalt Ink', paperColor: '#E6ECF5', inkAccent: '#0F766E' },
  { id: 'plum_ink', label: 'Plum Folio', paperColor: '#F2EAF4', inkAccent: '#6D28D9' },
  { id: 'charcoal_ink', label: 'Newsprint', paperColor: '#ECECE9', inkAccent: '#18181B' },
];

export const MATTE_STUDIO_PRESETS: MatteStudioPreset[] = [
  { id: 'graphite', label: 'Graphite', baseColor: '#141518', accentColor: '#F59E0B' },
  { id: 'taupe', label: 'Warm Taupe', baseColor: '#1C1816', accentColor: '#FB923C' },
  { id: 'nordic', label: 'Nordic Slate', baseColor: '#131820', accentColor: '#38BDF8' },
  { id: 'olive', label: 'Dark Olive', baseColor: '#151914', accentColor: '#34D399' },
  { id: 'espresso', label: 'Espresso', baseColor: '#1C1415', accentColor: '#FB7185' },
  { id: 'obsidian_gold', label: 'Bullion', baseColor: '#171512', accentColor: '#FACC15' },
  { id: 'steel_blue', label: 'Steel Indigo', baseColor: '#121722', accentColor: '#818CF8' },
  { id: 'terracotta', label: 'Terracotta', baseColor: '#1E1614', accentColor: '#F87171' },
  { id: 'amethyst', label: 'Amethyst', baseColor: '#181420', accentColor: '#C4B5FD' },
  { id: 'alpine_mint', label: 'Alpine Mint', baseColor: '#121A1A', accentColor: '#2DD4BF' },
];

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  family: 'amoled',
  amoledGradient: 'pure',
  kindlePreset: 'classic',
  kindlePaperColor: '#F4F1EA',
  kindleInkAccent: '#B45309',
  mattePreset: 'graphite',
  matteBaseColor: '#141518',
  matteAccentColor: '#F59E0B',
};

export function normalizeHexColor(input: string | undefined, fallback: string): string {
  if (!input || typeof input !== 'string') return fallback;
  const cleaned = input.trim().toUpperCase();
  if (/^#[0-9A-F]{6}$/.test(cleaned)) return cleaned;
  if (/^#[0-9A-F]{3}$/.test(cleaned)) {
    const r = cleaned[1];
    const g = cleaned[2];
    const b = cleaned[3];
    return `#${r}${r}${g}${g}${b}${b}`;
  }
  return fallback;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = normalizeHexColor(hex, '#000000').slice(1);
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const clamp = (n: number) => Math.max(0, Math.min(255, Math.round(n)));
  return (
    '#' +
    [clamp(r), clamp(g), clamp(b)]
      .map((n) => n.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase()
  );
}

export function mixHexColors(hexA: string, hexB: string, ratioB: number): string {
  const t = Math.max(0, Math.min(1, ratioB));
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  return rgbToHex(
    a.r + (b.r - a.r) * t,
    a.g + (b.g - a.g) * t,
    a.b + (b.b - a.b) * t
  );
}

export function getRelativeLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function computeDynamicAccentTokens(hexInput: string): {
  hex: string;
  rgb: string;
  badgeGradient: string;
  badgeText: string;
} {
  const hex = normalizeHexColor(hexInput, '#F59E0B');
  const { r, g, b } = hexToRgb(hex);
  const lightStop = mixHexColors(hex, '#FFFFFF', 0.24);
  const deepStop = mixHexColors(hex, '#000000', 0.22);
  const badgeText = getRelativeLuminance(hex) >= 0.34 ? '#09090B' : '#FFFFFF';
  return {
    hex,
    rgb: `${r}, ${g}, ${b}`,
    badgeGradient: `linear-gradient(135deg, ${lightStop} 0%, ${deepStop} 100%)`,
    badgeText,
  };
}

export interface ActiveAccentTokens {
  hex: string;
  rgb: string;
  badgeGradient: string;
  badgeText: string;
}

export function resolveActiveAccentTokens(
  config: ThemeConfig,
  _legacyFallback?: ActiveAccentTokens
): ActiveAccentTokens {
  const runtime = computeThemeRuntime(config);
  return computeDynamicAccentTokens(runtime.cssVars['--zero-accent'] || '#FFFFFF');
}

export function migrateLegacyThemeStyle(style?: ThemeStyle | null): ThemeFamily {
  if (style === 'kindle') return 'kindle';
  if (style === 'matte') return 'matte';
  return 'amoled';
}

export function sanitizeThemeConfig(
  raw?: Partial<ThemeConfig> | null,
  legacyTheme?: ThemeStyle
): ThemeConfig {
  const fallbackFamily = migrateLegacyThemeStyle(legacyTheme);
  const family: ThemeFamily =
    raw?.family === 'amoled' || raw?.family === 'kindle' || raw?.family === 'matte'
      ? raw.family
      : fallbackFamily;

  const amoledGradient: AmoledGradientId = AMOLED_GRADIENTS.some(
    (g) => g.id === raw?.amoledGradient
  )
    ? (raw?.amoledGradient as AmoledGradientId)
    : legacyTheme === 'amber'
    ? 'ember'
    : legacyTheme === 'emerald'
    ? 'aurora'
    : 'pure';

  const kindlePreset: KindlePaperPresetId =
    raw?.kindlePreset === 'custom' || KINDLE_PAPER_PRESETS.some((p) => p.id === raw?.kindlePreset)
      ? (raw?.kindlePreset as KindlePaperPresetId)
      : 'classic';

  const mattePreset: MatteStudioPresetId =
    raw?.mattePreset === 'custom' || MATTE_STUDIO_PRESETS.some((p) => p.id === raw?.mattePreset)
      ? (raw?.mattePreset as MatteStudioPresetId)
      : 'graphite';

  return {
    family,
    amoledGradient,
    kindlePreset,
    kindlePaperColor: normalizeHexColor(
      raw?.kindlePaperColor,
      DEFAULT_THEME_CONFIG.kindlePaperColor
    ),
    kindleInkAccent: normalizeHexColor(
      raw?.kindleInkAccent,
      DEFAULT_THEME_CONFIG.kindleInkAccent
    ),
    mattePreset,
    matteBaseColor: normalizeHexColor(
      raw?.matteBaseColor,
      DEFAULT_THEME_CONFIG.matteBaseColor
    ),
    matteAccentColor: normalizeHexColor(
      raw?.matteAccentColor,
      DEFAULT_THEME_CONFIG.matteAccentColor
    ),
  };
}

export interface ComputedThemeRuntime {
  family: ThemeFamily;
  mode: 'dark' | 'light';
  metaThemeColor: string;
  cssVars: Record<string, string>;
}

export function computeThemeRuntime(config: ThemeConfig): ComputedThemeRuntime {
  if (config.family === 'kindle') {
    // Keep Kindle Paper readable even if user picks an unexpectedly dark swatch in color picker
    const rawPaper = normalizeHexColor(config.kindlePaperColor, '#F4F1EA');
    const paperColor =
      getRelativeLuminance(rawPaper) < 0.55 ? mixHexColors(rawPaper, '#F4F1EA', 0.75) : rawPaper;

    const rawAccent = normalizeHexColor(config.kindleInkAccent, '#B45309');
    const inkAccent =
      getRelativeLuminance(rawAccent) > 0.55 ? mixHexColors(rawAccent, '#1C1917', 0.62) : rawAccent;

    const inkPrimary = '#1C1917';
    const inkSecondary = '#37332F';
    const inkMuted = '#6B655E';
    const surface1 = mixHexColors(paperColor, '#FFFFFF', 0.42);
    const surface2 = mixHexColors(paperColor, inkPrimary, 0.07);
    const surface3 = mixHexColors(paperColor, inkPrimary, 0.14);
    const border = mixHexColors(paperColor, inkPrimary, 0.20);
    const borderSubtle = mixHexColors(paperColor, inkPrimary, 0.12);

    return {
      family: 'kindle',
      mode: 'light',
      metaThemeColor: paperColor,
      cssVars: {
        '--zero-bg-primary': paperColor,
        '--zero-bg-image':
          'radial-gradient(rgba(28, 25, 23, 0.045) 1px, transparent 1px)',
        '--zero-bg-size': '16px 16px',
        '--zero-surface-1': surface1,
        '--zero-surface-2': surface2,
        '--zero-surface-3': surface3,
        '--zero-border': border,
        '--zero-border-subtle': borderSubtle,
        '--zero-ink-primary': inkPrimary,
        '--zero-ink-secondary': inkSecondary,
        '--zero-ink-muted': inkMuted,
        '--zero-inverted-bg': inkPrimary,
        '--zero-inverted-text': surface1,
        '--zero-accent': inkAccent,
        '--zero-dial-stroke': inkAccent,
        '--zero-nav-bg': hexToRgba(surface1, 0.94),
        '--zero-backdrop': 'rgba(24, 24, 27, 0.64)',
      },
    };
  }

  if (config.family === 'matte') {
    const rawBase = normalizeHexColor(config.matteBaseColor, '#141518');
    // Matte Studio stays comfortably matte charcoal (dark studio tone without black crush or glare)
    const baseColor =
      getRelativeLuminance(rawBase) > 0.28 ? mixHexColors(rawBase, '#141518', 0.80) : rawBase;
    const rawAccent = normalizeHexColor(config.matteAccentColor, '#F59E0B');
    const accent =
      getRelativeLuminance(rawAccent) < 0.25 ? mixHexColors(rawAccent, '#FFFFFF', 0.45) : rawAccent;

    const surface1 = mixHexColors(baseColor, '#FFFFFF', 0.055);
    const surface2 = mixHexColors(baseColor, '#FFFFFF', 0.105);
    const surface3 = mixHexColors(baseColor, '#FFFFFF', 0.16);
    const border = mixHexColors(baseColor, '#FFFFFF', 0.17);
    const borderSubtle = mixHexColors(baseColor, '#FFFFFF', 0.10);

    return {
      family: 'matte',
      mode: 'dark',
      metaThemeColor: baseColor,
      cssVars: {
        '--zero-bg-primary': baseColor,
        '--zero-bg-image': `radial-gradient(ellipse 100% 45% at 50% 0%, ${hexToRgba(
          accent,
          0.11
        )} 0%, transparent 72%)`,
        '--zero-bg-size': '100% 100%',
        '--zero-surface-1': surface1,
        '--zero-surface-2': surface2,
        '--zero-surface-3': surface3,
        '--zero-border': border,
        '--zero-border-subtle': borderSubtle,
        '--zero-ink-primary': '#F4F4F5',
        '--zero-ink-secondary': '#D4D4D8',
        '--zero-ink-muted': '#A1A1AA',
        '--zero-inverted-bg': '#F4F4F5',
        '--zero-inverted-text': baseColor,
        '--zero-accent': accent,
        '--zero-dial-stroke': accent,
        '--zero-nav-bg': hexToRgba(surface1, 0.92),
        '--zero-backdrop': 'rgba(10, 10, 12, 0.88)',
      },
    };
  }

  // AMOLED Family (Pure Pitch & Gradient AMOLED presets)
  const gradientPreset =
    AMOLED_GRADIENTS.find((g) => g.id === config.amoledGradient) || AMOLED_GRADIENTS[0];

  return {
    family: 'amoled',
    mode: 'dark',
    metaThemeColor: '#000000',
    cssVars: {
      '--zero-bg-primary': '#000000',
      '--zero-bg-image':
        gradientPreset.id === 'pure' ? 'none' : gradientPreset.backgroundCss,
      '--zero-bg-size': '100% 100%',
      '--zero-surface-1': '#080809',
      '--zero-surface-2': '#121215',
      '--zero-surface-3': '#1E1E22',
      '--zero-border': '#27272A',
      '--zero-border-subtle': '#18181B',
      '--zero-ink-primary': '#FFFFFF',
      '--zero-ink-secondary': '#E4E4E7',
      '--zero-ink-muted': '#A1A1AA',
      '--zero-inverted-bg': '#FFFFFF',
      '--zero-inverted-text': '#000000',
      '--zero-accent': gradientPreset.accentHex,
      '--zero-dial-stroke':
        gradientPreset.id === 'pure' ? '#EDEDED' : gradientPreset.accentHex,
      '--zero-nav-bg': 'rgba(0, 0, 0, 0.92)',
      '--zero-backdrop': 'rgba(0, 0, 0, 0.92)',
    },
  };
}
