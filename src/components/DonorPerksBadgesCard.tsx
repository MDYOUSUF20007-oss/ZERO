import React, { useState } from 'react';
import type { NativeEnvironmentSecurity } from '../types';
import {
  FIRST_DONATION_BONUS_INR,
  KOFI_URL,
  SUPPORT_EMAIL,
  SUPPORT_MAILTO_URL,
  UPI_FIFTY_RS_PAY_URL,
  copyTextSafely,
  handleOpenExternalUrl,
} from '../utils/supportLinks';
import { verifyDonorUnlockToken } from '../utils/donorUnlockToken';
import { ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { ObsidianCard } from './ObsidianCard';
import {
  Award,
  Check,
  CheckCircle2,
  Coffee,
  Copy,
  ExternalLink,
  Gift,
  KeyRound,
  Mail,
  ShieldCheck,
} from 'lucide-react';

interface DonorPerksBadgesCardProps {
  isZeroSupporter: boolean;
  hasClaimedFirstDonationParachute: boolean;
  remainingEscapeTickets: number;
  cloudAutoBackupEnabled?: boolean;
  environmentSecurity?: NativeEnvironmentSecurity;
  onClaimFirstDonationBonus?: () => boolean;
  onImportData?: (rawInput: string) => { ok: boolean; message: string };
  onRestoreSuccess?: () => void;
}

export const DonorPerksBadgesCard: React.FC<DonorPerksBadgesCardProps> = ({
  isZeroSupporter,
  hasClaimedFirstDonationParachute,
  remainingEscapeTickets,
  cloudAutoBackupEnabled = false,
  environmentSecurity,
  onClaimFirstDonationBonus,
  onImportData,
  onRestoreSuccess,
}) => {
  const [tokenInput, setTokenInput] = useState('');
  const [tokenNotice, setTokenNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmingManualTip, setConfirmingManualTip] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const badgeUnlocked = Boolean(isZeroSupporter || hasClaimedFirstDonationParachute);
  const restoreDisabled = Boolean(environmentSecurity?.restrictions?.backupRestoreDisabled);

  const handleCopySupportEmail = async () => {
    await copyTextSafely(SUPPORT_EMAIL);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleVerifyUnlockToken = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = tokenInput.trim();
    if (!trimmed) {
      setTokenNotice({
        ok: false,
        message: 'Paste your signed unlock token (ZDON1...) or a signed ZBAK1 cloud backup string.',
      });
      return;
    }

    if (trimmed.startsWith('ZBAK1.')) {
      if (restoreDisabled) {
        setTokenNotice({
          ok: false,
          message:
            'Cloud .zbak restore is disabled on rooted devices, test-keys ROMs, or debug emulators. Signed ZDON1 donor tokens can still be activated.',
        });
        return;
      }
      if (onImportData) {
        const importRes = onImportData(trimmed);
        setTokenNotice(importRes);
        if (importRes.ok) {
          setTokenInput('');
          onRestoreSuccess?.();
        }
        return;
      }
    }

    const verified = verifyDonorUnlockToken(trimmed);
    if (!verified.ok) {
      setTokenNotice({ ok: false, message: verified.error });
      return;
    }

    if (badgeUnlocked) {
      setTokenInput('');
      setTokenNotice({
        ok: true,
        message: `Token verified for ${verified.payload.email}. Your ZERO-SUPPORTER Gold Badge & Escape Ticket gift are already active!`,
      });
      return;
    }

    const granted = onClaimFirstDonationBonus?.() ?? false;
    setTokenInput('');
    setTokenNotice({
      ok: true,
      message: granted
        ? `Verified ${verified.payload.email}! Unlocked ZERO-SUPPORTER Golden Badge & +1 Free Emergency Escape Ticket.`
        : `Donor token verified for ${verified.payload.email}. ZERO-SUPPORTER Golden Badge is active.`,
    });
  };

  return (
    <ObsidianCard
      ambientGlow
      accentOverride={badgeUnlocked ? { hex: '#F59E0B', rgb: '245, 158, 11' } : undefined}
      className="font-mono"
      headerClassName="p-4 space-y-3.5"
      footerClassName="px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] text-zinc-400"
      headerContent={
        <>
          {/* Header & Live Donor Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2 text-xs text-white font-bold uppercase tracking-wider">
              <Award size={15} className="text-amber-400 shrink-0" />
              <span>Donor Perks &amp; Badges</span>
            </div>
            {badgeUnlocked ? (
              <ZeroSupporterGoldenBadge compact />
            ) : (
              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-zinc-900 border border-zinc-700 text-zinc-300">
                Status: Standard
              </span>
            )}
          </div>

          {/* Donor Status Summary */}
          <div className="p-3 rounded-xl bg-black/80 border border-white/10 space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Supporter Badge:</span>
              <span
                className={`font-bold ${
                  badgeUnlocked ? 'text-amber-300' : 'text-zinc-300'
                }`}
              >
                {badgeUnlocked
                  ? 'ZERO-SUPPORTER Active'
                  : `Locked (Min ₹${FIRST_DONATION_BONUS_INR} 1st Tip)`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Ticket Gift (+1 🎫):</span>
              <span
                className={`font-bold ${
                  hasClaimedFirstDonationParachute ? 'text-emerald-300' : 'text-amber-300'
                }`}
              >
                {hasClaimedFirstDonationParachute
                  ? 'Claimed & Added'
                  : `Ready on ₹${FIRST_DONATION_BONUS_INR}+ 1st Tip`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Escape Tickets Balance:</span>
              <span className="text-white font-bold">{remainingEscapeTickets} Ready</span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-zinc-400">Cloud Backup Protection:</span>
              <span className={cloudAutoBackupEnabled ? 'text-emerald-300 font-bold' : 'text-zinc-400'}>
                {cloudAutoBackupEnabled ? 'Auto-Syncing (.zbak)' : 'Manual / Export JSON'}
              </span>
            </div>
          </div>

          {/* Quick In-App Donor Check / Unlock */}
          {!badgeUnlocked ? (
            <div className="p-3 rounded-xl bg-zinc-900/70 border border-amber-500/35 space-y-2">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-300">
                <Gift size={13} className="shrink-0" />
                <span>Check Donor Status or Claim 1st ₹{FIRST_DONATION_BONUS_INR}+ Tip</span>
              </div>
              <p className="text-[10px] text-zinc-300 leading-relaxed">
                Strict Rule: Golden <strong className="text-amber-300">ZERO-SUPPORTER</strong> Crest &amp;{' '}
                <strong>+1 Free Emergency Escape Ticket (🎫)</strong> unlock strictly on your{' '}
                <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong> via UPI or Ko-fi.
              </p>

              {!confirmingManualTip ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={KOFI_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleOpenExternalUrl(e, KOFI_URL)}
                    className="py-2 px-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  >
                    <Coffee size={12} />
                    <span>Support on Ko-fi</span>
                    <ExternalLink size={11} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmingManualTip(true)}
                    className="py-2 px-3 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-emerald-600/60 text-emerald-300 font-bold text-[10px] uppercase tracking-wider"
                  >
                    Tipped ₹{FIRST_DONATION_BONUS_INR}+ Already?
                  </button>
                </div>
              ) : (
                <div className="p-2.5 rounded-xl bg-black/80 border border-emerald-600/60 space-y-2">
                  <div className="text-[10px] text-emerald-200 leading-relaxed">
                    Confirm your <strong>1st ₹{FIRST_DONATION_BONUS_INR}+ tip</strong> via Ko-fi or UPI (
                    <a
                      href={UPI_FIFTY_RS_PAY_URL}
                      onClick={(e) => handleOpenExternalUrl(e, UPI_FIFTY_RS_PAY_URL)}
                      className="underline text-amber-300"
                    >
                      Open ₹{FIRST_DONATION_BONUS_INR} UPI
                    </a>
                    ) to activate your badge &amp; ticket:
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onClaimFirstDonationBonus?.();
                        setConfirmingManualTip(false);
                      }}
                      className="flex-1 py-2 px-2.5 rounded-lg bg-emerald-400 hover:bg-emerald-300 text-black font-black text-[10px] uppercase tracking-wider"
                    >
                      Confirm &amp; Activate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingManualTip(false)}
                      className="px-2.5 py-2 rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-400 text-[10px] font-bold"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="px-3 py-2 rounded-xl bg-emerald-950/45 border border-emerald-600/50 flex items-center justify-between gap-2 text-[10px] text-emerald-300">
              <span className="flex items-center gap-1.5 font-bold">
                <CheckCircle2 size={13} />
                <span>Donor Perks Active — Crest appears on Profile &amp; Flex Cards</span>
              </span>
              <ShieldCheck size={14} className="shrink-0" />
            </div>
          )}

          {/* Signed Unlock Token Form */}
          <form onSubmit={handleVerifyUnlockToken} className="space-y-2">
            <label
              htmlFor="donor-unlock-token-input"
              className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5"
            >
              <KeyRound size={12} style={{ color: '#8B5CF6' }} />
              <span>Enter Signed Unlock Token</span>
            </label>
            <div className="flex gap-2">
              <input
                id="donor-unlock-token-input"
                type="text"
                value={tokenInput}
                onChange={(e) => {
                  setTokenInput(e.target.value);
                  if (tokenNotice) setTokenNotice(null);
                }}
                placeholder={
                  restoreDisabled ? 'Paste ZDON1... unlock token' : 'Paste ZDON1... or ZBAK1... token'
                }
                className="flex-1 min-w-0 bg-black border border-zinc-700 focus:border-[#8B5CF6] rounded-xl px-3 py-2 text-[11px] text-white outline-none"
              />
              <button
                type="submit"
                className="px-3 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider shrink-0 active:scale-95 transition-all"
                style={{
                  backgroundColor: '#8B5CF6',
                  color: '#FFFFFF',
                }}
              >
                Activate
              </button>
            </div>

            {restoreDisabled && (
              <div className="p-2 rounded-xl bg-amber-950/50 border border-amber-600/60 text-amber-200 text-[10px]">
                Root / test-keys ROM / emulator detected: <code>ZBAK1</code> cloud backup restore is disabled; signed <code>ZDON1</code> donor tokens remain enabled.
              </div>
            )}

            {tokenNotice && (
              <div
                className={`p-2.5 rounded-xl text-[10px] border leading-relaxed ${
                  tokenNotice.ok
                    ? 'bg-emerald-950/50 border-emerald-700 text-emerald-200'
                    : 'bg-red-950/50 border-red-700 text-red-200'
                }`}
              >
                {tokenNotice.message}
              </div>
            )}
          </form>

          {/* Ko-fi Manual Verification Note — Two-Tier Pure AMOLED #000000 + Purple #8B5CF6 */}
          <ObsidianCard
            data-amoled-banner="true"
            accentOverride={{ hex: '#8B5CF6', rgb: '139, 92, 246' }}
            headerClassName="p-3.5 space-y-2"
            footerClassName="px-3.5 py-2.5 flex items-center gap-2"
            style={{
              backgroundColor: '#000000',
              borderColor: 'rgba(139, 92, 246, 0.58)',
              boxShadow: '0 0 22px rgba(139, 92, 246, 0.16)',
            }}
            headerContent={
              <>
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span
                    className="amoled-banner-title text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5"
                    style={{ color: '#FFFFFF' }}
                  >
                    <Mail size={12} className="amoled-banner-accent shrink-0" style={{ color: '#8B5CF6' }} />
                    <span>Manual Ko-fi Verification</span>
                  </span>
                  <span
                    className="text-[9px] font-bold px-2 py-0.5 rounded-full"
                    style={{
                      backgroundColor: 'rgba(139, 92, 246, 0.2)',
                      color: '#C4B5FD',
                    }}
                  >
                    Ko-fi Support
                  </span>
                </div>

                <p
                  className="amoled-banner-sub text-[11px] leading-relaxed"
                  style={{ color: '#E9D5FF' }}
                >
                  Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet? Send a screenshot
                  of your receipt and your account email to{' '}
                  <a
                    href={SUPPORT_MAILTO_URL}
                    onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                    className="amoled-banner-email font-black underline decoration-[#8B5CF6] underline-offset-2"
                    style={{ color: '#C4B5FD' }}
                  >
                    <strong>{SUPPORT_EMAIL}</strong>
                  </a>{' '}
                  for manual activation.
                </p>
              </>
            }
            footerContent={
              <>
                <a
                  href={SUPPORT_MAILTO_URL}
                  onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                  className="flex-1 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  style={{
                    backgroundColor: '#8B5CF6',
                    color: '#FFFFFF',
                  }}
                >
                  <Mail size={12} />
                  <span>Email Receipt</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopySupportEmail}
                  className="amoled-banner-secondary px-3 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all"
                  style={{
                    backgroundColor: '#09090B',
                    borderColor: 'rgba(139, 92, 246, 0.5)',
                    color: '#DDD6FE',
                  }}
                >
                  {copiedEmail ? (
                    <>
                      <Check size={12} style={{ color: '#34D399' }} />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} style={{ color: '#8B5CF6' }} />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </>
            }
          />
        </>
      }
      footerContent={
        <>
          <span>HMAC-verified ZDON1 &amp; .zbak state</span>
          <span className={badgeUnlocked ? 'text-amber-300 font-bold' : 'text-zinc-400'}>
            {badgeUnlocked ? 'Crest Active' : `Min ₹${FIRST_DONATION_BONUS_INR} Rule`}
          </span>
        </>
      }
    />
  );
};
