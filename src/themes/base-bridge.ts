export const BASE_ENGINE_BRIDGE_CSS = `
  html, body, #root {
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    background-image: var(--app-backdrop-gradient, none) !important;
    background-attachment: fixed !important;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

  /* -------------------------------------------------------------
     Dynamic 2-Color Accent Palette Overrides: [data-accent="..."]
     ------------------------------------------------------------- */
  /* Purple Accent */
  [data-accent="purple"][data-engine="material"],
  html[data-accent="purple"][data-theme="material"] {
    --accent-primary: #d0bcff !important;
    --accent-secondary: #ccc2dc !important;
    --accent-soft: rgba(208, 188, 255, 0.18) !important;
    --accent-border: rgba(208, 188, 255, 0.45) !important;
    --text-on-accent: #381e72 !important;
    --zero-accent: #d0bcff !important;
    --zero-dial-stroke: #d0bcff !important;
    --accent-hex: #d0bcff !important;
    --accent-rgb: 208, 188, 255 !important;
  }
  [data-accent="purple"]:not([data-engine="material"]),
  html[data-accent="purple"]:not([data-theme="material"]) {
    --accent-primary: #a855f7 !important;
    --accent-secondary: #c084fc !important;
    --accent-soft: rgba(168, 85, 247, 0.16) !important;
    --accent-border: rgba(168, 85, 247, 0.50) !important;
    --text-on-accent: #ffffff !important;
    --zero-accent: #a855f7 !important;
    --zero-dial-stroke: #a855f7 !important;
    --accent-hex: #a855f7 !important;
    --accent-rgb: 168, 85, 247 !important;
  }

  /* Cyan Accent */
  [data-accent="cyan"][data-engine="material"],
  html[data-accent="cyan"][data-theme="material"] {
    --accent-primary: #67d4ff !important;
    --accent-secondary: #b4ebff !important;
    --accent-soft: rgba(103, 212, 255, 0.18) !important;
    --accent-border: rgba(103, 212, 255, 0.45) !important;
    --text-on-accent: #003547 !important;
    --zero-accent: #67d4ff !important;
    --zero-dial-stroke: #67d4ff !important;
    --accent-hex: #67d4ff !important;
    --accent-rgb: 103, 212, 255 !important;
  }
  [data-accent="cyan"]:not([data-engine="material"]),
  html[data-accent="cyan"]:not([data-theme="material"]) {
    --accent-primary: #00f0ff !important;
    --accent-secondary: #38bdf8 !important;
    --accent-soft: rgba(0, 240, 255, 0.16) !important;
    --accent-border: rgba(0, 240, 255, 0.50) !important;
    --text-on-accent: #042f2e !important;
    --zero-accent: #00f0ff !important;
    --zero-dial-stroke: #00f0ff !important;
    --accent-hex: #00f0ff !important;
    --accent-rgb: 0, 240, 255 !important;
  }

  /* -------------------------------------------------------------
     Engine Typography & Letter-case Scoping (Kill hardcoded uppercase & font-mono)
     ------------------------------------------------------------- */
  /* Material You: clean Roboto/Inter system font & natural casing */
  [data-engine="material"] body,
  [data-engine="material"] .font-mono,
  [data-engine="material"] .font-sans,
  html[data-theme="material"] body,
  html[data-theme="material"] .font-mono,
  html[data-theme="material"] .font-sans {
    font-family: 'Roboto', 'Inter', system-ui, -apple-system, sans-serif !important;
    letter-spacing: normal !important;
  }
  [data-engine="material"] .uppercase,
  html[data-theme="material"] .uppercase {
    text-transform: none !important;
    letter-spacing: normal !important;
  }

  /* Fluent Glass: Segoe UI Variable & clean modern casing */
  [data-engine="fluent"] body,
  [data-engine="fluent"] .font-mono,
  [data-engine="fluent"] .font-sans,
  html[data-theme="fluent"] body,
  html[data-theme="fluent"] .font-mono,
  html[data-theme="fluent"] .font-sans {
    font-family: 'Segoe UI Variable', 'Segoe UI', 'Inter', system-ui, sans-serif !important;
  }
  [data-engine="fluent"] .uppercase,
  html[data-theme="fluent"] .uppercase {
    text-transform: none !important;
    letter-spacing: 0.01em !important;
  }

  /* Bespoke Minimal: Inter system font & tabular numbers */
  [data-engine="minimal"] body,
  [data-engine="minimal"] .font-mono,
  [data-engine="minimal"] .font-sans,
  html[data-theme="minimal"] body,
  html[data-theme="minimal"] .font-mono,
  html[data-theme="minimal"] .font-sans {
    font-family: 'Inter', system-ui, sans-serif !important;
    font-variant-numeric: tabular-nums !important;
  }

  /* Classic UI: JetBrains Mono / monospace & uppercase tracking */
  [data-engine="classic"] body,
  [data-engine="classic"] .font-mono,
  html[data-theme="classic"] body,
  html[data-theme="classic"] .font-mono {
    font-family: 'JetBrains Mono', ui-monospace, SFMono-Regular, monospace !important;
  }

  /* -------------------------------------------------------------
     Semantic Utility Classes bound to active engine variables
     ------------------------------------------------------------- */
  .theme-bg-primary {
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
  }

  .theme-bg-secondary {
    background-color: var(--bg-secondary) !important;
    color: var(--text-primary) !important;
  }

  .theme-card {
    background-color: var(--bg-surface) !important;
    background-image: var(--surface-gradient) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-top-color: var(--border-specular) !important;
    border-radius: var(--radius-card) !important;
    box-shadow: var(--surface-shadow) !important;
    backdrop-filter: var(--surface-blur) !important;
    -webkit-backdrop-filter: var(--surface-blur) !important;
  }

  .theme-card-elevated {
    background-color: var(--bg-elevated) !important;
    background-image: var(--surface-gradient) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-strong) !important;
    border-top-color: var(--border-specular) !important;
    border-radius: var(--radius-card) !important;
    box-shadow: var(--surface-shadow) !important;
    backdrop-filter: var(--surface-blur) !important;
    -webkit-backdrop-filter: var(--surface-blur) !important;
  }

  .theme-modal {
    background-color: var(--bg-modal) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-strong) !important;
    border-radius: var(--radius-card) !important;
    box-shadow: var(--surface-shadow) !important;
    backdrop-filter: var(--surface-blur) !important;
    -webkit-backdrop-filter: var(--surface-blur) !important;
  }

  .theme-nav {
    background-color: var(--bg-nav) !important;
    border-color: var(--border-subtle) !important;
    backdrop-filter: var(--surface-blur) !important;
    -webkit-backdrop-filter: var(--surface-blur) !important;
  }

  .theme-input {
    background-color: var(--bg-input) !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-btn) !important;
  }

  .theme-input:focus {
    border-color: var(--accent-primary) !important;
    outline: none !important;
  }

  .theme-btn-primary {
    background-color: var(--accent-primary) !important;
    background-image: none !important;
    color: var(--text-on-accent) !important;
    border: 1px solid var(--accent-primary) !important;
    border-radius: var(--radius-btn) !important;
    font-weight: 600;
  }

  .theme-btn-secondary {
    background-color: var(--bg-surface) !important;
    background-image: none !important;
    color: var(--text-primary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-btn) !important;
  }

  .theme-pill {
    background-color: var(--bg-surface) !important;
    background-image: none !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-pill) !important;
  }

  .theme-pill-active {
    background-color: var(--accent-soft) !important;
    background-image: none !important;
    color: var(--accent-primary) !important;
    border: 1px solid var(--accent-border) !important;
    border-radius: var(--radius-pill) !important;
  }

  .theme-text-primary { color: var(--text-primary) !important; }
  .theme-text-secondary { color: var(--text-secondary) !important; }
  .theme-text-muted { color: var(--text-muted) !important; }
  .theme-text-accent { color: var(--accent-primary) !important; }
  .theme-border { border-color: var(--border-subtle) !important; }

  /* -------------------------------------------------------------
     Card Overhaul: Material, Fluent, Minimal, Classic Scopes
     ------------------------------------------------------------- */
  /* Material: Solid tonal containers (#211f26 / #2b2930), 24px radius, NO border, NO outer glow */
  [data-engine="material"] .obsidian-card,
  [data-engine="material"] .glass-card,
  [data-engine="material"] .liquid-card,
  [data-engine="material"] .liquid-glass,
  [data-engine="material"] .settings-card,
  [data-engine="material"] [data-frosted-card="true"] {
    background-color: var(--bg-surface, #211f26) !important;
    background-image: none !important;
    border: none !important;
    border-radius: 24px !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: var(--text-primary, #e6e0e9) !important;
  }
  [data-engine="material"] .obsidian-inset,
  [data-engine="material"] .liquid-inset {
    background-color: var(--bg-elevated, #2b2930) !important;
    border: none !important;
    border-radius: 16px !important;
    box-shadow: none !important;
  }
  [data-engine="material"] .obsidian-inset-neutral,
  [data-engine="material"] .liquid-row {
    background-color: var(--bg-secondary, #1d1b20) !important;
    border: none !important;
    border-radius: 16px !important;
  }

  /* Fluent Glass: Translucent frosted acrylic with specular top rim & highlight */
  [data-engine="fluent"] .obsidian-card,
  [data-engine="fluent"] .glass-card,
  [data-engine="fluent"] .liquid-card,
  [data-engine="fluent"] .liquid-glass,
  [data-engine="fluent"] .settings-card,
  [data-engine="fluent"] [data-frosted-card="true"] {
    background-color: var(--bg-surface, rgba(22, 34, 56, 0.62)) !important;
    background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.0) 100%) !important;
    border: 1px solid rgba(255, 255, 255, 0.14) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.35) !important;
    border-radius: 18px !important;
    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.20) !important;
    backdrop-filter: blur(24px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(180%) !important;
    color: var(--text-primary, #f0f9ff) !important;
  }
  [data-engine="fluent"] .obsidian-inset,
  [data-engine="fluent"] .liquid-inset {
    background-color: rgba(28, 42, 68, 0.78) !important;
    border: 1px solid rgba(186, 230, 253, 0.22) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.28) !important;
    border-radius: 14px !important;
    backdrop-filter: blur(16px) !important;
  }
  [data-engine="fluent"] .obsidian-inset-neutral,
  [data-engine="fluent"] .liquid-row {
    background-color: rgba(15, 23, 42, 0.60) !important;
    border: 1px solid rgba(186, 230, 253, 0.12) !important;
    border-radius: 14px !important;
  }

  /* Minimal: Pure #000000 canvas & cards, sharp 6px corners, 1px solid #262626 wireframe borders */
  [data-engine="minimal"] .obsidian-card,
  [data-engine="minimal"] .glass-card,
  [data-engine="minimal"] .liquid-card,
  [data-engine="minimal"] .liquid-glass,
  [data-engine="minimal"] .settings-card,
  [data-engine="minimal"] [data-frosted-card="true"] {
    background-color: #000000 !important;
    background-image: none !important;
    border: 1px solid #262626 !important;
    border-radius: 6px !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    color: #f5f5f5 !important;
  }
  [data-engine="minimal"] .obsidian-inset,
  [data-engine="minimal"] .liquid-inset {
    background-color: #121212 !important;
    border: 1px solid #2e2e2e !important;
    border-radius: 6px !important;
  }
  [data-engine="minimal"] .obsidian-inset-neutral,
  [data-engine="minimal"] .liquid-row {
    background-color: #171717 !important;
    border: 1px solid #2e2e2e !important;
    border-radius: 6px !important;
  }

  /* Classic UI: Deep obsidian #0c0c14 cards with glowing accent border */
  [data-engine="classic"] .obsidian-card,
  [data-engine="classic"] .glass-card,
  [data-engine="classic"] .liquid-card,
  [data-engine="classic"] .liquid-glass,
  [data-engine="classic"] .settings-card,
  [data-engine="classic"] [data-frosted-card="true"] {
    background-color: #0c0c14 !important;
    background-image: linear-gradient(180deg, rgba(26, 26, 34, 0.96) 0%, rgba(12, 12, 18, 0.99) 100%) !important;
    border: 1px solid var(--accent-border, #475569) !important;
    border-radius: 16px !important;
    box-shadow: 0 0 20px -4px var(--accent-soft, rgba(99, 102, 241, 0.22)), inset 0 1px 0 0 rgba(255, 255, 255, 0.12) !important;
    color: #f8fafc !important;
  }
  [data-engine="classic"] .obsidian-inset,
  [data-engine="classic"] .liquid-inset {
    background-color: rgba(15, 23, 42, 0.90) !important;
    border: 1px solid var(--accent-border, rgba(99, 102, 241, 0.40)) !important;
    border-radius: 12px !important;
  }
  [data-engine="classic"] .obsidian-inset-neutral,
  [data-engine="classic"] .liquid-row {
    background-color: rgba(15, 23, 42, 0.60) !important;
    border: 1px solid rgba(255, 255, 255, 0.08) !important;
    border-radius: 12px !important;
  }

  /* -------------------------------------------------------------
     Pill & Button States Across Engines
     ------------------------------------------------------------- */
  /* Material: FilterChips (8px radius) & Stadium Pills (9999px) */
  [data-engine="material"] .obsidian-pill-active,
  [data-engine="material"] .liquid-pill-active,
  [data-engine="material"] .action-pill,
  [data-engine="material"] .theme-pill-active {
    background-color: var(--accent-soft) !important;
    background-image: none !important;
    color: var(--accent-primary) !important;
    border: 1px solid var(--accent-border) !important;
    border-radius: 9999px !important;
    box-shadow: none !important;
  }
  [data-engine="material"] .obsidian-pill-inactive,
  [data-engine="material"] .liquid-pill-inactive,
  [data-engine="material"] .action-pill-inactive,
  [data-engine="material"] .theme-pill {
    background-color: #2b2930 !important;
    background-image: none !important;
    color: #cac4d0 !important;
    border: 1px solid #49454f !important;
    border-radius: 9999px !important;
    box-shadow: none !important;
  }

  /* Minimal: Sharp 6px corners */
  [data-engine="minimal"] .obsidian-pill-active,
  [data-engine="minimal"] .liquid-pill-active,
  [data-engine="minimal"] .action-pill,
  [data-engine="minimal"] .theme-pill-active {
    background-color: var(--accent-primary, #ffffff) !important;
    color: var(--text-on-accent, #121212) !important;
    border: 1px solid var(--accent-primary, #ffffff) !important;
    border-radius: 6px !important;
    box-shadow: none !important;
  }
  [data-engine="minimal"] .obsidian-pill-inactive,
  [data-engine="minimal"] .liquid-pill-inactive,
  [data-engine="minimal"] .action-pill-inactive,
  [data-engine="minimal"] .theme-pill {
    background-color: #1a1a1a !important;
    color: #b5b5b5 !important;
    border: 1px solid #2e2e2e !important;
    border-radius: 6px !important;
    box-shadow: none !important;
  }

  /* Fluent: Tinted glass pills */
  [data-engine="fluent"] .obsidian-pill-active,
  [data-engine="fluent"] .liquid-pill-active,
  [data-engine="fluent"] .action-pill,
  [data-engine="fluent"] .theme-pill-active {
    background-color: var(--accent-soft, rgba(56, 189, 248, 0.20)) !important;
    color: var(--accent-primary, #38bdf8) !important;
    border: 1px solid var(--accent-border, rgba(56, 189, 248, 0.55)) !important;
    border-radius: 9999px !important;
    box-shadow: 0 4px 14px var(--accent-soft, rgba(56, 189, 248, 0.25)) !important;
    backdrop-filter: blur(12px) !important;
  }

  /* Classic: High-contrast badges */
  [data-engine="classic"] .obsidian-pill-active,
  [data-engine="classic"] .liquid-pill-active,
  [data-engine="classic"] .action-pill,
  [data-engine="classic"] .theme-pill-active {
    background: linear-gradient(135deg, var(--accent-primary) 0%, var(--accent-secondary) 100%) !important;
    color: var(--text-on-accent, #ffffff) !important;
    border: 1px solid var(--accent-primary) !important;
    border-radius: 9999px !important;
    box-shadow: 0 0 14px var(--accent-soft) !important;
  }

  /* -------------------------------------------------------------
     Bottom Navigation Bar Scoping Across Engines
     ------------------------------------------------------------- */
  /* Material: Flat #211f26 bar, NO top border, rounded pill active indicator */
  [data-engine="material"] .zero-bottom-nav,
  [data-engine="material"] nav[data-bottom-nav="true"],
  [data-engine="material"] nav[data-frosted-chrome="true"] {
    background-color: #211f26 !important;
    border-top: none !important;
    border: none !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }
  [data-engine="material"] nav[data-frosted-chrome="true"] button[aria-current="page"] {
    background-color: var(--accent-soft, rgba(208, 188, 255, 0.18)) !important;
    border-radius: 9999px !important;
  }

  /* Fluent: Frosted glass dock */
  [data-engine="fluent"] .zero-bottom-nav,
  [data-engine="fluent"] nav[data-bottom-nav="true"],
  [data-engine="fluent"] nav[data-frosted-chrome="true"] {
    background-color: rgba(8, 13, 24, 0.82) !important;
    border-top: 1px solid rgba(255, 255, 255, 0.20) !important;
    backdrop-filter: blur(28px) saturate(180%) !important;
    -webkit-backdrop-filter: blur(28px) saturate(180%) !important;
    box-shadow: 0 10px 30px -4px rgba(0, 0, 0, 0.5) !important;
  }

  /* Minimal: Pure #000000 bar with 1px solid #262626 top border */
  [data-engine="minimal"] .zero-bottom-nav,
  [data-engine="minimal"] nav[data-bottom-nav="true"],
  [data-engine="minimal"] nav[data-frosted-chrome="true"] {
    background-color: #000000 !important;
    border-top: 1px solid #262626 !important;
    box-shadow: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
  }

  /* Classic: Dark #050508 bar with glowing top border */
  [data-engine="classic"] .zero-bottom-nav,
  [data-engine="classic"] nav[data-bottom-nav="true"],
  [data-engine="classic"] nav[data-frosted-chrome="true"] {
    background-color: rgba(5, 5, 8, 0.96) !important;
    border-top: 1.5px solid var(--accent-border, rgba(99, 102, 241, 0.40)) !important;
    box-shadow: 0 0 20px -4px var(--accent-soft, rgba(99, 102, 241, 0.25)) !important;
  }

  /* -------------------------------------------------------------
     Ambient Background Controls
     ------------------------------------------------------------- */
  [data-engine="material"] .zero-ambient-canvas,
  [data-engine="material"] .liquid-ambient-orb-primary,
  [data-engine="material"] .liquid-ambient-orb-secondary,
  [data-engine="minimal"] .zero-ambient-canvas,
  [data-engine="minimal"] .liquid-ambient-orb-primary,
  [data-engine="minimal"] .liquid-ambient-orb-secondary {
    display: none !important;
  }
`;
