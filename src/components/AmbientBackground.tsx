import React from 'react';

/**
 * Living Ambient Background Mesh (Fluent Glass Core)
 * Ultra-high-performance chromatic fluid mesh with sub-surface organic color shifting.
 * Features an authentic micro-mesh dither texture that eliminates OLED gradient banding.
 * 100% GPU compositor execution via translate3d / scale — 0ms main-thread CPU overhead.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
      style={{ contain: 'strict' }}
    >
      {/* Node 1: Primary Celestial Anchor (Top Left) */}
      <div
        className="ambient-mesh-node-1 absolute -top-36 -left-32 w-[520px] h-[520px] sm:w-[680px] sm:h-[680px] rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, var(--accent-primary) 0%, var(--accent-soft) 32%, transparent 70%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.95)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />

      {/* Node 2: Chromatic Shift Companion (Mid Right) */}
      <div
        className="ambient-mesh-node-2 absolute top-[22%] -right-40 w-[500px] h-[500px] sm:w-[640px] sm:h-[640px] rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-shift-1, var(--accent-secondary)) 0%, var(--liquid-accent-soft-glow) 34%, transparent 68%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.85)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />

      {/* Node 3: Deep Resonant Violet / Teal Anchor (Bottom Center-Left) */}
      <div
        className="ambient-mesh-node-3 absolute -bottom-44 left-[10%] w-[480px] h-[480px] sm:w-[620px] sm:h-[620px] rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-shift-2, var(--accent-primary)) 0%, var(--accent-soft) 30%, transparent 66%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.75)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />

      {/* Node 4: Sub-surface Refractive Shimmer (Mid Left Floating) */}
      <div
        className="ambient-mesh-node-4 absolute top-[52%] -left-36 w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-shift-3, var(--liquid-accent-tint)) 0%, var(--liquid-accent-soft-glow) 28%, transparent 65%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.65)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
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
};
