import React from 'react';

/**
 * Living Ambient Background Orbs (Fluent Glass Core)
 * Hardware-accelerated sub-surface living refraction layer.
 * Drifts smoothly on GPU compositor threads to refract color through glass cards.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
    >
      {/* Top-left Living Sub-Surface Glow Orb */}
      <div
        className="liquid-ambient-orb-primary absolute -top-28 -left-24 w-[360px] h-[360px] sm:w-[500px] sm:h-[500px] rounded-full blur-[80px] pointer-events-none will-change-transform"
        style={{
          background: 'var(--accent-soft, rgba(168, 85, 247, 0.22))',
          opacity: 0.85,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Mid-right Secondary Refractive Tint Orb */}
      <div
        className="liquid-ambient-orb-secondary absolute top-[28%] -right-28 w-[380px] h-[380px] sm:w-[520px] sm:h-[520px] rounded-full blur-[90px] pointer-events-none will-change-transform"
        style={{
          background: 'var(--accent-soft, rgba(56, 189, 248, 0.18))',
          opacity: 0.70,
          transform: 'translate3d(0, 0, 0)',
        }}
      />

      {/* Bottom-left Floating Specular Orb */}
      <div
        className="liquid-ambient-orb-primary absolute -bottom-32 left-[10%] w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-full blur-[85px] pointer-events-none will-change-transform"
        style={{
          background: 'var(--accent-soft, rgba(168, 85, 247, 0.16))',
          opacity: 0.60,
          transform: 'translate3d(0, 0, 0)',
        }}
      />
    </div>
  );
};
