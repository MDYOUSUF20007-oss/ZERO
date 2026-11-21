import React, { useState, useRef, useEffect, useCallback, useId } from 'react';
import { haptics } from '../utils/haptics';
import './EscapeTicketSystem.css';

export interface EscapeTicketDockButtonProps {
  ticketCount?: number;
  onOpen: () => void;
  accentColor?: string;
  className?: string;
  style?: React.CSSProperties;
  isAero?: boolean;
}

/**
 * Compact text-free notched ticket preview for the bottom dock.
 * Automatically hides when ticketCount <= 0.
 */
export const EscapeTicketDockButton: React.FC<EscapeTicketDockButtonProps> = ({
  ticketCount = 0,
  onOpen,
  accentColor,
  className = '',
  style,
  isAero = false,
}) => {
  const uid = useId().replace(/:/g, '');
  const bgGradId = `znDockBg_${uid}`;
  const specularGradId = `znDockSpecular_${uid}`;
  const clipId = `znDockClip_${uid}`;

  if (!ticketCount || ticketCount <= 0) return null;

  const primaryAccent = isAero ? '#111827' : (accentColor || 'var(--accent-hex, #7dd3fc)');

  return (
    <button
      type="button"
      className={`zn-dock-ticket-btn ${className}`}
      onClick={() => {
        haptics.tick(600);
        onOpen();
      }}
      aria-label={`Open Escape Ticket (${ticketCount} available)`}
      style={style}
    >
      <svg
        className="zn-dock-ticket-svg"
        viewBox="0 0 296 124"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id={bgGradId} x1="0" y1="0" x2="296" y2="124" gradientUnits="userSpaceOnUse">
            {isAero ? (
              <>
                <stop offset="0%" stopColor="#FFFFFF" />
                <stop offset="55%" stopColor="#F1F5F9" />
                <stop offset="100%" stopColor="#E2E8F0" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#0c1118" />
                <stop offset="55%" stopColor="#070a0f" />
                <stop offset="100%" stopColor="#040609" />
              </>
            )}
          </linearGradient>
          <linearGradient id={specularGradId} x1="0" y1="0" x2="296" y2="124" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor={primaryAccent} stopOpacity={isAero ? 0.5 : 0.85} />
            <stop offset="45%" stopColor={primaryAccent} stopOpacity={isAero ? 0.2 : 0.35} />
            <stop offset="100%" stopColor={isAero ? '#CBD5E1' : '#1e293b'} stopOpacity="0.6" />
          </linearGradient>
          <clipPath id={clipId}>
            <path d="M 16 2 L 68 2 L 74 8 L 80 2 L 280 2 A 14 14 0 0 1 294 16 L 294 48 A 14 14 0 0 0 294 76 L 294 108 A 14 14 0 0 1 280 122 L 80 122 L 74 116 L 68 122 L 16 122 A 14 14 0 0 1 2 108 L 2 76 A 14 14 0 0 0 2 48 L 2 16 A 14 14 0 0 1 16 2 Z" />
          </clipPath>
        </defs>

        <g clipPath={`url(#${clipId})`}>
          {/* Base AMOLED Fill */}
          <rect x="0" y="0" width="296" height="124" fill={`url(#${bgGradId})`} />

          {/* Subtle Left Stub Tint */}
          <rect x="0" y="0" width="74" height="124" fill={primaryAccent} fillOpacity="0.035" />

          {/* Ambient Specular Sheen Sweep */}
          <rect
            className="zn-dock-sheen"
            x="-120"
            y="0"
            width="90"
            height="124"
            fill={primaryAccent}
            fillOpacity="0.07"
            transform="skewX(-22)"
          />

          {/* Vertical Perforation Seam at 25% (x=74) */}
          <line
            x1="74"
            y1="10"
            x2="74"
            y2="114"
            stroke={primaryAccent}
            strokeOpacity="0.45"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />

          {/* Left Stub Grip Dots */}
          <circle cx="38" cy="48" r="2" fill={primaryAccent} fillOpacity="0.45" />
          <circle cx="38" cy="62" r="2" fill={primaryAccent} fillOpacity="0.7" />
          <circle cx="38" cy="76" r="2" fill={primaryAccent} fillOpacity="0.45" />

          {/* Right Body Live Breathing Damped Waveform */}
          <path
            className="zn-dock-wave"
            d="M 96 62 L 108 62 L 114 44 L 120 80 L 126 36 L 132 88 L 138 48 L 144 74 L 150 54 L 156 68 L 162 58 L 168 65 L 174 61 L 182 62 L 266 62"
            stroke={primaryAccent}
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />

          {/* Outer & Inner Concentric Hairline Borders */}
          <path
            d="M 16 2 L 68 2 L 74 8 L 80 2 L 280 2 A 14 14 0 0 1 294 16 L 294 48 A 14 14 0 0 0 294 76 L 294 108 A 14 14 0 0 1 280 122 L 80 122 L 74 116 L 68 122 L 16 122 A 14 14 0 0 1 2 108 L 2 76 A 14 14 0 0 0 2 48 L 2 16 A 14 14 0 0 1 16 2 Z"
            stroke={isAero ? '#CBD5E1' : '#1e293b'}
            strokeWidth="2"
          />
          <path
            d="M 19 7 L 66 7 L 74 14 L 82 7 L 277 7 A 10 10 0 0 1 289 19 L 289 45 A 17 17 0 0 0 289 79 L 289 105 A 10 10 0 0 1 277 117 L 82 117 L 74 110 L 66 117 L 19 117 A 10 10 0 0 1 7 105 L 7 79 A 17 17 0 0 0 7 45 L 7 19 A 10 10 0 0 1 19 7 Z"
            stroke={`url(#${specularGradId})`}
            strokeWidth="1.25"
          />
        </g>
      </svg>

      <span className="zn-dock-ticket-badge">×{ticketCount}</span>
    </button>
  );
};

