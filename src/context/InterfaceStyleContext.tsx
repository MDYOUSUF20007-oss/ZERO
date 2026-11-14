import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type {
  EngineType,
  ClassicPreset,
  ClassicV2Surface,
  TrantorSurface,
  M3Palette,
  InterfaceStyle,
  MaterialYouSeed,
  ThemeConfig,
} from '../types';
import {
  normalizeEngineType,
  seedToM3Palette,
  m3PaletteToSeed,
  familyToClassicPreset,
  classicPresetToFamily,
} from '../utils/themes';

export type { EngineType, ClassicPreset, M3Palette };

export type M3Elevation = 'flat' | 'subtle' | 'elevated' | 'high';
export type MinimalistBorderWidth = 'hairline' | '1px' | 'heavy';
export type MinimalistTypography = 'sans' | 'mono' | 'technical';
export type MinimalistTelemetryDensity = 'compact' | 'standard' | 'dense';

export interface InterfaceStyleContextValue {
  /** Active top-level interface engine */
  engine: EngineType;
  setEngine: (engine: EngineType) => void;

  /** Legacy / alias accessor for interface style */
  interfaceStyle: InterfaceStyle;
  setInterfaceStyle: (style: InterfaceStyle) => void;

  /** Engine boolean guard helpers */
  isClassic: boolean;
  isClassicV2: boolean;
  isTrantor: boolean;
  isMaterialYou: boolean;
  isFluent: boolean;
  isFluentGlass: boolean;
  /** @deprecated use isFluent or isFluentGlass */
  isLiquidGlass: boolean;
  isMinimalist: boolean;
  /** @deprecated use isMinimalist */
  isBespoke: boolean;

  /** Classic UI surface preset (exclusive to Classic engine) */
  classicPreset: ClassicPreset;
  setClassicPreset: (preset: ClassicPreset) => void;

  /** Classic UI Version 2 (Beta Test) controls */
  classicV2Surface: ClassicV2Surface;
  setClassicV2Surface: (surface: ClassicV2Surface) => void;
  classicV2Accent: string;
  setClassicV2Accent: (accent: string) => void;

  /** Trantor Sage-Obsidian controls */
  trantorSurface: TrantorSurface;
  setTrantorSurface: (surface: TrantorSurface) => void;
  trantorAccent: string;
  setTrantorAccent: (accent: string) => void;

  /** Material You M3 tonal seed palette */
  m3Palette: M3Palette;
  setM3Palette: (palette: M3Palette) => void;

  /** Material You surface elevation depth */
  m3Elevation: M3Elevation;
  setM3Elevation: (elevation: M3Elevation) => void;

  /** Material You seed alias (purple | cyan | emerald | crimson) */
  materialYouSeed: MaterialYouSeed;
  setMaterialYouSeed: (seed: MaterialYouSeed) => void;

  /** AMOLED pitch-black toggle */
  amoled: boolean;
  setAmoled: (amoled: boolean) => void;

  /** Material You AMOLED alias */
  materialYouAmoled: boolean;
  setMaterialYouAmoled: (amoled: boolean) => void;

  /** Fluent Glass Optic Controls */
  fluentOrbIntensity: number;
  setFluentOrbIntensity: (intensity: number) => void;
  fluentBlurStrength: number;
  setFluentBlurStrength: (blurPx: number) => void;
  fluentSpecularHighlight: number;
  setFluentSpecularHighlight: (strength: number) => void;

  /** Bespoke Minimalist Controls */
  minimalistBorderWidth: MinimalistBorderWidth;
  setMinimalistBorderWidth: (width: MinimalistBorderWidth) => void;
  minimalistTypography: MinimalistTypography;
  setMinimalistTypography: (typo: MinimalistTypography) => void;
  minimalistTelemetryDensity: MinimalistTelemetryDensity;
  setMinimalistTelemetryDensity: (density: MinimalistTelemetryDensity) => void;
}

