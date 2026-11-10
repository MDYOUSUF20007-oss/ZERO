import React, { type CSSProperties, type FormEventHandler, type ReactNode } from 'react';
import { ACCENT_THEMES, type AccentKey } from './ProfileAvatar';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

export interface ObsidianCardProps {
  accent?: AccentKey;
  forceAccent?: boolean;
  accentOverride?: { hex: string; rgb: string };
  headerContent: ReactNode; // Tier 1: Primary icon/emblem, title, metadata, action/stat controls
  footerContent?: ReactNode; // Tier 2: Footer status bar, quote, helper note, timestamps
  overlays?: ReactNode; // Optional background shimmer/watermark bounded inside card
  ambientGlow?: boolean;
  fullWidth?: boolean;
  className?: string;
  headerClassName?: string;
  footerClassName?: string;
  style?: CSSProperties;
  onClick?: (e?: React.SyntheticEvent) => void;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  asButton?: boolean;
  disabled?: boolean;
  title?: string;
  'aria-label'?: string;
  'data-amoled-banner'?: string;
  'data-restricted-guide'?: string;
}

export const ObsidianCard: React.FC<ObsidianCardProps> = ({
  accent,
  forceAccent = false,
  accentOverride,
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
  const { isBespoke } = useInterfaceStyle();
  const resolvedHeaderClass = headerClassName ?? (isBespoke ? 'p-5' : 'p-4');
  const resolvedFooterClass = footerClassName ?? (isBespoke ? 'px-5 py-3' : 'px-4 py-2.5');

  const resolvedAccent = isBespoke
    ? null
    : accentOverride
    ? accentOverride
    : forceAccent && accent
    ? ACCENT_THEMES[accent] || ACCENT_THEMES.Amber
    : null;

  const isPureAmoledBanner = dataAmoledBanner === 'true';
  const accentVarsStyle: CSSProperties = resolvedAccent
    ? ({
        '--accent-rgb': resolvedAccent.rgb,
        '--accent-hex': resolvedAccent.hex,
      } as CSSProperties)
    : {};

  const borderExpr = isBespoke
    ? '1px solid var(--zero-border, #262626)'
    : resolvedAccent
    ? `1.5px solid rgba(${resolvedAccent.rgb}, 0.45)`
    : '1.5px solid rgba(var(--accent-rgb, 245, 158, 11), 0.45)';

  const shadowExpr = isBespoke
    ? 'none'
    : resolvedAccent
    ? `0 0 28px -4px rgba(${resolvedAccent.rgb}, 0.24), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)`
    : '0 0 28px -4px rgba(var(--accent-rgb, 245, 158, 11), 0.24), inset 0 1px 0 0 rgba(255, 255, 255, 0.14)';

  const topHighlightBg = resolvedAccent
    ? `linear-gradient(90deg, transparent 0%, ${resolvedAccent.hex} 50%, transparent 100%)`
    : 'linear-gradient(90deg, transparent 0%, var(--accent-hex, #F59E0B) 50%, transparent 100%)';

  const interactiveClasses = isBespoke
    ? onClick && !disabled
      ? 'cursor-pointer hover:border-neutral-600 transition-colors duration-75'
      : ''
    : onClick && !disabled
    ? 'cursor-pointer hover:scale-[1.005] active:scale-[0.995]'
    : '';

  const widthClass = fullWidth ? 'w-full' : '';
  const sharedClassName = isBespoke
    ? `relative flex flex-col justify-between ${widthClass} rounded-md overflow-hidden transition-colors duration-75 ${interactiveClasses} ${className}`
    : `relative flex flex-col justify-between ${widthClass} rounded-2xl overflow-hidden transition-all duration-300 ${interactiveClasses} ${className}`;

  const bespokeStyleOverrides: CSSProperties =
    isBespoke && style
      ? {
          ...style,
          background: '#000000',
          backgroundColor: '#000000',
          borderColor: '#262626',
          boxShadow: 'none',
        }
      : style || {};

  const sharedStyle: CSSProperties = {
    ...accentVarsStyle,
    background: isBespoke
      ? '#000000'
      : isPureAmoledBanner
      ? '#000000'
      : 'linear-gradient(180deg, rgba(26, 26, 30, 0.96) 0%, rgba(12, 12, 14, 0.99) 100%)',
    border: borderExpr,
    boxShadow: shadowExpr,
    ...bespokeStyleOverrides,
  };

  const innerMarkup = (
    <>
      {/* Top Specular Metallic Highlight Line (Classic UI only) */}
      {!isBespoke && (
        <div
          aria-hidden="true"
          className="absolute top-0 left-6 right-6 h-[1.5px] pointer-events-none z-20"
          style={{
            background: topHighlightBg,
            opacity: 0.85,
          }}
        />
      )}

      {/* Optional Ambient Radial Glow (Classic UI only) */}
      {!isBespoke && ambientGlow && (
        <div
          aria-hidden="true"
          className="absolute -top-10 -left-10 w-40 h-40 rounded-full pointer-events-none blur-2xl"
          style={{
            background: resolvedAccent
              ? `radial-gradient(circle, rgba(${resolvedAccent.rgb}, 0.28) 0%, transparent 70%)`
              : 'radial-gradient(circle, rgba(var(--accent-rgb, 245, 158, 11), 0.28) 0%, transparent 70%)',
          }}
        />
      )}

      {!isBespoke && overlays}

      {/* Tier 1: Primary Header & Content */}
      <div className={`relative z-10 ${resolvedHeaderClass}`}>{headerContent}</div>

      {/* Tier 2: Optional Footer Bar */}
      {footerContent && (
        <div
          className={`relative z-10 shrink-0 border-t ${resolvedFooterClass}`}
          style={{
            background: isBespoke
              ? '#050505'
              : isPureAmoledBanner
              ? 'rgba(10, 7, 18, 0.92)'
              : 'rgba(5, 5, 7, 0.65)',
            borderColor: isBespoke ? '#262626' : 'rgba(255, 255, 255, 0.07)',
          }}
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
        data-amoled-banner={dataAmoledBanner}
        data-restricted-guide={dataRestrictedGuide}
        className={sharedClassName}
        style={sharedStyle}
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
        data-amoled-banner={dataAmoledBanner}
        data-restricted-guide={dataRestrictedGuide}
        className={`items-stretch text-left ${sharedClassName}`}
        style={sharedStyle}
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
      data-amoled-banner={dataAmoledBanner}
      data-restricted-guide={dataRestrictedGuide}
      className={sharedClassName}
      style={sharedStyle}
    >
      {innerMarkup}
    </div>
  );
};

export const ZeroCard = ObsidianCard;
