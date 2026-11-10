import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SessionRecord, ParachuteMetrics, ZeroProfile } from '../types';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges, type BadgeTierColor } from '../utils/achievements';
import { AchievementBadgePill, ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import { X, Share2, Download, Sparkles, Award } from 'lucide-react';

interface ShareStatsModalProps {
  isOpen: boolean;
  sessions: SessionRecord[];
  parachuteMetrics: ParachuteMetrics;
  currentStreak: number;
  profile?: ZeroProfile | null;
  isZeroSupporter?: boolean;
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

function dataUrlToBlob(dataUrl: string): Blob {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) {
    throw new Error('Invalid PNG data URL');
  }
  const header = dataUrl.slice(0, commaIdx);
  const mimeMatch = /^data:([^;]+);base64$/i.exec(header);
  const mimeType = mimeMatch?.[1] || 'image/png';
  const binary = atob(dataUrl.slice(commaIdx + 1));
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function formatHumanDuration(totalSeconds: number): string {
  const mins = Math.round(totalSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins > 0 ? `${hrs}h ${remMins}m` : `${hrs}h`;
}

const CANVAS_BADGE_COLORS: Record<
  BadgeTierColor,
  {
    bgStart: string;
    bgEnd: string;
    border: string;
    text: string;
    icon: string;
    glow?: string;
  }
> = {
  gold: {
    bgStart: '#FDE68A',
    bgEnd: '#D97706',
    border: '#FEF3C7',
    text: '#000000',
    icon: '#000000',
    glow: 'rgba(251, 191, 36, 0.5)',
  },
  emerald: {
    bgStart: 'rgba(16, 185, 129, 0.22)',
    bgEnd: 'rgba(6, 78, 59, 0.45)',
    border: '#34D399',
    text: '#6EE7B7',
    icon: '#34D399',
  },
  cyan: {
    bgStart: 'rgba(6, 182, 212, 0.22)',
    bgEnd: 'rgba(22, 78, 99, 0.45)',
    border: '#22D3EE',
    text: '#67E8F9',
    icon: '#22D3EE',
  },
  indigo: {
    bgStart: 'rgba(99, 102, 241, 0.24)',
    bgEnd: 'rgba(49, 46, 129, 0.48)',
    border: '#818CF8',
    text: '#C7D2FE',
    icon: '#818CF8',
  },
  amber: {
    bgStart: 'rgba(245, 158, 11, 0.22)',
    bgEnd: 'rgba(120, 53, 15, 0.45)',
    border: '#FBBF24',
    text: '#FDE68A',
    icon: '#FBBF24',
  },
  rose: {
    bgStart: 'rgba(244, 63, 94, 0.22)',
    bgEnd: 'rgba(136, 19, 55, 0.45)',
    border: '#FB7185',
    text: '#FECDD3',
    icon: '#FB7185',
  },
  platinum: {
    bgStart: '#FFFFFF',
    bgEnd: '#D4D4D8',
    border: '#FFFFFF',
    text: '#000000',
    icon: '#000000',
  },
};

function drawRoundedRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawVectorStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const px = cx + Math.cos(angle) * r;
    const py = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export const ShareStatsModal: React.FC<ShareStatsModalProps> = ({
  isOpen,
  sessions,
  parachuteMetrics,
  currentStreak,
  profile,
  isZeroSupporter = false,
  onClose,
}) => {
  const [period, setPeriod] = useState<FlexPeriod>('today');
  const [cardDataUrl, setCardDataUrl] = useState<string>('');
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const badgeSummary = useMemo(
    () =>
      evaluateBadges({
        sessions,
        totalReclaimedHours: parachuteMetrics.totalReclaimedHours,
        isZeroSupporter,
      }),
    [sessions, parachuteMetrics.totalReclaimedHours, isZeroSupporter]
  );

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
    ctx.font = '900 40px monospace';
    ctx.fillText('ZERO // FOCUS RECEIPT', 96, 132);

    // Top-right Golden ZERO-SUPPORTER Crest
    if (badgeSummary.isZeroSupporter) {
      ctx.font = '900 19px monospace';
      const label = 'ZERO-SUPPORTER';
      const textWidth = ctx.measureText(label).width;
      const pillW = Math.round(textWidth + 62);
      const pillH = 48;
      const pillX = W - 96 - pillW;
      const pillY = 92;

      ctx.save();
      ctx.shadowColor = 'rgba(251, 191, 36, 0.55)';
      ctx.shadowBlur = 16;
      const goldGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
      goldGrad.addColorStop(0, '#FDE68A');
      goldGrad.addColorStop(0.5, '#FBBF24');
      goldGrad.addColorStop(1, '#D97706');
      ctx.fillStyle = goldGrad;
      drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 24);
      ctx.fill();
      ctx.restore();

      ctx.strokeStyle = '#FEF3C7';
      ctx.lineWidth = 2;
      drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, 24);
      ctx.stroke();

      drawVectorStar(ctx, pillX + 26, pillY + pillH / 2, 10, 4.5, '#000000');
      ctx.fillStyle = '#000000';
      ctx.font = '900 19px monospace';
      ctx.fillText(label, pillX + 44, pillY + 31);
    }

    const dateLabel = new Date()
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .toUpperCase();
    const rankTitle = getZeroRankFromHours(parachuteMetrics.totalReclaimedHours).title.toUpperCase();
    const headerSub = profile
      ? `${profile.handle.toUpperCase()}  •  ${rankTitle}  •  ${dateLabel}`
      : `${rankTitle}  •  ${dateLabel}`;
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '600 22px monospace';
    ctx.fillText(headerSub, 96, 178, W - 192);

    // Period Badge
    const badgeLabel = PERIOD_LABELS[period].title;
    ctx.fillStyle = '#F59E0B';
    drawRoundedRectPath(ctx, 96, 220, 276, 52, 10);
    ctx.fill();
    ctx.fillStyle = '#000000';
    ctx.font = '900 25px monospace';
    ctx.fillText(badgeLabel, 120, 255);

    // Giant Hero Metric (auto-scaled so long 1Y / All-Time totals fit cleanly)
    const timeText = periodStats.formattedTime;
    const heroFontPx = timeText.length >= 8 ? 112 : timeText.length >= 6 ? 136 : 162;
    ctx.fillStyle = '#FFFFFF';
    ctx.font = `900 ${heroFontPx}px monospace`;
    ctx.fillText(timeText, 96, 442, W - 192);

    ctx.fillStyle = '#D4D4D8';
    ctx.font = '700 32px monospace';
    ctx.fillText('DISTRACTION-FREE & PHONE-OFF', 96, 504);

    // Divider
    ctx.strokeStyle = '#3F3F46';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(96, 548);
    ctx.lineTo(W - 96, 548);
    ctx.stroke();

    // 4-Cell Stats Receipt Box
    const drawStat = (label: string, value: string, x: number, y: number, accent = '#FFFFFF') => {
      ctx.fillStyle = '#111113';
      drawRoundedRectPath(ctx, x, y, 420, 156, 14);
      ctx.fill();
      ctx.strokeStyle = '#27272A';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#A1A1AA';
      ctx.font = '600 21px monospace';
      ctx.fillText(label, x + 28, y + 46);

      ctx.fillStyle = accent;
      ctx.font = '900 50px monospace';
      ctx.fillText(value, x + 28, y + 116, 364);
    };

    drawStat('COMPLETED BLOCKS', `${periodStats.completedCount}`, 96, 578);
    drawStat('DAILY STREAK', `${currentStreak} DAYS`, 564, 578, '#F59E0B');
    drawStat('COMPLETION RATE', `${periodStats.completionRate}%`, 96, 754, '#34D399');
    drawStat('TOP FOCUS TAG', periodStats.topTag.slice(0, 11), 564, 754);

    // Badges & Achievements Showcase Box
    const badgeBoxX = 96;
    const badgeBoxY = 932;
    const badgeBoxW = W - 192;
    const badgeBoxH = 204;

    ctx.fillStyle = '#0D0D10';
    drawRoundedRectPath(ctx, badgeBoxX, badgeBoxY, badgeBoxW, badgeBoxH, 16);
    ctx.fill();
    ctx.strokeStyle = badgeSummary.isZeroSupporter ? 'rgba(251, 191, 36, 0.45)' : '#27272A';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#A1A1AA';
    ctx.font = '700 20px monospace';
    ctx.fillText(
      `BADGES & ACHIEVEMENTS (${badgeSummary.unlockedBadges.length}/${badgeSummary.badges.length})`,
      badgeBoxX + 26,
      badgeBoxY + 40
    );

    if (badgeSummary.unlockedBadges.length === 0) {
      ctx.fillStyle = '#D4D4D8';
      ctx.font = '700 22px monospace';
      ctx.fillText('NEXT UNLOCK: COMPLETE 1H LOCK -> GETTING STARTED', badgeBoxX + 26, badgeBoxY + 104, badgeBoxW - 52);
      ctx.fillStyle = '#FBBF24';
      ctx.font = '600 19px monospace';
      ctx.fillText('SUPPORTER CREST: MIN RS.50 1ST TIP -> ZERO-SUPPORTER', badgeBoxX + 26, badgeBoxY + 148, badgeBoxW - 52);
    } else {
      let curX = badgeBoxX + 26;
      let curY = badgeBoxY + 62;
      const maxX = badgeBoxX + badgeBoxW - 26;
      const pillH = 44;
      const gapX = 12;
      const gapY = 12;

      for (const badge of badgeSummary.unlockedBadges) {
        ctx.font = '900 18px monospace';
        const pillW = Math.min(maxX - (badgeBoxX + 26), Math.round(ctx.measureText(badge.title).width + 52));
        if (curX + pillW > maxX) {
          curX = badgeBoxX + 26;
          curY += pillH + gapY;
        }
        if (curY + pillH > badgeBoxY + badgeBoxH - 12) break;

        const theme = CANVAS_BADGE_COLORS[badge.tierColor];
        ctx.save();
        if (theme.glow) {
          ctx.shadowColor = theme.glow;
          ctx.shadowBlur = 12;
        }
        const grad = ctx.createLinearGradient(curX, curY, curX + pillW, curY + pillH);
        grad.addColorStop(0, theme.bgStart);
        grad.addColorStop(1, theme.bgEnd);
        ctx.fillStyle = grad;
        drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = theme.border;
        ctx.lineWidth = 2;
        drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
        ctx.stroke();

        drawVectorStar(ctx, curX + 22, curY + pillH / 2, 8.5, 4, theme.icon);
        ctx.fillStyle = theme.text;
        ctx.font = '900 18px monospace';
        ctx.fillText(badge.title, curX + 38, curY + 28, pillW - 48);

        curX += pillW + gapX;
      }
    }

    // Footer Manifesto & Escape Tickets Badge
    ctx.fillStyle = '#18181B';
    drawRoundedRectPath(ctx, 96, 1156, W - 192, 104, 14);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '700 25px monospace';
    ctx.fillText(`ESCAPE TICKETS: ${parachuteMetrics.currentBalance}  |  FOSS • ZERO PAYWALLS`, 124, 1202);
    ctx.fillStyle = '#A1A1AA';
    ctx.font = '500 21px monospace';
    const mottoText = profile?.motto
      ? `"${profile.motto}"`
      : '"The obstacle is the way. Stay phone-free."';
    ctx.fillText(mottoText, 124, 1238, W - 248);

    setCardDataUrl(canvas.toDataURL('image/png'));
  }, [
    isOpen,
    period,
    periodStats,
    currentStreak,
    parachuteMetrics.currentBalance,
    parachuteMetrics.totalReclaimedHours,
    profile,
    badgeSummary,
  ]);

  if (!isOpen) return null;

  const badgeCaptionSuffix =
    badgeSummary.unlockedBadges.length > 0
      ? ` Badges: ${badgeSummary.unlockedBadges.map((b) => b.title).join(', ')}.`
      : '';
  const caption = `I stayed distraction-free for ${periodStats.formattedTime} (${PERIOD_LABELS[period].title}) using Zero-Distractions (${currentStreak}d streak, ${periodStats.completedCount} completed locks).${badgeCaptionSuffix}`;

  const handleNativeOrWebShare = async () => {
    if (!cardDataUrl) return;
    const fileName = `zero-flex-${period}-${new Date().toISOString().split('T')[0]}.png`;

    if (window.ZeroNative) {
      window.ZeroNative.shareImageBase64(cardDataUrl, fileName, caption);
      return;
    }

    try {
      const blob = dataUrlToBlob(cardDataUrl);
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: 'Zero-Distractions Focus Receipt',
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
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <ObsidianCard
        ambientGlow
        className="w-full max-w-md max-h-full font-mono"
        headerClassName="p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
        footerClassName="p-4 flex gap-2"
        headerContent={
          <>
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
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                aria-label="Close"
              >
                <X size={16} />
              </button>
            </div>

            {/* Period Picker */}
            <div className="grid grid-cols-5 gap-1 p-1 bg-black/80 border border-white/10 rounded-2xl text-[10px]">
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

            {/* Live Badges Shown on Flex Card */}
            <div className="p-3 rounded-2xl bg-black/80 border border-white/10 space-y-1.5">
              <div className="flex items-center justify-between text-[10px] text-zinc-400">
                <span className="flex items-center gap-1 font-bold uppercase tracking-wider text-zinc-300">
                  <Award size={11} className="text-amber-400" />
                  <span>Badges On Card</span>
                </span>
                <span>
                  {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length} Earned
                </span>
              </div>
              {badgeSummary.unlockedBadges.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {badgeSummary.unlockedBadges.map((b) =>
                    b.id === 'zero_supporter' ? (
                      <ZeroSupporterGoldenBadge key={b.id} compact />
                    ) : (
                      <AchievementBadgePill key={b.id} badge={b} />
                    )
                  )}
                </div>
              ) : (
                <div className="text-[10px] text-zinc-400">
                  Complete a 1h lock for <span className="text-zinc-200 font-bold">GETTING STARTED</span>{' '}
                  or make your 1st min ₹50 tip for the Golden{' '}
                  <span className="text-amber-300 font-bold">ZERO-SUPPORTER</span> badge.
                </div>
              )}
            </div>

            {/* Offscreen hi-res canvas + Preview Image */}
            <canvas ref={canvasRef} className="hidden" />
            {cardDataUrl && (
              <div className="rounded-2xl overflow-hidden border border-white/15 bg-black">
                <img
                  src={cardDataUrl}
                  alt="Zero-Distractions Focus Receipt Preview"
                  className="w-full h-auto block"
                />
              </div>
            )}
          </>
        }
        footerContent={
          <>
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
              className="px-4 py-3 rounded-2xl bg-zinc-900 hover:bg-zinc-800 border border-white/15 text-white text-xs font-bold flex items-center justify-center"
              title="Save PNG"
            >
              <Download size={15} />
            </button>
          </>
        }
      />
    </div>
  );
};
