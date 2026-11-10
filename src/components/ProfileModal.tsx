import React, { useState, useEffect, useMemo } from 'react';
import type { ProfileAccent, ProfileAvatarId, SessionRecord, ZeroProfile } from '../types';
import {
  ACCENT_STYLES,
  AVATAR_OPTIONS,
  ProfileAvatar,
} from './ProfileAvatar';
import {
  getZeroRankFromHours,
  normalizeProfileHandle,
} from '../utils/parachuteRewardsPolicy';
import { evaluateBadges } from '../utils/achievements';
import { AchievementBadgePill, ZeroSupporterGoldenBadge } from './AchievementBadgeChip';
import { haptics } from '../utils/haptics';
import { Sparkles, X, Gift, UserCheck, Flame, Lock } from 'lucide-react';

interface ProfileModalProps {
  isOpen: boolean;
  mode: 'welcome' | 'edit';
  initialProfile: ZeroProfile | null;
  hasClaimedFirstTimeParachute: boolean;
  isZeroSupporter: boolean;
  sessions: SessionRecord[];
  totalReclaimedHours: number;
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
];

export const ProfileModal: React.FC<ProfileModalProps> = ({
  isOpen,
  mode,
  initialProfile,
  hasClaimedFirstTimeParachute,
  isZeroSupporter,
  sessions,
  totalReclaimedHours,
  onSaveProfile,
  onClose,
}) => {
  const [displayName, setDisplayName] = useState(initialProfile?.displayName || '');
  const [handleInput, setHandleInput] = useState(initialProfile?.handle || '');
  const [avatarId, setAvatarId] = useState<ProfileAvatarId>(initialProfile?.avatarId || 'monk');
  const [accentColor, setAccentColor] = useState<ProfileAccent>(
    initialProfile?.accentColor || 'amber'
  );
  const [primaryMission, setPrimaryMission] = useState(
    initialProfile?.primaryMission || 'Deep Work'
  );
  const [dailyGoalHours, setDailyGoalHours] = useState(initialProfile?.dailyGoalHours || 4);
  const [motto, setMotto] = useState(
    initialProfile?.motto || 'Put your phone facedown. Reclaim your hours.'
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setDisplayName(initialProfile?.displayName || '');
    setHandleInput(initialProfile?.handle || '');
    setAvatarId(initialProfile?.avatarId || 'monk');
    setAccentColor(initialProfile?.accentColor || 'amber');
    setPrimaryMission(initialProfile?.primaryMission || 'Deep Work');
    setDailyGoalHours(initialProfile?.dailyGoalHours || 4);
    setMotto(initialProfile?.motto || 'Put your phone facedown. Reclaim your hours.');
    setErrorMsg('');
  }, [isOpen, initialProfile]);

  const badgeSummary = useMemo(
    () =>
      evaluateBadges({
        sessions,
        totalReclaimedHours,
        isZeroSupporter,
      }),
    [sessions, totalReclaimedHours, isZeroSupporter]
  );

  if (!isOpen) return null;

  const unlockedFocusBadges = badgeSummary.unlockedBadges.filter(
    (b) => b.id !== 'zero_supporter'
  );
  const rank = getZeroRankFromHours(totalReclaimedHours);
  const accentStyle = ACCENT_STYLES[accentColor] || ACCENT_STYLES.amber;
  const previewName = displayName.trim() || 'Zero Monk';
  const previewHandle = normalizeProfileHandle(previewName, handleInput);
  const showGiftOffer = !hasClaimedFirstTimeParachute;

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
      accentColor,
      primaryMission,
      dailyGoalHours,
      motto,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center px-4"
      style={{
        paddingTop: 'calc(1rem + var(--zero-safe-top))',
        paddingBottom: 'calc(1rem + var(--zero-safe-bottom))',
      }}
    >
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-zinc-950 border-2 border-zinc-700 rounded-3xl p-5 shadow-2xl font-mono space-y-4 max-h-full overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            {showGiftOffer && (
              <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black uppercase tracking-wider mb-1.5 animate-pulse">
                <Gift size={11} />
                <span>
                  {mode === 'welcome'
                    ? 'First-Timer Special • +1 Free Escape Ticket'
                    : 'Profile Bonus • +1 Free Escape Ticket'}
                </span>
              </div>
            )}
            <h2 className="text-base font-black text-white tracking-tight">
              {initialProfile ? 'Interactive Zero Profile' : 'Create Interactive Profile'}
            </h2>
            <p className="text-[11px] text-zinc-400 mt-0.5">
              {showGiftOffer
                ? 'Set your avatar, mission & daily focus goal to claim your free starter Emergency Escape Ticket (🎫).'
                : 'Customize your focus identity, daily goal & lock pledge.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white shrink-0"
            aria-label="Close Profile Modal"
          >
            <X size={16} />
          </button>
        </div>

        {/* Live Interactive Profile Badge Preview */}
        <div
          className={`p-3.5 rounded-2xl bg-black border-2 transition-all ${accentStyle.border} ${accentStyle.glow}`}
        >
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <ProfileAvatar
                avatarId={avatarId}
                accent={accentColor}
                size="lg"
                interactive
              />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-black text-sm text-white truncate">
                    {previewName}
                  </span>
                  <span
                    className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${accentStyle.badgeBg}`}
                  >
                    {rank.title}
                  </span>
                  {isZeroSupporter && <ZeroSupporterGoldenBadge compact />}
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  {previewHandle} • #{primaryMission}
                </div>
                <div className="text-[10px] text-zinc-500 mt-0.5 italic truncate">
                  &ldquo;{motto.trim() || MOTTO_PRESETS[0]}&rdquo;
                </div>
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className={`text-sm font-black ${accentStyle.text}`}>
                {dailyGoalHours}h/day
              </div>
              <div className="text-[9px] text-zinc-500 uppercase">Target</div>
            </div>
          </div>

          {/* Unlocked Badges & Locked Gold Crest Hint Strip */}
          {unlockedFocusBadges.length > 0 && (
            <div className="mt-2.5 pt-2.5 border-t border-zinc-900 flex flex-wrap gap-1.5">
              {unlockedFocusBadges.map((b) => (
                <AchievementBadgePill key={b.id} badge={b} />
              ))}
            </div>
          )}
          {!isZeroSupporter && (
            <div className="mt-2 pt-2 border-t border-zinc-900 flex items-center gap-1.5 text-[10px] text-amber-300/90">
              <Lock size={10} className="shrink-0 text-amber-400" />
              <span>
                <strong>ZERO-SUPPORTER</strong> Gold Badge unlocks strictly after your 1st ₹50+ tip
                (min ₹50)
              </span>
            </div>
          )}
        </div>

        {/* Name & Handle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
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
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-white outline-none"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              @Handle (Optional)
            </label>
            <input
              type="text"
              value={handleInput}
              onChange={(e) => setHandleInput(e.target.value)}
              placeholder={normalizeProfileHandle(displayName)}
              maxLength={20}
              className="w-full bg-zinc-900 border border-zinc-700 focus:border-amber-400 rounded-xl px-3 py-2 text-xs text-zinc-200 outline-none"
            />
          </div>
        </div>

        {/* Avatar Emblem Picker */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
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
                  className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all ${
                    active
                      ? `${accentStyle.border} bg-zinc-900 text-white`
                      : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <ProfileAvatar avatarId={opt.id} accent={accentColor} size="sm" />
                  <span className="text-[10px] font-bold">{opt.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Accent Swatches */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Profile Accent
          </label>
          <div className="grid grid-cols-4 gap-2">
            {(Object.keys(ACCENT_STYLES) as ProfileAccent[]).map((key) => {
              const info = ACCENT_STYLES[key];
              const selected = accentColor === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    haptics.tick(760);
                    setAccentColor(key);
                  }}
                  className={`py-2 px-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
                    selected
                      ? `${info.border} bg-zinc-900 text-white`
                      : 'border-zinc-850 bg-black text-zinc-400 hover:border-zinc-700'
                  }`}
                >
                  <span className={`w-2.5 h-2.5 rounded-full ${info.bar}`} />
                  <span>{info.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mission Pills */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1.5">
            Primary Detox Mission
          </label>
          <div className="flex flex-wrap gap-1.5">
            {MISSION_PRESETS.map((mission) => (
              <button
                key={mission}
                type="button"
                onClick={() => {
                  haptics.tick(800);
                  setPrimaryMission(mission);
                }}
                className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border transition-all ${
                  primaryMission === mission
                    ? 'bg-zinc-200 text-black border-white'
                    : 'bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-zinc-200'
                }`}
              >
                #{mission}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Daily Focus Goal Slider */}
        <div className="p-3 rounded-2xl bg-zinc-900/70 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-zinc-300 flex items-center gap-1.5">
              <Flame size={13} className="text-amber-400" />
              <span>Daily Phone-Free Goal</span>
            </span>
            <span className={`font-black ${accentStyle.text}`}>
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
            className="w-full accent-amber-400 cursor-pointer"
          />
          <div className="flex justify-between text-[9px] text-zinc-500">
            <span>1h Light</span>
            <span>4h Balanced</span>
            <span>8h Monk</span>
            <span>12h Extreme</span>
          </div>
        </div>

        {/* Focus Pledge / Motto */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
            Personal Lock Pledge
          </label>
          <input
            type="text"
            value={motto}
            onChange={(e) => setMotto(e.target.value)}
            maxLength={72}
            placeholder="Your focus rule..."
            className="w-full bg-zinc-900 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white outline-none"
          />
          <div className="flex gap-1.5 flex-wrap">
            {MOTTO_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setMotto(preset)}
                className="text-[9px] px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="p-2.5 rounded-xl bg-red-950/60 border border-red-700/80 text-red-200 text-[11px]">
            {errorMsg}
          </div>
        )}

        {/* Submit / Claim CTA */}
        <div className="flex flex-col gap-2 pt-1">
          <button
            type="submit"
            className="w-full py-3 px-4 rounded-2xl bg-amber-400 hover:bg-amber-300 text-black font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 active:scale-95 transition-all"
          >
            {showGiftOffer ? (
              <>
                <Sparkles size={15} />
                <span>Create Profile &amp; Claim +1 Free 🎫</span>
              </>
            ) : (
              <>
                <UserCheck size={15} />
                <span>Save Interactive Profile</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-zinc-800 text-xs font-bold"
          >
            {mode === 'welcome' ? 'Maybe Later' : 'Cancel'}
          </button>
        </div>
      </form>
    </div>
  );
};
