import React from 'react';
import type { ThemeConfig } from '../types';
import { haptics } from '../utils/haptics';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { Palette, Check } from 'lucide-react';

export interface ThemeStudioProps {
  themeConfig?: ThemeConfig;
  onChange?: (next: ThemeConfig) => void;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = () => {
  const { theme, setTheme, availableThemes, activeEngine } = useInterfaceStyle();

  const handleSelectTheme = (themeId: string) => {
    haptics.tick(750);
    setTheme(themeId);
  };

  return (
    <div className="theme-card p-4 sm:p-5 space-y-4 font-sans">
      {/* Universal Engine Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 text-xs theme-text-primary font-semibold uppercase tracking-wider">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 theme-bg-secondary border theme-border">
            <Palette size={15} strokeWidth={1.75} className="theme-text-accent" />
          </div>
          <div className="flex flex-col">
            <span className="leading-tight">Theme Engine</span>
            <span className="text-[10px] theme-text-muted font-normal lowercase tracking-normal">
              Isolated DOM Engine Architecture
            </span>
          </div>
        </div>

        <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full theme-pill-active border shrink-0">
          {activeEngine.badge}
        </span>
      </div>

      {/* Top Engine Selector Strip */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider theme-text-muted">
          <span>Active Interface Theme</span>
          <span className="theme-text-muted font-normal lowercase">single-mount css</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5" role="radiogroup" aria-label="Theme Selector">
          {availableThemes.map((item) => {
            const isSelected = theme === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => handleSelectTheme(item.id)}
                className={`p-3 text-left transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                  isSelected ? 'theme-pill-active' : 'theme-pill hover:opacity-90'
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  {/* Swatch dots */}
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: item.swatchBg }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: item.swatchSurface }}
                    />
                    <span
                      className="w-2.5 h-2.5 rounded-full border border-white/20 shrink-0"
                      style={{ backgroundColor: item.swatchAccent }}
                    />
                  </div>
                  {isSelected && <Check size={14} className="shrink-0 theme-text-accent" />}
                </div>

                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-semibold leading-tight">{item.name}</span>
                    <span className="text-[9px] uppercase px-1.5 py-0.2 rounded border theme-border font-mono">
                      {item.badge}
                    </span>
                  </div>
                  <span className="text-[10px] theme-text-muted line-clamp-2 leading-tight">
                    {item.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Footer info bar */}
      <div className="pt-2 border-t theme-border flex items-center justify-between gap-2 flex-wrap text-[11px] theme-text-muted">
        <span className="theme-text-primary font-semibold">{activeEngine.name} • {activeEngine.badge}</span>
        <span className="font-mono text-[10px]">Zero Class Leakage</span>
      </div>
    </div>
  );
};

export default ThemeStudio;
