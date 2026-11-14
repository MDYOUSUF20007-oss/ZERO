import React from 'react';
import type { ThemeConfig, ThemeFamily } from '../../types';
import {
  AMOLED_GRADIENTS,
  KINDLE_PAPER_PRESETS,
  MATTE_STUDIO_PRESETS,
  DEFAULT_THEME_CONFIG,
} from '../../utils/themes';
import { haptics } from '../../utils/haptics';
import { useInterfaceStyle } from '../../context/InterfaceStyleContext';
import {
  Moon,
  BookOpen,
  Layers,
  Check,
  RotateCcw,
  Palette,
} from 'lucide-react';

export interface ClassicStudioProps {
  themeConfig: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
}

const KINDLE_QUICK_INKS = ['#B45309', '#9A3412', '#047857', '#1D4ED8', '#9F1239', '#1C1917'];
const KINDLE_QUICK_PAPERS = ['#F4F1EA', '#EDE0C6', '#E3EDE3', '#E9EDF2', '#F5E9EC', '#FFFFFF'];
const MATTE_QUICK_SURFACES = ['#141518', '#1C1816', '#131820', '#151914', '#1C1415', '#1F2024'];
const MATTE_QUICK_ACCENTS = ['#F59E0B', '#FB923C', '#38BDF8', '#34D399', '#FB7185', '#F4F4F5'];

const CLASSIC_TRADITIONAL_ACCENTS = [
  { label: 'Pure Silver', hex: '#FFFFFF', rgb: '255, 255, 255' },
  { label: 'Amber Flare', hex: '#F59E0B', rgb: '245, 158, 11' },
  { label: 'Neon Emerald', hex: '#10B981', rgb: '16, 185, 129' },
  { label: 'Cobalt Cyber', hex: '#00F0FF', rgb: '0, 240, 255' },
  { label: 'Ruby Crimson', hex: '#FB7185', rgb: '251, 113, 133' },
  { label: 'Ultraviolet', hex: '#C084FC', rgb: '192, 132, 252' },
  { label: 'Solar Gold', hex: '#EAB308', rgb: '234, 179, 8' },
];

