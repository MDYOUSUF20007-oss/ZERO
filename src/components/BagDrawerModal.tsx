import React, { useState, useMemo } from 'react';
import type { AppLockRuleConfig, BagApp, NativeEnvironmentSecurity, OccasionBag } from '../types';
import { formatRuleSummary, resolveEffectiveAppRuleConfig } from '../utils/bagAppConfig';
import { BagAppConfigModal } from './BagAppConfigModal';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import {
  Briefcase,
  X,
  Phone,
  MessageSquare,
  Search,
  Check,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  ShieldAlert,
  Lock,
  SlidersHorizontal,
} from 'lucide-react';

interface BagDrawerModalProps {
  isOpen: boolean;
  bags: OccasionBag[];
  activeBagId: string;
  installedApps: BagApp[];
  environmentSecurity?: NativeEnvironmentSecurity;
  onClose: () => void;
  onSelectActiveBag: (id: string) => void;
  onUpdateBag: (bagId: string, updater: (bag: OccasionBag) => OccasionBag) => void;
  onToggleBagApp: (bagId: string, app: BagApp) => void;
  onUpdateBagAppRule: (bagId: string, app: BagApp, ruleConfig: AppLockRuleConfig) => boolean;
  onCreateCustomBag: (name: string, occasionLabel?: string) => OccasionBag | null;
  onDeleteCustomBag: (bagId: string) => boolean;
  onRefreshInstalledApps: () => void;
}

