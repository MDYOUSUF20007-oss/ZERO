import React, { useState } from 'react';
import type { OccasionBag } from '../types';
import { resolveAppBrandVisual } from '../utils/appBrandColors';
import { haptics } from '../utils/haptics';
import {
  Shield,
  Briefcase,
  Search,
  Plus,
  Lock,
  Cpu,
  EyeOff,
  Info,
} from 'lucide-react';

interface AetherialBagsViewProps {
  bags: OccasionBag[];
  activeBagId: string;
  onSelectActiveBag: (id: string) => void;
  onToggleBagApp: (bagId: string, app: any) => void;
  onOpenBagDrawer: () => void;
}

export const AetherialBagsView: React.FC<AetherialBagsViewProps> = ({
  bags,
  activeBagId,
  onSelectActiveBag,
  onToggleBagApp,
  onOpenBagDrawer,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const activeBag = bags.find((b) => b.id === activeBagId) || bags[0];
  const otherBags = bags.filter((b) => b.id !== activeBag?.id);

  const suggestedSubstitutions = [
    { name: 'Kindle Reader', initial: 'K', color: '#0284C7' },
    { name: 'Termius SSH', initial: 'T', color: '#10B981' },
    { name: 'Goodnotes', initial: 'G', color: '#8B5CF6' },
    { name: 'Desmos Math', initial: 'D', color: '#F59E0B' },
  ];

  return (
    <div className="flex-1 flex flex-col relative w-full px-4 sm:px-6 pt-4 pb-28 select-none font-sans text-[#e2e1ed] space-y-4">
      {/* Header Section with Zen Halo Visual Motif */}
      <div className="relative overflow-hidden rounded-2xl bg-[#191b24]/90 backdrop-blur-xl p-5 shadow-xl border border-white/5">
        <div className="absolute -right-8 -top-8 w-44 h-44 bg-[#38bdf8]/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start justify-between relative z-10">
          <div className="space-y-1.5 max-w-[82%]">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#38bdf8]/15 text-[#38bdf8]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#38bdf8] animate-ping" />
              <span className="text-[10px] font-bold uppercase tracking-wider">Perimeter Control</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#e2e1ed] tracking-tight">
              Study Occasion Bags
            </h1>
            <p className="text-xs text-[#bdc8d1] leading-relaxed">
              Curate up to 3 essential study apps per focus mode. Everything else stays strictly shielded in the void.
            </p>
          </div>

          {/* Minimal Focus Halo Symbol */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-full bg-[#1d1f28] shadow-md border border-white/5 shrink-0">
            <svg className="w-10 h-10 -rotate-90" viewBox="0 0 40 40">
              <circle
                className="text-[#33343d]"
                cx="20"
                cy="20"
                fill="none"
                r="15"
                stroke="currentColor"
                strokeWidth="2.5"
              />
              <circle
                className="text-[#38bdf8] drop-shadow-[0_0_8px_rgba(56,189,248,0.7)]"
                cx="20"
                cy="20"
                fill="none"
                r="15"
                stroke="currentColor"
                strokeDasharray="94.2"
                strokeDashoffset="24"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
            </svg>
            <div className="absolute w-2.5 h-2.5 rounded-full bg-[#38bdf8] shadow-[0_0_10px_#38bdf8]" />
          </div>
        </div>

        {/* Quick Status Pill Row */}
        <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282a32] text-[#bdc8d1] text-xs">
            <Shield size={14} className="text-[#4edea3]" />
            <span>Active Shield: {activeBag?.name}</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#282a32] text-[#bdc8d1] text-xs">
            <Lock size={14} className="text-[#38bdf8]" />
            <span>Lock: Level 3 Hardbound</span>
          </div>
        </div>
      </div>

      {/* Configured Bags Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Briefcase size={18} className="text-[#38bdf8]" />
            <h2 className="text-base font-bold text-[#e2e1ed]">Configured Bags</h2>
          </div>
          <span className="text-[11px] font-semibold text-[#87929a] uppercase tracking-wider">
            {bags.length} Ready
          </span>
        </div>

        {/* Active Bag Card */}
        {activeBag && (
          <div className="relative overflow-hidden rounded-2xl bg-[#1d1f28]/90 backdrop-blur-2xl p-5 shadow-2xl border border-[#38bdf8]/40 transition-all">
            <div className="absolute inset-0 bg-gradient-to-b from-[#38bdf8]/10 via-transparent to-transparent pointer-events-none" />

            <div className="relative z-10 flex flex-col space-y-4">
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{(activeBag as any).icon || '🎒'}</span>
                    <h3 className="text-base font-bold text-[#e2e1ed]">{activeBag.name}</h3>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[#38bdf8]/20 text-[#38bdf8] font-semibold text-[10px]">
                      Strict Lock
                    </span>
                    <span className="text-[#3e484f]">•</span>
                    <span className="text-[#bdc8d1] text-[11px]">
                      {activeBag.apps?.length || 0} Apps Allowed
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full bg-[#00a572]/25 text-[#4edea3] text-[11px] font-bold flex items-center gap-1.5 shadow-[0_0_8px_rgba(78,222,163,0.3)]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] animate-pulse" />
                  ACTIVE NOW
                </span>
              </div>

              {/* Allowed Apps List */}
              <div className="space-y-2 pt-1">
                {(activeBag.apps || []).map((app) => {
                  const brand = resolveAppBrandVisual(app);
                  return (
                    <div
                      key={app.packageName}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[#282a32]/70 border border-white/5"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold shadow-inner select-none"
                          style={{
                            backgroundColor: brand.bgColor,
                            color: brand.textColor,
                            border: `1px solid ${brand.borderColor}`,
                          }}
                        >
                          {brand.initial}
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#e2e1ed]">{app.appName}</p>
                          <p className="text-[10px] text-[#bdc8d1]">{app.packageName}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tick(700);
                          onToggleBagApp(activeBag.id, app);
                        }}
                        className="w-12 h-6 rounded-full bg-[#38bdf8] flex items-center p-0.5 transition-colors shadow-[0_0_12px_rgba(56,189,248,0.45)] cursor-pointer"
                        title="Toggle whitelist"
                      >
                        <span className="w-5 h-5 rounded-full bg-[#001e2c] transform translate-x-6 transition-transform shadow-sm" />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Shielded Summary Footer */}
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#0c0e16]/60 border border-white/5 text-xs text-[#bdc8d1]">
                <Shield size={16} className="text-[#ffb4ab] shrink-0" />
                <p>
                  <strong className="text-[#e2e1ed]">Shielded:</strong> Instagram, TikTok, YouTube, Reddit &amp; entertainment apps are intercepted.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other Bags Cards */}
        {otherBags.map((bag) => (
          <div
            key={bag.id}
            className="relative overflow-hidden rounded-2xl bg-[#191b24]/80 backdrop-blur-xl p-4 shadow-lg border border-white/5 hover:border-white/10 transition-all flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{(bag as any).icon || '📚'}</span>
              <div>
                <h3 className="text-sm font-bold text-[#e2e1ed]">{bag.name}</h3>
                <p className="text-xs text-[#bdc8d1]">
                  {bag.apps?.length || 0} apps configured
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                haptics.tick(700);
                onSelectActiveBag(bag.id);
              }}
              className="px-3.5 py-1.5 rounded-full bg-[#282a32] text-[#e2e1ed] hover:bg-[#38bdf8] hover:text-[#001e2c] transition-all text-xs font-semibold cursor-pointer active:scale-95"
            >
              Switch Bag
            </button>
          </div>
        ))}
      </div>

      {/* Curate App Slots & Suggested Substitutions */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Plus size={18} className="text-[#38bdf8]" />
            <h2 className="text-base font-bold text-[#e2e1ed]">Curate App Slots</h2>
          </div>
          <span className="text-xs text-[#38bdf8] font-semibold">
            {activeBag?.apps?.length || 0} / 3 Allowed
          </span>
        </div>

        {/* Tactile App Search Bar */}
        <div className="relative flex items-center">
          <Search size={18} className="absolute left-4 text-[#87929a]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search installed apps to substitute slot..."
            className="w-full h-12 pl-11 pr-4 rounded-full bg-[#191b24]/90 border border-white/10 text-[#e2e1ed] placeholder-[#87929a] text-xs focus:outline-none focus:border-[#38bdf8] transition-all shadow-inner"
          />
        </div>

        {/* Suggested Substitutions Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {suggestedSubstitutions.map((sub) => (
            <button
              key={sub.name}
              type="button"
              onClick={onOpenBagDrawer}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1d1f28] hover:bg-[#282a32] text-[#bdc8d1] hover:text-[#e2e1ed] whitespace-nowrap active:scale-95 transition-all border border-white/5 cursor-pointer text-xs"
            >
              <span
                className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold text-white"
                style={{ backgroundColor: sub.color }}
              >
                {sub.initial}
              </span>
              <span>{sub.name}</span>
              <Plus size={12} className="text-[#38bdf8]" />
            </button>
          ))}
        </div>

        {/* Create Custom Bag CTA */}
        <button
          type="button"
          onClick={onOpenBagDrawer}
          className="w-full py-3.5 px-4 rounded-2xl bg-[#282a32]/70 hover:bg-[#282a32] active:scale-[0.99] transition-all flex items-center justify-center gap-2 text-[#e2e1ed] border border-white/5 cursor-pointer shadow-md font-semibold text-xs tracking-wide"
        >
          <Plus size={18} className="text-[#38bdf8]" />
          <span>Manage Bags &amp; Whitelists</span>
        </button>
      </div>

      {/* Hardware Watchdog Sentinel Card */}
      <div className="relative overflow-hidden rounded-2xl bg-[#282a32]/70 backdrop-blur-xl p-5 shadow-xl border border-white/5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={20} className="text-[#4edea3]" />
            <h2 className="text-sm font-bold text-[#e2e1ed]">Hardware Watchdog</h2>
          </div>
          <span className="px-2 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] text-[10px] font-bold flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
            Active Guard
          </span>
        </div>

        <div className="space-y-2.5">
          {/* Sentinel 1 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0e16]/60 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#00a572]/20 flex items-center justify-center text-[#4edea3] shrink-0 mt-0.5">
              <Shield size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#e2e1ed]">Accessibility Shield</p>
              <p className="text-[11px] text-[#bdc8d1] leading-relaxed">
                Reboot-proof kernel sentinel. Re-engages focus mode automatically within 1.2s of any device restart.
              </p>
            </div>
          </div>

          {/* Sentinel 2 */}
          <div className="flex items-start gap-3 p-3 rounded-xl bg-[#0c0e16]/60 border border-white/5">
            <div className="w-8 h-8 rounded-full bg-[#38bdf8]/20 flex items-center justify-center text-[#38bdf8] shrink-0 mt-0.5">
              <EyeOff size={16} />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#e2e1ed]">Anti-Scroll Interception</p>
              <p className="text-[11px] text-[#bdc8d1] leading-relaxed">
                Closes Reels, TikTok feeds, and Reddit loops instantly with a tranquil calm-breath interstitial prompt.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 pt-1 text-[11px] text-[#87929a]">
          <Info size={14} className="shrink-0" />
          <span>To modify whitelists mid-session, a 60-second breathing friction pause is enforced.</span>
        </div>
      </div>
    </div>
  );
};
