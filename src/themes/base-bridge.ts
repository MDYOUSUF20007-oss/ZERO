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
    background-color: var(--glass-surface-bg, var(--bg-surface, rgba(16, 26, 44, 0.45))) !important;
    background-image: linear-gradient(135deg, rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.10)) 0%, rgba(255, 255, 255, 0.012) 35%, rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.025)) 100%) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.09)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.25)) !important;
    border-left: 1px solid rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.18)) !important;
    border-radius: 20px !important;
    box-shadow: inset 0 1px 1px 0 rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.24)), 0 14px 34px -4px rgba(0, 0, 0, 0.65), 0 0 18px -4px var(--liquid-accent-soft-glow) !important;
    backdrop-filter: var(--surface-blur, blur(14px) saturate(160%)) !important;
    -webkit-backdrop-filter: var(--surface-blur, blur(14px) saturate(160%)) !important;
    text-shadow: var(--glass-text-shadow, none) !important;
    color: var(--text-primary, #f0f9ff) !important;
  }

  /* -------------------------------------------------------------
     Living Ambient Fluid Mesh Keyframes (Organic Lissajous & Morphology)
     100% GPU Composited with Liquid Blob Morphing & Closed-Loop Orbits
     ------------------------------------------------------------- */
  @keyframes ambientMeshOrbitA {
    0% {
      transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
      border-radius: 54% 46% 42% 58% / 58% 44% 56% 42%;
    }
    25% {
      transform: translate3d(52px, 38px, 0) rotate(90deg) scale(1.08);
      border-radius: 46% 54% 63% 37% / 41% 59% 41% 59%;
    }
    50% {
      transform: translate3d(-32px, 64px, 0) rotate(180deg) scale(0.95);
      border-radius: 62% 38% 49% 51% / 52% 38% 62% 48%;
    }
    75% {
      transform: translate3d(-48px, 18px, 0) rotate(270deg) scale(1.05);
      border-radius: 44% 56% 38% 62% / 64% 48% 52% 36%;
    }
    100% {
      transform: translate3d(0, 0, 0) rotate(360deg) scale(1);
      border-radius: 54% 46% 42% 58% / 58% 44% 56% 42%;
    }
  }

  @keyframes ambientMeshOrbitB {
    0% {
      transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
      border-radius: 48% 52% 58% 42% / 45% 55% 45% 55%;
    }
    25% {
      transform: translate3d(-58px, -42px, 0) rotate(-90deg) scale(0.92);
      border-radius: 63% 37% 41% 59% / 58% 42% 58% 42%;
    }
    50% {
      transform: translate3d(44px, -62px, 0) rotate(-180deg) scale(1.09);
      border-radius: 42% 58% 65% 35% / 40% 60% 40% 60%;
    }
    75% {
      transform: translate3d(28px, 32px, 0) rotate(-270deg) scale(0.98);
      border-radius: 56% 44% 48% 52% / 62% 38% 62% 38%;
    }
    100% {
      transform: translate3d(0, 0, 0) rotate(-360deg) scale(1);
      border-radius: 48% 52% 58% 42% / 45% 55% 45% 55%;
    }
  }

  @keyframes ambientMeshOrbitC {
    0% {
      transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
      border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
    }
    33% {
      transform: translate3d(45px, -52px, 0) rotate(120deg) scale(1.07);
      border-radius: 45% 55% 60% 40% / 42% 58% 42% 58%;
    }
    66% {
      transform: translate3d(-42px, -28px, 0) rotate(240deg) scale(0.94);
      border-radius: 58% 42% 40% 60% / 60% 40% 60% 40%;
    }
    100% {
      transform: translate3d(0, 0, 0) rotate(360deg) scale(1);
      border-radius: 60% 40% 45% 55% / 55% 45% 55% 45%;
    }
  }

  @keyframes ambientMeshOrbitD {
    0% {
      transform: translate3d(0, 0, 0) rotate(0deg) scale(1);
      border-radius: 50% 50% 60% 40% / 48% 52% 48% 52%;
    }
    33% {
      transform: translate3d(-46px, 52px, 0) rotate(-120deg) scale(1.10);
      border-radius: 65% 35% 42% 58% / 58% 42% 58% 42%;
    }
    66% {
      transform: translate3d(36px, 32px, 0) rotate(-240deg) scale(0.93);
      border-radius: 40% 60% 55% 45% / 45% 55% 45% 55%;
    }
    100% {
      transform: translate3d(0, 0, 0) rotate(-360deg) scale(1);
      border-radius: 50% 50% 60% 40% / 48% 52% 48% 52%;
    }
  }

  /* Rhythmic 7.5-Second Respiration Luminescence Pulse */
  @keyframes ambientMeshBreathe {
    0%, 100% {
      filter: blur(28px) brightness(1);
    }
    50% {
      filter: blur(34px) brightness(1.12);
    }
  }

  .ambient-mesh-node-1 {
    animation: ambientMeshOrbitA 37s cubic-bezier(0.42, 0, 0.58, 1) infinite,
               ambientMeshBreathe 8s ease-in-out infinite;
    will-change: transform, border-radius;
    mix-blend-mode: screen;
  }
  .ambient-mesh-node-2 {
    animation: ambientMeshOrbitB 43s cubic-bezier(0.42, 0, 0.58, 1) infinite,
               ambientMeshBreathe 9s ease-in-out infinite 2s;
    will-change: transform, border-radius;
    mix-blend-mode: screen;
  }
  .ambient-mesh-node-3 {
    animation: ambientMeshOrbitC 31s cubic-bezier(0.42, 0, 0.58, 1) infinite,
               ambientMeshBreathe 7s ease-in-out infinite 1s;
    will-change: transform, border-radius;
    mix-blend-mode: screen;
  }
  .ambient-mesh-node-4 {
    animation: ambientMeshOrbitD 29s cubic-bezier(0.42, 0, 0.58, 1) infinite,
               ambientMeshBreathe 10s ease-in-out infinite 3s;
    will-change: transform, border-radius;
    mix-blend-mode: screen;
  }

  @media (prefers-reduced-motion: reduce) {
    .ambient-mesh-node-1,
    .ambient-mesh-node-2,
    .ambient-mesh-node-3,
    .ambient-mesh-node-4 {
      animation-duration: 160s !important;
      animation-play-state: paused !important;
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
     Radial Dial Glass Surface & Zero-Lag Touch Dragging
     ------------------------------------------------------------- */
  .zero-dial-surface {
    background-color: var(--glass-dial-bg, rgba(14, 20, 32, 0.40)) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.24)) !important;
    border-radius: 9999px !important;
    backdrop-filter: var(--surface-blur, blur(14px) saturate(160%)) !important;
    -webkit-backdrop-filter: var(--surface-blur, blur(14px) saturate(160%)) !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.20)), 0 16px 40px -8px rgba(0, 0, 0, 0.6) !important;
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
    background-color: var(--glass-dock-bg, rgba(10, 16, 28, 0.60)) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.10)) !important;
    border-top: 1px solid var(--border-specular, rgba(255, 255, 255, 0.26)) !important;
    border-radius: 2rem !important;
    backdrop-filter: var(--surface-blur, blur(16px) saturate(160%)) !important;
    -webkit-backdrop-filter: var(--surface-blur, blur(16px) saturate(160%)) !important;
    box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, calc(var(--glass-opacity, 0.50) * 0.22)), 0 16px 44px -4px rgba(0, 0, 0, 0.65) !important;
  }

  /* -------------------------------------------------------------
     Dynamic Modal & Bottom-Sheet Optical Depth Hierarchy
     ------------------------------------------------------------- */
  .modal-glass,
  [data-modal-glass="true"],
  .zero-modal-card {
    background-color: var(--glass-modal-bg, rgba(12, 18, 30, 0.88)) !important;
    backdrop-filter: var(--glass-modal-blur, blur(20px) saturate(180%)) !important;
    -webkit-backdrop-filter: var(--glass-modal-blur, blur(20px) saturate(180%)) !important;
    border: 1px solid var(--border-subtle, rgba(255, 255, 255, 0.12)) !important;
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
  html[data-gpu-safeguard="true"] .ambient-mesh-node-2,
  html[data-gpu-safeguard="true"] .ambient-mesh-node-3,
  html[data-gpu-safeguard="true"] .ambient-mesh-node-4 {
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
