import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import {
  type CanonicalThemeId,
  type AccentColorId,
  type InterfaceStyle,
  type ThemeEngineDefinition,
  THEME_ENGINES,
  AVAILABLE_THEMES,
  normalizeThemeId,
} from '../themes';
import type { ThemeConfig, ClassicPreset, M3Palette } from '../types';

export type { CanonicalThemeId, AccentColorId, InterfaceStyle, ThemeEngineDefinition };
export { AVAILABLE_THEMES, normalizeThemeId };

const STORAGE_KEY_THEME = 'zero_isolated_theme_engine_v5';
const STORAGE_KEY_ACCENT = 'zero_theme_accent_seed_v5';
const STORAGE_KEY_GLOW = 'zero_ambient_glow_intensity_v1';
const STYLE_TAG_ID = 'zero-active-theme-engine';

const LEGACY_STORAGE_KEYS = [
  'zero_theme',
  'zero_interface_style',
  'interface_style',
  'interfaceStyle',
  'app_theme',
  'theme',
  'custom_theme',
  'theme_studio_config',
  'zero_custom_theme',
  'zero_theme_v2',
  'zero_clean_theme_v3',
  'zero_isolated_theme_engine_v4',
];

const LEGACY_CLASSES = [
  'theme-classic',
  'theme-minimalist',
  'theme-minimal',
  'theme-fluent',
  'theme-glass',
  'theme-liquid-glass',
  'theme-amoled',
  'theme-onyx',
  'theme-fintech',
  'theme-material',
  'theme-kindle',
  'classic',
  'minimalist',
  'fluent',
  'amoled',
  'material',
];

function mountIsolatedThemeEngine(
  themeId: CanonicalThemeId,
  accent: AccentColorId,
  glowIntensity = 0.35
): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. Wipe all inline styles on <html> and <body> so nothing overrides the active engine
  root.removeAttribute('style');
  if (body) {
    body.removeAttribute('style');
    body.removeAttribute('data-theme');
    body.removeAttribute('data-engine');
    body.removeAttribute('data-accent');
    body.removeAttribute('data-style');
    body.classList.remove(...LEGACY_CLASSES);
  }

  // 2. Set strict DOM attributes
  root.classList.remove(...LEGACY_CLASSES);
  root.removeAttribute('data-style');
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-engine', themeId);
  root.setAttribute('data-accent', accent);
  root.classList.add('dark');

  // Set real-time ambient glow parameters
  root.style.setProperty('--ambient-glow-opacity', glowIntensity.toString());
  root.style.setProperty('--ambient-glow-scale', (0.75 + glowIntensity * 0.45).toString());

  // 3. Destroy previous theme engine CSS and mount ONLY the active theme engine file's CSS
  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_TAG_ID;
    styleTag.setAttribute('type', 'text/css');
    document.head.appendChild(styleTag);
  }

  const engine = THEME_ENGINES[themeId] ?? THEME_ENGINES.fluent;
  styleTag.textContent = engine.css;
}

export interface InterfaceStyleContextValue {
  theme: CanonicalThemeId;
  setTheme: (next: InterfaceStyle) => void;
  restartWithTheme: (next: InterfaceStyle) => void;
  accent: AccentColorId;
  setAccent: (next: AccentColorId) => void;
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (next: InterfaceStyle) => void;
  style: InterfaceStyle;
  setStyle: (next: InterfaceStyle) => void;
  activeEngine: ThemeEngineDefinition;
  availableThemes: readonly ThemeEngineDefinition[];

  // Compatibility properties for zero-distractions components
  engine: string;
  setEngine: (next: string) => void;
  isOnyx: boolean;
  isFintech: boolean;
  isClassic: boolean;
  isClassicV2: boolean;
  isTrantor: boolean;
  isMaterialYou: boolean;
  isFluent: boolean;
  isFluentGlass: boolean;
  isLiquidGlass: boolean;
  isMinimalist: boolean;
  isBespoke: boolean;

