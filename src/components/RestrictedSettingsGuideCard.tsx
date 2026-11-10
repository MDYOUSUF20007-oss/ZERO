import React from 'react';
import { Settings, ShieldCheck, ExternalLink } from 'lucide-react';
import type { RestrictedSettingsStatus } from '../types';
import { ObsidianCard } from './ObsidianCard';

interface RestrictedSettingsGuideCardProps {
  restrictedStatus: RestrictedSettingsStatus;
  isStrictBuild: boolean;
  onOpenAppInfo: () => void;
  compact?: boolean;
}

/**
 * Green step-by-step Android 13–16 Restricted Settings guide + direct Zero App Info shortcut.
 * Shown directly under Grant Usage Access / Grant Missing Permissions so everyone knows
 * how to unblock phones that show "For your security, this setting is unavailable".
 */
export const RestrictedSettingsGuideCard: React.FC<RestrictedSettingsGuideCardProps> = ({
  restrictedStatus,
  isStrictBuild,
  onOpenAppInfo,
  compact = false,
}) => {
  const permissionLabel = isStrictBuild ? 'Accessibility' : 'Usage Access -> Find Zero-Distractions';

  return (
    <ObsidianCard
      data-restricted-guide="true"
      accentOverride={{ hex: '#10B981', rgb: '16, 185, 129' }}
      ambientGlow
      className="font-mono"
      style={{
        background:
          'linear-gradient(180deg, rgba(6, 52, 39, 0.92) 0%, rgba(4, 24, 18, 0.98) 100%)',
        borderColor: 'rgba(16, 185, 129, 0.72)',
      }}
      headerClassName={`${compact ? 'p-3' : 'p-3.5'} space-y-2`}
      footerClassName={`${compact ? 'px-3 py-2.5' : 'px-3.5 py-2.5'}`}
      headerContent={
        <>
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-emerald-300">
              <ShieldCheck size={14} className="text-emerald-400 shrink-0" />
              <span>How to Fix If Phone Blocks &ldquo;Find Zero-Distractions&rdquo;</span>
            </div>
            <span
              className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0 ${
                restrictedStatus === 'allowed'
                  ? 'bg-emerald-500 text-black border-emerald-400'
                  : restrictedStatus === 'blocked'
                  ? 'bg-amber-400 text-black border-amber-300'
                  : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/70'
              }`}
            >
              {restrictedStatus === 'allowed'
                ? 'Unblocked'
                : restrictedStatus === 'blocked'
                ? 'Blocked Now'
                : 'Green Fix Guide'}
            </span>
          </div>

          <ol className="text-[11px] text-emerald-300 leading-relaxed space-y-1 pl-4 list-decimal font-semibold">
            <li>
              If your phone does not allow turning ON <strong>{permissionLabel}</strong> at first
              (greyed out / &ldquo;Restricted setting&rdquo;), tap <strong>OK</strong> once on that popup.
            </li>
            <li>
              Tap <strong>Open Zero App Info (Shortcut)</strong> below.
            </li>
            <li>
              Tap the <strong>&#8942; (3 dots)</strong> at top-right &rarr;{' '}
              <strong>Allow restricted settings</strong> &rarr; verify PIN / fingerprint{' '}
              <span className="font-normal text-emerald-200">
                (Xiaomi/HyperOS: scroll to bottom of App Info).
              </span>
            </li>
            <li>
              Come back here and tap <strong>{permissionLabel}</strong> &rarr; toggle{' '}
              <strong>Zero-Distractions ON</strong>.
            </li>
          </ol>
        </>
      }
      footerContent={
        <button
          type="button"
          onClick={onOpenAppInfo}
          className="w-full py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
        >
          <Settings size={13} />
          <span>Open Zero App Info (Shortcut)</span>
          <ExternalLink size={12} />
        </button>
      }
    />
  );
};
