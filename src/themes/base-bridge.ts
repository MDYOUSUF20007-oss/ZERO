export const BASE_ENGINE_BRIDGE_CSS = `
  html, body, #root {
    background-color: #000000 !important;
    color: #f0f9ff !important;
    font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif !important;
    background-image: none !important;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* -------------------------------------------------------------
     Dynamic 2-Color Accent Palette Overrides: [data-accent="..."]
     ------------------------------------------------------------- */
  /* Purple Accent */
  :root,
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

  /* Cyan Accent */
  [data-accent="cyan"],
  html[data-accent="cyan"] {
    --accent-primary: #00f0ff !important;
    --accent-secondary: #38bdf8 !important;
    --accent-soft: rgba(0, 240, 255, 0.18) !important;
    --accent-border: rgba(0, 240, 255, 0.55) !important;
    --text-on-accent: #042f2e !important;
    --zero-accent: #00f0ff !important;
    --zero-dial-stroke: #00f0ff !important;
    --accent-hex: #00f0ff !important;
    --accent-rgb: 0, 240, 255 !important;
    --liquid-accent-glow: rgba(0, 240, 255, 0.40) !important;
    --liquid-accent-soft-glow: rgba(0, 240, 255, 0.18) !important;
    --liquid-accent-vibrant: #00f0ff !important;
    --liquid-accent-tint: #38bdf8 !important;
  }

  /* -------------------------------------------------------------
     Clean Typography & Natural Letter-casing
     ------------------------------------------------------------- */
  body, .font-mono, .font-sans {
    font-family: 'Segoe UI Variable', 'Segoe UI', -apple-system, BlinkMacSystemFont, 'Inter', system-ui, sans-serif !important;
  }
  .uppercase {
    text-transform: none !important;
    letter-spacing: 0.01em !important;
  }

  /* -------------------------------------------------------------
     Smooth Micro-Interactions & Hardware Acceleration
     ------------------------------------------------------------- */
  .liquid-spring {
    transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease, filter 0.2s ease, background-color 0.2s ease, border-color 0.2s ease !important;
    will-change: transform, opacity;
    transform: translateZ(0);
  }
  .liquid-spring:active {
    transform: scale(0.97) translateZ(0) !important;
  }

  /* -------------------------------------------------------------
     Fluent Glass Acrylic Surface Cards
     ------------------------------------------------------------- */
  .glass-card,
  .obsidian-card,
  .liquid-glass,
  .liquid-card,
  .theme-card,
  .settings-card,
  [data-frosted-card="true"],
  [data-obsidian-card="true"] {
    background-color: var(--bg-surface, rgba(16, 24, 38, 0.65)) !important;
    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.01) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.38) !important;
    border-radius: 20px !important;
    box-shadow: 0 12px 36px -4px rgba(0, 0, 0, 0.55), inset 0 1px 0 rgba(255, 255, 255, 0.20) !important;
    backdrop-filter: blur(28px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(28px) saturate(190%) !important;
    color: var(--text-primary, #f0f9ff) !important;
    will-change: transform, opacity;
    transform: translateZ(0);
  }

  .obsidian-inset,
  .liquid-inset {
    background-color: rgba(24, 36, 58, 0.72) !important;
    border: 1px solid rgba(186, 230, 253, 0.20) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.25) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(16px) !important;
    -webkit-backdrop-filter: blur(16px) !important;
  }

  .obsidian-inset-neutral,
  .liquid-row {
    background-color: rgba(15, 23, 42, 0.60) !important;
    border: 1px solid rgba(186, 230, 253, 0.10) !important;
    border-radius: 14px !important;
  }

  /* -------------------------------------------------------------
     Fluent Glass Tactile Pills & Buttons
     ------------------------------------------------------------- */
  .theme-pill-active,
  .liquid-pill-active,
  .obsidian-pill-active,
  .action-pill {
    background-color: var(--accent-soft) !important;
    background-image: none !important;
    color: var(--accent-primary) !important;
    border: 1px solid var(--accent-border) !important;
    border-radius: 9999px !important;
    box-shadow: 0 4px 16px -2px var(--accent-soft) !important;
    backdrop-filter: blur(14px) !important;
    -webkit-backdrop-filter: blur(14px) !important;
  }

  .theme-pill,
  .liquid-pill-inactive,
  .obsidian-pill-inactive,
  .action-pill-inactive {
    background-color: rgba(255, 255, 255, 0.05) !important;
    background-image: none !important;
    color: #94a3b8 !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 9999px !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
  }

  /* -------------------------------------------------------------
     Radial Dial Glass Surface
     ------------------------------------------------------------- */
  .zero-dial-surface {
    background-color: rgba(16, 24, 38, 0.50) !important;
    border: 1px solid rgba(255, 255, 255, 0.16) !important;
    border-radius: 9999px !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    box-shadow: 0 16px 40px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  }

  /* -------------------------------------------------------------
     Floating Frosted Dock Navigation
     ------------------------------------------------------------- */
  .liquid-dock,
  .zero-bottom-nav,
  nav[data-bottom-nav="true"],
  nav[data-frosted-chrome="true"] {
    background-color: rgba(10, 16, 28, 0.78) !important;
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.35) !important;
    border-radius: 2rem !important;
    backdrop-filter: blur(32px) saturate(200%) !important;
    -webkit-backdrop-filter: blur(32px) saturate(200%) !important;
    box-shadow: 0 16px 48px -4px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.25) !important;
  }

  /* -------------------------------------------------------------
     Living Ambient Canvas
     ------------------------------------------------------------- */
  .zero-ambient-canvas {
    display: block !important;
    opacity: 0.85 !important;
  }

  /* Semantic Helper Utilities */
  .theme-bg-primary { background-color: #000000 !important; color: #f0f9ff !important; }
  .theme-bg-secondary { background-color: rgba(16, 24, 38, 0.65) !important; color: #f0f9ff !important; }
  .theme-text-primary { color: #f0f9ff !important; }
  .theme-text-secondary { color: #bae6fd !important; }
  .theme-text-muted { color: #7dd3fc !important; }
  .theme-text-accent { color: var(--accent-primary) !important; }
  .theme-border { border-color: rgba(255, 255, 255, 0.12) !important; }
`;
