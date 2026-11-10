import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SessionRecord, ParachuteMetrics } from '../types';
import { X, Share2, Download, Sparkles } from 'lucide-react';

interface ShareStatsModalProps {
  isOpen: boolean;
  sessions: SessionRecord[];
  parachuteMetrics: ParachuteMetrics;
  currentStreak: number;
  onClose: () => void;
}

type FlexPeriod = 'today' | 'week' | 'month' | 'year' | 'all';

const PERIOD_LABELS: Record<FlexPeriod, { title: string; subtitle: string; daysBack: number | null }> = {
  today: { title: 'TODAY', subtitle: 'Last 24h Focus', daysBack: 1 },
  week: { title: 'THIS WEEK', subtitle: 'Past 7 Days', daysBack: 7 },
  month: { title: 'THIS MONTH', subtitle: 'Past 30 Days', daysBack: 30 },
  year: { title: 'LAST 1 YEAR', subtitle: 'Past 365 Days', daysBack: 365 },
  all: { title: 'ALL TIME', subtitle: 'Lifetime Reclaimed', daysBack: null },
};

function formatHumanDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

export const ShareStatsModal: React.FC<ShareStatsModalProps> = ({
  isOpen,
  sessions,
  parachuteMetrics,
  currentStreak,
  onClose,
}) => {
  const [period, setPeriod] = useState<FlexPeriod>('today');
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const periodStats = useMemo(() => {
    const now = Date.now();
    const todayStr = new Date(now).toISOString().split('T')[0];
    const daysBack = PERIOD_LABELS[period].daysBack;
    const cutoff = daysBack ? now - daysBack * 86400 * 1000 : 0;

    const matching = sessions.filter((s) => {
      if (s.status !== 'completed') return false;
      if (period === 'today') return s.dateStr === todayStr;
      if (daysBack === null) return true;
      return s.endTime >= cutoff;
    });

    const totalSeconds =
      period === 'all' && matching.length === 0
        ? Math.round(parachuteMetrics.totalReclaimedHours * 3600)
        : matching.reduce((acc, s) => acc + s.durationSeconds, 0);

    const tagCounts: Record<string, number> = {};
    matching.forEach((s) => {
      tagCounts[s.tag] = (tagCounts[s.tag] || 0) + s.durationSeconds;
    });
    const topTagEntry = Object.entries(tagCounts).sort((a, b) => b[1] - a[1])[0];

    const completedCount = matching.length;
    const totalAttemptsInPeriod = sessions.filter((s) => {
      if (period === 'today') return s.dateStr === todayStr;
      if (daysBack === null) return true;
      return s.endTime >= cutoff;
    }).length;

    const completionRate =
      totalAttemptsInPeriod > 0
        ? Math.round((completedCount / totalAttemptsInPeriod) * 100)
        : 0;

    return {
      totalSeconds,
      formattedTime: formatHumanDuration(totalSeconds),
      completedCount,
      completionRate,
      topTag: topTagEntry ? `#${topTagEntry[0]}` : '#MonkMode',
    };
  }, [sessions, period, parachuteMetrics.totalReclaimedHours]);

  // Draw crisp 1080x1350 Neo-Brutalist PNG receipt on canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const W = 1080;
    const H = 1350;
    canvas.width = W;
    canvas.height = H;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Background + Subtle Dot Matrix
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let x = 36; x < W; x += 36) {
      for (let y = 36; y < H; y += 36) {
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Outer Brutalist Frame
    ctx.strokeStyle = '#27272A';
    ctx.lineWidth = 4;
    ctx.strokeRect(48, 48, W - 96, H - 96);

    // Header Row
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 44px monospace';
    ctx.fillText('ZERO // FOCUS RECEIPT', 96, 140);

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '600 24px monospace';
    ctx.fillText(new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase(), 96, 185);

    // Period Badge
    const badgeLabel = PERIOD_LABELS[period].title;
    ctx.fillStyle = '#F59E0B';
    ctx.fillRect(96, 240, 290, 56);
    ctx.fillStyle = '#000000';
    ctx.font = '900 26px monospace';
    ctx.fillText(badgeLabel, 122, 277);

    // Giant Hero Metric (auto-scaled so long 1Y / All-Time totals fit cleanly)
    const timeText = periodStats.formattedTime;
    const heroFontPx = timeText.length >= 8 ? 114 : timeText.length >= 6 ? 138 : 168;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${heroFontPx}px monospace`;
    ctx.fillText(timeText, 96, 515);

    ctx.fillStyle = '#D4D4D8';
    ctx.font = '700 34px monospace';
    ctx.fillText('DISTRACTION-FREE & PHONE-OFF', 96, 580);

    // Divider
    ctx.strokeStyle = '#3F3F46';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, 650);
    ctx.lineTo(W - 96, 650);
    ctx.stroke();

    // 4-Cell Stats Receipt Box
    const drawStat = (label: string, value: string, x: number, y: number, accent = '#FFFFFF') => {
      ctx.fillStyle = '#111113';
      ctx.fillRect(x, y, 420, 175);
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, 420, 175);

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '600 22px monospace';
      ctx.fillText(label, x + 28, y + 52);

      ctx.fillStyle = accent;
      ctx.font = '900 54px monospace';
      ctx.fillText(value, x + 28, y + 128);
    };

    drawStat('COMPLETED BLOCKS', `${periodStats.completedCount}`, 96, 705);
    drawStat('DAILY STREAK', `${currentStreak} DAYS`, 564, 705, '#F59E0B');
    drawStat('COMPLETION RATE', `${periodStats.completionRate}%`, 96, 910, '#34D399');
    drawStat('TOP FOCUS TAG', periodStats.topTag.slice(0, 11), 564, 910);

    // Footer Manifesto & Earned Parachute Badge
    ctx.fillStyle = '#18181B';
    ctx.fillRect(96, 1135, W - 192, 115);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 26px monospace';
    ctx.fillText(`EARNED PARACHUTES: ${parachuteMetrics.currentBalance}  |  FOSS • ZERO PAYWALLS`, 128, 1190);
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '500 22px monospace';
    ctx.fillText('"The obstacle is the way. Stay phone-free."', 128, 1228);

    setCardDataUrl(canvas.toDataURL('image/png'));
  }, [isOpen, period, periodStats, currentStreak, parachuteMetrics.currentBalance]);

  if (!isOpen) return null;

  const caption = `I stayed distraction-free for ${periodStats.formattedTime} (${PERIOD_LABELS[period].title}) using Zero Digital Detox (${currentStreak}d streak, ${periodStats.completedCount} completed locks).`;

  const handleNativeOrWebShare = async () => {
    if (!cardDataUrl) return;
    const fileName = `zero-flex-${period}-${new Date().toISOString().split('T')[0]}.png`;

    if (window.ZeroNative) {
      window.ZeroNative.shareImageBase64(cardDataUrl, fileName, caption);
      return;
    }

    try {
      const res = await fetch(cardDataUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Zero Focus Receipt',
          text: caption,
          files: [file],
        });
        return;
      }
    } catch {
      // Fallback to PNG download
    }

    const a = document.createElement('a');
    a.href = cardDataUrl;
    a.download = fileName;
    a.click();
  };

  const handleDownloadPng = () => {
    if (!cardDataUrl) return;
    const fileName = `zero-flex-${period}-${new Date().toISOString().split('T')[0]}.png`;
    if (window.ZeroNative) {
      window.ZeroNative.shareImageBase64(cardDataUrl, fileName, caption);
      return;
    }
    const a = document.createElement('a');
    a.href = cardDataUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-5 shadow-2xl font-mono space-y-4 max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={18} className="text-amber-400" />
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-white">
                Flex Your Focus Card
              </h2>
              <p className="text-[11px] text-zinc-400">
                Share distraction-free time with friends
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        {/* Period Picker */}
        <div className="grid grid-cols-5 gap-1 p-1 bg-black border border-zinc-800 rounded-2xl text-[10px]">
          {(['today', 'week', 'month', 'year', 'all'] as FlexPeriod[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriod(p)}
              className={`py-2 rounded-xl font-bold transition-all ${
                period === p ? 'bg-amber-400 text-black' : 'text-zinc-400 hover:text-white'
              }`}
            >
              {p === 'today'
                ? 'Today'
                : p === 'week'
                ? 'Week'
                : p === 'month'
                ? 'Month'
                : p === 'year'
                ? '1 Year'
                : 'All'}
            </button>
          ))}
        </div>

        {/* Offscreen hi-res canvas + Preview Image */}
        <canvas ref={canvasRef} className="hidden" />
        {cardDataUrl && (
          <div className="rounded-2xl overflow-hidden border border-zinc-800 bg-black">
            <img
              src={cardDataUrl}
              alt="Zero Focus Receipt Preview"
              className="w-full h-auto block"
            />
          </div>
        )}

        {/* Share & Download Buttons */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleNativeOrWebShare}
            className="flex-1 py-3 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            <Share2 size={15} />
            <span>Share with Friends</span>
          </button>
          <button
            type="button"
            onClick={handleDownloadPng}
            className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-white text-xs font-bold flex items-center justify-center"
            title="Save PNG"
          >
            <Download size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
