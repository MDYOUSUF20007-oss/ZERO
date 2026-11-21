import React, { useState, useEffect, useMemo } from 'react';
import type {
  NativeEnvironmentSecurity,
  ProfileAccent,
  ProfileAvatarId,
  SessionRecord,
  ThemeConfig,
  ZeroProfile,
} from '../types';
import {
  AVATAR_ID_TO_EMBLEM,
  AVATAR_OPTIONS,
  ProfileAvatar,
} from './ProfileAvatar';
import { ZeroProfilePreviewCard } from './ZeroProfilePreviewCard';
import { ObsidianCard } from './ObsidianCard';
import {
  getZeroRankFromHours,
  normalizeProfileHandle,
} from '../utils/parachuteRewardsPolicy';
import { mergeHashtagList, normalizeCustomHashtag } from '../utils/bagLayout';
import { useInterfaceStyle } from '../context/InterfaceStyleContext';
import { haptics } from '../utils/haptics';
import {
  Sparkles,
  X,
  Gift,
  UserCheck,
  Flame,
  CloudDownload,
  Loader2,
  Ticket,
  Plus,
} from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  mode: 'welcome' | 'edit';
  initialProfile: ZeroProfile | null;
  hasClaimedFirstTimeParachute: boolean;
  isZeroSupporter: boolean;
  sessions: SessionRecord[];
  totalReclaimedHours: number;
  themeConfig?: ThemeConfig;
  onThemeConfigChange?: (next: ThemeConfig) => void;
  customHashtags?: string[];
  onAddCustomHashtag?: (tag: string) => string | null;
  isCloudBusy?: boolean;
  environmentSecurity?: NativeEnvironmentSecurity;
  onRestoreFromCloud?: () => Promise<{ ok: boolean; cancelled?: boolean; message: string }>;
  onRestoreSuccess?: () => void;
  onSaveProfile: (draft: {
    displayName: string;
    handle: string;
    avatarId: ProfileAvatarId;
    accentColor: ProfileAccent;
    primaryMission: string;
    dailyGoalHours: number;
    motto: string;
  }) => { grantedFreeParachute: boolean };
  onClose: () => void;
}

const MISSION_PRESETS = [
  'Deep Work',
  'Exam Study',
  'Phone Detox',
  'Family Presence',
  'Sleep Hygiene',
];

