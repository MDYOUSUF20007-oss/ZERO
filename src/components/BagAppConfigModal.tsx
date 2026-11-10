import React, { useState, useEffect } from 'react';
import type {
  AppAccessMode,
  AppLockRuleConfig,
  BagApp,
  ShortVideoAction,
} from '../types';
import {
  createDefaultAppRuleConfig,
  formatCompactDuration,
  isCompulsoryDialerPackage,
  isProtectedSystemPackage,
  sanitizeAppRuleConfig,
} from '../utils/bagAppConfig';
import { X, ShieldAlert, Trash2, Check, Lock } from 'lucide-react';

interface BagAppConfigModalProps {
  isOpen: boolean;
  bagName: string;
  app: BagApp | null;
  isPackedInBag: boolean;
  readOnly?: boolean;
  onClose: () => void;
  onSaveRule: (app: BagApp, ruleConfig: AppLockRuleConfig) => void;
  onRemoveFromBag?: (app: BagApp) => void;
}

const BRUTAL_CARD_STYLE: React.CSSProperties = {
  backgroundColor: '#000000',
  border: '1px solid #222222',
  color: '#FFFFFF',
  borderRadius: '0px',
};

const BRUTAL_SECTION_STYLE: React.CSSProperties = {
  backgroundColor: '#050505',
  border: '1px solid #222222',
  borderRadius: '0px',
};

const BRUTAL_INPUT_STYLE: React.CSSProperties = {
  backgroundColor: '#000000',
  border: '1px solid #222222',
  color: '#FFFFFF',
  borderRadius: '0px',
};

function parseNonNegInt(raw: string, max: number): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, Math.floor(n));
}

