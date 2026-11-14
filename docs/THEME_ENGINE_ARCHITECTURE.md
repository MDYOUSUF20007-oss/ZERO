# ZERO Theme Engine Architecture & Clean-Slate Integration Map

> **Core Directive**: When any new theme is added in the future, it must **never overlap** with existing themes. A new theme must make the app look **fundamentally and unmistakably different**. If switching between visual engines requires a clean app restart (`window.location.reload()`), execute it to guarantee zero memory or CSS cascade residue.

---

## 1. Why Did Themes Overlap in the Past? (Root Cause Post-Mortem)

Historically, themes in the app overlapped due to three critical architectural flaws:
1. **Unscoped CSS Pollution**: Global stylesheets injected contradictory `body`, `.font-mono !important`, and `.uppercase !important` rules into `document.head` simultaneously.
2. **Dirty DOM Residue**: Switching themes at runtime mutated some attributes on `document.documentElement` while leaving behind inline styles, stale CSS custom properties on `root.style`, and residual Tailwind classes on components.
3. **Component-Level Conditional Hell**: Components were filled with 4-way nested ternaries (`isBespoke ? ... : isMaterialYou ? ... : isFluentGlass ? ... : ...`). Any missed branch or default fallback bled previous theme styling on top of the active theme.

---

## 2. The Zero-Overlap Architecture Invariants

Every future theme implementation must adhere to these non-negotiable rules:

### Rule 1: The Single Active Engine Invariant
At any millisecond of runtime, **exactly ONE** theme engine stylesheet tag (`#zero-active-theme-engine`) may exist in `document.head`. The previous engine's CSS must be completely unmounted and replaced.

### Rule 2: Clean-Slate Teardown & Restart Protocol
When switching to a fundamentally different theme engine, call `restartWithTheme(newThemeId)` from `InterfaceStyleContext`. This:
1. Persists the new theme ID to `localStorage.setItem('zero_isolated_theme_engine_v5', themeId)`.
2. Strips all inline styles from `document.documentElement` and `document.body`.
3. Purges all residual `data-theme`, `data-engine`, and legacy class lists.
4. Triggers `window.location.reload()` so that React, Tailwind CSS, hardware layers, and the DOM mount completely fresh with 0% chance of cross-engine style bleeding.

### Rule 3: Strict Scope Encapsulation
Every single CSS rule in an engine definition file (`src/themes/engine-<name>.ts`) **MUST** be strictly scoped under:
```css
html[data-theme="<name>"],
html[data-engine="<name>"] {
  /* Engine-specific CSS variables and typography */
}
```
**Never** define bare un-scoped tag selectors (`body { ... }`) or bare global utility classes (`.font-mono { ... }`) outside the theme attribute selector.

---

## 3. The 6 Mandatory Visual Transformation Dimensions

A new theme is **not** a simple color palette change. To make the app look genuinely and unmistakably different, every new theme must redefine all **6 visual dimensions**:

| Dimension | Fluent Glass (Current Default) | Bespoke / E-Ink Example | Cyberpunk / Neon Example |
| :--- | :--- | :--- | :--- |
| **1. Surface & Depth** | Frosted Acrylic (`rgba(16,24,38,0.65)`), 28px blur | Pure AMOLED `#000000`, 0px blur, flat surfaces | Heavy dark matte, carbon fiber scanlines |
| **2. Corner Radii** | Squircles (`20px` card, `12px` pill) | Sharp mechanical (`4px` or `0px`) | Hexagonal chamfers or sharp angled corners |
| **3. Typography** | Proportional Segoe UI Variable, tabular metrics | Tabular Monospace (JetBrains Mono / Inter) | Sci-Fi / High-contrast display headers |
| **4. Borders & Specular** | Specular top edge (`border-t: rgba(255,255,255,0.28)`) | Crisp hairline (`1px solid #262626`), no highlights | Dual-tone neon stroke (`1px solid var(--accent)`) |
| **5. Lighting & Orbs** | Sub-surface drifting colored ambient orbs | Pitch void (all ambient glow orbs hidden) | High-contrast laser grid top lighting |
| **6. Motion & Spring** | Fluid spring (`cubic-bezier(0.16, 1, 0.3, 1)`) | Instant mechanical snaps (`0ms` / `duration-75`) | Staccato kinetic transforms |

---

## 4. Step-by-Step Blueprint: Adding a New Theme

When adding a new theme (e.g. `cyberpunk`), follow these exact steps in order:

### Step 1: Register the Theme ID in `src/themes/types.ts`
```typescript
// src/themes/types.ts
export type CanonicalThemeId = 'fluent' | 'cyberpunk';
export type AccentColorId = 'purple' | 'cyan';
```

