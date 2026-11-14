export const BASE_ENGINE_BRIDGE_CSS = `
  html, body, #root {
    background-color: var(--bg-primary) !important;
    color: var(--text-primary) !important;
    background-image: var(--app-backdrop-gradient, none) !important;
    background-attachment: fixed !important;
    transition: background-color 0.15s ease, color 0.15s ease;
  }

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

  /* Backwards compatibility bridge for existing components */
  .obsidian-card,
  .glass-card,
  .liquid-card,
  .liquid-glass,
  .settings-card,
  [data-frosted-card="true"] {
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

  .obsidian-pill-active,
  .liquid-pill-active,
  .action-pill {
    background-color: var(--accent-soft) !important;
    background-image: none !important;
    color: var(--accent-primary) !important;
    border: 1px solid var(--accent-border) !important;
    border-radius: var(--radius-pill) !important;
  }

  .obsidian-pill-inactive,
  .liquid-pill-inactive,
  .action-pill-inactive {
    background-color: var(--bg-surface) !important;
    background-image: none !important;
    color: var(--text-secondary) !important;
    border: 1px solid var(--border-subtle) !important;
    border-radius: var(--radius-pill) !important;
  }

  .zero-bottom-nav,
  .zero-top-scrim,
  nav[data-bottom-nav="true"],
  .zero-nav-dock {
    background-color: var(--bg-nav) !important;
    border-color: var(--border-subtle) !important;
    backdrop-filter: var(--surface-blur) !important;
    -webkit-backdrop-filter: var(--surface-blur) !important;
  }
`;
