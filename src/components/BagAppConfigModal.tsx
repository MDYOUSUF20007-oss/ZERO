import React, { useState } from 'react';
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
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { X, ShieldAlert, Trash2, Check, Lock, SlidersHorizontal } from 'lucide-react';

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

function parseNonNegInt(raw: string, max: number): number {
  const digits = raw.replace(/[^0-9]/g, '');
  if (!digits) return 0;
  const n = Number(digits);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(max, Math.floor(n));
}

function resolveInitialAppRule(
  app: BagApp,
  isPackedInBag: boolean,
  isCompulsory: boolean,
  isProtectedSystem: boolean
): AppLockRuleConfig {
  if (isProtectedSystem) {
    return createDefaultAppRuleConfig('hard_block');
  }
  if (isCompulsory) {
    return createDefaultAppRuleConfig('unrestricted');
  }
  if (app.ruleConfig) {
    return sanitizeAppRuleConfig(app.ruleConfig, { defaultMode: 'controlled' });
  }
  if (isPackedInBag) {
    return createDefaultAppRuleConfig('unrestricted');
  }
  return createDefaultAppRuleConfig('controlled');
}

export const BagAppConfigModal: React.FC<BagAppConfigModalProps> = ({
  isOpen,
  app,
  ...rest
}) => {
  if (!isOpen || !app) return null;
  return (
    <BagAppConfigModalContent
      key={`${rest.bagName}:${app.packageName}:${rest.isPackedInBag ? '1' : '0'}`}
      {...rest}
      app={app}
    />
  );
};

interface BagAppConfigModalContentProps extends Omit<BagAppConfigModalProps, 'isOpen' | 'app'> {
  app: BagApp;
}

