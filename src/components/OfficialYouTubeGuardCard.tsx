import React, { useState, useEffect, useCallback } from 'react';
import { Shield, ShieldAlert, CheckCircle2, ExternalLink } from 'lucide-react';
import { haptics } from '../utils/haptics';
import type { YouTubeGuardConfig } from '../plugins/zeroTube';
import {
  ZEROTUBE_GUARD_EVENT,
  ZEROTUBE_WHITELIST_EVENT,
  getYouTubeGuardConfig,
  saveYouTubeGuardConfig,
  getWhitelistedChannels,
} from '../utils/zeroTubeWhitelist';

interface OfficialYouTubeGuardCardProps {
  compact?: boolean;
}

function readNativeAccessibilityState(): {
  isNative: boolean;
  isStrictAccessibilityBuild: boolean;
  isAccessibilityEnabled: boolean;
} {
  if (typeof window === 'undefined' || !window.ZeroNative) {
    return {
      isNative: false,
      isStrictAccessibilityBuild: false,
      isAccessibilityEnabled: false,
    };
  }
  try {
    return {
      isNative: true,
      isStrictAccessibilityBuild: Boolean(window.ZeroNative.isStrictAccessibilityBuild?.()),
      isAccessibilityEnabled: Boolean(window.ZeroNative.isAccessibilityEnabled?.()),
    };
  } catch {
    return {
      isNative: true,
      isStrictAccessibilityBuild: false,
      isAccessibilityEnabled: false,
    };
  }
}

