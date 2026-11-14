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
import { initActiveThemeMod, removeActiveModStyles } from '../utils/themeMods';

export type { CanonicalThemeId, AccentColorId, InterfaceStyle, ThemeEngineDefinition };
export { AVAILABLE_THEMES, normalizeThemeId };

const STORAGE_KEY_THEME = 'zero_isolated_theme_engine_v5';
const STORAGE_KEY_ACCENT = 'zero_theme_accent_seed_v5';
const STORAGE_KEY_GLOW = 'zero_ambient_glow_intensity_v1';
const STORAGE_KEY_GLASS_STRENGTH = 'zero_fluent_glass_strength_v1';
const STORAGE_KEY_GPU_SAFEGUARD = 'zero_gpu_thermal_safeguard_v1';
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

export function applyGlassTokens(root: HTMLElement, strength: number): void {
  const clamped = Math.max(0.05, Math.min(1, Math.round(strength * 100) / 100));
  // Background alpha: from 0.08 at 0.05 up to 0.72 at 1.0 (clear transparent to deep acrylic)
  const bgAlpha = (0.05 + clamped * 0.67).toFixed(3);
  // Blur: from 2px up to 24px
  const blurPx = Math.round(2 + clamped * 22);
  // Saturation: 125% to 185%
  const satPct = Math.round(125 + clamped * 60);
  // Specular border opacity: 0.06 to 0.38
  const specularAlpha = (0.06 + clamped * 0.32).toFixed(3);
  // Top specular optical highlight line: 0.12 to 0.80
  const specularRim = (0.12 + clamped * 0.68).toFixed(3);
  // Sub-elements & Insets
  const insetAlpha = (0.08 + clamped * 0.57).toFixed(3);
  const rowAlpha = (0.06 + clamped * 0.49).toFixed(3);
  const dockAlpha = (0.25 + clamped * 0.60).toFixed(3);
  const dialAlpha = (0.12 + clamped * 0.48).toFixed(3);
  const glowMult = (0.20 + clamped * 0.70).toFixed(3);
  const modalBgAlpha = (0.72 + clamped * 0.22).toFixed(3);
  const modalBlurPx = Math.round(16 + clamped * 12);
  const textShadowRule =
    clamped < 0.25
      ? `0 1px 3px rgba(0, 0, 0, ${(0.85 * (1 - clamped / 0.25)).toFixed(2)})`
      : 'none';

  root.style.setProperty('--glass-opacity', clamped.toString());
  root.style.setProperty('--glass-surface-bg', `rgba(16, 26, 44, ${bgAlpha})`);
  root.style.setProperty('--bg-surface', `rgba(16, 26, 44, ${bgAlpha})`);
  root.style.setProperty('--bg-surface-hover', `rgba(24, 38, 64, ${(0.08 + clamped * 0.66).toFixed(3)})`);
  root.style.setProperty('--bg-elevated', `rgba(20, 32, 54, ${(0.10 + clamped * 0.68).toFixed(3)})`);
  root.style.setProperty('--surface-blur', `blur(${blurPx}px) saturate(${satPct}%)`);
  root.style.setProperty('--glass-blur', `${blurPx}px`);
  root.style.setProperty('--border-specular', `rgba(255, 255, 255, ${specularAlpha})`);
  root.style.setProperty('--border-subtle', `rgba(255, 255, 255, ${(0.03 + clamped * 0.11).toFixed(3)})`);
  root.style.setProperty('--glass-specular-opacity', specularRim);
  root.style.setProperty('--glass-inset-bg', `rgba(20, 30, 48, ${insetAlpha})`);
  root.style.setProperty('--glass-row-bg', `rgba(14, 22, 38, ${rowAlpha})`);
  root.style.setProperty('--glass-dock-bg', `rgba(10, 16, 28, ${dockAlpha})`);
  root.style.setProperty('--glass-dial-bg', `rgba(14, 20, 32, ${dialAlpha})`);
  root.style.setProperty('--glass-glow-mult', glowMult);
  root.style.setProperty('--glass-modal-bg', `rgba(10, 16, 28, ${modalBgAlpha})`);
  root.style.setProperty('--glass-modal-blur', `blur(${modalBlurPx}px) saturate(180%)`);
  root.style.setProperty('--glass-text-shadow', textShadowRule);
}

