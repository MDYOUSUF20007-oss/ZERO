import React from 'react';
import {
  useInterfaceStyle,
  type MinimalistBorderWidth,
  type MinimalistTypography,
  type MinimalistTelemetryDensity,
} from '../../context/InterfaceStyleContext';
import { haptics } from '../../utils/haptics';
import { Zap, Shield, Type, Sliders, Moon, Check, RotateCcw } from 'lucide-react';

export const MinimalistStudio: React.FC = () => {
  const {
    minimalistBorderWidth,
    setMinimalistBorderWidth,
    minimalistTypography,
    setMinimalistTypography,
    minimalistTelemetryDensity,
    setMinimalistTelemetryDensity,
  } = useInterfaceStyle();

  const borderWidths: { id: MinimalistBorderWidth; label: string; desc: string }[] = [
    { id: 'hairline', label: '0.5px Hairline', desc: 'Ultra-thin subtle stroke' },
    { id: '1px', label: '1.0px Precision', desc: 'Standard industrial baseline' },
    { id: 'heavy', label: '1.5px Structural', desc: 'High-contrast boundary stroke' },
  ];

  const typographyStyles: { id: MinimalistTypography; label: string; desc: string; sample: string }[] = [
    { id: 'sans', label: 'Sans Precision', desc: 'System UI sans-serif', sample: '0123 Aa' },
    { id: 'mono', label: 'Terminal Mono', desc: 'Tabular monospace', sample: '0123 []' },
    { id: 'technical', label: 'Technical Grotesk', desc: 'Condensed tracking sans', sample: '0123 // ' },
  ];

  const densityOptions: { id: MinimalistTelemetryDensity; label: string; desc: string }[] = [
    { id: 'compact', label: 'Ultra-Compact', desc: 'Minimal margin, maximum telemetry' },
    { id: 'standard', label: 'Standard', desc: 'Balanced industrial spacing' },
    { id: 'dense', label: 'Dense Matrix', desc: 'High-density information layout' },
  ];

  const handleResetMinimalist = () => {
    haptics.tick(700);
    setMinimalistBorderWidth('1px');
    setMinimalistTypography('sans');
    setMinimalistTelemetryDensity('standard');
  };

  return (
    <div className="space-y-4 pt-1">
      {/* Studio Header & Reset Action */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Zap size={13} className="text-blue-400" />
            <span>Bespoke Minimalist Studio</span>
          </h3>
          <p className="text-[11px] text-neutral-400 mt-0.5">
            Mechanical hardware controls, 1px structural borders &amp; pure pitch-black
          </p>
        </div>
        <button
          type="button"
          onClick={handleResetMinimalist}
          className="px-2.5 py-1 text-[11px] text-neutral-300 hover:text-white flex items-center gap-1.5 rounded-sm bg-neutral-900 border border-neutral-700 transition-colors"
          title="Reset Minimalist Controls to Default"
        >
          <RotateCcw size={11} strokeWidth={1.75} />
          <span>Reset</span>
        </button>
      </div>

      {/* Control 1: 1px Structural Border Weight Toggles */}
      <div className="p-3.5 rounded-md bg-black border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Shield size={12} className="text-blue-400" />
            <span>Structural Border Weight</span>
          </span>
          <span className="text-blue-400 font-mono text-[10px]">
            {minimalistBorderWidth === 'hairline' ? '0.5px' : minimalistBorderWidth === 'heavy' ? '1.5px' : '1.0px'}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {borderWidths.map((bw) => {
            const isSelected = minimalistBorderWidth === bw.id;
            return (
              <button
                key={bw.id}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setMinimalistBorderWidth(bw.id);
                }}
                className={`p-2.5 rounded-sm border text-left transition-colors duration-75 ${
                  isSelected
                    ? 'border-blue-500 bg-neutral-950 text-white'
                    : 'border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold leading-tight">{bw.label}</span>
                  {isSelected && <Check size={12} className="text-blue-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{bw.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 2: Typography Style Switches */}
      <div className="p-3.5 rounded-md bg-black border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Type size={12} className="text-blue-400" />
            <span>Typography Architecture</span>
          </span>
          <span className="text-blue-400 font-mono text-[10px] uppercase">
            {minimalistTypography}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {typographyStyles.map((typo) => {
            const isSelected = minimalistTypography === typo.id;
            return (
              <button
                key={typo.id}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setMinimalistTypography(typo.id);
                }}
                className={`p-2.5 rounded-sm border text-left transition-colors duration-75 ${
                  isSelected
                    ? 'border-blue-500 bg-neutral-950 text-white'
                    : 'border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold leading-tight">{typo.label}</span>
                  {isSelected && <Check size={12} className="text-blue-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{typo.desc}</div>
                <div className="mt-1 text-[11px] font-mono text-zinc-300">{typo.sample}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Control 3: Telemetry Density Settings */}
      <div className="p-3.5 rounded-md bg-black border border-neutral-800 space-y-2">
        <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Sliders size={12} className="text-blue-400" />
            <span>Telemetry Density Settings</span>
          </span>
          <span className="text-blue-400 font-mono text-[10px] uppercase">
            {minimalistTelemetryDensity}
          </span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          {densityOptions.map((item) => {
            const isSelected = minimalistTelemetryDensity === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  haptics.tick(740);
                  setMinimalistTelemetryDensity(item.id);
                }}
                className={`p-2.5 rounded-sm border text-left transition-colors duration-75 ${
                  isSelected
                    ? 'border-blue-500 bg-neutral-950 text-white'
                    : 'border-neutral-800 bg-black text-neutral-400 hover:border-neutral-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold leading-tight">{item.label}</span>
                  {isSelected && <Check size={12} className="text-blue-400 shrink-0" />}
                </div>
                <div className="text-[10px] text-neutral-400 mt-0.5 truncate">{item.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* OLED Zero-Watt Verification & Action Pills Preview */}
      <div className="p-3.5 rounded-md bg-black border border-neutral-800 space-y-2.5">
        <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-wider text-neutral-400">
          <span className="flex items-center gap-1.5">
            <Moon size={11} className="text-blue-400" />
            <span>Zero-Watt OLED Guarantee</span>
          </span>
          <span className="text-emerald-400 font-mono text-[9px]">0% Pixel Bleed</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-sm bg-blue-600 border border-blue-500 text-white text-xs font-semibold"
          >
            Mechanical Active Pill
          </button>
          <button
            type="button"
            className="px-3.5 py-1.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-400 text-xs"
          >
            Mechanical Inactive
          </button>
        </div>
      </div>
    </div>
  );
};

export default MinimalistStudio;
