import React from 'react';
import type { ParachuteMetrics, ZeroProfile } from '../types';
import { FIRST_DONATION_BONUS_INR } from '../utils/supportLinks';
import { getZeroRankFromHours } from '../utils/parachuteRewardsPolicy';
import { ProfileAvatar } from './ProfileAvatar';
import { ObsidianCard } from './ObsidianCard';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
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
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  if (!isOpen) return null;

  const balance = parachuteMetrics.currentBalance;
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
      ? 'Vault empty — complete 35h focus to earn one'
      : balance === 1
      ? 'You have 1 Escape Ticket ready in your vault'
      : `You have ${balance} Escape Tickets ready in your vault`;

  if (isFluentGlass) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-start justify-center px-4 overflow-y-auto"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md my-auto space-y-4 py-2">
          {/* Giant Ticket Card */}
          <div className="liquid-card rounded-3xl overflow-hidden">
            {/* Ticket Header */}
            <div className="p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-white/40 font-semibold">
                  <Ticket size={14} strokeWidth={1.75} className="text-[#7DD3FC]" />
                  <span>ZERO PASS • VAULT</span>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="liquid-pill p-2 text-white/40 hover:text-white transition-colors"
                  aria-label="Close Escape Ticket View"
                >
                  <X size={15} strokeWidth={1.75} />
                </button>
              </div>

              <div className="flex items-center gap-3.5 pt-1">
                <div className="liquid-squircle w-16 h-16 flex items-center justify-center shrink-0" style={{ borderRadius: '18px' }}>
                  <Ticket size={28} strokeWidth={1} className="text-[#7DD3FC]" />
                </div>
                <div className="min-w-0">
                  <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.22em] text-[#7DD3FC]">
                    EMERGENCY EXIT VOUCHER
                  </div>
                  <h2 className="liquid-metric text-2xl mt-0.5 uppercase">
                    ESCAPE TICKET
                  </h2>
                  <p className="text-[11px] text-white/50 mt-1">{balanceSentence}</p>
                </div>
              </div>

              {/* Issued To + Balance */}
              <div className="liquid-inset p-3.5 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  {profile ? (
                    <ProfileAvatar avatarId={profile.avatarId} size="sm" interactive />
                  ) : (
                    <div className="liquid-squircle w-9 h-9 flex items-center justify-center shrink-0 font-mono text-sm font-bold text-white">
                      0
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-white/40 font-semibold">
                      ISSUED TO
                    </div>
                    <div className="text-sm font-semibold text-white uppercase tracking-wide truncate">
                      {holderName}
                    </div>
                    <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                      {holderHandle && (
                        <span className="font-mono text-[10px] text-white/40 truncate">
                          {holderHandle}
                        </span>
                      )}
                      <span className="liquid-pill-active px-1.5 py-0.5 rounded text-[8px] font-semibold uppercase tracking-widest">
                        {rank.title}
                      </span>
                      {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                    </div>
                  </div>
                </div>
                {/* Balance count */}
                <div className="liquid-pill-active px-3.5 py-2.5 rounded-2xl text-center shrink-0">
                  <div className="font-mono tabular-nums text-2xl font-bold leading-none">{balance}</div>
                  <div className="font-mono text-[9px] font-semibold uppercase tracking-widest mt-1 opacity-70">
                    {balance === 1 ? 'TICKET' : 'TICKETS'}
                  </div>
                </div>
              </div>

              {/* Progress Meter */}
              <div className="space-y-1.5 pt-2 border-t border-white/[0.06]">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-white/60 font-medium">Progress to Next Escape Ticket</span>
                  <span className="font-mono tabular-nums font-semibold text-[#7DD3FC]">
                    {parachuteMetrics.currentProgressHours} / 35.0h ({parachuteMetrics.progressPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.06] border border-white/[0.08] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#4FACFE] to-[#7DD3FC] transition-all duration-500"
                    style={{ width: `${parachuteMetrics.progressPercentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between font-mono tabular-nums text-[10px] text-white/40">
                  <span>{parachuteMetrics.hoursUntilNextParachute}h left for next +1 Ticket</span>
                  <span>Earned: {parachuteMetrics.lifetimeEarnedParachutes} • Used: {parachuteMetrics.deployedParachutes}</span>
                </div>
              </div>
            </div>

            {/* Footer strip */}
            <div className="px-5 py-3 border-t border-white/[0.06] flex items-center justify-between gap-2 font-mono text-[10px] text-white/40">
              <span className="uppercase tracking-widest font-semibold">
                {balance > 0 ? 'STATUS: READY IN VAULT' : 'STATUS: 0 AVAILABLE'}
              </span>
              <span className="text-[#7DD3FC] font-semibold uppercase tracking-wider">
                {profile ? profile.primaryMission : 'MONOTONIC PROOF'}
              </span>
            </div>
          </div>

          {/* How to Gain More Card */}
          <div className="liquid-card rounded-3xl p-4 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-white">
              How to Gain More Escape Tickets
            </div>

            <div className="liquid-row p-3 rounded-2xl flex items-start gap-2.5">
              <div className="liquid-squircle w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                <Clock size={13} strokeWidth={1.75} className="text-[#7DD3FC]" />
              </div>
              <div className="min-w-0 flex-1 space-y-0.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-white">Every 35 Focus Hours (+1 Ticket)</span>
                  <span className="liquid-pill text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-lg text-white/60 shrink-0">
                    Unlimited
                  </span>
                </div>
                <p className="text-[10px] text-white/40 leading-relaxed">
                  Finish lock sessions completely to fill the 35-hour counter. Active rate:{' '}
                  <span className="text-white/70 font-semibold inline-flex items-center gap-1">
                    <Moon size={10} strokeWidth={1.75} className="text-[#7DD3FC]" />
                    {sleepRateLabel}
                  </span>
                  .
                </p>
              </div>
            </div>

            <div className="liquid-row p-3 rounded-2xl flex items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="liquid-squircle w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                  <Gift size={13} strokeWidth={1.75} className="text-[#7DD3FC]" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white">Starter Profile Gift (+1 Ticket)</div>
                  <div className="text-[10px] text-white/40 mt-0.5">One-time free welcome ticket when you create your profile.</div>
                </div>
              </div>
              {hasClaimedFirstTimeParachute ? (
                <span className="liquid-pill-active px-2 py-1 rounded-lg text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} strokeWidth={1.75} />
                  <span>Claimed</span>
                </span>
              ) : (
                onOpenProfile && (
                  <button
                    type="button"
                    onClick={onOpenProfile}
                    className="liquid-pill-active px-3 py-1.5 rounded-xl text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0"
                  >
                    <span>Claim</span>
                    <ArrowRight size={11} strokeWidth={1.75} />
                  </button>
                )
              )}
            </div>

            <div className="liquid-row p-3 rounded-2xl flex items-center justify-between gap-2.5">
              <div className="flex items-start gap-2.5 min-w-0">
                <div className="liquid-squircle w-7 h-7 flex items-center justify-center shrink-0 mt-0.5">
                  <Heart size={13} strokeWidth={1.75} className="text-red-400/70" />
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-white">
                    1st Tip ₹{FIRST_DONATION_BONUS_INR}+ Gift (+1 Ticket &amp; Gold Crest)
                  </div>
                  <div className="text-[10px] text-white/40 mt-0.5">
                    Voluntary thank-you gift strictly on your first ₹{FIRST_DONATION_BONUS_INR}+ support tip.
                  </div>
                </div>
              </div>
              {hasClaimedFirstDonationParachute ? (
                <span className="liquid-pill-active px-2 py-1 rounded-lg text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0">
                  <CheckCircle2 size={10} strokeWidth={1.75} />
                  <span>Unlocked</span>
                </span>
              ) : (
                onOpenSupport && (
                  <button
                    type="button"
                    onClick={onOpenSupport}
                    className="liquid-pill px-2.5 py-1.5 rounded-xl text-white/60 hover:text-white text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0"
                  >
                    <span>Support</span>
                    <ArrowRight size={10} strokeWidth={1.75} />
                  </button>
                )
              )}
            </div>

            {/* Warning footer */}
            <div className="liquid-row p-3 rounded-2xl flex items-start gap-2 text-[10px] text-white/40 leading-relaxed">
              <ShieldAlert size={13} strokeWidth={1.75} className="text-red-400/60 shrink-0 mt-0.5" />
              <span>
                Using a ticket ends the lock early, costs{' '}
                <strong className="text-white/70">1 Ticket</strong>, and voids that broken
                session&rsquo;s progress toward your next 35h ticket.
              </span>
            </div>
          </div>

          {/* Action bar */}
          <div className="flex gap-2">
            {onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="flex-1 py-2.5 liquid-pill rounded-2xl text-xs font-semibold text-white/60 hover:text-white"
              >
                Ticket Log in Insights
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 liquid-pill-active rounded-2xl text-xs font-semibold uppercase tracking-wider"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBespoke) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-start justify-center px-4 overflow-y-auto"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div className="w-full max-w-md my-auto space-y-4 py-2 font-sans">
          <ObsidianCard
            className="font-sans"
            headerClassName="p-5 space-y-4"
            footerClassName="px-5 py-3 flex items-center justify-between gap-2 font-mono text-[10px] text-neutral-400"
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-400 font-semibold">
                    <Ticket size={14} className="text-blue-500" />
                    <span>ZERO PASS • VAULT</span>
                  </div>
                  <button
                    type="button"
                    onClick={onClose}
                    className="p-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors duration-75"
                    aria-label="Close Escape Ticket View"
                  >
                    <X size={15} />
                  </button>
                </div>

                <div className="flex items-center gap-3.5 pt-1">
                  <div className="w-14 h-14 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-center shrink-0">
                    <Ticket size={24} className="text-blue-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-500">
                      EMERGENCY EXIT VOUCHER
                    </div>
                    <h2 className="text-xl font-bold tracking-tight uppercase text-white leading-tight mt-0.5">
                      ESCAPE TICKET
                    </h2>
                    <p className="text-xs text-neutral-300 mt-1">{balanceSentence}</p>
                  </div>
                </div>

                <div className="p-4 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    {profile ? (
                      <ProfileAvatar
                        avatarId={profile.avatarId}
                        size="sm"
                        interactive
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-sm bg-black border border-neutral-800 flex items-center justify-center shrink-0 font-mono text-sm font-bold text-white">
                        0
                      </div>
                    )}
                    <div className="min-w-0">
                      <div className="font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-400 font-semibold">
                        ISSUED TO
                      </div>
                      <div className="text-sm font-semibold text-white uppercase tracking-wide truncate">
                        {holderName}
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap mt-1">
                        {holderHandle && (
                          <span className="font-mono text-[10px] text-neutral-400 truncate">
                            {holderHandle}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded-sm bg-black border border-neutral-800 text-blue-400 font-mono text-[9px] font-semibold uppercase tracking-wider">
                          {rank.title}
                        </span>
                        {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                      </div>
                    </div>
                  </div>

                  <div className="px-3.5 py-2.5 rounded-md bg-black border border-blue-500/60 text-center shrink-0">
                    <div className="font-mono tabular-nums text-2xl font-bold text-blue-400 leading-none">
                      {balance}
                    </div>
                    <div className="font-mono text-[9px] font-semibold uppercase tracking-widest text-neutral-400 mt-1">
                      {balance === 1 ? 'TICKET' : 'TICKETS'}
                    </div>
                  </div>
                </div>

                <div className="space-y-2 pt-3 border-t border-neutral-800">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-300 font-medium">
                      Progress to Next Escape Ticket
                    </span>
                    <span className="font-mono tabular-nums font-semibold text-blue-400">
                      {parachuteMetrics.currentProgressHours} / 35.0h ({parachuteMetrics.progressPercentage}%)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-none bg-neutral-950 border border-neutral-800 overflow-hidden">
                    <div
                      className="h-full rounded-none bg-blue-600 transition-all duration-75"
                      style={{ width: `${parachuteMetrics.progressPercentage}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between font-mono tabular-nums text-[10px] text-neutral-400">
                    <span>{parachuteMetrics.hoursUntilNextParachute}h left for next +1 Ticket</span>
                    <span>
                      Earned: {parachuteMetrics.lifetimeEarnedParachutes} • Used: {parachuteMetrics.deployedParachutes}
                    </span>
                  </div>
                </div>
              </>
            }
            footerContent={
              <>
                <span className="uppercase tracking-widest text-neutral-400 font-semibold">
                  {balance > 0 ? 'STATUS: READY IN VAULT' : 'STATUS: 0 AVAILABLE'}
                </span>
                <span className="text-blue-400 font-semibold uppercase tracking-wider">
                  {profile ? profile.primaryMission : 'MONOTONIC PROOF'}
                </span>
              </>
            }
          />

          <ObsidianCard
            className="font-sans"
            headerClassName="p-5 space-y-3"
            footerClassName="px-5 py-3 flex items-start gap-2.5 text-xs text-neutral-400 leading-relaxed"
            headerContent={
              <>
                <div className="text-xs font-semibold uppercase tracking-wider text-white">
                  How to Gain More Escape Tickets
                </div>

                <div className="p-3.5 rounded-md bg-neutral-950 border border-neutral-800 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-sm bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                    <Clock size={14} className="text-blue-500" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-white">
                        Every 35 Focus Hours (+1 Ticket)
                      </span>
                      <span className="font-mono text-[9px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-black border border-neutral-800 text-neutral-200 shrink-0">
                        Unlimited
                      </span>
                    </div>
                    <p className="text-xs text-neutral-400 leading-relaxed">
                      Finish lock sessions completely to fill the 35-hour counter. Active rate:{' '}
                      <span className="font-mono text-neutral-200 font-medium inline-flex items-center gap-1">
                        <Moon size={10} className="text-blue-500" />
                        {sleepRateLabel}
                      </span>
                      .
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-sm bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                      <Gift size={14} className="text-blue-500" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">
                        Starter Profile Gift (+1 Ticket)
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        One-time free welcome ticket when you create your profile.
                      </div>
                    </div>
                  </div>
                  {hasClaimedFirstTimeParachute ? (
                    <span className="px-2 py-1 rounded-sm bg-black border border-blue-500/50 text-blue-400 font-mono text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} />
                      <span>Claimed</span>
                    </span>
                  ) : (
                    onOpenProfile && (
                      <button
                        type="button"
                        onClick={onOpenProfile}
                        className="px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans text-[11px] font-semibold uppercase flex items-center gap-1 shrink-0 transition-colors duration-75"
                      >
                        <span>Claim</span>
                        <ArrowRight size={11} />
                      </button>
                    )
                  )}
                </div>

                <div className="p-3.5 rounded-md bg-neutral-950 border border-neutral-800 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-sm bg-black border border-neutral-800 flex items-center justify-center shrink-0">
                      <Heart size={14} className="text-red-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white">
                        1st Tip ₹{FIRST_DONATION_BONUS_INR}+ Gift (+1 Ticket &amp; Gold Crest)
                      </div>
                      <div className="text-xs text-neutral-400 mt-0.5">
                        Voluntary thank-you gift strictly on your first ₹{FIRST_DONATION_BONUS_INR}+ support tip.
                      </div>
                    </div>
                  </div>
                  {hasClaimedFirstDonationParachute ? (
                    <span className="px-2 py-1 rounded-sm bg-black border border-blue-500/50 text-blue-400 font-mono text-[9px] font-semibold uppercase flex items-center gap-1 shrink-0">
                      <CheckCircle2 size={10} />
                      <span>Unlocked</span>
                    </span>
                  ) : (
                    onOpenSupport && (
                      <button
                        type="button"
                        onClick={onOpenSupport}
                        className="px-3 py-1.5 rounded-md bg-black border border-neutral-800 hover:border-neutral-600 text-neutral-100 hover:text-white font-sans text-[11px] font-semibold uppercase flex items-center gap-1 shrink-0 transition-colors duration-75"
                      >
                        <span>Support</span>
                        <ArrowRight size={11} />
                      </button>
                    )
                  )}
                </div>
              </>
            }
            footerContent={
              <>
                <ShieldAlert size={14} className="text-red-400 shrink-0 mt-0.5" />
                <span>
                  Using a ticket ends the lock early, costs{' '}
                  <strong className="font-mono text-white">1 Ticket</strong>, and voids that broken
                  session&rsquo;s progress toward your next 35h ticket.
                </span>
              </>
            }
          />

          <div className="flex gap-2.5">
            {onOpenInsights && (
              <button
                type="button"
                onClick={onOpenInsights}
                className="flex-1 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-xs font-sans font-medium text-white transition-colors duration-75"
              >
                Ticket Log in Insights
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-sans font-semibold uppercase tracking-wider transition-colors duration-75"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

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
                  <Ticket size={13} style={{ color: 'var(--accent-hex, #FFFFFF)' }} />
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
                    style={{ color: 'var(--accent-hex, #FFFFFF)' }}
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
                        className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest obsidian-pill-active"
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

              {/* Next Ticket 35h Milestone Meter on Stub */}
              <div className="space-y-1.5 pt-2 border-t border-dashed border-white/15">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-zinc-300 font-bold">Progress to Next Escape Ticket</span>
                  <span className="font-black" style={{ color: 'var(--accent-hex, #FFFFFF)' }}>
                    {parachuteMetrics.currentProgressHours} / 35.0h ({parachuteMetrics.progressPercentage}%)
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full obsidian-inset-neutral overflow-hidden p-[1px]">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${parachuteMetrics.progressPercentage}%`,
                      background:
                        'var(--accent-badge-gradient, linear-gradient(135deg, #FFFFFF 0%, #D4D4D8 100%))',
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
              <span
                style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                className="font-black uppercase tracking-wider"
              >
                {profile ? profile.primaryMission : 'MONOTONIC PROOF'}
              </span>
            </>
          }
        />

        {/* BELOW TICKET: HOW TO GAIN MORE ESCAPE TICKETS */}
        <ObsidianCard
          className="font-mono"
          headerClassName="p-4 space-y-2.5"
          footerClassName="px-4 py-2.5 flex items-start gap-2 text-[10px] text-zinc-400 leading-relaxed"
          headerContent={
            <>
              <div className="text-xs font-black uppercase tracking-wider text-white">
                How to Gain More Escape Tickets
              </div>

              {/* 1. 35h Milestone */}
              <div className="p-3 rounded-xl obsidian-inset-neutral flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-lg obsidian-icon-box flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={13} style={{ color: 'var(--accent-hex, #FFFFFF)' }} />
                </div>
                <div className="min-w-0 flex-1 space-y-0.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-white">
                      Every 35 Focus Hours (+1 🎫)
                    </span>
                    <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded obsidian-inset text-zinc-200 shrink-0">
                      Unlimited
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Finish lock sessions completely to fill the 35-hour counter. Active rate:{' '}
                    <span className="text-zinc-200 font-semibold inline-flex items-center gap-1">
                      <Moon size={10} style={{ color: 'var(--accent-hex, #FFFFFF)' }} />
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
                    <Gift size={13} style={{ color: 'var(--accent-hex, #FFFFFF)' }} />
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
                  <span
                    className="px-2 py-1 rounded-lg border text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                    style={{
                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.45)',
                      color: 'var(--accent-hex, #FFFFFF)',
                    }}
                  >
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
                  <span
                    className="px-2 py-1 rounded-lg border text-[9px] font-black uppercase flex items-center gap-1 shrink-0"
                    style={{
                      background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                      borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.45)',
                      color: 'var(--accent-hex, #FFFFFF)',
                    }}
                  >
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
              <ShieldAlert size={13} className="text-red-400 shrink-0 mt-0.5" />
              <span>
                Using a ticket ends the lock early, costs <strong className="text-white">1 🎫</strong>, and voids that broken session&rsquo;s progress toward your next 35h ticket.
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
