import React, { useState, useMemo } from 'react';
import type { OccasionBag, BagApp } from '../types';
import { MAX_BAG_APPS } from '../store/useZeroStore';
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
} from 'lucide-react';

interface BagDrawerModalProps {
  isOpen: boolean;
  bags: OccasionBag[];
  activeBagId: string;
  installedApps: BagApp[];
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
  onClose,
  onSelectActiveBag,
  onUpdateBag,
  onToggleBagApp,
  onRefreshInstalledApps,
}) => {
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

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-5 shadow-2xl font-mono space-y-4 max-h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-700 flex items-center justify-center text-white">
              <Briefcase size={17} />
            </div>
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                The 4 Occasion Bags
              </h2>
              <p className="text-[11px] text-zinc-400">
                Choose Calls/SMS + up to 3 custom apps while locked
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

        {/* 4 Occasion Bag Switcher */}
        <div className="grid grid-cols-2 gap-1.5 shrink-0">
          {bags.map((bag, idx) => {
            const isActive = bag.id === selectedBag.id;
            return (
              <button
                key={bag.id}
                type="button"
                onClick={() => {
                  onSelectActiveBag(bag.id);
                  setEditingName(false);
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'bg-zinc-200 text-black border-white shadow-sm'
                    : 'bg-zinc-900/70 text-zinc-300 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] opacity-75">
                  <span>BAG #{idx + 1}</span>
                  <span>
                    {bag.apps.length}/{MAX_BAG_APPS} apps
                  </span>
                </div>
                <div className="font-bold text-xs truncate mt-0.5">{bag.name}</div>
              </button>
            );
          })}
        </div>

        {/* Selected Bag Config (Scrollable body) */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-0.5">
          {/* Bag Name Editor */}
          <div className="p-3 bg-zinc-900/70 border border-zinc-800 rounded-2xl">
            {editingName ? (
              <div className="space-y-2">
                <input
                  type="text"
                  maxLength={24}
                  value={selectedBag.name}
                  onChange={(e) =>
                    onUpdateBag(selectedBag.id, (b) => ({ ...b, name: e.target.value }))
                  }
                  placeholder="Bag Name (e.g. Work, Travel)"
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-xs text-white outline-none"
                />
                <input
                  type="text"
                  maxLength={36}
                  value={selectedBag.occasionLabel}
                  onChange={(e) =>
                    onUpdateBag(selectedBag.id, (b) => ({ ...b, occasionLabel: e.target.value }))
                  }
                  placeholder="Occasion note"
                  className="w-full bg-black border border-zinc-700 rounded-xl px-3 py-1.5 text-[11px] text-zinc-300 outline-none"
                />
                <button
                  type="button"
                  onClick={() => setEditingName(false)}
                  className="px-3 py-1 rounded-lg bg-white text-black text-[11px] font-bold"
                >
                  Save Label
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-xs font-black text-white">{selectedBag.name}</div>
                  <div className="text-[11px] text-zinc-400">{selectedBag.occasionLabel}</div>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingName(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-300 hover:text-white text-[11px] flex items-center gap-1"
                >
                  <Edit3 size={12} />
                  <span>Rename</span>
                </button>
              </div>
            )}
          </div>

          {/* Normal Calls & Texts Permissions for this Bag */}
          <div className="space-y-2">
            <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
              Essential Communication in "{selectedBag.name}"
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  onUpdateBag(selectedBag.id, (b) => ({ ...b, allowCalls: !b.allowCalls }))
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selectedBag.allowCalls
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Phone size={15} />
                  <div>
                    <div className="text-xs font-bold">Normal Calls</div>
                    <div className="text-[10px] opacity-80">
                      {selectedBag.allowCalls ? 'Allowed' : 'Blocked'}
                    </div>
                  </div>
                </div>
                {selectedBag.allowCalls && <Check size={14} />}
              </button>

              <button
                type="button"
                onClick={() =>
                  onUpdateBag(selectedBag.id, (b) => ({ ...b, allowSms: !b.allowSms }))
                }
                className={`p-3 rounded-2xl border text-left transition-all flex items-center justify-between ${
                  selectedBag.allowSms
                    ? 'bg-emerald-950/40 border-emerald-500/60 text-emerald-200'
                    : 'bg-zinc-900/50 border-zinc-800 text-zinc-400'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare size={15} />
                  <div>
                    <div className="text-xs font-bold">Normal Texts</div>
                    <div className="text-[10px] opacity-80">
                      {selectedBag.allowSms ? 'Allowed' : 'Blocked'}
                    </div>
                  </div>
                </div>
                {selectedBag.allowSms && <Check size={14} />}
              </button>
            </div>
          </div>

          {/* 3-App Custom Slots */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
              <span>Packed Custom Apps ({selectedBag.apps.length} / {MAX_BAG_APPS})</span>
              <span className="text-amber-300">Max {MAX_BAG_APPS}</span>
            </div>

            {selectedBag.apps.length === 0 ? (
              <div className="p-3 bg-zinc-900/40 border border-dashed border-zinc-800 rounded-2xl text-[11px] text-zinc-500 text-center">
                No custom apps packed in {selectedBag.name}. Select up to {MAX_BAG_APPS} apps below.
              </div>
            ) : (
              <div className="space-y-1.5">
                {selectedBag.apps.map((app) => (
                  <div
                    key={app.packageName}
                    className="p-2.5 bg-zinc-900 border border-zinc-700 rounded-xl flex items-center justify-between"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{app.appName}</div>
                      <div className="text-[10px] text-zinc-500 truncate max-w-[240px]">
                        {app.packageName}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggleBagApp(selectedBag.id, app)}
                      className="p-1.5 text-red-400 hover:text-red-300 rounded-lg bg-zinc-950 border border-zinc-800"
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
              <div className="flex-1 flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2">
                <Search size={14} className="text-zinc-500" />
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
                className="p-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-600 rounded-xl text-zinc-400 hover:text-white"
                title="Refresh Installed Apps"
              >
                <RefreshCw size={14} />
              </button>
            </div>

            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-0.5">
              {filteredApps.map((app) => {
                const isPacked = selectedBag.apps.some((a) => a.packageName === app.packageName);
                const disabled = !isPacked && bagFull;
                return (
                  <button
                    key={app.packageName}
                    type="button"
                    disabled={disabled}
                    onClick={() => onToggleBagApp(selectedBag.id, app)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between transition-all ${
                      isPacked
                        ? 'bg-zinc-200 text-black border-white font-bold'
                        : disabled
                        ? 'bg-zinc-950 text-zinc-600 border-zinc-900 opacity-50 cursor-not-allowed'
                        : 'bg-zinc-900/60 text-zinc-200 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs truncate">{app.appName}</div>
                      <div className="text-[10px] opacity-65 truncate">{app.packageName}</div>
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

        {/* Done */}
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3 rounded-2xl bg-white hover:bg-zinc-200 text-black font-black text-xs uppercase tracking-wider shrink-0"
        >
          Use "{selectedBag.name}" ({selectedBag.apps.length}/3 Apps)
        </button>
      </div>
    </div>
  );
};
