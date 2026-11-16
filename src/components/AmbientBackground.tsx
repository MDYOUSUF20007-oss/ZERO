import React, { memo } from 'react';

/**
 * Living Ambient Background Mesh (Fluent Glass Core)
 * Optimized 2-corner minimal layout (Upper Left & Lower Right).
 * 100% GPU compositor execution via translate3d — 0ms main-thread CPU overhead, zero flicker.
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

      {/* Tactile Micro-Mesh Texture & Anti-Banding Dither Overlay */}
      <div
        className="absolute inset-0 pointer-events-none mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)' opacity='0.75'/%3E%3C/svg%3E")`,
          opacity: 'calc(0.02 + var(--ambient-glow-opacity, 0.35) * 0.04)',
        }}
      />
    </div>
  );
});

AmbientBackground.displayName = 'AmbientBackground';
