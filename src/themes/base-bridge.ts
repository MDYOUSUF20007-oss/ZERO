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
    --accent-shift-1: #6366f1 !important; /* Royal Indigo */
    --accent-shift-2: #c026d3 !important; /* Electric Orchid */
    --accent-shift-3: #4338ca !important; /* Midnight Violet */
    --accent-shift-4: #8b5cf6 !important; /* Luminous Purple */
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
    --accent-shift-1: #0ea5e9 !important; /* Celestial Sky */
    --accent-shift-2: #14b8a6 !important; /* Radiant Teal */
    --accent-shift-3: #0284c7 !important; /* Cobalt Azure */
    --accent-shift-4: #06b6d4 !important; /* Vibrant Cyan */
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
    transition: transform 0.18s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.15s ease, background-color 0.15s ease, border-color 0.15s ease !important;
  }
  .liquid-spring:active {
    transform: scale(0.97) !important;
  }

  /* -------------------------------------------------------------
     Fluent Glass Acrylic Surface Cards (True 4-Layer Physical Glass)
     ------------------------------------------------------------- */
  .glass-card,
  .obsidian-card,
  .liquid-glass,
  .liquid-card,
  .theme-card,
  .settings-card,
  [data-frosted-card="true"],
  [data-obsidian-card="true"] {
    background-color: var(--bg-surface, rgba(12, 18, 30, 0.72)) !important;
    background-image: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.015) 35%, rgba(255, 255, 255, 0.02) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.11) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.36) !important;
    border-left: 1px solid rgba(255, 255, 255, 0.18) !important;
    border-radius: 20px !important;
    box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, 0.22), 0 14px 34px -4px rgba(0, 0, 0, 0.65), 0 0 18px -4px var(--liquid-accent-soft-glow) !important;
    backdrop-filter: blur(18px) saturate(185%) !important;
    -webkit-backdrop-filter: blur(18px) saturate(185%) !important;
    color: var(--text-primary, #f0f9ff) !important;
  }

  /* -------------------------------------------------------------
     Living Ambient Fluid Mesh Keyframes (100% GPU Compositor)
     ------------------------------------------------------------- */
  @keyframes ambientMeshDriftA {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    33% {
      transform: translate3d(55px, 40px, 0) scale(1.08);
    }
    66% {
      transform: translate3d(-35px, 60px, 0) scale(0.94);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes ambientMeshDriftB {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    33% {
      transform: translate3d(-50px, -35px, 0) scale(0.93);
    }
    66% {
      transform: translate3d(40px, -55px, 0) scale(1.07);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes ambientMeshDriftC {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    33% {
      transform: translate3d(38px, -45px, 0) scale(1.06);
    }
    66% {
      transform: translate3d(-38px, -25px, 0) scale(0.95);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  @keyframes ambientMeshDriftD {
    0% {
      transform: translate3d(0, 0, 0) scale(1);
    }
    50% {
      transform: translate3d(-40px, 45px, 0) scale(1.09);
    }
    100% {
      transform: translate3d(0, 0, 0) scale(1);
    }
  }

  .ambient-mesh-node-1 {
    animation: ambientMeshDriftA 26s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    will-change: transform;
  }
  .ambient-mesh-node-2 {
    animation: ambientMeshDriftB 32s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    will-change: transform;
  }
  .ambient-mesh-node-3 {
    animation: ambientMeshDriftC 22s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    will-change: transform;
  }
  .ambient-mesh-node-4 {
    animation: ambientMeshDriftD 29s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate;
    will-change: transform;
  }

  .obsidian-inset,
  .liquid-inset {
    background-color: rgba(22, 32, 50, 0.65) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.22) !important;
    border-radius: 14px !important;
  }

  .obsidian-inset-neutral,
  .liquid-row {
    background-color: rgba(15, 23, 42, 0.55) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 14px !important;
  }

  /* -------------------------------------------------------------
     Fluent Glass Tactile Pills & Buttons (Ultra-Fast 0ms Overhead)
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
    box-shadow: 0 0 14px var(--liquid-accent-soft-glow) !important;
  }

  .theme-pill,
  .liquid-pill-inactive,
  .obsidian-pill-inactive,
  .action-pill-inactive {
    background-color: rgba(255, 255, 255, 0.06) !important;
    background-image: none !important;
    color: #94a3b8 !important;
    border: 1px solid rgba(255, 255, 255, 0.09) !important;
    border-radius: 9999px !important;
  }

  /* -------------------------------------------------------------
     Radial Dial Glass Surface & Zero-Lag Touch Dragging
     ------------------------------------------------------------- */
  .zero-dial-surface {
    background-color: rgba(14, 20, 32, 0.55) !important;
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.28) !important;
    border-radius: 9999px !important;
    backdrop-filter: blur(16px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(16px) saturate(180%) !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.20), 0 16px 40px -8px rgba(0, 0, 0, 0.6) !important;
    contain: layout style paint;
    touch-action: none !important;
  }

  /* Instant 0ms Tracking on Touch Drag */
  .zero-dial-surface[data-dial-dragging="true"] .zero-dial-knob-layer,
  .zero-dial-surface[data-dial-dragging="true"] .zero-dial-arc {
    transition: none !important;
  }

  /* -------------------------------------------------------------
     Floating Frosted Dock Navigation
     ------------------------------------------------------------- */
  .liquid-dock,
  .zero-bottom-nav,
  nav[data-bottom-nav="true"],
  nav[data-frosted-chrome="true"] {
    background-color: rgba(10, 16, 28, 0.82) !important;
    border: 1px solid rgba(255, 255, 255, 0.12) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.32) !important;
    border-radius: 2rem !important;
    backdrop-filter: blur(20px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(180%) !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.22), 0 16px 44px -4px rgba(0, 0, 0, 0.65) !important;
  }

  /* -------------------------------------------------------------
     Living Ambient Canvas
     ------------------------------------------------------------- */
  .zero-ambient-canvas {
    display: block !important;
    opacity: 0.90 !important;
  }

  /* Semantic Helper Utilities */
  .theme-bg-primary { background-color: #000000 !important; color: #f0f9ff !important; }
  .theme-bg-secondary { background-color: rgba(14, 20, 32, 0.72) !important; color: #f0f9ff !important; }
  .theme-text-primary { color: #f0f9ff !important; }
  .theme-text-secondary { color: #bae6fd !important; }
  .theme-text-muted { color: #7dd3fc !important; }
  .theme-text-accent { color: var(--accent-primary) !important; }
  .theme-border { border-color: rgba(255, 255, 255, 0.10) !important; }
`;
