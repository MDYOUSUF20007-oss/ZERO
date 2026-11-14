import type { ThemeModConfig } from '../types';
import bundledModsData from '../mods/themes.json';

const STORAGE_KEY_CUSTOM_MODS = 'zero_custom_theme_mods_v1';
const STORAGE_KEY_ACTIVE_MOD_ID = 'zero_active_theme_mod_id_v1';

const BUNDLED_MODS: ThemeModConfig[] = bundledModsData as ThemeModConfig[];

const SAFE_CSS_VAR_ALLOWLIST = new Set([
  '--zero-bg-primary',
  '--zero-surface-card',
  '--zero-surface-subtle',
  '--zero-border',
  '--zero-border-strong',
  '--zero-accent',
  '--zero-accent-rgb',
  '--zero-accent-gradient',
  '--zero-text-primary',
  '--zero-text-secondary',
  '--zero-text-muted',
]);

const HEX_COLOR_REGEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const RGB_REGEX = /^rgba?\((\s*\d+\s*,){2,3}\s*[\d.]+\s*\)$/;

export function getBundledMods(): ThemeModConfig[] {
  return BUNDLED_MODS;
}

export function getUserCustomMods(): ThemeModConfig[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_CUSTOM_MODS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidModObject);
    }
  } catch {
    // Ignore parse error
  }
  return [];
}

export function getAllThemeMods(): ThemeModConfig[] {
  const custom = getUserCustomMods();
  const customIds = new Set(custom.map((m) => m.id));
  const bundledRemaining = BUNDLED_MODS.filter((m) => !customIds.has(m.id));
  return [...bundledRemaining, ...custom];
}

export function getActiveThemeModId(): string | null {
  if (typeof localStorage === 'undefined') return null;
  return localStorage.getItem(STORAGE_KEY_ACTIVE_MOD_ID);
}

export function setActiveThemeModId(modId: string | null): void {
  if (typeof localStorage === 'undefined') return;
  if (modId) {
    localStorage.setItem(STORAGE_KEY_ACTIVE_MOD_ID, modId);
  } else {
    localStorage.removeItem(STORAGE_KEY_ACTIVE_MOD_ID);
  }
}

function isValidColor(val: unknown): boolean {
  if (typeof val !== 'string') return false;
  const trimmed = val.trim();
  return HEX_COLOR_REGEX.test(trimmed) || RGB_REGEX.test(trimmed);
}

function isValidModObject(obj: unknown): obj is ThemeModConfig {
  if (!obj || typeof obj !== 'object') return false;
  const m = obj as Partial<ThemeModConfig>;
  if (!m.id || typeof m.id !== 'string') return false;
  if (!m.name || typeof m.name !== 'string') return false;
  if (m.family !== 'amoled' && m.family !== 'kindle' && m.family !== 'matte') return false;
  return true;
}

export function validateThemeModJson(
  rawJson: string
): { ok: true; mod: ThemeModConfig } | { ok: false; error: string } {
  try {
    const trimmed = rawJson.trim();
    if (!trimmed) {
      return { ok: false, error: 'Theme JSON string is empty.' };
    }
    const parsed = JSON.parse(trimmed);
    if (!isValidModObject(parsed)) {
      return {
        ok: false,
        error: 'Invalid Theme Mod JSON structure. Required: "id", "name", and "family" ("amoled" | "kindle" | "matte").',
      };
    }

    const cleanCssVars: Record<string, string> = {};
    if (parsed.cssVars && typeof parsed.cssVars === 'object') {
      for (const [key, val] of Object.entries(parsed.cssVars)) {
        if (SAFE_CSS_VAR_ALLOWLIST.has(key) && isValidColor(val)) {
          cleanCssVars[key] = String(val).trim();
        }
      }
    }

    const cleanMod: ThemeModConfig = {
      id: parsed.id.slice(0, 48).replace(/[^a-zA-Z0-9_-]/g, '_'),
      name: parsed.name.slice(0, 48),
      description: typeof parsed.description === 'string' ? parsed.description.slice(0, 160) : 'Custom Theme Mod',
      author: typeof parsed.author === 'string' ? parsed.author.slice(0, 64) : 'User',
      version: typeof parsed.version === 'string' ? parsed.version.slice(0, 16) : '1.0.0',
      family: parsed.family,
      ...(parsed.amoledGradient ? { amoledGradient: parsed.amoledGradient } : {}),
      ...(isValidColor(parsed.baseColor) ? { baseColor: parsed.baseColor } : {}),
      ...(isValidColor(parsed.accentColor) ? { accentColor: parsed.accentColor } : {}),
      ...(isValidColor(parsed.paperColor) ? { paperColor: parsed.paperColor } : {}),
      ...(isValidColor(parsed.inkAccent) ? { inkAccent: parsed.inkAccent } : {}),
      cssVars: cleanCssVars,
    };

    return { ok: true, mod: cleanMod };
  } catch (err: unknown) {
    return { ok: false, error: err instanceof Error ? err.message : 'Invalid JSON format' };
  }
}

export function saveUserCustomMod(mod: ThemeModConfig): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const existing = getUserCustomMods();
    const updated = [mod, ...existing.filter((m) => m.id !== mod.id)].slice(0, 20);
    localStorage.setItem(STORAGE_KEY_CUSTOM_MODS, JSON.stringify(updated));
    return true;
  } catch {
    return false;
  }
}