export const ClassicStudio: React.FC<ClassicStudioProps> = ({ themeConfig, onChange }) => {
  const { setClassicPreset } = useInterfaceStyle();

  const selectFamily = (family: ThemeFamily) => {
    haptics.tick(780);
    onChange({ ...themeConfig, family });
    if (family === 'amoled') setClassicPreset('amoled');
    if (family === 'kindle') setClassicPreset('paper-kindle');
    if (family === 'matte') setClassicPreset('matte-studio');
  };

  const handleReset = () => {
    haptics.tick(700);
    onChange(DEFAULT_THEME_CONFIG);
    setClassicPreset('amoled');
  };

  const handleSelectTraditionalAccent = (hex: string, rgb: string) => {
    haptics.tick(760);
    const rootEl = document.documentElement;
    rootEl.style.setProperty('--zero-accent', hex);
    rootEl.style.setProperty('--accent-hex', hex);
    rootEl.style.setProperty('--accent-rgb', rgb);
    rootEl.style.setProperty('--zero-dial-stroke', hex);
    rootEl.style.setProperty(
      '--accent-badge-gradient',
      `linear-gradient(135deg, #FFFFFF 0%, ${hex} 100%)`
    );
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Studio Header & Reset Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider">
            Classic UI Studio
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Frosted Obsidian architecture with tactile surface textures
          </p>
        </div>
        <button
          type="button"
          onClick={handleReset}
          className="px-2.5 py-1 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1.5 rounded-lg obsidian-inset-neutral hover:border-white/25 transition-colors"
          title="Reset Classic UI to Pure AMOLED Baseline"
        >
          <RotateCcw size={11} strokeWidth={1.75} />
          <span>Reset</span>
        </button>
      </div>

      {/* Surface Texture Switcher (AMOLED, Paper Kindle E-Ink, Matte Studio Charcoal) */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
          Surface Texture Architecture
        </label>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            type="button"
            onClick={() => selectFamily('amoled')}
            className={`p-3 text-left rounded-2xl transition-all flex flex-col gap-1.5 ${
              themeConfig.family === 'amoled'
                ? 'obsidian-inset text-white font-bold shadow-sm border-white/40'
                : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center bg-black text-white">
                <Moon size={10} />
              </span>
              {themeConfig.family === 'amoled' && (
                <Check size={13} className="text-white shrink-0" />
              )}
            </div>
            <div className="text-xs font-semibold">AMOLED</div>
            <div className="text-[10px] text-zinc-400 font-normal leading-tight">
              Pure + Gradients
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectFamily('kindle')}
            className={`p-3 text-left rounded-2xl transition-all flex flex-col gap-1.5 ${
              themeConfig.family === 'kindle'
                ? 'obsidian-inset text-white font-bold shadow-sm border-white/40'
                : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className="w-5 h-5 rounded-full border border-zinc-500 flex items-center justify-center"
                style={{ backgroundColor: themeConfig.kindlePaperColor }}
              >
                <BookOpen size={10} color={themeConfig.kindleInkAccent} />
              </span>
              {themeConfig.family === 'kindle' && (
                <Check size={13} className="text-white shrink-0" />
              )}
            </div>
            <div className="text-xs font-semibold">Paper Kindle</div>
            <div className="text-[10px] text-zinc-400 font-normal leading-tight">
              E-Ink Light Mode
            </div>
          </button>

          <button
            type="button"
            onClick={() => selectFamily('matte')}
            className={`p-3 text-left rounded-2xl transition-all flex flex-col gap-1.5 ${
              themeConfig.family === 'matte'
                ? 'obsidian-inset text-white font-bold shadow-sm border-white/40'
                : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
            }`}
          >
            <div className="flex items-center justify-between">
              <span
                className="w-5 h-5 rounded-full border border-zinc-500 flex items-center justify-center"
                style={{ backgroundColor: themeConfig.matteBaseColor }}
              >
                <Layers size={10} color={themeConfig.matteAccentColor} />
              </span>
              {themeConfig.family === 'matte' && (
                <Check size={13} className="text-white shrink-0" />
              )}
            </div>
            <div className="text-xs font-semibold">Matte Studio</div>
            <div className="text-[10px] text-zinc-400 font-normal leading-tight">
              Charcoal Hardware
            </div>
          </button>
        </div>
      </div>

      {/* Traditional Accent Tint Pickers */}
      <div className="p-3.5 rounded-2xl obsidian-inset-neutral space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Palette size={11} className="text-zinc-300" />
            <span>Traditional Accent Tints</span>
          </span>
          <span className="text-zinc-500 font-normal lowercase">dial &amp; pill accent</span>
        </div>
        <div className="grid grid-cols-7 gap-2">
          {CLASSIC_TRADITIONAL_ACCENTS.map((accent) => {
            const isSelected =
              document.documentElement.style.getPropertyValue('--accent-hex')?.toUpperCase() ===
              accent.hex.toUpperCase();
            return (
              <button
                key={accent.hex}
                type="button"
                onClick={() => handleSelectTraditionalAccent(accent.hex, accent.rgb)}
                className={`p-1.5 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                  isSelected
                    ? 'border-white bg-white/10 ring-1 ring-white/50 shadow-sm'
                    : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700'
                }`}
                title={accent.label}
              >
                <div
                  className="w-4 h-4 rounded-full border border-white/20 shadow-sm"
                  style={{ backgroundColor: accent.hex }}
                />
                <span className="text-[8px] font-bold text-zinc-300 truncate w-full text-center">
                  {accent.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sub-Texture Details 1: AMOLED Gradients */}
      {themeConfig.family === 'amoled' && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            <span>AMOLED &amp; Gradient Finishes</span>
            <span>True 0% Black Base</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {AMOLED_GRADIENTS.map((preset) => {
              const active = themeConfig.amoledGradient === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    haptics.tick(820);
                    onChange({
                      ...themeConfig,
                      family: 'amoled',
                      amoledGradient: preset.id,
                    });
                  }}
                  className={`p-2.5 text-left flex items-center gap-2.5 rounded-2xl transition-all ${
                    active
                      ? 'obsidian-inset text-white border-white/40 shadow-sm'
                      : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                  }`}
                >
                  <div
                    className="w-8 h-8 rounded-xl border border-white/15 shrink-0"
                    style={{ background: preset.previewCss }}
                  />
                  <div className="min-w-0">
                    <div className="text-[11px] font-semibold text-white truncate">
                      {preset.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate">{preset.tagline}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-Texture Details 2: Paper like Kindle (E-Ink) */}
      {themeConfig.family === 'kindle' && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            <span>Kindle Paper Presets</span>
            <span>E-Ink Contrast</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {KINDLE_PAPER_PRESETS.map((preset) => {
              const active =
                themeConfig.kindlePreset === preset.id &&
                themeConfig.kindlePaperColor.toUpperCase() === preset.paperColor.toUpperCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    haptics.tick(800);
                    onChange({
                      ...themeConfig,
                      family: 'kindle',
                      kindlePreset: preset.id,
                      kindlePaperColor: preset.paperColor,
                      kindleInkAccent: preset.inkAccent,
                    });
                  }}
                  className={`p-2 flex flex-col items-center gap-1 rounded-xl border transition-all ${
                    active ? 'obsidian-inset border-white/40' : 'obsidian-inset-neutral hover:border-white/25'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-lg border border-zinc-500 flex items-center justify-center"
                    style={{ backgroundColor: preset.paperColor }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.inkAccent }}
                    />
                  </span>
                  <span className="text-[9px] font-bold text-zinc-200 truncate w-full text-center">
                    {preset.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Paper & Ink Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 space-y-2 rounded-2xl obsidian-inset-neutral">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase text-zinc-300">Custom Paper Color</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400 font-mono tabular-nums">{themeConfig.kindlePaperColor}</span>
                  <input
                    type="color"
                    value={themeConfig.kindlePaperColor}
                    onChange={(e) =>
                      onChange({
                        ...themeConfig,
                        family: 'kindle',
                        kindlePreset: 'custom',
                        kindlePaperColor: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-6 h-6 rounded-sm border border-zinc-600 bg-transparent cursor-pointer p-0"
                    aria-label="Pick Custom Kindle Paper Color"
                  />
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {KINDLE_QUICK_PAPERS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      haptics.tick(760);
                      onChange({
                        ...themeConfig,
                        family: 'kindle',
                        kindlePreset: 'custom',
                        kindlePaperColor: hex,
                      });
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      themeConfig.kindlePaperColor.toUpperCase() === hex
                        ? 'scale-110 border-white ring-2 ring-white/50'
                        : 'border-zinc-500'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Paper color ${hex}`}
                  />
                ))}
              </div>
            </div>

            <div className="p-3 space-y-2 rounded-2xl obsidian-inset-neutral">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase text-zinc-300">Custom Ink Accent</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400 font-mono tabular-nums">{themeConfig.kindleInkAccent}</span>
                  <input
                    type="color"
                    value={themeConfig.kindleInkAccent}
                    onChange={(e) =>
                      onChange({
                        ...themeConfig,
                        family: 'kindle',
                        kindlePreset: 'custom',
                        kindleInkAccent: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-6 h-6 rounded-sm border border-zinc-600 bg-transparent cursor-pointer p-0"
                    aria-label="Pick Custom Kindle Ink Accent"
                  />
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {KINDLE_QUICK_INKS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      haptics.tick(760);
                      onChange({
                        ...themeConfig,
                        family: 'kindle',
                        kindlePreset: 'custom',
                        kindleInkAccent: hex,
                      });
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      themeConfig.kindleInkAccent.toUpperCase() === hex
                        ? 'scale-110 border-white ring-2 ring-white/50'
                        : 'border-zinc-500'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Ink accent ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Texture Details 3: Matte Studio Charcoal */}
      {themeConfig.family === 'matte' && (
        <div className="space-y-3 pt-3 border-t border-white/10">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
            <span>Matte Studio Finishes</span>
            <span>Low-Glare Hardware</span>
          </div>
          <div className="grid grid-cols-5 gap-1.5">
            {MATTE_STUDIO_PRESETS.map((preset) => {
              const active =
                themeConfig.mattePreset === preset.id &&
                themeConfig.matteBaseColor.toUpperCase() === preset.baseColor.toUpperCase();
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    haptics.tick(800);
                    onChange({
                      ...themeConfig,
                      family: 'matte',
                      mattePreset: preset.id,
                      matteBaseColor: preset.baseColor,
                      matteAccentColor: preset.accentColor,
                    });
                  }}
                  className={`p-2 flex flex-col items-center gap-1 rounded-xl border transition-all ${
                    active ? 'obsidian-inset border-white/40' : 'obsidian-inset-neutral hover:border-white/25'
                  }`}
                >
                  <span
                    className="w-6 h-6 rounded-lg border border-zinc-600 flex items-center justify-center"
                    style={{ backgroundColor: preset.baseColor }}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: preset.accentColor }}
                    />
                  </span>
                  <span className="text-[9px] font-bold text-zinc-200 truncate w-full text-center">
                    {preset.label.split(' ')[0]}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Custom Matte Surface & Accent Pickers */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="p-3 space-y-2 rounded-2xl obsidian-inset-neutral">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase text-zinc-300">Custom Matte Base</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400 font-mono tabular-nums">{themeConfig.matteBaseColor}</span>
                  <input
                    type="color"
                    value={themeConfig.matteBaseColor}
                    onChange={(e) =>
                      onChange({
                        ...themeConfig,
                        family: 'matte',
                        mattePreset: 'custom',
                        matteBaseColor: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-6 h-6 rounded-sm border border-zinc-600 bg-transparent cursor-pointer p-0"
                    aria-label="Pick Custom Matte Base Color"
                  />
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MATTE_QUICK_SURFACES.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      haptics.tick(760);
                      onChange({
                        ...themeConfig,
                        family: 'matte',
                        mattePreset: 'custom',
                        matteBaseColor: hex,
                      });
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      themeConfig.matteBaseColor.toUpperCase() === hex
                        ? 'scale-110 border-white ring-2 ring-white/50'
                        : 'border-zinc-500'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Matte surface ${hex}`}
                  />
                ))}
              </div>
            </div>

            <div className="p-3 space-y-2 rounded-2xl obsidian-inset-neutral">
              <div className="flex items-center justify-between text-[10px]">
                <span className="font-bold uppercase text-zinc-300">Custom Studio Accent</span>
                <label className="inline-flex items-center gap-1.5 cursor-pointer">
                  <span className="text-zinc-400 font-mono tabular-nums">{themeConfig.matteAccentColor}</span>
                  <input
                    type="color"
                    value={themeConfig.matteAccentColor}
                    onChange={(e) =>
                      onChange({
                        ...themeConfig,
                        family: 'matte',
                        mattePreset: 'custom',
                        matteAccentColor: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-6 h-6 rounded-sm border border-zinc-600 bg-transparent cursor-pointer p-0"
                    aria-label="Pick Custom Matte Accent Color"
                  />
                </label>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap">
                {MATTE_QUICK_ACCENTS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    onClick={() => {
                      haptics.tick(760);
                      onChange({
                        ...themeConfig,
                        family: 'matte',
                        mattePreset: 'custom',
                        matteAccentColor: hex,
                      });
                    }}
                    className={`w-6 h-6 rounded-full border transition-transform ${
                      themeConfig.matteAccentColor.toUpperCase() === hex
                        ? 'scale-110 border-white ring-2 ring-white/50'
                        : 'border-zinc-500'
                    }`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Matte accent ${hex}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClassicStudio;