  classicPreset: ClassicPreset;
  setClassicPreset: (p: ClassicPreset) => void;
  m3Palette: M3Palette;
  setM3Palette: (p: M3Palette) => void;
  amoled: boolean;
  setAmoled: (a: boolean) => void;
  materialYouSeed: string;
  setMaterialYouSeed: (s: any) => void;
  materialYouAmoled: boolean;
  setMaterialYouAmoled: (a: boolean) => void;
  fluentOrbIntensity: number;
  setFluentOrbIntensity: (i: number) => void;
  fluentBlurStrength: number;
  setFluentBlurStrength: (b: number) => void;
  fluentSpecularHighlight: number;
  setFluentSpecularHighlight: (s: number) => void;
  minimalistBorderWidth: string;
  setMinimalistBorderWidth: (b: string) => void;
  minimalistTypography: string;
  setMinimalistTypography: (t: string) => void;
  minimalistTelemetryDensity: string;
  setMinimalistTelemetryDensity: (d: string) => void;
  classicV2Surface: string;
  setClassicV2Surface: (s: string) => void;
  classicV2Accent: string;
  setClassicV2Accent: (a: string) => void;
  trantorSurface: string;
  setTrantorSurface: (s: string) => void;
  trantorAccent: string;
  setTrantorAccent: (a: string) => void;
}

const InterfaceStyleContext = createContext<InterfaceStyleContextValue | undefined>(undefined);

export interface InterfaceStyleProviderProps {
  children: ReactNode;
  engine?: string;
  setEngine?: (engine: string) => void;
  interfaceStyle?: InterfaceStyle;
  setInterfaceStyle?: (next: any) => void;
  materialYouSeed?: string;
  setMaterialYouSeed?: (s: any) => void;
  materialYouAmoled?: boolean;
  setMaterialYouAmoled?: (a: boolean) => void;
  themeConfig?: ThemeConfig;
  setThemeConfig?: (next: ThemeConfig) => void;
}