const DEFAULT_CONTEXT: InterfaceStyleContextValue = {
  engine: 'classic',
  setEngine: () => {},
  interfaceStyle: 'classic',
  setInterfaceStyle: () => {},
  isClassic: true,
  isClassicV2: false,
  isTrantor: false,
  isMaterialYou: false,
  isFluent: false,
  isFluentGlass: false,
  isLiquidGlass: false,
  isMinimalist: false,
  isBespoke: false,
  classicPreset: 'amoled',
  setClassicPreset: () => {},
  classicV2Surface: 'obsidian',
  setClassicV2Surface: () => {},
  classicV2Accent: '#FFAA00',
  setClassicV2Accent: () => {},
  trantorSurface: 'matte',
  setTrantorSurface: () => {},
  trantorAccent: '#A3E4D7',
  setTrantorAccent: () => {},
  m3Palette: 'deep-purple',
  setM3Palette: () => {},
  m3Elevation: 'subtle',
  setM3Elevation: () => {},
  materialYouSeed: 'purple',
  setMaterialYouSeed: () => {},
  amoled: true,
  setAmoled: () => {},
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
};

const InterfaceStyleContext = createContext<InterfaceStyleContextValue>(DEFAULT_CONTEXT);

export interface InterfaceStyleProviderProps {
  engine?: EngineType;
  setEngine?: (engine: EngineType) => void;
  interfaceStyle?: InterfaceStyle;
  setInterfaceStyle?: (next: InterfaceStyle) => void;
  classicPreset?: ClassicPreset;
  setClassicPreset?: (preset: ClassicPreset) => void;
  m3Palette?: M3Palette;
  setM3Palette?: (palette: M3Palette) => void;
  materialYouSeed?: MaterialYouSeed;
  setMaterialYouSeed?: (seed: MaterialYouSeed) => void;
  amoled?: boolean;
  setAmoled?: (amoled: boolean) => void;
  materialYouAmoled?: boolean;
  setMaterialYouAmoled?: (amoled: boolean) => void;
  themeConfig?: ThemeConfig;
  setThemeConfig?: (next: ThemeConfig) => void;
  children: ReactNode;
}

const STORAGE_KEYS = {
  ENGINE: 'zero_interface_engine_v2',
  CLASSIC_PRESET: 'zero_classic_preset_v2',
  CLASSIC_V2_SURFACE: 'zero_classic_v2_surface_v1',
  CLASSIC_V2_ACCENT: 'zero_classic_v2_accent_v1',
  TRANTOR_SURFACE: 'zero_trantor_surface_v1',
  TRANTOR_ACCENT: 'zero_trantor_accent_v1',
  M3_PALETTE: 'zero_m3_palette_v2',
  M3_ELEVATION: 'zero_m3_elevation_v2',
  AMOLED: 'zero_amoled_toggle_v2',
  FLUENT_ORB_INTENSITY: 'zero_fluent_orb_intensity_v2',
  FLUENT_BLUR: 'zero_fluent_blur_v2',
  FLUENT_SPECULAR: 'zero_fluent_specular_v2',
  MINIMALIST_BORDER: 'zero_minimalist_border_v2',
  MINIMALIST_TYPO: 'zero_minimalist_typo_v2',
  MINIMALIST_DENSITY: 'zero_minimalist_density_v2',
};