export function deleteUserCustomMod(modId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    const existing = getUserCustomMods();
    const updated = existing.filter((m) => m.id !== modId);
    localStorage.setItem(STORAGE_KEY_CUSTOM_MODS, JSON.stringify(updated));
    if (getActiveThemeModId() === modId) {
      setActiveThemeModId(null);
      removeActiveModStyles();
    }
    return true;
  } catch {
    return false;
  }
}

const STYLE_TAG_MOD_ID = 'zero-theme-mod-styles';

function hexToRgb(hex: string): string {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map((x) => x + x).join('');
  }
  const num = parseInt(c, 16);
  if (isNaN(num)) return '0, 240, 255';
  return `${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}`;
}

function shiftColorHex(hex: string, rDelta: number, gDelta: number, bDelta: number): string {
  const rgb = hexToRgb(hex).split(',').map((x) => parseInt(x.trim(), 10));
  const r = Math.max(0, Math.min(255, (rgb[0] || 0) + rDelta));
  const g = Math.max(0, Math.min(255, (rgb[1] || 0) + gDelta));
  const b = Math.max(0, Math.min(255, (rgb[2] || 0) + bDelta));
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

export function applyThemeModStyles(mod: ThemeModConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-zero-mod', mod.id);
  setActiveThemeModId(mod.id);

  const accent = mod.accentColor || mod.cssVars?.['--zero-accent'] || '#00F0FF';
  const accentRgb =
    mod.cssVars?.['--zero-accent-rgb'] ||
    (accent.startsWith('#') ? hexToRgb(accent) : '0, 240, 255');
  const baseBg =
    mod.baseColor ||
    mod.cssVars?.['--zero-bg-primary'] ||
    (mod.family === 'amoled' ? '#000000' : '#121620');
  const surfaceCard =
    mod.cssVars?.['--zero-surface-card'] ||
    (mod.family === 'amoled' ? 'rgba(10, 14, 24, 0.85)' : 'rgba(28, 35, 52, 0.80)');
  const border = mod.cssVars?.['--zero-border'] || `rgba(${accentRgb}, 0.28)`;

  const shift1 = mod.cssVars?.['--accent-shift-1'] || shiftColorHex(accent, -15, 20, 30);
  const shift2 = mod.cssVars?.['--accent-shift-2'] || shiftColorHex(accent, 30, -10, 20);
  const shift3 = mod.cssVars?.['--accent-shift-3'] || shiftColorHex(accent, -20, -15, 25);

  let customVarRules = '';
  if (mod.cssVars) {
    for (const [key, val] of Object.entries(mod.cssVars)) {
      if (typeof val === 'string' && val.trim()) {
        customVarRules += `    ${key}: ${val} !important;\n`;
      }
    }
  }

  const css = `
  /* Zero Community Theme Mod: ${mod.name} (${mod.id}) */
  :root,
  [data-accent],
  html[data-accent],
  [data-zero-mod="${mod.id}"] {
    --accent-primary: ${accent} !important;
    --accent-secondary: ${accent} !important;
    --accent-soft: rgba(${accentRgb}, 0.22) !important;
    --accent-border: rgba(${accentRgb}, 0.55) !important;
    --zero-accent: ${accent} !important;
    --zero-dial-stroke: ${accent} !important;
    --accent-hex: ${accent} !important;
    --accent-rgb: ${accentRgb} !important;
    --liquid-accent-glow: rgba(${accentRgb}, 0.45) !important;
    --liquid-accent-soft-glow: rgba(${accentRgb}, 0.22) !important;
    --liquid-accent-vibrant: ${accent} !important;
    --liquid-accent-tint: ${accent} !important;
    --accent-shift-1: ${shift1} !important;
    --accent-shift-2: ${shift2} !important;
    --accent-shift-3: ${shift3} !important;
    --accent-shift-4: ${accent} !important;
    --bg-surface: ${surfaceCard} !important;
${customVarRules}  }

  html, body, #root {
    background-color: ${baseBg} !important;
  }

  .glass-card,
  .obsidian-card,
  .liquid-glass,
  .liquid-card,
  .theme-card,
  .settings-card,
  [data-frosted-card="true"],
  [data-obsidian-card="true"] {
    background-color: ${surfaceCard} !important;
    border-color: ${border} !important;
  }

  .theme-pill-active,
  .liquid-pill-active,
  .obsidian-pill-active,
  .action-pill {
    background-color: rgba(${accentRgb}, 0.22) !important;
    color: ${accent} !important;
    border-color: rgba(${accentRgb}, 0.55) !important;
    box-shadow: 0 0 14px rgba(${accentRgb}, 0.35) !important;
  }
  `;

  let styleTag = document.getElementById(STYLE_TAG_MOD_ID) as HTMLStyleElement | null;
  if (!styleTag) {
    styleTag = document.createElement('style');
    styleTag.id = STYLE_TAG_MOD_ID;
    styleTag.setAttribute('type', 'text/css');
    document.head.appendChild(styleTag);
  }
  styleTag.textContent = css;
}

export function removeActiveModStyles(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute('data-zero-mod');
  setActiveThemeModId(null);
  const styleTag = document.getElementById(STYLE_TAG_MOD_ID);
  if (styleTag && styleTag.parentNode) {
    styleTag.parentNode.removeChild(styleTag);
  }
}

export function initActiveThemeMod(): void {
  if (typeof window === 'undefined') return;
  const activeId = getActiveThemeModId();
  if (!activeId) return;
  const all = getAllThemeMods();
  const found = all.find((m) => m.id === activeId);
  if (found) {
    applyThemeModStyles(found);
  } else {
    setActiveThemeModId(null);
  }
}
