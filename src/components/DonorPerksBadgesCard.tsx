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
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
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
  Ticket,
} from 'lucide-react';

interface DonorPerksBadgesCardProps {
  isZeroSupporter: boolean;
  isDeveloper?: boolean;
  hasClaimedFirstDonationParachute: boolean;
  remainingEscapeTickets: number;
  cloudAutoBackupEnabled?: boolean;
  environmentSecurity?: NativeEnvironmentSecurity;
  onClaimFirstDonationBonus?: (rawToken?: string) => boolean;
  onActivateDonorToken?: (rawToken: string) => { ok: boolean; message: string; grantedNewPerks: boolean };
  onImportData?: (rawInput: string) => { ok: boolean; message: string };
  onRestoreSuccess?: () => void;
}

export const DonorPerksBadgesCard: React.FC<DonorPerksBadgesCardProps> = ({
  isZeroSupporter,
  isDeveloper,
  hasClaimedFirstDonationParachute,
  remainingEscapeTickets,
  cloudAutoBackupEnabled = false,
  environmentSecurity,
  onClaimFirstDonationBonus,
  onActivateDonorToken,
  onImportData,
  onRestoreSuccess,
}) => {
  const { isBespoke, isFluentGlass } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass;
  const [tokenInput, setTokenInput] = useState('');
  const [tokenNotice, setTokenNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [confirmingManualTip, setConfirmingManualTip] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const badgeUnlocked = Boolean(isZeroSupporter || hasClaimedFirstDonationParachute || isDeveloper);
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

    if (onActivateDonorToken) {
      const res = onActivateDonorToken(trimmed);
      setTokenNotice({ ok: res.ok, message: res.message });
      if (res.ok) {
        setTokenInput('');
      }
      return;
    }

    const verified = verifyDonorUnlockToken(trimmed);
    if (!verified.ok) {
      setTokenNotice({ ok: false, message: verified.error });
      return;
    }

    if (verified.payload.tier === 'developer') {
      onClaimFirstDonationBonus?.(trimmed);
      setTokenInput('');
      const tickets = verified.payload.devTickets ?? 50;
      setTokenNotice({
        ok: true,
        message: `Verified Developer Token for ${verified.payload.email}! Granted +${tickets} Testing Escape Tickets & Founder Status.`,
      });
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

    const granted = onClaimFirstDonationBonus?.(trimmed) ?? false;
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
      className={isModernFont ? 'font-sans' : 'font-mono'}
      headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 space-y-3.5'}
      footerClassName={
        isModernFont
          ? 'px-5 py-3 flex items-center justify-between gap-2 flex-wrap text-[11px] text-neutral-400'
          : 'px-4 py-2.5 flex items-center justify-between gap-2 flex-wrap text-[10px] text-zinc-400'
      }
      headerContent={
        <>
          {/* Header & Live Donor Status */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 text-xs text-white font-semibold uppercase tracking-wider">
              <div
                className={
                  isFluentGlass
                    ? 'liquid-squircle text-cyan-200'
                    : `obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'w-8 h-8 rounded-md text-blue-500' : 'w-7 h-7 rounded-xl'
                      }`
                }
              >
                <Award
                  size={15}
                  strokeWidth={1.75}
                  className={isFluentGlass ? 'text-cyan-200' : isBespoke ? 'text-blue-500' : ''}
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                />
              </div>
              <span>Donor Perks &amp; Badges</span>
            </div>
            {badgeUnlocked ? (
              <ZeroSupporterGoldenBadge compact isDeveloper={isDeveloper} />
            ) : (
              <span
                className={
                  isFluentGlass
                    ? 'text-[10px] font-medium uppercase px-2.5 py-0.5 rounded-full liquid-pill text-zinc-300'
                    : isBespoke
                    ? 'text-[10px] font-mono uppercase px-2 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-300'
                    : 'text-[9px] font-black uppercase px-2 py-0.5 rounded-full obsidian-inset-neutral text-zinc-300'
                }
              >
                Status: Standard
              </span>
            )}
          </div>

          {/* Donor Status Summary */}
          <div
            className={
              isFluentGlass
                ? 'p-3.5 rounded-2xl liquid-row space-y-2 text-xs'
                : isBespoke
                ? 'p-3.5 rounded-md bg-neutral-950 border border-neutral-800 space-y-2 text-xs'
                : 'p-3 rounded-xl obsidian-inset-neutral space-y-1.5 text-[11px]'
            }
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Supporter Badge:</span>
              <span
                className={`font-semibold ${
                  badgeUnlocked
                    ? isFluentGlass
                      ? 'text-cyan-300'
                      : isBespoke
                      ? 'text-blue-400'
                      : ''
                    : 'text-neutral-300'
                }`}
                style={
                  badgeUnlocked && !isModernFont ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
                }
              >
                {badgeUnlocked
                  ? 'ZERO-SUPPORTER Active'
                  : `Locked (Min ₹${FIRST_DONATION_BONUS_INR} 1st Tip)`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400 flex items-center gap-1">
                <span>Ticket Gift</span>
                {isFluentGlass ? (
                  <Ticket size={12} strokeWidth={1.75} className="text-cyan-300 inline" />
                ) : isBespoke ? (
                  <Ticket size={11} className="text-blue-500 inline" />
                ) : (
                  <span>(+1 🎫):</span>
                )}
              </span>
              <span
                className={`font-semibold ${
                  hasClaimedFirstDonationParachute
                    ? isFluentGlass
                      ? 'text-cyan-300'
                      : isBespoke
                      ? 'text-blue-400'
                      : ''
                    : isFluentGlass
                    ? 'text-zinc-200'
                    : isBespoke
                    ? 'text-neutral-200'
                    : ''
                }`}
                style={
                  !isModernFont ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
                }
              >
                {hasClaimedFirstDonationParachute
                  ? 'Claimed & Added'
                  : `Ready on ₹${FIRST_DONATION_BONUS_INR}+ 1st Tip`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Escape Tickets Balance:</span>
              <span className="text-white font-mono tabular-nums font-semibold">
                {remainingEscapeTickets} Ready
              </span>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-neutral-400">Cloud Backup Protection:</span>
              <span
                className={
                  cloudAutoBackupEnabled
                    ? isFluentGlass
                      ? 'text-cyan-300 font-semibold'
                      : isBespoke
                      ? 'text-blue-400 font-semibold'
                      : 'font-semibold'
                    : 'text-neutral-400'
                }
                style={
                  cloudAutoBackupEnabled && !isModernFont
                    ? { color: 'var(--accent-hex, #FFFFFF)' }
                    : undefined
                }
              >
                {cloudAutoBackupEnabled ? 'Auto-Syncing (.zbak)' : 'Manual / Export JSON'}
              </span>
            </div>
          </div>

          {/* Quick In-App Donor Check / Unlock */}
          {!badgeUnlocked ? (
            <div
              className={
                isFluentGlass
                  ? 'p-4 rounded-2xl liquid-inset space-y-2.5'
                  : isBespoke
                  ? 'p-4 rounded-md bg-neutral-950 border border-neutral-800 space-y-2.5'
                  : 'p-3 rounded-xl obsidian-inset space-y-2'
              }
            >
              <div
                className={`flex items-center gap-1.5 text-xs font-semibold ${
                  isFluentGlass
                    ? 'text-cyan-200'
                    : isBespoke
                    ? 'text-neutral-100'
                    : 'text-[11px] font-bold'
                }`}
                style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
              >
                <Gift
                  size={13}
                  strokeWidth={1.75}
                  className={
                    isFluentGlass
                      ? 'shrink-0 text-cyan-300'
                      : isBespoke
                      ? 'shrink-0 text-blue-500'
                      : 'shrink-0'
                  }
                />
                <span>Check Donor Status or Claim 1st ₹{FIRST_DONATION_BONUS_INR}+ Tip</span>
              </div>
              <p className="text-[11px] text-neutral-300 leading-relaxed">
                Strict Rule:{' '}
                <strong
                  className={
                    isFluentGlass ? 'text-cyan-200' : isBespoke ? 'text-neutral-100' : ''
                  }
                  style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
                >
                  ZERO-SUPPORTER
                </strong>{' '}
                Crest &amp; <strong>+1 Free Emergency Escape Ticket</strong> unlock strictly on your{' '}
                <strong>1st tip of minimum ₹{FIRST_DONATION_BONUS_INR}</strong> via UPI or Ko-fi.
              </p>

              {!confirmingManualTip ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <a
                    href={KOFI_URL}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => handleOpenExternalUrl(e, KOFI_URL)}
                    className={
                      isFluentGlass
                        ? 'py-2.5 px-3 rounded-xl liquid-pill-active font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5'
                        : isBespoke
                        ? 'py-2.5 px-3 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75'
                        : 'py-2 px-3 rounded-xl obsidian-pill-active font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                    }
                  >
                    <Coffee size={12} strokeWidth={1.75} />
                    <span>Support on Ko-fi</span>
                    <ExternalLink size={11} strokeWidth={1.75} />
                  </a>
                  <button
                    type="button"
                    onClick={() => setConfirmingManualTip(true)}
                    className={
                      isFluentGlass
                        ? 'py-2.5 px-3 rounded-xl liquid-pill font-medium text-xs uppercase tracking-wide'
                        : isBespoke
                        ? 'py-2.5 px-3 rounded-md bg-black border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium text-xs uppercase tracking-wide transition-colors duration-75'
                        : 'py-2 px-3 rounded-xl obsidian-inset hover:border-white/30 text-white font-bold text-[10px] uppercase tracking-wider'
                    }
                  >
                    Tipped ₹{FIRST_DONATION_BONUS_INR}+ Already?
                  </button>
                </div>
              ) : (
                <div
                  className={
                    isFluentGlass
                      ? 'p-3 rounded-xl liquid-row space-y-2.5'
                      : isBespoke
                      ? 'p-3 rounded-md bg-black border border-neutral-800 space-y-2.5'
                      : 'p-2.5 rounded-xl obsidian-inset space-y-2'
                  }
                >
                  <div className="text-[11px] text-neutral-200 leading-relaxed">
                    Confirm your <strong>1st ₹{FIRST_DONATION_BONUS_INR}+ tip</strong> via Ko-fi or UPI (
                    <a
                      href={UPI_FIFTY_RS_PAY_URL}
                      onClick={(e) => handleOpenExternalUrl(e, UPI_FIFTY_RS_PAY_URL)}
                      className={`underline ${
                        isFluentGlass ? 'text-cyan-300' : isBespoke ? 'text-blue-400' : ''
                      }`}
                      style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
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
                      className={
                        isFluentGlass
                          ? 'flex-1 py-2 px-3 rounded-xl liquid-pill-active font-semibold text-xs uppercase tracking-wide'
                          : isBespoke
                          ? 'flex-1 py-2 px-3 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wide transition-colors duration-75'
                          : 'flex-1 py-2 px-2.5 rounded-lg obsidian-pill-active font-black text-[10px] uppercase tracking-wider'
                      }
                    >
                      Confirm &amp; Activate
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmingManualTip(false)}
                      className={
                        isFluentGlass
                          ? 'px-3 py-2 rounded-xl liquid-pill text-xs font-medium'
                          : isBespoke
                          ? 'px-3 py-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-neutral-200 text-xs font-medium transition-colors duration-75'
                          : 'px-2.5 py-2 rounded-lg obsidian-inset-neutral text-zinc-400 text-[10px] font-bold'
                      }
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div
              className={
                isFluentGlass
                  ? 'px-3.5 py-2.5 rounded-2xl liquid-inset flex items-center justify-between gap-2 text-xs text-cyan-200'
                  : isBespoke
                  ? 'px-3.5 py-2.5 rounded-md bg-neutral-950 border border-blue-500/40 flex items-center justify-between gap-2 text-xs text-blue-400'
                  : 'px-3 py-2 rounded-xl obsidian-inset flex items-center justify-between gap-2 text-[10px]'
              }
              style={isModernFont ? undefined : { color: 'var(--accent-hex, #FFFFFF)' }}
            >
              <span className="flex items-center gap-1.5 font-semibold">
                <CheckCircle2 size={13} strokeWidth={1.75} />
                <span>Donor Perks Active — Crest appears on Profile &amp; Flex Cards</span>
              </span>
              <ShieldCheck size={14} strokeWidth={1.75} className="shrink-0" />
            </div>
          )}

          {/* Signed Unlock Token Form */}
          <form onSubmit={handleVerifyUnlockToken} className="space-y-2">
            <label
              htmlFor="donor-unlock-token-input"
              className={`font-semibold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5 ${
                isModernFont ? 'text-[11px]' : 'text-[10px] font-bold'
              }`}
            >
              <KeyRound
                size={12}
                strokeWidth={1.75}
                style={{
                  color: isFluentGlass
                    ? '#7DD3FC'
                    : isBespoke
                    ? '#3B82F6'
                    : 'var(--accent-hex, #FFFFFF)',
                }}
              />
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
                className={
                  isFluentGlass
                    ? 'flex-1 min-w-0 obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none'
                    : isBespoke
                    ? 'flex-1 min-w-0 obsidian-input focus:border-blue-500 rounded-md px-3 py-2 text-xs font-mono text-white outline-none'
                    : 'flex-1 min-w-0 obsidian-input rounded-xl px-3 py-2 text-[11px] text-white outline-none'
                }
              />
              <button
                type="submit"
                className={
                  isFluentGlass
                    ? 'px-3.5 py-2 rounded-xl liquid-pill-active font-semibold text-xs uppercase tracking-wide shrink-0'
                    : isBespoke
                    ? 'px-3.5 py-2 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wide shrink-0 transition-colors duration-75'
                    : 'px-3 py-2 rounded-xl obsidian-pill-active font-black text-[10px] uppercase tracking-wider shrink-0 active:scale-95 transition-all'
                }
              >
                Activate
              </button>
            </div>

            {restoreDisabled && (
              <div
                className={
                  isFluentGlass
                    ? 'p-2.5 rounded-xl bg-red-500/15 border border-red-400/40 text-red-200 text-[11px]'
                    : isBespoke
                    ? 'p-2.5 rounded-md bg-neutral-950 border border-red-800 text-red-300 text-[11px]'
                    : 'p-2 rounded-xl bg-red-950/50 border border-red-700/70 text-red-200 text-[10px]'
                }
              >
                Root / test-keys ROM / emulator detected: <code className="font-mono">ZBAK1</code> cloud backup restore is disabled; signed <code className="font-mono">ZDON1</code> donor tokens remain enabled.
              </div>
            )}

            {tokenNotice && (
              <div
                className={
                  isFluentGlass
                    ? `p-3 rounded-xl text-xs border leading-relaxed ${
                        tokenNotice.ok
                          ? 'liquid-inset text-cyan-100'
                          : 'bg-red-500/15 border-red-400/40 text-red-200'
                      }`
                    : isBespoke
                    ? `p-3 rounded-md text-xs border leading-relaxed ${
                        tokenNotice.ok
                          ? 'bg-neutral-950 border-blue-500/60 text-blue-300'
                          : 'bg-neutral-950 border-red-700 text-red-300'
                      }`
                    : `p-2.5 rounded-xl text-[10px] border leading-relaxed ${
                        tokenNotice.ok
                          ? 'obsidian-inset text-zinc-100'
                          : 'bg-red-950/50 border-red-700 text-red-200'
                      }`
                }
                style={
                  !isModernFont && tokenNotice.ok
                    ? { color: 'var(--accent-hex, #FFFFFF)' }
                    : undefined
                }
              >
                {tokenNotice.message}
              </div>
            )}
          </form>

          {/* Ko-fi Manual Verification Note */}
          {isFluentGlass ? (
            <div className="p-4 rounded-2xl liquid-row space-y-3">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="text-xs font-semibold uppercase tracking-wide text-white flex items-center gap-1.5">
                  <Mail size={13} strokeWidth={1.75} className="shrink-0 text-cyan-300" />
                  <span>Manual Ko-fi Verification</span>
                </span>
                <span className="text-[10px] font-medium px-2.5 py-0.5 rounded-full bg-cyan-400/15 border border-cyan-300/30 text-cyan-200">
                  Ko-fi Support
                </span>
              </div>

              <p className="text-xs text-zinc-300 leading-relaxed">
                Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet? Send a screenshot
                of your receipt and your account email to{' '}
                <a
                  href={SUPPORT_MAILTO_URL}
                  onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                  className="text-cyan-300 font-medium underline underline-offset-2"
                >
                  <strong>{SUPPORT_EMAIL}</strong>
                </a>{' '}
                for manual activation.
              </p>

              <div className="flex items-center gap-2 pt-1">
                <a
                  href={SUPPORT_MAILTO_URL}
                  onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                  className="flex-1 py-2.5 px-3 rounded-xl liquid-pill-active font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  <Mail size={12} strokeWidth={1.75} />
                  <span>Email Receipt</span>
                </a>
                <button
                  type="button"
                  onClick={handleCopySupportEmail}
                  className="px-3 py-2.5 rounded-xl liquid-pill font-medium text-xs uppercase tracking-wide flex items-center justify-center gap-1.5"
                >
                  {copiedEmail ? (
                    <>
                      <Check size={12} strokeWidth={1.75} className="text-cyan-300" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy size={12} strokeWidth={1.75} className="text-cyan-300" />
                      <span>Copy Email</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : (
            <ObsidianCard
              data-amoled-banner="true"
              accentOverride={
                isBespoke
                  ? { hex: '#3B82F6', rgb: '59, 130, 246' }
                  : { hex: '#8B5CF6', rgb: '139, 92, 246' }
              }
              headerClassName={isBespoke ? 'p-4 space-y-2.5' : 'p-3.5 space-y-2'}
              footerClassName={
                isBespoke
                  ? 'px-4 py-3 flex items-center gap-2'
                  : 'px-3.5 py-2.5 flex items-center gap-2'
              }
              style={
                isBespoke
                  ? undefined
                  : {
                      backgroundColor: '#000000',
                      borderColor: 'rgba(139, 92, 246, 0.58)',
                      boxShadow: '0 0 22px rgba(139, 92, 246, 0.16)',
                    }
              }
              headerContent={
                <>
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={
                        isBespoke
                          ? 'text-xs font-semibold uppercase tracking-wide text-neutral-100 flex items-center gap-1.5'
                          : 'amoled-banner-title text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5'
                      }
                      style={isBespoke ? undefined : { color: '#FFFFFF' }}
                    >
                      <Mail
                        size={12}
                        className={isBespoke ? 'shrink-0 text-blue-500' : 'amoled-banner-accent shrink-0'}
                        style={isBespoke ? undefined : { color: '#8B5CF6' }}
                      />
                      <span>Manual Ko-fi Verification</span>
                    </span>
                    <span
                      className={
                        isBespoke
                          ? 'text-[10px] font-mono px-2 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-neutral-300'
                          : 'text-[9px] font-bold px-2 py-0.5 rounded-full'
                      }
                      style={
                        isBespoke
                          ? undefined
                          : {
                              backgroundColor: 'rgba(139, 92, 246, 0.2)',
                              color: '#C4B5FD',
                            }
                      }
                    >
                      Ko-fi Support
                    </span>
                  </div>

                  <p
                    className={
                      isBespoke
                        ? 'text-xs text-neutral-400 leading-relaxed'
                        : 'amoled-banner-sub text-[11px] leading-relaxed'
                    }
                    style={isBespoke ? undefined : { color: '#E9D5FF' }}
                  >
                    Donated on Ko-fi but haven&apos;t received your badge or ticket bundle yet? Send a screenshot
                    of your receipt and your account email to{' '}
                    <a
                      href={SUPPORT_MAILTO_URL}
                      onClick={(e) => handleOpenExternalUrl(e, SUPPORT_MAILTO_URL)}
                      className={
                        isBespoke
                          ? 'text-blue-400 font-mono underline underline-offset-2'
                          : 'amoled-banner-email font-black underline decoration-[#8B5CF6] underline-offset-2'
                      }
                      style={isBespoke ? undefined : { color: '#C4B5FD' }}
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
                    className={
                      isBespoke
                        ? 'flex-1 py-2.5 px-3 rounded-md bg-blue-600 border border-blue-500 hover:bg-blue-500 text-white font-semibold text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75'
                        : 'flex-1 py-2 px-3 rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                    }
                    style={
                      isBespoke
                        ? undefined
                        : {
                            backgroundColor: '#8B5CF6',
                            color: '#FFFFFF',
                          }
                    }
                  >
                    <Mail size={12} />
                    <span>Email Receipt</span>
                  </a>
                  <button
                    type="button"
                    onClick={handleCopySupportEmail}
                    className={
                      isBespoke
                        ? 'px-3 py-2.5 rounded-md bg-neutral-950 border border-neutral-800 hover:border-neutral-700 text-neutral-200 font-medium text-xs uppercase tracking-wide flex items-center justify-center gap-1.5 transition-colors duration-75'
                        : 'amoled-banner-secondary px-3 py-2 rounded-xl border font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-1.5 active:scale-95 transition-all'
                    }
                    style={
                      isBespoke
                        ? undefined
                        : {
                            backgroundColor: '#09090B',
                            borderColor: 'rgba(139, 92, 246, 0.5)',
                            color: '#DDD6FE',
                          }
                    }
                  >
                    {copiedEmail ? (
                      <>
                        <Check size={12} style={{ color: isBespoke ? '#3B82F6' : '#A78BFA' }} />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} style={{ color: isBespoke ? '#3B82F6' : '#8B5CF6' }} />
                        <span>Copy Email</span>
                      </>
                    )}
                  </button>
                </>
              }
            />
          )}
        </>
      }
      footerContent={
        <>
          <span>HMAC-verified ZDON1 &amp; .zbak state</span>
          <span
            className={
              badgeUnlocked
                ? isFluentGlass
                  ? 'text-cyan-300 font-semibold'
                  : isBespoke
                  ? 'text-blue-400 font-semibold'
                  : 'font-bold'
                : 'text-neutral-400'
            }
            style={
              badgeUnlocked && !isModernFont ? { color: 'var(--accent-hex, #FFFFFF)' } : undefined
            }
          >
            {badgeUnlocked ? 'Crest Active' : `Min ₹${FIRST_DONATION_BONUS_INR} Rule`}
          </span>
        </>
      }
    />
  );
};
