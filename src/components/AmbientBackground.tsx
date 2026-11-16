import React, { useEffect, useState, useRef } from 'react';

/**
 * Living Ambient Background Mesh (Fluent Glass Core)
 * Ultra-high-performance chromatic fluid mesh with sub-surface organic color shifting.
 * Upgraded Features:
 * - 360° Non-reversing closed-loop Lissajous compound orbits
 * - Dynamic liquid blob morphology (asymmetric border-radius warping)
 * - Optical chromatic fusion via mix-blend-mode: screen
 * - Micro-mesh fractal-noise dither overlay eliminating OLED banding
 * - Gyroscopic ambient tilt parallax (±12px smooth spring interpolation)
 * - 0% battery draw on screen-off / app background via visibilitychange
 */
export const AmbientBackground: React.FC = () => {
  const [isPaused, setIsPaused] = useState(false);
  const [tiltOffset, setTiltOffset] = useState({ x: 0, y: 0 });
  const animFrameRef = useRef<number | null>(null);

  // Auto-pause animations when app/screen is in background to preserve battery
  useEffect(() => {
    const handleVisibility = () => {
      setIsPaused(document.hidden);
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);

  // Subtle 3D gyroscopic tilt parallax beneath frosted acrylic cards
  useEffect(() => {
    if (typeof window === 'undefined') return;

    let targetX = 0;
    let targetY = 0;
    let currentX = 0;
    let currentY = 0;
    let isRunning = true;

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return;
      // Clamp tilt to ±12px max deflection for subtle, non-distracting depth
      targetX = Math.max(-12, Math.min(12, e.gamma * 0.35));
      targetY = Math.max(-12, Math.min(12, (e.beta - 45) * 0.35));
    };

    const updateTilt = () => {
      if (!isRunning) return;
      // Smooth spring damping interpolation (lerp 0.08)
      currentX += (targetX - currentX) * 0.08;
      currentY += (targetY - currentY) * 0.08;

      if (Math.abs(targetX - currentX) > 0.05 || Math.abs(targetY - currentY) > 0.05) {
        setTiltOffset({
          x: Math.round(currentX * 10) / 10,
          y: Math.round(currentY * 10) / 10,
        });
      }
      animFrameRef.current = requestAnimationFrame(updateTilt);
    };

    window.addEventListener('deviceorientation', handleOrientation, { passive: true });
    animFrameRef.current = requestAnimationFrame(updateTilt);

    return () => {
      isRunning = false;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('deviceorientation', handleOrientation);
    };
  }, []);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden bg-black zero-ambient-canvas"
      style={{
        contain: 'strict',
        transform: `translate3d(${tiltOffset.x}px, ${tiltOffset.y}px, 0)`,
        transition: 'transform 0.15s ease-out',
      }}
    >
      {/* Node 1: Primary Celestial Anchor (Top Left - Z-0 Deep Flow) */}
      <div
        className="ambient-mesh-node-1 absolute -top-40 -left-36 w-[540px] h-[540px] sm:w-[720px] sm:h-[720px] pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 45% 45%, var(--accent-primary) 0%, var(--accent-soft) 28%, var(--liquid-accent-tint) 55%, transparent 72%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.95)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
          animationPlayState: isPaused ? 'paused' : undefined,
        }}
      />

      {/* Node 2: Chromatic Shift Companion (Mid Right - Z-1 Surface Glow) */}
      <div
        className="ambient-mesh-node-2 absolute top-[20%] -right-44 w-[520px] h-[520px] sm:w-[660px] sm:h-[660px] pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 50% 50%, var(--accent-shift-1, var(--accent-secondary)) 0%, var(--liquid-accent-soft-glow) 34%, var(--accent-soft) 56%, transparent 70%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.88)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
          animationPlayState: isPaused ? 'paused' : undefined,
        }}
      />

      {/* Node 3: Deep Resonant Violet / Teal Anchor (Bottom Center-Left - Z-0 Deep Flow) */}
      <div
        className="ambient-mesh-node-3 absolute -bottom-48 left-[8%] w-[500px] h-[500px] sm:w-[640px] sm:h-[640px] pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 48% 52%, var(--accent-shift-2, var(--accent-primary)) 0%, var(--accent-shift-1, var(--accent-secondary)) 35%, transparent 68%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.78)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
          animationPlayState: isPaused ? 'paused' : undefined,
        }}
      />

      {/* Node 4: Sub-surface Refractive Shimmer (Mid Left Floating - Z-1 Agile Shimmer) */}
      <div
        className="ambient-mesh-node-4 absolute top-[50%] -left-40 w-[460px] h-[460px] sm:w-[580px] sm:h-[580px] pointer-events-none transition-opacity duration-300"
        style={{
          background:
            'radial-gradient(circle at 52% 48%, var(--accent-shift-3, var(--liquid-accent-tint)) 0%, var(--liquid-accent-soft-glow) 30%, transparent 66%)',
          opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.68)',
          transform: 'scale(var(--ambient-glow-scale, 1)) translate3d(0, 0, 0)',
          animationPlayState: isPaused ? 'paused' : undefined,
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
