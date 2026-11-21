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

      --text-primary: #111827;
      --text-secondary: #5B6B79;
      --text-muted: #9CA3AF;
      --text-on-accent: #FFFFFF;

      --accent-primary: #111827;
      --accent-secondary: #374151;
      --accent-tertiary: #4B5563;
      --accent-soft: rgba(17, 24, 39, 0.06);
      --accent-border: #E2E8F0;
      --accent-hex: #111827;
      --accent-rgb: 17, 24, 39;

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
      --aero-ink-primary: #111827;
      --aero-ink-secondary: #5B6B79;
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
      --zero-ink-primary: #111827;
      --zero-ink-secondary: #5B6B79;
      --zero-ink-muted: #9CA3AF;
      --zero-border: #E2E8F0;
      --zero-dial-stroke: #111827;
      --zero-dial-track: rgba(17, 24, 39, 0.20);
      --zero-accent: #111827;
      --zero-accent-glow: rgba(17, 24, 39, 0.08);

      --liquid-accent-tint: #111827;
      --liquid-accent-vibrant: #111827;
      --liquid-accent-glow: rgba(17, 24, 39, 0.12);
      --liquid-accent-soft-glow: rgba(17, 24, 39, 0.06);
      --liquid-surface-blur: 20px;
    }

    /* Aero Global Root & Body Styles */
    html[data-interface-style="aero"],
    html[data-interface-style="aero"] body,
    html[data-interface-style="aero"] #root {
      background: linear-gradient(180deg, #C7DCE8 0%, #DAEAF3 26%, #ECF4F8 55%, #F6F9FC 100%) !important;
      color: #111827 !important;
      font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif !important;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    html[data-interface-style="aero"] .zero-app-shell {
      background: transparent !important;
      color: #111827 !important;
    }

    /* Aero Navigation Dock (Bottom bar) */
    html[data-interface-style="aero"] .liquid-dock {
      background: #FFFFFF !important;
      border: 1px solid #F1F5F9 !important;
      box-shadow: 0 -4px 20px rgba(15, 23, 42, 0.06), 0 10px 30px rgba(15, 23, 42, 0.08) !important;
    }

    html[data-interface-style="aero"] .liquid-dock-item-active {
      background: rgba(17, 24, 39, 0.06) !important;
      border: 1px solid rgba(17, 24, 39, 0.12) !important;
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
      color: #111827 !important;
    }

    /* Aero Pill Toggles */
    html[data-interface-style="aero"] .liquid-pill-active {
      background-color: #111827 !important;
      color: #FFFFFF !important;
      border: 1px solid #111827 !important;
    }

    html[data-interface-style="aero"] .liquid-pill-inactive {
      background-color: rgba(255, 255, 255, 0.80) !important;
      color: #374151 !important;
      border: 1px solid rgba(255, 255, 255, 0.90) !important;
    }

    html[data-interface-style="aero"] .liquid-track {
      background-color: #E2E8F0 !important;
    }

    html[data-interface-style="aero"] .liquid-metric {
      color: #111827 !important;
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