export const OfficialYouTubeGuardCard: React.FC<OfficialYouTubeGuardCardProps> = ({
  compact = false,
}) => {
  const [config, setConfig] = useState<YouTubeGuardConfig>(() => getYouTubeGuardConfig());
  const [whitelistCount, setWhitelistCount] = useState<number>(
    () => getWhitelistedChannels().length
  );
  const [permState, setPermState] = useState(() => readNativeAccessibilityState());
  const [showPermissionPrompt, setShowPermissionPrompt] = useState(false);

  const refreshState = useCallback(() => {
    setConfig(getYouTubeGuardConfig());
    setWhitelistCount(getWhitelistedChannels().length);
    const nextPerm = readNativeAccessibilityState();
    setPermState(nextPerm);
    if (nextPerm.isAccessibilityEnabled) {
      setShowPermissionPrompt(false);
    }
  }, []);

  useEffect(() => {
    window.addEventListener(ZEROTUBE_GUARD_EVENT, refreshState);
    window.addEventListener(ZEROTUBE_WHITELIST_EVENT, refreshState);
    window.addEventListener('zero-permissions-updated', refreshState);
    return () => {
      window.removeEventListener(ZEROTUBE_GUARD_EVENT, refreshState);
      window.removeEventListener(ZEROTUBE_WHITELIST_EVENT, refreshState);
      window.removeEventListener('zero-permissions-updated', refreshState);
    };
  }, [refreshState]);

  const handleOpenAccessibilitySettings = () => {
    haptics.tick(700);
    try {
      window.ZeroNative?.openAccessibilitySettings?.();
    } catch {
      // Ignore outside Android WebView
    }
  };

  const handleOpenAppInfoSettings = () => {
    haptics.tick(700);
    try {
      window.ZeroNative?.openAppSettingsDetails?.();
    } catch {
      // Ignore outside Android WebView
    }
  };

  const handleToggle = (key: keyof YouTubeGuardConfig) => {
    const nextValue = !config[key];
    haptics.tick(nextValue ? 800 : 500);

    const updated = saveYouTubeGuardConfig({
      ...config,
      [key]: nextValue,
    });
    setConfig(updated);

    // If enabling either guard on native Android without Accessibility permission, prompt & redirect
    const latestPerm = readNativeAccessibilityState();
    setPermState(latestPerm);
    if (nextValue && latestPerm.isNative && !latestPerm.isAccessibilityEnabled) {
      setShowPermissionPrompt(true);
      if (latestPerm.isStrictAccessibilityBuild) {
        handleOpenAccessibilitySettings();
      }
    }
  };

  const anyEnabled = config.blockOfficialShorts || config.strictOfficialStudyMode;
  const isStandardWithoutAccessibility =
    permState.isNative && !permState.isStrictAccessibilityBuild;
  const needsAccessibilityBanner =
    showPermissionPrompt ||
    (anyEnabled && permState.isNative && !permState.isAccessibilityEnabled);

  return (
    <div
      className={compact ? 'p-3 rounded-2xl space-y-2.5' : 'p-4 rounded-2xl space-y-3'}
      style={{
        backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
        border: '1px solid var(--border-subtle)',
        color: 'var(--text-primary)',
      }}
    >
      {/* Card Header */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="w-7 h-7 rounded-xl flex items-center justify-center shrink-0"
            style={{
              backgroundColor: anyEnabled ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: `1px solid ${anyEnabled ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color: anyEnabled ? 'var(--accent-primary)' : 'var(--text-secondary)',
            }}
          >
            <Shield size={14} />
          </div>
          <div className="min-w-0">
            <h4
              className="text-xs font-bold tracking-wide truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              Official YouTube App Guard
            </h4>
            <p
              className="text-[10px] font-mono truncate"
              style={{ color: 'var(--text-muted)' }}
            >
              com.google.android.youtube • Background Accessibility Shield
            </p>
          </div>
        </div>

        <span
          className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold inline-flex items-center gap-1 shrink-0"
          style={{
            backgroundColor: anyEnabled ? 'var(--accent-soft)' : 'var(--bg-surface)',
            border: `1px solid ${anyEnabled ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
            color: anyEnabled ? 'var(--accent-primary)' : 'var(--text-muted)',
          }}
        >
          {anyEnabled && (!permState.isNative || permState.isAccessibilityEnabled) && (
            <CheckCircle2 size={10} />
          )}
          <span>
            {!anyEnabled
              ? 'Standby'
              : isStandardWithoutAccessibility
              ? 'Strict APK Needed'
              : permState.isNative && !permState.isAccessibilityEnabled
              ? 'Permission Needed'
              : 'Active'}
          </span>
        </span>
      </div>

      {/* Accessibility Edition / Permission Prompt Banner */}
      {needsAccessibilityBanner && (
        <div
          className="p-3 rounded-xl space-y-2"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--status-warning)',
          }}
        >
          <div className="flex items-start gap-2 min-w-0">
            <ShieldAlert
              size={14}
              className="shrink-0 mt-0.5"
              style={{ color: 'var(--status-warning)' }}
            />
            <p
              className="text-[11px] leading-snug"
              style={{ color: 'var(--text-secondary)' }}
            >
              {isStandardWithoutAccessibility
                ? 'You are on the Standard Edition APK, which does not include Android Accessibility Service. Install the Strict Accessibility APK (ZERO-requires-adb) from GitHub Releases to enable Official YouTube Shorts & Study Mode blocking.'
                : 'Enable Zero-Noise under Settings → Accessibility → Installed apps. On Android 13–16, if the switch is grayed out ("Restricted setting"), tap App Info below → ⋮ (top-right) → Allow restricted settings first.'}
            </p>
          </div>
          {!isStandardWithoutAccessibility && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleOpenAccessibilitySettings}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                }}
              >
                <span>Open Accessibility</span>
                <ExternalLink size={11} />
              </button>
              <button
                type="button"
                onClick={handleOpenAppInfoSettings}
                className="px-3 py-1.5 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: '1px solid var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                <span>App Info (Restricted Settings)</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toggle Rows */}
      <div className="space-y-2">
        {/* Toggle 1: Block YouTube Shorts */}
        <div
          className="p-3 rounded-xl flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div
              className="text-xs font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Block YouTube Shorts
            </div>
            <p
              className="text-[11px] leading-snug mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Instantly exits Shorts inside the official YouTube app.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.blockOfficialShorts}
            aria-label="Block YouTube Shorts"
            onClick={() => handleToggle('blockOfficialShorts')}
            className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center"
            style={{
              backgroundColor: config.blockOfficialShorts
                ? 'var(--accent-primary)'
                : 'var(--bg-primary)',
              border: `1px solid ${config.blockOfficialShorts ? 'var(--accent-border)' : 'var(--border-strong)'}`,
              justifyContent: config.blockOfficialShorts ? 'flex-end' : 'flex-start',
            }}
          >
            <span
              className="w-4 h-4 rounded-full block transition-transform"
              style={{
                backgroundColor: config.blockOfficialShorts
                  ? 'var(--text-on-accent)'
                  : 'var(--text-muted)',
              }}
            />
          </button>
        </div>

        {/* Toggle 2: Official App Study Mode */}
        <div
          className="p-3 rounded-xl flex items-center justify-between gap-3"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Official App Study Mode
              </span>
              <span
                className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-muted)',
                }}
              >
                {whitelistCount} {whitelistCount === 1 ? 'channel' : 'channels'}
              </span>
            </div>
            <p
              className="text-[11px] leading-snug mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Only allows your ZeroTube whitelisted channels inside the official YouTube app.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.strictOfficialStudyMode}
            aria-label="Official App Study Mode"
            onClick={() => handleToggle('strictOfficialStudyMode')}
            className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 flex items-center"
            style={{
              backgroundColor: config.strictOfficialStudyMode
                ? 'var(--accent-primary)'
                : 'var(--bg-primary)',
              border: `1px solid ${config.strictOfficialStudyMode ? 'var(--accent-border)' : 'var(--border-strong)'}`,
              justifyContent: config.strictOfficialStudyMode ? 'flex-end' : 'flex-start',
            }}
          >
            <span
              className="w-4 h-4 rounded-full block transition-transform"
              style={{
                backgroundColor: config.strictOfficialStudyMode
                  ? 'var(--text-on-accent)'
                  : 'var(--text-muted)',
              }}
            />
          </button>
        </div>
      </div>
    </div>
  );
};
