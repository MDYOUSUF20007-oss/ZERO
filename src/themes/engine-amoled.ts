import { type ThemeEngineDefinition } from './types';
import { BASE_ENGINE_BRIDGE_CSS } from './base-bridge';

export const amoledEngine: ThemeEngineDefinition = {
  id: 'amoled',
  name: 'Pitch AMOLED',
  badge: 'OLED #000',
  description: 'True #000000 pitch black with neon cyan & deep purple accents and zero blur overhead.',
  swatchBg: '#000000',
  swatchSurface: '#0b0b0f',
  swatchAccent: '#00f0ff',
  css: `
    :root, html[data-theme="amoled"] {
      --bg-primary: #000000;
      --bg-secondary: #060609;
      --bg-surface: #0b0b10;
      --bg-surface-hover: #13131c;
      --bg-elevated: #101018;
      --bg-modal: #08080c;
      --bg-nav: rgba(0, 0, 0, 0.96);
      --bg-input: #08080c;

      --text-primary: #ffffff;
      --text-secondary: #a1a1aa;
      --text-muted: #71717a;
      --text-on-accent: #000000;

      --accent-primary: #00f0ff;
      --accent-secondary: #7000ff;
      --accent-soft: rgba(0, 240, 255, 0.12);
      --accent-border: rgba(0, 240, 255, 0.48);

      --border-subtle: #18181f;
      --border-strong: #272733;
      --border-specular: #18181f;

      --status-success: #10b981;
      --status-warning: #f59e0b;
      --status-danger: #ef4444;

      --app-backdrop-gradient: none;
      --surface-blur: none;
      --surface-shadow: none;
      --surface-gradient: none;
      --radius-card: 14px;
      --radius-pill: 9999px;
      --radius-btn: 10px;

      /* Backwards compatible tokens */
      --zero-bg-primary: #000000;
      --zero-surface-1: #0b0b10;
      --zero-surface-2: #101018;
      --zero-surface-3: #13131c;
      --zero-border: #18181f;
      --zero-ink-primary: #ffffff;
      --zero-ink-muted: #71717a;
      --zero-accent: #00f0ff;
      --zero-dial-stroke: #00f0ff;
      --accent-hex: #00f0ff;
      --accent-rgb: 0, 240, 255;
    }
    ${BASE_ENGINE_BRIDGE_CSS}
  `,
};
