import React from 'react';
import type { ThemeConfig, ThemeFamily } from '../types';
import {
  AMOLED_GRADIENTS,
  KINDLE_PAPER_PRESETS,
  MATTE_STUDIO_PRESETS,
  DEFAULT_THEME_CONFIG,
} from '../utils/themes';
import { haptics } from '../utils/haptics';
import { ObsidianCard } from './ObsidianCard';
import { Palette, Moon, BookOpen, Layers, Check, RotateCcw } from 'lucide-react';

interface ThemeSelectorCardProps {
  themeConfig: ThemeConfig;
  onChange: (next: ThemeConfig) => void;
}

const KINDLE_QUICK_INKS = ['#B45309', '#9A3412', '#047857', '#1D4ED8', '#9F1239', '#1C1917'];
const KINDLE_QUICK_PAPERS = ['#F4F1EA', '#EDE0C6', '#E3EDE3', '#E9EDF2', '#F5E9EC', '#FFFFFF'];

const MATTE_QUICK_SURFACES = ['#141518', '#1C1816', '#131820', '#151914', '#1C1415', '#1F2024'];
const MATTE_QUICK_ACCENTS = ['#F59E0B', '#FB923C', '#38BDF8', '#34D399', '#FB7185', '#F4F4F5'];

export const ThemeSelectorCard: React.FC<ThemeSelectorCardProps> = ({
  themeConfig,
  onChange,
}) => {
  const selectFamily = (family: ThemeFamily) => {
    haptics.tick(780);
    onChange({ ...themeConfig, family });
  };

  const activeThemeSummary =
    themeConfig.family === 'amoled'
      ? `AMOLED (${themeConfig.amoledGradient})`
      : themeConfig.family === 'kindle'
      ? `Paper Kindle • ${themeConfig.kindlePaperColor}`
      : `Matte Studio • ${themeConfig.matteBaseColor}`;

  return (
    <ObsidianCard
      ambientGlow
      className="font-mono"
      headerClassName="p-4 sm:p-5 space-y-4"
      footerClassName="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] text-zinc-400"
      headerContent={
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-xs text-white font-black uppercase tracking-wider">
              <Palette size={15} style={{ color: 'var(--zero-accent)' }} />
              <span>Theme Studio</span>
            </div>
            <button
              type="button"
              onClick={() => {
                haptics.tick(700);
                onChange(DEFAULT_THEME_CONFIG);
              }}
              className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:border-zinc-600 text-[10px] text-zinc-400 hover:text-white flex items-center gap-1"
              title="Reset Theme Studio to Pure AMOLED"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>

          {/* 3 Primary Theme Families */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => selectFamily('amoled')}
              style={{
                borderColor: themeConfig.family === 'amoled' ? 'var(--zero-accent)' : undefined,
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                themeConfig.family === 'amoled'
                  ? 'border-amber-400 bg-zinc-900 text-white font-bold shadow-sm'
                  : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className="w-5 h-5 rounded-full border border-zinc-600 flex items-center justify-center"
                  style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                >
                  <Moon size={10} />
                </span>
                {themeConfig.family === 'amoled' && (
                  <Check size={13} style={{ color: 'var(--zero-accent)' }} className="shrink-0" />
                )}
              </div>
              <div className="text-xs font-black">AMOLED</div>
              <div className="text-[9px] text-zinc-400 font-normal leading-tight">
                Pure + Gradients
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFamily('kindle')}
              style={{
                borderColor: themeConfig.family === 'kindle' ? 'var(--zero-accent)' : undefined,
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                themeConfig.family === 'kindle'
                  ? 'border-amber-400 bg-zinc-900 text-white font-bold shadow-sm'
                  : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
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
                  <Check size={13} style={{ color: 'var(--zero-accent)' }} className="shrink-0" />
                )}
              </div>
              <div className="text-xs font-black">Paper Kindle</div>
              <div className="text-[9px] text-zinc-400 font-normal leading-tight">
                E-Ink + Custom
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFamily('matte')}
              style={{
                borderColor: themeConfig.family === 'matte' ? 'var(--zero-accent)' : undefined,
              }}
              className={`p-3 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                themeConfig.family === 'matte'
                  ? 'border-amber-400 bg-zinc-900 text-white font-bold shadow-sm'
                  : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
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
                  <Check size={13} style={{ color: 'var(--zero-accent)' }} className="shrink-0" />
                )}
              </div>
              <div className="text-xs font-black">Matte Studio</div>
              <div className="text-[9px] text-zinc-400 font-normal leading-tight">
                Charcoal + Custom
              </div>
            </button>
          </div>

          {/* Sub-Customizer 1: AMOLED & Gradient AMOLEDs */}
          {themeConfig.family === 'amoled' && (
            <div className="space-y-2.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                <span>AMOLED &amp; Gradient Finishes</span>
                <span className="text-zinc-400">True 0% Black Base</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
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
                      style={{
                        borderColor: active ? 'var(--zero-accent)' : undefined,
                      }}
                      className={`p-2.5 rounded-2xl border text-left flex items-center gap-2.5 transition-all ${
                        active
                          ? 'border-amber-400 bg-zinc-900 text-white'
                          : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      <div
                        className="w-8 h-8 rounded-xl border border-zinc-700 shrink-0"
                        style={{ background: preset.previewCss }}
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-white truncate">
                          {preset.label}
                        </div>
                        <div className="text-[9px] text-zinc-400 truncate">{preset.tagline}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sub-Customizer 2: Paper like Kindle + Customizable Paper & Ink Colors */}
          {themeConfig.family === 'kindle' && (
            <div className="space-y-3 pt-2 border-t border-white/10">
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
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        active
                          ? 'border-amber-400 ring-1 ring-amber-400/60 bg-zinc-900'
                          : 'border-zinc-850 bg-black hover:border-zinc-700'
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

              {/* Custom Kindle Paper & Ink Pickers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Paper Color</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400">{themeConfig.kindlePaperColor}</span>
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
                        className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer p-0"
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
                            ? 'scale-110 ring-2 ring-amber-400 border-black'
                            : 'border-zinc-500'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Paper color ${hex}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Ink Accent</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400">{themeConfig.kindleInkAccent}</span>
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
                        className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer p-0"
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
                            ? 'scale-110 ring-2 ring-amber-400 border-white'
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

          {/* Sub-Customizer 3: Matte Studio + Customizable Surface & Accent Colors */}
          {themeConfig.family === 'matte' && (
            <div className="space-y-3 pt-2 border-t border-white/10">
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
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                        active
                          ? 'border-amber-400 ring-1 ring-amber-400/60 bg-zinc-900'
                          : 'border-zinc-850 bg-black hover:border-zinc-700'
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
                <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Matte Base</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400">{themeConfig.matteBaseColor}</span>
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
                        className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer p-0"
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
                            ? 'scale-110 ring-2 ring-amber-400 border-white'
                            : 'border-zinc-500'
                        }`}
                        style={{ backgroundColor: hex }}
                        aria-label={`Matte surface ${hex}`}
                      />
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Studio Accent</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400">{themeConfig.matteAccentColor}</span>
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
                        className="w-6 h-6 rounded border border-zinc-600 bg-transparent cursor-pointer p-0"
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
                            ? 'scale-110 ring-2 ring-amber-400 border-black'
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
        </>
      }
      footerContent={
        <>
          <span className="text-zinc-300 font-bold uppercase">{activeThemeSummary}</span>
          <span>Saved locally &amp; exported in backups</span>
        </>
      }
    />
  );
};
