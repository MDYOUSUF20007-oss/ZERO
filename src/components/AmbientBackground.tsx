import React from 'react';

/**
 * Living Ambient Background Orbs (Fluent Glass Core)
 * Ultra-high-performance sub-surface celestial glow.
 * Uses hardware-accelerated CSS radial gradients with smooth natural falloff.
 * 0ms GPU Gaussian convolution overhead — maintains silky 60/120fps on mobile.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
      style={{ contain: 'strict' }}
    >
      {/* Top-left Celestial Glow Orb */}
      <div
        className="absolute -top-32 -left-28 w-[420px] h-[420px] sm:w-[540px] sm:h-[540px] rounded-full pointer-events-none transition-opacity duration-200"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, var(--accent-primary) 0%, var(--accent-soft) 30%, transparent 68%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.90)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />

      {/* Mid-right Secondary Refractive Tint Orb */}
      <div
        className="absolute top-[26%] -right-36 w-[440px] h-[440px] sm:w-[560px] sm:h-[560px] rounded-full pointer-events-none transition-opacity duration-200"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-secondary) 0%, var(--liquid-accent-tint) 35%, transparent 70%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.65)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />

      {/* Bottom Floating Specular Glow Orb */}
      <div
        className="absolute -bottom-40 left-[15%] w-[400px] h-[400px] sm:w-[500px] sm:h-[500px] rounded-full pointer-events-none transition-opacity duration-200"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-primary) 0%, var(--accent-soft) 28%, transparent 65%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.55)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
        }}
      />
    </div>
  );
};
