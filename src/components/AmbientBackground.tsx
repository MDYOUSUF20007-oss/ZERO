import React, { memo } from 'react';

/**
 * Ambient Background Mesh (Zero-Heat Optical Glass Core)
 * Optimized 2-corner radial glow layout (Upper Left & Lower Right).
 * Static by default for 0% idle GPU heat; optional drift animation controlled
 * via html[data-ambient-drift="true"].
 * Full-screen SVG feTurbulence + mix-blend-overlay removed to eliminate per-frame GPU bandwidth drain.
 */
export const AmbientBackground: React.FC = memo(() => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
      style={{ contain: 'strict' }}
    >
      {/* Node 1: Celestial Anchor (Upper Left Corner) */}
      <div
        className="ambient-mesh-node-1 absolute -top-28 -left-24 w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, var(--accent-primary) 0%, var(--accent-soft) 32%, transparent 70%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.90)',
        }}
      />

      {/* Node 2: Ambient Companion (Lower Right Corner) */}
      <div
        className="ambient-mesh-node-2 absolute -bottom-28 -right-24 w-[460px] h-[460px] sm:w-[580px] sm:h-[580px] rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-shift-1, var(--accent-secondary)) 0%, var(--liquid-accent-soft-glow) 30%, transparent 68%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.80)',
        }}
      />
    </div>
  );
});

AmbientBackground.displayName = 'AmbientBackground';
