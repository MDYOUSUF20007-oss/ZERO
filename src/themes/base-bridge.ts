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
     Fluent Optical Glass Surface Cards (Zero-Shader Specular Glass)
     Renders crisp translucent specular glass with 0ms GPU blur passes
     ------------------------------------------------------------- */
  .glass-card,
  .obsidian-card,
  .liquid-glass,
  .liquid-card,
  .theme-card,
  .settings-card,
  [data-frosted-card="true"],
  [data-obsidian-card="true"] {
    background-color: rgba(13, 21, 36, 0.80) !important;
    background-image:
      linear-gradient(
        145deg,
        rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.14)) 0%,
        rgba(255, 255, 255, 0.03) 26%,
        rgba(14, 24, 42, 0.12) 55%,
        rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.04)) 100%
      ),
      radial-gradient(
        120% 80% at 0% 0%,
        var(--liquid-accent-soft-glow) 0%,
        transparent 58%
      ) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.10)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.28)) !important;
    border-left: 1px solid rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.20)) !important;
    border-radius: 20px !important;
    box-shadow:
      inset 0 1px 0.5px 0 rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.28)),
      inset 0 -1px 0 0 rgba(0, 0, 0, 0.35),
      0 12px 28px -6px rgba(0, 0, 0, 0.62) !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    text-shadow: var(--glass-text-shadow, none) !important;
    color: var(--text-primary, #f0f9ff) !important;
  }

  /* -------------------------------------------------------------
     Ambient Mesh Orbs (Static by Default — Optional Drift Toggle)
     ------------------------------------------------------------- */
  @keyframes ambientMeshGlideA {
    0% {
      transform: translate3d(0, 0, 0);
    }
    33% {
      transform: translate3d(18px, 14px, 0);
    }
    66% {
      transform: translate3d(-14px, 20px, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
    }
  }

  @keyframes ambientMeshGlideB {
    0% {
      transform: translate3d(0, 0, 0);
    }
    33% {
      transform: translate3d(-16px, -18px, 0);
    }
    66% {
      transform: translate3d(14px, -12px, 0);
    }
    100% {
      transform: translate3d(0, 0, 0);
    }
  }

  .ambient-mesh-node-1,
  .ambient-mesh-node-2 {
    animation: none;
  }

  html[data-ambient-drift="true"]:not([data-gpu-safeguard="true"]) .ambient-mesh-node-1 {
    animation: ambientMeshGlideA 42s ease-in-out infinite;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }
  html[data-ambient-drift="true"]:not([data-gpu-safeguard="true"]) .ambient-mesh-node-2 {
    animation: ambientMeshGlideB 48s ease-in-out infinite;
    will-change: transform;
    backface-visibility: hidden;
    -webkit-backface-visibility: hidden;
  }

  @media (prefers-reduced-motion: reduce) {
    html[data-ambient-drift="true"] .ambient-mesh-node-1,
    html[data-ambient-drift="true"] .ambient-mesh-node-2 {
      animation: none !important;
    }
  }

  .obsidian-inset,
  .liquid-inset {
    background-color: var(--glass-inset-bg, rgba(20, 30, 48, 0.40)) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.10)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.18)) !important;
    border-radius: 14px !important;
  }

  .obsidian-inset-neutral,
  .liquid-row {
    background-color: var(--glass-row-bg, rgba(14, 22, 38, 0.32)) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.07)) !important;
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
     Radial Dial Optical Glass Surface & Zero-Heat Touch Dragging
     ------------------------------------------------------------- */
  .zero-dial-surface {
    background-color: rgba(12, 18, 30, 0.86) !important;
    background-image:
      radial-gradient(
        circle at 30% 20%,
        rgba(255, 255, 255, 0.10) 0%,
        rgba(255, 255, 255, 0.02) 45%,
        transparent 75%
      ) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.26)) !important;
    border-radius: 9999px !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.18), 0 14px 32px -8px rgba(0, 0, 0, 0.65) !important;
    contain: layout style paint;
    touch-action: none !important;
  }

  /* Instant 0ms Tracking on Touch Drag */
  .zero-dial-surface[data-dial-dragging="true"] .zero-dial-knob-layer,
  .zero-dial-surface[data-dial-dragging="true"] .zero-dial-arc {
    transition: none !important;
  }

  /* -------------------------------------------------------------
     Floating Frosted Dock Navigation (Lightweight 8px Blur Only Where Content Scrolls)
     ------------------------------------------------------------- */
  .liquid-dock,
  .zero-bottom-nav,
  nav[data-bottom-nav="true"],
  nav[data-frosted-chrome="true"] {
    background-color: rgba(10, 16, 28, 0.78) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.26)) !important;
    border-radius: 2rem !important;
    backdrop-filter: blur(8px) saturate(130%) !important;
    -webkit-backdrop-filter: blur(8px) saturate(130%) !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.20), 0 12px 32px -4px rgba(0, 0, 0, 0.65) !important;
  }

  /* -------------------------------------------------------------
     Dynamic Modal & Bottom-Sheet Optical Depth Hierarchy
     ------------------------------------------------------------- */
  .modal-glass,
  [data-modal-glass="true"],
  .zero-modal-card {
    background-color: rgba(11, 17, 30, 0.94) !important;
    background-image: linear-gradient(155deg, rgba(255, 255, 255, 0.07) 0%, transparent 45%) !important;
    backdrop-filter: blur(8px) saturate(125%) !important;
    -webkit-backdrop-filter: blur(8px) saturate(125%) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.14)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.30)) !important;
  }

  /* -------------------------------------------------------------
     GPU Battery & Thermal Safeguard (Zero Shader Pass Architecture)
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
    background-color: rgba(14, 20, 32, 0.94) !important;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.75) !important;
  }

  html[data-gpu-safeguard="true"] .ambient-mesh-node-1,
  html[data-gpu-safeguard="true"] .ambient-mesh-node-2 {
    animation-play-state: paused !important;
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
