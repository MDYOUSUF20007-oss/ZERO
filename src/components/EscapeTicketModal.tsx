import React from 'react';
import type { ParachuteMetrics, ZeroProfile } from '../types';
import { FIRST_DONATION_BONUS_INR } from '../utils/supportLinks';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { ACCENT_ID_TO_KEY, ACCENT_THEMES, ProfileAvatar } from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import {
  Ticket,
  X,
  Clock,
  Gift,
  Heart,
  ShieldAlert,
  CheckCircle2,
  ArrowRight,
  Moon,
} from 'lucide-react';

interface EscapeTicketModalProps {
  isOpen: boolean;
  parachuteMetrics: ParachuteMetrics;
  profile: ZeroProfile | null;
  isZeroSupporter: boolean;
  hasClaimedFirstTimeParachute: boolean;
  hasClaimedFirstDonationParachute: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
  onOpenSupport?: () => void;
  onOpenInsights?: () => void;
}

export const EscapeTicketModal: React.FC<EscapeTicketModalProps> = ({
  isOpen,
  parachuteMetrics,
  profile,
  isZeroSupporter,
  hasClaimedFirstTimeParachute,
  hasClaimedFirstDonationParachute,
  onClose,
  onOpenProfile,
  onOpenSupport,
  onOpenInsights,
}) => {
  if (!isOpen) return null;

  const balance = parachuteMetrics.currentBalance;
  const profileAccentKey = ACCENT_ID_TO_KEY[profile?.accentColor || 'amber'] || 'Amber';
  const accentTheme = ACCENT_THEMES[profileAccentKey] || ACCENT_THEMES.Amber;
  const rank = getZeroRankFromHours(parachuteMetrics.totalReclaimedHours);
  const holderName = profile?.displayName?.trim() || 'ZERO INITIATE';
  const holderHandle = profile?.handle?.trim() || null;

  const sleepRateLabel =
    parachuteMetrics.sleepFarmingMode === 'quarter_credit'
      ? '0.25x sleep credit'
      : parachuteMetrics.sleepFarmingMode === 'daytime_only'
      ? 'Daytime hours only (0x sleep)'
      : 'Full 1.0x credit';

  const balanceSentence =
    balance === 0
      ? 'Vault empty — complete 20h focus to earn one'
      : balance === 1
      ? 'You have 1 Escape Ticket ready in your vault'
      : `You have ${balance} Escape Tickets ready in your vault`;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/92 backdrop-blur-md flex items-start justify-center px-4 overflow-y-auto"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md my-auto space-y-3.5 py-2">
        {/* GIANT PHYSICAL ESCAPE TICKET */}
        <ObsidianCard
          accent={profileAccentKey}
          ambientGlow
          className="font-mono"
          overlays={
            <>
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-6 right-2 text-[96px] leading-none opacity-[0.05] select-none"
              >
                🎫
              </div>
              {/* Perforated boarding-pass side notches aligned above footer divider */}
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -left-2.5 bottom-[54px] w-5 h-5 rounded-full bg-black border border-white/15 z-20"
              />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -right-2.5 bottom-[54px] w-5 h-5 rounded-full bg-black border border-white/15 z-20"
              />
            </>
          }
          headerClassName="p-5 space-y-4"
          footerClassName="px-5 py-3 flex items-center justify-between gap-2 text-[10px] text-zinc-400"
          headerContent={
            <>
              {/* Ticket Top Serial Strip + Close */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
                  <Ticket size={13} style={{ color: accentTheme.hex }} />
                  <span>ZERO PASS • VAULT</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 rounded-xl bg-zinc-900 border border-white/15 text-zinc-400 hover:text-white transition-colors"
                  aria-label="Close Escape Ticket View"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Giant Ticket Crest + ESCAPE TICKET Title */}
              <div className="flex items-center gap-3.5 pt-1">
                <div className="w-16 h-16 rounded-2xl obsidian-icon-box flex items-center justify-center shrink-0">
                  <span className="text-3xl leading-none animate-parachute-float inline-block">
                    🎫
                  </span>
                </div>
                <div className="min-w-0">
                  <div
                    className="text-[10px] font-black uppercase tracking-[0.22em]"
                    style={{ color: accentTheme.hex }}
                  >
                    EMERGENCY EXIT VOUCHER
                  </div>
                  <h2 className="text-2xl font-black tracking-[0.12em] uppercase text-white leading-tight mt-0.5">
                    ESCAPE TICKET
                  </h2>
                  <p className="text-[11px] text-zinc-300 mt-1">{balanceSentence}</p>
                </div>
              </div>

              {/* Issued-To Holder Block & Giant Quantity Stamp */}
              <div className="p-3.5 rounded-2xl obsidian-inset flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {profile ? (
                    <ProfileAvatar
                      avatarId={profile.avatarId}
                      accent={profile.accentColor}
                      size="sm"
                      interactive
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0 text-sm font-black text-white">
                      0
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="text-[9px] uppercase tracking-[0.18em] text-zinc-400 font-bold">
                      ISSUED TO
                    </div>
                    <div className="text-sm font-black text-white uppercase tracking-wider truncate">
                      {holderName}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {holderHandle && (
                        <span className="text-[10px] text-zinc-400 truncate">{holderHandle}</span>
                      )}
                      <span
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest"
                        style={{
                          background: accentTheme.badgeGradient,
                          color: accentTheme.badgeText,
                        }}
                      >
                        {rank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                  </div>
                </div>

                {/* Big Count Pill */}
                <div className="px-3.5 py-2.5 rounded-xl obsidian-pill-active text-center shrink-0">
                  <div className="text-2xl font-black leading-none">{balance}</div>
                  <div className="text-[8px] font-black uppercase tracking-[0.18em] mt-1">
                    {balance === 1 ? 'TICKET' : 'TICKETS'}
                  </div>
                </div>
              </div>

              {/* Next Ticket 20h Milestone Meter on Stub */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-white/15">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-bold">Progress to Next Escape Ticket</span>
                  <span className="font-black" style={{ color: accentTheme.hex }}>
                    {parachuteMetrics.currentProgressHours} / 20.0h ({parachuteMetrics.progressPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full obsidian-inset-neutral overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${parachuteMetrics.progressPercentage}%`,
                      background: accentTheme.badgeGradient,
                    }}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-zinc-400">
                  <span>{parachuteMetrics.hoursUntilNextParachute}h left for next +1 🎫</span>
                  <span>Earned: {parachuteMetrics.lifetimeEarnedParachutes} • Used: {parachuteMetrics.deployedParachutes}</span>
                </div>
              </div>
            </>
          }
          footerContent={
            <>
              <span className="uppercase tracking-widest text-zinc-400 font-semibold">
                {balance > 0 ? 'STATUS: READY IN VAULT' : 'STATUS: 0 AVAILABLE'}
              </span>
              <span style={{ color: accentTheme.hex }} className="font-black uppercase tracking-wider">
                {profile ? profile.primaryMission : 'MONOTONIC PROOF'}
              </span>
            </>
          }
        />

        {/* BELOW TICKET: HOW TO GAIN MORE ESCAPE TICKETS */}
        <ObsidianCard
          accent={profileAccentKey}
          className="font-mono"
          headerClassName="p-4 space-y-2.5"
          footerClassName="px-4 py-2.5 flex items-start gap-2 text-[10px] text-zinc-400 leading-relaxed"
          headerContent={
            <>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                How to Gain More Escape Tickets
              </div>

              {/* 1. 20h Milestone */}
              <div className="p-3 rounded-xl obsidian-inset-neutral flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={13} style={{ color: accentTheme.hex }} />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white">
                      Every 20 Focus Hours (+1 🎫)
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded obsidian-inset text-zinc-200 shrink-0">
                      Unlimited
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Finish lock sessions completely to fill the 20-hour counter. Active rate:{' '}
                    <span className="text-zinc-200 font-semibold inline-flex items-center gap-1">
                      <Moon size={10} style={{ color: accentTheme.hex }} />
                      {sleepRateLabel}
                    </span>
                    .
                  </p>
                </div>
              </div>

              {/* 2. First-Timer Profile Gift */}
              <div className="p-3 rounded-xl obsidian-inset-neutral flex items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0 mt-0.5">
                    <Gift size={13} style={{ color: accentTheme.hex }} />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">
                      Starter Profile Gift (+1 🎫)
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      One-time free welcome ticket when you create your profile.
                    </div>
                  </div>
                </div>
                {hasClaimedFirstTimeParachute ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={10} />
                    <span>Claimed</span>
                  </span>
                ) : (
                  onOpenProfile && (
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="px-2.5 py-1.5 rounded-lg obsidian-pill-active text-[9px] font-black uppercase flex items-center gap-1 shrink-0 active:scale-95"
                    >
                      <span>Claim</span>
                      <ArrowRight size={10} />
                    </button>
                  )
                )}
              </div>

              {/* 3. First ₹50+ Tip Support Thank-You */}
              <div className="p-3 rounded-xl obsidian-inset-neutral flex items-center justify-between gap-2.5">
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0 mt-0.5">
                    <Heart size={13} className="text-red-400" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-[11px] font-bold text-white">
                      1st Tip ₹{FIRST_DONATION_BONUS_INR}+ Gift (+1 🎫 &amp; Gold Crest)
                    </div>
                    <div className="text-[10px] text-zinc-400">
                      Voluntary thank-you gift strictly on your first ₹{FIRST_DONATION_BONUS_INR}+ support tip.
                    </div>
                  </div>
                </div>
                {hasClaimedFirstDonationParachute ? (
                  <span className="px-2 py-1 rounded-lg bg-emerald-950/60 border border-emerald-600/50 text-emerald-300 text-[9px] font-black uppercase flex items-center gap-1 shrink-0">
                    <CheckCircle2 size={10} />
                    <span>Unlocked</span>
                  </span>
                ) : (
                  onOpenSupport && (
                    <button
                      type="button"
                      onClick={onOpenSupport}
                      className="px-2.5 py-1.5 rounded-lg obsidian-inset text-zinc-100 hover:text-white text-[9px] font-black uppercase flex items-center gap-1 shrink-0 active:scale-95"
                    >
                      <span>Support</span>
                      <ArrowRight size={10} />
                    </button>
                  )
                )}
              </div>
            </>
          }
          footerContent={
            <>
              <ShieldAlert size={13} className="text-amber-400 shrink-0 mt-0.5" />
              <span>
                Using a ticket ends the lock early, costs <strong className="text-white">1 🎫</strong>, and voids that broken session&rsquo;s progress toward your next 20h ticket.
              </span>
            </>
          }
        />

        {/* Modal Bottom Action Bar */}
        <div className="flex gap-2">
          {onOpenInsights && (
            <button
              type="button"
              onClick={onOpenInsights}
              className="flex-1 py-2.5 rounded-xl obsidian-inset text-xs font-mono font-bold text-white hover:border-white/30 active:scale-95 transition-all"
            >
              Ticket Log in Insights
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl obsidian-pill-active text-xs font-mono font-black uppercase tracking-wider active:scale-95 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
