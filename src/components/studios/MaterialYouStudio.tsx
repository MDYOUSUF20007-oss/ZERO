import React from 'react';
import { useInterfaceStyle, type M3Elevation } from '../../context/InterfaceStyleContext';
import { haptics } from '../../utils/haptics';
import { Sparkles, Layers, Moon } from 'lucide-react';

export const MaterialYouStudio: React.FC = () => {
  const {
    m3Palette,
    setM3Palette,
    m3Elevation,
    setM3Elevation,
    amoled,
    setAmoled,
  } = useInterfaceStyle();

  const seedOptions = [
    {
      id: 'deep-purple' as const,
      name: 'Deep Purple',
      primaryHex: '#D0BCFF',
      containerHex: '#4F378B',
      onPrimaryHex: '#381E72',
      tagline: 'Google Pixel Default',
    },
    {
      id: 'cyber-cyan' as const,
      name: 'Cyber Cyan',
      primaryHex: '#66E3FF',
      containerHex: '#004E5F',
      onPrimaryHex: '#003642',
      tagline: 'Electric High-Contrast',
    },
    {
      id: 'neon-emerald' as const,
      name: 'Neon Emerald',
      primaryHex: '#6DD58C',
      containerHex: '#005227',
      onPrimaryHex: '#003919',
      tagline: 'Organic Nature Tint',
    },
    {
      id: 'crimson-pulse' as const,
      name: 'Crimson Pulse',
      primaryHex: '#FFB2BE',
      containerHex: '#7D293A',
      onPrimaryHex: '#5F1124',
      tagline: 'Dynamic Ruby Pulse',
    },
  ];

  const elevationToggles: { id: M3Elevation; label: string; desc: string }[] = [
    { id: 'flat', label: 'Flat', desc: 'Single tonal baseline' },
    { id: 'subtle', label: 'Subtle', desc: 'Standard M3 steps' },
    { id: 'elevated', label: 'Elevated', desc: 'Pronounced contrast' },
    { id: 'high', label: 'High', desc: 'Maximum container depth' },
  ];

  return (
    <div className="space-y-4 pt-1">
      {/* Studio Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles size={13} className="text-[var(--m3-primary)]" />
            <span>Material You (M3) Studio</span>
          </h3>
          <p className="text-[11px] text-zinc-400 mt-0.5">
            Dynamic tonal seed palette, stepped container elevation &amp; true pitch black
          </p>
        </div>
        <span className="text-[9px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)]">
          M3 Spec
        </span>
      </div>

      {/* Dynamic Tonal Seed Palette Selectors */}
      <div className="space-y-2">
        <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
          Tonal Seed Palette Extraction
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {seedOptions.map((seed) => {
            const isSelected = m3Palette === seed.id;
            return (
              <button
                key={seed.id}
                type="button"
                onClick={() => {
                  haptics.tick(780);
                  setM3Palette(seed.id);
                }}
                className={`p-3 rounded-2xl border text-left flex flex-col gap-2 transition-all ${
                  isSelected
                    ? 'border-[var(--m3-primary)] bg-[var(--m3-surface-container-high)] text-white shadow-md ring-1 ring-[var(--m3-primary)]'
                    : 'border-zinc-800 bg-[var(--m3-surface-container-low)] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div
                    className="w-6 h-6 rounded-full shrink-0 flex items-center justify-center border border-white/20"
                    style={{ backgroundColor: seed.primaryHex }}
                  >
                    {isSelected && (
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: seed.containerHex }}
                      />
                    )}
                  </div>
                  <span
                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-full font-mono"
                    style={{
                      backgroundColor: isSelected ? seed.containerHex : 'transparent',
                      color: isSelected ? seed.primaryHex : '#71717A',
                    }}
                  >
                    {seed.primaryHex}
                  </span>
                </div>
                <div className="min-w-0">
                  <span className="text-xs font-semibold block truncate leading-tight text-white">
                    {seed.name}
                  </span>
                  <span className="text-[10px] text-zinc-400 block truncate mt-0.5">
                    {seed.tagline}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Surface Elevation Depth Toggles */}
      <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-zinc-800/80 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-400">
          <span className="flex items-center gap-1.5">
            <Layers size={12} className="text-[var(--m3-primary)]" />
            <span>Surface Elevation Depth</span>
          </span>
          <span className="text-[var(--m3-primary)] font-semibold lowercase">
            {m3Elevation} mode
          </span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {elevationToggles.map((item) => {
            const isCurrent = m3Elevation === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setM3Elevation(item.id);
                }}
                className={`p-2.5 rounded-xl border text-left transition-all ${
                  isCurrent
                    ? 'border-[var(--m3-primary)] bg-[var(--m3-surface-container-highest)] text-white shadow-sm ring-1 ring-[var(--m3-primary)]'
                    : 'border-zinc-800/80 bg-[var(--m3-surface-container)] text-zinc-400 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-semibold text-white leading-tight">{item.label}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5 truncate">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* True AMOLED Pitch-Black Switch */}
      <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-low)] border border-zinc-800/80 flex items-center justify-between">
        <div className="space-y-0.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
            <Moon size={13} className="text-[var(--m3-primary)]" />
            <span>True AMOLED Pitch-Black</span>
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            Overrides tonal baseline with pure #000000 for zero pixel illumination &amp; OLED energy savings
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            haptics.tick(720);
            setAmoled(!amoled);
          }}
          className={`w-12 h-6 rounded-full transition-colors relative p-0.5 shrink-0 ${
            amoled ? 'bg-[var(--m3-primary)]' : 'bg-zinc-800 border border-zinc-700'
          }`}
          aria-pressed={amoled}
          aria-label="Toggle True AMOLED Pitch-Black Mode"
        >
          <div
            className={`w-5 h-5 rounded-full transition-transform ${
              amoled ? 'translate-x-6 bg-[var(--m3-on-primary)]' : 'translate-x-0 bg-zinc-400'
            }`}
          />
        </button>
      </div>

      {/* Live M3 Surface & Pill Showcase Preview */}
      <div className="p-3.5 rounded-2xl bg-[var(--m3-surface-container-high)] border border-[var(--m3-outline-variant)] space-y-2.5">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-zinc-300">
          <span>Live M3 Tonal Surface Preview</span>
          <span className="text-[var(--m3-primary)]">Realtime Render</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-4 py-2 rounded-full bg-[var(--m3-primary)] text-[var(--m3-on-primary)] text-xs font-bold shadow-sm">
            Primary Pill Button
          </div>
          <div className="px-4 py-2 rounded-full bg-[var(--m3-primary-container)] text-[var(--m3-on-primary-container)] text-xs font-semibold">
            Tonal Container Pill
          </div>
          <div className="px-3.5 py-1.5 rounded-full bg-[var(--m3-surface-container-highest)] text-[var(--m3-on-surface)] text-xs border border-[var(--m3-outline-variant)]">
            Elevated Surface
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaterialYouStudio;
