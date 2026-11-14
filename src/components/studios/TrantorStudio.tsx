import React, { useState } from 'react';
import {
  Wallet,
  Check,
  Shield,
  ArrowUpRight,
  Clock,
  Flame,
  Ticket,
} from 'lucide-react';
import { useInterfaceStyle } from '../../context/InterfaceStyleContext';
import type { TrantorSurface } from '../../types';
import { haptics } from '../../utils/haptics';

const TRANTOR_ACCENTS = [
  { hex: '#A3E4D7', name: 'Sage Mint', desc: 'Trantor flagship signature' },
  { hex: '#6EE7B7', name: 'Emerald Mint', desc: 'Vibrant capital green' },
  { hex: '#5EEAD4', name: 'Frost Teal', desc: 'Crisp cold cyan' },
  { hex: '#93C5FD', name: 'Glacier Blue', desc: 'Nordic fintech tint' },
  { hex: '#FDE047', name: 'Cyber Citron', desc: 'High-contrast beacon' },
];

const TRANTOR_SURFACES: { id: TrantorSurface; label: string; bgHex: string; desc: string }[] = [
  { id: 'matte', label: 'Deep Matte', bgHex: '#07080A', desc: '#121418 matte surfaces on #07080A' },
  { id: 'pitch-black', label: 'Pure OLED', bgHex: '#000000', desc: 'Absolute pitch-black zero-watt pixels' },
  { id: 'graphite', label: 'Graphite Noir', bgHex: '#0B0D11', desc: 'Subtle slate alloy texture' },
];

