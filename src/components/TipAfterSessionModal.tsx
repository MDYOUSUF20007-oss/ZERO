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

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <ObsidianCard
        accentOverride={{ hex: '#10B981', rgb: '16, 185, 129' }}
        ambientGlow
        className="w-full max-w-md max-h-full font-mono"
        headerClassName="p-5 flex-1 min-h-0 overflow-y-auto space-y-4"
        footerClassName="p-4 flex flex-col sm:flex-row gap-2"
        headerContent={
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                  <CheckCircle2 size={20} />
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-emerald-400">
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
                className="p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white shrink-0"
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
                accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
                className="font-mono"
                headerClassName="p-3 flex items-center justify-between gap-2"
                headerContent={
                  <>
                    <div className="text-left min-w-0">
                      <div className="text-xs font-black text-white flex items-center gap-1.5">
                        <Share2 size={13} className="text-amber-400 shrink-0" />
                        <span>Flex Session Results &amp; Badges</span>
                      </div>
                      <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                        {completedSession.durationSeconds >= 3600
                          ? '1h+ lock completed — GETTING STARTED badge active!'
                          : 'Generate a shareable PNG Focus Receipt with your badges'}
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-lg bg-amber-400 text-black text-[10px] font-black uppercase shrink-0">
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
              accentOverride={{ hex: '#F59E0B', rgb: '245, 158, 11' }}
              ambientGlow
              className="font-mono"
              headerClassName="p-4 space-y-3"
              footerClassName="px-4 py-2 text-[10px] text-amber-200/90 flex items-center justify-between gap-2 flex-wrap"
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider">
                      <Sparkles size={11} />
                      <span>Best Offer • Best Option</span>
                    </span>
                    <span className="text-[10px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/70 px-2 py-0.5 rounded-md">
                      NO MINIMUM LIMIT (GENERAL UPI)
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-sm text-white">UPI / Instant Pay</div>
                      <div className="text-[11px] font-bold text-amber-200">{UPI_ID}</div>
                    </div>
                    <p className="text-[11px] text-zinc-300 leading-relaxed">
                      Regular UPI tips have <strong>no minimum limit</strong> — tip even ₹1 with zero
                      platform fees.
                    </p>
                  </div>

                  {/* 1st Minimum ₹50 Donation Bonus Callout */}
                  {!hasClaimedFirstDonationParachute ? (
                    <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/50 space-y-2">
                      <div className="flex items-center justify-between gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 text-emerald-300 text-[11px] font-black uppercase tracking-wide">
                          <Gift size={13} className="text-emerald-400 shrink-0" />
                          <span>1st Tip ₹{FIRST_DONATION_BONUS_INR}+ = +1 🎫 &amp; Gold Badge</span>
                        </div>
                        <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-400 text-black shrink-0">
                          Min ₹{FIRST_DONATION_BONUS_INR} (1st Tip Only)
                        </span>
                      </div>
                      <p className="text-[10px] text-zinc-300 leading-relaxed">
                        <strong>Strict Requirement:</strong> The Golden{' '}
                        <strong className="text-amber-300">ZERO-SUPPORTER</strong> Profile Badge &amp;{' '}
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
                            className="flex-1 py-2 px-3 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                          >
                            <span>Tip ₹{FIRST_DONATION_BONUS_INR}+ (+1 🎫 &amp; Gold)</span>
                            <ExternalLink size={12} />
                          </a>
                          <button
                            type="button"
                            onClick={() => setConfirmingDonationClaim(true)}
                            className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-emerald-700/60 text-emerald-200 text-[10px] font-bold"
                          >
                            Sent Min ₹{FIRST_DONATION_BONUS_INR}?
                          </button>
                        </div>
                      ) : (
                        <div className="p-2.5 rounded-xl bg-black/70 border border-emerald-600/60 space-y-2">
                          <div className="text-[10px] text-emerald-200 leading-relaxed">
                            Confirm you completed your <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong>{' '}
                            to unlock the Golden{' '}
                            <strong className="text-amber-300">ZERO-SUPPORTER</strong> Badge &amp;{' '}
                            <strong>+1 Free Emergency Escape Ticket (🎫)</strong>:
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                onClaimFirstDonationBonus();
                                setConfirmingDonationClaim(false);
                              }}
                              className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[10px] uppercase tracking-wider active:scale-95 transition-all"
                            >
                              Confirm ₹{FIRST_DONATION_BONUS_INR}+ &amp; Unlock
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingDonationClaim(false)}
                              className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-white/15 text-zinc-300 hover:text-white text-[10px] font-bold"
                            >
                              Back
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="px-3 py-2 rounded-xl bg-zinc-900/90 border border-amber-500/40 flex items-center justify-between gap-2 flex-wrap text-[10px] text-emerald-300">
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
                      className="flex-1 py-2.5 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                    >
                      <span>Any Amount via UPI</span>
                      <ExternalLink size={13} />
                    </a>
                    <button
                      type="button"
                      onClick={handleCopyUpi}
                      className="px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-zinc-200 hover:text-white text-xs font-bold flex items-center gap-1"
                      title="Copy UPI ID"
                      aria-label="Copy UPI ID"
                    >
                      {copiedUpi ? (
                        <>
                          <Check size={14} className="text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
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
                      className={`p-2.5 rounded-xl border transition-colors ${
                        showQr
                          ? 'bg-white text-black border-white'
                          : 'bg-zinc-900 border-white/15 text-zinc-300 hover:text-white'
                      }`}
                      title="Toggle UPI QR Code"
                      aria-label="Toggle UPI QR Code"
                    >
                      <QrCode size={16} />
                    </button>
                  </div>

                  {showQr && (
                    <div className="p-3 bg-black/80 rounded-xl border border-white/10 flex flex-col items-center justify-center text-center space-y-2">
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
                  <span className="text-amber-300 font-bold uppercase">Instant</span>
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
                      <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
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
              className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 border border-white/10 text-xs font-bold transition-all"
            >
              Maybe Later
            </button>
            <button
              type="button"
              onClick={onBlockFiveSessions}
              className="flex-1 py-2.5 px-3 rounded-xl bg-black/70 hover:bg-zinc-900 text-zinc-300 hover:text-white border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
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
