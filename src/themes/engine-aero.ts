import { type ThemeEngineDefinition } from './types';

export const aeroEngine: ThemeEngineDefinition = {
  id: 'aero',
  name: 'Aero UI',
  badge: 'SKYLINE',
  description: 'Airy mist-blue sky canvas with sunlit cloud glows, frosted iridescent hero cards, and elevated pure-white operational sheets.',
  swatchBg: '#DAEAF3',
  swatchSurface: '#FFFFFF',
  swatchAccent: '#111827',
  swatchAccentSecondary: '#5B6B79',
  css: `
    :root, html[data-theme="aero"], html[data-interface-style="aero"] {
      color-scheme: light !important;

      --bg-primary: #DAEAF3;
      --bg-secondary: #ECF4F8;
      --bg-surface: #FFFFFF;
      --surface-tonal: #F6F9FC;
      --bg-surface-hover: #F1F5F9;
      --bg-elevated: #FFFFFF;
      --bg-modal: #FFFFFF;
      --bg-nav: #FFFFFF;
      --bg-input: #F6F9FC;

      --glass-opacity: 0.85;
      --glass-surface-bg: rgba(255, 255, 255, 0.85);
      --glass-specular-opacity: 0.95;
      --glass-inset-bg: #F6F9FC;
      --glass-row-bg: #F6F9FC;
      --glass-dock-bg: #FFFFFF;
      --glass-dial-bg: rgba(255, 255, 255, 0.72);
      --glass-glow-mult: 0.25;

      /* Matte black high-contrast ink text */
      --text-primary: #0f172a;
      --text-secondary: #0f172a;
      --text-muted: #334155;
      --text-on-accent: #FFFFFF;

      --accent-primary: var(--aero-palette-color, #0f172a);
      --accent-secondary: var(--aero-palette-color, #0f172a);
      --accent-tertiary: #334155;
      --accent-soft: rgba(15, 23, 42, 0.06);
      --accent-border: #CBD5E1;
      --accent-hex: var(--aero-palette-color, #0f172a);
      --accent-rgb: 15, 23, 42;

      --border-subtle: #E2E8F0;
      --border-strong: #CBD5E1;
      --border-specular: rgba(255, 255, 255, 0.95);

      --status-success: #059669;
      --status-warning: #D97706;
      --status-danger: #DC2626;

      --app-backdrop-gradient: linear-gradient(180deg, #C7DCE8 0%, #DAEAF3 26%, #ECF4F8 55%, #F6F9FC 100%);
      --surface-blur: blur(20px) saturate(180%);
      --surface-shadow: 0 10px 30px -4px rgba(15, 23, 42, 0.06);
      --surface-gradient: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.54) 100%);
      --radius-card: 24px;
      --radius-pill: 9999px;
      --radius-btn: 14px;

      /* Aero-specific structural tokens */
      --aero-sky-gradient: linear-gradient(180deg, #C7DCE8 0%, #DAEAF3 26%, #ECF4F8 55%, #F6F9FC 100%);
      --aero-sheet-bg: #FFFFFF;
      --aero-sheet-radius: 30px 30px 0 0;
      --aero-sheet-shadow: 0 -10px 30px rgba(15, 23, 42, 0.06);
      --aero-ink-primary: var(--aero-palette-color, #0f172a);
      --aero-ink-secondary: #0f172a;
      --aero-card-bg: #F6F9FC;
      --aero-card-border: 1px solid #E2E8F0;
      --aero-hero-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.85) 0%, rgba(255, 255, 255, 0.54) 100%);
      --aero-hero-border: 1px solid rgba(255, 255, 255, 0.95);
      --aero-aurora-glow: radial-gradient(circle at 90% 90%, rgba(251, 146, 60, 0.45) 0%, rgba(244, 114, 182, 0.35) 40%, rgba(167, 139, 250, 0.30) 75%, transparent 100%);

      /* Backwards compatible tokens mapped to high-contrast ink */
      --zero-bg-primary: #DAEAF3;
      --zero-surface-1: #FFFFFF;
      --zero-surface-2: #F6F9FC;
      --zero-surface-elevated: #FFFFFF;
      --zero-ink-primary: #0f172a;
      --zero-ink-secondary: #0f172a;
      --zero-ink-muted: #334155;
      --zero-border: #E2E8F0;
      --zero-dial-stroke: var(--aero-palette-color, #0f172a);
      --zero-dial-track: rgba(15, 23, 42, 0.16);
      --zero-accent: var(--aero-palette-color, #0f172a);
      --zero-accent-glow: rgba(15, 23, 42, 0.08);

      --liquid-accent-tint: var(--aero-palette-color, #0f172a);
      --liquid-accent-vibrant: var(--aero-palette-color, #0f172a);
      --liquid-accent-glow: rgba(15, 23, 42, 0.12);
      --liquid-accent-soft-glow: rgba(15, 23, 42, 0.06);
      --liquid-surface-blur: 20px;
    }

    /* Aero Global Root & Body Styles */
    html[data-interface-style="aero"],
    html[data-interface-style="aero"] body,
    html[data-interface-style="aero"] #root {
      background: linear-gradient(180deg, #C7DCE8 0%, #DAEAF3 26%, #ECF4F8 55%, #F6F9FC 100%) !important;
      color: #0f172a !important;
      font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    html[data-interface-style="aero"] .zero-app-shell {
      background: transparent !important;
      color: #0f172a !important;
    }

    /* Aero Navigation Dock (Bottom bar) */
    html[data-interface-style="aero"] .liquid-dock {
      background: #FFFFFF !important;
      border: 1px solid #F1F5F9 !important;
      box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.08) !important;
    }

    html[data-interface-style="aero"] .liquid-dock-item-active {
      background: rgba(15, 23, 42, 0.06) !important;
      border: 1px solid rgba(15, 23, 42, 0.12) !important;
      box-shadow: none !important;
    }

    /* Aero Cards in default glass positions */
    html[data-interface-style="aero"] .glass-card,
    html[data-interface-style="aero"] .obsidian-card,
    html[data-interface-style="aero"] .liquid-glass,
    html[data-interface-style="aero"] .liquid-card,
    html[data-interface-style="aero"] [data-obsidian-card="true"] {
      background-color: rgba(255, 255, 255, 0.88) !important;
      backdrop-filter: blur(20px) !important;
      -webkit-backdrop-filter: blur(20px) !important;
      border: 1px solid rgba(255, 255, 255, 0.95) !important;
      box-shadow: 0 10px 25px -4px rgba(15, 23, 42, 0.05) !important;
      color: #0f172a !important;
    }

    /* Aero Pill Toggles & Squircle Capsules */
    html[data-interface-style="aero"] .liquid-pill-active {
      background-color: var(--aero-palette-color, #0f172a) !important;
      color: #FFFFFF !important;
      border: 1px solid var(--aero-palette-color, #0f172a) !important;
      border-radius: 18px !important;
    }

    html[data-interface-style="aero"] .liquid-pill-inactive {
      background-color: #FFFFFF !important;
      color: #0f172a !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 18px !important;
      font-weight: 700 !important;
    }

    html[data-interface-style="aero"] .aero-capsule {
      background: #FFFFFF;
      border: 1px solid #E2E8F0;
      border-radius: 18px;
      color: #0f172a;
      box-shadow: 0 1px 3px rgba(15, 23, 42, 0.04);
    }

    html[data-interface-style="aero"] .aero-pill-active {
      background-color: var(--aero-palette-color, #0f172a) !important;
      color: #FFFFFF !important;
      border: 1px solid var(--aero-palette-color, #0f172a) !important;
      border-radius: 18px !important;
    }

    html[data-interface-style="aero"] .aero-pill-inactive {
      background-color: #FFFFFF !important;
      color: #0f172a !important;
      border: 1px solid #E2E8F0 !important;
      border-radius: 18px !important;
      font-weight: 700 !important;
    }

    /* Aero Insets, Rows, and Inputs High-Contrast Glass Rules */
    html[data-interface-style="aero"] .obsidian-inset,
    html[data-interface-style="aero"] .liquid-inset {
      background-color: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      color: #0f172a !important;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04) !important;
    }

    html[data-interface-style="aero"] .obsidian-inset-neutral,
    html[data-interface-style="aero"] .liquid-row {
      background-color: #FFFFFF !important;
      border: 1px solid #E2E8F0 !important;
      color: #0f172a !important;
      box-shadow: 0 1px 4px rgba(15, 23, 42, 0.04) !important;
    }

    html[data-interface-style="aero"] .obsidian-input {
      background-color: #FFFFFF !important;
      border: 1px solid #CBD5E1 !important;
      color: #0f172a !important;
    }

    html[data-interface-style="aero"] .obsidian-input::placeholder {
      color: #94A3B8 !important;
    }

    html[data-interface-style="aero"] .obsidian-pill-active,
    html[data-interface-style="aero"] .theme-pill-active {
      background-color: var(--aero-palette-color, #0f172a) !important;
      color: #FFFFFF !important;
      border: 1px solid var(--aero-palette-color, #0f172a) !important;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.16) !important;
    }

    html[data-interface-style="aero"] .obsidian-pill-inactive,
    html[data-interface-style="aero"] .theme-pill {
      background-color: #FFFFFF !important;
      color: #334155 !important;
      border: 1px solid #CBD5E1 !important;
      font-weight: 600 !important;
    }

    /* Aero Global Contrast Boost for Text Inside Light Cards */
    html[data-interface-style="aero"] .text-zinc-400,
    html[data-interface-style="aero"] .text-neutral-400,
    html[data-interface-style="aero"] .text-zinc-500,
    html[data-interface-style="aero"] .text-neutral-500 {
      color: #475569 !important;
    }

    html[data-interface-style="aero"] .text-zinc-300,
    html[data-interface-style="aero"] .text-neutral-300 {
      color: #334155 !important;
    }

    /* Aero Dock Ticket Preview & Badge */
    html[data-interface-style="aero"] .zn-dock-ticket-svg {
      filter: drop-shadow(0 4px 14px rgba(15, 23, 42, 0.08)) drop-shadow(0 1px 3px rgba(15, 23, 42, 0.05)) !important;
    }

    html[data-interface-style="aero"] .zn-dock-ticket-badge {
      background: var(--aero-palette-color, #0f172a) !important;
      color: #FFFFFF !important;
      border: 2px solid #FFFFFF !important;
      box-shadow: 0 2px 8px rgba(15, 23, 42, 0.20) !important;
      font-weight: 800 !important;
      font-size: 11px !important;
    }

    html[data-interface-style="aero"] .liquid-track {
      background-color: #E2E8F0 !important;
    }

    html[data-interface-style="aero"] .liquid-metric {
      color: #0f172a !important;
      text-shadow: none !important;
    }

    /* Smooth Micro-Interactions & Hardware Acceleration */
    .liquid-spring {
      transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease !important;
    }
    .liquid-spring:active {
      transform: scale(0.97) !important;
    }
  `,
};