export const TrantorStudio: React.FC = () => {
  const {
    trantorSurface,
    setTrantorSurface,
    trantorAccent,
    setTrantorAccent,
  } = useInterfaceStyle();

  const [activeFilter, setActiveFilter] = useState<'today' | '7d' | '30d' | 'all'>('7d');
  const [selectedDuration, setSelectedDuration] = useState<number>(25);

  return (
    <div className="space-y-6">
      {/* Studio Header Card */}
      <div className="p-5 rounded-3xl bg-[#121418] border border-white/[0.06] relative overflow-hidden">
        <div
          className="absolute -top-12 -right-12 w-48 h-48 rounded-full blur-3xl pointer-events-none opacity-20"
          style={{ background: trantorAccent }}
        />
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl bg-[#07080A] border border-white/[0.08] flex items-center justify-center shadow-sm"
              style={{ borderColor: `${trantorAccent}40` }}
            >
              <Wallet className="w-5 h-5" style={{ color: trantorAccent }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-[#F3F4F6] tracking-tight">Trantor Sage-Obsidian</h3>
                <span
                  className="text-[9px] px-2 py-0.5 rounded-full font-mono uppercase font-bold border"
                  style={{
                    backgroundColor: `${trantorAccent}18`,
                    color: trantorAccent,
                    borderColor: `${trantorAccent}30`,
                  }}
                >
                  Fintech Engine
                </span>
              </div>
              <p className="text-xs text-[#9CA3AF]">
                High-end dark mobile wallet aesthetic with flat layered depth
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-[#07080A] border border-white/[0.06] px-3 py-1 rounded-full text-xs font-mono text-[#F3F4F6]">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: trantorAccent }} />
              <span className="font-semibold tracking-tight">Wallet Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Surface Canvas Picker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Surface Card Architecture</span>
          <span className="text-zinc-500 font-mono text-[10px]">#121418 Deep Matte</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          {TRANTOR_SURFACES.map((surf) => {
            const isSelected = trantorSurface === surf.id;
            return (
              <button
                key={surf.id}
                type="button"
                onClick={() => {
                  haptics.tick(750);
                  setTrantorSurface(surf.id);
                }}
                className={`p-3 text-left rounded-2xl border transition-all flex flex-col gap-1 ${
                  isSelected
                    ? 'bg-[#1A1D24] shadow-sm'
                    : 'bg-[#121418] hover:bg-[#1A1D24]/60'
                }`}
                style={{
                  borderColor: isSelected ? trantorAccent : 'rgba(255, 255, 255, 0.06)',
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full border border-white/20"
                      style={{ backgroundColor: surf.bgHex }}
                    />
                    <span className="text-xs font-bold text-white tracking-tight">{surf.label}</span>
                  </div>
                  {isSelected && <Check size={13} style={{ color: trantorAccent }} />}
                </div>
                <span className="text-[10px] text-[#9CA3AF] leading-tight">{surf.desc}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sage Mint Accent Tint Options */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Accent Sage Palettes</span>
          <span className="text-zinc-500 font-mono text-[10px]">High-Contrast Inversions</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {TRANTOR_ACCENTS.map((item) => {
            const isSelected = trantorAccent.toLowerCase() === item.hex.toLowerCase();
            return (
              <button
                key={item.hex}
                type="button"
                onClick={() => {
                  haptics.tick(750);
                  setTrantorAccent(item.hex);
                }}
                className={`p-2.5 rounded-2xl border text-left transition-all flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-[#1A1D24] border-white/30 shadow-md'
                    : 'bg-[#121418] border-white/[0.06] hover:border-white/20'
                }`}
                style={{
                  borderColor: isSelected ? item.hex : undefined,
                }}
              >
                <div className="flex items-center justify-between">
                  <span
                    className="w-4 h-4 rounded-full shadow-inner border border-black/30"
                    style={{ backgroundColor: item.hex }}
                  />
                  {isSelected && <Check size={12} style={{ color: item.hex }} />}
                </div>
                <div className="text-[11px] font-semibold text-[#F3F4F6] leading-tight truncate tracking-tight">
                  {item.name}
                </div>
                <div className="text-[9px] text-[#9CA3AF] font-mono">{item.hex}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Component & Layout Showcase: Flat Layered Depth & Pills */}
      <div className="space-y-3 pt-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-white">Live Fintech UI Preview</span>
            <span className="text-[10px] font-mono text-[#9CA3AF]">Zero-Shadow Architecture</span>
          </div>
          <span className="text-[10px] text-zinc-500 font-mono">Trantor v1.0</span>
        </div>

        {/* Trantor Wallet Container */}
        <div
          className="rounded-3xl p-5 border space-y-5 transition-colors"
          style={{
            backgroundColor: trantorSurface === 'pitch-black' ? '#000000' : trantorSurface === 'graphite' ? '#0B0D11' : '#07080A',
            borderColor: 'rgba(255, 255, 255, 0.06)',
          }}
        >
          {/* Action Filter Pills (Full rounded-full pill shapes, active solid Sage with dark text) */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="text-xs font-semibold text-[#9CA3AF]">Metrics Interval:</span>
            <div className="flex items-center gap-1.5 bg-[#121418] p-1 rounded-full border border-white/[0.06]">
              {[
                { id: 'today' as const, label: 'Today' },
                { id: '7d' as const, label: '7 Days' },
                { id: '30d' as const, label: '30 Days' },
                { id: 'all' as const, label: 'All Time' },
              ].map((pill) => {
                const isActive = activeFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    type="button"
                    onClick={() => {
                      haptics.tick(750);
                      setActiveFilter(pill.id);
                    }}
                    className={`px-3 py-1 rounded-full text-xs font-semibold tracking-tight transition-all ${
                      isActive ? 'shadow-sm' : 'text-[#9CA3AF] hover:text-[#F3F4F6]'
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: trantorAccent,
                            color: '#0B0C10',
                          }
                        : undefined
                    }
                  >
                    {pill.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Metric Cards Grid (Deep Matte #121418 surfaces, 24px border radius, tight typography) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#121418] hover:bg-[#1A1D24] border border-white/[0.06] rounded-3xl p-4 transition-colors">
              <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
                <span className="text-xs font-medium">Reclaimed Focus</span>
                <Clock className="w-4 h-4" style={{ color: trantorAccent }} />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-sans tracking-tight text-[#F3F4F6]">38.5</span>
                <span className="text-xs font-semibold" style={{ color: trantorAccent }}>
                  HOURS
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-emerald-400">
                <ArrowUpRight className="w-3 h-3" />
                <span>+14.2% discipline velocity</span>
              </div>
            </div>

            <div className="bg-[#121418] hover:bg-[#1A1D24] border border-white/[0.06] rounded-3xl p-4 transition-colors">
              <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
                <span className="text-xs font-medium">Parachute Capital</span>
                <Ticket className="w-4 h-4" style={{ color: trantorAccent }} />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-sans tracking-tight text-[#F3F4F6]">3</span>
                <span className="text-xs font-semibold text-[#9CA3AF]">TICKETS</span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-[#9CA3AF]">
                <span>Backed by 105h integrity vault</span>
              </div>
            </div>

            <div className="bg-[#121418] hover:bg-[#1A1D24] border border-white/[0.06] rounded-3xl p-4 transition-colors">
              <div className="flex items-center justify-between text-[#9CA3AF] mb-2">
                <span className="text-xs font-medium">Active Streak</span>
                <Flame className="w-4 h-4" style={{ color: trantorAccent }} />
              </div>
              <div className="flex items-baseline space-x-1.5">
                <span className="text-2xl font-bold font-sans tracking-tight text-[#F3F4F6]">14</span>
                <span className="text-xs font-semibold" style={{ color: trantorAccent }}>
                  DAYS
                </span>
              </div>
              <div className="flex items-center gap-1 mt-2 text-[10px] font-mono text-emerald-400">
                <span>Zero interruptions recorded</span>
              </div>
            </div>
          </div>

          {/* Interactive Session Ignition Pill Row */}
          <div className="bg-[#121418] border border-white/[0.06] rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-mono tracking-widest text-[#9CA3AF]">
                  Focus Session Allocation
                </span>
                <h4 className="text-sm font-bold text-[#F3F4F6] tracking-tight">Trantor Lock Duration</h4>
              </div>
              <div className="text-right">
                <span className="text-xl font-bold font-sans tracking-tight text-[#F3F4F6]">
                  {selectedDuration}m
                </span>
                <span className="block text-[10px] text-[#9CA3AF] font-mono">Pre-allocated</span>
              </div>
            </div>

            {/* Quick Picker Pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {[15, 25, 45, 60, 90, 120].map((dur) => {
                const isCur = selectedDuration === dur;
                return (
                  <button
                    key={dur}
                    type="button"
                    onClick={() => {
                      haptics.tick(750);
                      setSelectedDuration(dur);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold font-mono tracking-tight transition-all border ${
                      isCur
                        ? 'border-transparent shadow-sm'
                        : 'bg-[#1A1D24] text-[#9CA3AF] border-white/[0.06] hover:text-[#F3F4F6]'
                    }`}
                    style={
                      isCur
                        ? {
                            backgroundColor: trantorAccent,
                            color: '#0B0C10',
                          }
                        : undefined
                    }
                  >
                    {dur}m
                  </button>
                );
              })}
            </div>

            {/* Engage Button */}
            <button
              type="button"
              onClick={() => {
                haptics.tick(750);
              }}
              className="w-full py-3.5 rounded-full text-xs font-bold tracking-tight transition-all flex items-center justify-center space-x-2"
              style={{
                backgroundColor: trantorAccent,
                color: '#0B0C10',
              }}
            >
              <Shield className="w-4 h-4" />
              <span>Engage Trantor Sage Shield ({selectedDuration}m)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
