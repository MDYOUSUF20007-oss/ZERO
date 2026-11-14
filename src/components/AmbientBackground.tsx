import React from 'react';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

/**
 * Living Ambient Background Orbs (Dynamically Tinted by Theme Accent!)
 * - Fluent Glass: Rich and diffused multi-orb ambient refraction
 * - Classic UI: Subtle top ambient glow
 * - Material You & Bespoke Minimalist: Hidden completely for true flat tonal / pure AMOLED canvas
 */
export const AmbientBackground: React.FC = () => {
  const { isMaterialYou, isBespoke, isFluentGlass, isClassic } = useInterfaceStyle();

  // In Material You and Minimalist engines, ambient glow is completely removed
  if (isMaterialYou || isBespoke) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
    >
      {/* Top-left Soft Ambient Glow Orb */}
      <div
        className="liquid-ambient-orb-primary absolute -top-24 -left-20 w-[340px] h-[340px] sm:w-[460px] sm:h-[460px] rounded-full blur-3xl pointer-events-none"
        style={{
          background: 'var(--accent-soft, rgba(168, 85, 247, 0.16))',
          opacity: isFluentGlass ? 0.85 : isClassic ? 0.35 : 0.45,
        }}
      />

      {/* Mid-right Secondary Refractive Tint Orb (Fluent Glass) */}
      {isFluentGlass && (
        <div
          className="liquid-ambient-orb-secondary absolute top-[30%] -right-24 w-[360px] h-[360px] sm:w-[480px] sm:h-[480px] rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'var(--accent-soft, rgba(56, 189, 248, 0.16))',
            opacity: 0.65,
          }}
        />
      )}

      {/* Bottom Floating Specular Orb (Fluent Glass) */}
      {isFluentGlass && (
        <div
          className="liquid-ambient-orb-primary absolute -bottom-28 left-[15%] w-[320px] h-[320px] sm:w-[420px] sm:h-[420px] rounded-full blur-3xl pointer-events-none"
          style={{
            background: 'var(--accent-soft, rgba(56, 189, 248, 0.14))',
            opacity: 0.5,
          }}
        />
      )}
    </div>
  );
};
