import React from 'react';
import type { NativePermissionStatus } from '../types';
import { evaluatePermissionPriority } from '../utils/permissionPriority';
import { RestrictedSettingsGuideCard } from './RestrictedSettingsGuideCard';
import { ObsidianCard } from './ObsidianCard';
import {
  ShieldAlert,
  CheckCircle2,
  X,
  Accessibility,
  Layers,
  Activity,
  Bell,
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
  const coreGranted = priority.coreGuardGranted;
  const isBlockedNow = priority.restrictedStatus === 'blocked';

  const readyCount =
    (coreGranted ? 1 : 0) +
    (permissions.hasOverlayPermission ? 1 : 0) +
    (permissions.hasNotificationPermission ? 1 : 0);

  const isStep2Active = coreGranted && !permissions.hasOverlayPermission;
  const isStep3Active =
    coreGranted && permissions.hasOverlayPermission && !permissions.hasNotificationPermission;

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
      <ObsidianCard
        ambientGlow
        className="w-full max-w-md max-h-full font-mono"
        headerClassName="p-3.5 sm:p-4 flex-1 min-h-0 overflow-y-auto space-y-2.5"
        footerClassName="px-3.5 py-3 flex items-center gap-2"
        headerContent={
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                  style={
                    permissions.strictReady
                      ? { color: '#34D399' }
                      : { color: 'var(--accent-hex, #F59E0B)' }
                  }
                >
                  {permissions.strictReady ? <CheckCircle2 size={16} /> : <ShieldAlert size={16} />}
                </div>
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wider text-white">
                    Permissions Setup
                  </h2>
                  <p className="text-[11px] text-zinc-400">
                    {readyCount} of 3 ready &bull; Required for locking
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              {/* STEP 1: Core Guard — Usage Access (Standard) or Accessibility (Strict) */}
              <div
                className={`rounded-2xl transition-colors ${
                  !coreGranted ? 'p-3 obsidian-inset space-y-2' : 'p-2.5 obsidian-inset-neutral'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{
                        color: coreGranted ? '#34D399' : 'var(--accent-hex, #F59E0B)',
                      }}
                    >
                      {needsAccessibility ? <Accessibility size={13} /> : <Activity size={13} />}
                    </div>
                    <span className="truncate">
                      1. {needsAccessibility ? 'Accessibility Service' : 'Usage Access'}
                    </span>
                  </div>

                  {coreGranted ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={10} /> GRANTED
                    </span>
                  ) : (
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                        borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                        color: 'var(--accent-hex, #F59E0B)',
                      }}
                    >
                      {isBlockedNow ? 'BLOCKED' : 'STEP 1'}
                    </span>
                  )}
                </div>

                {!coreGranted && (
                  <>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      {needsAccessibility
                        ? 'Blocks Recents, Settings, Notification shade & apps outside Bag.'
                        : 'Select Zero-Distractions in Usage Access so The Void enforces your Bag.'}
                    </p>

                    <button
                      type="button"
                      onClick={() =>
                        needsAccessibility
                          ? window.ZeroNative?.openAccessibilitySettings()
                          : window.ZeroNative?.requestUsageStatsPermission()
                      }
                      className={`w-full py-2 px-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all ${
                        isBlockedNow
                          ? 'obsidian-inset text-zinc-100 font-bold'
                          : 'obsidian-pill-active font-black'
                      }`}
                    >
                      {needsAccessibility ? 'Enable Accessibility Service' : 'Grant Usage Access'}
                    </button>

                    <RestrictedSettingsGuideCard
                      restrictedStatus={priority.restrictedStatus}
                      isStrictBuild={needsAccessibility}
                      onOpenAppInfo={openAppInfoShortcut}
                      compact
                    />
                  </>
                )}
              </div>

              {/* STEP 2: Display Over Other Apps */}
              <div
                className={`rounded-2xl transition-colors ${
                  isStep2Active
                    ? 'p-3 obsidian-inset space-y-2'
                    : 'p-2.5 obsidian-inset-neutral'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{
                        color: permissions.hasOverlayPermission
                          ? '#34D399'
                          : isStep2Active
                          ? 'var(--accent-hex, #F59E0B)'
                          : '#A1A1AA',
                      }}
                    >
                      <Layers size={13} />
                    </div>
                    <span className="truncate">2. Display Over Other Apps</span>
                  </div>

                  {permissions.hasOverlayPermission ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={10} /> GRANTED
                    </span>
                  ) : isStep2Active ? (
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                        borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                        color: 'var(--accent-hex, #F59E0B)',
                      }}
                    >
                      STEP 2
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.requestOverlayPermission()}
                      className="px-2.5 py-1 rounded-lg obsidian-inset-neutral text-[10px] font-bold text-zinc-200 hover:text-white active:scale-95 shrink-0"
                    >
                      Allow
                    </button>
                  )}
                </div>

                {isStep2Active && (
                  <>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Lets The Void return over blocked distractions from the background.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.requestOverlayPermission()}
                      className="w-full py-2 px-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all obsidian-pill-active font-black"
                    >
                      Allow Display Over Other Apps
                    </button>
                  </>
                )}
              </div>

              {/* STEP 3: Notifications */}
              <div
                className={`rounded-2xl transition-colors ${
                  isStep3Active
                    ? 'p-3 obsidian-inset space-y-2'
                    : 'p-2.5 obsidian-inset-neutral'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-white min-w-0">
                    <div
                      className="w-6 h-6 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0"
                      style={{
                        color: permissions.hasNotificationPermission
                          ? '#34D399'
                          : isStep3Active
                          ? 'var(--accent-hex, #F59E0B)'
                          : '#A1A1AA',
                      }}
                    >
                      <Bell size={13} />
                    </div>
                    <span className="truncate">3. Lock Alerts (Optional)</span>
                  </div>

                  {permissions.hasNotificationPermission ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full shrink-0">
                      <CheckCircle2 size={10} /> GRANTED
                    </span>
                  ) : isStep3Active ? (
                    <span
                      className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full border shrink-0"
                      style={{
                        background: 'rgba(var(--accent-rgb, 245, 158, 11), 0.12)',
                        borderColor: 'rgba(var(--accent-rgb, 245, 158, 11), 0.35)',
                        color: 'var(--accent-hex, #F59E0B)',
                      }}
                    >
                      OPTIONAL
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.requestNotificationPermission()}
                      className="px-2.5 py-1 rounded-lg obsidian-inset-neutral text-[10px] font-bold text-zinc-300 hover:text-white active:scale-95 shrink-0"
                    >
                      Allow
                    </button>
                  )}
                </div>

                {isStep3Active && (
                  <>
                    <p className="text-[11px] text-zinc-400 leading-snug">
                      Shows active lock countdowns and 5-minute pre-lock alerts.
                    </p>
                    <button
                      type="button"
                      onClick={() => window.ZeroNative?.requestNotificationPermission()}
                      className="w-full py-2 px-3 rounded-xl text-xs uppercase tracking-wider active:scale-95 transition-all obsidian-pill-active font-black"
                    >
                      Allow Notifications
                    </button>
                  </>
                )}
              </div>
            </div>
          </>
        }
        footerContent={
          <>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3.5 py-2.5 rounded-xl obsidian-inset-neutral text-zinc-200 hover:text-white text-xs font-bold"
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
              className={`flex-1 py-2.5 rounded-xl text-xs uppercase tracking-wider transition-all ${
                permissions.strictReady
                  ? 'obsidian-pill-active font-black'
                  : 'obsidian-inset-neutral text-zinc-200 hover:text-white font-bold'
              }`}
            >
              {permissions.strictReady ? 'All Armed — Ready to Lock' : 'Done for Now'}
            </button>
          </>
        }
      />
    </div>
  );
};