function mountIsolatedThemeEngine(
  themeId: CanonicalThemeId,
  accent: AccentColorId,
  glowIntensity = 0.35,
  glassStrength = 0.50
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

  // Set real-time fluent glass parameters
  applyGlassTokens(root, glassStrength);

  // Restore GPU Battery & Thermal Safeguard attribute
  try {
    if (window.localStorage.getItem(STORAGE_KEY_GPU_SAFEGUARD) === 'true') {
      root.setAttribute('data-gpu-safeguard', 'true');
    }
  } catch {
    // ignore
  }

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
  fluentGlassStrength: number;
  setFluentGlassStrength: (s: number) => void;
  gpuThermalSafeguard: boolean;
  setGpuThermalSafeguard: (enabled: boolean) => void;
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

export function InterfaceStyleProvider({
  children,
  interfaceStyle: interfaceStyleProp,
  setInterfaceStyle: setInterfaceStyleProp,
  materialYouSeed: materialYouSeedProp,
  setMaterialYouSeed: setMaterialYouSeedProp,
}: InterfaceStyleProviderProps) {
  const isBespokeActive = interfaceStyleProp === 'bespoke' || interfaceStyleProp === 'minimalist';

  const [accent, setAccentState] = useState<AccentColorId>(() => {
    if (typeof window === 'undefined') return 'purple';
    if (materialYouSeedProp === 'cyan' || materialYouSeedProp === 'purple') {
      return materialYouSeedProp;
    }
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

  const [fluentGlassStrength, setFluentGlassStrengthState] = useState<number>(() => {
    if (typeof window === 'undefined') return 0.50;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_GLASS_STRENGTH);
      if (saved !== null) {
        const parsed = parseFloat(saved);
        if (!isNaN(parsed) && parsed >= 0.05 && parsed <= 1) return parsed;
      }
      return 0.50;
    } catch {
      return 0.50;
    }
  });

  const [gpuThermalSafeguard, setGpuThermalSafeguardState] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY_GPU_SAFEGUARD);
      if (saved !== null) return saved === 'true';
      if (window.matchMedia && window.matchMedia('(prefers-reduced-transparency: reduce)').matches) {
        return true;
      }
      return false;
    } catch {
      return false;
    }
  });

  const [theme, setThemeState] = useState<CanonicalThemeId>(() => {
    if (typeof window === 'undefined') return 'fluent';
    try {
      for (const oldKey of LEGACY_STORAGE_KEYS) {
        window.localStorage.removeItem(oldKey);
      }
      return 'fluent';
    } catch {
      return 'fluent';
    }
  });

  useEffect(() => {
    if (materialYouSeedProp === 'cyan' || materialYouSeedProp === 'purple') {
      if (materialYouSeedProp !== accent) {
        setAccentState(materialYouSeedProp);
      }
    }
  }, [materialYouSeedProp, accent]);

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

  const setFluentGlassStrength = useCallback((strength: number) => {
    const clamped = Math.max(0.05, Math.min(1, Math.round(strength * 100) / 100));
    setFluentGlassStrengthState(clamped);
    if (typeof document !== 'undefined') {
      applyGlassTokens(document.documentElement, clamped);
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_GLASS_STRENGTH, clamped.toString());
    } catch {
      // ignore
    }
  }, []);

  const setGpuThermalSafeguard = useCallback((enabled: boolean) => {
    setGpuThermalSafeguardState(enabled);
    if (typeof document !== 'undefined') {
      if (enabled) {
        document.documentElement.setAttribute('data-gpu-safeguard', 'true');
      } else {
        document.documentElement.removeAttribute('data-gpu-safeguard');
      }
    }
    try {
      window.localStorage.setItem(STORAGE_KEY_GPU_SAFEGUARD, enabled.toString());
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      if (gpuThermalSafeguard) {
        document.documentElement.setAttribute('data-gpu-safeguard', 'true');
      } else {
        document.documentElement.removeAttribute('data-gpu-safeguard');
      }
    }
  }, [gpuThermalSafeguard]);

  useEffect(() => {
    const currentGlow = isBespokeActive ? 0 : fluentOrbIntensity;
    const currentGlass = isBespokeActive ? 0.05 : fluentGlassStrength;
    mountIsolatedThemeEngine('fluent', accent, currentGlow, currentGlass);
    initActiveThemeMod();
    try {
      window.localStorage.setItem(STORAGE_KEY_THEME, 'fluent');
      window.localStorage.setItem(STORAGE_KEY_ACCENT, accent);
      window.localStorage.setItem(STORAGE_KEY_GLOW, fluentOrbIntensity.toString());
      window.localStorage.setItem(STORAGE_KEY_GLASS_STRENGTH, fluentGlassStrength.toString());
    } catch {
      // Ignore storage errors
    }
  }, [accent, fluentOrbIntensity, fluentGlassStrength, isBespokeActive]);

  const setInterfaceStyle = useCallback((next: InterfaceStyle) => {
    const isNextBespoke = next === 'bespoke' || next === 'minimalist';
    const targetStyle = isNextBespoke ? 'bespoke' : 'fluent_glass';
    setInterfaceStyleProp?.(targetStyle);
    setThemeState('fluent');
    if (isNextBespoke) {
      mountIsolatedThemeEngine('fluent', accent, 0, 0.05);
    } else {
      mountIsolatedThemeEngine('fluent', accent, fluentOrbIntensity > 0 ? fluentOrbIntensity : 0.35, fluentGlassStrength);
    }
  }, [setInterfaceStyleProp, accent, fluentOrbIntensity, fluentGlassStrength]);

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
    removeActiveModStyles();
    mountIsolatedThemeEngine('fluent', safeAccent, isBespokeActive ? 0 : fluentOrbIntensity);
    setAccentState(safeAccent);
    setMaterialYouSeedProp?.(safeAccent);
    try {
      window.localStorage.setItem(STORAGE_KEY_ACCENT, safeAccent);
    } catch {
      // Ignore storage errors
    }
  }, [fluentOrbIntensity, isBespokeActive, setMaterialYouSeedProp]);

  const value = useMemo<InterfaceStyleContextValue>(
    () => ({
      theme: 'fluent',
      setTheme: setInterfaceStyle,
      restartWithTheme,
      accent,
      setAccent,
      interfaceStyle: isBespokeActive ? 'bespoke' : 'fluent_glass',
      setInterfaceStyle,
      style: isBespokeActive ? 'bespoke' : 'fluent_glass',
      setStyle: setInterfaceStyle,
      activeEngine: THEME_ENGINES.fluent,
      availableThemes: AVAILABLE_THEMES,

      engine: isBespokeActive ? 'bespoke' : 'fluent',
      setEngine: setInterfaceStyle,
      isOnyx: false,
      isFintech: false,
      isClassic: false,
      isClassicV2: false,
      isTrantor: false,
      isMaterialYou: false,
      isFluent: !isBespokeActive,
      isFluentGlass: !isBespokeActive,
      isLiquidGlass: !isBespokeActive,
      isMinimalist: isBespokeActive,
      isBespoke: isBespokeActive,

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
      fluentGlassStrength,
      setFluentGlassStrength,
      gpuThermalSafeguard,
      setGpuThermalSafeguard,
      fluentBlurStrength: Math.round(2 + fluentGlassStrength * 22),
      setFluentBlurStrength: (b: number) => {
        const normalized = Math.max(0.05, Math.min(1, (b - 2) / 22));
        setFluentGlassStrength(normalized);
      },
      fluentSpecularHighlight: Math.round((0.12 + fluentGlassStrength * 0.68) * 100) / 100,
      setFluentSpecularHighlight: (s: number) => {
        const normalized = Math.max(0.05, Math.min(1, (s - 0.12) / 0.68));
        setFluentGlassStrength(normalized);
      },
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
    [
      theme,
      isBespokeActive,
      setInterfaceStyle,
      accent,
      setAccent,
      fluentOrbIntensity,
      setFluentOrbIntensity,
      fluentGlassStrength,
      setFluentGlassStrength,
      gpuThermalSafeguard,
      setGpuThermalSafeguard,
    ]
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
