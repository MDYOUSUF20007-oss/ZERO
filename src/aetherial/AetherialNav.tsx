import React from 'react';
import { LayoutDashboard, Timer, Briefcase, BarChart3 } from 'lucide-react';

export type AetherialTab = 'dashboard' | 'focus' | 'bags' | 'analytics';

interface AetherialNavProps {
  activeTab: AetherialTab;
  onTabChange: (tab: AetherialTab) => void;
}

export const AetherialNav: React.FC<AetherialNavProps> = ({ activeTab, onTabChange }) => {
  const tabs: Array<{ id: AetherialTab; label: string; icon: React.ReactNode }> = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={20} strokeWidth={2} /> },
    { id: 'focus', label: 'Focus', icon: <Timer size={20} strokeWidth={2} /> },
    { id: 'bags', label: 'Study Bags', icon: <Briefcase size={20} strokeWidth={2} /> },
    { id: 'analytics', label: 'Analytics', icon: <BarChart3 size={20} strokeWidth={2} /> },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-50 pb-safe pointer-events-none flex justify-center">
      <div className="pointer-events-auto w-[calc(100%-2rem)] max-w-md mx-auto mb-4 h-16 rounded-full bg-[#191b24]/90 backdrop-blur-xl shadow-2xl flex items-center justify-around px-3 border border-white/10 select-none">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center min-w-[52px] min-h-[44px] px-3 py-1 rounded-full transition-all duration-200 active:scale-95 cursor-pointer ${
                isActive
                  ? 'text-[#38bdf8] drop-shadow-[0_0_12px_rgba(56,189,248,0.55)] font-semibold'
                  : 'text-[#87929a] hover:text-[#e2e1ed] font-medium'
              }`}
            >
              {tab.icon}
              <span className="text-[11px] font-sans mt-0.5 tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
