import React from 'react';

/**
 * Ambient sub-surface light field behind Liquid Glass cards on a pitch-black AMOLED foundation.
 * Uses only GPU-composited transform/blur properties so scrolling over it refracts at 60/120fps.
 */
export const AmbientBackground: React.FC = () => {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black"
    >
      {/* Top-left Cyan orb */}
      <div
        className="liquid-orb-1 absolute -top-24 -left-20 w-[340px] h-[340px] sm:w-[420px] sm:h-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(0, 242, 254, 0.92) 0%, rgba(0, 242, 254, 0) 70%)',
          filter: 'blur(95px)',
          opacity: 0.22,
        }}
      />

      {/* Mid-right Deep Azure Indigo orb */}
      <div
        className="liquid-orb-2 absolute top-[34%] -right-24 w-[360px] h-[360px] sm:w-[440px] sm:h-[440px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(79, 172, 254, 0.95) 0%, rgba(79, 172, 254, 0) 70%)',
          filter: 'blur(95px)',
          opacity: 0.22,
        }}
      />

      {/* Bottom Violet orb */}
      <div
        className="liquid-orb-3 absolute -bottom-28 left-[12%] w-[360px] h-[360px] sm:w-[440px] sm:h-[440px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(127, 0, 255, 0.9) 0%, rgba(127, 0, 255, 0) 70%)',
          filter: 'blur(95px)',
          opacity: 0.22,
        }}
      />
    </div>
  );
};