const BagAppConfigModalContent: React.FC<BagAppConfigModalContentProps> = ({
  bagName,
  app,
  isPackedInBag,
  readOnly = false,
  onClose,
  onSaveRule,
  onRemoveFromBag,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass;
  const isCompulsory = isCompulsoryDialerPackage(app);
  const isProtectedSystem = isProtectedSystemPackage(app.packageName);

  const [rule, setRule] = useState<AppLockRuleConfig>(() =>
    resolveInitialAppRule(app, isPackedInBag, isCompulsory, isProtectedSystem)
  );

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
      style={
        !isBespoke && checked
          ? {
              backgroundColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.1)',
              borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.55)',
            }
          : undefined
      }
      className={
        isBespoke
          ? `w-full p-3 rounded-md border flex items-center justify-between gap-3 text-left transition-colors duration-75 disabled:opacity-45 ${
              checked
                ? 'bg-black border-blue-500/70'
                : 'bg-black border-neutral-800 hover:border-neutral-700'
            }`
          : isFluentGlass
          ? `w-full p-3 rounded-xl flex items-center justify-between gap-3 text-left transition-all disabled:opacity-45 ${
              checked ? 'liquid-inset' : 'liquid-row hover:brightness-110'
            }`
          : `w-full p-3 rounded-xl border flex items-center justify-between gap-3 text-left transition-all disabled:opacity-45 ${
              checked
                ? 'obsidian-inset'
                : 'obsidian-inset-neutral hover:border-white/25'
            }`
      }
    >
      <div className="min-w-0">
        <div
          className={`text-xs uppercase tracking-wider text-white ${
            isBespoke ? 'font-semibold' : 'font-mono font-bold'
          }`}
        >
          {label}
        </div>
        <div className="text-[11px] text-zinc-400 mt-0.5 leading-snug">{hint}</div>
      </div>
      <span
        className={
          isBespoke
            ? `px-2.5 py-1 rounded-sm border text-[10px] font-mono font-semibold uppercase tracking-widest shrink-0 ${
                checked
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-neutral-950 border-neutral-800 text-neutral-400'
              }`
            : isFluentGlass
            ? `px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase tracking-widest shrink-0 ${
                checked ? 'liquid-pill-active' : 'liquid-pill text-white/40'
              }`
            : `px-2.5 py-1 rounded-lg text-[10px] uppercase tracking-widest shrink-0 ${
                checked
                  ? 'obsidian-pill-active font-black'
                  : 'obsidian-inset-neutral text-zinc-400 font-bold'
              }`
        }
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

  const sectionCardClass = isFluentGlass
    ? 'p-3.5 rounded-2xl liquid-row space-y-3'
    : isBespoke
    ? 'p-3.5 rounded-md bg-neutral-950 border border-neutral-800 space-y-2.5'
    : 'p-3.5 rounded-2xl obsidian-inset-neutral space-y-3';

  const subCardClass = isFluentGlass
    ? 'p-3 rounded-xl liquid-row space-y-2'
    : isBespoke
    ? 'p-3 rounded-md bg-black border border-neutral-800 space-y-2'
    : 'p-3 rounded-xl obsidian-inset-neutral space-y-2';

  const inputClass = `mt-1 w-full obsidian-input px-2.5 py-2 text-xs font-mono tabular-nums outline-none ${
    isBespoke ? 'rounded-md' : 'rounded-xl'
  }`;

  const inlineNumberInputClass = `obsidian-input px-2 py-1.5 text-right text-xs font-mono tabular-nums outline-none ${
    isBespoke ? 'rounded-md' : 'rounded-xl'
  }`;

  return (
    <div
      className={`fixed inset-0 z-[70] flex items-center justify-center px-3 sm:px-4 ${
        isFluentGlass ? 'bg-black/75 backdrop-blur-sm' : 'bg-black/95'
      }`}
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <ObsidianCard
        ambientGlow={!isBespoke}
        className={`w-full max-w-md max-h-full ${isModernFont ? 'font-sans' : 'font-mono'}`}
        headerClassName="p-5 flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden"
        footerClassName="p-4 flex items-center gap-2"
        headerContent={
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 shrink-0">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={
                    isFluentGlass
                      ? 'liquid-squircle text-cyan-200 mt-0.5'
                      : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 mt-0.5 ${
                          isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                        }`
                  }
                >
                  <SlidersHorizontal
                    size={16}
                    strokeWidth={1.75}
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[10px] font-mono uppercase tracking-[0.2em] truncate"
                    style={{
                      color: isFluentGlass
                        ? '#7DD3FC'
                        : isBespoke
                        ? '#60A5FA'
                        : 'var(--accent-hex, #FFFFFF)',
                    }}
                  >
                    BAG RULE // {bagName.toUpperCase()}
                  </div>
                  <h3
                    className={`text-sm uppercase tracking-wider text-white truncate mt-0.5 ${
                      isModernFont ? 'font-semibold' : 'font-black'
                    }`}
                  >
                    {app.appName}
                  </h3>
                  <div className="text-[11px] font-mono text-zinc-400 truncate">
                    {app.packageName}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={
                  isFluentGlass
                    ? 'p-1.5 rounded-xl liquid-pill text-zinc-400 hover:text-white shrink-0'
                    : isBespoke
                    ? 'p-1.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors duration-75 shrink-0'
                    : 'p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white shrink-0'
                }
                aria-label="Close app configuration"
              >
                <X size={16} strokeWidth={1.75} />
              </button>
            </div>

            {/* Scrollable Config Form */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
              {isCompulsory && (
                <div
                  style={
                    isBespoke
                      ? undefined
                      : {
                          backgroundColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                          borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.55)',
                        }
                  }
                  className={
                    isBespoke
                      ? 'p-3 rounded-md bg-neutral-950 border border-blue-500/60 flex items-start gap-2.5 text-xs text-blue-200'
                      : 'p-3 rounded-2xl border flex items-start gap-2.5 text-xs text-zinc-200'
                  }
                >
                  <Lock
                    size={14}
                    className={isBespoke ? 'shrink-0 mt-0.5 text-blue-400' : 'shrink-0 mt-0.5'}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
                  <span>
                    COMPULSORY WHITELIST: Essential communication &amp; AI tools (Phone, Messages, Google Gemini, Assistant, ChatGPT, Claude, Perplexity, Copilot, DeepSeek) are forced{' '}
                    <strong
                      style={{ color: isBespoke ? '#60A5FA' : 'var(--accent-hex, #FFFFFF)' }}
                    >
                      UNRESTRICTED
                    </strong>{' '}
                    so voice, emergency, and essential AI assistance connect cleanly during lock sessions.
                  </span>
                </div>
              )}

              {isProtectedSystem && (
                <div
                  className={
                    isBespoke
                      ? 'p-3 rounded-md bg-neutral-950 border border-red-500/70 flex items-start gap-2.5 text-xs text-red-300'
                      : 'p-3 rounded-2xl bg-red-950/55 border border-red-500/70 flex items-start gap-2.5 text-xs text-red-200'
                  }
                >
                  <ShieldAlert size={14} className="shrink-0 mt-0.5 text-red-400" />
                  <span>
                    PROTECTED OS PACKAGE: System Settings &amp; Package Installers are permanently{' '}
                    <strong>HARD BLOCKED</strong> to prevent lock bypasses.
                  </span>
                </div>
              )}

              {/* 1. ACCESS MODE SELECTOR */}
              <div className={sectionCardClass}>
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={`text-[11px] uppercase tracking-widest text-white ${
                      isBespoke ? 'font-semibold' : 'font-mono font-bold'
                    }`}
                  >
                    01 // Access Mode
                  </span>
                  <span
                    className="text-[10px] font-mono uppercase font-semibold"
                    style={{ color: isBespoke ? '#60A5FA' : 'var(--accent-hex, #FFFFFF)' }}
                  >
                    {rule.mode}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2">
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
                        className={
                          isBespoke
                            ? `p-2.5 rounded-md border text-left transition-colors duration-75 disabled:opacity-40 ${
                                selected
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-black border-neutral-800 hover:border-neutral-700 text-neutral-300'
                              }`
                            : `p-2.5 rounded-xl text-left transition-all disabled:opacity-40 ${
                                selected
                                  ? 'obsidian-pill-active shadow-sm'
                                  : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25'
                              }`
                        }
                      >
                        <div className="text-[10px] font-mono font-bold uppercase tracking-wider">
                          {opt.label}
                        </div>
                        <div className="text-[9px] mt-0.5 opacity-80">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. GRANULAR QUOTA & SESSION TIMERS */}
              {isControlled && (
                <div className={sectionCardClass}>
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] uppercase tracking-widest text-white ${
                        isBespoke ? 'font-semibold' : 'font-mono font-bold'
                      }`}
                    >
                      02 // Quota &amp; Session Timers
                    </span>
                    <span className="text-[10px] font-mono text-zinc-400">0 = OFF / UNLIM</span>
                  </div>

                  {/* Total Bag Quota */}
                  <div className={subCardClass}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-xs uppercase text-white ${
                            isBespoke ? 'font-semibold' : 'font-mono font-bold'
                          }`}
                        >
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
                        className={
                          isBespoke
                            ? `px-2.5 py-1 rounded-sm border text-[10px] font-mono font-semibold uppercase transition-colors duration-75 ${
                                rule.quotaSeconds === 0
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`
                            : `px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all ${
                                rule.quotaSeconds === 0
                                  ? 'obsidian-pill-active font-black'
                                  : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25 font-bold'
                              }`
                        }
                      >
                        Unlimited
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Hours
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={720}
                          disabled={readOnly}
                          value={quotaHours}
                          onChange={(e) =>
                            setQuotaParts(parseNonNegInt(e.target.value, 720), quotaMinutes)
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Minutes
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          disabled={readOnly}
                          value={quotaMinutes}
                          onChange={(e) =>
                            setQuotaParts(quotaHours, parseNonNegInt(e.target.value, 59))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Continuous Session Limit */}
                  <div className={subCardClass}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-xs uppercase text-white ${
                            isBespoke ? 'font-semibold' : 'font-mono font-bold'
                          }`}
                        >
                          Continuous Session Limit
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Triggers cooldown after{' '}
                          {formatCompactDuration(rule.maxContinuousSeconds, 'Off')}
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={readOnly}
                        onClick={() =>
                          setRule((prev) => ({ ...prev, maxContinuousSeconds: 0 }))
                        }
                        className={
                          isBespoke
                            ? `px-2.5 py-1 rounded-sm border text-[10px] font-mono font-semibold uppercase transition-colors duration-75 ${
                                rule.maxContinuousSeconds === 0
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`
                            : `px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all ${
                                rule.maxContinuousSeconds === 0
                                  ? 'obsidian-pill-active font-black'
                                  : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25 font-bold'
                              }`
                        }
                      >
                        Off
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Minutes
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          disabled={readOnly}
                          value={contMinutes}
                          onChange={(e) =>
                            setContinuousParts(
                              parseNonNegInt(e.target.value, 1440),
                              contSeconds
                            )
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Seconds
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          disabled={readOnly}
                          value={contSeconds}
                          onChange={(e) =>
                            setContinuousParts(contMinutes, parseNonNegInt(e.target.value, 59))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Cooldown Duration */}
                  <div className={subCardClass}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-xs uppercase text-white ${
                            isBespoke ? 'font-semibold' : 'font-mono font-bold'
                          }`}
                        >
                          Cooldown Lock Duration
                        </div>
                        <div className="text-[10px] font-mono text-zinc-400">
                          Lockout: {formatCompactDuration(rule.cooldownSeconds, 'Off (0s)')}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Minutes
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          disabled={readOnly}
                          value={coolMinutes}
                          onChange={(e) =>
                            setCooldownParts(parseNonNegInt(e.target.value, 1440), coolSeconds)
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Seconds
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          disabled={readOnly}
                          value={coolSeconds}
                          onChange={(e) =>
                            setCooldownParts(coolMinutes, parseNonNegInt(e.target.value, 59))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. MINDFUL FRICTION CONTROLS */}
              {isControlled && (
                <div className={sectionCardClass}>
                  <span
                    className={`block text-[11px] uppercase tracking-widest text-white ${
                      isBespoke ? 'font-semibold' : 'font-mono font-bold'
                    }`}
                  >
                    03 // Mindful Friction Controls
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
                      <div className={subCardClass}>
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`text-xs uppercase text-white ${
                              isBespoke ? 'font-semibold' : 'font-mono font-bold'
                            }`}
                          >
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
                            className={`w-20 ${inlineNumberInputClass}`}
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
                          style={{
                            accentColor: isBespoke ? '#3B82F6' : 'var(--accent-hex, #FFFFFF)',
                          }}
                          className="w-full cursor-pointer"
                        />
                      </div>

                      {renderToggleRow(
                        'Breathing Guide Ring',
                        'Show an expanding & contracting geometric ring during wait.',
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
                        <label className={`${subCardClass} flex items-center justify-between gap-3`}>
                          <div>
                            <div
                              className={`text-xs uppercase text-white ${
                                isBespoke ? 'font-semibold' : 'font-mono font-bold'
                              }`}
                            >
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
                            className={`w-20 ${inlineNumberInputClass}`}
                          />
                        </label>
                      )}

                      <label className={`${subCardClass} flex items-center justify-between gap-3`}>
                        <div>
                          <div
                            className={`text-xs uppercase text-white ${
                              isBespoke ? 'font-semibold' : 'font-mono font-bold'
                            }`}
                          >
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
                          className={`w-24 ${inlineNumberInputClass}`}
                        />
                      </label>
                    </div>
                  )}
                </div>
              )}

              {/* 4. IN-APP ANTI-SCROLL INTERVENTIONS */}
              {isControlled && (
                <div className={sectionCardClass}>
                  <span
                    className={`block text-[11px] uppercase tracking-widest text-white ${
                      isBespoke ? 'font-semibold' : 'font-mono font-bold'
                    }`}
                  >
                    04 // In-App Anti-Scroll Interventions
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
                    <div className="grid grid-cols-2 gap-2">
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
                            className={
                              isBespoke
                                ? `p-2.5 rounded-md border text-left transition-colors duration-75 ${
                                    selected
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-black border-neutral-800 hover:border-neutral-700 text-neutral-300'
                                  }`
                                : `p-2.5 rounded-xl text-left transition-all ${
                                    selected
                                      ? 'obsidian-pill-active shadow-sm'
                                      : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25'
                                  }`
                            }
                          >
                            <div className="text-[10px] font-mono font-bold uppercase">
                              {act.label}
                            </div>
                            <div className="text-[9px] font-mono mt-0.5 opacity-80">
                              {act.desc}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <label className={`${subCardClass} flex items-center justify-between gap-3`}>
                    <div>
                      <div
                        className={`text-xs uppercase text-white ${
                          isBespoke ? 'font-semibold' : 'font-mono font-bold'
                        }`}
                      >
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
                      className={`w-20 ${inlineNumberInputClass}`}
                    />
                  </label>

                  <div className={subCardClass}>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div
                          className={`text-xs uppercase text-white ${
                            isBespoke ? 'font-semibold' : 'font-mono font-bold'
                          }`}
                        >
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
                        onClick={() =>
                          setRule((prev) => ({ ...prev, nudgeIntervalSeconds: 0 }))
                        }
                        className={
                          isBespoke
                            ? `px-2.5 py-1 rounded-sm border text-[10px] font-mono font-semibold uppercase transition-colors duration-75 ${
                                rule.nudgeIntervalSeconds === 0
                                  ? 'bg-blue-600 border-blue-500 text-white'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                              }`
                            : `px-2.5 py-1 rounded-lg text-[10px] font-mono uppercase transition-all ${
                                rule.nudgeIntervalSeconds === 0
                                  ? 'obsidian-pill-active font-black'
                                  : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25 font-bold'
                              }`
                        }
                      >
                        Off
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Minutes
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={1440}
                          disabled={readOnly}
                          value={nudgeMinutes}
                          onChange={(e) =>
                            setNudgeParts(parseNonNegInt(e.target.value, 1440), nudgeSeconds)
                          }
                          className={inputClass}
                        />
                      </label>
                      <label className="block">
                        <span className="text-[10px] font-mono uppercase text-zinc-400">
                          Seconds
                        </span>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          disabled={readOnly}
                          value={nudgeSeconds}
                          onChange={(e) =>
                            setNudgeParts(nudgeMinutes, parseNonNegInt(e.target.value, 59))
                          }
                          className={inputClass}
                        />
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        }
        footerContent={
          <>
            {isPackedInBag && onRemoveFromBag && !readOnly && (
              <button
                type="button"
                onClick={() => onRemoveFromBag(app)}
                className={
                  isBespoke
                    ? 'px-3 py-2.5 rounded-md bg-neutral-950 border border-red-500/60 text-red-400 hover:text-red-300 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-colors duration-75'
                    : isFluentGlass
                    ? 'px-3 py-2.5 rounded-2xl bg-red-950/30 border border-red-500/40 text-red-300 hover:text-red-200 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all'
                    : 'px-3 py-2.5 rounded-2xl bg-red-950/45 border border-red-500/55 text-red-300 hover:text-red-200 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all'
                }
                title="Remove app from Bag"
              >
                <Trash2 size={14} />
                <span>Remove</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={
                isBespoke
                  ? 'px-3.5 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-xs font-medium uppercase tracking-wider transition-colors duration-75'
                  : isFluentGlass
                  ? 'liquid-pill px-3.5 py-2.5 rounded-2xl text-white/60 hover:text-white text-xs font-semibold uppercase tracking-wider transition-all'
                  : 'px-3.5 py-2.5 rounded-2xl obsidian-inset-neutral hover:border-white/25 text-zinc-300 hover:text-white text-xs font-bold uppercase tracking-wider transition-all'
              }
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={readOnly}
              onClick={handleSave}
              className={
                isBespoke
                  ? 'flex-1 py-2.5 px-4 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-45 transition-colors duration-75'
                  : isFluentGlass
                  ? 'liquid-pill-active flex-1 py-2.5 px-4 rounded-2xl text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-45 transition-all'
                  : 'flex-1 py-2.5 px-4 rounded-2xl obsidian-pill-active text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1.5 disabled:opacity-45 active:scale-[0.99] transition-all'
              }
            >
              <Check size={14} />
              <span>{isPackedInBag ? 'Save Rule' : 'Add & Save Rule'}</span>
            </button>
          </>
        }
      />
    </div>
  );
};
