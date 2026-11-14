import React from 'react';

/**
 * Living Ambient Background Orbs (Dynamically Tinted by Theme Studio Color!)
 * Uses hardware-accelerated transforms & blurs so surfaces refract smoothly at 60/120fps.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black"
    >
      {/* Top-left Theme Studio Soft Glow Orb */}
      <div
        className="liquid-ambient-orb-primary -top-24 -left-20 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px]"
        style={{
          background: 'var(--liquid-accent-soft-glow)',
        }}
      />

      {/* Mid-right Secondary Refractive Tint Orb */}
      <div
        className="liquid-ambient-orb-secondary top-[30%] -right-24 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px]"
        style={{
          background: 'color-mix(in srgb, var(--liquid-accent-vibrant) 16%, rgba(255, 255, 255, 0.04))',
        }}
      />

      {/* Bottom Floating Specular Orb */}
      <div
        className="liquid-ambient-orb-primary -bottom-28 left-[15%] w-[320px] h-[320px] sm:w-[420px] sm:h-[420px]"
        style={{
          background: 'color-mix(in srgb, var(--liquid-accent-vibrant) 20%, transparent)',
          animationDelay: '-7s',
        }}
      />
    </div>
  );
};
