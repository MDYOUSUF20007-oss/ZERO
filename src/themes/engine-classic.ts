import { type ThemeEngineDefinition } from './types';
import { BASE_ENGINE_BRIDGE_CSS } from './base-bridge';

export const classicEngine: ThemeEngineDefinition = {
  id: 'classic',
  name: 'Classic Slate',
  badge: 'SLATE',
  description: 'Structured deep slate panels with crisp borders and vibrant indigo highlights.',
  swatchBg: '#0f172a',
  swatchSurface: '#1e293b',
  swatchAccent: '#6366f1',
  css: `
    :root, html[data-theme="classic"] {
      --bg-primary: #0f172a;
      --bg-secondary: #131c31;
      --bg-surface: #1e293b;
      --bg-surface-hover: #263449;
      --bg-elevated: #283548;
      --bg-modal: #1e293b;
      --bg-nav: rgba(15, 23, 42, 0.96);
      --bg-input: #0f172a;

      --text-primary: #f8fafc;
      --text-secondary: #cbd5e1;
      --text-muted: #64748b;
      --text-on-accent: #ffffff;

      --accent-primary: #6366f1;
      --accent-secondary: #818cf8;
      --accent-soft: rgba(99, 102, 241, 0.16);
      --accent-border: rgba(99, 102, 241, 0.50);

      --border-subtle: #334155;
      --border-strong: #475569;
      --border-specular: #334155;

      --status-success: #22c55e;
      --status-warning: #eab308;
      --status-danger: #ef4444;

      --app-backdrop-gradient: none;
      --surface-blur: none;
      --surface-shadow: 0 4px 18px -2px rgba(0, 0, 0, 0.35);
      --surface-gradient: none;
      --radius-card: 16px;
      --radius-pill: 9999px;
      --radius-btn: 12px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #0f172a;
      --zero-surface-1: #1e293b;
      --zero-surface-2: #283548;
      --zero-surface-3: #263449;
      --zero-border: #334155;
      --zero-ink-primary: #f8fafc;
      --zero-ink-muted: #64748b;
      --zero-accent: #6366f1;
      --zero-dial-stroke: #6366f1;
      --accent-hex: #6366f1;
      --accent-rgb: 99, 102, 241;
    }
    ${BASE_ENGINE_BRIDGE_CSS}
  `,
};
