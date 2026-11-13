import React, { useEffect, useState } from 'react';
import { toDataURL as generateQrDataUrl } from 'qrcode';
import type { SessionRecord } from '../types';
import {
  FIRST_DONATION_BONUS_INR,
  KOFI_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_URL,
  UPI_ID,
  UPI_PAY_URL,
  UPI_FIFTY_RS_PAY_URL,
  copyTextSafely,
  handleOpenExternalUrl,
} from '../utils/supportLinks';
import { TIP_SNOOZE_SESSIONS } from '../utils/tipPromptPolicy';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import {
  Sparkles,
  X,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Coffee,
  EyeOff,
  CheckCircle2,
  Gift,
  Share2,
} from 'lucide-react';

interface TipAfterSessionModalProps {
  completedSession: SessionRecord | null;
  hasClaimedFirstDonationParachute: boolean;
  onClaimFirstDonationBonus: () => boolean;
  onShareResults?: () => void;
  onDismiss: () => void;
  onBlockFiveSessions: () => void;
}

function formatCompletedDuration(totalSeconds: number): string {
  const mins = Math.max(1, Math.round(totalSeconds / 60));
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem > 0 ? `${hrs}h ${rem}m` : `${hrs}h`;
}

export const TipAfterSessionModal: React.FC<TipAfterSessionModalProps> = ({
  completedSession,
  hasClaimedFirstDonationParachute,
  onClaimFirstDonationBonus,
  onShareResults,
  onDismiss,
  onBlockFiveSessions,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const [showQr, setShowQr] = useState(false);
  const [upiQrUrl, setUpiQrUrl] = useState('');
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [confirmingDonationClaim, setConfirmingDonationClaim] = useState(false);

  useEffect(() => {
    setConfirmingDonationClaim(false);
  }, [completedSession]);

  useEffect(() => {
    if (!completedSession || !showQr || upiQrUrl) return;
    let cancelled = false;
    generateQrDataUrl(UPI_PAY_URL, {
      width: 240,
      margin: 2,
      color: { dark: '#000000', light: '#FFFFFF' },
    })
      .then((url) => {
        if (!cancelled) setUpiQrUrl(url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [completedSession, showQr, upiQrUrl]);

  if (!completedSession) return null;

  const durationText = formatCompletedDuration(completedSession.durationSeconds);

  const handleCopyUpi = async () => {
    await copyTextSafely(UPI_ID);
    setCopiedUpi(true);
    setTimeout(() => setCopiedUpi(false), 2000);
  };

  if (isFluentGlass) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center px-4"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
      >
        <div className="liquid-card w-full max-w-md max-h-full flex flex-col rounded-3xl overflow-hidden">
          {/* Header */}
          <div className="p-5 flex items-start justify-between gap-2.5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="liquid-squircle w-10 h-10 flex items-center justify-center text-[#7DD3FC]">
                <CheckCircle2 size={20} strokeWidth={1.75} />
              </div>
              <div>
                <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-[#7DD3FC]">
                  Session Complete • Focus Reclaimed
                </div>
                <h2 className="liquid-metric text-sm mt-0.5">
                  <span className="tabular-nums">+{durationText}</span> Phone-Free{' '}
                  <span className="text-white/50 font-mono">#{completedSession.tag}</span>
                </h2>
              </div>
            </div>
            <button
              type="button"
              onClick={onDismiss}
              className="liquid-pill p-2 text-white/40 hover:text-white transition-colors shrink-0"
              aria-label="Close Tip Popup"
            >
              <X size={16} strokeWidth={1.75} />
            </button>
          </div>

          {/* Scrollable body */}
          <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
            {onShareResults && (
              <button
                type="button"
                onClick={onShareResults}
                className="liquid-row w-full p-3.5 rounded-2xl flex items-center justify-between gap-2.5 text-left"
              >
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Share2 size={14} strokeWidth={1.75} className="text-[#7DD3FC] shrink-0" />
                    <span>Flex Session Results &amp; Badges</span>
                  </div>
                  <div className="text-[11px] text-white/40 mt-0.5">
                    {completedSession.durationSeconds >= 3600
                      ? '1h+ lock completed — GETTING STARTED badge active!'
                      : 'Generate a shareable PNG Focus Receipt with your badges'}
                  </div>
                </div>
                <span className="liquid-pill-active px-2.5 py-1 rounded-lg text-[10px] font-semibold uppercase shrink-0">
                  Flex
                </span>
              </button>
            )}

            <p className="text-xs text-white/60 leading-relaxed">
              Zero is 100% free &amp; open-source with zero ads or paywalls. If staying
              distraction-free helped you today, you can leave a small optional tip to support
              development.
            </p>

            {/* UPI Card */}
            <div className="liquid-inset rounded-2xl p-4 space-y-3.5">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="liquid-pill-active inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold uppercase tracking-wider">
                  <Sparkles size={11} strokeWidth={1.75} />
                  <span>Best Offer • Best Option</span>
                </span>
                <span className="text-[10px] font-semibold text-[#7DD3FC] border border-[#7DD3FC]/30 px-2 py-0.5 rounded-lg bg-[#7DD3FC]/[0.08]">
                  NO MINIMUM LIMIT (GENERAL UPI)
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="font-semibold text-sm text-white">UPI / Instant Pay</div>
                  <div className="font-mono text-xs font-semibold text-[#7DD3FC]">{UPI_ID}</div>
                </div>
                <p className="text-xs text-white/60 leading-relaxed">
                  Regular UPI tips have <strong className="text-white">no minimum limit</strong> — tip
                  even ₹1 with zero platform fees.
                </p>
              </div>

              {!hasClaimedFirstDonationParachute ? (
                <div className="liquid-row p-3.5 rounded-xl space-y-3">
                  <div className="flex items-center justify-between gap-1.5 flex-wrap">
                    <div className="flex items-center gap-1.5 text-[#7DD3FC] text-xs font-semibold uppercase tracking-wide">
                      <Gift size={14} strokeWidth={1.75} className="shrink-0" />
                      <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 Ticket &amp; Gold</span>
                    </div>
                    <span className="liquid-pill-active text-[9px] font-semibold uppercase px-1.5 py-0.5 rounded-lg shrink-0">
                      Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                    </span>
                  </div>
                  <p className="text-[11px] text-white/60 leading-relaxed">
                    <strong className="text-white">Strict Requirement:</strong> The{' '}
                    <strong className="font-mono text-[#7DD3FC]">ZERO-SUPPORTER</strong> Badge &amp;{' '}
                    <strong className="text-white">+1 Free Emergency Escape Ticket</strong>{' '}
                    <strong className="text-white">
                      ONLY unlock after your 1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}
                    </strong>{' '}
                    (tips under ₹{FIRST_DONATION_BONUS_INR} do not unlock this badge).
                  </p>
                  {!confirmingDonationClaim ? (
                    <div className="flex flex-col sm:flex-row gap-2">
                      <a
                        href={UPI_FIFTY_RS_PAY_URL}
                        onClick={(e) => {
                          handleOpenExternalUrl(e, UPI_FIFTY_RS_PAY_URL);
                          setConfirmingDonationClaim(true);
                        }}
                        className="flex-1 py-2.5 px-3 liquid-pill-active rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                      >
                        <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 Ticket &amp; Gold)</span>
                        <ExternalLink size={12} strokeWidth={1.75} />
                      </a>
                      <button
                        type="button"
                        onClick={() => setConfirmingDonationClaim(true)}
                        className="liquid-pill px-3 py-2.5 rounded-xl text-white/70 hover:text-white text-xs font-medium"
                      >
                        Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                      </button>
                    </div>
                  ) : (
                    <div className="liquid-inset p-3 rounded-xl space-y-2.5">
                      <div className="text-xs text-white/70 leading-relaxed">
                        Confirm you completed your{' '}
                        <strong className="text-white">
                          1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}
                        </strong>{' '}
                        to unlock the{' '}
                        <strong className="font-mono text-[#7DD3FC]">ZERO-SUPPORTER</strong>{' '}
                        Badge &amp;{' '}
                        <strong className="text-white">+1 Free Emergency Escape Ticket</strong>:
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            onClaimFirstDonationBonus();
                            setConfirmingDonationClaim(false);
                          }}
                          className="flex-1 py-2 px-3 liquid-pill-active rounded-xl font-semibold text-xs uppercase tracking-wider"
                        >
                          Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDonationClaim(false)}
                          className="liquid-pill px-3 py-2 rounded-xl text-white/60 hover:text-white text-xs font-medium"
                        >
                          Back
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="liquid-row px-3.5 py-2.5 rounded-xl flex items-center justify-between gap-2 flex-wrap text-xs text-[#7DD3FC]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <CheckCircle2 size={13} strokeWidth={1.75} />
                    <span>Min ₹{FIRST_DONATION_BONUS_INR} 1st Tip Bonus Claimed</span>
                  </span>
                  <ZeroSupporterGoldenBadge compact />
                </div>
              )}

              <div className="flex items-center gap-2">
                <a
                  href={UPI_PAY_URL}
                  onClick={(e) => handleOpenExternalUrl(e, UPI_PAY_URL)}
                  className="flex-1 py-2.5 px-3 liquid-pill-active rounded-xl font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <span>Any Amount via UPI</span>
                  <ExternalLink size={13} strokeWidth={1.75} />
                </a>
                <button
                  type="button"
                  onClick={handleCopyUpi}
                  className="liquid-pill px-3 py-2.5 rounded-xl text-white/60 hover:text-white text-xs font-medium flex items-center gap-1"
                  title="Copy UPI ID"
                  aria-label="Copy UPI ID"
                >
                  {copiedUpi ? (
                    <>
                      <Check size={14} strokeWidth={1.75} className="text-[#7DD3FC]" />
                      <span className="text-[#7DD3FC]">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} strokeWidth={1.75} />
                      <span>Copy</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowQr((prev) => !prev)}
                  className={`p-2.5 rounded-xl transition-colors ${
                    showQr ? 'liquid-pill-active' : 'liquid-pill text-white/50 hover:text-white'
                  }`}
                  title="Toggle UPI QR Code"
                  aria-label="Toggle UPI QR Code"
                >
                  <QrCode size={16} strokeWidth={1.75} />
                </button>
              </div>

              {showQr && (
                <div className="liquid-inset p-4 rounded-xl flex flex-col items-center justify-center text-center space-y-2.5">
                  {upiQrUrl ? (
                    <div data-qr-surface="true" className="bg-white p-2 rounded-xl">
                      <img
                        src={upiQrUrl}
                        alt={`UPI QR code for ${UPI_ID}`}
                        className="w-36 h-36 block"
                      />
                    </div>
                  ) : (
                    <div className="w-36 h-36 bg-black/40 rounded-xl flex items-center justify-center font-mono text-[10px] text-white/40">
                      Generating QR...
                    </div>
                  )}
                  <div className="font-mono text-[10px] text-white/40">
                    Scan via Google Pay, PhonePe, Paytm, or BHIM • {UPI_ID}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-[10px] text-white/40 pt-1 border-t border-white/[0.05]">
                <span>Zero fees • 100% reaches the developer</span>
                <span className="text-[#7DD3FC] font-semibold uppercase">Instant</span>
              </div>
            </div>

            {/* Ko-fi row */}
            <div className="liquid-row rounded-2xl p-0 overflow-hidden">
              <a
                href={KOFI_URL}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => handleOpenExternalUrl(e, KOFI_URL)}
                className="w-full p-4 flex items-center justify-between group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="liquid-squircle w-8 h-8 flex items-center justify-center text-[#7DD3FC] shrink-0">
                    <Coffee size={16} strokeWidth={1.75} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-xs text-white">Buy Me a Coffee (Ko-fi)</div>
                    <div className="font-mono text-[10px] text-white/40 truncate mt-0.5">
                      Card / International • ko-fi.com/mdyousuf2620
                    </div>
                  </div>
                </div>
                <ExternalLink size={14} strokeWidth={1.75} className="text-white/30 group-hover:text-white shrink-0 ml-2 transition-colors" />
              </a>
            </div>

            <div className="liquid-row p-3.5 rounded-2xl text-xs text-white/50 leading-relaxed">
              Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet? Send a
              screenshot of your receipt and your account email to{' '}
              <a
                href={SUPPORT_MAILTO_URL}
                onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                className="font-mono font-semibold text-[#7DD3FC] underline decoration-[#7DD3FC]/40"
              >
                {SUPPORT_EMAIL}
              </a>{' '}
              for manual activation.
            </div>
          </div>

          {/* Footer */}
          <div className="p-4 flex gap-2.5 border-t border-white/[0.06]">
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 py-2.5 px-3 liquid-pill rounded-2xl text-white/60 hover:text-white text-xs font-medium transition-colors"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={onBlockFiveSessions}
              className="flex-1 py-2.5 px-3 liquid-pill rounded-2xl text-white/60 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
            >
              <EyeOff size={13} strokeWidth={1.75} />
              <span>Block for {TIP_SNOOZE_SESSIONS} Sessions</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isBespoke) {
    return (
      <div
        className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4"
        style={{
          paddingTop: 'calc(1rem + var(--zero-safe-top))',
          paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
        }}
      >
        <ObsidianCard
          className="w-full max-w-md max-h-full font-sans"
          headerClassName="p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
          footerClassName="p-5 flex flex-col sm:flex-row gap-2.5"
          headerContent={
            <>
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-md bg-neutral-950 border border-blue-500/50 flex items-center justify-center text-blue-400 shrink-0">
                    <CheckCircle2 size={20} />
                  </div>
                  <div>
                    <div className="font-mono text-[10px] font-semibold uppercase tracking-widest text-blue-400">
                      Session Complete • Focus Reclaimed
                    </div>
                    <h2 className="text-sm font-semibold text-white mt-0.5">
                      <span className="font-mono tabular-nums">+{durationText}</span> Phone-Free{' '}
                      <span className="font-mono text-neutral-400">(#{completedSession.tag})</span>
                    </h2>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onDismiss}
                  className="p-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors duration-75 shrink-0"
                  aria-label="Close Tip Popup"
                >
                  <X size={16} />
                </button>
              </div>

              {onShareResults && (
                <ObsidianCard
                  asButton
                  onClick={onShareResults}
                  className="font-sans"
                  headerClassName="p-4 flex items-center justify-between gap-2.5"
                  headerContent={
                    <>
                      <div className="text-left min-w-0">
                        <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Share2 size={14} className="text-blue-500 shrink-0" />
                          <span>Flex Session Results &amp; Badges</span>
                        </div>
                        <div className="text-xs text-neutral-400 truncate mt-0.5">
                          {completedSession.durationSeconds >= 3600
                            ? '1h+ lock completed — GETTING STARTED badge active!'
                            : 'Generate a shareable PNG Focus Receipt with your badges'}
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-sm bg-blue-600 text-white font-mono text-[10px] font-semibold uppercase shrink-0">
                        Flex
                      </span>
                    </>
                  }
                />
              )}

              <p className="text-xs text-neutral-300 leading-relaxed">
                Zero is 100% free &amp; open-source with zero ads or paywalls. If staying
                distraction-free helped you today, you can leave a small optional tip to support
                development.
              </p>

              <ObsidianCard
                className="font-sans"
                headerClassName="p-5 space-y-3.5"
                footerClassName="px-5 py-3 font-mono text-[10px] text-neutral-400 flex items-center justify-between gap-2 flex-wrap"
                headerContent={
                  <>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-sm bg-neutral-950 border border-blue-500/60 text-blue-400 font-mono text-[10px] font-semibold uppercase tracking-wider">
                        <Sparkles size={11} />
                        <span>Best Offer • Best Option</span>
                      </span>
                      <span className="font-mono text-[10px] font-semibold text-blue-400 bg-neutral-950 border border-blue-500/40 px-2 py-0.5 rounded-sm">
                        NO MINIMUM LIMIT (GENERAL UPI)
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm text-white">UPI / Instant Pay</div>
                        <div className="font-mono text-xs font-semibold text-blue-400">{UPI_ID}</div>
                      </div>
                      <p className="text-xs text-neutral-300 leading-relaxed">
                        Regular UPI tips have <strong className="text-white">no minimum limit</strong> — tip
                        even ₹1 with zero platform fees.
                      </p>
                    </div>

                    {!hasClaimedFirstDonationParachute ? (
                      <div className="p-4 rounded-md bg-neutral-950 border border-neutral-800 space-y-3">
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                          <div className="flex items-center gap-1.5 text-blue-400 text-xs font-semibold uppercase tracking-wide">
                            <Gift size={14} className="shrink-0" />
                            <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 Ticket &amp; Gold Crest</span>
                          </div>
                          <span className="font-mono text-[9px] font-semibold uppercase px-2 py-0.5 rounded-sm bg-black border border-blue-500/60 text-blue-400 shrink-0">
                            Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                          </span>
                        </div>
                        <p className="text-xs text-neutral-300 leading-relaxed">
                          <strong className="text-white">Strict Requirement:</strong> The{' '}
                          <strong className="font-mono text-blue-400">ZERO-SUPPORTER</strong> Profile
                          Badge &amp;{' '}
                          <strong className="text-white">+1 Free Emergency Escape Ticket</strong>{' '}
                          <strong className="text-white">
                            ONLY unlock after your 1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}
                          </strong>{' '}
                          (tips under ₹{FIRST_DONATION_BONUS_INR} do not unlock this badge).
                        </p>

                        {!confirmingDonationClaim ? (
                          <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                            <a
                              href={UPI_FIFTY_RS_PAY_URL}
                              onClick={(e) => {
                                handleOpenExternalUrl(e, UPI_FIFTY_RS_PAY_URL);
                                setConfirmingDonationClaim(true);
                              }}
                              className="flex-1 py-2.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-75"
                            >
                              <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 Ticket &amp; Gold)</span>
                              <ExternalLink size={12} />
                            </a>
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(true)}
                              className="px-3 py-2.5 rounded-md bg-black border border-neutral-800 hover:border-neutral-600 text-neutral-200 hover:text-white text-xs font-medium transition-colors duration-75"
                            >
                              Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                            </button>
                          </div>
                        ) : (
                          <div className="p-3 rounded-md bg-black border border-neutral-700 space-y-2.5">
                            <div className="text-xs text-neutral-200 leading-relaxed">
                              Confirm you completed your{' '}
                              <strong className="text-white">
                                1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}
                              </strong>{' '}
                              to unlock the{' '}
                              <strong className="font-mono text-blue-400">ZERO-SUPPORTER</strong>{' '}
                              Badge &amp;{' '}
                              <strong className="text-white">+1 Free Emergency Escape Ticket</strong>:
                            </div>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onClaimFirstDonationBonus();
                                  setConfirmingDonationClaim(false);
                                }}
                                className="flex-1 py-2 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider transition-colors duration-75"
                              >
                                Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmingDonationClaim(false)}
                                className="px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 text-xs font-medium transition-colors duration-75"
                              >
                                Back
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="px-3.5 py-2.5 rounded-md bg-neutral-950 border border-blue-500/40 flex items-center justify-between gap-2 flex-wrap text-xs text-blue-400">
                        <span className="flex items-center gap-1.5 font-medium">
                          <CheckCircle2 size={13} />
                          <span>Min ₹{FIRST_DONATION_BONUS_INR} 1st Tip Bonus Claimed</span>
                        </span>
                        <ZeroSupporterGoldenBadge compact />
                      </div>
                    )}

                    <div className="flex items-center gap-2">
                      <a
                        href={UPI_PAY_URL}
                        onClick={(e) => handleOpenExternalUrl(e, UPI_PAY_URL)}
                        className="flex-1 py-2.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors duration-75"
                      >
                        <span>Any Amount via UPI</span>
                        <ExternalLink size={13} />
                      </a>
                      <button
                        type="button"
                        onClick={handleCopyUpi}
                        className="px-3 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-neutral-200 hover:text-white text-xs font-medium flex items-center gap-1 transition-colors duration-75"
                        title="Copy UPI ID"
                        aria-label="Copy UPI ID"
                      >
                        {copiedUpi ? (
                          <>
                            <Check size={14} className="text-blue-400" />
                            <span className="text-blue-400">Copied</span>
                          </>
                        ) : (
                          <>
                            <Copy size={14} />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowQr((prev) => !prev)}
                        className={`p-2.5 rounded-md border transition-colors duration-75 ${
                          showQr
                            ? 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-neutral-950 border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600'
                        }`}
                        title="Toggle UPI QR Code"
                        aria-label="Toggle UPI QR Code"
                      >
                        <QrCode size={16} />
                      </button>
                    </div>

                    {showQr && (
                      <div className="p-4 bg-neutral-950 border border-neutral-800 rounded-md flex flex-col items-center justify-center text-center space-y-2.5">
                        {upiQrUrl ? (
                          <div
                            data-qr-surface="true"
                            className="bg-white p-2 rounded-sm border border-neutral-800"
                          >
                            <img
                              src={upiQrUrl}
                              alt={`UPI QR code for ${UPI_ID}`}
                              className="w-36 h-36 block"
                            />
                          </div>
                        ) : (
                          <div className="w-36 h-36 bg-black border border-neutral-800 rounded-sm flex items-center justify-center font-mono text-[10px] text-neutral-400">
                            Generating QR...
                          </div>
                        )}
                        <div className="font-mono text-[10px] text-neutral-400">
                          Scan via Google Pay, PhonePe, Paytm, or BHIM • {UPI_ID}
                        </div>
                      </div>
                    )}
                  </>
                }
                footerContent={
                  <>
                    <span>Zero fees • 100% reaches the developer</span>
                    <span className="text-blue-400 font-semibold uppercase">Instant</span>
                  </>
                }
              />

              <div className="space-y-3">
                <ObsidianCard
                  className="font-sans"
                  headerClassName="p-0"
                  headerContent={
                    <a
                      href={KOFI_URL}
                      target="_blank"
                      rel="noreferrer"
                      onClick={(e) => handleOpenExternalUrl(e, KOFI_URL)}
                      className="w-full p-4 flex items-center justify-between transition-colors duration-75 group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-sm bg-neutral-950 border border-neutral-800 flex items-center justify-center text-blue-500 shrink-0">
                          <Coffee size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-white">
                            Buy Me a Coffee (Ko-fi)
                          </div>
                          <div className="font-mono text-[10px] text-neutral-400 truncate mt-0.5">
                            Card / International • ko-fi.com/mdyousuf2620
                          </div>
                        </div>
                      </div>
                      <ExternalLink
                        size={14}
                        className="text-neutral-400 group-hover:text-white shrink-0 ml-2 transition-colors duration-75"
                      />
                    </a>
                  }
                />

                <ObsidianCard
                  data-amoled-banner="true"
                  className="font-sans"
                  headerClassName="p-4 text-xs leading-relaxed"
                  headerContent={
                    <p className="text-neutral-300">
                      Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet?
                      Send a screenshot of your receipt and your account email to{' '}
                      <a
                        href={SUPPORT_MAILTO_URL}
                        onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                        className="font-mono font-semibold text-blue-400 underline decoration-blue-500/60"
                      >
                        {SUPPORT_EMAIL}
                      </a>{' '}
                      for manual activation.
                    </p>
                  }
                />
              </div>
            </>
          }
          footerContent={
            <>
              <button
                type="button"
                onClick={onDismiss}
                className="flex-1 py-2.5 px-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-neutral-200 hover:text-white text-xs font-medium transition-colors duration-75"
              >
                Maybe Later
              </button>
              <button
                type="button"
                onClick={onBlockFiveSessions}
                className="flex-1 py-2.5 px-3 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-600 text-neutral-300 hover:text-white text-xs font-medium flex items-center justify-center gap-1.5 transition-colors duration-75"
              >
                <EyeOff size={13} />
                <span>Block for {TIP_SNOOZE_SESSIONS} Sessions</span>
              </button>
            </>
          }
        />
      </div>
    );
  }

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
        footerClassName="p-4 flex flex-col sm:flex-row gap-2"
        headerContent={
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-10 h-10 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                  style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                >
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div
                    className="text-[10px] font-bold uppercase tracking-widest"
                    style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                  >
                    Session Complete • Focus Reclaimed
                  </div>
                  <h2 className="text-sm font-black text-white mt-0.5">
                    +{durationText} Phone-Free (#{completedSession.tag})
                  </h2>
                </div>
              </div>
              <button
                type="button"
                onClick={onDismiss}
                className="p-1.5 rounded-xl obsidian-inset-neutral text-zinc-400 hover:text-white shrink-0"
                aria-label="Close Tip Popup"
              >
                <X size={16} />
              </button>
            </div>

            {/* Flex Completed Session & Badges Banner */}
            {onShareResults && (
              <ObsidianCard
                asButton
                onClick={onShareResults}
                className="font-mono"
                headerClassName="p-3 flex items-center justify-between gap-2"
                headerContent={
                  <>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <Share2
                          size={13}
                          className="shrink-0"
                          style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                        />
                        <span>Flex Session Results &amp; Badges</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {completedSession.durationSeconds >= 3600
                          ? '1h+ lock completed — GETTING STARTED badge active!'
                          : 'Generate a shareable PNG Focus Receipt with your badges'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg obsidian-pill-active text-[10px] font-black uppercase shrink-0">
                      Flex
                    </span>
                  </>
                }
              />
            )}

            {/* Grateful FOSS Note */}
            <p className="text-xs text-zinc-300 leading-relaxed">
              Zero is 100% free &amp; open-source with zero ads or paywalls. If staying distraction-free
              helped you today, you can leave a small optional tip to support development.
            </p>

            {/* BEST OFFER: UPI (Zero Minimum Limit) + Strict Min ₹50 First Tip Bonus */}
            <ObsidianCard
              ambientGlow
              className="font-mono"
              headerClassName="p-4 space-y-3"
              footerClassName="px-4 py-2 text-[10px] text-zinc-300 flex items-center justify-between gap-2 flex-wrap"
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md obsidian-pill-active text-[10px] font-black uppercase tracking-wider">
                      <Sparkles size={11} />
                      <span>Best Offer • Best Option</span>
                    </span>
                    <span
                      className="text-[10px] font-bold border px-2 py-0.5 rounded-md"
                      style={{
                        background: 'rgba(var(--accent-rgb, 255, 255, 255), 0.12)',
                        borderColor: 'rgba(var(--accent-rgb, 255, 255, 255), 0.36)',
                        color: 'var(--accent-hex, #FFFFFF)',
                      }}
                    >
                      NO MINIMUM LIMIT (GENERAL UPI)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm text-white">UPI / Instant Pay</div>
                      <div
                        className="text-[11px] font-bold"
                        style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                      >
                        {UPI_ID}
                      </div>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Regular UPI tips have <strong>no minimum limit</strong> — tip even ₹1 with zero
                      platform fees.
                    </p>
                  </div>

                  {/* 1st Minimum ₹50 Donation Bonus Callout */}
                  {!hasClaimedFirstDonationParachute ? (
                    <div className="p-3 rounded-xl obsidian-inset space-y-2">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div
                          className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wide"
                          style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                        >
                          <Gift size={13} className="shrink-0" />
                          <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 🎫 &amp; Gold Badge</span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded obsidian-pill-active shrink-0">
                          Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed">
                        <strong>Strict Requirement:</strong> The Golden{' '}
                        <strong style={{ color: 'var(--accent-hex, #FFFFFF)' }}>ZERO-SUPPORTER</strong> Profile Badge &amp;{' '}
                        <strong>+1 Free Emergency Escape Ticket (🎫)</strong>{' '}
                        <strong>ONLY unlock after your 1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                        (tips under ₹{FIRST_DONATION_BONUS_INR} do not unlock this badge).
                      </p>

                      {!confirmingDonationClaim ? (
                        <div className="flex flex-col sm:flex-row gap-2 pt-0.5">
                          <a
                            href={UPI_FIFTY_RS_PAY_URL}
                            onClick={(e) => {
                              handleOpenExternalUrl(e, UPI_FIFTY_RS_PAY_URL);
                              setConfirmingDonationClaim(true);
                            }}
                            className="flex-1 py-2 px-3 rounded-xl obsidian-pill-active font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 🎫 &amp; Gold)</span>
                            <ExternalLink size={12} />
                          </a>
                          <button
                            type="button"
                            onClick={() => setConfirmingDonationClaim(true)}
                            className="px-3 py-2 rounded-xl obsidian-inset-neutral text-zinc-200 hover:text-white text-[10px] font-bold"
                          >
                            Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl obsidian-inset space-y-2">
                          <div className="text-[10px] text-zinc-200 leading-relaxed">
                            Confirm you completed your <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                            to unlock the Golden{' '}
                            <strong style={{ color: 'var(--accent-hex, #FFFFFF)' }}>ZERO-SUPPORTER</strong> Badge &amp;{' '}
                            <strong>+1 Free Emergency Escape Ticket (🎫)</strong>:
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onClaimFirstDonationBonus();
                                setConfirmingDonationClaim(false);
                              }}
                              className="flex-1 py-2 px-2.5 rounded-lg obsidian-pill-active font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                            >
                              Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(false)}
                              className="px-2.5 py-2 rounded-lg obsidian-inset-neutral text-zinc-300 hover:text-white text-[10px] font-bold"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div
                      className="px-3 py-2 rounded-xl obsidian-inset flex items-center justify-between gap-2 flex-wrap text-[10px]"
                      style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                    >
                      <span className="flex items-center gap-1.5 font-bold">
                        <CheckCircle2 size={12} />
                        <span>Min ₹{FIRST_DONATION_BONUS_INR} 1st Tip Bonus Claimed</span>
                      </span>
                      <ZeroSupporterGoldenBadge compact />
                    </div>
                  )}

                  <div className="flex items-center gap-2">
                    <a
                      href={UPI_PAY_URL}
                      onClick={(e) => handleOpenExternalUrl(e, UPI_PAY_URL)}
                      className="flex-1 py-2.5 px-3 rounded-xl obsidian-pill-active font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <span>Any Amount via UPI</span>
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3 py-2.5 rounded-xl obsidian-inset-neutral text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1"
                      title="Copy UPI ID"
                      aria-label="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check size={14} style={{ color: 'var(--accent-hex, #FFFFFF)' }} />
                          <span style={{ color: 'var(--accent-hex, #FFFFFF)' }}>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={14} />
                          <span>Copy</span>
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowQr((prev) => !prev)}
                      className={`p-2.5 rounded-xl transition-colors ${
                        showQr
                          ? 'obsidian-pill-active font-bold'
                          : 'obsidian-inset-neutral text-zinc-300 hover:text-white'
                      }`}
                      title="Toggle UPI QR Code"
                      aria-label="Toggle UPI QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>

                  {showQr && (
                    <div className="p-3 obsidian-inset-neutral rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                      {upiQrUrl ? (
                        <div data-qr-surface="true" className="bg-white p-2 rounded-xl shadow-md">
                          <img
                            src={upiQrUrl}
                            alt={`UPI QR code for ${UPI_ID}`}
                            className="w-36 h-36 block"
                          />
                        </div>
                      ) : (
                        <div className="w-36 h-36 bg-zinc-900 rounded-xl flex items-center justify-center text-[10px] text-zinc-400">
                          Generating QR...
                        </div>
                      )}
                      <div className="text-[10px] text-zinc-400">
                        Scan via Google Pay, PhonePe, Paytm, or BHIM • {UPI_ID}
                      </div>
                    </div>
                  )}
                </>
              }
              footerContent={
                <>
                  <span>Zero fees • 100% reaches the developer</span>
                  <span
                    className="font-bold uppercase"
                    style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                  >
                    Instant
                  </span>
                </>
              }
            />

            {/* Secondary Option: Ko-fi */}
            <div className="space-y-2.5">
              <ObsidianCard
                className="font-mono"
                headerClassName="p-0"
                headerContent={
                  <a
                    href={KOFI_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleOpenExternalUrl(e, KOFI_URL)}
                    className="w-full p-3 flex items-center justify-between transition-all group active:scale-[0.98]"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-8 h-8 rounded-xl obsidian-icon-box flex items-center justify-center shrink-0"
                        style={{ color: 'var(--accent-hex, #FFFFFF)' }}
                      >
                        <Coffee size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white">Buy Me a Coffee (Ko-fi)</div>
                        <div className="text-[10px] text-zinc-400 truncate">
                          Card / International • ko-fi.com/mdyousuf2620
                        </div>
                      </div>
                    </div>
                    <ExternalLink size={13} className="text-zinc-400 group-hover:text-white shrink-0 ml-2" />
                  </a>
                }
              />

              <ObsidianCard
                data-amoled-banner="true"
                accentOverride={{ hex: '#8B5CF6', rgb: '139, 92, 246' }}
                className="font-mono"
                headerClassName="p-3 text-[10px] leading-relaxed"
                headerContent={
                  <p className="amoled-banner-sub" style={{ color: '#E9D5FF' }}>
                    Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet? Send a
                    screenshot of your receipt and your account email to{' '}
                    <a
                      href={SUPPORT_MAILTO_URL}
                      onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                      className="amoled-banner-email font-black underline decoration-[#8B5CF6]"
                      style={{ color: '#C4B5FD' }}
                    >
                      <strong>{SUPPORT_EMAIL}</strong>
                    </a>{' '}
                    for manual activation.
                  </p>
                }
              />
            </div>
          </>
        }
        footerContent={
          <>
            <button
              type="button"
              onClick={onDismiss}
              className="flex-1 py-2.5 px-3 rounded-xl obsidian-inset-neutral text-zinc-200 hover:text-white text-xs font-bold transition-all"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={onBlockFiveSessions}
              className="flex-1 py-2.5 px-3 rounded-xl obsidian-inset-neutral text-zinc-300 hover:text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <EyeOff size={13} />
              <span>Block for {TIP_SNOOZE_SESSIONS} Sessions</span>
            </button>
          </>
        }
      />
    </div>
  );
};