export const InterfaceStyleProvider: React.FC<InterfaceStyleProviderProps> = ({
  engine: propEngine,
  setEngine: propSetEngine,
  interfaceStyle: propInterfaceStyle,
  setInterfaceStyle: propSetInterfaceStyle,
  classicPreset: propClassicPreset,
  setClassicPreset: propSetClassicPreset,
  m3Palette: propM3Palette,
  setM3Palette: propSetM3Palette,
  materialYouSeed: propMaterialYouSeed,
  setMaterialYouSeed: propSetMaterialYouSeed,
  amoled: propAmoled,
  setAmoled: propSetAmoled,
  materialYouAmoled: propMaterialYouAmoled,
  setMaterialYouAmoled: propSetMaterialYouAmoled,
  themeConfig,
  setThemeConfig,
  children,
}) => {
  // Local states with localStorage persistence
  const [localEngine, setLocalEngine] = useState<EngineType>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.ENGINE);
      return normalizeEngineType(saved || 'classic');
    } catch {
      return 'classic';
    }
  });

  const [localPreset, setLocalPreset] = useState<ClassicPreset>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSIC_PRESET);
      return saved === 'paper-kindle' || saved === 'matte-studio' ? saved : 'amoled';
    } catch {
      return 'amoled';
    }
  });

  const [localM3Palette, setLocalM3Palette] = useState<M3Palette>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.M3_PALETTE);
      return saved === 'cyber-cyan' || saved === 'neon-emerald' || saved === 'crimson-pulse'
        ? saved
        : 'deep-purple';
    } catch {
      return 'deep-purple';
    }
  });

  const [m3Elevation, setM3ElevationState] = useState<M3Elevation>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.M3_ELEVATION) as M3Elevation;
      return saved === 'flat' || saved === 'elevated' || saved === 'high' ? saved : 'subtle';
    } catch {
      return 'subtle';
    }
  });

  const [localAmoled, setLocalAmoled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.AMOLED);
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Fluent Optic Controls
  const [fluentOrbIntensity, setFluentOrbIntensityState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLUENT_ORB_INTENSITY);
      return saved ? Number(saved) : 0.75;
    } catch {
      return 0.75;
    }
  });

  const [fluentBlurStrength, setFluentBlurStrengthState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLUENT_BLUR);
      return saved ? Number(saved) : 28;
    } catch {
      return 28;
    }
  });

  const [fluentSpecularHighlight, setFluentSpecularHighlightState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FLUENT_SPECULAR);
      return saved ? Number(saved) : 0.38;
    } catch {
      return 0.38;
    }
  });

  // Minimalist Controls
  const [minimalistBorderWidth, setMinimalistBorderWidthState] = useState<MinimalistBorderWidth>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MINIMALIST_BORDER) as MinimalistBorderWidth;
      return saved === 'hairline' || saved === 'heavy' ? saved : '1px';
    } catch {
      return '1px';
    }
  });

  const [minimalistTypography, setMinimalistTypographyState] = useState<MinimalistTypography>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MINIMALIST_TYPO) as MinimalistTypography;
      return saved === 'mono' || saved === 'technical' ? saved : 'sans';
    } catch {
      return 'sans';
    }
  });

  const [minimalistTelemetryDensity, setMinimalistTelemetryDensityState] = useState<MinimalistTelemetryDensity>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.MINIMALIST_DENSITY) as MinimalistTelemetryDensity;
      return saved === 'compact' || saved === 'dense' ? saved : 'standard';
    } catch {
      return 'standard';
    }
  });

  // Classic UI Version 2 (Beta Test) Onyx Controls
  const [classicV2Surface, setClassicV2SurfaceState] = useState<ClassicV2Surface>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CLASSIC_V2_SURFACE) as ClassicV2Surface;
      return saved === 'pitch-black' || saved === 'carbon' ? saved : 'obsidian';
    } catch {
      return 'obsidian';
    }
  });

  const [classicV2Accent, setClassicV2AccentState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.CLASSIC_V2_ACCENT) || '#FFAA00';
    } catch {
      return '#FFAA00';
    }
  });

  // Trantor Sage-Obsidian Controls
  const [trantorSurface, setTrantorSurfaceState] = useState<TrantorSurface>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.TRANTOR_SURFACE) as TrantorSurface;
      return saved === 'pitch-black' || saved === 'graphite' ? saved : 'matte';
    } catch {
      return 'matte';
    }
  });

  const [trantorAccent, setTrantorAccentState] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEYS.TRANTOR_ACCENT) || '#A3E4D7';
    } catch {
      return '#A3E4D7';
    }
  });

  // Determine active values with precedence: props > store > local state
  const activeEngine: EngineType = normalizeEngineType(
    propEngine ?? propInterfaceStyle ?? localEngine
  );

  const activeClassicPreset: ClassicPreset =
    propClassicPreset ??
    (themeConfig ? familyToClassicPreset(themeConfig.family) : localPreset);

  const activeM3Palette: M3Palette =
    propM3Palette ??
    (propMaterialYouSeed ? seedToM3Palette(propMaterialYouSeed) : localM3Palette);

  const activeAmoled: boolean =
    propAmoled ?? propMaterialYouAmoled ?? localAmoled;

  // DOM Attribute & CSS Variables Root Synchronization
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;

    // 1. data-engine="classic" | "material-you" | "fluent" | "minimalist"
    root.setAttribute('data-engine', activeEngine);
    root.setAttribute('data-zero-style', activeEngine);

    // 2. data-preset="amoled" | "paper-kindle" | "matte-studio" (exclusive to Classic)
    if (activeEngine === 'classic') {
      root.setAttribute('data-preset', activeClassicPreset);
      root.setAttribute('data-zero-theme', classicPresetToFamily(activeClassicPreset));
    } else {
      root.removeAttribute('data-preset');
    }

    // 3. data-m3-palette="deep-purple" | "cyber-cyan" | "neon-emerald" | "crimson-pulse"
    if (activeEngine === 'material-you') {
      root.setAttribute('data-m3-palette', activeM3Palette);
      root.setAttribute('data-m3-elevation', m3Elevation);
      root.setAttribute('data-theme', 'material-you');
      root.setAttribute('data-seed', m3PaletteToSeed(activeM3Palette));
    } else {
      root.removeAttribute('data-m3-palette');
      root.removeAttribute('data-m3-elevation');
      root.removeAttribute('data-theme');
      root.removeAttribute('data-seed');
    }

    // 4. data-amoled="true" | "false"
    root.setAttribute('data-amoled', activeAmoled ? 'true' : 'false');

    // 5. Fluent Glass Optic CSS Variables
    if (activeEngine === 'fluent') {
      root.style.setProperty('--fg-orb-intensity', String(fluentOrbIntensity));
      root.style.setProperty('--fg-acrylic-blur', `${fluentBlurStrength}px`);
      root.style.setProperty('--fg-specular-highlight', String(fluentSpecularHighlight));
    } else {
      root.style.removeProperty('--fg-orb-intensity');
      root.style.removeProperty('--fg-acrylic-blur');
      root.style.removeProperty('--fg-specular-highlight');
    }

    // 6. Bespoke Minimalist Mechanical Attributes & Variables
    if (activeEngine === 'minimalist') {
      const borderPx = minimalistBorderWidth === 'hairline' ? '0.5px' : minimalistBorderWidth === 'heavy' ? '1.5px' : '1px';
      root.style.setProperty('--bm-border-width', borderPx);
      root.setAttribute('data-bm-font', minimalistTypography);
      root.setAttribute('data-bm-density', minimalistTelemetryDensity);
    } else {
      root.style.removeProperty('--bm-border-width');
      root.removeAttribute('data-bm-font');
      root.removeAttribute('data-bm-density');
    }

    // 7. Classic UI Version 2 (Beta Test) Onyx Attributes & Variables
    if (activeEngine === 'classic-v2') {
      root.style.setProperty('--accent-hex', classicV2Accent);
      root.style.setProperty('--accent-rgb', '255, 170, 0');
      root.style.setProperty('--zero-accent', classicV2Accent);
      root.style.setProperty('--zero-dial-stroke', classicV2Accent);
      const bg = classicV2Surface === 'pitch-black' ? '#000000' : classicV2Surface === 'carbon' ? '#121217' : '#08080A';
      root.style.setProperty('--zero-bg-primary', bg);
    }

    // 8. Trantor Sage-Obsidian Fintech Variables
    if (activeEngine === 'trantor') {
      const bg = trantorSurface === 'pitch-black' ? '#000000' : trantorSurface === 'graphite' ? '#0B0D11' : '#07080A';
      root.style.setProperty('--bg-primary', bg);
      root.style.setProperty('--surface-card', '#121418');
      root.style.setProperty('--surface-card-hover', '#1A1D24');
      root.style.setProperty('--border-subtle', 'rgba(255, 255, 255, 0.06)');
      root.style.setProperty('--accent-sage', trantorAccent);
      root.style.setProperty('--accent-sage-text', '#0B0C10');
      root.style.setProperty('--text-main', '#F3F4F6');
      root.style.setProperty('--text-muted', '#9CA3AF');

      root.style.setProperty('--zero-bg-primary', bg);
      root.style.setProperty('--zero-accent', trantorAccent);
      root.style.setProperty('--zero-dial-stroke', trantorAccent);
      root.style.setProperty('--accent-hex', trantorAccent);
      root.style.setProperty('--accent-rgb', '163, 228, 215');
      root.style.setProperty('--accent-badge-text', '#0B0C10');
    }
  }, [
    activeEngine,
    activeClassicPreset,
    activeM3Palette,
    activeAmoled,
    m3Elevation,
    fluentOrbIntensity,
    fluentBlurStrength,
    fluentSpecularHighlight,
    minimalistBorderWidth,
    minimalistTypography,
    minimalistTelemetryDensity,
    classicV2Surface,
    classicV2Accent,
    trantorSurface,
    trantorAccent,
  ]);

  // Synchronized Engine Setter
  const handleSetEngine = useCallback(
    (nextEngine: EngineType) => {
      const normalized = normalizeEngineType(nextEngine);
      setLocalEngine(normalized);
      try {
        localStorage.setItem(STORAGE_KEYS.ENGINE, normalized);
      } catch {
        // Ignore storage errors
      }
      propSetEngine?.(normalized);
      propSetInterfaceStyle?.(normalized);
    },
    [propSetEngine, propSetInterfaceStyle]
  );

  // Synchronized Classic Preset Setter
  const handleSetClassicPreset = useCallback(
    (nextPreset: ClassicPreset) => {
      setLocalPreset(nextPreset);
      try {
        localStorage.setItem(STORAGE_KEYS.CLASSIC_PRESET, nextPreset);
      } catch {
        // Ignore storage errors
      }
      propSetClassicPreset?.(nextPreset);
      if (setThemeConfig && themeConfig) {
        setThemeConfig({
          ...themeConfig,
          family: classicPresetToFamily(nextPreset),
        });
      }
    },
    [propSetClassicPreset, setThemeConfig, themeConfig]
  );

  // Synchronized M3 Palette Setter
  const handleSetM3Palette = useCallback(
    (nextPalette: M3Palette) => {
      setLocalM3Palette(nextPalette);
      try {
        localStorage.setItem(STORAGE_KEYS.M3_PALETTE, nextPalette);
      } catch {
        // Ignore storage errors
      }
      propSetM3Palette?.(nextPalette);
      propSetMaterialYouSeed?.(m3PaletteToSeed(nextPalette));
    },
    [propSetM3Palette, propSetMaterialYouSeed]
  );

  const handleSetM3Elevation = useCallback((elevation: M3Elevation) => {
    setM3ElevationState(elevation);
    try {
      localStorage.setItem(STORAGE_KEYS.M3_ELEVATION, elevation);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Synchronized AMOLED Toggle Setter
  const handleSetAmoled = useCallback(
    (nextAmoled: boolean) => {
      setLocalAmoled(nextAmoled);
      try {
        localStorage.setItem(STORAGE_KEYS.AMOLED, String(nextAmoled));
      } catch {
        // Ignore storage errors
      }
      propSetAmoled?.(nextAmoled);
      propSetMaterialYouAmoled?.(nextAmoled);
    },
    [propSetAmoled, propSetMaterialYouAmoled]
  );

  // Fluent Glass Setters
  const handleSetFluentOrbIntensity = useCallback((intensity: number) => {
    setFluentOrbIntensityState(intensity);
    try {
      localStorage.setItem(STORAGE_KEYS.FLUENT_ORB_INTENSITY, String(intensity));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetFluentBlurStrength = useCallback((blurPx: number) => {
    setFluentBlurStrengthState(blurPx);
    try {
      localStorage.setItem(STORAGE_KEYS.FLUENT_BLUR, String(blurPx));
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetFluentSpecularHighlight = useCallback((strength: number) => {
    setFluentSpecularHighlightState(strength);
    try {
      localStorage.setItem(STORAGE_KEYS.FLUENT_SPECULAR, String(strength));
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Minimalist Setters
  const handleSetMinimalistBorderWidth = useCallback((width: MinimalistBorderWidth) => {
    setMinimalistBorderWidthState(width);
    try {
      localStorage.setItem(STORAGE_KEYS.MINIMALIST_BORDER, width);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetMinimalistTypography = useCallback((typo: MinimalistTypography) => {
    setMinimalistTypographyState(typo);
    try {
      localStorage.setItem(STORAGE_KEYS.MINIMALIST_TYPO, typo);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetMinimalistTelemetryDensity = useCallback((density: MinimalistTelemetryDensity) => {
    setMinimalistTelemetryDensityState(density);
    try {
      localStorage.setItem(STORAGE_KEYS.MINIMALIST_DENSITY, density);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Classic UI Version 2 Setters
  const handleSetClassicV2Surface = useCallback((surface: ClassicV2Surface) => {
    setClassicV2SurfaceState(surface);
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSIC_V2_SURFACE, surface);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetClassicV2Accent = useCallback((accent: string) => {
    setClassicV2AccentState(accent);
    try {
      localStorage.setItem(STORAGE_KEYS.CLASSIC_V2_ACCENT, accent);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Trantor Sage-Obsidian Setters
  const handleSetTrantorSurface = useCallback((surface: TrantorSurface) => {
    setTrantorSurfaceState(surface);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANTOR_SURFACE, surface);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const handleSetTrantorAccent = useCallback((accent: string) => {
    setTrantorAccentState(accent);
    try {
      localStorage.setItem(STORAGE_KEYS.TRANTOR_ACCENT, accent);
    } catch {
      // Ignore storage errors
    }
  }, []);

  const contextValue: InterfaceStyleContextValue = {
    engine: activeEngine,
    setEngine: handleSetEngine,

    interfaceStyle: activeEngine,
    setInterfaceStyle: (style: InterfaceStyle) => handleSetEngine(normalizeEngineType(style)),

    isClassic: activeEngine === 'classic',
    isClassicV2: activeEngine === 'classic-v2',
    isTrantor: activeEngine === 'trantor',
    isMaterialYou: activeEngine === 'material-you',
    isFluent: activeEngine === 'fluent',
    isFluentGlass: activeEngine === 'fluent',
    isLiquidGlass: activeEngine === 'fluent',
    isMinimalist: activeEngine === 'minimalist',
    isBespoke: activeEngine === 'minimalist',

    classicPreset: activeClassicPreset,
    setClassicPreset: handleSetClassicPreset,

    classicV2Surface,
    setClassicV2Surface: handleSetClassicV2Surface,
    classicV2Accent,
    setClassicV2Accent: handleSetClassicV2Accent,

    trantorSurface,
    setTrantorSurface: handleSetTrantorSurface,
    trantorAccent,
    setTrantorAccent: handleSetTrantorAccent,

    m3Palette: activeM3Palette,
    setM3Palette: handleSetM3Palette,
    m3Elevation,
    setM3Elevation: handleSetM3Elevation,

    materialYouSeed: m3PaletteToSeed(activeM3Palette),
    setMaterialYouSeed: (seed: MaterialYouSeed) => handleSetM3Palette(seedToM3Palette(seed)),

    amoled: activeAmoled,
    setAmoled: handleSetAmoled,

    materialYouAmoled: activeAmoled,
    setMaterialYouAmoled: handleSetAmoled,

    fluentOrbIntensity,
    setFluentOrbIntensity: handleSetFluentOrbIntensity,
    fluentBlurStrength,
    setFluentBlurStrength: handleSetFluentBlurStrength,
    fluentSpecularHighlight,
    setFluentSpecularHighlight: handleSetFluentSpecularHighlight,

    minimalistBorderWidth,
    setMinimalistBorderWidth: handleSetMinimalistBorderWidth,
    minimalistTypography,
    setMinimalistTypography: handleSetMinimalistTypography,
    minimalistTelemetryDensity,
    setMinimalistTelemetryDensity: handleSetMinimalistTelemetryDensity,
  };

  return (
    <InterfaceStyleContext.Provider value={contextValue}>
      {children}
    </InterfaceStyleContext.Provider>
  );
};

export function useInterfaceStyle(): InterfaceStyleContextValue {
  return useContext(InterfaceStyleContext);
}
