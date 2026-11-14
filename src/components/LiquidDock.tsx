import React from 'react';
import { Clock, Heart, Settings, BarChart3 } from 'lucide-react';
import { haptics } from '../utils/haptics';

export type ZeroNavTab = 'dial' | 'dashboard' | 'schedules' | 'support';

interface LiquidDockProps {
  activeTab: ZeroNavTab;
  ticketCount?: number;
  onSelectTab: (tab: ZeroNavTab) => void;
}

const TABS: Array<{ id: ZeroNavTab; label: string }> = [
  { id: 'dial', label: 'Focus' },
  { id: 'dashboard', label: 'Insights' },
  { id: 'schedules', label: 'Settings & OS' },
  { id: 'support', label: 'Support' },
];

export const LiquidDock: React.FC<LiquidDockProps> = ({
  activeTab,
  ticketCount: _ticketCount,
  onSelectTab,
}) => {
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
      <div className="liquid-dock rounded-[2rem] p-1.5 relative overflow-hidden">
        {/* Top specular refraction highlight */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.65) 50%, transparent 100%)',
          }}
        />

        <div className="grid grid-cols-4 relative">
          {/* Smooth 60FPS spring sliding glass pill indicator */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 w-1/4 p-0.5 pointer-events-none will-change-transform"
            style={{
              transform: `translateX(${activeIdx * 100}%)`,
              transition: 'transform 0.26s cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <div
              className="w-full h-full rounded-2xl liquid-dock-item-active"
              style={{
                background: 'var(--accent-soft, rgba(168, 85, 247, 0.20))',
                border: '1px solid var(--accent-border, rgba(168, 85, 247, 0.55))',
                boxShadow:
                  'inset 0 1px 0 rgba(255, 255, 255, 0.25), 0 0 16px var(--liquid-accent-soft-glow)',
              }}
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
                className={`relative z-10 flex flex-col items-center justify-center py-2 px-1 rounded-2xl liquid-spring ${
                  active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {tab.id === 'dial' && (
                    <Clock
                      size={17}
                      strokeWidth={1.8}
                      className={active ? 'text-white' : undefined}
                    />
                  )}
                  {tab.id === 'dashboard' && (
                    <BarChart3
                      size={17}
                      strokeWidth={1.8}
                      className={active ? 'text-white' : undefined}
                    />
                  )}
                  {tab.id === 'schedules' && (
                    <Settings
                      size={17}
                      strokeWidth={1.8}
                      className={active ? 'text-white' : undefined}
                    />
                  )}
                  {tab.id === 'support' && (
                    <Heart
                      size={17}
                      strokeWidth={1.8}
                      className={active ? 'text-white' : undefined}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 tracking-tight whitespace-nowrap font-sans ${
                    active ? 'font-bold text-white' : 'font-medium text-zinc-400'
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
