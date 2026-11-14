import React from 'react';
import type { ThemeConfig, EngineType } from '../types';
import { haptics } from '../utils/haptics';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { ClassicStudio } from './studios/ClassicStudio';
import { ClassicV2Studio } from './studios/ClassicV2Studio';
import { TrantorStudio } from './studios/TrantorStudio';
import { MaterialYouStudio } from './studios/MaterialYouStudio';
import { FluentGlassStudio } from './studios/FluentGlassStudio';
import { MinimalistStudio } from './studios/MinimalistStudio';
import {
  Palette,
  Layers,
  Sparkles,
  Droplet,
  Zap,
  Check,
  Shield,
  Wallet,
} from 'lucide-react';

export interface ThemeStudioProps {
  themeConfig: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
}

export const ThemeStudio: React.FC<ThemeStudioProps> = ({ themeConfig, onChange }) => {
  const {
    engine,
    setEngine,
    classicPreset,
    m3Palette,
    amoled,
    isClassicV2,
    isTrantor,
    isMaterialYou,
    isFluentGlass,
    isBespoke,
  } = useInterfaceStyle();

  const handleSelectEngine = (nextEngine: EngineType) => {
    haptics.tick(750);
    setEngine(nextEngine);
  };

  const activeThemeSummary = isTrantor
    ? 'Trantor Sage-Obsidian • Fintech Mobile Wallet'
    : isClassicV2
    ? 'Classic UI Version 2 (Beta Test) • Onyx Shield'
    : isMaterialYou
    ? `Material You (M3) • ${m3Palette.replace('-', ' ')} • ${amoled ? 'AMOLED' : 'Tonal'}`
    : isFluentGlass
    ? 'Fluent Glass • Optic Acrylic Refraction'
    : isBespoke
    ? 'Bespoke Minimalist • 1px Structural #000000'
    : themeConfig.family === 'amoled' || classicPreset === 'amoled'
    ? `Classic UI AMOLED • ${themeConfig.amoledGradient}`
    : themeConfig.family === 'kindle' || classicPreset === 'paper-kindle'
    ? `Classic UI Kindle • ${themeConfig.kindlePaperColor}`
    : `Classic UI Matte • ${themeConfig.matteBaseColor}`;

  return (
    <ObsidianCard
      ambientGlow={!isBespoke}
      className={isBespoke || isFluentGlass || isMaterialYou ? 'font-sans' : 'font-mono'}
      headerClassName="p-4 sm:p-5 space-y-4"
      footerClassName="px-4 sm:px-5 py-3 flex items-center justify-between gap-2 flex-wrap text-[11px] text-zinc-400"
      headerContent={
        <>
          {/* Universal Engine Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs text-white font-semibold uppercase tracking-wider">
              <div
                className={`w-8 h-8 flex items-center justify-center shrink-0 ${
                  isFluentGlass
                    ? 'liquid-squircle text-cyan-200'
                    : isMaterialYou
                    ? 'rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]'
                    : isBespoke
                    ? 'rounded-md bg-neutral-900 border border-neutral-700 text-blue-400'
                    : 'rounded-xl obsidian-icon-box'
                }`}
              >
                <Palette
                  size={15}
                  strokeWidth={1.75}
                  style={
                    isFluentGlass || isMaterialYou
                      ? undefined
                      : { color: 'var(--accent-hex, var(--zero-accent))' }
                  }
                />
              </div>
              <div className="flex flex-col">
                <span className="leading-tight">Theme Studio</span>
                <span className="text-[10px] text-zinc-400 font-normal lowercase tracking-normal">
                  Universal Design Engine
                </span>
              </div>
            </div>

            <span
              className={`text-[10px] font-bold uppercase px-2.5 py-0.5 border shrink-0 ${
                isTrantor
                  ? 'rounded-full border-teal-500/50 bg-teal-500/15 text-teal-300'
                  : isClassicV2
                  ? 'rounded-full border-amber-500/50 bg-amber-500/15 text-amber-300'
                  : isMaterialYou
                  ? 'rounded-full border-transparent bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]'
                  : isFluentGlass
                  ? 'rounded-full liquid-pill-active border-transparent'
                  : isBespoke
                  ? 'rounded-sm border-blue-500/50 bg-blue-600/20 text-blue-300'
                  : 'rounded-full obsidian-pill-active font-bold'
              }`}
            >
              {engine === 'trantor'
                ? 'Trantor Sage'
                : engine === 'classic-v2'
                ? 'Classic v2 (Beta)'
                : engine === 'material-you'
                ? 'Material You'
                : engine === 'fluent'
                ? 'Fluent Glass'
                : engine === 'minimalist'
                ? 'Bespoke'
                : 'Classic UI'}
            </span>
          </div>

          {/* Top Engine Selector Strip */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-zinc-400">
              <span>Select Engine Studio</span>
              <span className="text-zinc-500 font-normal lowercase">pure css scoped</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2" role="radiogroup" aria-label="Engine Selector">
              {[
                {
                  id: 'classic' as const,
                  name: 'Classic UI',
                  tag: 'Obsidian',
                  icon: Layers,
                },
                {
                  id: 'classic-v2' as const,
                  name: 'Classic v2',
                  tag: 'Beta Test',
                  icon: Shield,
                },
                {
                  id: 'trantor' as const,
                  name: 'Trantor',
                  tag: 'Sage-Obsidian',
                  icon: Wallet,
                },
                {
                  id: 'material-you' as const,
                  name: 'Material You',
                  tag: 'M3 Tonal',
                  icon: Sparkles,
                },
                {
                  id: 'fluent' as const,
                  name: 'Fluent Glass',
                  tag: 'Acrylic',
                  icon: Droplet,
                },
                {
                  id: 'minimalist' as const,
                  name: 'Bespoke',
                  tag: 'Mechanical',
                  icon: Zap,
                },
              ].map((item) => {
                const isSelected = engine === item.id;
                const IconComponent = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleSelectEngine(item.id)}
                    className={`p-2.5 text-left rounded-xl border transition-all flex flex-col gap-1 ${
                      isSelected
                        ? isTrantor
                          ? 'border-teal-400 bg-[#121418] text-[#F3F4F6] font-semibold shadow-md'
                          : isClassicV2
                          ? 'border-amber-400 bg-zinc-900 text-white font-semibold shadow-md'
                          : isMaterialYou
                          ? 'border-[var(--m3-primary)] bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] shadow-sm'
                          : isFluentGlass
                          ? 'border-cyan-300/60 bg-white/10 text-white shadow-lg'
                          : isBespoke
                          ? 'border-blue-500 bg-neutral-950 text-white font-semibold'
                          : 'border-white/40 bg-zinc-900/90 text-white font-semibold'
                        : 'border-zinc-800 bg-zinc-950/40 text-zinc-400 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <IconComponent size={13} className={isSelected ? 'text-white' : 'text-zinc-400'} />
                      {isSelected && <Check size={12} className="shrink-0 text-white" />}
                    </div>
                    <div className="text-xs font-semibold truncate leading-tight">{item.name}</div>
                    <div className="text-[10px] text-zinc-400 leading-none">{item.tag}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* DYNAMICALLY RENDER INDEPENDENT ENGINE-NATIVE STUDIOS */}
          {engine === 'classic' && (
            <ClassicStudio themeConfig={themeConfig} onChange={onChange} />
          )}

          {engine === 'classic-v2' && <ClassicV2Studio />}

          {engine === 'trantor' && <TrantorStudio />}

          {engine === 'material-you' && <MaterialYouStudio />}

          {engine === 'fluent' && <FluentGlassStudio />}

          {engine === 'minimalist' && <MinimalistStudio />}
        </>
      }
      footerContent={
        <>
          <span className="text-zinc-300 font-semibold">{activeThemeSummary}</span>
          <span className="text-zinc-500 font-mono text-[10px]">Engine Isolated</span>
        </>
      }
    />
  );
};

export default ThemeStudio;
