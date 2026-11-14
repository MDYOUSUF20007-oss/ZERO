import React from 'react';
import { useInterfaceStyle } from '../../context/InterfaceStyleContext';
import { haptics } from '../../utils/haptics';
import { Droplet, Sparkles, Radio, Shield, Sliders } from 'lucide-react';

const FLUENT_REFRACTION_TINTS = [
  { id: 'cyan', label: 'Electric Cyan', hex: '#66E3FF', rgb: '102, 227, 255' },
  { id: 'purple', label: 'Cyber Violet', hex: '#D0BCFF', rgb: '208, 188, 255' },
  { id: 'emerald', label: 'Neon Emerald', hex: '#6DD58C', rgb: '109, 213, 140' },
  { id: 'amber', label: 'Solar Amber', hex: '#F59E0B', rgb: '245, 158, 11' },
  { id: 'rose', label: 'Rose Quartz', hex: '#FB7185', rgb: '251, 113, 133' },
  { id: 'white', label: 'Pure Crystal', hex: '#FFFFFF', rgb: '255, 255, 255' },
];

export const FluentGlassStudio: React.FC = () => {
  const {
    fluentOrbIntensity,
    setFluentOrbIntensity,
    fluentBlurStrength,
    setFluentBlurStrength,
    fluentSpecularHighlight,
    setFluentSpecularHighlight,
  } = useInterfaceStyle();

  const orbPresets = [
    { label: 'Off (0%)', value: 0 },
    { label: 'Subtle (35%)', value: 0.35 },
    { label: 'Balanced (75%)', value: 0.75 },
    { label: 'Vibrant (100%)', value: 1.0 },
  ];

  const blurPresets = [
    { label: '12px Frost', value: 12 },
    { label: '24px Acrylic', value: 24 },
    { label: '36px Deep', value: 36 },
    { label: '48px Heavy', value: 48 },
  ];

  const highlightPresets = [
    { label: 'Subtle (20%)', value: 0.2 },
    { label: 'Standard (38%)', value: 0.38 },
    { label: 'Luminous (65%)', value: 0.65 },
  ];

  const handleSelectRefractionTint = (hex: string, rgb: string) => {
    haptics.tick(780);
    const rootEl = document.documentElement;
    rootEl.style.setProperty('--accent-hex', hex);
    rootEl.style.setProperty('--accent-rgb', rgb);
    rootEl.style.setProperty('--zero-accent', hex);
    rootEl.style.setProperty('--liquid-accent-vibrant', hex);
    rootEl.style.setProperty(
      '--liquid-accent-tint',
      `color-mix(in srgb, ${hex} 28%, #ffffff)`
    );
    rootEl.style.setProperty(
      '--liquid-accent-glow',
      `color-mix(in srgb, ${hex} 50%, transparent)`
    );
    rootEl.style.setProperty(
      '--liquid-accent-soft-glow',
      `color-mix(in srgb, ${hex} 22%, transparent)`
    );
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Studio Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Droplet size={13} className="text-cyan-300" />
            <span>Fluent Glass Optic Studio</span>
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Realtime sub-surface ambient orbs, specular acrylic refraction &amp; mercury dials
          </p>
        </div>
        <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/35">
          Optic Engine
        </span>
      </div>

      {/* Optic Overview Banner */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/20 text-[11px] text-zinc-300 leading-relaxed">
        <span className="font-extrabold text-white">Native Acrylic Refraction</span> dynamically refracts the active Theme Studio accent palette across all cards, dials, and pills with 60FPS sub-surface orbs over an absolute #000000 AMOLED canvas.
      </div>

      {/* Control 1: Sub-Surface Ambient Orb Intensity */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Radio size={12} className="text-cyan-300 animate-pulse" />
            <span>Ambient Orb Intensity</span>
          </span>
          <span className="text-cyan-300 font-mono">
            {Math.round(fluentOrbIntensity * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {orbPresets.map((preset) => {
            const isSelected = Math.abs(fluentOrbIntensity - preset.value) < 0.05;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setFluentOrbIntensity(preset.value);
                }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] font-semibold transition-all ${
                  isSelected
                    ? 'liquid-pill-active border-white text-[#07040d] font-bold'
                    : 'liquid-glass border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 2: Acrylic Backdrop Blur Strength */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Sliders size={12} className="text-cyan-300" />
            <span>Acrylic Backdrop Blur Strength</span>
          </span>
          <span className="text-cyan-300 font-mono">{fluentBlurStrength}px</span>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {blurPresets.map((preset) => {
            const isSelected = fluentBlurStrength === preset.value;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setFluentBlurStrength(preset.value);
                }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] font-semibold transition-all ${
                  isSelected
                    ? 'liquid-pill-active border-white text-[#07040d] font-bold'
                    : 'liquid-glass border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 3: Specular Refraction Highlights */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-cyan-300" />
            <span>Specular Highlight Rim</span>
          </span>
          <span className="text-cyan-300 font-mono">
            {Math.round(fluentSpecularHighlight * 100)}%
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {highlightPresets.map((preset) => {
            const isSelected = Math.abs(fluentSpecularHighlight - preset.value) < 0.05;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setFluentSpecularHighlight(preset.value);
                }}
                className={`py-2 px-1 text-center rounded-xl text-[10px] font-semibold transition-all ${
                  isSelected
                    ? 'liquid-pill-active border-white text-[#07040d] font-bold'
                    : 'liquid-glass border border-white/10 text-zinc-400 hover:text-white'
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Acrylic Refraction Accent Tints */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
          Acrylic Refraction Palette
        </label>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {FLUENT_REFRACTION_TINTS.map((tint) => {
            const isSelected =
              document.documentElement.style.getPropertyValue('--accent-hex')?.toUpperCase() ===
              tint.hex.toUpperCase();
            return (
              <button
                key={tint.id}
                type="button"
                onClick={() => handleSelectRefractionTint(tint.hex, tint.rgb)}
                className={`p-2.5 rounded-xl text-center flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'liquid-pill-active shadow-lg'
                    : 'liquid-glass border border-white/10 hover:border-white/30'
                }`}
              >
                <div
                  className="w-5 h-5 rounded-full border border-white/30 shadow-sm"
                  style={{ backgroundColor: tint.hex }}
                />
                <span className="text-[9px] font-bold text-white truncate w-full">
                  {tint.label.split(' ')[0]}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Live Specular & Pill Showcase */}
      <div className="p-3.5 rounded-2xl liquid-glass border border-white/10 space-y-2">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-zinc-400">
          <span className="flex items-center gap-1">
            <Sparkles size={11} className="text-cyan-300" />
            <span>Non-Splitting High-Contrast Pills</span>
          </span>
          <span className="text-cyan-300">Dual Gradient</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button type="button" className="px-4 py-2 liquid-pill-active text-xs">
            Refractive Active Pill (#07040d)
          </button>
          <button type="button" className="px-3.5 py-1.5 liquid-pill-inactive text-xs">
            Frosted Glass Inactive (#f4f4f5)
          </button>
        </div>
      </div>
    </div>
  );
};

export default FluentGlassStudio;
