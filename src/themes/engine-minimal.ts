import { type ThemeEngineDefinition } from './types';
import { BASE_ENGINE_BRIDGE_CSS } from './base-bridge';

export const minimalEngine: ThemeEngineDefinition = {
  id: 'minimal',
  name: 'Monochrome Ink',
  badge: 'E-INK DARK',
  description: 'Zero-distraction flat matte charcoal with sharp 6px geometry and pure white contrast.',
  swatchBg: '#121212',
  swatchSurface: '#1e1e1e',
  swatchAccent: '#ffffff',
  css: `
    :root, html[data-theme="minimal"] {
      --bg-primary: #121212;
      --bg-secondary: #171717;
      --bg-surface: #1e1e1e;
      --bg-surface-hover: #262626;
      --bg-elevated: #242424;
      --bg-modal: #1a1a1a;
      --bg-nav: #121212;
      --bg-input: #171717;

      --text-primary: #f5f5f5;
      --text-secondary: #b5b5b5;
      --text-muted: #737373;
      --text-on-accent: #121212;

      --accent-primary: #ffffff;
      --accent-secondary: #d4d4d4;
      --accent-soft: rgba(255, 255, 255, 0.12);
      --accent-border: #ffffff;

      --border-subtle: #2e2e2e;
      --border-strong: #525252;
      --border-specular: #2e2e2e;

      --status-success: #d4d4d4;
      --status-warning: #a3a3a3;
      --status-danger: #ffffff;

      --app-backdrop-gradient: none;
      --surface-blur: none;
      --surface-shadow: none;
      --surface-gradient: none;
      --radius-card: 6px;
      --radius-pill: 6px;
      --radius-btn: 6px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #121212;
      --zero-surface-1: #1e1e1e;
      --zero-surface-2: #242424;
      --zero-surface-3: #262626;
      --zero-border: #2e2e2e;
      --zero-ink-primary: #f5f5f5;
      --zero-ink-muted: #737373;
      --zero-accent: #ffffff;
      --zero-dial-stroke: #ffffff;
      --accent-hex: #ffffff;
      --accent-rgb: 255, 255, 255;
    }
    ${BASE_ENGINE_BRIDGE_CSS}
  `,
};
