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
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
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
  const { isBespoke } = useInterfaceStyle();

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
      ambientGlow={!isBespoke}
      className={isBespoke ? 'font-sans' : 'font-mono'}
      headerClassName={isBespoke ? 'p-5 space-y-5' : 'p-4 sm:p-5 space-y-4'}
      footerClassName={
        isBespoke
          ? 'px-5 py-3 flex items-center justify-between gap-2 flex-wrap text-[11px] text-neutral-400'
          : 'px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] text-zinc-400'
      }
      headerContent={
        <>
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 text-xs text-white font-semibold uppercase tracking-wider">
              <div
                className={`w-8 h-8 obsidian-icon-box flex items-center justify-center shrink-0 ${
                  isBespoke ? 'rounded-md' : 'rounded-xl'
                }`}
              >
                <Palette size={15} style={{ color: 'var(--accent-hex, var(--zero-accent))' }} />
              </div>
              <span>Theme Studio</span>
            </div>
            <button
              type="button"
              onClick={() => {
                haptics.tick(700);
                onChange(DEFAULT_THEME_CONFIG);
              }}
              className={`px-2.5 py-1 obsidian-inset-neutral hover:border-white/25 text-[11px] text-zinc-300 hover:text-white flex items-center gap-1 ${
                isBespoke ? 'rounded-md transition-colors duration-75' : 'rounded-lg transition-colors'
              }`}
              title="Reset Theme Studio to Pure AMOLED"
            >
              <RotateCcw size={10} />
              <span>Reset</span>
            </button>
          </div>

          {/* 3 Primary Theme Families */}
          <div className="grid grid-cols-3 gap-2.5">
            <button
              type="button"
              onClick={() => selectFamily('amoled')}
              style={{
                borderColor:
                  themeConfig.family === 'amoled'
                    ? 'var(--accent-hex, var(--zero-accent))'
                    : undefined,
              }}
              className={`p-3 text-left flex flex-col gap-1.5 ${
                isBespoke
                  ? `rounded-md border transition-colors duration-75 ${
                      themeConfig.family === 'amoled'
                        ? 'bg-neutral-950 text-white font-semibold'
                        : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`
                  : `rounded-2xl transition-all ${
                      themeConfig.family === 'amoled'
                        ? 'obsidian-inset text-white font-bold shadow-sm'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-5 h-5 border border-zinc-600 flex items-center justify-center ${
                    isBespoke ? 'rounded-sm' : 'rounded-full'
                  }`}
                  style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
                >
                  <Moon size={10} />
                </span>
                {themeConfig.family === 'amoled' && (
                  <Check
                    size={13}
                    style={{ color: 'var(--accent-hex, var(--zero-accent))' }}
                    className="shrink-0"
                  />
                )}
              </div>
              <div className="text-xs font-semibold">AMOLED</div>
              <div className="text-[10px] text-zinc-400 font-normal leading-tight">
                {isBespoke ? 'Pure #000000' : 'Pure + Gradients'}
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFamily('kindle')}
              style={{
                borderColor:
                  themeConfig.family === 'kindle'
                    ? 'var(--accent-hex, var(--zero-accent))'
                    : undefined,
              }}
              className={`p-3 text-left flex flex-col gap-1.5 ${
                isBespoke
                  ? `rounded-md border transition-colors duration-75 ${
                      themeConfig.family === 'kindle'
                        ? 'bg-neutral-950 text-white font-semibold'
                        : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`
                  : `rounded-2xl transition-all ${
                      themeConfig.family === 'kindle'
                        ? 'obsidian-inset text-white font-bold shadow-sm'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-5 h-5 border border-zinc-500 flex items-center justify-center ${
                    isBespoke ? 'rounded-sm' : 'rounded-full'
                  }`}
                  style={{ backgroundColor: themeConfig.kindlePaperColor }}
                >
                  <BookOpen size={10} color={themeConfig.kindleInkAccent} />
                </span>
                {themeConfig.family === 'kindle' && (
                  <Check
                    size={13}
                    style={{ color: 'var(--accent-hex, var(--zero-accent))' }}
                    className="shrink-0"
                  />
                )}
              </div>
              <div className="text-xs font-semibold">Paper Kindle</div>
              <div className="text-[10px] text-zinc-400 font-normal leading-tight">
                E-Ink + Custom
              </div>
            </button>

            <button
              type="button"
              onClick={() => selectFamily('matte')}
              style={{
                borderColor:
                  themeConfig.family === 'matte'
                    ? 'var(--accent-hex, var(--zero-accent))'
                    : undefined,
              }}
              className={`p-3 text-left flex flex-col gap-1.5 ${
                isBespoke
                  ? `rounded-md border transition-colors duration-75 ${
                      themeConfig.family === 'matte'
                        ? 'bg-neutral-950 text-white font-semibold'
                        : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                    }`
                  : `rounded-2xl transition-all ${
                      themeConfig.family === 'matte'
                        ? 'obsidian-inset text-white font-bold shadow-sm'
                        : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                    }`
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`w-5 h-5 border border-zinc-500 flex items-center justify-center ${
                    isBespoke ? 'rounded-sm' : 'rounded-full'
                  }`}
                  style={{ backgroundColor: themeConfig.matteBaseColor }}
                >
                  <Layers size={10} color={themeConfig.matteAccentColor} />
                </span>
                {themeConfig.family === 'matte' && (
                  <Check
                    size={13}
                    style={{ color: 'var(--accent-hex, var(--zero-accent))' }}
                    className="shrink-0"
                  />
                )}
              </div>
              <div className="text-xs font-semibold">Matte Studio</div>
              <div className="text-[10px] text-zinc-400 font-normal leading-tight">
                {isBespoke ? 'Classic Charcoal' : 'Charcoal + Custom'}
              </div>
            </button>
          </div>

          {/* Sub-Customizer 1: AMOLED & Gradient AMOLEDs */}
          {themeConfig.family === 'amoled' && (
            <div
              className={`space-y-3 pt-3 border-t ${
                isBespoke ? 'border-neutral-800' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                <span>
                  {isBespoke ? 'Classic UI Gradient Finishes' : 'AMOLED & Gradient Finishes'}
                </span>
                <span className="text-zinc-400">
                  {isBespoke ? 'Locked Pure #000000 in Bespoke' : 'True 0% Black Base'}
                </span>
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
                      style={{
                        borderColor: active
                          ? 'var(--accent-hex, var(--zero-accent))'
                          : undefined,
                      }}
                      className={`p-2.5 text-left flex items-center gap-2.5 ${
                        isBespoke
                          ? `rounded-md border transition-colors duration-75 ${
                              active
                                ? 'bg-neutral-950 text-white'
                                : 'bg-black border-neutral-800 text-neutral-400 hover:border-neutral-600'
                            }`
                          : `rounded-2xl transition-all ${
                              active
                                ? 'obsidian-inset text-white'
                                : 'obsidian-inset-neutral text-zinc-400 hover:border-white/25'
                            }`
                      }`}
                    >
                      <div
                        className={`w-8 h-8 border shrink-0 ${
                          isBespoke ? 'rounded-sm border-neutral-700' : 'rounded-xl border-white/15'
                        }`}
                        style={{
                          background: isBespoke ? '#000000' : preset.previewCss,
                        }}
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

          {/* Sub-Customizer 2: Paper like Kindle + Customizable Paper & Ink Colors */}
          {themeConfig.family === 'kindle' && (
            <div
              className={`space-y-3 pt-3 border-t ${
                isBespoke ? 'border-neutral-800' : 'border-white/10'
              }`}
            >
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
                      style={
                        !isBespoke && active
                          ? {
                              borderColor: 'var(--accent-hex, #FFFFFF)',
                              boxShadow: '0 0 0 1px var(--accent-hex, #FFFFFF)',
                            }
                          : undefined
                      }
                      className={`p-2 flex flex-col items-center gap-1 ${
                        isBespoke
                          ? `rounded-md border transition-colors duration-75 ${
                              active
                                ? 'bg-neutral-950 border-blue-500'
                                : 'bg-black border-neutral-800 hover:border-neutral-600'
                            }`
                          : `rounded-xl border transition-all ${
                              active
                                ? 'obsidian-inset'
                                : 'obsidian-inset-neutral hover:border-white/25'
                            }`
                      }`}
                    >
                      <span
                        className={`w-6 h-6 border border-zinc-500 flex items-center justify-center ${
                          isBespoke ? 'rounded-sm' : 'rounded-lg'
                        }`}
                        style={{ backgroundColor: preset.paperColor }}
                      >
                        <span
                          className={`w-2.5 h-2.5 ${isBespoke ? 'rounded-sm' : 'rounded-full'}`}
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
                <div
                  className={`p-3 space-y-2 ${
                    isBespoke
                      ? 'rounded-md bg-neutral-950 border border-neutral-800'
                      : 'rounded-2xl obsidian-inset-neutral'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Paper Color</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400 font-mono tabular-nums">
                        {themeConfig.kindlePaperColor}
                      </span>
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
                    {KINDLE_QUICK_PAPERS.map((hex) => {
                      const selected = themeConfig.kindlePaperColor.toUpperCase() === hex;
                      return (
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
                          className={`w-6 h-6 border ${
                            isBespoke
                              ? `rounded-sm transition-colors duration-75 ${
                                  selected ? 'ring-2 ring-blue-500 border-black' : 'border-neutral-600'
                                }`
                              : `rounded-full transition-transform ${
                                  selected ? 'scale-110' : 'border-zinc-500'
                                }`
                          }`}
                          style={{
                            backgroundColor: hex,
                            ...( !isBespoke && selected
                              ? {
                                  borderColor: 'var(--accent-hex, #FFFFFF)',
                                  boxShadow: '0 0 0 2px var(--accent-hex, #FFFFFF)',
                                }
                              : {}),
                          }}
                          aria-label={`Paper color ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`p-3 space-y-2 ${
                    isBespoke
                      ? 'rounded-md bg-neutral-950 border border-neutral-800'
                      : 'rounded-2xl obsidian-inset-neutral'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Ink Accent</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400 font-mono tabular-nums">
                        {themeConfig.kindleInkAccent}
                      </span>
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
                    {KINDLE_QUICK_INKS.map((hex) => {
                      const selected = themeConfig.kindleInkAccent.toUpperCase() === hex;
                      return (
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
                          className={`w-6 h-6 border ${
                            isBespoke
                              ? `rounded-sm transition-colors duration-75 ${
                                  selected ? 'ring-2 ring-blue-500 border-white' : 'border-neutral-600'
                                }`
                              : `rounded-full transition-transform ${
                                  selected ? 'scale-110' : 'border-zinc-500'
                                }`
                          }`}
                          style={{
                            backgroundColor: hex,
                            ...(!isBespoke && selected
                              ? {
                                  borderColor: 'var(--accent-hex, #FFFFFF)',
                                  boxShadow: '0 0 0 2px var(--accent-hex, #FFFFFF)',
                                }
                              : {}),
                          }}
                          aria-label={`Ink accent ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Sub-Customizer 3: Matte Studio + Customizable Surface & Accent Colors */}
          {themeConfig.family === 'matte' && (
            <div
              className={`space-y-3 pt-3 border-t ${
                isBespoke ? 'border-neutral-800' : 'border-white/10'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-zinc-400 font-bold">
                <span>Matte Studio Finishes</span>
                <span>{isBespoke ? 'Active in Classic UI' : 'Low-Glare Hardware'}</span>
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
                      style={
                        !isBespoke && active
                          ? {
                              borderColor: 'var(--accent-hex, #FFFFFF)',
                              boxShadow: '0 0 0 1px var(--accent-hex, #FFFFFF)',
                            }
                          : undefined
                      }
                      className={`p-2 flex flex-col items-center gap-1 ${
                        isBespoke
                          ? `rounded-md border transition-colors duration-75 ${
                              active
                                ? 'bg-neutral-950 border-blue-500'
                                : 'bg-black border-neutral-800 hover:border-neutral-600'
                            }`
                          : `rounded-xl border transition-all ${
                              active
                                ? 'obsidian-inset'
                                : 'obsidian-inset-neutral hover:border-white/25'
                            }`
                      }`}
                    >
                      <span
                        className={`w-6 h-6 border border-zinc-600 flex items-center justify-center ${
                          isBespoke ? 'rounded-sm' : 'rounded-lg'
                        }`}
                        style={{ backgroundColor: preset.baseColor }}
                      >
                        <span
                          className={`w-2.5 h-2.5 ${isBespoke ? 'rounded-sm' : 'rounded-full'}`}
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
                <div
                  className={`p-3 space-y-2 ${
                    isBespoke
                      ? 'rounded-md bg-neutral-950 border border-neutral-800'
                      : 'rounded-2xl obsidian-inset-neutral'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Matte Base</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400 font-mono tabular-nums">
                        {themeConfig.matteBaseColor}
                      </span>
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
                    {MATTE_QUICK_SURFACES.map((hex) => {
                      const selected = themeConfig.matteBaseColor.toUpperCase() === hex;
                      return (
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
                          className={`w-6 h-6 border ${
                            isBespoke
                              ? `rounded-sm transition-colors duration-75 ${
                                  selected ? 'ring-2 ring-blue-500 border-white' : 'border-neutral-600'
                                }`
                              : `rounded-full transition-transform ${
                                  selected ? 'scale-110' : 'border-zinc-500'
                                }`
                          }`}
                          style={{
                            backgroundColor: hex,
                            ...(!isBespoke && selected
                              ? {
                                  borderColor: 'var(--accent-hex, #FFFFFF)',
                                  boxShadow: '0 0 0 2px var(--accent-hex, #FFFFFF)',
                                }
                              : {}),
                          }}
                          aria-label={`Matte surface ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>

                <div
                  className={`p-3 space-y-2 ${
                    isBespoke
                      ? 'rounded-md bg-neutral-950 border border-neutral-800'
                      : 'rounded-2xl obsidian-inset-neutral'
                  }`}
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-bold uppercase text-zinc-300">Custom Studio Accent</span>
                    <label className="inline-flex items-center gap-1.5 cursor-pointer">
                      <span className="text-zinc-400 font-mono tabular-nums">
                        {themeConfig.matteAccentColor}
                      </span>
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
                    {MATTE_QUICK_ACCENTS.map((hex) => {
                      const selected = themeConfig.matteAccentColor.toUpperCase() === hex;
                      return (
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
                          className={`w-6 h-6 border ${
                            isBespoke
                              ? `rounded-sm transition-colors duration-75 ${
                                  selected ? 'ring-2 ring-blue-500 border-black' : 'border-neutral-600'
                                }`
                              : `rounded-full transition-transform ${
                                  selected ? 'scale-110' : 'border-zinc-500'
                                }`
                          }`}
                          style={{
                            backgroundColor: hex,
                            ...(!isBespoke && selected
                              ? {
                                  borderColor: 'var(--accent-hex, #FFFFFF)',
                                  boxShadow: '0 0 0 2px var(--accent-hex, #FFFFFF)',
                                }
                              : {}),
                          }}
                          aria-label={`Matte accent ${hex}`}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      }
      footerContent={
        <>
          <span className="text-zinc-300 font-semibold uppercase">{activeThemeSummary}</span>
          <span>Saved locally &amp; exported in backups</span>
        </>
      }
    />
  );
};
