import React, { type CSSProperties } from 'react';
import type { ObsidianCardProps } from './ObsidianCard';

export type GlassCardProps = ObsidianCardProps;

/**
 * Microsoft Fluent 2 Liquid Glass surface card:
 * Translucent directional specular borders + 28px backdrop refraction + 0.03 fractal noise.
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
    onClick && !disabled ? 'cursor-pointer liquid-spring hover:brightness-110' : '';

  const sharedClassName = `relative flex flex-col justify-between ${widthClass} rounded-[20px] overflow-hidden liquid-card font-sans ${interactiveClasses} ${className}`;

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
      {/* Subtle 0.03 opacity tactile frosted Acrylic noise layer */}
      <div aria-hidden="true" className="liquid-noise-overlay z-0" />

      {/* Top Specular Refraction Rim */}
      <div
        aria-hidden="true"
        className="absolute top-0 left-5 right-5 h-px pointer-events-none z-20"
        style={{
          background:
            'linear-gradient(90deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.48) 50%, rgba(255,255,255,0.06) 100%)',
        }}
      />

      {ambientGlow && (
        <div
          aria-hidden="true"
          className="absolute -top-12 -left-10 w-44 h-44 rounded-full pointer-events-none blur-2xl z-0"
          style={{
            background:
              'radial-gradient(circle, rgba(79, 172, 254, 0.16) 0%, rgba(0, 242, 254, 0.05) 45%, transparent 72%)',
          }}
        />
      )}

      {overlays}

      {/* Tier 1: Primary Content */}
      <div className={`relative z-10 ${resolvedHeaderClass}`}>{headerContent}</div>

      {/* Tier 2: Footer Strip */}
      {footerContent && (
        <div
          className={`relative z-10 shrink-0 border-t border-white/[0.08] bg-black/25 ${resolvedFooterClass}`}
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
