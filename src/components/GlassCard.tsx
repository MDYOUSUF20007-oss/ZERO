import React, { type CSSProperties } from 'react';
import type { ObsidianCardProps } from './ObsidianCard';

export type GlassCardProps = ObsidianCardProps;

/**
 * Liquid Glass Pro 60FPS Surface Card:
 * Authentic optical glass refraction, specular top-edge highlight, dynamic Theme Studio inner glow,
 * and rounded-3xl geometry.
 */
export const GlassCard: React.FC<GlassCardProps> = ({
  headerContent,
  footerContent,
  overlays,
  ambientGlow = false,
  fullWidth = true,
  className = '',
  headerClassName,
  footerClassName,
  style,
  onClick,
  onSubmit,
  asButton = false,
  disabled = false,
  title,
  'aria-label': ariaLabel,
  'data-amoled-banner': dataAmoledBanner,
  'data-restricted-guide': dataRestrictedGuide,
}) => {
  const resolvedHeaderClass = headerClassName ?? 'p-4 sm:p-5';
  const resolvedFooterClass = footerClassName ?? 'px-4 sm:px-5 py-3';
  const widthClass = fullWidth ? 'w-full' : '';

  const interactiveClasses =
    onClick && !disabled ? 'cursor-pointer liquid-spring hover:brightness-105 active:scale-[0.98]' : '';

  const sharedClassName = `relative flex flex-col justify-between ${widthClass} rounded-[20px] overflow-hidden liquid-glass font-sans ${interactiveClasses} ${className}`;

  // Strip opaque classic/bespoke style overrides so glass translucency is preserved across every card
  const passthroughStyle: CSSProperties | undefined = style
    ? (() => {
        const {
          background: _bg,
          backgroundColor: _bgc,
          border: _b,
          borderColor: _bc,
          boxShadow: _bs,
          ...rest
        } = style;
        return rest;
      })()
    : undefined;

  const innerMarkup = (
    <>
      {/* Top Specular Optical Highlight Rim */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-6 right-6 h-[1px] pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.60) 50%, transparent 100%)',
        }}
      />

      {/* Acrylic Physical Micro-Texture Grain */}
      <div
        aria-hidden="true"
        className="absolute inset-0 pointer-events-none z-0 opacity-[0.032] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='acrylicNoise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23acrylicNoise)'/%3E%3C/svg%3E")`,
        }}
      />

      {ambientGlow && (
        <div
          aria-hidden="true"
          className="absolute -top-12 -left-10 w-44 h-44 rounded-full pointer-events-none z-0"
          style={{
            background:
              'radial-gradient(circle, var(--accent-primary) 0%, var(--accent-soft) 40%, transparent 70%)',
            opacity: 'calc(var(--ambient-glow-opacity, 0.35) * 0.70)',
          }}
        />
      )}

      {overlays}

      {/* Tier 1: Primary Content */}
      <div className={`relative z-10 ${resolvedHeaderClass}`}>{headerContent}</div>

      {/* Tier 2: Footer Strip */}
      {footerContent && (
        <div
          className={`relative z-10 shrink-0 border-t border-white/[0.08] bg-black/35 ${resolvedFooterClass}`}
        >
          {footerContent}
        </div>
      )}
    </>
  );

  if (onSubmit) {
    return (
      <form
        onSubmit={onSubmit}
        onClick={onClick}
        title={title}
        aria-label={ariaLabel}
        data-obsidian-card="true"
        data-liquid-card="true"
        data-amoled-banner={dataAmoledBanner}
        data-restricted-guide={dataRestrictedGuide}
        className={sharedClassName}
        style={passthroughStyle}
      >
        {innerMarkup}
      </form>
    );
  }

  if (asButton && onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        title={title}
        aria-label={ariaLabel}
        data-obsidian-card="true"
        data-liquid-card="true"
        data-amoled-banner={dataAmoledBanner}
        data-restricted-guide={dataRestrictedGuide}
        className={`items-stretch text-left ${sharedClassName}`}
        style={passthroughStyle}
      >
        {innerMarkup}
      </button>
    );
  }

  return (
    <div
      onClick={disabled ? undefined : onClick}
      onKeyDown={
        onClick && !disabled
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick(e);
              }
            }
          : undefined
      }
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      title={title}
      aria-label={ariaLabel}
      data-obsidian-card="true"
      data-liquid-card="true"
      data-amoled-banner={dataAmoledBanner}
      data-restricted-guide={dataRestrictedGuide}
      className={sharedClassName}
      style={passthroughStyle}
    >
      {innerMarkup}
    </div>
  );
};
