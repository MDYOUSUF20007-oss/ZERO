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
  type InterfaceStyle,
  type ThemeEngineDefinition,
  THEME_ENGINES,
  AVAILABLE_THEMES,
  normalizeThemeId,
} from '../themes';
import type { ThemeConfig, ClassicPreset, M3Palette } from '../types';

export type { CanonicalThemeId, InterfaceStyle, ThemeEngineDefinition };
export { AVAILABLE_THEMES, normalizeThemeId };

const STORAGE_KEY = 'zero_isolated_theme_engine_v4';
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

function mountIsolatedThemeEngine(themeId: CanonicalThemeId): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  // 1. Wipe all inline styles on <html> and <body> so nothing overrides the active engine
  root.removeAttribute('style');
  if (body) {
    body.removeAttribute('style');
    body.removeAttribute('data-theme');
    body.removeAttribute('data-style');
    body.classList.remove(...LEGACY_CLASSES);
  }

  // 2. Remove legacy classes and attributes from <html>
  root.classList.remove(...LEGACY_CLASSES);
  root.removeAttribute('data-style');
  root.setAttribute('data-theme', themeId);
  root.setAttribute('data-engine', themeId);
  root.classList.add('dark');

  // 3. Destroy previous theme engine CSS and mount ONLY the active theme engine file's CSS
  let styleTag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_TAG_ID;
    styleTag.setAttribute('type', 'text/css');
    document.head.appendChild(styleTag);
  }

  const engine = THEME_ENGINES[themeId] ?? THEME_ENGINES.amoled;
  styleTag.textContent = engine.css;
}

export interface InterfaceStyleContextValue {
  theme: CanonicalThemeId;
  setTheme: (next: InterfaceStyle) => void;
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
  setMaterialYouSeed: (s: string) => void;
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
  const [theme, setThemeState] = useState<CanonicalThemeId>(() => {
    if (typeof window === 'undefined') return 'amoled';
    try {
      for (const oldKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(oldKey);
      }
      const saved = window.localStorage.getItem(STORAGE_KEY);
      const initial = normalizeThemeId(saved);
      mountIsolatedThemeEngine(initial);
      return initial;
    } catch {
      mountIsolatedThemeEngine('amoled');
      return 'amoled';
    }
  });

  useEffect(() => {
    mountIsolatedThemeEngine(theme);
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      // Ignore storage errors
    }
  }, [theme]);

  const setTheme = useCallback((next: InterfaceStyle) => {
    const normalized = normalizeThemeId(String(next));
    mountIsolatedThemeEngine(normalized);
    setThemeState(normalized);
    try {
      window.localStorage.setItem(STORAGE_KEY, normalized);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const value = useMemo<InterfaceStyleContextValue>(
    () => ({
      theme,
      setTheme,
      interfaceStyle: theme,
      setInterfaceStyle: setTheme,
      style: theme,
      setStyle: setTheme,
      activeEngine: THEME_ENGINES[theme] ?? THEME_ENGINES.amoled,
      availableThemes: AVAILABLE_THEMES,

      engine: theme,
      setEngine: setTheme,
      isOnyx: theme === 'amoled',
      isFintech: theme === 'material',
      isClassic: theme === 'classic',
      isClassicV2: theme === 'classic',
      isTrantor: theme === 'material',
      isMaterialYou: theme === 'material',
      isFluent: theme === 'fluent',
      isFluentGlass: theme === 'fluent',
      isLiquidGlass: theme === 'fluent',
      isMinimalist: theme === 'minimal',
      isBespoke: theme === 'minimal',

      classicPreset: 'amoled',
      setClassicPreset: () => {},
      m3Palette: 'deep-purple',
      setM3Palette: () => {},
      amoled: theme === 'amoled',
      setAmoled: () => {},
      materialYouSeed: 'purple',
      setMaterialYouSeed: () => {},
      materialYouAmoled: true,
      setMaterialYouAmoled: () => {},
      fluentOrbIntensity: 0.75,
      setFluentOrbIntensity: () => {},
      fluentBlurStrength: 28,
      setFluentBlurStrength: () => {},
      fluentSpecularHighlight: 0.38,
      setFluentSpecularHighlight: () => {},
      minimalistBorderWidth: '1px',
      setMinimalistBorderWidth: () => {},
      minimalistTypography: 'sans',
      setMinimalistTypography: () => {},
      minimalistTelemetryDensity: 'standard',
      setMinimalistTelemetryDensity: () => {},
      classicV2Surface: 'obsidian',
      setClassicV2Surface: () => {},
      classicV2Accent: '#FFAA00',
      setClassicV2Accent: () => {},
      trantorSurface: 'matte',
      setTrantorSurface: () => {},
      trantorAccent: '#A3E4D7',
      setTrantorAccent: () => {},
    }),
    [theme, setTheme]
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