### Step 2: Create the Isolated Engine File `src/themes/engine-<name>.ts`
Create `src/themes/engine-cyberpunk.ts` conforming strictly to `ThemeEngineDefinition`:

```typescript
// src/themes/engine-cyberpunk.ts
import type { ThemeEngineDefinition } from './types';

export const cyberpunkEngine: ThemeEngineDefinition = {
  id: 'cyberpunk',
  name: 'Cyberpunk Neon',
  badge: 'NEON',
  description: 'High-contrast neon scanlines, sharp chamfered geometry, and electric wireframes.',
  swatchBg: '#050508',
  swatchSurface: '#0d0d18',
  swatchAccent: '#00f0ff',
  css: `
    html[data-theme="cyberpunk"],
    html[data-engine="cyberpunk"] {
      --bg-primary: #050508;
      --bg-surface: #0d0d18;
      --bg-surface-elevated: #161626;
      --text-primary: #ffffff;
      --text-secondary: #94a3b8;
      --text-muted: #64748b;
      --border-subtle: rgba(0, 240, 255, 0.20);
      --border-strong: rgba(0, 240, 255, 0.50);
      --radius-card: 4px;
      --radius-btn: 4px;
      --radius-pill: 6px;
      --surface-blur: 0px;
      --surface-shadow: 0 0 16px rgba(0, 240, 255, 0.15);
      font-family: 'JetBrains Mono', monospace !important;
    }

    /* Dynamic 2-Color Accent Overrides */
    html[data-theme="cyberpunk"][data-accent="purple"] {
      --accent-primary: #d946ef;
      --accent-soft: rgba(217, 70, 239, 0.18);
      --accent-border: rgba(217, 70, 239, 0.50);
    }
    html[data-theme="cyberpunk"][data-accent="cyan"] {
      --accent-primary: #00f0ff;
      --accent-soft: rgba(0, 240, 255, 0.18);
      --accent-border: rgba(0, 240, 255, 0.50);
    }
  `,
};
```

### Step 3: Register in `src/themes/index.ts`
```typescript
// src/themes/index.ts
import { fluentEngine } from './engine-fluent';
import { cyberpunkEngine } from './engine-cyberpunk';

export const THEME_ENGINES: Record<CanonicalThemeId, ThemeEngineDefinition> = {
  fluent: fluentEngine,
  cyberpunk: cyberpunkEngine,
};

export const AVAILABLE_THEMES: readonly ThemeEngineDefinition[] = [
  fluentEngine,
  cyberpunkEngine,
];

export function normalizeThemeId(id?: string | null): CanonicalThemeId {
  if (id === 'cyberpunk') return 'cyberpunk';
  return 'fluent';
}
```

### Step 4: Bind Components to CSS Variables (NEVER Hardcode Ternaries)
**DO NOT** write component code like this:
```tsx
// ❌ WRONG: Hardcoded conditional branches that overlap and leak styles
<div className={isCyberpunk ? "rounded-none bg-[#050508] border-cyan-400" : "liquid-glass rounded-2xl"}>
```

**DO** bind components cleanly to structural tokens:
```tsx
// ✅ CORRECT: Clean tokenized binding that transforms automatically
<div 
  className="theme-card transition-all"
  style={{
    borderRadius: 'var(--radius-card)',
    backgroundColor: 'var(--bg-surface)',
    borderColor: 'var(--border-subtle)',
    boxShadow: 'var(--surface-shadow)',
  }}
>
```

### Step 5: Execute Clean Restart on Engine Switch
In the theme settings UI (`src/components/SchedulesDonateView.tsx`), invoke `restartWithTheme`:
```tsx
const { restartWithTheme, theme: activeTheme } = useInterfaceStyle();

<button
  type="button"
  onClick={() => restartWithTheme('cyberpunk')}
  className="p-3 rounded-xl border"
>
  Switch to Cyberpunk Neon (Clean Restart)
</button>
```

---

## 5. Verification Checklist

Before committing any new theme:
1. **Compilation Check**:
   ```bash
   npx tsc -b
   ```
   *Must exit with 0 errors (`noUnusedLocals: true` enforced).*
2. **Anti-Leakage Audit**:
   ```bash
   git grep "is[A-Z]" src/components/LockDialView.tsx
   ```
   *Confirm no component-level hardcoded branching leaks residual styles.*
3. **Specification & Math Tests**:
   ```bash
   npm test -- --run
   ```
   *All 22 anti-cheat and spec tests must pass 100%.*
4. **Vite Production Build**:
   ```bash
   npm run build
   ```
   *Must build cleanly without warnings or bundle errors.*
5. **Native Android Sync**:
   ```bash
   npx cap sync
   ```
   *Synchronizes all compiled public assets to `android/`.*
