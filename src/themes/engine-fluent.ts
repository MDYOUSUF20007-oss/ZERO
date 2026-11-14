import { type ThemeEngineDefinition } from './types';
import { BASE_ENGINE_BRIDGE_CSS } from './base-bridge';

export const fluentEngine: ThemeEngineDefinition = {
  id: 'fluent',
  name: 'Fluent Glass',
  badge: 'ACRYLIC',
  description: 'Translucent multi-layer acrylic glass with backdrop blur and specular top highlights.',
  swatchBg: '#070b14',
  swatchSurface: '#162238',
  swatchAccent: '#38bdf8',
  css: `
    :root, html[data-theme="fluent"] {
      --bg-primary: #070b14;
      --bg-secondary: #0c1322;
      --bg-surface: rgba(16, 26, 44, 0.39);
      --bg-surface-hover: rgba(24, 38, 64, 0.41);
      --bg-elevated: rgba(20, 32, 54, 0.44);
      --bg-modal: rgba(13, 20, 36, 0.90);
      --bg-nav: rgba(8, 13, 24, 0.78);
      --bg-input: rgba(15, 23, 42, 0.72);

      --glass-opacity: 0.50;
      --glass-surface-bg: rgba(16, 26, 44, 0.39);
      --glass-specular-opacity: 0.46;
      --glass-inset-bg: rgba(20, 30, 48, 0.37);
      --glass-row-bg: rgba(14, 22, 38, 0.31);
      --glass-dock-bg: rgba(10, 16, 28, 0.55);
      --glass-dial-bg: rgba(14, 20, 32, 0.375);
      --glass-glow-mult: 0.55;

      --text-primary: #f0f9ff;
      --text-secondary: #bae6fd;
      --text-muted: #7dd3fc;
      --text-on-accent: #082f49;

      --accent-primary: #38bdf8;
      --accent-secondary: #818cf8;
      --accent-soft: rgba(56, 189, 248, 0.16);
      --accent-border: rgba(56, 189, 248, 0.55);

      --border-subtle: rgba(186, 230, 253, 0.14);
      --border-strong: rgba(186, 230, 253, 0.28);
      --border-specular: rgba(255, 255, 255, 0.26);

      --status-success: #34d399;
      --status-warning: #fbbf24;
      --status-danger: #f87171;

      --app-backdrop-gradient: radial-gradient(circle at 15% 10%, rgba(56, 189, 248, 0.14) 0%, transparent 45%), radial-gradient(circle at 85% 85%, rgba(99, 102, 241, 0.12) 0%, transparent 50%);
      --surface-blur: blur(18px) saturate(160%);
      --surface-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5);
      --surface-gradient: linear-gradient(180deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.0) 100%);
      --radius-card: 18px;
      --radius-pill: 9999px;
      --radius-btn: 12px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #070b14;
      --zero-surface-1: rgba(22, 34, 56, 0.62);
      --zero-surface-2: rgba(28, 42, 68, 0.78);
      --zero-surface-3: rgba(30, 45, 74, 0.74);
      --zero-border: rgba(186, 230, 253, 0.14);
      --zero-ink-primary: #f0f9ff;
      --zero-ink-muted: #7dd3fc;
      --zero-accent: #38bdf8;
      --zero-dial-stroke: #38bdf8;
      --accent-hex: #38bdf8;
      --accent-rgb: 56, 189, 248;
    }
    ${BASE_ENGINE_BRIDGE_CSS}
  `,
};
