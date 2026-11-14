import { type ThemeEngineDefinition } from './types';
import { BASE_ENGINE_BRIDGE_CSS } from './base-bridge';

export const materialEngine: ThemeEngineDefinition = {
  id: 'material',
  name: 'Material You',
  badge: 'MD3 TONAL',
  description: 'Expressive Android 15 tonal surfaces with ultra-rounded 24px geometry and pastel lavender accents.',
  swatchBg: '#141218',
  swatchSurface: '#211f26',
  swatchAccent: '#d0bcff',
  css: `
    :root, html[data-theme="material"] {
      --bg-primary: #141218;
      --bg-secondary: #1d1b20;
      --bg-surface: #211f26;
      --bg-surface-hover: #2b2930;
      --bg-elevated: #2b2930;
      --bg-modal: #211f26;
      --bg-nav: rgba(29, 27, 32, 0.96);
      --bg-input: #1d1b20;

      --text-primary: #e6e0e9;
      --text-secondary: #cac4d0;
      --text-muted: #938f99;
      --text-on-accent: #381e72;

      --accent-primary: #d0bcff;
      --accent-secondary: #ccc2dc;
      --accent-soft: rgba(208, 188, 255, 0.18);
      --accent-border: rgba(208, 188, 255, 0.45);

      --border-subtle: #36343b;
      --border-strong: #49454f;
      --border-specular: #36343b;

      --status-success: #86efac;
      --status-warning: #fde047;
      --status-danger: #f2b8b5;

      --app-backdrop-gradient: none;
      --surface-blur: none;
      --surface-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
      --surface-gradient: none;
      --radius-card: 24px;
      --radius-pill: 9999px;
      --radius-btn: 9999px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #141218;
      --zero-surface-1: #211f26;
      --zero-surface-2: #2b2930;
      --zero-surface-3: #1d1b20;
      --zero-border: #36343b;
      --zero-ink-primary: #e6e0e9;
      --zero-ink-muted: #938f99;
      --zero-accent: #d0bcff;
      --zero-dial-stroke: #d0bcff;
      --accent-hex: #d0bcff;
      --accent-rgb: 208, 188, 255;
    }
    ${BASE_ENGINE_BRIDGE_CSS}
  `,
};
