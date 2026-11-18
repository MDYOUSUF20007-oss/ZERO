import React, { useState, useEffect, useMemo } from 'react';
import {
  GraduationCap,
  ScanSearch,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldBan,
  Loader2,
  Search,
  X,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import type { BagApp } from '../types';
import { haptics } from '../utils/haptics';
import {
  StudyAppsPlugin,
  isStudyAppsNativeAvailable,
  type ScannedStudyCandidate,
  type VerifyStudyAppResult,
} from '../plugins/studyApps';
import {
  COMPULSORY_STUDY_APPS_EVENT,
  MAX_COMPULSORY_STUDY_APPS,
  STORAGE_KEY_STUDY_SCAN_DISMISSED,
  getCompulsoryStudyAppsConfig,
  addCompulsoryStudyApp,
  removeCompulsoryStudyApp,
  setCompulsoryStudyAppsEnabled,
  type CompulsoryStudyAppsConfig,
} from '../utils/compulsoryStudyApps';

interface CompulsoryStudyAppsCardProps {
  installedApps?: BagApp[];
}

export const CompulsoryStudyAppsCard: React.FC<CompulsoryStudyAppsCardProps> = ({
  installedApps: installedAppsProp,
}) => {
  const [nativeInstalledApps, setNativeInstalledApps] = useState<BagApp[]>(() => {
    if (installedAppsProp && installedAppsProp.length > 0) return installedAppsProp;
    try {
      const raw = window.ZeroNative?.getInstalledAppsJson?.();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed as BagApp[];
      }
    } catch {
      // Ignore in web preview
    }
    return [];
  });
  const installedApps =
    installedAppsProp && installedAppsProp.length > 0 ? installedAppsProp : nativeInstalledApps;

  useEffect(() => {
    if (installedAppsProp && installedAppsProp.length > 0) return;
    if (nativeInstalledApps.length > 0) return;
    try {
      const raw = window.ZeroNative?.getInstalledAppsJson?.();
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setNativeInstalledApps(parsed as BagApp[]);
      }
    } catch {
      // Ignore
    }
  }, [installedAppsProp, nativeInstalledApps.length]);
  const [config, setConfig] = useState<CompulsoryStudyAppsConfig>(() =>
    getCompulsoryStudyAppsConfig()
  );
  const [showScanPopup, setShowScanPopup] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState('');
  const [scannedCandidates, setScannedCandidates] = useState<ScannedStudyCandidate[]>([]);
  const [scannedTotalCount, setScannedTotalCount] = useState<number>(0);
  const [hasCompletedScan, setHasCompletedScan] = useState(false);

  const [showManualPicker, setShowManualPicker] = useState(false);
  const [manualQuery, setManualQuery] = useState('');
  const [verifyingPkg, setVerifyingPkg] = useState<string | null>(null);
  const [verifyFeedback, setVerifyFeedback] = useState<VerifyStudyAppResult | null>(null);

  const [scanPromptDismissed, setScanPromptDismissed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_STUDY_SCAN_DISMISSED) === '1';
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const sync = () => setConfig(getCompulsoryStudyAppsConfig());
    window.addEventListener(COMPULSORY_STUDY_APPS_EVENT, sync);
    return () => window.removeEventListener(COMPULSORY_STUDY_APPS_EVENT, sync);
  }, []);

  const slotsFull = config.apps.length >= MAX_COMPULSORY_STUDY_APPS;

  const filteredInstalledApps = useMemo(() => {
    const q = manualQuery.trim().toLowerCase();
    const addedSet = new Set(config.apps.map((a) => a.packageName));
    const list = installedApps.filter((a) => !addedSet.has(a.packageName));
    if (!q) return list.slice(0, 40);
    return list
      .filter(
        (a) =>
          a.appName.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q)
      )
      .slice(0, 40);
  }, [installedApps, manualQuery, config.apps]);

  const handleToggleEnabled = () => {
    haptics.tick(550);
    setConfig(setCompulsoryStudyAppsEnabled(!config.enabled));
  };

  const handleOpenAndRunScan = async () => {
    haptics.tick(650);
    setShowScanPopup(true);
    setScanError('');
    setHasCompletedScan(false);
    setScannedCandidates([]);

    if (!isStudyAppsNativeAvailable()) {
      setScanError('Auto-scan runs natively on Android to inspect installed apps & Play Store categories.');
      return;
    }

    setIsScanning(true);
    try {
      const res = await StudyAppsPlugin.scanInstalledStudyApps();
      setScannedCandidates(res.apps || []);
      setScannedTotalCount(res.scannedCount || 0);
      setHasCompletedScan(true);
    } catch (err) {
      setScanError(err instanceof Error ? err.message : 'Scan failed. Try manual verification.');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddScannedApp = (cand: ScannedStudyCandidate) => {
    if (slotsFull) {
      haptics.thud();
      return;
    }
    haptics.tick(800);
    const updated = addCompulsoryStudyApp({
      packageName: cand.packageName,
      appName: cand.appName,
      categoryLabel: cand.categoryLabel,
      source: cand.source,
      addedAt: Date.now(),
    });
    setConfig(updated);
  };

  const handleManualVerifyAndAdd = async (app: BagApp) => {
    if (slotsFull) {
      haptics.thud();
      return;
    }
    haptics.tick(600);
    setVerifyingPkg(app.packageName);
    setVerifyFeedback(null);

    if (!isStudyAppsNativeAvailable()) {
      setVerifyFeedback({
        packageName: app.packageName,
        appName: app.appName,
        status: 'rejected',
        categoryLabel: 'Preview Mode',
        reason: 'App category verification runs natively on Android.',
        source: 'preview',
      });
      setVerifyingPkg(null);
      return;
    }

    try {
      const res = await StudyAppsPlugin.verifyStudyApp({
        packageName: app.packageName,
        appName: app.appName,
      });
      if (res.status === 'verified') {
        haptics.tick(900);
        const updated = addCompulsoryStudyApp({
          packageName: res.packageName,
          appName: res.appName || app.appName,
          categoryLabel: res.categoryLabel || 'Verified Study App',
          source:
            res.source === 'builtin' || res.source === 'coaching_sdk' || res.source === 'play_store'
              ? res.source
              : 'play_store',
          addedAt: Date.now(),
        });
        setConfig(updated);
        setVerifyFeedback(res);
      } else {
        haptics.thud();
        setVerifyFeedback(res);
      }
    } catch (err) {
      haptics.thud();
      setVerifyFeedback({
        packageName: app.packageName,
        appName: app.appName,
        status: 'rejected',
        categoryLabel: 'Error',
        reason: err instanceof Error ? err.message : 'Verification failed.',
        source: 'error',
      });
    } finally {
      setVerifyingPkg(null);
    }
  };

  const handleConfirmUnlistedManualAdd = (res: VerifyStudyAppResult) => {
    if (slotsFull) return;
    haptics.tick(850);
    const updated = addCompulsoryStudyApp({
      packageName: res.packageName,
      appName: res.appName,
      categoryLabel: 'Verified Private Study APK',
      source: 'manual_unlisted',
      addedAt: Date.now(),
    });
    setConfig(updated);
    setVerifyFeedback({
      ...res,
      status: 'verified',
      reason: 'Added as a verified private study/coaching app.',
    });
  };

  const handleRemoveApp = (packageName: string) => {
    haptics.thud();
    setConfig(removeCompulsoryStudyApp(packageName));
  };

  const dismissFirstTimePrompt = () => {
    setScanPromptDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY_STUDY_SCAN_DISMISSED, '1');
    } catch {
      // Ignore
    }
  };

  return (
    <>
      <div
        className="rounded-3xl p-4 sm:p-5 space-y-4"
        style={{
          backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
          border: '1px solid var(--border-subtle)',
        }}
      >
        {/* Header with Master Toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <div
              className="w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 mt-0.5"
              style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <GraduationCap size={18} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3
                  className="text-sm font-bold tracking-tight"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Compulsory Study Apps
                </h3>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  {config.apps.length}/{MAX_COMPULSORY_STUDY_APPS} SLOTS
                </span>
              </div>
              <p
                className="text-[11px] leading-relaxed mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Available directly inside The Void without packing a Bag. AI assistants are already built in — keep this lean for your main course or online class app (chat &amp; other apps belong in a Bag).
              </p>
            </div>
          </div>

          {/* Toggleable ON/OFF Switch */}
          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            aria-label="Toggle Compulsory Study Apps in The Void"
            onClick={handleToggleEnabled}
            className="w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer shrink-0 mt-0.5"
            style={{
              backgroundColor: config.enabled ? 'var(--accent-primary)' : 'var(--bg-input)',
              border: `1px solid ${config.enabled ? 'var(--accent-primary)' : 'var(--border-strong)'}`,
            }}
          >
            <div
              className="w-4 h-4 rounded-full transition-transform"
              style={{
                backgroundColor: config.enabled ? 'var(--text-on-accent)' : 'var(--text-muted)',
                transform: config.enabled ? 'translateX(20px)' : 'translateX(0px)',
              }}
            />
          </button>
        </div>

        {/* Status Pill */}
        <div
          className="px-3 py-2 rounded-xl text-[11px] flex items-center justify-between gap-2"
          style={{
            backgroundColor: 'var(--bg-primary)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <span style={{ color: 'var(--text-secondary)' }}>
            {config.enabled
              ? config.apps.length > 0
                ? 'Active in The Void — launches without a Bag'
                : 'Enabled — blank until you scan or add a verified study app'
              : 'Paused — hidden from The Void & blocked unless in your active Bag'}
          </span>
          <span
            className="text-[10px] font-mono font-bold shrink-0"
            style={{
              color: config.enabled ? 'var(--status-success)' : 'var(--text-muted)',
            }}
          >
            {config.enabled ? 'ON' : 'OFF'}
          </span>
        </div>

        {/* First-Time Auto-Scan Prompt (when blank & not dismissed) */}
        {config.apps.length === 0 && !scanPromptDismissed && (
          <div
            className="p-3.5 rounded-2xl space-y-2.5"
            style={{
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Sparkles size={13} style={{ color: 'var(--accent-primary)' }} />
                <span
                  className="text-xs font-bold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Find your study or online class app?
                </span>
              </div>
              <button
                type="button"
                aria-label="Dismiss scan prompt"
                onClick={dismissFirstTimePrompt}
                className="p-0.5 cursor-pointer"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={13} />
              </button>
            </div>
            <p className="text-[11px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Auto-Scan detects coaching apps (Paramount, PW, Next Toppers, Classplus, etc.) and class tools like Google Meet while strictly excluding chat, social media, and games.
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAndRunScan}
                className="flex-1 py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                }}
              >
                <ScanSearch size={14} />
                <span>Auto-Scan My Apps</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  haptics.tick(500);
                  setShowManualPicker(true);
                  setVerifyFeedback(null);
                }}
                className="py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <Plus size={13} />
                <span>Manual</span>
              </button>
            </div>
          </div>
        )}

        {/* Added Verified Study Apps List (Blank by default!) */}
        {config.apps.length > 0 && (
          <div className="space-y-2">
            {config.apps.map((app) => (
              <div
                key={app.packageName}
                className="p-3 rounded-2xl flex items-center justify-between gap-2.5"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    {app.appName.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-xs font-bold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {app.appName}
                      </span>
                      <ShieldCheck
                        size={12}
                        className="shrink-0"
                        style={{ color: 'var(--status-success)' }}
                      />
                    </div>
                    <p
                      className="text-[10px] font-mono truncate"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      {app.categoryLabel} • Available in The Void
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  aria-label={`Remove ${app.appName}`}
                  onClick={() => handleRemoveApp(app.packageName)}
                  className="p-2 rounded-xl cursor-pointer shrink-0"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Action Buttons Row */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenAndRunScan}
            disabled={slotsFull}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            <ScanSearch size={14} />
            <span>Auto-Scan Apps</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tick(500);
              setShowManualPicker((prev) => !prev);
              setVerifyFeedback(null);
            }}
            disabled={slotsFull && !showManualPicker}
            className="flex-1 py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-45"
            style={{
              backgroundColor: showManualPicker ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: `1px solid ${showManualPicker ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color: showManualPicker ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            <Plus size={14} />
            <span>{showManualPicker ? 'Close Manual' : 'Add Manually'}</span>
          </button>
        </div>

        {slotsFull && (
          <p className="text-[10px] font-mono text-center" style={{ color: 'var(--text-muted)' }}>
            Max {MAX_COMPULSORY_STUDY_APPS} Compulsory Study App slots reached. Put other apps in a Bag.
          </p>
        )}

        {/* Inline Manual App Picker & Deterministic Verifier */}
        {showManualPicker && (
          <div
            className="p-3.5 rounded-2xl space-y-3 animate-fadeIn"
            style={{
              backgroundColor: 'var(--bg-primary)',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-bold"
                style={{ color: 'var(--text-primary)' }}
              >
                Pick &amp; Verify Study App
              </span>
              <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Chat &amp; games rejected
              </span>
            </div>

            <div className="relative">
              <Search
                size={13}
                className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }}
              />
              <input
                type="text"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                placeholder="Search installed apps (e.g. Paramount, Meet, PW)..."
                className="w-full pl-8 pr-3 py-2 rounded-xl text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>

            {verifyFeedback && (
              <div
                className="p-3 rounded-xl text-xs space-y-2"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: `1px solid ${
                    verifyFeedback.status === 'verified'
                      ? 'var(--status-success)'
                      : verifyFeedback.status === 'unlisted'
                      ? 'var(--status-warning)'
                      : 'var(--status-danger)'
                  }`,
                }}
              >
                <div className="flex items-start gap-2">
                  {verifyFeedback.status === 'verified' ? (
                    <CheckCircle2
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color: 'var(--status-success)' }}
                    />
                  ) : verifyFeedback.status === 'unlisted' ? (
                    <AlertTriangle
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color: 'var(--status-warning)' }}
                    />
                  ) : (
                    <ShieldBan
                      size={14}
                      className="shrink-0 mt-0.5"
                      style={{ color: 'var(--status-danger)' }}
                    />
                  )}
                  <div className="min-w-0">
                    <p className="font-bold" style={{ color: 'var(--text-primary)' }}>
                      {verifyFeedback.appName} — {verifyFeedback.categoryLabel}
                    </p>
                    <p
                      className="text-[11px] mt-0.5 leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {verifyFeedback.reason}
                    </p>
                  </div>
                </div>

                {verifyFeedback.status === 'unlisted' && !slotsFull && (
                  <button
                    type="button"
                    onClick={() => handleConfirmUnlistedManualAdd(verifyFeedback)}
                    className="w-full py-1.5 px-3 rounded-lg text-[11px] font-bold cursor-pointer"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)',
                    }}
                  >
                    Confirm &amp; Add Private Study APK
                  </button>
                )}
              </div>
            )}

            <div className="max-h-52 overflow-y-auto space-y-1.5 pr-0.5">
              {filteredInstalledApps.length === 0 ? (
                <p
                  className="text-[11px] text-center py-4"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {installedApps.length === 0
                    ? 'Installed app list loads natively on Android.'
                    : 'No matching apps found.'}
                </p>
              ) : (
                filteredInstalledApps.map((app) => {
                  const busy = verifyingPkg === app.packageName;
                  return (
                    <div
                      key={app.packageName}
                      className="px-3 py-2 rounded-xl flex items-center justify-between gap-2"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div className="min-w-0">
                        <p
                          className="text-xs font-semibold truncate"
                          style={{ color: 'var(--text-primary)' }}
                        >
                          {app.appName}
                        </p>
                        <p
                          className="text-[9px] font-mono truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {app.packageName}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={busy || Boolean(verifyingPkg) || slotsFull}
                        onClick={() => handleManualVerifyAndAdd(app)}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--text-on-accent)',
                        }}
                      >
                        {busy ? (
                          <Loader2 size={11} className="animate-spin" />
                        ) : (
                          <ShieldCheck size={11} />
                        )}
                        <span>{busy ? 'Checking' : 'Verify'}</span>
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Auto-Scan Results Popup Modal */}
      {showScanPopup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Study App Auto-Scanner"
          className="fixed inset-0 z-[130] flex items-center justify-center p-4 animate-fadeIn"
          style={{
            backgroundColor: 'rgba(4, 8, 16, 0.80)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
          }}
        >
          <div
            className="w-full max-w-md rounded-3xl p-5 space-y-4 max-h-[82vh] flex flex-col"
            style={{
              backgroundColor: 'var(--bg-modal, var(--bg-surface))',
              border: '1px solid var(--border-strong)',
            }}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                <ScanSearch size={18} style={{ color: 'var(--accent-primary)' }} />
                <div>
                  <h4 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                    Study &amp; Class App Scanner
                  </h4>
                  <p className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
                    AI already built-in • Chat &amp; games excluded
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close scanner"
                onClick={() => setShowScanPopup(false)}
                className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  color: 'var(--text-secondary)',
                }}
              >
                <X size={14} />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
              {isScanning ? (
                <div className="py-10 flex flex-col items-center justify-center gap-2.5 text-center">
                  <Loader2
                    size={26}
                    className="animate-spin"
                    style={{ color: 'var(--accent-primary)' }}
                  />
                  <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Scanning installed apps &amp; verifying Play Store categories...
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Filtering out chat apps, social media, and games.
                  </p>
                </div>
              ) : scanError ? (
                <div
                  className="p-4 rounded-2xl text-xs space-y-1.5"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--status-warning)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <p className="font-bold" style={{ color: 'var(--status-warning)' }}>
                    Could not run auto-scan
                  </p>
                  <p>{scanError}</p>
                </div>
              ) : hasCompletedScan && scannedCandidates.length === 0 ? (
                <div
                  className="p-5 rounded-2xl text-center space-y-2"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <p className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                    No study or online class apps detected ({scannedTotalCount} apps checked)
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                    Use &quot;Add Manually&quot; to pick and verify a custom coaching or college app.
                  </p>
                </div>
              ) : (
                <>
                  <p className="text-[10px] font-mono px-0.5" style={{ color: 'var(--text-muted)' }}>
                    FOUND {scannedCandidates.length} VERIFIED STUDY / CLASS APPS (
                    {config.apps.length}/{MAX_COMPULSORY_STUDY_APPS} SLOTS USED)
                  </p>
                  {scannedCandidates.map((cand) => {
                    const alreadyAdded = config.apps.some(
                      (a) => a.packageName === cand.packageName
                    );
                    return (
                      <div
                        key={cand.packageName}
                        className="p-3 rounded-2xl flex items-center justify-between gap-2.5"
                        style={{
                          backgroundColor: 'var(--surface-tonal)',
                          border: `1px solid ${alreadyAdded ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        }}
                      >
                        <div className="min-w-0">
                          <p
                            className="text-xs font-bold truncate"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {cand.appName}
                          </p>
                          <p
                            className="text-[10px] font-mono truncate"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {cand.categoryLabel}
                          </p>
                        </div>

                        {alreadyAdded ? (
                          <span
                            className="px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0"
                            style={{
                              backgroundColor: 'var(--accent-soft)',
                              color: 'var(--accent-primary)',
                            }}
                          >
                            <CheckCircle2 size={11} /> Added
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={slotsFull}
                            onClick={() => handleAddScannedApp(cand)}
                            className="px-3 py-1.5 rounded-lg text-[10px] font-bold cursor-pointer shrink-0 disabled:opacity-45"
                            style={{
                              backgroundColor: 'var(--accent-primary)',
                              color: 'var(--text-on-accent)',
                            }}
                          >
                            Add
                          </button>
                        )}
                      </div>
                    );
                  })}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowScanPopup(false);
                  setShowManualPicker(true);
                  setVerifyFeedback(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                Add Manually Instead
              </button>
              <button
                type="button"
                onClick={() => setShowScanPopup(false)}
                className="px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
