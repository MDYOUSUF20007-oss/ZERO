import type { ProfileAccent, ProfileAvatarId, ZeroProfile } from '../types';
import {
  FIRST_DONATION_BONUS_INR,
  SECONDS_PER_PARACHUTE,
  computeParachuteBalance,
} from '../core/integrity/IntegrityEngine';

export { FIRST_DONATION_BONUS_INR, computeParachuteBalance };
export const SECONDS_PER_PARACHUTE_MILESTONE = SECONDS_PER_PARACHUTE;

export const VALID_AVATAR_IDS: ProfileAvatarId[] = [
  'monk',
  'void',
  'shield',
  'bolt',
  'owl',
  'flame',
];

export const VALID_PROFILE_ACCENTS: ProfileAccent[] = [
  'amber',
  'emerald',
  'white',
  'cyan',
];

export function claimFirstTimerProfileBonus(
  alreadyClaimed: boolean,
  currentBonusParachutes: number
): {
  granted: boolean;
  nextAlreadyClaimed: boolean;
  nextBonusParachutes: number;
} {
  const safeBonus = Math.min(2, Math.max(0, Math.floor(currentBonusParachutes || 0)));
  if (alreadyClaimed) {
    return {
      granted: false,
      nextAlreadyClaimed: true,
      nextBonusParachutes: safeBonus,
    };
  }
  return {
    granted: true,
    nextAlreadyClaimed: true,
    nextBonusParachutes: Math.min(2, safeBonus + 1),
  };
}

export function claimFirstDonationParachute(
  alreadyClaimed: boolean,
  currentBonusParachutes: number
): {
  granted: boolean;
  nextAlreadyClaimed: boolean;
  nextBonusParachutes: number;
} {
  const safeBonus = Math.min(2, Math.max(0, Math.floor(currentBonusParachutes || 0)));
  if (alreadyClaimed) {
    return {
      granted: false,
      nextAlreadyClaimed: true,
      nextBonusParachutes: safeBonus,
    };
  }
  return {
    granted: true,
    nextAlreadyClaimed: true,
    nextBonusParachutes: Math.min(2, safeBonus + 1),
  };
}

export function normalizeProfileHandle(displayName: string, rawHandle?: string): string {
  const source = (rawHandle || '').trim() || displayName.trim() || 'zeromonk';
  const cleaned = source
    .replace(/^@+/, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .slice(0, 18);
  return `@${cleaned || 'zeromonk'}`;
}

export function sanitizeZeroProfile(input: Partial<ZeroProfile>): ZeroProfile | null {
  const name = typeof input.displayName === 'string' ? input.displayName.trim().slice(0, 28) : '';
  if (!name) return null;

  const avatarId: ProfileAvatarId = VALID_AVATAR_IDS.includes(input.avatarId as ProfileAvatarId)
    ? (input.avatarId as ProfileAvatarId)
    : 'monk';
  const accentColor: ProfileAccent = VALID_PROFILE_ACCENTS.includes(input.accentColor as ProfileAccent)
    ? (input.accentColor as ProfileAccent)
    : 'amber';
  const primaryMission =
    typeof input.primaryMission === 'string' && input.primaryMission.trim()
      ? input.primaryMission.trim().slice(0, 32)
      : 'Deep Work';
  const dailyGoalHours =
    typeof input.dailyGoalHours === 'number' && Number.isFinite(input.dailyGoalHours)
      ? Math.min(12, Math.max(1, Math.round(input.dailyGoalHours)))
      : 4;
  const motto =
    typeof input.motto === 'string' && input.motto.trim()
      ? input.motto.trim().slice(0, 72)
      : 'Put your phone facedown. Reclaim your hours.';
  const now = Date.now();

  return {
    displayName: name,
    handle: normalizeProfileHandle(name, input.handle),
    avatarId,
    accentColor,
    primaryMission,
    dailyGoalHours,
    motto,
    createdAt:
      typeof input.createdAt === 'number' && input.createdAt > 0 ? input.createdAt : now,
    updatedAt: now,
  };
}

export function getZeroRankFromHours(reclaimedHours: number): {
  title: string;
  tier: number;
  nextTitle: string | null;
  hoursToNext: number;
} {
  const hrs = Math.max(0, reclaimedHours || 0);
  if (hrs < 1) {
    return {
      title: 'Initiate',
      tier: 1,
      nextTitle: 'Monk',
      hoursToNext: Number((1 - hrs).toFixed(1)),
    };
  }
  if (hrs < 10) {
    return {
      title: 'Monk',
      tier: 2,
      nextTitle: 'Stoic',
      hoursToNext: Number((10 - hrs).toFixed(1)),
    };
  }
  if (hrs < 50) {
    return {
      title: 'Stoic',
      tier: 3,
      nextTitle: 'Void Master',
      hoursToNext: Number((50 - hrs).toFixed(1)),
    };
  }
  return {
    title: 'Void Master',
    tier: 4,
    nextTitle: null,
    hoursToNext: 0,
  };
}
