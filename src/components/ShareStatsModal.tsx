import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { SessionRecord, ParachuteMetrics, ZeroProfile, ThemeConfig } from '../types';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { evaluateBadges } from '../utils/achievements';
import {
  computeDynamicAccentTokens,
  computeThemeRuntime,
  getRelativeLuminance,
  mixHexColors,
} from '../utils/themes';
import {
  FOCUS_RECEIPT_PERIOD_LABELS,
  FOCUS_RECEIPT_PERIOD_ORDER,
  computeReceiptPeriodStats,
  formatReceiptHandle,
  formatReceiptMotto,
  type FlexPeriod,
} from '../utils/focusReceipt';
import { AchievementBadgePill, ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { X, Share2, Download, Sparkles, Trophy } from 'lucide-react';

interface ShareStatsModalProps {
  isOpen: boolean;
  sessions: SessionRecord[];
  parachuteMetrics: ParachuteMetrics;
  currentStreak: number;
  profile?: ZeroProfile | null;
  themeConfig?: ThemeConfig;
  isZeroSupporter?: boolean;
  onClose: () => void;
}

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

const GOLD_CANVAS_BADGE = {
  bgStart: '#FDE68A',
  bgEnd: '#D97706',
  border: '#FEF3C7',
  text: '#000000',
  icon: '#000000',
  glow: 'rgba(251, 191, 36, 0.5)',
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

function resolveDarkSurfaceAccentTokens(themeConfig?: ThemeConfig): {
  hex: string;
  rgb: string;
  badgeText: string;
} {
  let rawHex = '#FFFFFF';
  if (themeConfig) {
    const runtime = computeThemeRuntime(themeConfig);
    rawHex = runtime.cssVars['--zero-accent'] || '#FFFFFF';
  } else if (typeof window !== 'undefined' && typeof document !== 'undefined') {
    const styles = window.getComputedStyle(document.documentElement);
    rawHex = styles.getPropertyValue('--accent-hex').trim() || '#FFFFFF';
  }
  const normalizedHex = rawHex.startsWith('#') ? rawHex : '#FFFFFF';
  const canvasHex =
    getRelativeLuminance(normalizedHex) < 0.28
      ? mixHexColors(normalizedHex, '#FFFFFF', 0.54)
      : normalizedHex;
  const tokens = computeDynamicAccentTokens(canvasHex);
  return {
    hex: tokens.hex,
    rgb: tokens.rgb,
    badgeText: tokens.badgeText,
  };
}

export const ShareStatsModal: React.FC<ShareStatsModalProps> = ({
  isOpen,
  sessions,
  parachuteMetrics,
  currentStreak,
  profile,
  themeConfig,
  isZeroSupporter = false,
  onClose,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass;
  const [period, setPeriod] = useState<FlexPeriod>('today');
  const [receiptExport, setReceiptExport] = useState<{ dataUrl: string; dateLabel: string }>({
    dataUrl: '',
    dateLabel: '',
  });
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

  const periodStats = useMemo(
    () => computeReceiptPeriodStats(sessions, period, parachuteMetrics.totalReclaimedHours),
    [sessions, period, parachuteMetrics.totalReclaimedHours]
  );

  const rankTitle = useMemo(
    () => getZeroRankFromHours(parachuteMetrics.totalReclaimedHours).title.toUpperCase(),
    [parachuteMetrics.totalReclaimedHours]
  );

  const formattedHandle = useMemo(() => formatReceiptHandle(profile), [profile]);
  const mottoQuoted = useMemo(() => formatReceiptMotto(profile), [profile]);

  // Draw crisp 1080x1350 Frosted Two-Tier Obsidian PNG receipt on offscreen canvas for native share/export
  const drawReceiptToCanvas = React.useCallback(
    (canvas: HTMLCanvasElement): string => {
      try {
        const W = 1080;
        const H = 1350;
        canvas.width = W;
        canvas.height = H;
        const ctx = canvas.getContext('2d');
        if (!ctx) return '';

    const currentDateLabel = new Date()
      .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      .toUpperCase();
    const {
      hex: activeAccentHex,
      rgb: activeAccentRgb,
      badgeText: activeAccentBadgeText,
    } = resolveDarkSurfaceAccentTokens(themeConfig);

    // Pitch AMOLED Canvas Background (+ Subtle Dot Matrix in Classic mode, ambient aura in Liquid Glass)
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, W, H);
    if (isFluentGlass) {
      const topOrb = ctx.createRadialGradient(180, 140, 20, 180, 140, 560);
      topOrb.addColorStop(0, 'rgba(0, 242, 254, 0.22)');
      topOrb.addColorStop(0.55, 'rgba(79, 172, 254, 0.09)');
      topOrb.addColorStop(1, 'transparent');
      ctx.fillStyle = topOrb;
      ctx.fillRect(0, 0, W, H);

      const botOrb = ctx.createRadialGradient(W - 140, H - 160, 20, W - 140, H - 160, 620);
      botOrb.addColorStop(0, 'rgba(127, 0, 255, 0.20)');
      botOrb.addColorStop(0.55, 'rgba(79, 172, 254, 0.08)');
      botOrb.addColorStop(1, 'transparent');
      ctx.fillStyle = botOrb;
      ctx.fillRect(0, 0, W, H);
    } else if (!isBespoke) {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      for (let x = 36; x < W; x += 36) {
        for (let y = 36; y < H; y += 36) {
          ctx.beginPath();
          ctx.arc(x, y, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Outer Receipt Card
    const cardX = 56;
    const cardY = 56;
    const cardW = W - 112;
    const cardH = H - 112;
    const cardR = isFluentGlass ? 32 : isBespoke ? 14 : 36;

    if (isFluentGlass) {
      ctx.save();
      ctx.shadowColor = 'rgba(0, 0, 0, 0.85)';
      ctx.shadowBlur = 44;
      const glassCardBg = ctx.createLinearGradient(cardX, cardY, cardX + cardW, cardY + cardH);
      glassCardBg.addColorStop(0, '#141926');
      glassCardBg.addColorStop(0.45, '#0B0E17');
      glassCardBg.addColorStop(1, '#080B12');
      ctx.fillStyle = glassCardBg;
      drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fill();
      ctx.restore();
    } else if (isBespoke) {
      ctx.fillStyle = '#000000';
      drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fill();
    } else {
      ctx.save();
      ctx.shadowColor = `rgba(${activeAccentRgb}, 0.24)`;
      ctx.shadowBlur = 42;
      const cardBg = ctx.createLinearGradient(0, cardY, 0, cardY + cardH);
      cardBg.addColorStop(0, 'rgba(20, 20, 24, 0.99)');
      cardBg.addColorStop(1, 'rgba(7, 7, 9, 1)');
      ctx.fillStyle = cardBg;
      drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
      ctx.fill();
      ctx.restore();
    }

    // Clip interior tiers cleanly to rounded card corners
    ctx.save();
    drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.clip();

    if (isFluentGlass) {
      const glassSheen = ctx.createRadialGradient(
        cardX + 120,
        cardY + 60,
        10,
        cardX + 120,
        cardY + 60,
        420
      );
      glassSheen.addColorStop(0, 'rgba(0, 242, 254, 0.14)');
      glassSheen.addColorStop(0.5, 'rgba(79, 172, 254, 0.05)');
      glassSheen.addColorStop(1, 'transparent');
      ctx.fillStyle = glassSheen;
      ctx.fillRect(cardX, cardY, 560, 440);
    } else if (!isBespoke) {
      const glowGrad = ctx.createRadialGradient(cardX + 90, cardY + 70, 10, cardX + 90, cardY + 70, 320);
      glowGrad.addColorStop(0, `rgba(${activeAccentRgb}, 0.16)`);
      glowGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = glowGrad;
      ctx.fillRect(cardX, cardY, 440, 400);
    }

    // Tier 1B Grid Band Backdrop
    const gridBandY = 516;
    const gridBandH = 412;
    ctx.fillStyle = isFluentGlass
      ? 'rgba(0, 0, 0, 0.32)'
      : isBespoke
      ? '#000000'
      : 'rgba(0, 0, 0, 0.44)';
    ctx.fillRect(cardX, gridBandY, cardW, gridBandH);

    // Tier 2 Footer Band
    const tier2Y = gridBandY + gridBandH; // 928
    ctx.fillStyle = isFluentGlass ? '#070A10' : isBespoke ? '#0A0A0A' : '#09090C';
    ctx.fillRect(cardX, tier2Y, cardW, cardY + cardH - tier2Y);

    ctx.restore();

    // Card Border
    ctx.strokeStyle = isFluentGlass
      ? 'rgba(255, 255, 255, 0.24)'
      : isBespoke
      ? '#262626'
      : `rgba(${activeAccentRgb}, 0.45)`;
    ctx.lineWidth = isFluentGlass ? 2 : isBespoke ? 2 : 3;
    drawRoundedRectPath(ctx, cardX, cardY, cardW, cardH, cardR);
    ctx.stroke();

    if (isFluentGlass) {
      const specGrad = ctx.createLinearGradient(cardX + 64, cardY, cardX + cardW - 64, cardY);
      specGrad.addColorStop(0, 'rgba(255,255,255,0.06)');
      specGrad.addColorStop(0.5, 'rgba(255,255,255,0.72)');
      specGrad.addColorStop(1, 'rgba(255,255,255,0.06)');
      ctx.fillStyle = specGrad;
      ctx.fillRect(cardX + 64, cardY, cardW - 128, 2);
    } else if (!isBespoke) {
      const specGrad = ctx.createLinearGradient(cardX + 64, cardY, cardX + cardW - 64, cardY);
      specGrad.addColorStop(0, 'transparent');
      specGrad.addColorStop(0.5, activeAccentHex);
      specGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = specGrad;
      ctx.fillRect(cardX + 64, cardY, cardW - 128, 3);
    }

    const canvasAccentHex = isFluentGlass ? '#4FACFE' : isBespoke ? '#3B82F6' : activeAccentHex;
    const canvasSans = '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

    // Tier 1A Header Row
    ctx.fillStyle = '#FAFAFA';
    ctx.font = isModernFont ? `700 36px ${canvasSans}` : '900 38px monospace';
    ctx.fillText('ZERO // FOCUS RECEIPT', 104, 136);

    ctx.save();
    ctx.fillStyle = canvasAccentHex;
    ctx.font = isFluentGlass ? `600 22px ${canvasSans}` : '700 22px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(currentDateLabel, W - 104, 134);
    ctx.restore();

    // Handle • Rank + Optional ZERO-SUPPORTER Crest
    const handleSub = `${formattedHandle.toUpperCase()}  •  ${rankTitle}`;
    ctx.fillStyle = '#A1A1AA';
    ctx.font = isFluentGlass ? `600 22px ${canvasSans}` : '600 22px monospace';
    ctx.fillText(handleSub, 104, 184, badgeSummary.isZeroSupporter ? 540 : W - 208);

    if (badgeSummary.isZeroSupporter) {
      ctx.font = isFluentGlass ? `700 18px ${canvasSans}` : '700 18px monospace';
      const label = 'ZERO-SUPPORTER';
      const textWidth = ctx.measureText(label).width;
      const pillW = Math.round(textWidth + 58);
      const pillH = 44;
      const pillX = W - 104 - pillW;
      const pillY = 152;
      const crestR = isFluentGlass ? 22 : isBespoke ? 6 : 22;

      if (isFluentGlass) {
        const platGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
        platGrad.addColorStop(0, 'rgba(79, 172, 254, 0.24)');
        platGrad.addColorStop(1, 'rgba(15, 23, 42, 0.92)');
        ctx.fillStyle = platGrad;
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.fill();
        ctx.strokeStyle = '#7DD3FC';
        ctx.lineWidth = 2;
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.stroke();
        drawVectorStar(ctx, pillX + 24, pillY + pillH / 2, 9.5, 4.2, '#00F2FE');
        ctx.fillStyle = '#F8FAFC';
        ctx.font = `700 18px ${canvasSans}`;
        ctx.fillText(label, pillX + 42, pillY + 29);
      } else if (isBespoke) {
        ctx.fillStyle = '#0A0A0A';
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.fill();
        ctx.strokeStyle = '#3B82F6';
        ctx.lineWidth = 2;
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.stroke();
        drawVectorStar(ctx, pillX + 24, pillY + pillH / 2, 9.5, 4.2, '#3B82F6');
        ctx.fillStyle = '#FAFAFA';
        ctx.font = '700 18px monospace';
        ctx.fillText(label, pillX + 42, pillY + 29);
      } else {
        ctx.save();
        ctx.shadowColor = 'rgba(251, 191, 36, 0.55)';
        ctx.shadowBlur = 16;
        const goldGrad = ctx.createLinearGradient(pillX, pillY, pillX + pillW, pillY + pillH);
        goldGrad.addColorStop(0, '#FDE68A');
        goldGrad.addColorStop(0.5, '#FBBF24');
        goldGrad.addColorStop(1, '#D97706');
        ctx.fillStyle = goldGrad;
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#FEF3C7';
        ctx.lineWidth = 2;
        drawRoundedRectPath(ctx, pillX, pillY, pillW, pillH, crestR);
        ctx.stroke();

        drawVectorStar(ctx, pillX + 24, pillY + pillH / 2, 9.5, 4.2, '#000000');
        ctx.fillStyle = '#000000';
        ctx.font = '900 18px monospace';
        ctx.fillText(label, pillX + 42, pillY + 29);
      }
    }

    // Period Badge
    const badgeLabel = FOCUS_RECEIPT_PERIOD_LABELS[period].title;
    ctx.font = isModernFont ? `700 22px ${canvasSans}` : '900 22px monospace';
    const periodPillW = Math.max(180, Math.round(ctx.measureText(badgeLabel).width + 52));
    if (isFluentGlass) {
      const pillGrad = ctx.createLinearGradient(104, 226, 104 + periodPillW, 270);
      pillGrad.addColorStop(0, '#FFFFFF');
      pillGrad.addColorStop(0.55, '#BAE6FD');
      pillGrad.addColorStop(1, '#4FACFE');
      ctx.fillStyle = pillGrad;
    } else {
      ctx.fillStyle = isBespoke ? '#2563EB' : activeAccentHex;
    }
    drawRoundedRectPath(ctx, 104, 226, periodPillW, 44, isFluentGlass ? 22 : isBespoke ? 6 : 10);
    ctx.fill();
    ctx.fillStyle = isFluentGlass ? '#09090B' : isBespoke ? '#FFFFFF' : activeAccentBadgeText;
    ctx.fillText(badgeLabel, 130, 255);

    // Giant Hero Metric (auto-scaled so long 1Y / All-Time totals fit cleanly)
    const timeText = periodStats.formattedTime;
    const heroFontPx = timeText.length >= 8 ? 104 : timeText.length >= 6 ? 124 : 148;
    if (isFluentGlass) {
      const heroGrad = ctx.createLinearGradient(104, 290, 104, 420);
      heroGrad.addColorStop(0, '#FFFFFF');
      heroGrad.addColorStop(0.55, '#F4F4F5');
      heroGrad.addColorStop(1, '#94A3B8');
      ctx.fillStyle = heroGrad;
      ctx.font = `700 ${heroFontPx}px ${canvasSans}`;
    } else {
      ctx.fillStyle = '#FFFFFF';
      ctx.font = `${isBespoke ? '700' : '900'} ${heroFontPx}px monospace`;
    }
    ctx.fillText(timeText, 104, 412, W - 208);

    ctx.fillStyle = '#A1A1AA';
    ctx.font = isModernFont ? `600 22px ${canvasSans}` : '700 24px monospace';
    ctx.fillText('DISTRACTION-FREE & PHONE-OFF', 104, 468);

    // Hairline Divider above 2x2 Grid
    ctx.strokeStyle = isFluentGlass
      ? 'rgba(255, 255, 255, 0.12)'
      : isBespoke
      ? '#262626'
      : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX, gridBandY);
    ctx.lineTo(cardX + cardW, gridBandY);
    ctx.stroke();

    // 4-Cell Stats Receipt Box
    const drawStat = (label: string, value: string, x: number, y: number, accent = '#FFFFFF') => {
      ctx.fillStyle = isFluentGlass ? '#0E131F' : isBespoke ? '#0A0A0A' : '#121216';
      drawRoundedRectPath(ctx, x, y, 422, 166, isFluentGlass ? 22 : isBespoke ? 8 : 20);
      ctx.fill();
      ctx.strokeStyle = isFluentGlass
        ? 'rgba(255, 255, 255, 0.14)'
        : isBespoke
        ? '#262626'
        : 'rgba(255, 255, 255, 0.07)';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#A1A1AA';
      ctx.font = isModernFont ? `600 18px ${canvasSans}` : '600 19px monospace';
      ctx.fillText(label, x + 28, y + 48);

      ctx.fillStyle = accent;
      ctx.font = isFluentGlass
        ? `700 46px ${canvasSans}`
        : `${isBespoke ? '700' : '900'} 46px monospace`;
      ctx.fillText(value, x + 28, y + 120, 366);
    };

    drawStat('COMPLETED BLOCKS', `${periodStats.completedCount}`, 104, 548);
    drawStat('DAILY STREAK', `${currentStreak} DAYS`, 554, 548, canvasAccentHex);
    drawStat('COMPLETION RATE', `${periodStats.completionRate}%`, 104, 738, canvasAccentHex);
    drawStat('TOP FOCUS TAG', periodStats.topTag.slice(0, 12), 554, 738);

    // Divider above Tier 2 Footer
    ctx.strokeStyle = isFluentGlass
      ? 'rgba(255, 255, 255, 0.12)'
      : isBespoke
      ? '#262626'
      : 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cardX, tier2Y);
    ctx.lineTo(cardX + cardW, tier2Y);
    ctx.stroke();

    // Tier 2: Badges & Achievements Showcase
    ctx.fillStyle = isFluentGlass ? '#94A3B8' : '#737373';
    ctx.font = isModernFont ? `600 20px ${canvasSans}` : '700 20px monospace';
    ctx.fillText(
      `BADGES & ACHIEVEMENTS (${badgeSummary.unlockedBadges.length}/${badgeSummary.badges.length})`,
      104,
      tier2Y + 48
    );

    if (badgeSummary.unlockedBadges.length === 0) {
      ctx.fillStyle = '#D4D4D8';
      ctx.font = isFluentGlass ? `600 21px ${canvasSans}` : '700 21px monospace';
      ctx.fillText('NEXT UNLOCK: COMPLETE 1H LOCK -> GETTING STARTED', 104, tier2Y + 106, cardW - 96);
      ctx.fillStyle = isFluentGlass ? '#7DD3FC' : isBespoke ? '#93C5FD' : activeAccentHex;
      ctx.font = isFluentGlass ? `600 20px ${canvasSans}` : '600 20px monospace';
      ctx.fillText('SUPPORTER CREST: MIN RS.50 1ST TIP -> ZERO-SUPPORTER', 104, tier2Y + 150, cardW - 96);
    } else {
      let curX = 104;
      let curY = tier2Y + 72;
      const maxX = W - 104;
      const pillH = 44;
      const gapX = 12;
      const gapY = 12;

      for (const badge of badgeSummary.unlockedBadges) {
        ctx.font = isFluentGlass ? `600 18px ${canvasSans}` : '700 18px monospace';
        const pillW = Math.min(maxX - 104, Math.round(ctx.measureText(badge.title).width + 52));
        if (curX + pillW > maxX) {
          curX = 104;
          curY += pillH + gapY;
        }
        if (curY + pillH > tier2Y + 196) break;

        if (isFluentGlass) {
          const isSupporter = badge.tierColor === 'gold';
          ctx.fillStyle = isSupporter ? 'rgba(79, 172, 254, 0.20)' : 'rgba(255, 255, 255, 0.06)';
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
          ctx.fill();
          ctx.strokeStyle = isSupporter ? '#7DD3FC' : 'rgba(255, 255, 255, 0.22)';
          ctx.lineWidth = 2;
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
          ctx.stroke();
          drawVectorStar(
            ctx,
            curX + 22,
            curY + pillH / 2,
            8.5,
            4,
            isSupporter ? '#00F2FE' : '#E2E8F0'
          );
          ctx.fillStyle = isSupporter ? '#E0F2FE' : '#F4F4F5';
          ctx.font = `600 18px ${canvasSans}`;
          ctx.fillText(badge.title, curX + 38, curY + 28, pillW - 48);
        } else if (isBespoke) {
          const isSupporter = badge.tierColor === 'gold';
          ctx.fillStyle = '#000000';
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 6);
          ctx.fill();
          ctx.strokeStyle = isSupporter ? '#3B82F6' : '#262626';
          ctx.lineWidth = 2;
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 6);
          ctx.stroke();
          drawVectorStar(
            ctx,
            curX + 22,
            curY + pillH / 2,
            8.5,
            4,
            isSupporter ? '#3B82F6' : '#A3A3A3'
          );
          ctx.fillStyle = isSupporter ? '#93C5FD' : '#E5E5E5';
          ctx.font = '700 18px monospace';
          ctx.fillText(badge.title, curX + 38, curY + 28, pillW - 48);
        } else {
          const isSupporterGold = badge.tierColor === 'gold';
          const pillTheme = isSupporterGold
            ? GOLD_CANVAS_BADGE
            : {
                bgStart: `rgba(${activeAccentRgb}, 0.22)`,
                bgEnd: `rgba(${activeAccentRgb}, 0.10)`,
                border: activeAccentHex,
                text: activeAccentHex,
                icon: activeAccentHex,
                glow: undefined,
              };
          ctx.save();
          if (pillTheme.glow) {
            ctx.shadowColor = pillTheme.glow;
            ctx.shadowBlur = 12;
          }
          const grad = ctx.createLinearGradient(curX, curY, curX + pillW, curY + pillH);
          grad.addColorStop(0, pillTheme.bgStart);
          grad.addColorStop(1, pillTheme.bgEnd);
          ctx.fillStyle = grad;
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
          ctx.fill();
          ctx.restore();

          ctx.strokeStyle = pillTheme.border;
          ctx.lineWidth = 2;
          drawRoundedRectPath(ctx, curX, curY, pillW, pillH, 22);
          ctx.stroke();

          drawVectorStar(ctx, curX + 22, curY + pillH / 2, 8.5, 4, pillTheme.icon);
          ctx.fillStyle = pillTheme.text;
          ctx.font = '900 18px monospace';
          ctx.fillText(badge.title, curX + 38, curY + 28, pillW - 48);
        }

        curX += pillW + gapX;
      }
    }

    // Sub-divider inside Tier 2 above Escape Tickets + Motto
    const manifestoY = tier2Y + 216;
    ctx.strokeStyle = isFluentGlass
      ? 'rgba(255, 255, 255, 0.12)'
      : isBespoke
      ? '#262626'
      : 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(104, manifestoY);
    ctx.lineTo(W - 104, manifestoY);
    ctx.stroke();

    ctx.fillStyle = '#E4E4E7';
    ctx.font = isFluentGlass ? `600 24px ${canvasSans}` : '700 24px monospace';
    ctx.fillText(
      `ESCAPE TICKETS: ${parachuteMetrics.currentBalance}  |  FOSS • ZERO PAYWALLS`,
      104,
      manifestoY + 54,
      cardW - 96
    );
    ctx.fillStyle = '#A1A1AA';
    ctx.font = isModernFont
      ? `italic 500 21px ${canvasSans}`
      : 'italic 600 21px monospace';
    ctx.fillText(mottoQuoted, 104, manifestoY + 96, cardW - 96);

        return canvas.toDataURL('image/png');
      } catch (err) {
        console.error('Failed to draw canvas receipt', err);
        return '';
      }
    },
    [
      isBespoke,
      isFluentGlass,
      isModernFont,
      themeConfig,
      period,
      periodStats,
      currentStreak,
      parachuteMetrics.currentBalance,
      parachuteMetrics.totalReclaimedHours,
      profile,
      badgeSummary,
      formattedHandle,
      rankTitle,
      mottoQuoted,
    ]
  );

  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const url = drawReceiptToCanvas(canvasRef.current);
    if (url) {
      setReceiptExport({
        dataUrl: url,
        dateLabel: new Date()
          .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          .toUpperCase(),
      });
    }
  }, [isOpen, drawReceiptToCanvas]);

  if (!isOpen) return null;

  const badgeCaptionSuffix =
    badgeSummary.unlockedBadges.length > 0
      ? ` Badges: ${badgeSummary.unlockedBadges.map((b) => b.title).join(', ')}.`
      : '';
  const caption = `I stayed distraction-free for ${periodStats.formattedTime} (${FOCUS_RECEIPT_PERIOD_LABELS[period].title}) using Zero-Distractions (${currentStreak}d streak, ${periodStats.completedCount} completed locks).${badgeCaptionSuffix}`;

  const handleNativeOrWebShare = async () => {
    let dataUrl = receiptExport.dataUrl;
    if (!dataUrl && canvasRef.current) {
      dataUrl = drawReceiptToCanvas(canvasRef.current);
      if (dataUrl) {
        setReceiptExport({
          dataUrl,
          dateLabel: new Date()
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            .toUpperCase(),
        });
      }
    }
    if (!dataUrl) return;
    const fileName = `zero-flex-${period}-${new Date().toISOString().split('T')[0]}.png`;

    if (window.ZeroNative?.shareImageBase64) {
      window.ZeroNative.shareImageBase64(dataUrl, fileName, caption);
      return;
    }

    try {
      const blob = dataUrlToBlob(dataUrl);
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
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  const handleDownloadPng = () => {
    let dataUrl = receiptExport.dataUrl;
    if (!dataUrl && canvasRef.current) {
      dataUrl = drawReceiptToCanvas(canvasRef.current);
      if (dataUrl) {
        setReceiptExport({
          dataUrl,
          dateLabel: new Date()
            .toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            .toUpperCase(),
        });
      }
    }
    if (!dataUrl) return;
    const fileName = `zero-flex-${period}-${new Date().toISOString().split('T')[0]}.png`;

    if (window.ZeroNative?.saveImageToGallery) {
      window.ZeroNative.saveImageToGallery(dataUrl, fileName);
      return;
    }

    if (window.ZeroNative?.shareImageBase64) {
      window.ZeroNative.shareImageBase64(dataUrl, fileName, caption);
      return;
    }

    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = fileName;
    a.click();
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4 ${
        isFluentGlass ? 'bg-black/75 backdrop-blur-sm' : 'bg-black/95'
      }`}
      style={{
        paddingTop: 'calc(0.75rem + var(--zero-safe-top))',
        paddingBottom: 'calc(0.75rem + var(--zero-safe-bottom))',
      }}
    >
      <div
        className={`w-full max-w-md h-[90vh] max-h-[780px] flex flex-col gap-2.5 min-h-0 ${
          isModernFont ? 'font-sans' : 'font-mono'
        }`}
      >
        {/* Top Context Header Strip */}
        <div
          className={`flex items-center justify-between text-[11px] uppercase tracking-widest px-1 shrink-0 ${
            isModernFont ? 'font-sans text-neutral-400' : 'font-mono'
          }`}
          style={isModernFont ? undefined : { color: '#A1A1AA' }}
        >
          <span>ESCAPE TICKETS &amp; METRICS</span>
          <span
            className={`${isFluentGlass ? 'font-sans' : 'font-mono'} tabular-nums`}
            style={{ color: '#737373' }}
          >
            {currentStreak > 0 ? `${currentStreak}D STREAK` : 'STREAKS'}
          </span>
        </div>

        {/* 1. FLEX YOUR FOCUS CARD OUTER OBSIDIAN CONTAINER */}
        <ObsidianCard
          ambientGlow
          className={`w-full flex-1 min-h-0 ${isModernFont ? 'font-sans' : 'font-mono'}`}
          headerClassName="p-4 sm:p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
          footerClassName="p-3.5 sm:p-4 flex items-center gap-2.5 shrink-0 z-30"
          headerContent={
            <>
              {/* Card Title Header */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={
                      isFluentGlass
                        ? 'liquid-squircle'
                        : `w-10 h-10 obsidian-icon-box flex items-center justify-center shrink-0 ${
                            isBespoke ? 'rounded-md text-blue-500' : 'rounded-xl'
                          }`
                    }
                  >
                    <Sparkles
                      size={18}
                      strokeWidth={isFluentGlass ? 1.75 : 2}
                      className={isFluentGlass ? 'text-zinc-100' : undefined}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
                  </div>
                  <div className="min-w-0">
                    <h2
                      className={`text-sm uppercase tracking-wide truncate ${
                        isModernFont ? 'font-semibold text-neutral-50' : 'font-black text-white'
                      }`}
                    >
                      FLEX YOUR FOCUS CARD
                    </h2>
                    <p className="text-xs text-neutral-400 truncate">
                      Share distraction-free time with friends
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className={
                    isFluentGlass
                      ? 'p-1.5 rounded-full liquid-pill text-zinc-300 shrink-0'
                      : isBespoke
                      ? 'p-1.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-white transition-colors duration-75 shrink-0'
                      : 'p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white transition-colors shrink-0'
                  }
                  aria-label="Close Focus Receipt"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Interactive Time Range Selector Tabs */}
              <div
                className={
                  isFluentGlass
                    ? 'grid grid-cols-5 gap-1 p-1 rounded-full bg-black/45 border border-white/10 text-[11px] font-sans'
                    : isBespoke
                    ? 'grid grid-cols-5 gap-1 p-1 rounded-md bg-neutral-950 border border-neutral-800 text-[11px] font-sans'
                    : 'grid grid-cols-5 gap-1 p-1 rounded-xl text-[10px]'
                }
                style={
                  isModernFont
                    ? undefined
                    : {
                        background: 'rgba(12, 12, 15, 0.85)',
                        border: '1px solid rgba(255, 255, 255, 0.08)',
                      }
                }
              >
                {FOCUS_RECEIPT_PERIOD_ORDER.map((p) => {
                  const isActive = period === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPeriod(p)}
                      className={
                        isFluentGlass
                          ? `py-2 rounded-full liquid-spring text-center ${
                              isActive
                                ? 'liquid-pill-active font-semibold'
                                : 'text-zinc-400 hover:text-white font-medium'
                            }`
                          : isBespoke
                          ? `py-2 rounded-sm transition-colors duration-75 text-center ${
                              isActive
                                ? 'bg-blue-600 text-white font-semibold'
                                : 'text-neutral-400 hover:text-white font-medium'
                            }`
                          : `py-2 rounded-lg transition-all text-center ${
                              isActive
                                ? 'obsidian-pill-active font-black'
                                : 'text-zinc-400 hover:text-white font-semibold'
                            }`
                      }
                    >
                      {FOCUS_RECEIPT_PERIOD_LABELS[p].tabLabel}
                    </button>
                  );
                })}
              </div>

              {/* Badges On Card Progress Section */}
              <div
                className={
                  isFluentGlass
                    ? 'rounded-xl p-3.5 text-xs liquid-row space-y-2'
                    : isBespoke
                    ? 'rounded-md p-3.5 text-xs bg-neutral-950 border border-neutral-800 space-y-2'
                    : 'rounded-xl p-3.5 text-xs font-mono space-y-2'
                }
                style={
                  isModernFont
                    ? undefined
                    : {
                        background: 'rgba(16, 16, 20, 0.82)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                      }
                }
              >
                <div className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-neutral-300">
                    <Trophy
                      size={12}
                      strokeWidth={isFluentGlass ? 1.75 : 2}
                      className={
                        isFluentGlass
                          ? 'text-cyan-300 shrink-0'
                          : isBespoke
                          ? 'text-blue-500 shrink-0'
                          : 'shrink-0'
                      }
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    />
                    <span>Badges On Card</span>
                  </span>
                  <span
                    className={`tabular-nums font-semibold uppercase tracking-wider ${
                      isFluentGlass
                        ? 'font-sans text-cyan-200'
                        : isBespoke
                        ? 'font-mono text-blue-400'
                        : 'font-mono font-black'
                    }`}
                    style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                  >
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
                  <p className="text-[11px] leading-relaxed text-neutral-400">
                    Complete a 1h lock for{' '}
                    <strong className="text-neutral-200">GETTING STARTED</strong> or make your 1st min
                    ₹50 tip for the{' '}
                    <strong
                      className={
                        isFluentGlass
                          ? 'text-cyan-300'
                          : isBespoke
                          ? 'text-blue-400'
                          : undefined
                      }
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      ZERO-SUPPORTER
                    </strong>{' '}
                    badge.
                  </p>
                )}
              </div>

              {/* 2. INNER FOCUS RECEIPT TICKET CARD */}
              <div
                data-obsidian-card="true"
                className={
                  isFluentGlass
                    ? 'relative rounded-[20px] overflow-hidden liquid-card'
                    : isBespoke
                    ? 'relative rounded-md overflow-hidden bg-black border border-neutral-800'
                    : 'relative rounded-2xl overflow-hidden shadow-2xl'
                }
                style={
                  isModernFont
                    ? undefined
                    : {
                        background:
                          'linear-gradient(180deg, rgba(16, 16, 20, 0.98) 0%, rgba(6, 6, 8, 1) 100%)',
                        border: '1.5px solid rgba(var(--accent-rgb, 255, 255, 255), 0.36)',
                        boxShadow:
                          '0 14px 32px -8px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
                      }
                }
              >
                {isFluentGlass && <div aria-hidden="true" className="liquid-noise-overlay z-0" />}
                {!isBespoke && (
                  <div
                    aria-hidden="true"
                    className="absolute top-0 left-5 right-5 h-[1.5px] pointer-events-none z-10"
                    style={{
                      background: isFluentGlass
                        ? 'linear-gradient(90deg, rgba(255,255,255,0.08) 0%, #FFFFFF 50%, rgba(255,255,255,0.08) 100%)'
                        : 'linear-gradient(90deg, transparent 0%, var(--accent-hex, #FFFFFF) 50%, transparent 100%)',
                      opacity: 0.78,
                    }}
                  />
                )}

                {/* Tier 1A: Receipt Header & Hero Metric */}
                <div
                  className={`relative z-10 p-4 border-b ${
                    isBespoke ? 'border-neutral-800' : 'border-white/10'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span
                      className={`text-white tracking-widest uppercase ${
                        isModernFont ? 'font-sans font-semibold' : 'font-mono font-black text-[11px]'
                      }`}
                    >
                      ZERO // FOCUS RECEIPT
                    </span>
                    <span
                      className={`text-[10px] font-semibold tracking-wider uppercase shrink-0 ${
                        isFluentGlass
                          ? 'font-sans text-cyan-300'
                          : isBespoke
                          ? 'font-mono text-blue-500'
                          : 'font-mono font-bold'
                      }`}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      {receiptExport.dateLabel || 'TODAY'}
                    </span>
                  </div>

                  <div className="mt-1.5 flex items-center justify-between gap-2 flex-wrap">
                    <div
                      className={`text-[10px] uppercase tracking-wider text-neutral-400 ${
                        isFluentGlass ? 'font-sans' : 'font-mono'
                      }`}
                    >
                      {formattedHandle} <span className="text-neutral-600">•</span> {rankTitle}
                    </div>
                    {badgeSummary.isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                  </div>

                  {/* Period Tag */}
                  <div
                    className={`mt-3 inline-block px-2.5 py-0.5 text-[10px] tracking-widest uppercase ${
                      isFluentGlass
                        ? 'rounded-full liquid-pill-active font-sans font-semibold'
                        : isBespoke
                        ? 'rounded-sm bg-blue-600 text-white font-sans font-semibold'
                        : 'rounded-md obsidian-pill-active font-black font-mono'
                    }`}
                  >
                    {FOCUS_RECEIPT_PERIOD_LABELS[period].title}
                  </div>

                  {/* Huge Focus Time Display */}
                  <div
                    className={`mt-2.5 tabular-nums tracking-tight leading-none ${
                      isFluentGlass
                        ? 'liquid-metric font-sans font-bold'
                        : isBespoke
                        ? 'font-mono font-semibold text-white'
                        : 'font-mono font-black tracking-tighter text-white'
                    } ${
                      periodStats.formattedTime.length >= 7
                        ? 'text-4xl'
                        : periodStats.formattedTime.length >= 5
                        ? 'text-[44px]'
                        : 'text-5xl'
                    }`}
                  >
                    {periodStats.formattedTime}
                  </div>
                  <div
                    className={`text-[10px] tracking-[0.18em] uppercase mt-1.5 text-neutral-400 ${
                      isModernFont ? 'font-sans' : 'font-mono tracking-[0.2em]'
                    }`}
                  >
                    DISTRACTION-FREE &amp; PHONE-OFF
                  </div>
                </div>

                {/* Tier 1B: 2x2 Stats Grid */}
                <div
                  className={`relative z-10 grid grid-cols-2 gap-2.5 p-3.5 ${
                    isBespoke ? 'bg-black' : ''
                  }`}
                  style={
                    isFluentGlass
                      ? { background: 'rgba(0, 0, 0, 0.28)' }
                      : isBespoke
                      ? undefined
                      : { background: 'rgba(0, 0, 0, 0.44)' }
                  }
                >
                  <div
                    className={
                      isFluentGlass
                        ? 'p-3 rounded-xl liquid-row'
                        : isBespoke
                        ? 'p-3 rounded-md bg-neutral-950 border border-neutral-800'
                        : 'p-3 rounded-xl border border-white/5'
                    }
                    style={
                      isModernFont
                        ? undefined
                        : {
                            background: '#121216',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                          }
                    }
                  >
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                      COMPLETED BLOCKS
                    </div>
                    <div
                      className={`text-xl font-semibold tabular-nums text-white mt-0.5 ${
                        isFluentGlass ? 'font-sans liquid-metric' : 'font-mono'
                      }`}
                    >
                      {periodStats.completedCount}
                    </div>
                  </div>

                  <div
                    className={
                      isFluentGlass
                        ? 'p-3 rounded-xl liquid-row'
                        : isBespoke
                        ? 'p-3 rounded-md bg-neutral-950 border border-neutral-800'
                        : 'p-3 rounded-xl border border-white/5'
                    }
                    style={
                      isModernFont
                        ? undefined
                        : {
                            background: '#121216',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                          }
                    }
                  >
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                      DAILY STREAK
                    </div>
                    <div
                      className={`text-xl font-semibold tabular-nums mt-0.5 ${
                        isFluentGlass
                          ? 'font-sans text-cyan-300'
                          : isBespoke
                          ? 'font-mono text-blue-400'
                          : 'font-mono font-bold'
                      }`}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      {currentStreak} DAYS
                    </div>
                  </div>

                  <div
                    className={
                      isFluentGlass
                        ? 'p-3 rounded-xl liquid-row'
                        : isBespoke
                        ? 'p-3 rounded-md bg-neutral-950 border border-neutral-800'
                        : 'p-3 rounded-xl border border-white/5'
                    }
                    style={
                      isModernFont
                        ? undefined
                        : {
                            background: '#121216',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                          }
                    }
                  >
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                      COMPLETION RATE
                    </div>
                    <div
                      className={`text-xl font-semibold tabular-nums mt-0.5 ${
                        isFluentGlass
                          ? 'font-sans text-cyan-300'
                          : isBespoke
                          ? 'font-mono text-blue-400'
                          : 'font-mono font-bold'
                      }`}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      {periodStats.completionRate}%
                    </div>
                  </div>

                  <div
                    className={
                      isFluentGlass
                        ? 'p-3 rounded-xl liquid-row'
                        : isBespoke
                        ? 'p-3 rounded-md bg-neutral-950 border border-neutral-800'
                        : 'p-3 rounded-xl border border-white/5'
                    }
                    style={
                      isModernFont
                        ? undefined
                        : {
                            background: '#121216',
                            boxShadow: 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
                          }
                    }
                  >
                    <div className="text-[10px] uppercase tracking-wider text-neutral-400">
                      TOP FOCUS TAG
                    </div>
                    <div
                      className={`text-base font-semibold text-white mt-1 truncate ${
                        isFluentGlass ? 'font-sans' : 'font-mono'
                      }`}
                    >
                      {periodStats.topTag}
                    </div>
                  </div>
                </div>

                {/* Tier 2: Receipt Footer (Badges, Escape Tickets & Signature Quote) */}
                <div
                  className={`relative z-10 p-4 border-t text-xs flex flex-col gap-2.5 ${
                    isFluentGlass
                      ? 'bg-black/40 border-white/10 font-sans'
                      : isBespoke
                      ? 'bg-neutral-950 border-neutral-800'
                      : 'p-3.5 border-white/5 text-[11px] font-mono'
                  }`}
                  style={isModernFont ? undefined : { background: '#09090C' }}
                >
                  <div>
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
                      BADGES &amp; ACHIEVEMENTS (
                      <span className={`${isFluentGlass ? 'font-sans' : 'font-mono'} tabular-nums`}>
                        {badgeSummary.unlockedBadges.length}/{badgeSummary.badges.length}
                      </span>
                      )
                    </div>

                    {badgeSummary.unlockedBadges.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {badgeSummary.unlockedBadges.map((b) =>
                          b.id === 'zero_supporter' ? (
                            <ZeroSupporterGoldenBadge key={b.id} compact />
                          ) : (
                            <AchievementBadgePill key={b.id} badge={b} />
                          )
                        )}
                      </div>
                    ) : (
                      <div
                        className={`mt-1.5 text-[10px] leading-relaxed space-y-0.5 ${
                          isFluentGlass ? 'font-sans' : 'font-mono'
                        }`}
                      >
                        <div className="text-neutral-300">
                          NEXT UNLOCK: COMPLETE 1H LOCK -&gt; GETTING STARTED
                        </div>
                        <div
                          className={
                            isFluentGlass
                              ? 'text-cyan-300'
                              : isBespoke
                              ? 'text-blue-400'
                              : undefined
                          }
                          style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                        >
                          SUPPORTER CREST: MIN RS.50 1ST TIP -&gt; ZERO-SUPPORTER
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className={`pt-2.5 border-t space-y-1 ${
                      isBespoke ? 'border-neutral-800' : 'border-white/10'
                    }`}
                  >
                    <div
                      className={`text-[11px] font-semibold text-neutral-200 ${
                        isFluentGlass ? 'font-sans' : 'font-mono'
                      }`}
                    >
                      ESCAPE TICKETS: {parachuteMetrics.currentBalance} | FOSS • ZERO PAYWALLS
                    </div>
                    <div className="italic text-[11px] text-neutral-400">{mottoQuoted}</div>
                  </div>
                </div>
              </div>

              {/* Offscreen Hi-Res PNG Canvas for Native Share & Export */}
              <canvas
                ref={canvasRef}
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  left: -9999,
                  top: -9999,
                  width: 1080,
                  height: 1350,
                  opacity: 0,
                  pointerEvents: 'none',
                  zIndex: -1,
                }}
              />
            </>
          }
          footerContent={
            <>
              <button
                type="button"
                onClick={handleNativeOrWebShare}
                className={
                  isFluentGlass
                    ? 'flex-1 py-3.5 rounded-2xl liquid-pill-active font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2'
                    : isBespoke
                    ? 'flex-1 py-3.5 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-75'
                    : 'flex-1 py-3.5 rounded-2xl obsidian-pill-active font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-[0.98] transition-all'
                }
                style={
                  isModernFont
                    ? undefined
                    : {
                        boxShadow:
                          '0 0 20px rgba(var(--accent-rgb, 255, 255, 255), 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.28)',
                      }
                }
              >
                <Share2 size={15} strokeWidth={isFluentGlass ? 1.75 : 2} />
                <span>Share with Friends</span>
              </button>
              <button
                type="button"
                onClick={handleDownloadPng}
                className={
                  isFluentGlass
                    ? 'p-3.5 rounded-2xl liquid-pill text-white flex items-center justify-center shrink-0'
                    : isBespoke
                    ? 'p-3.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-white flex items-center justify-center transition-colors duration-75 shrink-0'
                    : 'p-3.5 rounded-2xl flex items-center justify-center transition-all active:scale-[0.98] text-white hover:border-white/25 shrink-0'
                }
                style={
                  isModernFont
                    ? undefined
                    : {
                        background: 'rgba(24, 24, 28, 0.92)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                      }
                }
                title="Save PNG"
                aria-label="Download Focus Receipt PNG"
              >
                <Download size={16} strokeWidth={isFluentGlass ? 1.75 : 2} />
              </button>
            </>
          }
        />
      </div>
    </div>
  );
};
