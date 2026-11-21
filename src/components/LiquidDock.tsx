import React from 'react';
import { Clock, Heart, Settings, BarChart3, Play } from 'lucide-react';
import { haptics } from '../utils/haptics';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';

export type ZeroNavTab = 'dial' | 'dashboard' | 'zerotube' | 'schedules' | 'support';

interface LiquidDockProps {
  activeTab: ZeroNavTab;
  ticketCount?: number;
  onSelectTab: (tab: ZeroNavTab) => void;
}

const TABS: Array<{ id: ZeroNavTab; label: string }> = [
  { id: 'dial', label: 'Focus' },
  { id: 'dashboard', label: 'Insights' },
  { id: 'zerotube', label: 'ZeroTube' },
  { id: 'schedules', label: 'Settings & OS' },
  { id: 'support', label: 'Support' },
];

export const LiquidDock: React.FC<LiquidDockProps> = ({
  activeTab,
  ticketCount: _ticketCount,
  onSelectTab,
}) => {
  const { isAero } = useInterfaceStyle();
  const activeIdx = Math.max(
    0,
    TABS.findIndex((t) => t.id === activeTab)
  );

  return (
    <nav
      aria-label="Primary Navigation"
      data-frosted-chrome="true"
      className="fixed left-3 right-3 z-40 max-w-md mx-auto pointer-events-auto"
      style={{ bottom: 'calc(20px + var(--zero-safe-bottom))' }}
    >
      <div
        className={`liquid-dock rounded-[2rem] p-1.5 relative overflow-hidden ${
          isAero ? 'bg-white border border-[#F1F5F9] shadow-[0_-4px_20px_rgba(15,23,42,0.05),0_10px_30px_rgba(15,23,42,0.08)]' : ''
        }`}
      >
        {/* Top specular refraction highlight */}
        {!isAero && (
          <div
            aria-hidden="true"
            className="absolute top-0 left-8 right-8 h-px pointer-events-none"
            style={{
              background:
                'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)',
            }}
          />
        )}

        <div className="grid grid-cols-5 relative">
          {/* Smooth 60FPS spring sliding glass pill indicator */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 w-1/5 p-1 pointer-events-none will-change-transform"
            style={{
              transform: `translateX(${activeIdx * 100}%)`,
              transition: 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="w-full h-full rounded-full liquid-dock-item-active"
              style={
                isAero
                  ? {
                      background: 'rgba(17, 24, 39, 0.08)',
                      border: '1px solid rgba(17, 24, 39, 0.12)',
                      boxShadow: 'none',
                    }
                  : {
                      background: 'var(--accent-soft, rgba(168, 85, 247, 0.20))',
                      border: '1px solid var(--accent-border, rgba(168, 85, 247, 0.55))',
                      boxShadow:
                        'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 0 16px var(--liquid-accent-soft-glow)',
                    }
              }
            />
          </div>

          {TABS.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  haptics.tick(900);
                  onSelectTab(tab.id);
                }}
                aria-current={active ? 'page' : undefined}
                className={`relative z-10 flex flex-col items-center justify-center py-2 px-1 rounded-full liquid-spring ${
                  isAero
                    ? active
                      ? 'text-[#111827]'
                      : 'text-[#9CA3AF] hover:text-[#111827]'
                    : active
                    ? 'text-white'
                    : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {tab.id === 'dial' && (
                    <Clock
                      size={17}
                      strokeWidth={1.8}
                      className={isAero ? (active ? 'text-[#111827]' : 'text-[#9CA3AF]') : (active ? 'text-white' : undefined)}
                    />
                  )}
                  {tab.id === 'dashboard' && (
                    <BarChart3
                      size={17}
                      strokeWidth={1.8}
                      className={isAero ? (active ? 'text-[#111827]' : 'text-[#9CA3AF]') : (active ? 'text-white' : undefined)}
                    />
                  )}
                  {tab.id === 'zerotube' && (
                    <Play
                      size={17}
                      strokeWidth={1.8}
                      fill={active ? 'currentColor' : 'none'}
                      className={isAero ? (active ? 'text-[#111827]' : 'text-[#9CA3AF]') : (active ? 'text-cyan-300' : undefined)}
                    />
                  )}
                  {tab.id === 'schedules' && (
                    <Settings
                      size={17}
                      strokeWidth={1.8}
                      className={isAero ? (active ? 'text-[#111827]' : 'text-[#9CA3AF]') : (active ? 'text-white' : undefined)}
                    />
                  )}
                  {tab.id === 'support' && (
                    <Heart
                      size={17}
                      strokeWidth={1.8}
                      className={isAero ? (active ? 'text-[#111827]' : 'text-[#9CA3AF]') : (active ? 'text-white' : undefined)}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 tracking-tight whitespace-nowrap font-sans ${
                    isAero
                      ? active
                        ? 'font-bold text-[#111827]'
                        : 'font-medium text-[#9CA3AF]'
                      : active
                      ? 'font-bold text-white'
                      : 'font-medium text-zinc-400'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};