export const BagAppConfigModal: React.FC<BagAppConfigModalProps> = ({
  isOpen,
  bagName,
  app,
  isPackedInBag,
  readOnly = false,
  onClose,
  onSaveRule,
  onRemoveFromBag,
}) => {
  const isCompulsory = isCompulsoryDialerPackage(app);
  const isProtectedSystem = isProtectedSystemPackage(app?.packageName);

  const [rule, setRule] = useState<AppLockRuleConfig>(() =>
    createDefaultAppRuleConfig('controlled')
  );

  useEffect(() => {
    if (!isOpen || !app) return;
    if (isProtectedSystem) {
      setRule(createDefaultAppRuleConfig('hard_block'));
      return;
    }
    if (isCompulsory) {
      setRule(createDefaultAppRuleConfig('unrestricted'));
      return;
    }
    if (app.ruleConfig) {
      setRule(sanitizeAppRuleConfig(app.ruleConfig, { defaultMode: 'controlled' }));
    } else if (isPackedInBag) {
      // Legacy packed apps default to unrestricted until user switches them
      setRule(createDefaultAppRuleConfig('unrestricted'));
    } else {
      // Newly selected app opens directly ready for custom controlled setup
      setRule(createDefaultAppRuleConfig('controlled'));
    }
  }, [isOpen, app, isPackedInBag, isCompulsory, isProtectedSystem]);

  if (!isOpen || !app) return null;

  const isModeLocked = readOnly || isCompulsory || isProtectedSystem;
  const isControlled = rule.mode === 'controlled' && !isCompulsory && !isProtectedSystem;

  // Quota hours + minutes split
  const quotaHours = Math.floor(rule.quotaSeconds / 3600);
  const quotaMinutes = Math.floor((rule.quotaSeconds % 3600) / 60);

  // Continuous session minutes + seconds split
  const contMinutes = Math.floor(rule.maxContinuousSeconds / 60);
  const contSeconds = rule.maxContinuousSeconds % 60;

  // Cooldown minutes + seconds split
  const coolMinutes = Math.floor(rule.cooldownSeconds / 60);
  const coolSeconds = rule.cooldownSeconds % 60;

  // Nudge interval minutes + seconds split
  const nudgeMinutes = Math.floor(rule.nudgeIntervalSeconds / 60);
  const nudgeSeconds = rule.nudgeIntervalSeconds % 60;

  const setQuotaParts = (hours: number, minutes: number) => {
    const h = Math.max(0, Math.min(720, hours));
    const m = Math.max(0, Math.min(59, minutes));
    setRule((prev) => ({ ...prev, quotaSeconds: h * 3600 + m * 60 }));
  };

  const setContinuousParts = (minutes: number, seconds: number) => {
    const m = Math.max(0, Math.min(1440, minutes));
    const s = Math.max(0, Math.min(59, seconds));
    setRule((prev) => ({ ...prev, maxContinuousSeconds: m * 60 + s }));
  };

  const setCooldownParts = (minutes: number, seconds: number) => {
    const m = Math.max(0, Math.min(1440, minutes));
    const s = Math.max(0, Math.min(59, seconds));
    setRule((prev) => ({ ...prev, cooldownSeconds: m * 60 + s }));
  };

  const setNudgeParts = (minutes: number, seconds: number) => {
    const m = Math.max(0, Math.min(1440, minutes));
    const s = Math.max(0, Math.min(59, seconds));
    setRule((prev) => ({ ...prev, nudgeIntervalSeconds: m * 60 + s }));
  };

  const renderToggleRow = (
    label: string,
    hint: string,
    checked: boolean,
    onToggle: () => void,
    disabled = false
  ) => (
    <button
      type="button"
      disabled={disabled || readOnly}
      onClick={onToggle}
      style={{
        backgroundColor: '#000000',
        border: `1px solid ${checked ? '#FFFFFF' : '#222222'}`,
        borderRadius: '0px',
      }}
      className="w-full p-3 flex items-center justify-between gap-3 text-left disabled:opacity-45"
    >
      <div className="min-w-0">
        <div className="text-xs font-mono font-bold uppercase tracking-wider text-white">
          {label}
        </div>
        <div className="text-[11px] font-mono text-zinc-400 mt-0.5 leading-snug">{hint}</div>
      </div>
      <span
        style={{
          backgroundColor: checked ? '#FFFFFF' : '#000000',
          color: checked ? '#000000' : '#A1A1AA',
          border: `1px solid ${checked ? '#FFFFFF' : '#222222'}`,
          borderRadius: '0px',
        }}
        className="px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-widest shrink-0"
      >
        {checked ? 'ON' : 'OFF'}
      </span>
    </button>
  );

  const handleSave = () => {
    if (readOnly) return;
    const sanitized = sanitizeAppRuleConfig(rule, {
      isCompulsory,
      isProtectedSystem,
      defaultMode: 'controlled',
    });
    onSaveRule(app, sanitized);
  };

  return (
    <div
      data-brutalist-panel="true"
      className="fixed inset-0 z-[70] flex items-center justify-center px-3 sm:px-4"
      style={{
        backgroundColor: 'rgba(0, 0, 0, 0.94)',
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <div
        style={BRUTAL_CARD_STYLE}
        className="w-full max-w-md max-h-full flex flex-col overflow-hidden"
      >
        {/* Top Brutalist Header */}
        <div
          style={{ borderBottom: '1px solid #222222', backgroundColor: '#000000' }}
          className="p-4 flex items-start justify-between gap-3 shrink-0"
        >
          <div className="min-w-0">
            <div className="text-[10px] font-mono uppercase tracking-[0.2em] text-zinc-400">
              BAG RULE // {bagName.toUpperCase()}
            </div>
            <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-white truncate mt-1">
              {app.appName}
            </h3>
            <div className="text-[11px] font-mono text-zinc-400 truncate mt-0.5">
              {app.packageName}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#000000',
              border: '1px solid #222222',
              borderRadius: '0px',
            }}
            className="p-2 text-zinc-300 hover:text-white shrink-0"
            aria-label="Close app configuration"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Config Form */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">
          {isCompulsory && (
            <div
              style={{
                backgroundColor: '#050505',
                border: '1px solid #FFFFFF',
                borderRadius: '0px',
              }}
              className="p-3 flex items-start gap-2.5 text-xs font-mono text-zinc-200"
            >
              <Lock size={14} className="shrink-0 mt-0.5 text-white" />
              <span>
                COMPULSORY DIALER: Phone calls are forced{' '}
                <strong className="text-white">UNRESTRICTED</strong> so emergency and voice calls
                always connect cleanly during lock sessions.
              </span>
            </div>
          )}

          {isProtectedSystem && (
            <div
              style={{
                backgroundColor: '#050505',
                border: '1px solid #EF4444',
                borderRadius: '0px',
              }}
              className="p-3 flex items-start gap-2.5 text-xs font-mono text-red-300"
            >
              <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-400" />
              <span>
                PROTECTED OS PACKAGE: System Settings & Package Installers are permanently{' '}
                <strong>HARD BLOCKED</strong> to prevent lock bypasses.
              </span>
            </div>
          )}

          {/* 1. ACCESS MODE SELECTOR */}
          <div style={BRUTAL_SECTION_STYLE} className="p-3.5 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                01 // ACCESS MODE
              </span>
              <span className="text-[10px] font-mono uppercase text-zinc-400">
                {rule.mode}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'hard_block', label: 'HARD BLOCK', desc: 'Sealed' },
                  { id: 'controlled', label: 'CONTROLLED', desc: 'Quotas & Friction' },
                  { id: 'unrestricted', label: 'UNRESTRICTED', desc: 'No limits' },
                ] as const
              ).map((opt) => {
                const selected = rule.mode === opt.id;
                const modeDisabled = isModeLocked && rule.mode !== opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    disabled={modeDisabled}
                    onClick={() =>
                      setRule((prev) => ({
                        ...prev,
                        mode: opt.id as AppAccessMode,
                      }))
                    }
                    style={{
                      backgroundColor: selected ? '#FFFFFF' : '#000000',
                      color: selected ? '#000000' : '#E4E4E7',
                      border: `1px solid ${selected ? '#FFFFFF' : '#222222'}`,
                      borderRadius: '0px',
                    }}
                    className="p-2.5 text-left transition-none disabled:opacity-40"
                  >
                    <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                      {opt.label}
                    </div>
                    <div
                      className="text-[9px] font-mono mt-0.5"
                      style={{ color: selected ? '#27272A' : '#A1A1AA' }}
                    >
                      {opt.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* 2. GRANULAR QUOTA & SESSION TIMERS */}
          {isControlled && (
            <div style={BRUTAL_SECTION_STYLE} className="p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                  02 // QUOTA &amp; SESSION TIMERS
                </span>
                <span className="text-[10px] font-mono text-zinc-400">0 = OFF / UNLIMITED</span>
              </div>

              {/* Total Bag Quota */}
              <div
                style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-white">
                      Total Bag Quota
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      Current: {formatCompactDuration(rule.quotaSeconds, 'Unlimited')}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRule((prev) => ({ ...prev, quotaSeconds: 0 }))}
                    style={{
                      backgroundColor: rule.quotaSeconds === 0 ? '#FFFFFF' : '#000000',
                      color: rule.quotaSeconds === 0 ? '#000000' : '#D4D4D8',
                      border: `1px solid ${rule.quotaSeconds === 0 ? '#FFFFFF' : '#222222'}`,
                      borderRadius: '0px',
                    }}
                    className="px-2 py-1 text-[10px] font-mono font-bold uppercase"
                  >
                    Unlimited
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Hours</span>
                    <input
                      type="number"
                      min={0}
                      max={720}
                      disabled={readOnly}
                      value={quotaHours}
                      onChange={(e) => setQuotaParts(parseNonNegInt(e.target.value, 720), quotaMinutes)}
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      disabled={readOnly}
                      value={quotaMinutes}
                      onChange={(e) => setQuotaParts(quotaHours, parseNonNegInt(e.target.value, 59))}
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Continuous Session Limit */}
              <div
                style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-white">
                      Continuous Session Limit
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      Triggers cooldown after {formatCompactDuration(rule.maxContinuousSeconds, 'Off')}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRule((prev) => ({ ...prev, maxContinuousSeconds: 0 }))}
                    style={{
                      backgroundColor: rule.maxContinuousSeconds === 0 ? '#FFFFFF' : '#000000',
                      color: rule.maxContinuousSeconds === 0 ? '#000000' : '#D4D4D8',
                      border: `1px solid ${rule.maxContinuousSeconds === 0 ? '#FFFFFF' : '#222222'}`,
                      borderRadius: '0px',
                    }}
                    className="px-2 py-1 text-[10px] font-mono font-bold uppercase"
                  >
                    Off
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      disabled={readOnly}
                      value={contMinutes}
                      onChange={(e) =>
                        setContinuousParts(parseNonNegInt(e.target.value, 1440), contSeconds)
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Seconds</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      disabled={readOnly}
                      value={contSeconds}
                      onChange={(e) =>
                        setContinuousParts(contMinutes, parseNonNegInt(e.target.value, 59))
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                </div>
              </div>

              {/* Cooldown Duration */}
              <div
                style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-white">
                      Cooldown Lock Duration
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      Lockout: {formatCompactDuration(rule.cooldownSeconds, 'Off (0s)')}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      disabled={readOnly}
                      value={coolMinutes}
                      onChange={(e) =>
                        setCooldownParts(parseNonNegInt(e.target.value, 1440), coolSeconds)
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Seconds</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      disabled={readOnly}
                      value={coolSeconds}
                      onChange={(e) =>
                        setCooldownParts(coolMinutes, parseNonNegInt(e.target.value, 59))
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3. MINDFUL FRICTION CONTROLS */}
          {isControlled && (
            <div style={BRUTAL_SECTION_STYLE} className="p-3.5 space-y-2.5">
              <span className="block text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                03 // MINDFUL FRICTION CONTROLS
              </span>

              {renderToggleRow(
                'Enable Mindful Friction',
                'Pause opening this app behind a native wait & intent shield.',
                rule.frictionEnabled,
                () =>
                  setRule((prev) => ({
                    ...prev,
                    frictionEnabled: !prev.frictionEnabled,
                  }))
              )}

              {rule.frictionEnabled && (
                <div className="space-y-2.5 pt-1">
                  <div
                    style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                    className="p-3 space-y-2"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-mono font-bold uppercase text-white">
                        Friction Wait Time (Seconds)
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={3600}
                        disabled={readOnly}
                        value={rule.frictionDelaySeconds}
                        onChange={(e) =>
                          setRule((prev) => ({
                            ...prev,
                            frictionDelaySeconds: parseNonNegInt(e.target.value, 3600),
                          }))
                        }
                        style={BRUTAL_INPUT_STYLE}
                        className="w-20 px-2 py-1 text-right text-xs font-mono tabular-nums outline-none"
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={120}
                      step={1}
                      disabled={readOnly}
                      value={Math.min(120, rule.frictionDelaySeconds)}
                      onChange={(e) =>
                        setRule((prev) => ({
                          ...prev,
                          frictionDelaySeconds: parseNonNegInt(e.target.value, 3600),
                        }))
                      }
                      className="w-full accent-white cursor-pointer"
                    />
                  </div>

                  {renderToggleRow(
                    'Breathing Guide Ring',
                    'Show an expanding & contracting white geometric ring during wait.',
                    rule.showBreathingCircle,
                    () =>
                      setRule((prev) => ({
                        ...prev,
                        showBreathingCircle: !prev.showBreathingCircle,
                      }))
                  )}

                  {renderToggleRow(
                    'Intent Verification Prompt',
                    'Require typing your reason for opening before Proceed unlocks.',
                    rule.requireIntentText,
                    () =>
                      setRule((prev) => ({
                        ...prev,
                        requireIntentText: !prev.requireIntentText,
                      }))
                  )}

                  {rule.requireIntentText && (
                    <label
                      style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                      className="p-3 flex items-center justify-between gap-3"
                    >
                      <div>
                        <div className="text-xs font-mono font-bold uppercase text-white">
                          Minimum Intent Length (Chars)
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Prevents single-letter bypasses
                        </div>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={500}
                        disabled={readOnly}
                        value={rule.minIntentChars}
                        onChange={(e) =>
                          setRule((prev) => ({
                            ...prev,
                            minIntentChars: parseNonNegInt(e.target.value, 500),
                          }))
                        }
                        style={BRUTAL_INPUT_STYLE}
                        className="w-20 px-2 py-1.5 text-right text-xs font-mono tabular-nums outline-none"
                      />
                    </label>
                  )}

                  <label
                    style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                    className="p-3 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-xs font-mono font-bold uppercase text-white">
                        Re-Entry Grace Period (Seconds)
                      </div>
                      <div className="text-[10px] font-mono text-zinc-400">
                        Skip re-friction across brief switches (e.g. OTP)
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={86400}
                      disabled={readOnly}
                      value={rule.reEntryGraceSeconds}
                      onChange={(e) =>
                        setRule((prev) => ({
                          ...prev,
                          reEntryGraceSeconds: parseNonNegInt(e.target.value, 86400),
                        }))
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="w-24 px-2 py-1.5 text-right text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                </div>
              )}
            </div>
          )}

          {/* 4. IN-APP ANTI-SCROLL INTERVENTIONS */}
          {isControlled && (
            <div style={BRUTAL_SECTION_STYLE} className="p-3.5 space-y-2.5">
              <span className="block text-[11px] font-mono font-bold uppercase tracking-widest text-white">
                04 // IN-APP ANTI-SCROLL INTERVENTIONS
              </span>

              {renderToggleRow(
                'Surgical Short-Video Blocker',
                'Block Shorts / Reels video containers while keeping DMs & long-form videos.',
                rule.blockShortVideos,
                () =>
                  setRule((prev) => ({
                    ...prev,
                    blockShortVideos: !prev.blockShortVideos,
                  }))
              )}

              {rule.blockShortVideos && (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'overlay', label: '#000000 OVERLAY', desc: 'Black container shield' },
                      { id: 'back_action', label: 'BACK ACTION', desc: 'GLOBAL_ACTION_BACK' },
                    ] as const
                  ).map((act) => {
                    const selected = rule.shortVideoAction === act.id;
                    return (
                      <button
                        key={act.id}
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          setRule((prev) => ({
                            ...prev,
                            shortVideoAction: act.id as ShortVideoAction,
                          }))
                        }
                        style={{
                          backgroundColor: selected ? '#FFFFFF' : '#000000',
                          color: selected ? '#000000' : '#E4E4E7',
                          border: `1px solid ${selected ? '#FFFFFF' : '#222222'}`,
                          borderRadius: '0px',
                        }}
                        className="p-2.5 text-left"
                      >
                        <div className="text-[10px] font-mono font-bold uppercase">
                          {act.label}
                        </div>
                        <div
                          className="text-[9px] font-mono mt-0.5"
                          style={{ color: selected ? '#27272A' : '#A1A1AA' }}
                        >
                          {act.desc}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              <label
                style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                className="p-3 flex items-center justify-between gap-3"
              >
                <div>
                  <div className="text-xs font-mono font-bold uppercase text-white">
                    Scroll Velocity Guard (Events / 10s)
                  </div>
                  <div className="text-[10px] font-mono text-zinc-400">
                    Trigger pause overlay above limit (0 = Off)
                  </div>
                </div>
                <input
                  type="number"
                  min={0}
                  max={5000}
                  disabled={readOnly}
                  value={rule.scrollVelocityLimit}
                  onChange={(e) =>
                    setRule((prev) => ({
                      ...prev,
                      scrollVelocityLimit: parseNonNegInt(e.target.value, 5000),
                    }))
                  }
                  style={BRUTAL_INPUT_STYLE}
                  className="w-20 px-2 py-1.5 text-right text-xs font-mono tabular-nums outline-none"
                />
              </label>

              <div
                style={{ backgroundColor: '#000000', border: '1px solid #222222' }}
                className="p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-mono font-bold uppercase text-white">
                      Periodic In-App Nudge
                    </div>
                    <div className="text-[10px] font-mono text-zinc-400">
                      Floating elapsed banner every{' '}
                      {formatCompactDuration(rule.nudgeIntervalSeconds, 'Off (0s)')}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={readOnly}
                    onClick={() => setRule((prev) => ({ ...prev, nudgeIntervalSeconds: 0 }))}
                    style={{
                      backgroundColor: rule.nudgeIntervalSeconds === 0 ? '#FFFFFF' : '#000000',
                      color: rule.nudgeIntervalSeconds === 0 ? '#000000' : '#D4D4D8',
                      border: `1px solid ${rule.nudgeIntervalSeconds === 0 ? '#FFFFFF' : '#222222'}`,
                      borderRadius: '0px',
                    }}
                    className="px-2 py-1 text-[10px] font-mono font-bold uppercase"
                  >
                    Off
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Minutes</span>
                    <input
                      type="number"
                      min={0}
                      max={1440}
                      disabled={readOnly}
                      value={nudgeMinutes}
                      onChange={(e) =>
                        setNudgeParts(parseNonNegInt(e.target.value, 1440), nudgeSeconds)
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                  <label className="block">
                    <span className="text-[10px] font-mono uppercase text-zinc-400">Seconds</span>
                    <input
                      type="number"
                      min={0}
                      max={59}
                      disabled={readOnly}
                      value={nudgeSeconds}
                      onChange={(e) =>
                        setNudgeParts(nudgeMinutes, parseNonNegInt(e.target.value, 59))
                      }
                      style={BRUTAL_INPUT_STYLE}
                      className="mt-1 w-full px-2.5 py-2 text-xs font-mono tabular-nums outline-none"
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Action Bar */}
        <div
          style={{ borderTop: '1px solid #222222', backgroundColor: '#000000' }}
          className="p-3.5 flex items-center gap-2 shrink-0"
        >
          {isPackedInBag && onRemoveFromBag && !readOnly && (
            <button
              type="button"
              onClick={() => onRemoveFromBag(app)}
              style={{
                backgroundColor: '#000000',
                border: '1px solid #EF4444',
                color: '#F87171',
                borderRadius: '0px',
              }}
              className="px-3 py-2.5 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5"
              title="Remove app from Bag"
            >
              <Trash2 size={14} />
              <span>Remove</span>
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              backgroundColor: '#000000',
              border: '1px solid #222222',
              color: '#D4D4D8',
              borderRadius: '0px',
            }}
            className="px-3.5 py-2.5 text-xs font-mono font-bold uppercase tracking-wider"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={readOnly}
            onClick={handleSave}
            style={{
              backgroundColor: '#FFFFFF',
              border: '1px solid #FFFFFF',
              color: '#000000',
              borderRadius: '0px',
            }}
            className="flex-1 py-2.5 px-4 text-xs font-mono font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 disabled:opacity-45"
          >
            <Check size={14} />
            <span>{isPackedInBag ? 'Save Rule' : 'Add & Save Rule'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
