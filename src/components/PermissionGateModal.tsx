import React from 'react';
import type { NativePermissionStatus } from '../types';
import {
  ShieldAlert,
  CheckCircle2,
  X,
  Accessibility,
  Layers,
  Activity,
  Bell,
  HelpCircle,
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

  const needsAccessibility = permissions.isStrictAccessibilityBuild;
  const needsUsage = !permissions.isStrictAccessibilityBuild;

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-5 shadow-2xl font-mono space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Strict Lock Permissions
              </h2>
              <p className="text-[11px] text-zinc-400">
                Required so locks cannot be trivially dismissed
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

        <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl text-[11px] text-zinc-300 leading-relaxed space-y-2.5">
          <div>
            Zero does <strong>not</strong> rely on easy Android Screen Pinning. Grant these permissions once so{' '}
            <strong>The Void</strong> blocks unbagged apps, Quick Settings, and app switches seamlessly.
          </div>
          {!permissions.strictReady && (
            <button
              type="button"
              onClick={() => window.ZeroNative?.requestNextMissingPermission()}
              className="w-full py-2.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
            >
              Grant Next Missing Permission →
            </button>
          )}
        </div>

        <div className="space-y-2.5">
          {/* 1. Accessibility Service (Strict Edition) */}
          {needsAccessibility && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Accessibility size={16} className="text-amber-400" />
                  <span>1. Accessibility Service (Required)</span>
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
                Monitors foreground window changes to block Recents, Settings, notification drawer pull-downs, and apps outside your Bag. Zero never reads personal content or keystrokes.
              </p>
              {!permissions.isAccessibilityEnabled && (
                <div className="flex flex-col gap-1.5 pt-1">
                  <button
                    onClick={() => window.ZeroNative?.openAccessibilitySettings()}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
                  >
                    Enable Zero Accessibility Service
                  </button>
                  <button
                    onClick={() => window.ZeroNative?.openAppSettingsDetails()}
                    className="w-full py-2 rounded-xl bg-zinc-950 hover:bg-zinc-850 text-zinc-300 border border-zinc-700 text-[11px] flex items-center justify-center gap-1.5"
                  >
                    <HelpCircle size={13} />
                    <span>Greyed out? App Info -&gt; Allow Restricted Settings</span>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* 2. Usage Access (Standard Sideload Edition) */}
          {needsUsage && (
            <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-xs font-bold text-white">
                  <Activity size={16} className="text-amber-400" />
                  <span>1. Usage Access Guard (Required)</span>
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
                <button
                  onClick={() => window.ZeroNative?.requestUsageStatsPermission()}
                  className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
                >
                  Grant Usage Access -&gt; Find Zero
                </button>
              )}
            </div>
          )}

          {/* 3. Display Over Other Apps (Both Editions) */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Layers size={16} className="text-cyan-400" />
                <span>2. Display Over Other Apps (Required)</span>
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
                onClick={() => window.ZeroNative?.requestOverlayPermission()}
                className="w-full py-2.5 rounded-xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider active:scale-95 transition-all"
              >
                Allow Display Over Other Apps
              </button>
            )}
          </div>

          {/* 4. Notifications */}
          <div className="p-3.5 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Bell size={16} className="text-zinc-300" />
                <span>3. Lock & Pre-Lock Notifications</span>
              </div>
              {permissions.hasNotificationPermission ? (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded-full">
                  <CheckCircle2 size={11} /> GRANTED
                </span>
              ) : (
                <span className="text-[10px] font-bold text-zinc-300 bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded-full">
                  RECOMMENDED
                </span>
              )}
            </div>
            {!permissions.hasNotificationPermission && (
              <button
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
            onClick={onRefresh}
            className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-700 text-zinc-300 hover:text-white text-xs font-bold"
          >
            Re-check
          </button>
          <button
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
