import React, { useState, useMemo } from 'react';
import type { OccasionBag, BagApp, NativeEnvironmentSecurity } from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
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
  onRefreshInstalledApps,
}) => {
  const { isBespoke } = useInterfaceStyle();
  const [searchQuery, setSearchQuery] = useState('');
  const [editingName, setEditingName] = useState(false);

  const selectedBag = bags.find((b) => b.id === activeBagId) || bags[0];

  const filteredApps = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = installedApps.filter((a) => {
      if (!q) return true;
      return (
        a.appName.toLowerCase().includes(q) ||
        a.packageName.toLowerCase().includes(q)
      );
    });
    return list;
  }, [installedApps, searchQuery]);

  if (!isOpen || !selectedBag) return null;

  const bagFull = selectedBag.apps.length >= MAX_BAG_APPS;
  const bagEditingDisabled = Boolean(environmentSecurity?.restrictions?.presetBagEditingDisabled);

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
        className={`w-full max-w-md max-h-full ${isBespoke ? 'font-sans' : 'font-mono'}`}
        headerClassName="p-5 flex-1 min-h-0 flex flex-col space-y-4 overflow-hidden"
        footerClassName="p-4"
        headerContent={
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 shrink-0">
              <div className="flex items-center gap-3">
                <div
                  className={`w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                    isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                  }`}
                >
                  <Briefcase
                    size={17}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  />
                </div>
                <div>
                  <h2
                    className={`text-sm uppercase tracking-wider ${
                      isBespoke ? 'font-semibold text-neutral-50' : 'font-black text-white'
                    }`}
                  >
                    The 4 Occasion Bags
                  </h2>
                  <p className="text-[11px] text-neutral-400">
                    Phone Calls always ON • Choose SMS + up to{' '}
                    <span className="font-mono tabular-nums">{MAX_BAG_APPS}</span> apps
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={
                  isBespoke
                    ? 'p-1.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors duration-75'
                    : 'p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white'
                }
                aria-label="Close"
              >
                <X size={16} />
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
                  <strong>Preset Bag Editing Disabled:</strong> Root access, test-keys ROM, or debug emulator detected. Bags are locked to prevent bypass tampering.
                </span>
              </div>
            )}

            {/* 4 Occasion Bag Switcher */}
            <div className="grid grid-cols-2 gap-2 shrink-0">
              {bags.map((bag, idx) => {
                const isActive = bag.id === selectedBag.id;
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
                      isBespoke
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
                        {bag.apps.length}/{MAX_BAG_APPS} apps
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

            {/* Selected Bag Config (Scrollable body) */}
            <div className="flex-1 min-h-0 overflow-y-auto space-y-4 pr-0.5">
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
                      maxLength={24}
                      value={selectedBag.name}
                      onChange={(e) =>
                        onUpdateBag(selectedBag.id, (b) => ({ ...b, name: e.target.value }))
                      }
                      placeholder="Bag Name (e.g. Work, Travel)"
                      className={`w-full obsidian-input px-3 py-2 text-xs text-white outline-none ${
                        isBespoke ? 'rounded-md' : 'rounded-xl py-1.5'
                      }`}
                    />
                    <input
                      type="text"
                      maxLength={36}
                      value={selectedBag.occasionLabel}
                      onChange={(e) =>
                        onUpdateBag(selectedBag.id, (b) => ({ ...b, occasionLabel: e.target.value }))
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
                    <div>
                      <div
                        className={`text-xs text-white ${
                          isBespoke ? 'font-semibold' : 'font-black'
                        }`}
                      >
                        {selectedBag.name}
                      </div>
                      <div className="text-[11px] text-neutral-400">{selectedBag.occasionLabel}</div>
                    </div>
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
                              : 'bg-zinc-900/50 border-white/10 text-zinc-400'
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

              {/* 3-App Custom Slots */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-neutral-400 font-semibold">
                  <span>
                    Packed Custom Apps (
                    <span className="font-mono tabular-nums">
                      {selectedBag.apps.length} / {MAX_BAG_APPS}
                    </span>
                    )
                  </span>
                  <span
                    className={`font-mono tabular-nums ${
                      isBespoke ? 'text-blue-400' : ''
                    }`}
                    style={isBespoke ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  >
                    Max {MAX_BAG_APPS}
                  </span>
                </div>

                {selectedBag.apps.length === 0 ? (
                  <div
                    className={
                      isBespoke
                        ? 'p-3.5 bg-neutral-950 border border-neutral-800 rounded-md text-xs text-neutral-400 text-center'
                        : 'p-3 bg-zinc-900/40 border border-dashed border-white/15 rounded-2xl text-[11px] text-zinc-400 text-center'
                    }
                  >
                    No custom apps packed in {selectedBag.name}. Select up to {MAX_BAG_APPS} apps below.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {selectedBag.apps.map((app) => (
                      <div
                        key={app.packageName}
                        className={
                          isBespoke
                            ? 'p-3 bg-neutral-950 border border-neutral-800 rounded-md flex items-center justify-between'
                            : 'p-2.5 obsidian-inset-neutral rounded-xl flex items-center justify-between'
                        }
                      >
                        <div>
                          <div className="text-xs font-semibold text-white">{app.appName}</div>
                          <div className="text-[10px] font-mono text-neutral-400 truncate max-w-[240px]">
                            {app.packageName}
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={bagEditingDisabled}
                          onClick={() => onToggleBagApp(selectedBag.id, app)}
                          className={
                            isBespoke
                              ? 'p-1.5 text-red-400 hover:text-red-300 rounded-sm bg-black border border-neutral-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-75'
                              : 'p-1.5 text-red-400 hover:text-red-300 rounded-lg obsidian-inset-neutral disabled:opacity-40 disabled:cursor-not-allowed'
                          }
                          title="Remove from Bag"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Search & Add Installed Apps */}
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
                      placeholder="Search installed apps..."
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

                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
                  {filteredApps.map((app) => {
                    const isPacked = selectedBag.apps.some((a) => a.packageName === app.packageName);
                    const disabled = bagEditingDisabled || (!isPacked && bagFull);
                    return (
                      <button
                        key={app.packageName}
                        type="button"
                        disabled={disabled}
                        onClick={() => onToggleBagApp(selectedBag.id, app)}
                        className={
                          isBespoke
                            ? `w-full p-2.5 rounded-md border text-left flex items-center justify-between transition-colors duration-75 ${
                                isPacked
                                  ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                                  : disabled
                                  ? 'bg-neutral-950 border-neutral-900 text-neutral-500 opacity-50 cursor-not-allowed'
                                  : 'bg-neutral-950 border-neutral-800 text-neutral-200 hover:border-neutral-700'
                              }`
                            : `w-full p-2.5 rounded-xl text-left flex items-center justify-between transition-all ${
                                isPacked
                                  ? 'obsidian-pill-active font-black'
                                  : disabled
                                  ? 'obsidian-inset-neutral text-zinc-500 opacity-50 cursor-not-allowed'
                                  : 'obsidian-inset-neutral text-zinc-200 hover:border-white/25'
                              }`
                        }
                      >
                        <div className="min-w-0 pr-2">
                          <div className="text-xs font-medium truncate">{app.appName}</div>
                          <div className="text-[10px] font-mono opacity-75 truncate">
                            {app.packageName}
                          </div>
                        </div>
                        {isPacked ? (
                          <Check size={15} className="shrink-0" />
                        ) : (
                          <Plus size={15} className="shrink-0 opacity-70" />
                        )}
                      </button>
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
                : `w-full py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all ${
                    bagEditingDisabled
                      ? 'obsidian-inset-neutral text-zinc-200'
                      : 'obsidian-pill-active active:scale-[0.99]'
                  }`
            }
          >
            {bagEditingDisabled
              ? `Close "${selectedBag.name}" (Read-Only)`
              : `Use "${selectedBag.name}" (${selectedBag.apps.length}/3 Apps)`}
          </button>
        }
      />
    </div>
  );
};
