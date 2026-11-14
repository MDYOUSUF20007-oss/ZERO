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

export function applyThemeModStyles(mod: ThemeModConfig): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.setAttribute('data-zero-mod', mod.id);

  if (mod.cssVars) {
    for (const [key, val] of Object.entries(mod.cssVars)) {
      root.style.setProperty(key, val);
    }
  }

  if (mod.accentColor) {
    root.style.setProperty('--zero-accent', mod.accentColor);
    root.style.setProperty('--accent-hex', mod.accentColor);
  }
}

export function removeActiveModStyles(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  root.removeAttribute('data-zero-mod');
  for (const v of SAFE_CSS_VAR_ALLOWLIST) {
    root.style.removeProperty(v);
  }
}