export interface EscapeTicketModalProps {
  isOpen: boolean;
  ticketCount?: number;
  onClose: () => void;
  onEscapeConfirmed?: () => void;
  accentColor?: string;
  // Compatibility with existing App.tsx props
  parachuteMetrics?: any;
  profile?: any;
  isZeroSupporter?: boolean;
  hasClaimedFirstTimeParachute?: boolean;
  hasClaimedFirstDonationParachute?: boolean;
  onOpenProfile?: () => void;
  onOpenSupport?: () => void;
  onOpenInsights?: () => void;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  decay: number;
  color: string;
}

interface SoftShockwave {
  cx: number;
  cy: number;
  radius: number;
  maxRadius: number;
  speed: number;
  alpha: number;
  width: number;
}

/**
 * Full-size interactive two-part tear-off Escape Ticket modal
 * with 4-stage "Escape from the Void" unlock sequence.
 */
export const EscapeTicketModal: React.FC<EscapeTicketModalProps> = ({
  isOpen,
  ticketCount,
  onClose,
  onEscapeConfirmed,
  accentColor,
  parachuteMetrics,
}) => {
  const effectiveTicketCount = ticketCount ?? parachuteMetrics?.currentBalance ?? 0;

  const [ripProgress, setRipProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'ripping' | 'escaped'>('idle');
  const [waveFlatness, setWaveFlatness] = useState(0);

  const ticketBoxRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragStartYRef = useRef(0);
  const lastNotchRef = useRef(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const shockwavesRef = useRef<SoftShockwave[]>([]);
  const lastTimeRef = useRef<number>(0);
  const rafMoveRef = useRef<number | null>(null);
  const pendingMoveYRef = useRef<number | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const phaseRef = useRef<'idle' | 'ripping' | 'escaped'>('idle');

  const uid = useId().replace(/:/g, '');
  const mainBgId = `znMainBg_${uid}`;
  const stubBgId = `znStubBg_${uid}`;
  const iceBorderId = `znIceBorder_${uid}`;
  const stubClipId = `znStubClip_${uid}`;
  const mainClipId = `znMainClip_${uid}`;

  const primaryAccent = accentColor || 'var(--accent-hex, #7dd3fc)';

  useEffect(() => {
    phaseRef.current = phase;
  }, [phase]);

  // Reset modal state whenever opened
  useEffect(() => {
    if (isOpen) {
      setRipProgress(0);
      setIsDragging(false);
      setPhase('idle');
      setWaveFlatness(0);
      lastNotchRef.current = 0;
      particlesRef.current = [];
      shockwavesRef.current = [];
      lastTimeRef.current = 0;
      pendingMoveYRef.current = null;
      if (rafMoveRef.current !== null) {
        cancelAnimationFrame(rafMoveRef.current);
        rafMoveRef.current = null;
      }
    }
  }, [isOpen]);

  // Web Audio API synthesizer for mechanical notch ticks & paper tear burst
  const playTickSound = useCallback((progress: number) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const baseFreq = 620 + progress * 480;
      osc.frequency.setValueAtTime(baseFreq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.028);

      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.028);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.03);
    } catch {
      // Ignore audio restriction errors
    }
  }, []);

  const playDetachSound = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') ctx.resume();

      // Filtered noise burst for crisp perforation snap + sub pulse
      const bufferSize = Math.floor(ctx.sampleRate * 0.22);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.06));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, ctx.currentTime);
      filter.frequency.exponentialRampToValueAtTime(320, ctx.currentTime + 0.22);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.22, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start();
    } catch {
      // Ignore audio restriction errors
    }
  }, []);

  // Spawn sparks along the perforation seam in screen coordinates
  const spawnSeamSparks = useCallback((progress: number, burst = false) => {
    const box = ticketBoxRef.current;
    if (!box) return;
    const rect = box.getBoundingClientRect();
    const seamX = rect.left + rect.width * 0.25;
    const seamY = rect.top + rect.height * (0.05 + progress * 0.9);

    const count = burst ? 28 : 4;
    for (let i = 0; i < count; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.4 - Math.PI * 0.5;
      const speed = burst ? 2.5 + Math.random() * 6.5 : 1.0 + Math.random() * 3.0;
      particlesRef.current.push({
        x: seamX + (Math.random() - 0.5) * 4,
        y: seamY + (Math.random() - 0.5) * 6,
        vx: Math.cos(angle) * speed * (Math.random() > 0.5 ? 1 : -1),
        vy: Math.sin(angle) * speed - 0.6,
        size: burst ? 1.8 + Math.random() * 2.2 : 1.2 + Math.random() * 1.5,
        alpha: 1,
        decay: burst ? 0.018 + Math.random() * 0.015 : 0.035 + Math.random() * 0.025,
        color: Math.random() > 0.32 ? (accentColor || '#7dd3fc') : '#ffffff',
      });
    }
  }, [accentColor]);

  // Trigger the 4-stage Escape from the Void sequence once rip >= 85%
  const triggerEscapeSequence = useCallback(() => {
    if (phaseRef.current === 'escaped') return;
    setPhase('escaped');
    setRipProgress(1);
    setIsDragging(false);

    playDetachSound();
    if (navigator.vibrate) {
      navigator.vibrate([16, 28, 36]);
    }
    haptics.parachuteDeploy();
    spawnSeamSparks(1, true);

    // Stage 2: Smoothly flatten waveform to 0.00 dB as shockwave crosses ticket
    const startWave = performance.now();
    const flattenDuration = 520;
    const stepWave = (now: number) => {
      const t = Math.min(1, (now - startWave) / flattenDuration);
      const eased = 1 - Math.pow(1 - t, 3);
      setWaveFlatness(eased);
      if (t < 1) requestAnimationFrame(stepWave);
    };
    setTimeout(() => requestAnimationFrame(stepWave), 160);

    // Stage 3: Spawn Smooth Atmospheric Shockwave Aura (No harsh wireframe lines)
    setTimeout(() => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const maxRadius = Math.max(window.innerWidth, window.innerHeight) * 0.95;
      for (let i = 0; i < 3; i++) {
        shockwavesRef.current.push({
          cx,
          cy,
          radius: 35 + i * 40,
          maxRadius,
          speed: 8.5 + i * 2.8,
          alpha: 0.65 - i * 0.12,
          width: 70 + i * 25,
        });
      }
    }, 280);

    // Stage 4: Commit ticket consumption & unlock session
    setTimeout(() => {
      if (onEscapeConfirmed) {
        onEscapeConfirmed();
      } else {
        onClose();
      }
    }, 1550);
  }, [playDetachSound, spawnSeamSparks, onEscapeConfirmed, onClose]);

  // 2D Canvas overlay loop for smooth sparks & soft aura glow
  useEffect(() => {
    if (!isOpen) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const strokeColor = accentColor || '#7dd3fc';

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);
    lastTimeRef.current = performance.now();

    const render = (now: number) => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

      // Delta time normalized to 60fps (dt ≈ 1.0 at 60fps, dt ≈ 0.5 at 120fps)
      const rawDt = (now - lastTimeRef.current) / 16.667;
      const dt = Math.max(0.2, Math.min(rawDt, 2.0));
      lastTimeRef.current = now;

      // Update & draw glowing ember sparks with delta-time
      particlesRef.current = particlesRef.current.filter((p) => p.alpha > 0.02);
      for (const p of particlesRef.current) {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vy += 0.12 * dt; // gentle weightless gravity
        p.alpha -= p.decay * dt;

        ctx.save();
        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;
        ctx.shadowColor = strokeColor;
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // Update & draw silky soft expanding atmospheric aura glow waves
      shockwavesRef.current = shockwavesRef.current.filter((sw) => sw.alpha > 0.01 && sw.radius < sw.maxRadius);
      for (const sw of shockwavesRef.current) {
        sw.radius += sw.speed * dt;
        sw.alpha *= Math.pow(0.97, dt);

        ctx.save();
        const rInner = Math.max(0, sw.radius - sw.width);
        const rOuter = sw.radius + sw.width;
        const grad = ctx.createRadialGradient(sw.cx, sw.cy, rInner, sw.cx, sw.cy, rOuter);
        grad.addColorStop(0, 'rgba(125, 211, 252, 0)');
        grad.addColorStop(0.5, `rgba(125, 211, 252, ${Math.max(0, sw.alpha * 0.32)})`);
        grad.addColorStop(1, 'rgba(125, 211, 252, 0)');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(sw.cx, sw.cy, rOuter, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);
    return () => {
      window.removeEventListener('resize', resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isOpen, accentColor]);

  // Spring back if user releases before reaching 85% rip threshold
  useEffect(() => {
    if (isDragging || phase === 'escaped' || ripProgress === 0) return;
    let raf: number;
    let lastSpringTime = performance.now();
    const springBack = (now: number) => {
      const rawDt = (now - lastSpringTime) / 16.667;
      const dt = Math.max(0.2, Math.min(rawDt, 2.0));
      lastSpringTime = now;
      setRipProgress((prev) => {
        const next = prev * Math.pow(0.78, dt);
        if (next < 0.008) {
          setPhase('idle');
          lastNotchRef.current = 0;
          return 0;
        }
        raf = requestAnimationFrame(springBack);
        return next;
      });
    };
    raf = requestAnimationFrame(springBack);
    return () => cancelAnimationFrame(raf);
  }, [isDragging, phase, ripProgress]);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (phase === 'escaped') return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setPhase('ripping');
    dragStartYRef.current = e.clientY - ripProgress * 180;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging || phase === 'escaped') return;
    pendingMoveYRef.current = e.clientY;
    if (rafMoveRef.current !== null) return;

    rafMoveRef.current = requestAnimationFrame(() => {
      rafMoveRef.current = null;
      if (pendingMoveYRef.current === null) return;
      const box = ticketBoxRef.current;
      const dragRange = box ? Math.max(130, box.getBoundingClientRect().height * 0.74) : 170;
      const raw = (pendingMoveYRef.current - dragStartYRef.current) / dragRange;
      const clamped = Math.max(0, Math.min(1, raw));
      setRipProgress(clamped);

      // Mechanical notch tick + micro-sparks every ~8%
      const notch = Math.floor(clamped * 12);
      if (notch > lastNotchRef.current) {
        lastNotchRef.current = notch;
        playTickSound(clamped);
        if (navigator.vibrate) navigator.vibrate(6);
        haptics.tick(150);
        spawnSeamSparks(clamped, false);
      }

      if (clamped >= 0.85) {
        triggerEscapeSequence();
      }
    });
  };

  const handlePointerUp = () => {
    if (rafMoveRef.current !== null) {
      cancelAnimationFrame(rafMoveRef.current);
      rafMoveRef.current = null;
    }
    pendingMoveYRef.current = null;
    if (!isDragging) return;
    setIsDragging(false);
    if (ripProgress >= 0.85) {
      triggerEscapeSequence();
    }
  };

  if (!isOpen) return null;

  // Interpolate audio waveform points toward flat line y=156
  const baseWaveY = [156, 156, 126, 186, 114, 198, 130, 182, 138, 174, 145, 167, 150, 162, 154, 158, 156];
  const waveX = [204, 224, 236, 248, 260, 272, 284, 296, 308, 320, 332, 344, 356, 368, 380, 392, 410];
  const currentWavePath =
    waveX
      .map((x, idx) => {
        const y = 156 + (baseWaveY[idx] - 156) * (1 - waveFlatness);
        return `${idx === 0 ? 'M' : 'L'} ${x} ${y.toFixed(1)}`;
      })
      .join(' ') + ' L 594 156';

  const isEscaped = phase === 'escaped';
  const tearY = 14 + ripProgress * 268;

  // Left stub physical hinge transform (GPU accelerated translate3d)
  const stubStyle: React.CSSProperties = isEscaped
    ? {
        transform: 'translate3d(-44px, 340px, 0) rotate(-26deg)',
        opacity: 0,
        transition: 'transform 0.62s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s ease-out',
        willChange: 'transform, opacity',
      }
    : {
        transform: `translate3d(${-ripProgress * 12}px, ${ripProgress * 16}px, 0) rotate(${-ripProgress * 7.5}deg)`,
        transformOrigin: '160px 282px',
        transition: isDragging ? 'none' : 'transform 0.28s cubic-bezier(0.25, 1, 0.5, 1)',
        willChange: 'transform',
      };

  return (
    <div className="zn-escape-overlay" role="dialog" aria-modal="true" aria-label="Escape Ticket">
      {/* 2D Particle Sparks & Void Fracture Canvas */}
      <canvas ref={canvasRef} className="zn-escape-canvas" />

      {/* Top Subtle Status / Close Bar */}
      <div className="zn-escape-topbar">
        <span className="zn-escape-pill">
          {isEscaped ? 'VOID LOCK // RELEASED' : `TICKETS AVAILABLE: ${effectiveTicketCount}`}
        </span>
        {!isEscaped && (
          <button
            type="button"
            className="zn-escape-close"
            onClick={() => {
              haptics.tick(150);
              onClose();
            }}
            aria-label="Close"
          >
            ✕
          </button>
        )}
      </div>

      {/* Centered Two-Part Notched Escape Ticket */}
      <div
        ref={ticketBoxRef}
        className={`zn-ticket-stage ${isEscaped ? 'zn-ticket-stage--escaped' : ''}`}
      >
        <svg
          className="zn-ticket-svg"
          viewBox="0 0 640 296"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id={mainBgId} x1="160" y1="0" x2="640" y2="296" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0a0e14" />
              <stop offset="55%" stopColor="#06080c" />
              <stop offset="100%" stopColor="#030407" />
            </linearGradient>
            <linearGradient id={stubBgId} x1="0" y1="0" x2="160" y2="296" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#0e1520" />
              <stop offset="100%" stopColor="#070a10" />
            </linearGradient>
            <linearGradient id={iceBorderId} x1="0" y1="0" x2="640" y2="296" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor={primaryAccent} stopOpacity={isEscaped ? '1' : '0.82'} />
              <stop offset="50%" stopColor={primaryAccent} stopOpacity={isEscaped ? '0.9' : '0.32'} />
              <stop offset="100%" stopColor="#334155" stopOpacity="0.65" />
            </linearGradient>
            <clipPath id={stubClipId}>
              <path d="M 22 4 L 152 4 L 160 14 L 160 282 L 152 292 L 22 292 A 18 18 0 0 1 4 274 L 4 176 A 28 28 0 0 0 4 120 L 4 22 A 18 18 0 0 1 22 4 Z" />
            </clipPath>
            <clipPath id={mainClipId}>
              <path d="M 160 14 L 168 4 L 618 4 A 18 18 0 0 1 636 22 L 636 120 A 28 28 0 0 0 636 176 L 636 274 A 18 18 0 0 1 618 292 L 168 292 L 160 282 Z" />
            </clipPath>
          </defs>

          {/* ================= RIGHT MAIN BODY (75%) ================= */}
          <g clipPath={`url(#${mainClipId})`}>
            <rect x="160" y="0" width="480" height="296" fill={`url(#${mainBgId})`} />

            {/* Subtle Technical Grid Texture */}
            <g opacity="0.06" stroke={primaryAccent} strokeWidth="1">
              <line x1="160" y1="74" x2="640" y2="74" />
              <line x1="160" y1="222" x2="640" y2="222" />
              <line x1="398" y1="0" x2="398" y2="296" />
            </g>

            {/* Horizontal Shockwave Sweep on Escape */}
            {isEscaped && (
              <rect
                className="zn-shockwave-bar"
                x="160"
                y="0"
                width="46"
                height="296"
                fill={primaryAccent}
                fillOpacity="0.28"
              />
            )}

            {/* Top Micro Status */}
            <text
              x="204"
              y="44"
              fill={primaryAccent}
              fillOpacity="0.7"
              fontSize="10.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              letterSpacing="2.4"
            >
              {isEscaped ? 'STATUS // BYPASS GRANTED' : 'ZERO NOISE // PROTOCOL'}
            </text>

            {/* Main Headline */}
            <text
              x="204"
              y="102"
              fill={isEscaped ? primaryAccent : '#f8fafc'}
              fontSize="36"
              fontWeight="700"
              fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
              letterSpacing="3.5"
            >
              {isEscaped ? 'ESCAPE INITIATED' : 'ESCAPE TICKET'}
            </text>

            {/* Audio-to-Silence Waveform */}
            <path
              d={currentWavePath}
              stroke={primaryAccent}
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <text
              x="594"
              y="142"
              textAnchor="end"
              fill="#64748b"
              fontSize="9.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              letterSpacing="1.6"
            >
              {isEscaped ? '0.00 dB' : 'VOID LOCK'}
            </text>

            {/* Bottom Divider & Destination Line Only */}
            <line x1="204" y1="228" x2="594" y2="228" stroke="#1e293b" strokeWidth="1" />
            <text
              x="204"
              y="258"
              fill="#94a3b8"
              fontSize="11.5"
              fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
              letterSpacing="2.6"
            >
              DESTINATION:{' '}
              <tspan fill="#f8fafc" fontWeight="600">
                ESCAPE
              </tspan>
            </text>

            {/* Outer & Inner Specular Borders (Main Body) */}
            <path
              d="M 160 14 L 168 4 L 618 4 A 18 18 0 0 1 636 22 L 636 120 A 28 28 0 0 0 636 176 L 636 274 A 18 18 0 0 1 618 292 L 168 292 L 160 282"
              stroke="#1e293b"
              strokeWidth="2"
            />
            <path
              d="M 166 20 L 172 11 L 614 11 A 12 12 0 0 1 629 25 L 629 115 A 34 34 0 0 0 629 181 L 629 271 A 12 12 0 0 1 614 285 L 172 285 L 166 276"
              stroke={`url(#${iceBorderId})`}
              strokeWidth="1.25"
            />
          </g>

          {/* ================= PERFORATION SEAM (x = 160) ================= */}
          {/* Intact Lower Dashed Seam */}
          {!isEscaped && tearY < 282 && (
            <line
              x1="160"
              y1={tearY}
              x2="160"
              y2="282"
              stroke={primaryAccent}
              strokeOpacity="0.5"
              strokeWidth="1.6"
              strokeDasharray="5 5"
            />
          )}
          {/* Unzipped Glowing Upper Edge */}
          {ripProgress > 0.01 && !isEscaped && (
            <line
              x1="160"
              y1="14"
              x2="160"
              y2={tearY}
              stroke={primaryAccent}
              strokeWidth="2.2"
              strokeOpacity="0.95"
            />
          )}

          {/* ================= LEFT TEAR-OFF STUB (25%) ================= */}
          <g style={stubStyle}>
            <g clipPath={`url(#${stubClipId})`}>
              <rect x="0" y="0" width="160" height="296" fill={`url(#${stubBgId})`} />

              {/* Vertical Slider Track */}
              <rect
                x="76"
                y="56"
                width="26"
                height="184"
                rx="13"
                fill="#030508"
                stroke="#1e293b"
                strokeWidth="1.2"
              />

              {/* Animated Downward Chevrons */}
              <g
                className="zn-stub-chevrons"
                stroke={primaryAccent}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="83,84 89,90 95,84" opacity="0.45" />
                <polyline points="83,102 89,108 95,102" opacity="0.7" />
                <polyline points="83,120 89,126 95,120" opacity="0.95" />
              </g>

              {/* Draggable Thumb Indicator */}
              <circle
                cx="89"
                cy={76 + ripProgress * 144}
                r="8"
                fill={primaryAccent}
                fillOpacity={isDragging ? '0.95' : '0.75'}
              />

              {/* Vertical Stub Label */}
              <text
                x="48"
                y="148"
                fill="#64748b"
                fontSize="9.5"
                fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                letterSpacing="2.2"
                textAnchor="middle"
                transform="rotate(-90 48 148)"
              >
                STUB // 01
              </text>

              {/* Outer & Inner Specular Borders (Left Stub) */}
              <path
                d="M 160 14 L 152 4 L 22 4 A 18 18 0 0 0 4 22 L 4 120 A 28 28 0 0 1 4 176 L 4 274 A 18 18 0 0 0 22 292 L 152 292 L 160 282"
                stroke="#1e293b"
                strokeWidth="2"
              />
              <path
                d="M 154 20 L 148 11 L 26 11 A 12 12 0 0 0 11 25 L 11 115 A 34 34 0 0 1 11 181 L 11 271 A 12 12 0 0 0 26 285 L 148 285 L 154 276"
                stroke={`url(#${iceBorderId})`}
                strokeWidth="1.25"
              />
            </g>
          </g>
        </svg>

        {/* Interactive Touch / Pointer Hit Zone over Left Stub */}
        {!isEscaped && (
          <div
            className="zn-stub-hit-zone"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            aria-label="Slide down to rip escape ticket"
          />
        )}
      </div>

      {/* Minimal Bottom Hint */}
      <div className="zn-escape-footer">
        {isEscaped ? (
          <span className="zn-escape-hint zn-escape-hint--active">
            ESCAPING THE VOID...
          </span>
        ) : (
          <span className="zn-escape-hint">SLIDE LEFT STUB DOWN TO RIP</span>
        )}
      </div>
    </div>
  );
};