export function InterfaceStyleProvider({ children }: InterfaceStyleProviderProps) {
  const [accent, setAccentState] = useState<AccentColorId>(() => {
    if (typeof window === 'undefined') return 'purple';
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_ACCENT);
      return saved === 'cyan' ? 'cyan' : 'purple';
    } catch {
      return 'purple';
    }
  });

  const [fluentOrbIntensity, setFluentOrbIntensityState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.35;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_GLOW);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0 && parsed <= 1) return parsed;
      }
      return 0.35;
    } catch {
      return 0.35;
    }
  });

  const [theme, setThemeState] = useState<CanonicalThemeId>(() => {
    if (typeof window === 'undefined') return 'fluent';
    try {
      for (const oldKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(oldKey);
      }
      mountIsolatedThemeEngine('fluent', 'purple', 0.35);
      return 'fluent';
    } catch {
      mountIsolatedThemeEngine('fluent', 'purple', 0.35);
      return 'fluent';
    }
  });

  const setFluentOrbIntensity = useCallback((intensity: number) => {
    const clamped = Math.max(0, Math.min(1, Math.round(intensity * 100) / 100));
    setFluentOrbIntensityState(clamped);
    if (typeof document !== 'undefined') {
      document.documentElement.style.setProperty('--ambient-glow-opacity', clamped.toString());
      document.documentElement.style.setProperty('--ambient-glow-scale', (0.75 + clamped * 0.45).toString());
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_GLOW, clamped.toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    mountIsolatedThemeEngine('fluent', accent, fluentOrbIntensity);
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, 'fluent');
      window.localStorage.setItem(STORAGE_KEY_ACCENT, accent);
      window.localStorage.setItem(STORAGE_KEY_GLOW, fluentOrbIntensity.toString());
    } catch {
      // Ignore storage errors
    }
  }, [accent, fluentOrbIntensity]);

  const setTheme = useCallback((_next: InterfaceStyle) => {
    mountIsolatedThemeEngine('fluent', accent, fluentOrbIntensity);
    setThemeState('fluent');
  }, [accent, fluentOrbIntensity]);

  const restartWithTheme = useCallback((nextTheme: InterfaceStyle) => {
    if (typeof window === 'undefined') return;
    try {
      const normalized = normalizeThemeId(nextTheme);
      window.localStorage.setItem(STORAGE_KEY_THEME, normalized);
      document.documentElement.removeAttribute('style');
      if (document.body) document.body.removeAttribute('style');
    } catch {
      // ignore
    }
    window.location.reload();
  }, []);

  const setAccent = useCallback((nextAccent: AccentColorId) => {
    const safeAccent = nextAccent === 'cyan' ? 'cyan' : 'purple';
    mountIsolatedThemeEngine('fluent', safeAccent, fluentOrbIntensity);
    setAccentState(safeAccent);
    try {
      window.localStorage.setItem(STORAGE_KEY_ACCENT, safeAccent);
    } catch {
      // Ignore storage errors
    }
  }, [fluentOrbIntensity]);

  const value = useMemo<InterfaceStyleContextValue>(
    () => ({
      theme: 'fluent',
      setTheme,
      restartWithTheme,
      accent,
      setAccent,
      interfaceStyle: 'fluent',
      setInterfaceStyle: setTheme,
      style: 'fluent',
      setStyle: setTheme,
      activeEngine: THEME_ENGINES.fluent,
      availableThemes: AVAILABLE_THEMES,

      engine: 'fluent',
      setEngine: setTheme,
      isOnyx: false,
      isFintech: false,
      isClassic: false,
      isClassicV2: false,
      isTrantor: false,
      isMaterialYou: false,
      isFluent: true,
      isFluentGlass: true,
      isLiquidGlass: true,
      isMinimalist: false,
      isBespoke: false,

      classicPreset: 'amoled',
      setClassicPreset: () => {},
      m3Palette: accent === 'cyan' ? 'cyber-cyan' : 'deep-purple',
      setM3Palette: () => {},
      amoled: true,
      setAmoled: () => {},
      materialYouSeed: accent,
      setMaterialYouSeed: (s: any) => {
        setAccent(s === 'cyan' ? 'cyan' : 'purple');
      },
      materialYouAmoled: true,
      setMaterialYouAmoled: () => {},
      fluentOrbIntensity,
      setFluentOrbIntensity,
      fluentBlurStrength: 16,
      setFluentBlurStrength: () => {},
      fluentSpecularHighlight: 0.32,
      setFluentSpecularHighlight: () => {},
      minimalistBorderWidth: '1px',
      setMinimalistBorderWidth: () => {},
      minimalistTypography: 'sans',
      setMinimalistTypography: () => {},
      minimalistTelemetryDensity: 'standard',
      setMinimalistTelemetryDensity: () => {},
      classicV2Surface: 'obsidian',
      setClassicV2Surface: () => {},
      classicV2Accent: accent === 'cyan' ? '#00f0ff' : '#a855f7',
      setClassicV2Accent: () => {},
      trantorSurface: 'matte',
      setTrantorSurface: () => {},
      trantorAccent: accent === 'cyan' ? '#67d4ff' : '#d0bcff',
      setTrantorAccent: () => {},
    }),
    [theme, setTheme, accent, setAccent, fluentOrbIntensity, setFluentOrbIntensity]
  );

  return (
    <InterfaceStyleContext.Provider value={value}>
      {children}
    </InterfaceStyleContext.Provider>
  );
}

export const ThemeProvider = InterfaceStyleProvider;

export function useInterfaceStyle(): InterfaceStyleContextValue {
  const context = useContext(InterfaceStyleContext);
  if (!context) {
    throw new Error('useInterfaceStyle must be used within an InterfaceStyleProvider');
  }
  return context;
}

export const useTheme = useInterfaceStyle;
export default InterfaceStyleContext;
