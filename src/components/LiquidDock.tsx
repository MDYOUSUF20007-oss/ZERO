import React from 'react';
import { Clock, Heart, Settings, Ticket } from 'lucide-react';
import { haptics } from '../utils/haptics';

export type ZeroNavTab = 'dial' | 'dashboard' | 'schedules' | 'support';

interface LiquidDockProps {
  activeTab: ZeroNavTab;
  ticketCount: number;
  onSelectTab: (tab: ZeroNavTab) => void;
}

const TABS: Array<{ id: ZeroNavTab; label: string }> = [
  { id: 'dial', label: 'Focus' },
  { id: 'dashboard', label: 'Insights' },
  { id: 'schedules', label: 'Settings' },
  { id: 'support', label: 'Support' },
];

export const LiquidDock: React.FC<LiquidDockProps> = ({
  activeTab,
  ticketCount,
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
      <div className="liquid-dock rounded-full p-1.5 relative overflow-hidden">
        {/* Top specular refraction highlight */}
        <div
          aria-hidden="true"
          className="absolute top-0 left-8 right-8 h-px pointer-events-none"
          style={{
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.45) 50%, transparent 100%)',
          }}
        />

        <div className="grid grid-cols-4 relative">
          {/* Smooth sliding glass pill indicator */}
          <div
            aria-hidden="true"
            className="absolute top-0 bottom-0 left-0 w-1/4 p-0.5 pointer-events-none transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{ transform: `translateX(${activeIdx * 100}%)` }}
          >
            <div className="w-full h-full rounded-full liquid-dock-indicator" />
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
                  active ? 'text-white' : 'text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <div className="relative flex items-center justify-center">
                  {tab.id === 'dial' && (
                    <Clock
                      size={17}
                      strokeWidth={1.75}
                      className={active ? 'text-cyan-200' : undefined}
                    />
                  )}
                  {tab.id === 'dashboard' && (
                    <>
                      <Ticket
                        size={17}
                        strokeWidth={1.75}
                        className={active ? 'text-cyan-200' : undefined}
                      />
                      {ticketCount > 0 && (
                        <span className="absolute -top-1.5 -right-3.5 text-[9px] font-sans font-semibold tabular-nums px-1.5 py-px rounded-full bg-cyan-400/20 text-cyan-100 border border-cyan-300/35">
                          {ticketCount}
                        </span>
                      )}
                    </>
                  )}
                  {tab.id === 'schedules' && (
                    <Settings
                      size={17}
                      strokeWidth={1.75}
                      className={active ? 'text-cyan-200' : undefined}
                    />
                  )}
                  {tab.id === 'support' && (
                    <Heart
                      size={17}
                      strokeWidth={1.75}
                      className={active ? 'text-cyan-200' : undefined}
                    />
                  )}
                </div>
                <span
                  className={`text-[10px] mt-1 tracking-tight whitespace-nowrap font-sans ${
                    active ? 'font-semibold text-white' : 'font-medium text-zinc-400'
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
