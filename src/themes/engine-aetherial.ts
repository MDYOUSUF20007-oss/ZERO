import { type ThemeEngineDefinition } from './types';

export const aetherialEngine: ThemeEngineDefinition = {
  id: 'aetherial',
  name: 'Aetherial Focus',
  badge: 'COSMIC AURA',
  description: 'Deep celestial obsidian with atmospheric cyan field glows, radial arc timer geometry, and emerald state rings.',
  swatchBg: '#11131b',
  swatchSurface: '#1d1f28',
  swatchAccent: '#38bdf8',
  swatchAccentSecondary: '#4edea3',
  css: `
    :root, html[data-theme="aetherial"] {
      --bg-primary: #11131b;
      --bg-secondary: #191b24;
      --bg-surface: rgba(29, 31, 40, 0.78);
      --bg-surface-hover: rgba(40, 42, 50, 0.88);
      --bg-elevated: rgba(25, 27, 36, 0.88);
      --bg-modal: rgba(17, 19, 27, 0.94);
      --bg-nav: rgba(12, 14, 22, 0.84);
      --bg-input: rgba(24, 26, 36, 0.72);

      --glass-opacity: 0.50;
      --glass-surface-bg: rgba(29, 31, 40, 0.78);
      --glass-specular-opacity: 0.35;
      --glass-inset-bg: rgba(24, 26, 36, 0.65);
      --glass-row-bg: rgba(25, 27, 36, 0.55);
      --glass-dock-bg: rgba(12, 14, 22, 0.84);
      --glass-dial-bg: rgba(17, 19, 27, 0.65);
      --glass-glow-mult: 0.65;

      --text-primary: #e2e1ed;
      --text-secondary: #bdc8d1;
      --text-muted: #87929a;
      --text-on-accent: #001e2c;

      --accent-primary: #38bdf8;
      --accent-secondary: #4edea3;
      --accent-tertiary: #a7a9ff;
      --accent-soft: rgba(56, 189, 248, 0.16);
      --accent-border: rgba(56, 189, 248, 0.45);

      --border-subtle: rgba(62, 72, 79, 0.45);
      --border-strong: rgba(56, 189, 248, 0.35);
      --border-specular: rgba(255, 255, 255, 0.18);

      --status-success: #4edea3;
      --status-warning: #fbbf24;
      --status-danger: #ffb4ab;

      --app-backdrop-gradient: radial-gradient(circle at 50% -15%, rgba(56, 189, 248, 0.16) 0%, transparent 60%), radial-gradient(circle at 90% 80%, rgba(78, 222, 163, 0.10) 0%, transparent 55%);
      --surface-blur: blur(24px) saturate(180%);
      --surface-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.70);
      --surface-gradient: linear-gradient(135deg, rgba(56, 189, 248, 0.06) 0%, rgba(255, 255, 255, 0.015) 45%, rgba(78, 222, 163, 0.03) 100%);
      --radius-card: 20px;
      --radius-pill: 9999px;
      --radius-btn: 14px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #11131b;
      --zero-surface-1: rgba(25, 27, 36, 0.75);
      --zero-surface-2: rgba(29, 31, 40, 0.85);
      --zero-surface-3: rgba(40, 42, 50, 0.90);
      --zero-border: rgba(62, 72, 79, 0.45);
      --zero-border-strong: rgba(56, 189, 248, 0.35);
      --zero-ink-primary: #e2e1ed;
      --zero-ink-muted: #87929a;
      --zero-accent: #38bdf8;
      --zero-dial-stroke: #38bdf8;
      --accent-hex: #38bdf8;
      --accent-rgb: 56, 189, 248;
      --liquid-accent-glow: rgba(56, 189, 248, 0.45);
      --liquid-accent-soft-glow: rgba(56, 189, 248, 0.20);
      --liquid-accent-vibrant: #38bdf8;
      --liquid-accent-tint: #7bd0ff;
    }

    html, body, #root {
      background-color: #11131b !important;
      color: #e2e1ed !important;
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
      background-image: none !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* -------------------------------------------------------------
       Aetherial Focus Dynamic Accent Palette Overrides
       ------------------------------------------------------------- */
    /* Purple Accent variant */
    [data-accent="purple"],
    html[data-accent="purple"] {
      --accent-primary: #a855f7 !important;
      --accent-secondary: #c084fc !important;
      --accent-soft: rgba(168, 85, 247, 0.18) !important;
      --accent-border: rgba(168, 85, 247, 0.55) !important;
      --text-on-accent: #ffffff !important;
      --zero-accent: #a855f7 !important;
      --zero-dial-stroke: #a855f7 !important;
      --accent-hex: #a855f7 !important;
      --accent-rgb: 168, 85, 247 !important;
      --liquid-accent-glow: rgba(168, 85, 247, 0.40) !important;
      --liquid-accent-soft-glow: rgba(168, 85, 247, 0.18) !important;
      --liquid-accent-vibrant: #a855f7 !important;
      --liquid-accent-tint: #c084fc !important;
    }

    /* Cyan Accent variant */
    [data-accent="cyan"],
    html[data-accent="cyan"] {
      --accent-primary: #38bdf8 !important;
      --accent-secondary: #4edea3 !important;
      --accent-soft: rgba(56, 189, 248, 0.18) !important;
      --accent-border: rgba(56, 189, 248, 0.55) !important;
      --text-on-accent: #001e2c !important;
      --zero-accent: #38bdf8 !important;
      --zero-dial-stroke: #38bdf8 !important;
      --accent-hex: #38bdf8 !important;
      --accent-rgb: 56, 189, 248 !important;
      --liquid-accent-glow: rgba(56, 189, 248, 0.45) !important;
      --liquid-accent-soft-glow: rgba(56, 189, 248, 0.20) !important;
      --liquid-accent-vibrant: #38bdf8 !important;
      --liquid-accent-tint: #7bd0ff !important;
    }

    /* Clean Geometric Typography */
    body, .font-mono, .font-sans {
      font-family: 'Plus Jakarta Sans', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif !important;
    }

    /* Smooth Micro-Interactions */
    .liquid-spring {
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease !important;
    }
    .liquid-spring:active {
      transform: scale(0.97) !important;
    }

    /* -------------------------------------------------------------
       Aetherial Cosmic Aura Surfaces & Cards
       ------------------------------------------------------------- */
    .glass-card,
    .obsidian-card,
    .liquid-glass,
    .liquid-card,
    .theme-card,
    .settings-card,
    [data-frosted-card="true"],
    [data-obsidian-card="true"] {
      background-color: var(--glass-surface-bg, rgba(29, 31, 40, 0.78)) !important;
      background-image: linear-gradient(135deg, rgba(56, 189, 248, 0.05) 0%, rgba(255, 255, 255, 0.012) 40%, rgba(78, 222, 163, 0.025) 100%) !important;
      border: 1px solid var(--border-subtle, rgba(62, 72, 79, 0.45)) !important;
      border-top: 1px solid var(--border-strong, rgba(56, 189, 248, 0.35)) !important;
      border-radius: 20px !important;
      box-shadow: 0 16px 36px -4px rgba(0, 0, 0, 0.70), 0 0 20px -4px rgba(56, 189, 248, 0.18) !important;
      backdrop-filter: var(--surface-blur, blur(24px) saturate(180%)) !important;
      -webkit-backdrop-filter: var(--surface-blur, blur(24px) saturate(180%)) !important;
      color: var(--text-primary, #e2e1ed) !important;
    }

    /* Insets & Rows */
    .obsidian-inset,
    .liquid-inset {
      background-color: var(--glass-inset-bg, rgba(24, 26, 36, 0.65)) !important;
      border: 1px solid var(--border-subtle, rgba(62, 72, 79, 0.40)) !important;
      border-radius: 14px !important;
    }

    .obsidian-inset-neutral,
    .liquid-row {
      background-color: var(--glass-row-bg, rgba(25, 27, 36, 0.55)) !important;
      border: 1px solid var(--border-subtle, rgba(62, 72, 79, 0.35)) !important;
      border-radius: 14px !important;
    }

    /* -------------------------------------------------------------
       Tactile Cosmic Pills & Badges
       ------------------------------------------------------------- */
    .theme-pill-active,
    .liquid-pill-active,
    .obsidian-pill-active,
    .action-pill {
      background-color: rgba(56, 189, 248, 0.18) !important;
      background-image: none !important;
      color: var(--accent-primary, #38bdf8) !important;
      border: 1px solid var(--accent-border, rgba(56, 189, 248, 0.45)) !important;
      border-radius: 9999px !important;
      box-shadow: 0 0 14px rgba(56, 189, 248, 0.25) !important;
    }

    .theme-pill,
    .liquid-pill-inactive,
    .obsidian-pill-inactive,
    .action-pill-inactive {
      background-color: rgba(29, 31, 40, 0.60) !important;
      background-image: none !important;
      color: #87929a !important;
      border: 1px solid rgba(62, 72, 79, 0.35) !important;
      border-radius: 9999px !important;
    }

    /* -------------------------------------------------------------
       Aetherial Radial Arc Dial Surface
       ------------------------------------------------------------- */
    .zero-dial-surface {
      background-color: var(--glass-dial-bg, rgba(17, 19, 27, 0.65)) !important;
      border: 1px solid var(--border-subtle, rgba(62, 72, 79, 0.45)) !important;
      border-top: 1px solid var(--border-strong, rgba(56, 189, 248, 0.35)) !important;
      border-radius: 9999px !important;
      backdrop-filter: var(--surface-blur, blur(24px) saturate(180%)) !important;
      -webkit-backdrop-filter: var(--surface-blur, blur(24px) saturate(180%)) !important;
      box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.75), 0 0 28px -4px rgba(56, 189, 248, 0.25) !important;
      contain: layout style paint;
      touch-action: none !important;
    }

    .zero-dial-surface[data-dial-dragging="true"] .zero-dial-knob-layer,
    .zero-dial-surface[data-dial-dragging="true"] .zero-dial-arc {
      transition: none !important;
    }

    /* -------------------------------------------------------------
       Floating Obsidian Dock Navigation
       ------------------------------------------------------------- */
    .liquid-dock,
    .zero-bottom-nav,
    nav[data-bottom-nav="true"],
    nav[data-frosted-chrome="true"] {
      background-color: var(--glass-dock-bg, rgba(12, 14, 22, 0.84)) !important;
      border: 1px solid var(--border-subtle, rgba(62, 72, 79, 0.45)) !important;
      border-top: 1px solid rgba(56, 189, 248, 0.25) !important;
      border-radius: 2rem !important;
      backdrop-filter: blur(20px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
      box-shadow: 0 16px 44px -4px rgba(0, 0, 0, 0.75), 0 0 20px -4px rgba(56, 189, 248, 0.15) !important;
    }

    /* -------------------------------------------------------------
       Modal & Bottom-Sheet Depth
       ------------------------------------------------------------- */
    .modal-glass,
    [data-modal-glass="true"],
    .zero-modal-card {
      background-color: var(--bg-modal, rgba(17, 19, 27, 0.94)) !important;
      backdrop-filter: blur(24px) saturate(180%) !important;
      -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
      border: 1px solid rgba(62, 72, 79, 0.50) !important;
      border-top: 1px solid rgba(56, 189, 248, 0.40) !important;
      box-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.85), 0 0 30px -5px rgba(56, 189, 248, 0.20) !important;
    }

    /* -------------------------------------------------------------
       GPU Battery & Thermal Safeguard
       ------------------------------------------------------------- */
    html[data-gpu-safeguard="true"] .glass-card,
    html[data-gpu-safeguard="true"] .obsidian-card,
    html[data-gpu-safeguard="true"] .liquid-glass,
    html[data-gpu-safeguard="true"] .liquid-card,
    html[data-gpu-safeguard="true"] .theme-card,
    html[data-gpu-safeguard="true"] .settings-card,
    html[data-gpu-safeguard="true"] .zero-dial-surface,
    html[data-gpu-safeguard="true"] .liquid-dock,
    html[data-gpu-safeguard="true"] .modal-glass,
    html[data-gpu-safeguard="true"] [data-modal-glass="true"] {
      backdrop-filter: none !important;
      -webkit-backdrop-filter: none !important;
      background-color: rgba(20, 22, 30, 0.96) !important;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
    }

    /* Semantic Helper Utilities */
    .theme-bg-primary { background-color: #11131b !important; color: #e2e1ed !important; }
    .theme-bg-secondary { background-color: rgba(25, 27, 36, 0.85) !important; color: #e2e1ed !important; }
    .theme-text-primary { color: #e2e1ed !important; }
    .theme-text-secondary { color: #bdc8d1 !important; }
    .theme-text-muted { color: #87929a !important; }
    .theme-text-accent { color: var(--accent-primary, #38bdf8) !important; }
    .theme-border { border-color: rgba(62, 72, 79, 0.45) !important; }
  `,
};
