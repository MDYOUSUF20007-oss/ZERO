import React from 'react';
import { Settings, ExternalLink } from 'lucide-react';
import type { RestrictedSettingsStatus } from '../types';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

interface RestrictedSettingsGuideCardProps {
  restrictedStatus: RestrictedSettingsStatus;
  isStrictBuild: boolean;
  onOpenAppInfo: () => void;
  compact?: boolean;
}

/**
 * Sleek Frosted Obsidian inline guide for Android 13–16 "Restricted setting" blocks.
 * Matches the real 3-step Android flow:
 * 1. Tap Grant Usage Access / Accessibility first (tap OK if Google blocks on first try)
 * 2. Open Zero App Info -> top-right ⋮ -> Allow restricted settings
 * 3. Return & tap Grant Usage Access / Accessibility again -> Turn ON
 */
export const RestrictedSettingsGuideCard: React.FC<RestrictedSettingsGuideCardProps> = ({
  restrictedStatus,
  isStrictBuild,
  onOpenAppInfo,
  compact = false,
}) => {
  const { isBespoke } = useInterfaceStyle();
  const isBlockedNow = restrictedStatus === 'blocked';
  const actionName = isStrictBuild ? 'Enable Accessibility' : 'Grant Usage Access';

  if (isBespoke) {
    return (
      <div
        data-restricted-guide="true"
        className={`rounded-md border font-sans transition-colors duration-75 ${
          compact ? 'p-3.5 space-y-2.5' : 'p-4 space-y-3'
        } ${
          isBlockedNow
            ? 'bg-black border-blue-500/60'
            : 'bg-neutral-950 border-neutral-800'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-neutral-200">
            {isBlockedNow
              ? 'Blocked by Android — Allow in App Info'
              : 'If Google blocks first try (Android 13–16)'}
          </span>
          {isBlockedNow && (
            <span className="font-mono text-[9px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-black border border-blue-500/60 text-blue-400 shrink-0">
              Unlock Now
            </span>
          )}
        </div>

        <ol className="text-xs text-neutral-400 leading-relaxed space-y-1.5 pl-4 list-decimal">
          <li>
            Tap <span className="text-neutral-200 font-medium">{actionName}</span> above{' '}
            <span className="text-neutral-500">(if denied, tap OK)</span>.
          </li>
          <li>
            Tap <span className="text-neutral-200 font-medium">Open Zero App Info</span> &rarr;{' '}
            <span className="text-neutral-200 font-medium">&#8942;</span> &rarr;{' '}
            <span className="text-neutral-200 font-medium">Allow restricted settings</span>.
          </li>
          <li>
            Return &amp; tap <span className="text-neutral-200 font-medium">{actionName}</span> again to allow.
          </li>
        </ol>

        <div className="pt-0.5 space-y-1.5">
          <button
            type="button"
            onClick={onOpenAppInfo}
            className={`w-full py-2 px-3 rounded-md text-xs flex items-center justify-center gap-1.5 transition-colors duration-75 ${
              isBlockedNow
                ? 'bg-blue-600 hover:bg-blue-500 text-white font-semibold uppercase tracking-wider'
                : 'bg-black border border-neutral-800 text-neutral-100 hover:border-neutral-600 font-medium'
            }`}
          >
            <Settings
              size={13}
              className={!isBlockedNow ? 'text-blue-500' : undefined}
            />
            <span>Open Zero App Info</span>
            <ExternalLink size={11} className="opacity-75" />
          </button>
          <p className="font-mono text-[10px] text-neutral-500 text-center">
            Xiaomi / HyperOS: scroll to bottom of App Info.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      data-restricted-guide="true"
      className={`rounded-xl font-mono transition-colors ${
        compact ? 'p-2.5 space-y-2' : 'p-3.5 space-y-2.5'
      } ${isBlockedNow ? 'obsidian-inset' : 'obsidian-inset-neutral'}`}
      style={{
        background: 'rgba(6, 6, 8, 0.84)',
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-200">
          {isBlockedNow
            ? 'Blocked by Android — Allow in App Info'
            : 'If Google blocks first try (Android 13–16)'}
        </span>
        {isBlockedNow && (
          <span
            className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
            style={{
              background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.14)',
              borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.42)',
              color: 'var(--accent-hex, #F59E0B)',
            }}
          >
            Unlock Now
          </span>
        )}
      </div>

      <ol className="text-[10px] text-zinc-400 leading-snug space-y-1 pl-4 list-decimal">
        <li>
          Tap <span className="text-zinc-200 font-semibold">{actionName}</span> above{' '}
          <span className="text-zinc-500">(if denied, tap OK)</span>.
        </li>
        <li>
          Tap <span className="text-zinc-200 font-semibold">Open Zero App Info</span> &rarr;{' '}
          <span className="text-zinc-200 font-semibold">&#8942;</span> &rarr;{' '}
          <span className="text-zinc-200 font-semibold">Allow restricted settings</span>.
        </li>
        <li>
          Return &amp; tap <span className="text-zinc-200 font-semibold">{actionName}</span> again to allow.
        </li>
      </ol>

      <div className="pt-0.5 space-y-1">
        <button
          type="button"
          onClick={onOpenAppInfo}
          className={`w-full py-2 px-3 rounded-xl font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all ${
            isBlockedNow
              ? 'obsidian-pill-active font-black uppercase tracking-wider'
              : 'obsidian-inset text-zinc-100 hover:brightness-110'
          }`}
        >
          <Settings
            size={13}
            style={!isBlockedNow ? { color: 'var(--accent-hex, #F59E0B)' } : undefined}
          />
          <span>Open Zero App Info</span>
          <ExternalLink size={11} className="opacity-75" />
        </button>
        <p className="text-[9px] text-zinc-500 text-center">
          Xiaomi / HyperOS: scroll to bottom of App Info.
        </p>
      </div>
    </div>
  );
};
