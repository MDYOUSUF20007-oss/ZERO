import React, { memo } from 'react';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

/**
 * Ambient Background Mesh (Zero-Heat Optical Glass Core)
 * Optimized 2-corner radial glow layout (Upper Left & Lower Right).
 * When Aero UI is active, renders airy mist-blue sky with two soft sunlit cloud glows.
 */
export const AmbientBackground: React.FC = memo(() => {
  const { isAero } = useInterfaceStyle();

  if (isAero) {
    return (
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none overflow-hidden aero-canvas"
        style={{ contain: 'strict' }}
      >
        {/* Sunlit Cloud Glow 1 (Upper Left) */}
        <div
          className="absolute -top-16 -left-12 w-[440px] h-[440px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.88) 0%, rgba(255, 255, 255, 0.40) 42%, transparent 70%)',
            filter: 'blur(32px)',
          }}
        />
        {/* Sunlit Cloud Glow 2 (Upper Right) */}
        <div
          className="absolute -top-12 -right-16 w-[420px] h-[420px] rounded-full pointer-events-none"
          style={{
            background:
              'radial-gradient(circle at 60% 40%, rgba(255, 255, 255, 0.80) 0%, rgba(255, 255, 255, 0.35) 45%, transparent 70%)',
            filter: 'blur(36px)',
          }}
        />
      </div>
    );
  }

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
    </div>
  );
});

AmbientBackground.displayName = 'AmbientBackground';