export const BagDrawerModal: React.FC<BagDrawerModalProps> = ({
  isOpen,
  bags,
  activeBagId,
  installedApps,
  environmentSecurity,
  onClose,
  onSelectActiveBag,
  onUpdateBag,
  onToggleBagApp,
  onUpdateBagAppRule,
  onCreateCustomBag,
  onDeleteCustomBag,
  onRefreshInstalledApps,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass;
  const [searchQuery, setSearchQuery] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [showNewBagForm, setShowNewBagForm] = useState(false);
  const [newBagName, setNewBagName] = useState('');
  const [newBagNote, setNewBagNote] = useState('');
  const [configuringApp, setConfiguringApp] = useState<BagApp | null>(null);

  const selectedBag = bags.find((b) => b.id === activeBagId) || bags[0];

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return installedApps.filter((a) => {
      if (!q) return true;
      return (
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
      );
    });
  }, [installedApps, searchQuery]);

  if (!isOpen || !selectedBag) return null;

  const bagEditingDisabled = Boolean(environmentSecurity?.restrictions?.presetBagEditingDisabled);

  const handleCreateBag = (e: React.FormEvent) => {
    e.preventDefault();
    if (bagEditingDisabled) return;
    const created = onCreateCustomBag(newBagName, newBagNote);
    if (created) {
      setNewBagName('');
      setNewBagNote('');
      setShowNewBagForm(false);
      setEditingName(false);
    }
  };

  const openAppRulePanel = (app: BagApp) => {
    const packedVersion = selectedBag.apps.find((a) => a.packageName === app.packageName);
    setConfiguringApp(packedVersion || app);
  };

  const configuringAppPacked = Boolean(
    configuringApp &&
      selectedBag.apps.some((a) => a.packageName === configuringApp.packageName)
  );

  return (
    <>
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
          isFluentGlass ? 'bg-black/75 backdrop-blur-sm' : 'bg-black/95'
        }`}
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
      >
        <ObsidianCard
          ambientGlow
          className={`w-full max-w-md max-h-full ${isModernFont ? 'font-sans' : 'font-mono'}`}
          headerClassName="p-5 flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden"
          footerClassName="p-4"
          headerContent={
            <>
              {/* Header */}
              <div className="flex items-start justify-between gap-2 shrink-0">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      isFluentGlass
                        ? 'liquid-squircle text-cyan-200'
                        : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                            isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                          }`
                    }
                  >
                    <Briefcase
                      size={17}
                      strokeWidth={1.75}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
                  </div>
                  <div>
                    <h2
                      className={`text-sm uppercase tracking-wider ${
                        isModernFont ? 'font-semibold text-white' : 'font-black text-white'
                      }`}
                    >
                      Occasion Bags &amp; Rules
                    </h2>
                    <p className="text-[11px] text-zinc-400">
                      Phone Calls always ON • Unlimited apps &amp; custom Bags
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className={
                    isFluentGlass
                      ? 'p-1.5 rounded-xl liquid-pill text-zinc-400 hover:text-white'
                      : isBespoke
                      ? 'p-1.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors duration-75'
                      : 'p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white'
                  }
                  aria-label="Close"
                >
                  <X size={16} strokeWidth={1.75} />
                </button>
              </div>

              {/* Environment Integrity Guard Banner */}
              {bagEditingDisabled && (
                <div
                  className={
                    isBespoke
                      ? 'p-3 rounded-md bg-neutral-950 border border-red-700 text-red-300 text-xs leading-relaxed flex items-start gap-2 shrink-0'
                      : 'p-2.5 rounded-2xl bg-red-950/60 border border-red-500/70 text-red-200 text-[10px] leading-relaxed flex items-start gap-2 shrink-0'
                  }
                >
                  <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                  <span>
                    <strong>Bag Editing Disabled:</strong> Root access, test-keys ROM, or debug
                    emulator detected. Bags are locked to prevent bypass tampering.
                  </span>
                </div>
              )}

              {/* Single Smooth Scrollable Modal Body (prevents nested scroll clipping) */}
              <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-1">
                {/* Unlimited Occasion Bag Switcher + Create Custom Bag */}
                <div className="space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    {bags.map((bag, idx) => {
                      const isActive = bag.id === selectedBag.id;
                      const controlledCount = bag.apps.filter(
                        (a) => resolveEffectiveAppRuleConfig(a).mode === 'controlled'
                      ).length;
                      return (
                        <button
                          key={bag.id}
                          type="button"
                          disabled={bagEditingDisabled && !isActive}
                          onClick={() => {
                            if (bagEditingDisabled) return;
                            onSelectActiveBag(bag.id);
                            setEditingName(false);
                          }}
                          className={
                            isFluentGlass
                              ? `p-3 rounded-2xl text-left liquid-spring ${
                                  isActive
                                    ? 'liquid-pill-active font-semibold'
                                    : bagEditingDisabled
                                    ? 'liquid-row text-zinc-500 opacity-50 cursor-not-allowed'
                                    : 'liquid-row text-zinc-200 hover:brightness-110'
                                }`
                              : isBespoke
                              ? `p-3 rounded-md border text-left transition-colors duration-75 ${
                                  isActive
                                    ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                                    : bagEditingDisabled
                                    ? 'bg-neutral-950 border-neutral-900 text-neutral-500 opacity-50 cursor-not-allowed'
                                    : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:border-neutral-700'
                                }`
                              : `p-2.5 rounded-2xl text-left transition-all ${
                                  isActive
                                    ? 'obsidian-pill-active font-black shadow-sm'
                                    : bagEditingDisabled
                                    ? 'obsidian-inset-neutral text-zinc-500 opacity-50 cursor-not-allowed'
                                    : 'obsidian-inset-neutral text-zinc-300 hover:border-white/25'
                                }`
                          }
                        >
                          <div className="flex items-center justify-between text-[10px] font-mono tabular-nums opacity-85">
                            <span>BAG #{idx + 1}</span>
                            <span>
                              {bag.apps.length} app{bag.apps.length === 1 ? '' : 's'}
                              {controlledCount > 0 ? ` · ${controlledCount}R` : ''}
                            </span>
                          </div>
                          <div
                            className={`text-xs truncate mt-0.5 ${
                              isBespoke ? 'font-semibold' : 'font-bold'
                            }`}
                          >
                            {bag.name}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {!bagEditingDisabled && (
                    <div>
                      {showNewBagForm ? (
                        <form
                          onSubmit={handleCreateBag}
                          className={
                            isBespoke
                              ? 'p-3 rounded-md bg-neutral-950 border border-neutral-800 space-y-2.5'
                              : 'p-3 rounded-2xl obsidian-inset space-y-2.5'
                          }
                        >
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <input
                              type="text"
                              maxLength={28}
                              value={newBagName}
                              onChange={(e) => setNewBagName(e.target.value)}
                              placeholder="Bag Name (Out, Sports...)"
                              className={`w-full obsidian-input px-3 py-2 text-xs text-white outline-none ${
                                isBespoke ? 'rounded-md font-sans' : 'rounded-xl font-mono'
                              }`}
                            />
                            <input
                              type="text"
                              maxLength={40}
                              value={newBagNote}
                              onChange={(e) => setNewBagNote(e.target.value)}
                              placeholder="Occasion note (Optional)"
                              className={`w-full obsidian-input px-3 py-2 text-xs text-zinc-200 outline-none ${
                                isBespoke ? 'rounded-md font-sans' : 'rounded-xl font-mono'
                              }`}
                            />
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setShowNewBagForm(false);
                                setNewBagName('');
                                setNewBagNote('');
                              }}
                              className={
                                isBespoke
                                  ? 'px-3 py-1.5 rounded-md bg-black border border-neutral-800 hover:border-neutral-600 text-[11px] font-medium uppercase text-neutral-300 transition-colors duration-75'
                                  : 'px-3 py-1.5 rounded-xl obsidian-inset-neutral hover:border-white/25 text-[10px] font-bold uppercase text-zinc-300 hover:text-white transition-all'
                              }
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={!newBagName.trim()}
                              className={
                                isBespoke
                                  ? 'px-3.5 py-1.5 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white text-[11px] font-semibold uppercase tracking-wide disabled:opacity-40 transition-colors duration-75'
                                  : 'px-3.5 py-1.5 rounded-xl obsidian-pill-active text-[10px] font-black uppercase tracking-wider disabled:opacity-40 transition-all'
                              }
                            >
                              Create Bag
                            </button>
                          </div>
                        </form>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setShowNewBagForm(true)}
                          className={
                            isBespoke
                              ? 'w-full py-2 px-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-xs font-medium uppercase tracking-wider text-neutral-200 hover:text-white flex items-center justify-center gap-1.5 transition-colors duration-75'
                              : 'w-full py-2 px-3 rounded-2xl obsidian-inset-neutral hover:border-white/25 text-[11px] font-bold uppercase tracking-wider text-zinc-200 hover:text-white flex items-center justify-center gap-1.5 transition-all'
                          }
                        >
                          <Plus
                            size={13}
                            className={isBespoke ? 'text-blue-400' : undefined}
                            style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                          />
                          <span>New Custom Bag</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Bag Name Editor */}
                <div
                  className={
                    isBespoke
                      ? 'p-3.5 bg-neutral-950 border border-neutral-800 rounded-md'
                      : 'p-3 obsidian-inset-neutral rounded-2xl'
                  }
                >
                  {editingName && !bagEditingDisabled ? (
                    <div className="space-y-2.5">
                      <input
                        type="text"
                        maxLength={28}
                        value={selectedBag.name}
                        onChange={(e) =>
                          onUpdateBag(selectedBag.id, (b) => ({ ...b, name: e.target.value }))
                        }
                        placeholder="Bag Name (e.g. Work, Out, Sports)"
                        className={`w-full obsidian-input px-3 py-2 text-xs text-white outline-none ${
                          isBespoke ? 'rounded-md' : 'rounded-xl py-1.5'
                        }`}
                      />
                      <input
                        type="text"
                        maxLength={40}
                        value={selectedBag.occasionLabel}
                        onChange={(e) =>
                          onUpdateBag(selectedBag.id, (b) => ({
                            ...b,
                            occasionLabel: e.target.value,
                          }))
                        }
                        placeholder="Occasion note"
                        className={`w-full obsidian-input px-3 py-2 text-xs text-neutral-200 outline-none ${
                          isBespoke ? 'rounded-md' : 'rounded-xl py-1.5 text-[11px] text-zinc-200'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setEditingName(false)}
                        className={
                          isBespoke
                            ? 'px-3 py-1.5 rounded-md bg-blue-600 border border-blue-500 text-white text-xs font-semibold transition-colors duration-75'
                            : 'px-3 py-1 rounded-lg obsidian-pill-active text-[11px] font-black'
                        }
                      >
                        Save Label
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div
                          className={`text-xs text-white truncate ${
                            isBespoke ? 'font-semibold' : 'font-black'
                          }`}
                        >
                          {selectedBag.name}
                        </div>
                        <div className="text-[11px] text-neutral-400 truncate">
                          {selectedBag.occasionLabel}
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {selectedBag.isCustom && bags.length > 1 && !bagEditingDisabled && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomBag(selectedBag.id)}
                            className={
                              isBespoke
                                ? 'p-1.5 rounded-sm bg-black border border-neutral-800 hover:border-red-500/60 text-red-400 hover:text-red-300 transition-colors duration-75'
                                : 'p-1.5 rounded-xl bg-red-950/35 border border-red-500/45 text-red-400 hover:text-red-300 transition-all'
                            }
                            title="Delete Custom Bag"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={bagEditingDisabled}
                          onClick={() => setEditingName(true)}
                          className={
                            isBespoke
                              ? 'px-2.5 py-1.5 rounded-sm bg-black border border-neutral-800 hover:border-neutral-700 text-neutral-300 hover:text-white text-[11px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75'
                              : 'px-2.5 py-1.5 rounded-xl obsidian-inset-neutral text-zinc-300 hover:text-white text-[11px] flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed'
                          }
                        >
                          <Edit3 size={12} />
                          <span>Rename</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Normal Calls (Compulsory Always ON) & Normal Texts Toggle */}
                <div className="space-y-2">
                  <div className="text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                    Essential Communication in &ldquo;{selectedBag.name}&rdquo;
                  </div>
                  <div className="grid grid-cols-2 gap-2">
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
                          ? 'p-3 rounded-md border bg-neutral-950 border-blue-500/60 text-blue-300 text-left flex items-center justify-between gap-1.5'
                          : 'p-3 rounded-2xl border text-white text-left flex items-center justify-between gap-1.5'
                      }
                      title="Phone Calls remain compulsory and always accessible even if not in the bag"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Phone
                          size={15}
                          className={isBespoke ? 'shrink-0 text-blue-400' : 'shrink-0'}
                          style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        />
                        <div className="min-w-0">
                          <div className="text-xs font-semibold truncate">Phone Calls</div>
                          <div className="text-[10px] opacity-85 truncate text-zinc-300">
                            Compulsory • ON
                          </div>
                        </div>
                      </div>
                      <Lock
                        size={13}
                        className={isBespoke ? 'shrink-0 text-blue-400 opacity-90' : 'shrink-0 opacity-90'}
                        style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                      />
                    </div>

                    <button
                      type="button"
                      disabled={bagEditingDisabled}
                      onClick={() =>
                        onUpdateBag(selectedBag.id, (b) => ({ ...b, allowSms: !b.allowSms }))
                      }
                      style={
                        !isBespoke && selectedBag.allowSms
                          ? {
                              backgroundColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                              borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.55)',
                            }
                          : undefined
                      }
                      className={
                        isBespoke
                          ? `p-3 rounded-md border text-left transition-colors duration-75 flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedBag.allowSms
                                ? 'bg-neutral-950 border-blue-500/60 text-blue-300'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:border-neutral-700'
                            }`
                          : `p-3 rounded-2xl border text-left transition-all flex items-center justify-between disabled:opacity-50 disabled:cursor-not-allowed ${
                              selectedBag.allowSms
                                ? 'text-white'
                                : 'obsidian-inset-neutral text-zinc-400'
                            }`
                      }
                    >
                      <div className="flex items-center gap-2">
                        <MessageSquare
                          size={15}
                          className={isBespoke && selectedBag.allowSms ? 'text-blue-400' : undefined}
                          style={
                            !isBespoke && selectedBag.allowSms
                              ? { color: 'var(--accent-hex, #FFFFFF)' }
                              : undefined
                          }
                        />
                        <div>
                          <div className="text-xs font-semibold">Normal Texts</div>
                          <div className="text-[10px] opacity-80">
                            {selectedBag.allowSms ? 'Allowed' : 'Blocked'}
                          </div>
                        </div>
                      </div>
                      {selectedBag.allowSms && (
                        <Check
                          size={14}
                          className={isBespoke ? 'text-blue-400' : undefined}
                          style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        />
                      )}
                    </button>
                  </div>
                </div>

                {/* Packed Bag Apps & Custom Quotas / Friction Rules */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400 font-semibold gap-2">
                    <span>
                      Configured Bag Apps (
                      <span className="font-mono tabular-nums">{selectedBag.apps.length}</span>)
                    </span>
                    <span
                      className="font-mono truncate"
                      style={{ color: isBespoke ? '#60A5FA' : 'var(--accent-hex, #FFFFFF)' }}
                    >
                      Tap to configure
                    </span>
                  </div>

                  {selectedBag.apps.length === 0 ? (
                    <div
                      className={
                        isBespoke
                          ? 'p-3.5 rounded-md bg-neutral-950 border border-neutral-800 text-xs text-neutral-400 text-center leading-relaxed'
                          : 'p-3.5 rounded-2xl obsidian-inset-neutral text-xs text-zinc-400 text-center leading-relaxed'
                      }
                    >
                      Monk Mode: 0 apps in {selectedBag.name}. Select any installed app below to set
                      Quotas, Friction, or Short-Video rules.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedBag.apps.map((app) => {
                        const effRule = resolveEffectiveAppRuleConfig(app);
                        const modeBadge =
                          effRule.mode === 'hard_block'
                            ? 'HARD BLOCK'
                            : effRule.mode === 'controlled'
                            ? 'CONTROLLED'
                            : 'UNRESTRICTED';
                        return (
                          <div
                            key={app.packageName}
                            className={
                              isBespoke
                                ? 'p-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 flex items-center justify-between gap-2 transition-colors duration-75'
                                : 'p-2.5 rounded-2xl obsidian-inset flex items-center justify-between gap-2 transition-all'
                            }
                          >
                            <button
                              type="button"
                              onClick={() => openAppRulePanel(app)}
                              className="flex-1 min-w-0 text-left"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-semibold text-white truncate">
                                  {app.appName}
                                </span>
                                {effRule.mode === 'hard_block' ? (
                                  <span
                                    className={
                                      isBespoke
                                        ? 'px-1.5 py-0.5 rounded-sm bg-red-950/60 border border-red-500/50 text-red-300 text-[9px] font-mono font-semibold uppercase shrink-0'
                                        : 'px-2 py-0.5 rounded-lg bg-red-950/55 border border-red-500/50 text-red-300 text-[9px] font-black uppercase shrink-0'
                                    }
                                  >
                                    {modeBadge}
                                  </span>
                                ) : effRule.mode === 'controlled' ? (
                            <span
                              className={
                                isFluentGlass
                                  ? 'px-2 py-0.5 rounded-lg bg-cyan-400/20 border border-cyan-300/35 text-cyan-100 text-[9px] font-mono font-semibold uppercase shrink-0'
                                  : isBespoke
                                  ? 'px-1.5 py-0.5 rounded-sm bg-blue-600 border border-blue-500 text-white text-[9px] font-mono font-semibold uppercase shrink-0'
                                  : 'px-2 py-0.5 rounded-lg obsidian-pill-active text-[9px] font-black uppercase shrink-0'
                              }
                            >
                              {modeBadge}
                            </span>
                                ) : (
                                  <span
                                    style={
                                      isBespoke
                                        ? undefined
                                        : {
                                            backgroundColor:
                                              'rgba(var(--accent-rgb, 255, 255, 255), 0.14)',
                                            borderColor:
                                              'rgba(var(--accent-rgb, 255, 255, 255), 0.42)',
                                            color: 'var(--accent-hex, #FFFFFF)',
                                          }
                                    }
                                    className={
                                      isBespoke
                                        ? 'px-1.5 py-0.5 rounded-sm bg-black border border-blue-500/45 text-blue-300 text-[9px] font-mono font-semibold uppercase shrink-0'
                                        : 'px-2 py-0.5 rounded-lg border text-[9px] font-bold uppercase shrink-0'
                                    }
                                  >
                                    {modeBadge}
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] font-mono text-zinc-400 truncate mt-0.5">
                                {formatRuleSummary(effRule)}
                              </div>
                            </button>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                type="button"
                                onClick={() => openAppRulePanel(app)}
                                className={
                                  isBespoke
                                    ? 'p-1.5 rounded-sm bg-black border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white transition-colors duration-75'
                                    : 'p-1.5 rounded-xl obsidian-inset-neutral hover:border-white/25 transition-all'
                                }
                                title="Configure App Quotas & Friction"
                              >
                                <SlidersHorizontal
                                  size={13}
                                  className={isBespoke ? 'text-blue-400' : undefined}
                                  style={
                                    isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }
                                  }
                                />
                              </button>
                              <button
                                type="button"
                                disabled={bagEditingDisabled}
                                onClick={() => onToggleBagApp(selectedBag.id, app)}
                                className={
                                  isBespoke
                                    ? 'p-1.5 rounded-sm bg-black border border-neutral-800 hover:border-red-500/60 text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75'
                                    : 'p-1.5 rounded-xl bg-red-950/35 border border-red-500/40 text-red-400 hover:text-red-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all'
                                }
                                title="Remove from Bag"
                              >
                                <Trash2 size={13} />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Search & Select Installed Apps */}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div
                      className={`flex-1 flex items-center gap-2 obsidian-input px-3 py-2 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`}
                    >
                      <Search size={14} className="text-neutral-400" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search installed apps to configure..."
                        className="w-full bg-transparent text-xs text-white outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={onRefreshInstalledApps}
                      className={
                        isBespoke
                          ? 'p-2 bg-neutral-950 border border-neutral-800 hover:border-neutral-700 rounded-md text-neutral-400 hover:text-white transition-colors duration-75'
                          : 'p-2 obsidian-inset-neutral hover:border-white/25 rounded-xl text-zinc-400 hover:text-white'
                      }
                      title="Refresh Installed Apps"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {filteredApps.map((app) => {
                      const packedEntry = selectedBag.apps.find(
                        (a) => a.packageName === app.packageName
                      );
                      const isPacked = Boolean(packedEntry);
                      const rule = packedEntry
                        ? resolveEffectiveAppRuleConfig(packedEntry)
                        : null;
                      return (
                        <div
                          key={app.packageName}
                          className={
                            isBespoke
                              ? `w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-md border transition-colors duration-75 ${
                                  isPacked
                                    ? 'bg-neutral-950 border-blue-500/60'
                                    : 'bg-neutral-950 border-neutral-800 hover:border-neutral-700'
                                }`
                              : `w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-2xl transition-all ${
                                  isPacked ? 'obsidian-inset' : 'obsidian-inset-neutral'
                                }`
                          }
                        >
                          <button
                            type="button"
                            onClick={() => openAppRulePanel(app)}
                            className="flex-1 min-w-0 text-left"
                          >
                            <div className="text-xs font-semibold text-white truncate">
                              {app.appName}
                            </div>
                            <div className="text-[10px] font-mono text-zinc-400 truncate">
                              {rule ? `${rule.mode.toUpperCase()} · ${app.packageName}` : app.packageName}
                            </div>
                          </button>

                          <button
                            type="button"
                            onClick={() => openAppRulePanel(app)}
                            className={
                              isBespoke
                                ? `px-2.5 py-1 rounded-sm border text-[10px] font-semibold uppercase shrink-0 transition-colors duration-75 ${
                                    isPacked
                                      ? 'bg-blue-600 border-blue-500 text-white'
                                      : 'bg-black border-neutral-800 hover:border-neutral-600 text-neutral-200'
                                  }`
                                : `px-2.5 py-1 rounded-lg text-[10px] uppercase shrink-0 transition-all ${
                                    isPacked
                                      ? 'obsidian-pill-active font-black'
                                      : 'obsidian-inset-neutral hover:border-white/25 text-zinc-200 hover:text-white font-bold'
                                  }`
                            }
                          >
                            {isPacked ? 'Edit Rule' : 'Configure'}
                          </button>

                          <button
                            type="button"
                            disabled={bagEditingDisabled}
                            onClick={() => onToggleBagApp(selectedBag.id, app)}
                            className={
                              isBespoke
                                ? `p-1.5 rounded-sm border disabled:opacity-40 shrink-0 transition-colors duration-75 ${
                                    isPacked
                                      ? 'bg-black border-blue-500/60 text-blue-400'
                                      : 'bg-black border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white'
                                  }`
                                : `p-1.5 rounded-xl disabled:opacity-40 shrink-0 transition-all ${
                                    isPacked
                                      ? 'obsidian-inset'
                                      : 'obsidian-inset-neutral hover:border-white/25 text-zinc-300 hover:text-white'
                                  }`
                            }
                            title={isPacked ? 'Quick Remove from Bag' : 'Quick Pack Unrestricted'}
                          >
                            {isPacked ? (
                              <Check
                                size={14}
                                className={isBespoke ? 'text-blue-400' : undefined}
                                style={
                                  isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }
                                }
                              />
                            ) : (
                              <Plus size={14} />
                            )}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          }
          footerContent={
            <button
              type="button"
              onClick={onClose}
              className={
                isBespoke
                  ? `w-full py-3 rounded-md border font-semibold text-xs uppercase tracking-wider transition-colors duration-75 ${
                      bagEditingDisabled
                        ? 'bg-neutral-950 border-neutral-800 text-neutral-200'
                        : 'bg-blue-600 border-blue-500 hover:bg-blue-500 text-white'
                    }`
                  : isFluentGlass
                  ? `w-full py-3 rounded-2xl font-semibold text-xs uppercase tracking-wider transition-all ${
                      bagEditingDisabled
                        ? 'liquid-pill text-white/50'
                        : 'liquid-pill-active active:scale-[0.99]'
                    }`
                  : `w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                      bagEditingDisabled
                        ? 'obsidian-inset-neutral text-zinc-200'
                        : 'obsidian-pill-active active:scale-[0.99]'
                    }`
              }
            >
              {bagEditingDisabled
                ? `Close "${selectedBag.name}" (Read-Only)`
                : `Use "${selectedBag.name}" (${selectedBag.apps.length} App${
                    selectedBag.apps.length === 1 ? '' : 's'
                  })`}
            </button>
          }
        />
      </div>

      <BagAppConfigModal
        isOpen={Boolean(configuringApp)}
        bagName={selectedBag.name}
        app={configuringApp}
        isPackedInBag={configuringAppPacked}
        readOnly={bagEditingDisabled}
        onClose={() => setConfiguringApp(null)}
        onSaveRule={(app, nextRule) => {
          onUpdateBagAppRule(selectedBag.id, app, nextRule);
          setConfiguringApp(null);
        }}
        onRemoveFromBag={(app) => {
          onToggleBagApp(selectedBag.id, app);
          setConfiguringApp(null);
        }}
      />
    </>
  );
};
