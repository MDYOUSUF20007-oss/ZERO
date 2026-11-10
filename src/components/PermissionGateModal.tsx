import React from 'react';
import type { NativePermissionStatus } from '../types';
import { evaluatePermissionPriority } from '../utils/permissionPriority';
import { RestrictedSettingsGuideCard } from './RestrictedSettingsGuideCard';
import {
  ShieldAlert,
  CheckCircle2,
  X,
  Accessibility,
  Layers,
  Activity,
  Bell,
  Settings,
  ExternalLink,
} from 'lucide-react';

interface PermissionGateModalProps {
  isOpen: boolean;
  permissions: NativePermissionStatus;
  onClose: () => void;
  onRefresh: () => void;
  onProceedReady?: () => void;
}

export const PermissionGateModal: React.FC<PermissionGateModalProps> = ({
  isOpen,
  permissions,
  onClose,
  onRefresh,
  onProceedReady,
}) => {
  if (!isOpen) return null;

  const priority = evaluatePermissionPriority(permissions);
  const needsAccessibility = permissions.isStrictAccessibilityBuild;
  const needsUsage = !permissions.isStrictAccessibilityBuild;

  const openAppInfoShortcut = () => {
    window.ZeroNative?.openAppSettingsDetails();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-5 shadow-2xl font-mono space-y-4 max-h-full overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Permissions &amp; Access Setup
              </h2>
              <p className="text-[11px] text-zinc-400">
                Strict priority order so Zero cannot be bypassed
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
            aria-label="Close"
          >
            <X size={16} />
          </button>
        </div>

        {/* Top Smart Action Box: Grant Missing Permissions + Priority Order + Quick App Info Shortcut */}
        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl text-[11px] text-zinc-300 leading-relaxed space-y-2.5">
          <div>
            Priority order:{' '}
            <strong className="text-white">
              1. Check Restricted Settings &rarr; 2. {needsAccessibility ? 'Accessibility' : 'Usage Access (Find Zero)'} &rarr; 3. Display Over Apps &rarr; 4. Notifications
            </strong>
            .
          </div>

          {!priority.allRecommendedGranted && (
            <button
              type="button"
              onClick={() => window.ZeroNative?.requestNextMissingPermission()}
              className="w-full py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              {priority.nextButtonLabel}
            </button>
          )}

          {/* Always-handy App Info shortcut + Green hint right below Grant Missing Permissions */}
          <div className="flex items-center justify-between gap-2 pt-0.5">
            <button
              type="button"
              onClick={openAppInfoShortcut}
              className="w-full py-2 px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-950/80 border border-emerald-500/70 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5 active:scale-95 transition-all"
            >
              <Settings size={13} />
              <span>Shortcut: Open Zero App Info</span>
              <ExternalLink size={12} />
            </button>
          </div>
        </div>

        <div className="space-y-2.5">
          {/* PRIORITY 1: Check Allow Restricted Settings (App Info) */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Settings size={16} className="text-emerald-400 shrink-0" />
                <span>1. Allow Restricted Settings Check</span>
              </div>
              {priority.restrictedStatus === 'allowed' ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> ALLOWED
                </span>
              ) : priority.restrictedStatus === 'blocked' ? (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-700 px-2 py-0.5 rounded-full">
                  BLOCKED
                </span>
              ) : (
                <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/60 border border-emerald-700 px-2 py-0.5 rounded-full">
                  CHECK APP INFO
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              {priority.restrictedStatus === 'allowed'
                ? 'Restricted settings check is clear on this device.'
                : 'Android 13–16 phones often block sideloaded apps on the first try until you tap ⋮ -> Allow restricted settings inside Zero App Info.'}
            </p>
            {priority.restrictedStatus !== 'allowed' && (
              <button
                type="button"
                onClick={openAppInfoShortcut}
                className="w-full py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-800 border border-emerald-500/70 text-emerald-300 font-bold text-[11px] flex items-center justify-center gap-1.5"
              >
                <Settings size={13} />
                <span>Open Zero App Info &rarr; &#8942; Allow Restricted Settings</span>
              </button>
            )}
          </div>

          {/* PRIORITY 2A: Accessibility Service (Strict Edition) */}
          {needsAccessibility && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Accessibility size={16} className="text-amber-400 shrink-0" />
                  <span>2. Accessibility Service (Required)</span>
                </div>
                {permissions.isAccessibilityEnabled ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> GRANTED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                    MISSING
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Monitors foreground window changes to block Recents, Settings, notification drawer pull-downs, and apps outside your Bag.
              </p>
              {!permissions.isAccessibilityEnabled && (
                <div className="space-y-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => window.ZeroNative?.openAccessibilitySettings()}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Enable Zero Accessibility Service
                  </button>
                  <RestrictedSettingsGuideCard
                    restrictedStatus={priority.restrictedStatus}
                    isStrictBuild={true}
                    onOpenAppInfo={openAppInfoShortcut}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* PRIORITY 2B: Usage Access (Standard Edition) */}
          {needsUsage && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Activity size={16} className="text-amber-400 shrink-0" />
                  <span>2. Usage Access Guard (Required)</span>
                </div>
                {permissions.hasUsageStatsPermission ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                    <CheckCircle2 size={11} /> GRANTED
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                    MISSING
                  </span>
                )}
              </div>
              <p className="text-[11px] text-zinc-400 leading-relaxed">
                Detects foreground app transitions so Zero can permit your packed Bag apps + Calls/SMS while snapping back over any blocked distraction.
              </p>
              {!permissions.hasUsageStatsPermission && (
                <div className="space-y-2.5 pt-0.5">
                  <button
                    type="button"
                    onClick={() => window.ZeroNative?.requestUsageStatsPermission()}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Grant Usage Access -&gt; Find Zero
                  </button>

                  {/* Green Step-by-Step Guide directly under the Usage Access -> Find Zero button */}
                  <RestrictedSettingsGuideCard
                    restrictedStatus={priority.restrictedStatus}
                    isStrictBuild={false}
                    onOpenAppInfo={openAppInfoShortcut}
                    compact
                  />
                </div>
              )}
            </div>
          )}

          {/* PRIORITY 3: Display Over Other Apps */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Layers size={16} className="text-cyan-400 shrink-0" />
                <span>3. Display Over Other Apps (Required)</span>
              </div>
              {permissions.hasOverlayPermission ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> GRANTED
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                  MISSING
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Allows The Void to snap back on screen immediately from the background whenever someone leaves Zero or exits a Bag app.
            </p>
            {!permissions.hasOverlayPermission && (
              <button
                type="button"
                onClick={() => window.ZeroNative?.requestOverlayPermission()}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Allow Display Over Other Apps
              </button>
            )}
          </div>

          {/* PRIORITY 4: Notifications */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Bell size={16} className="text-zinc-300 shrink-0" />
                <span>4. Lock &amp; Pre-Lock Notifications</span>
              </div>
              {permissions.hasNotificationPermission ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> GRANTED
                </span>
              ) : (
                <span className="text-[10px] font-bold text-amber-300 bg-amber-950/60 border border-amber-800 px-2 py-0.5 rounded-full">
                  STEP 4
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Shows active countdown status, 5-minute pre-lock schedule warnings, and keeps Android Watchdog prioritized.
            </p>
            {!permissions.hasNotificationPermission && (
              <button
                type="button"
                onClick={() => window.ZeroNative?.requestNotificationPermission()}
                className="w-full py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs active:scale-95 transition-all"
              >
                Allow Notifications
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={onRefresh}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold"
          >
            Re-check
          </button>
          <button
            type="button"
            onClick={() => {
              onRefresh();
              if (permissions.strictReady && onProceedReady) {
                onProceedReady();
              } else {
                onClose();
              }
            }}
            className={`flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
              permissions.strictReady
                ? 'bg-emerald-400 hover:bg-emerald-300 text-black'
                : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
            }`}
          >
            {permissions.strictReady ? 'All Armed — Ready to Lock' : 'Done for Now'}
          </button>
        </div>
      </div>
    </div>
  );
};
