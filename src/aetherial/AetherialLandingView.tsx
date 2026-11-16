import React, { useState, useMemo } from 'react';
import type { OccasionBag, ZeroProfile, SessionRecord } from '../types';
import { resolveAppBrandVisual } from '../utils/appBrandColors';
import { voidAudio } from '../utils/voidAudio';
import { haptics } from '../utils/haptics';
import {
  Headphones,
  Lock,
  Pause,
  Play,
  Phone,
  Ticket,
  ChevronRight,
} from 'lucide-react';

interface AetherialLandingViewProps {
  onIgnite: (durationSeconds: number, tag: string) => boolean;
  activeBag: OccasionBag;
  profile?: ZeroProfile | null;
  customHashtags?: string[];
  sessions?: SessionRecord[];
  onOpenBagDrawer?: () => void;
  onOpenProfileModal?: () => void;
  onOpenThemes?: () => void;
}

export const AetherialLandingView: React.FC<AetherialLandingViewProps> = ({
  onIgnite,
  activeBag,
  customHashtags = [],
  onOpenBagDrawer,
}) => {
  const [selectedMinutes, setSelectedMinutes] = useState<number>(50);
  const [activeTag, setActiveTag] = useState<string>('#ORGANIC CHEMISTRY');
  const [tagSubtext, setTagSubtext] = useState<string>('Final Exam Prep');
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);

  const visibleApps = useMemo(() => {
    return (activeBag?.apps || []).slice(0, 3);
  }, [activeBag]);

  const handleToggleAudio = () => {
    haptics.tick(700);
    if (isPlayingAudio) {
      voidAudio.stop();
      setIsPlayingAudio(false);
    } else {
      voidAudio.play('gamma40');
      setIsPlayingAudio(true);
    }
  };

  const handleStartFocus = () => {
    haptics.lockEngaged();
    onIgnite(selectedMinutes * 60, activeTag.replace(/^#+/, ''));
  };

  const targetTimeStr = useMemo(() => {
    const end = new Date(Date.now() + selectedMinutes * 60 * 1000);
    const rawH = end.getHours();
    const suf = rawH >= 12 ? 'PM' : 'AM';
    const h12 = rawH % 12 === 0 ? 12 : rawH % 12;
    const m = end.getMinutes().toString().padStart(2, '0');
    return `${h12}:${m} ${suf}`;
  }, [selectedMinutes]);

  const presetDurations = [25, 50, 90];

  return (
    <div className="flex-1 flex flex-col relative w-full px-4 sm:px-6 pt-4 pb-28 select-none font-sans text-[#e2e1ed]">
      {/* Subtle Dynamic Ambient Field Glow */}
      <div className="relative flex flex-col items-center w-full">
        <div className="absolute -top-10 w-72 h-72 bg-[#38bdf8]/15 rounded-full blur-[100px] pointer-events-none -z-10 animate-pulse" />

        {/* Current Mission Tag Pill */}
        <button
          type="button"
          onClick={() => {
            haptics.tick(600);
            const pool = [
              { tag: '#STUDY', sub: 'Deep Comprehension' },
              { tag: '#DEEP WORK', sub: 'High-Impact Focus' },
              { tag: '#EXAM PREP', sub: 'Active Recall' },
              { tag: '#READING', sub: 'Mindful Intake' },
              ...(customHashtags.map((t) => ({ tag: `#${t.toUpperCase()}`, sub: 'Custom Priority' }))),
            ];
            const nextIdx = (pool.findIndex((p) => p.tag === activeTag) + 1) % pool.length;
            setActiveTag(pool[nextIdx].tag);
            setTagSubtext(pool[nextIdx].sub);
          }}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#282a32]/60 hover:bg-[#282a32] backdrop-blur-xl border border-white/5 shadow-sm cursor-pointer transition-colors"
        >
          <span className="w-2 h-2 rounded-full bg-[#38bdf8] shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
          <span className="text-[11px] font-semibold text-[#e2e1ed] tracking-wider uppercase">
            {activeTag}
          </span>
          <span className="text-[#3e484f] text-[11px]">·</span>
          <span className="text-[11px] text-[#c4e7ff] truncate max-w-[140px] font-medium">
            {tagSubtext}
          </span>
        </button>
      </div>

      {/* Giant Focus Timer Hub */}
      <div className="relative flex flex-col items-center justify-center py-4">
        <div className="relative w-[280px] h-[280px] flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 280 280">
            {/* Inactive Background Ring Track */}
            <circle
              className="text-[#33343d]/40"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="currentColor"
              strokeWidth="7"
            />
            {/* Active Progress Glow Track */}
            <circle
              className="opacity-25 blur-sm"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="#38bdf8"
              strokeDasharray="741.4"
              strokeDashoffset="125"
              strokeLinecap="round"
              strokeWidth="12"
            />
            {/* Active Foreground Track with Radial Gradient */}
            <circle
              className="transition-all duration-1000 ease-out"
              cx="140"
              cy="140"
              fill="transparent"
              r="118"
              stroke="url(#aetherial-timer-gradient)"
              strokeDasharray="741.4"
              strokeDashoffset="125"
              strokeLinecap="round"
              strokeWidth="7"
            />
            <defs>
              <linearGradient id="aetherial-timer-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#38bdf8" />
                <stop offset="70%" stopColor="#7bd0ff" />
                <stop offset="100%" stopColor="#4edea3" />
              </linearGradient>
            </defs>
          </svg>

          {/* Central Digital Timer Display with Ambient Center Core Dot */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <div className="w-3.5 h-3.5 rounded-full bg-[#38bdf8] shadow-[0_0_16px_#38bdf8] mb-1.5 animate-ping opacity-75" />
            <div className="flex items-baseline justify-center tracking-tight text-[#e2e1ed]">
              <span className="text-5xl sm:text-6xl font-light font-sans drop-shadow-[0_0_24px_rgba(56,189,248,0.25)] tabular-nums">
                {selectedMinutes.toString().padStart(2, '0')}
              </span>
              <span className="text-5xl sm:text-6xl font-extralight text-[#38bdf8] animate-pulse px-0.5">
                :
              </span>
              <span className="text-5xl sm:text-6xl font-light font-sans drop-shadow-[0_0_24px_rgba(56,189,248,0.25)] tabular-nums">
                00
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 mt-2 rounded-full bg-[#0c0e16]/60 backdrop-blur-md border border-white/5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]" />
              <span className="text-[11px] text-[#bdc8d1] font-medium font-sans">
                Target {targetTimeStr} · {selectedMinutes}m block
              </span>
            </div>
          </div>
        </div>

        {/* Quick Duration Pills */}
        <div className="flex items-center gap-2 mt-2">
          {presetDurations.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                haptics.tick(700);
                setSelectedMinutes(d);
              }}
              className={`px-3 py-1 rounded-full text-xs font-semibold transition-all cursor-pointer ${
                selectedMinutes === d
                  ? 'bg-[#38bdf8] text-[#001e2c] shadow-[0_0_12px_rgba(56,189,248,0.4)]'
                  : 'bg-[#191b24]/80 text-[#87929a] hover:text-[#e2e1ed] border border-white/5'
              }`}
            >
              {d}m
            </button>
          ))}
        </div>
      </div>

      {/* Ambient Sound Atmosphere Card */}
      <div className="flex items-center justify-between p-3.5 mb-3 rounded-2xl bg-[#191b24]/70 backdrop-blur-xl border border-white/5 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-full bg-[#38bdf8]/15 flex items-center justify-center text-[#38bdf8] shadow-[0_0_12px_rgba(56,189,248,0.15)] shrink-0">
            <Headphones size={20} />
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-semibold text-[#e2e1ed] truncate">
                Binaural Alpha Waves
              </span>
              <span className="text-[10px] text-[#c4e7ff] bg-[#33343d] px-1.5 py-0.5 rounded-full font-mono">
                40Hz
              </span>
            </div>
            <span className="text-xs text-[#bdc8d1] truncate">Deep Cognitive Synchronization</span>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {/* Waveform Visualizer */}
          <div className="flex items-end gap-0.5 h-4 px-1">
            <span
              className={`w-1 bg-[#38bdf8] rounded-full transition-all duration-300 ${
                isPlayingAudio ? 'animate-bounce h-2' : 'h-1 opacity-30'
              }`}
              style={{ animationDelay: '0.1s' }}
            />
            <span
              className={`w-1 bg-[#4edea3] rounded-full transition-all duration-300 ${
                isPlayingAudio ? 'animate-bounce h-4' : 'h-2 opacity-30'
              }`}
              style={{ animationDelay: '0.3s' }}
            />
            <span
              className={`w-1 bg-[#38bdf8] rounded-full transition-all duration-300 ${
                isPlayingAudio ? 'animate-bounce h-3' : 'h-1.5 opacity-30'
              }`}
              style={{ animationDelay: '0.2s' }}
            />
            <span
              className={`w-1 bg-[#4edea3] rounded-full transition-all duration-300 ${
                isPlayingAudio ? 'animate-bounce h-2' : 'h-1 opacity-30'
              }`}
              style={{ animationDelay: '0.4s' }}
            />
          </div>
          <button
            type="button"
            onClick={handleToggleAudio}
            className="w-9 h-9 rounded-full bg-[#282a32] flex items-center justify-center text-[#e2e1ed] hover:text-[#38bdf8] transition-colors active:scale-95 cursor-pointer shadow-sm"
            title={isPlayingAudio ? 'Pause Sound' : 'Play Sound'}
          >
            {isPlayingAudio ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          </button>
        </div>
      </div>

      {/* Allowed Study Bag Dock */}
      <div className="flex flex-col p-4 mb-3 rounded-2xl bg-[#191b24]/70 backdrop-blur-xl border border-white/5 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#4edea3]" />
            <span className="text-sm font-semibold text-[#e2e1ed]">
              Allowed Tools · {activeBag.name}
            </span>
          </div>
          <button
            type="button"
            onClick={onOpenBagDrawer}
            className="text-[11px] px-2.5 py-0.5 rounded-full bg-[#00a572]/20 text-[#4edea3] font-semibold hover:bg-[#00a572]/30 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <span>{visibleApps.length} Apps Permitted</span>
            <ChevronRight size={12} />
          </button>
        </div>

        {/* 3 Permitted App Cards */}
        <div className="grid grid-cols-3 gap-2 pt-1">
          {visibleApps.map((app) => {
            const brand = resolveAppBrandVisual(app);
            return (
              <div
                key={app.packageName}
                className="flex flex-col items-center justify-center p-2.5 rounded-xl bg-[#1d1f28]/60 border border-white/5 text-center shadow-sm"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-1.5 shadow-sm font-bold text-sm select-none"
                  style={{
                    backgroundColor: brand.bgColor,
                    color: brand.textColor,
                    border: `1px solid ${brand.borderColor}`,
                  }}
                >
                  {brand.initial}
                </div>
                <span className="text-xs font-medium text-[#e2e1ed] truncate w-full">
                  {app.appName}
                </span>
                <span className="text-[10px] text-[#bdc8d1] scale-90">Permitted</span>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Lock size={14} className="text-[#87929a] shrink-0" />
          <p className="text-xs text-[#bdc8d1] leading-tight">
            All notifications and external apps safely shielded.
          </p>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex flex-col space-y-2 pt-1">
        <div className="flex items-center gap-2">
          {/* Main Ignite Button */}
          <button
            type="button"
            onClick={handleStartFocus}
            className="flex-1 h-13 py-3.5 px-4 rounded-full bg-[#38bdf8] text-[#001e2c] font-semibold text-base flex items-center justify-center gap-2 shadow-[0_0_24px_rgba(56,189,248,0.35)] hover:shadow-[0_0_32px_rgba(56,189,248,0.5)] active:scale-98 transition-all cursor-pointer"
          >
            <Play size={20} fill="currentColor" />
            <span>Ignite Focus ({selectedMinutes}m)</span>
          </button>

          {/* Quick Emergency Dial */}
          <button
            type="button"
            onClick={() => (window.location.href = 'tel:')}
            className="w-13 h-13 p-3.5 rounded-full bg-[#282a32] text-[#ffb4ab] hover:bg-[#33343d] active:scale-95 transition-all flex items-center justify-center shadow-sm cursor-pointer"
            title="Emergency Dialer"
          >
            <Phone size={20} />
          </button>
        </div>

        <div className="flex items-center justify-center pt-1">
          <div className="flex items-center gap-1.5 text-xs text-[#bdc8d1]">
            <Ticket size={14} className="text-[#87929a]" />
            <span>Emergency Parachute Protection Active</span>
          </div>
        </div>
      </div>
    </div>
  );
};