const MOTTO_PRESETS = [
  'Put your phone facedown. Reclaim your hours.',
  'Discipline beats willpower.',
  'No scrolling before deep work.',
  'Protect your attention like your life depends on it.',
  'One locked hour today beats ten distracted tomorrow.',
  'Leave the feed behind. Build something real.',
  'Quiet the noise. Finish the mission.',
  'Boredom is the doorway to deep focus.',
  'My future is not inside a notification.',
  'Lock in now. Rest proud tonight.',
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  mode,
  initialProfile,
  hasClaimedFirstTimeParachute,
  isZeroSupporter,
  sessions: _sessions,
  totalReclaimedHours,
  themeConfig: _themeConfig,
  onThemeConfigChange: _onThemeConfigChange,
  customHashtags = [],
  onAddCustomHashtag,
  isCloudBusy = false,
  environmentSecurity,
  onRestoreFromCloud,
  onRestoreSuccess,
  onSaveProfile,
  onClose,
}) => {
  const { isBespoke, isFluentGlass, isAero, aeroAccentColor } = useInterfaceStyle();
  const isModernFont = isBespoke || isFluentGlass || isAero;
  const [displayName, setDisplayName] = useState(initialProfile?.displayName || '');
  const [handleInput, setHandleInput] = useState(initialProfile?.handle || '');
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(initialProfile?.avatarId || 'monk');
  const [primaryMission, setPrimaryMission] = useState(
    initialProfile?.primaryMission || 'Deep Work'
  );
  const [customTagInput, setCustomTagInput] = useState('');
  const [dailyGoalHours, setDailyGoalHours] = useState(initialProfile?.dailyGoalHours || 4);
  const [motto, setMotto] = useState(
    initialProfile?.motto || 'Put your phone facedown. Reclaim your hours.'
  );
  const [errorMsg, setErrorMsg] = useState('');
  const [restoreFeedback, setRestoreFeedback] = useState<string>('');
  const [isRestoringLocal, setIsRestoringLocal] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(initialProfile?.displayName || '');
    setHandleInput(initialProfile?.handle || '');
    setAvatarId(initialProfile?.avatarId || 'monk');
    setPrimaryMission(initialProfile?.primaryMission || 'Deep Work');
    setCustomTagInput('');
    setDailyGoalHours(initialProfile?.dailyGoalHours || 4);
    setMotto(initialProfile?.motto || 'Put your phone facedown. Reclaim your hours.');
    setErrorMsg('');
    setRestoreFeedback('');
    setIsRestoringLocal(false);
  }, [isOpen, initialProfile]);

  const missionOptions = useMemo(
    () =>
      mergeHashtagList(
        [...customHashtags, ...(primaryMission ? [primaryMission] : [])],
        MISSION_PRESETS
      ),
    [customHashtags, primaryMission]
  );

  if (!isOpen) return null;

  const savedAccentColor: ProfileAccent = initialProfile?.accentColor || 'amber';
  const rank = getZeroRankFromHours(totalReclaimedHours);
  const previewName = displayName.trim() || 'Zero Monk';
  const previewHandle = normalizeProfileHandle(previewName, handleInput);
  const showGiftOffer = !hasClaimedFirstTimeParachute;
  const restoreDisabled = Boolean(environmentSecurity?.restrictions?.backupRestoreDisabled);

  const handleAddCustomHashtag = () => {
    const cleaned = normalizeCustomHashtag(customTagInput);
    if (!cleaned) return;
    const savedTag = onAddCustomHashtag?.(cleaned) ?? cleaned;
    setPrimaryMission(savedTag);
    setCustomTagInput('');
    haptics.tick(860);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = displayName.trim();
    if (!cleaned) {
      setErrorMsg('Enter your name or callsign to create your profile.');
      return;
    }
    haptics.thud();
    onSaveProfile({
      displayName: cleaned,
      handle: previewHandle,
      avatarId,
      accentColor: savedAccentColor,
      primaryMission,
      dailyGoalHours,
      motto,
    });
    onClose();
  };

  const handleCloudRestoreClick = async () => {
    if (!onRestoreFromCloud || isCloudBusy || isRestoringLocal) return;
    setErrorMsg('');
    setRestoreFeedback('');
    setIsRestoringLocal(true);
    try {
      const res = await onRestoreFromCloud();
      if (res.ok) {
        onRestoreSuccess?.();
        onClose();
        return;
      }
      if (!res.cancelled && res.message) {
        setRestoreFeedback(res.message);
      }
    } finally {
      setIsRestoringLocal(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
        isAero
          ? 'bg-slate-900/40 backdrop-blur-md'
          : isFluentGlass
          ? 'bg-black/75 backdrop-blur-sm'
          : 'bg-black/95'
      }`}
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <ObsidianCard
        onSubmit={handleSubmit}
        ambientGlow={!isBespoke && !isAero}
        className={`w-full max-w-md max-h-full ${isModernFont ? 'font-sans' : 'font-mono'}`}
        headerClassName={
          isModernFont
            ? 'p-5 flex-1 min-h-0 overflow-y-auto space-y-5'
            : 'p-5 flex-1 min-h-0 overflow-y-auto space-y-4'
        }
        footerClassName={isModernFont ? 'p-5 flex flex-col gap-2.5' : 'p-4 flex flex-col gap-2'}
        headerContent={
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                {showGiftOffer && (
                  <div
                    style={
                      isModernFont
                        ? isAero && aeroAccentColor
                          ? { backgroundColor: aeroAccentColor }
                          : undefined
                        : {
                            background: 'var(--accent-badge-gradient)',
                            color: 'var(--accent-badge-text, #09090B)',
                          }
                    }
                    className={
                      isAero
                        ? 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#0f172a] text-white font-sans text-[10px] font-bold uppercase tracking-wider mb-2 shadow-xs'
                        : isFluentGlass
                        ? 'inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full liquid-inset text-cyan-200 font-sans text-[10px] font-semibold uppercase tracking-wider mb-2'
                        : isBespoke
                        ? 'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-sm bg-neutral-950 border border-blue-500 text-blue-400 font-mono text-[10px] font-semibold uppercase tracking-wider mb-2'
                        : 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1.5 animate-pulse'
                    }
                  >
                    <Gift size={11} />
                    <span>
                      {mode === 'welcome'
                        ? 'First-Timer Special • +1 Free Escape Ticket'
                        : 'Profile Bonus • +1 Free Escape Ticket'}
                    </span>
                  </div>
                )}
                <h2
                  className={
                    isAero
                      ? 'text-base font-black text-[#0f172a] tracking-tight'
                      : isModernFont
                      ? 'text-base font-semibold text-white tracking-tight'
                      : 'text-base font-black text-white tracking-tight'
                  }
                >
                  {initialProfile ? 'Interactive Zero Profile' : 'Create Interactive Profile'}
                </h2>
                <p
                  className={
                    isAero
                      ? 'text-xs text-[#475569] mt-1 leading-relaxed font-medium'
                      : isModernFont
                      ? 'text-xs text-neutral-400 mt-1 leading-relaxed'
                      : 'text-[11px] text-zinc-400 mt-0.5'
                  }
                >
                  {showGiftOffer
                    ? isModernFont
                      ? 'Set your emblem, mission & daily focus goal to claim your starter Emergency Escape Ticket.'
                      : 'Set your avatar, mission & daily focus goal to claim your free starter Emergency Escape Ticket (🎫).'
                    : 'Customize your focus identity, daily goal & lock pledge.'}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className={
                  isAero
                    ? 'p-2 rounded-full bg-[#F1F5F9] border border-[#CBD5E1] text-[#0f172a] hover:bg-[#E2E8F0] transition-colors shrink-0'
                    : isFluentGlass
                    ? 'p-2 rounded-full liquid-pill text-zinc-300 shrink-0'
                    : isBespoke
                    ? 'p-2 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600 transition-colors duration-75 shrink-0'
                    : 'p-1.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white shrink-0'
                }
                aria-label="Close Profile Modal"
              >
                <X size={16} />
              </button>
            </div>

            {/* 1-Tap Cloud Restore on Reinstall / Onboarding */}
            {onRestoreFromCloud && (mode === 'welcome' || !initialProfile) && (
              <ObsidianCard
                data-amoled-banner="true"
                accentOverride={
                  isModernFont ? undefined : { hex: '#8B5CF6', rgb: '139, 92, 246' }
                }
                ambientGlow={!isBespoke}
                className={isModernFont ? 'font-sans' : 'font-mono'}
                headerClassName={isModernFont ? 'p-4 space-y-3' : 'p-3.5 space-y-2.5'}
                footerClassName={
                  isFluentGlass
                    ? 'px-4 py-2.5 text-[10px] font-sans flex items-center justify-between gap-2'
                    : isBespoke
                    ? 'px-4 py-2.5 text-[10px] font-mono flex items-center justify-between gap-2'
                    : 'px-3.5 py-2 text-[10px] flex items-center justify-between gap-2'
                }
                headerContent={
                  <>
                    <div className="flex items-center justify-between gap-2">
                      <span
                        className={
                          isModernFont
                            ? 'text-xs font-semibold uppercase tracking-wider text-white'
                            : 'amoled-banner-title text-[11px] font-black uppercase tracking-wider text-white'
                        }
                      >
                        Reinstalled Zero? Skip Setup
                      </span>
                      <span
                        className={
                          isFluentGlass
                            ? 'font-sans text-[9px] font-semibold px-2.5 py-0.5 rounded-full liquid-inset text-cyan-200'
                            : isBespoke
                            ? 'font-mono text-[9px] font-semibold px-2 py-0.5 rounded-sm bg-neutral-950 border border-neutral-800 text-blue-400'
                            : 'text-[9px] font-bold px-2 py-0.5 rounded-full'
                        }
                        style={
                          isModernFont
                            ? undefined
                            : {
                                backgroundColor: 'rgba(139, 92, 246, 0.2)',
                                color: '#C4B5FD',
                              }
                        }
                      >
                        .zbak Sync
                      </span>
                    </div>
                    <p
                      className={
                        isModernFont
                          ? 'text-xs text-neutral-400 leading-relaxed'
                          : 'amoled-banner-sub text-[10px] leading-relaxed'
                      }
                      style={isModernFont ? undefined : { color: '#C4B5FD' }}
                    >
                      Restore focus stats, donor badges, emergency escape tickets &amp; preset Bags in 1 tap.
                    </p>
                    {restoreDisabled && (
                      <div
                        className={
                          isFluentGlass
                            ? 'p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs'
                            : isBespoke
                            ? 'p-2.5 rounded-sm bg-neutral-950 border border-red-500/60 text-red-300 text-xs'
                            : 'p-2 rounded-xl bg-red-950/60 border border-red-600/70 text-red-200 text-[10px]'
                        }
                      >
                        Cloud backup restore is disabled on rooted devices, test-keys ROMs, or debug emulators to protect ZERO integrity.
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={handleCloudRestoreClick}
                      disabled={restoreDisabled || isCloudBusy || isRestoringLocal}
                      className={
                        isFluentGlass
                          ? 'w-full py-2.5 px-3 rounded-xl liquid-pill-active font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'
                          : isBespoke
                          ? 'w-full py-2.5 px-3 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-75 disabled:opacity-50 disabled:cursor-not-allowed'
                          : 'w-full py-2.5 px-3 rounded-xl font-black text-[11px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
                      }
                      style={
                        isModernFont
                          ? undefined
                          : {
                              backgroundColor: '#8B5CF6',
                              color: '#FFFFFF',
                            }
                      }
                    >
                      {isCloudBusy || isRestoringLocal ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <CloudDownload size={14} strokeWidth={isFluentGlass ? 1.75 : 2} />
                      )}
                      <span>Restore Backup from Cloud (Drive / OneDrive / JioDrive)</span>
                    </button>
                    {restoreFeedback && (
                      <div
                        className={
                          isFluentGlass
                            ? 'p-2.5 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs'
                            : isBespoke
                            ? 'p-2.5 rounded-sm bg-neutral-950 border border-red-500/60 text-red-300 text-xs'
                            : 'p-2 rounded-xl bg-red-950/60 border border-red-700/80 text-red-200 text-[10px]'
                        }
                      >
                        {restoreFeedback}
                      </div>
                    )}
                  </>
                }
                footerContent={
                  <>
                    <span
                      className={isModernFont ? 'text-neutral-400' : 'amoled-banner-sub'}
                      style={isModernFont ? undefined : { color: '#C4B5FD' }}
                    >
                      Zero-Server Android SAF Restore
                    </span>
                    <span
                      className={
                        isFluentGlass
                          ? 'text-cyan-300 font-semibold uppercase tracking-wider'
                          : isBespoke
                          ? 'text-blue-400 font-semibold uppercase tracking-wider'
                          : 'amoled-banner-accent font-bold uppercase tracking-wider'
                      }
                    >
                      HMAC Verified
                    </span>
                  </>
                }
              />
            )}

            {/* Live Interactive Profile Badge Preview */}
            <ZeroProfilePreviewCard
              callsign={previewName}
              handle={previewHandle}
              emblem={AVATAR_ID_TO_EMBLEM[avatarId] || 'Monk'}
              mission={primaryMission}
              dailyGoalHours={dailyGoalHours}
              pledge={motto}
              rankTitle={rank.title.toUpperCase()}
              isZeroSupporter={isZeroSupporter}
            />

            {/* Name & Handle */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label
                  className={
                    isAero
                      ? 'text-[10px] font-sans font-bold uppercase tracking-wider text-[#475569] block mb-1.5'
                      : isFluentGlass
                      ? 'text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5'
                      : isBespoke
                      ? 'text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5'
                      : 'text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1'
                  }
                >
                  Callsign / Name *
                </label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => {
                    setDisplayName(e.target.value);
                    setErrorMsg('');
                  }}
                  placeholder="e.g. Yousuf"
                  maxLength={28}
                  autoFocus={mode === 'welcome'}
                  className={
                    isAero
                      ? 'w-full bg-white border border-[#CBD5E1] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-sans text-[#0f172a] outline-none shadow-xs placeholder:text-slate-400 transition-colors'
                      : isFluentGlass
                      ? 'w-full obsidian-input rounded-xl px-3 py-2 text-xs font-sans text-white outline-none'
                      : isBespoke
                      ? 'w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-md px-3 py-2 text-xs text-white outline-none transition-colors duration-75'
                      : 'w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none'
                  }
                />
              </div>
              <div>
                <label
                  className={
                    isAero
                      ? 'text-[10px] font-sans font-bold uppercase tracking-wider text-[#475569] block mb-1.5'
                      : isFluentGlass
                      ? 'text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-400 block mb-1.5'
                      : isBespoke
                      ? 'text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5'
                      : 'text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1'
                  }
                >
                  @Handle (Optional)
                </label>
                <input
                  type="text"
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  placeholder={normalizeProfileHandle(displayName)}
                  maxLength={20}
                  className={
                    isAero
                      ? 'w-full bg-white border border-[#CBD5E1] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-sans text-[#0f172a] outline-none shadow-xs placeholder:text-slate-400 transition-colors'
                      : isFluentGlass
                      ? 'w-full obsidian-input rounded-xl px-3 py-2 text-xs font-sans text-zinc-200 outline-none'
                      : isBespoke
                      ? 'w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-md px-3 py-2 font-mono text-xs text-neutral-200 outline-none transition-colors duration-75'
                      : 'w-full obsidian-input rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none'
                  }
                />
              </div>
            </div>

            {/* Avatar Emblem Picker */}
            <div>
              <label
                className={
                  isAero
                    ? 'text-[10px] font-sans font-bold uppercase tracking-wider text-[#475569] block mb-2'
                    : isFluentGlass
                    ? 'text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-400 block mb-2'
                    : isBespoke
                    ? 'text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block mb-2'
                    : 'text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5'
                }
              >
                Select Emblem (Tap to Preview)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {AVATAR_OPTIONS.map((opt) => {
                  const active = avatarId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        haptics.tick(820);
                        setAvatarId(opt.id);
                      }}
                      style={
                        isAero
                          ? active
                            ? { backgroundColor: aeroAccentColor || '#0f172a', borderColor: aeroAccentColor || '#0f172a' }
                            : undefined
                          : !isModernFont && active
                          ? { borderColor: 'var(--accent-hex, #FFFFFF)' }
                          : undefined
                      }
                      className={
                        isAero
                          ? `p-2.5 rounded-2xl border flex flex-col items-center gap-1.5 transition-all shadow-2xs ${
                              active
                                ? 'text-white shadow-xs'
                                : 'bg-white border-[#CBD5E1] text-[#0f172a] hover:bg-[#F8FAFC]'
                            }`
                          : isFluentGlass
                          ? `p-2.5 rounded-xl flex flex-col items-center gap-1.5 liquid-spring ${
                              active
                                ? 'liquid-inset text-white'
                                : 'liquid-row text-zinc-400 hover:text-zinc-100'
                            }`
                          : isBespoke
                          ? `p-2.5 rounded-md border flex flex-col items-center gap-1.5 transition-colors duration-75 ${
                              active
                                ? 'border-blue-500 bg-neutral-950 text-white'
                                : 'border-neutral-800 bg-black text-neutral-400 hover:border-neutral-600'
                            }`
                          : `p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                              active
                                ? 'bg-zinc-900 text-white'
                                : 'border-white/10 bg-black/70 text-zinc-400 hover:border-white/25'
                            }`
                      }
                    >
                      <ProfileAvatar
                        avatarId={opt.id}
                        size="sm"
                        glowHighlighted={active}
                      />
                      <span className="text-[11px] font-medium">{opt.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mission Pills + Custom Hashtag Creator */}
            <div className="space-y-2">
              <label
                className={
                  isAero
                    ? 'text-[10px] font-sans font-bold uppercase tracking-wider text-[#475569] block'
                    : isFluentGlass
                    ? 'text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-400 block'
                    : isBespoke
                    ? 'text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block'
                    : 'text-[10px] font-bold uppercase tracking-wider text-zinc-400 block'
                }
              >
                Primary Detox Mission &amp; Custom #Hashtags
              </label>
              <div className="flex flex-wrap gap-1.5">
                {missionOptions.map((mission) => {
                  const isActiveMission = primaryMission.toLowerCase() === mission.toLowerCase();
                  return (
                    <button
                      key={mission}
                      type="button"
                      onClick={() => {
                        haptics.tick(800);
                        setPrimaryMission(mission);
                      }}
                      style={
                        isAero && isActiveMission
                          ? { backgroundColor: aeroAccentColor || '#0f172a', borderColor: aeroAccentColor || '#0f172a' }
                          : undefined
                      }
                      className={
                        isAero
                          ? `px-3 py-1 rounded-full font-sans text-[11px] font-bold border transition-all shadow-2xs ${
                              isActiveMission
                                ? 'text-white shadow-xs'
                                : 'bg-white border-[#CBD5E1] text-[#0f172a] hover:bg-[#F8FAFC]'
                            }`
                          : isFluentGlass
                          ? `px-3 py-1 rounded-full font-sans text-[11px] font-semibold liquid-spring ${
                              isActiveMission
                                ? 'liquid-pill-active'
                                : 'liquid-pill text-zinc-300'
                            }`
                          : isBespoke
                          ? `px-2.5 py-1.5 rounded-sm border font-mono text-[11px] transition-colors duration-75 ${
                              isActiveMission
                                ? 'bg-blue-600 border-blue-500 text-white font-semibold'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                            }`
                          : `px-2.5 py-1 rounded-xl text-[10px] font-bold transition-all ${
                              isActiveMission
                                ? 'obsidian-pill-active font-black'
                                : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
                            }`
                      }
                    >
                      #{mission}
                    </button>
                  );
                })}
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={customTagInput}
                  onChange={(e) => setCustomTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomHashtag();
                    }
                  }}
                  maxLength={24}
                  placeholder="Custom #hashtag (e.g. GatePrep)"
                  className={
                    isAero
                      ? 'flex-1 bg-white border border-[#CBD5E1] focus:border-[#0f172a] rounded-xl px-3 py-1.5 font-sans text-xs text-[#0f172a] outline-none shadow-xs placeholder:text-slate-400 transition-colors'
                      : isFluentGlass
                      ? 'flex-1 obsidian-input rounded-xl px-3 py-1.5 font-sans text-xs text-white outline-none'
                      : isBespoke
                      ? 'flex-1 bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-md px-3 py-1.5 font-mono text-xs text-white outline-none transition-colors duration-75'
                      : 'flex-1 obsidian-input rounded-xl px-3 py-1.5 text-xs text-white outline-none'
                  }
                />
                <button
                  type="button"
                  onClick={handleAddCustomHashtag}
                  disabled={!normalizeCustomHashtag(customTagInput)}
                  style={
                    isAero
                      ? { backgroundColor: aeroAccentColor || '#0f172a' }
                      : isModernFont
                      ? undefined
                      : {
                          background: 'var(--accent-badge-gradient)',
                          color: 'var(--accent-badge-text, #09090B)',
                        }
                  }
                  className={
                    isAero
                      ? 'px-3.5 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1 disabled:opacity-40 active:scale-95 transition-all shadow-xs shrink-0'
                      : isFluentGlass
                      ? 'px-3.5 py-1.5 rounded-xl liquid-pill-active text-xs font-semibold flex items-center gap-1 disabled:opacity-40 shrink-0'
                      : isBespoke
                      ? 'px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold flex items-center gap-1 disabled:opacity-40 transition-colors duration-75 shrink-0'
                      : 'px-3 py-1.5 rounded-xl text-[11px] font-black flex items-center gap-1 disabled:opacity-40 active:scale-95 transition-all shrink-0'
                  }
                >
                  <Plus size={12} />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Interactive Daily Focus Goal Slider */}
            <div
              className={
                isAero
                  ? 'p-4 rounded-2xl bg-white border border-[#E2E8F0] space-y-2.5 shadow-xs'
                  : isFluentGlass
                  ? 'p-4 rounded-2xl liquid-row space-y-2.5'
                  : isBespoke
                  ? 'p-4 rounded-md bg-neutral-950 border border-neutral-800 space-y-2.5'
                  : 'p-3 rounded-2xl obsidian-inset-neutral space-y-2'
              }
            >
              <div className="flex items-center justify-between text-xs">
                <span
                  className={
                    isAero
                      ? 'font-bold text-[#0f172a] flex items-center gap-1.5'
                      : isModernFont
                      ? 'font-medium text-neutral-300 flex items-center gap-1.5'
                      : 'font-bold text-zinc-300 flex items-center gap-1.5'
                  }
                >
                  <Flame
                    size={13}
                    strokeWidth={isFluentGlass ? 1.75 : 2}
                    style={{
                      color: isAero
                        ? (aeroAccentColor || '#0f172a')
                        : isFluentGlass
                        ? '#7DD3FC'
                        : isBespoke
                        ? '#3B82F6'
                        : 'var(--accent-hex, #FFFFFF)',
                    }}
                  />
                  <span>Daily Phone-Free Goal</span>
                </span>
                <span
                  className={
                    isAero
                      ? 'font-sans tabular-nums font-black text-[#0f172a]'
                      : isFluentGlass
                      ? 'font-sans tabular-nums font-bold text-cyan-200'
                      : isBespoke
                      ? 'font-mono tabular-nums font-semibold'
                      : 'font-black'
                  }
                  style={
                    isAero || isFluentGlass
                      ? undefined
                      : { color: isBespoke ? '#3B82F6' : 'var(--accent-hex, #FFFFFF)' }
                  }
                >
                  {dailyGoalHours} {dailyGoalHours === 1 ? 'Hour' : 'Hours'} / Day
                </span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={dailyGoalHours}
                onChange={(e) => {
                  haptics.tick(650 + Number(e.target.value) * 35);
                  setDailyGoalHours(Number(e.target.value));
                }}
                style={{
                  accentColor: isAero
                    ? (aeroAccentColor || '#0f172a')
                    : isFluentGlass
                    ? '#4FACFE'
                    : isBespoke
                    ? '#2563EB'
                    : 'var(--accent-hex, #FFFFFF)',
                }}
                className="w-full cursor-pointer"
              />
              <div
                className={
                  isAero
                    ? 'flex justify-between font-sans tabular-nums text-[10px] text-[#64748B] font-semibold'
                    : isFluentGlass
                    ? 'flex justify-between font-sans tabular-nums text-[10px] text-zinc-400'
                    : isBespoke
                    ? 'flex justify-between font-mono tabular-nums text-[10px] text-neutral-400'
                    : 'flex justify-between text-[9px] text-zinc-400'
                }
              >
                <span>1h Light</span>
                <span>4h Balanced</span>
                <span>8h Monk</span>
                <span>12h Extreme</span>
              </div>
            </div>

            {/* Focus Pledge / Motto */}
            <div className="space-y-1.5">
              <label
                className={
                  isAero
                    ? 'text-[10px] font-sans font-bold uppercase tracking-wider text-[#475569] block'
                    : isFluentGlass
                    ? 'text-[10px] font-sans font-semibold uppercase tracking-wider text-zinc-400 block'
                    : isBespoke
                    ? 'text-[10px] font-mono font-semibold uppercase tracking-wider text-neutral-400 block'
                    : 'text-[10px] font-bold uppercase tracking-wider text-zinc-400 block'
                }
              >
                Personal Lock Pledge
              </label>
              <input
                type="text"
                value={motto}
                onChange={(e) => setMotto(e.target.value)}
                maxLength={72}
                placeholder="Your focus rule..."
                className={
                  isAero
                    ? 'w-full bg-white border border-[#CBD5E1] focus:border-[#0f172a] rounded-xl px-3 py-2 text-xs font-sans text-[#0f172a] outline-none shadow-xs placeholder:text-slate-400 transition-colors'
                    : isFluentGlass
                    ? 'w-full obsidian-input rounded-xl px-3 py-2 text-xs font-sans text-white outline-none'
                    : isBespoke
                    ? 'w-full bg-neutral-950 border border-neutral-800 focus:border-blue-500 rounded-md px-3 py-2 text-xs text-white outline-none transition-colors duration-75'
                    : 'w-full obsidian-input rounded-xl px-3 py-2 text-xs text-white outline-none'
                }
              />
              <div className="flex gap-1.5 flex-wrap pt-0.5">
                {MOTTO_PRESETS.map((preset) => {
                  const selected = motto.trim() === preset;
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => {
                        haptics.tick(760);
                        setMotto(preset);
                      }}
                      style={
                        isAero && selected
                          ? { backgroundColor: aeroAccentColor || '#0f172a', borderColor: aeroAccentColor || '#0f172a' }
                          : !isModernFont && selected
                          ? {
                              borderColor: 'var(--accent-hex, #FFFFFF)',
                              color: 'var(--accent-hex, #FFFFFF)',
                            }
                          : undefined
                      }
                      className={
                        isAero
                          ? `text-[10px] px-2.5 py-1 rounded-full border transition-all shadow-2xs ${
                              selected
                                ? 'text-white font-bold shadow-xs'
                                : 'bg-white border-[#CBD5E1] text-[#334155] hover:bg-[#F8FAFC] font-medium'
                            }`
                          : isFluentGlass
                          ? `text-[10px] px-2.5 py-1 rounded-full liquid-spring ${
                              selected ? 'liquid-inset text-cyan-200 font-semibold' : 'liquid-row text-zinc-400 hover:text-zinc-200'
                            }`
                          : isBespoke
                          ? `text-[10px] px-2 py-1 rounded-sm border transition-colors duration-75 ${
                              selected
                                ? 'bg-neutral-950 border-blue-500 text-blue-400'
                                : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-600'
                            }`
                          : `text-[9px] px-2 py-0.5 rounded border transition-colors ${
                              selected
                                ? 'obsidian-inset font-bold'
                                : 'obsidian-inset-neutral text-zinc-400 hover:text-zinc-200'
                            }`
                      }
                    >
                      {preset}
                    </button>
                  );
                })}
              </div>
            </div>

            {errorMsg && (
              <div
                className={
                  isAero
                    ? 'p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold'
                    : isFluentGlass
                    ? 'p-3 rounded-xl bg-red-950/60 border border-red-500/50 text-red-200 text-xs'
                    : isBespoke
                    ? 'p-3 rounded-md bg-neutral-950 border border-red-500/60 text-red-300 text-xs'
                    : 'p-2.5 rounded-xl bg-red-950/60 border border-red-700/80 text-red-200 text-[11px]'
                }
              >
                {errorMsg}
              </div>
            )}
          </>
        }
        footerContent={
          <>
            <button
              type="submit"
              style={
                isAero
                  ? { backgroundColor: aeroAccentColor || '#0f172a' }
                  : isModernFont
                  ? undefined
                  : {
                      background: 'var(--accent-badge-gradient)',
                      color: 'var(--accent-badge-text, #09090B)',
                      boxShadow: '0 0 18px -2px rgba(var(--accent-rgb, 255, 255, 255), 0.42)',
                    }
              }
              className={
                isAero
                  ? 'w-full py-3.5 px-4 rounded-2xl text-white font-sans font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-md active:scale-95 transition-all'
                  : isFluentGlass
                  ? 'w-full py-3 px-4 rounded-2xl liquid-pill-active font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2'
                  : isBespoke
                  ? 'w-full py-3 px-4 rounded-md bg-blue-600 hover:bg-blue-500 text-white font-sans font-semibold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-colors duration-75'
                  : 'w-full py-3 px-4 rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all'
              }
            >
              {showGiftOffer ? (
                <>
                  {isModernFont ? <Ticket size={15} strokeWidth={1.75} /> : <Sparkles size={15} />}
                  <span>
                    {isModernFont
                      ? 'Create Profile & Claim +1 Free Ticket'
                      : 'Create Profile & Claim +1 Free 🎫'}
                  </span>
                </>
              ) : (
                <>
                  <UserCheck size={15} strokeWidth={isFluentGlass ? 1.75 : 2} />
                  <span>Save Interactive Profile</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={onClose}
              className={
                isAero
                  ? 'w-full py-2.5 rounded-2xl bg-white border border-[#CBD5E1] text-[#475569] hover:text-[#0f172a] hover:bg-[#F8FAFC] text-xs font-bold transition-colors shadow-2xs'
                  : isFluentGlass
                  ? 'w-full py-2.5 rounded-2xl liquid-pill text-zinc-300 hover:text-white text-xs font-medium'
                  : isBespoke
                  ? 'w-full py-2.5 rounded-md bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white hover:border-neutral-600 text-xs font-medium transition-colors duration-75'
                  : 'w-full py-2.5 rounded-xl obsidian-inset-neutral text-zinc-300 hover:text-white text-xs font-bold transition-colors'
              }
            >
              {mode === 'welcome' ? 'Maybe Later' : 'Cancel'}
            </button>
          </>
        }
      />
    </div>
  );
};
