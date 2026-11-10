import type {
  ActiveLockSession,
  NativeEnvironmentSecurity,
  NativePermissionStatus,
  OccasionBag,
  ParachuteLedgerEntry,
  ParachuteMetrics,
  ParachuteRewardEvent,
  RecurringSchedule,
  SessionRecord,
  SessionTag,
  SleepFarmingMode,
  ThemeConfig,
  ThemeStyle,
  VerifiedNativeCompletionEvent,
  ZeroBackupPayload,
  ZeroProfile,
  ZeroZbakPayload,
} from '../../types';

// ============================================================================
// ISOLATED CORE INTEGRITY CONSTANTS (Read-Only / Frozen)
// ============================================================================

export const SECONDS_PER_PARACHUTE = 72000; // 20 Hours exactly
export const FIRST_DONATION_BONUS_INR = 50;
export const ZBAK_FILE_NAME = 'zero-backup.zbak';
export const ZBAK_PREFIX = 'ZBAK1';
export const ZDON_PREFIX = 'ZDON1';
export const WEEKLY_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export const NATIVE_MONOTONIC_SOURCE = 'android_elapsed_realtime';

const MAX_BONUS_PARACHUTES = 2; // Strictly 1 starter profile gift + 1 first ₹50+ tip gift

// Protected storage keys — written EXCLUSIVELY by IntegrityEngine
const PROTECTED_STORAGE_KEYS = Object.freeze({
  CUMULATIVE_PARACHUTE_SECONDS: 'zero_cumulative_parachute_seconds_v3',
  TOTAL_RECLAIMED_SECONDS: 'zero_total_reclaimed_seconds_v3',
  USED_PARACHUTES: 'zero_used_parachutes_v3',
  BONUS_PARACHUTES: 'zero_bonus_parachutes_v1',
  CLAIMED_FIRST_TIME_PARACHUTE: 'zero_claimed_first_time_parachute_v1',
  CLAIMED_FIRST_DONATION_PARACHUTE: 'zero_claimed_first_donation_parachute_v1',
  CONSUMED_NATIVE_EVENTS: 'zero_consumed_native_events_v1',
  SESSIONS: 'zero_sessions_history_v3',
  LEDGER: 'zero_parachute_ledger_v3',
  SEED_PURGE_FLAG: 'zero_seed_purged_v4',
});

// Domain-separated offline HMAC & obfuscation secrets
const ZBAK_HMAC_SECRET = 'ZERO::FOSS::ZBAK1::HMAC::INTG::v1::org.zero.detox';
const ZBAK_STREAM_SECRET = 'ZERO::FOSS::ZBAK1::MASK::KEY::v1::org.zero.detox';
const ZDON_HMAC_SECRET = 'ZERO::FOSS::ZDON1::DONOR::UNLOCK::v1::org.zero.detox';
const NATIVE_EVENT_HMAC_SECRET = 'ZERO::FOSS::NATIVE::MONOTONIC::v1::org.zero.detox';

// ============================================================================
// CRYPTOGRAPHIC PRIMITIVES (SHA-256, HMAC-SHA256, BASE64URL, TIMING-SAFE EQ)
// ============================================================================

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', { fatal: true });

function rotr(value: number, bits: number): number {
  return (value >>> bits) | (value << (32 - bits));
}

export function sha256Bytes(input: Uint8Array): Uint8Array {
  const len = input.length;
  const bitLenHi = Math.floor((len * 8) / 0x100000000);
  const bitLenLo = (len * 8) >>> 0;

  const paddedLen = Math.ceil((len + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(input, 0);
  padded[len] = 0x80;

  const view = new DataView(padded.buffer);
  view.setUint32(paddedLen - 8, bitLenHi, false);
  view.setUint32(paddedLen - 4, bitLenLo, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < paddedLen; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  outView.setUint32(0, h0, false);
  outView.setUint32(4, h1, false);
  outView.setUint32(8, h2, false);
  outView.setUint32(12, h3, false);
  outView.setUint32(16, h4, false);
  outView.setUint32(20, h5, false);
  outView.setUint32(24, h6, false);
  outView.setUint32(28, h7, false);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (let i = 0; i < bytes.length; i++) {
    hex += bytes[i].toString(16).padStart(2, '0');
  }
  return hex;
}

export function hmacSha256Hex(keyStr: string, messageStr: string): string {
  const blockSize = 64;
  let keyBytes: Uint8Array = textEncoder.encode(keyStr);
  if (keyBytes.length > blockSize) {
    keyBytes = sha256Bytes(keyBytes);
  }
  const paddedKey = new Uint8Array(blockSize);
  paddedKey.set(keyBytes, 0);

  const oKeyPad = new Uint8Array(blockSize);
  const iKeyPad = new Uint8Array(blockSize);
  for (let i = 0; i < blockSize; i++) {
    oKeyPad[i] = paddedKey[i] ^ 0x5c;
    iKeyPad[i] = paddedKey[i] ^ 0x36;
  }

  const msgBytes = textEncoder.encode(messageStr);
  const innerInput = new Uint8Array(blockSize + msgBytes.length);
  innerInput.set(iKeyPad, 0);
  innerInput.set(msgBytes, blockSize);
  const innerHash = sha256Bytes(innerInput);

  const outerInput = new Uint8Array(blockSize + innerHash.length);
  outerInput.set(oKeyPad, 0);
  outerInput.set(innerHash, blockSize);
  return bytesToHex(sha256Bytes(outerInput));
}

export function timingSafeEqualHex(a: string, b: string): boolean {
  const normA = a.toLowerCase();
  const normB = b.toLowerCase();
  if (normA.length !== normB.length) return false;
  let diff = 0;
  for (let i = 0; i < normA.length; i++) {
    diff |= normA.charCodeAt(i) ^ normB.charCodeAt(i);
  }
  return diff === 0;
}

export function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLen);
  const binary = atob(padded);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

function generateSaltBytes(length = 12): Uint8Array {
  const out = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(out);
    return out;
  }
  for (let i = 0; i < length; i++) {
    out[i] = Math.floor(Math.random() * 256);
  }
  return out;
}

function applyXorKeystream(data: Uint8Array, salt: Uint8Array): Uint8Array {
  const secretBytes = textEncoder.encode(ZBAK_STREAM_SECRET);
  const out = new Uint8Array(data.length);
  const blockCount = Math.ceil(data.length / 32);

  for (let blockIdx = 0; blockIdx < blockCount; blockIdx++) {
    const seed = new Uint8Array(secretBytes.length + salt.length + 4);
    seed.set(secretBytes, 0);
    seed.set(salt, secretBytes.length);
    const dv = new DataView(seed.buffer);
    dv.setUint32(secretBytes.length + salt.length, blockIdx, false);

    const keystreamBlock = sha256Bytes(seed);
    const start = blockIdx * 32;
    const end = Math.min(data.length, start + 32);
    for (let i = start; i < end; i++) {
      out[i] = data[i] ^ keystreamBlock[i - start];
    }
  }
  return out;
}

// ============================================================================
// .ZBAK ARCHIVE & ZDON1 DONOR TOKEN CODEC + SIGNATURE VERIFICATION
// ============================================================================

export function encodeZbakPayload(payload: ZeroZbakPayload): string {
  const json = JSON.stringify(payload);
  const plainBytes = textEncoder.encode(json);
  const salt = generateSaltBytes(12);
  const cipherBytes = applyXorKeystream(plainBytes, salt);

  const saltB64 = toBase64Url(salt);
  const cipherB64 = toBase64Url(cipherBytes);
  const body = `${ZBAK_PREFIX}.${saltB64}.${cipherB64}`;
  const macHex = hmacSha256Hex(ZBAK_HMAC_SECRET, body);
  return `${body}.${macHex}`;
}

export function decodeAndVerifyZbak(
  rawText: string
): { ok: true; payload: ZeroZbakPayload } | { ok: false; error: string } {
  if (typeof rawText !== 'string' || !rawText.trim()) {
    return { ok: false, error: 'Selected .zbak backup file is empty.' };
  }

  const cleaned = rawText.replace(/\s+/g, '');
  const parts = cleaned.split('.');
  if (parts.length !== 4 || parts[0] !== ZBAK_PREFIX) {
    return {
      ok: false,
      error: 'Unrecognized backup format. Expected a valid zero-backup.zbak (ZBAK1) archive.',
    };
  }

  const [, saltB64, cipherB64, providedMac] = parts;
  if (!saltB64 || !cipherB64 || !/^[0-9a-f]{64}$/i.test(providedMac)) {
    return {
      ok: false,
      error: 'Corrupted .zbak envelope structure or invalid HMAC signature.',
    };
  }

  const body = `${ZBAK_PREFIX}.${saltB64}.${cipherB64}`;
  const expectedMac = hmacSha256Hex(ZBAK_HMAC_SECRET, body);
  if (!timingSafeEqualHex(providedMac, expectedMac)) {
    return {
      ok: false,
      error:
        'Checksum verification failed (SHA-256 HMAC mismatch). This .zbak file was altered or corrupted and cannot be restored.',
    };
  }

  try {
    const salt = fromBase64Url(saltB64);
    const cipherBytes = fromBase64Url(cipherB64);
    const plainBytes = applyXorKeystream(cipherBytes, salt);
    const jsonStr = textDecoder.decode(plainBytes);
    const parsed = JSON.parse(jsonStr) as Partial<ZeroZbakPayload>;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.schema !== 'zero.zbak.v1' ||
      parsed.appName !== 'Zero' ||
      typeof parsed.cumulativeSeconds !== 'number' ||
      typeof parsed.usedParachutes !== 'number' ||
      typeof parsed.bonusParachutes !== 'number' ||
      !Number.isFinite(parsed.cumulativeSeconds) ||
      !Number.isFinite(parsed.usedParachutes) ||
      !Number.isFinite(parsed.bonusParachutes) ||
      parsed.cumulativeSeconds < 0 ||
      parsed.usedParachutes < 0 ||
      parsed.bonusParachutes < 0 ||
      (typeof parsed.totalReclaimedSeconds === 'number' &&
        (!Number.isFinite(parsed.totalReclaimedSeconds) || parsed.totalReclaimedSeconds < 0))
    ) {
      return {
        ok: false,
        error: 'Verified .zbak payload is missing or has invalid Zero backup fields.',
      };
    }

    const cumSecs = Math.round(parsed.cumulativeSeconds);
    const used = Math.round(parsed.usedParachutes);
    const bonus = Math.round(parsed.bonusParachutes);
    const maxGiftAllowed =
      (parsed.hasClaimedFirstTimeParachute ? 1 : 0) +
      (parsed.hasClaimedFirstDonationParachute ? 1 : 0);

    if (bonus > MAX_BONUS_PARACHUTES || bonus > maxGiftAllowed + 0.001) {
      return {
        ok: false,
        error: 'Backup ticket integrity check failed (bonus ticket count out of bounds).',
      };
    }

    const expectedRemaining = Math.max(
      0,
      Math.floor(cumSecs / SECONDS_PER_PARACHUTE) + bonus - used
    );
    if (
      typeof parsed.remainingEscapeTickets === 'number' &&
      parsed.remainingEscapeTickets !== expectedRemaining
    ) {
      return {
        ok: false,
        error: 'Backup escape ticket balance mismatch detected.',
      };
    }

    return { ok: true, payload: parsed as ZeroZbakPayload };
  } catch {
    return {
      ok: false,
      error: 'Failed to decode .zbak archive contents.',
    };
  }
}

export function isWeeklyBackupDue(
  autoBackupEnabled: boolean,
  lastBackupTimestamp: number,
  nowMs: number = Date.now()
): boolean {
  if (autoBackupEnabled) return false;
  if (!Number.isFinite(lastBackupTimestamp) || lastBackupTimestamp <= 0) return true;
  return nowMs - lastBackupTimestamp > WEEKLY_BACKUP_INTERVAL_MS;
}

export interface ZeroDonorTokenPayload {
  schema: 'zero.donor.v1';
  email: string;
  tier: 'zero_supporter';
  minInr: number;
  issuedAt: string;
  receiptRef?: string;
}

export function encodeDonorUnlockToken(input: {
  email: string;
  minInr?: number;
  receiptRef?: string;
  issuedAt?: string;
}): string {
  const cleanedEmail = input.email.trim().toLowerCase();
  const safeMinInr = Math.max(
    FIRST_DONATION_BONUS_INR,
    Math.round(Number(input.minInr ?? FIRST_DONATION_BONUS_INR))
  );
  const payload: ZeroDonorTokenPayload = {
    schema: 'zero.donor.v1',
    email: cleanedEmail,
    tier: 'zero_supporter',
    minInr: safeMinInr,
    issuedAt: input.issuedAt || new Date().toISOString(),
    ...(input.receiptRef?.trim() ? { receiptRef: input.receiptRef.trim() } : {}),
  };

  const payloadB64 = toBase64Url(textEncoder.encode(JSON.stringify(payload)));
  const body = `${ZDON_PREFIX}.${payloadB64}`;
  const mac = hmacSha256Hex(ZDON_HMAC_SECRET, body);
  return `${body}.${mac}`;
}

export function verifyDonorUnlockToken(
  rawToken: string
): { ok: true; payload: ZeroDonorTokenPayload } | { ok: false; error: string } {
  if (typeof rawToken !== 'string' || !rawToken.trim()) {
    return { ok: false, error: 'Enter a signed unlock token (ZDON1...) or .zbak backup token.' };
  }

  const cleaned = rawToken.replace(/\s+/g, '');
  const parts = cleaned.split('.');
  if (parts.length !== 3 || parts[0] !== ZDON_PREFIX) {
    return {
      ok: false,
      error:
        'Unrecognized unlock token format. Expected a signed ZDON1 donor token or ZBAK1 cloud backup string.',
    };
  }

  const [, payloadB64, providedMac] = parts;
  if (!payloadB64 || !/^[0-9a-f]{64}$/i.test(providedMac)) {
    return {
      ok: false,
      error: 'Invalid donor unlock token structure or malformed SHA-256 signature.',
    };
  }

  const body = `${ZDON_PREFIX}.${payloadB64}`;
  const expectedMac = hmacSha256Hex(ZDON_HMAC_SECRET, body);
  if (!timingSafeEqualHex(providedMac, expectedMac)) {
    return {
      ok: false,
      error:
        'Signature check failed for this unlock token. Double-check the token or contact mdyousuf982007@proton.me with your Ko-fi receipt.',
    };
  }

  try {
    const rawJson = textDecoder.decode(fromBase64Url(payloadB64));
    const parsed = JSON.parse(rawJson) as Partial<ZeroDonorTokenPayload>;

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      parsed.schema !== 'zero.donor.v1' ||
      parsed.tier !== 'zero_supporter' ||
      typeof parsed.email !== 'string' ||
      !parsed.email.includes('@') ||
      typeof parsed.minInr !== 'number' ||
      !Number.isFinite(parsed.minInr) ||
      parsed.minInr < FIRST_DONATION_BONUS_INR
    ) {
      return {
        ok: false,
        error: 'Unlock token payload is incomplete or does not meet the ₹50 supporter threshold.',
      };
    }

    return { ok: true, payload: parsed as ZeroDonorTokenPayload };
  } catch {
    return {
      ok: false,
      error: 'Could not decode donor unlock token payload.',
    };
  }
}

// ============================================================================
// ESCAPE TICKET & ACHIEVEMENT BADGE EVALUATION (READ-ONLY)
// ============================================================================

export type AchievementBadgeId =
  | 'zero_supporter'
  | 'getting_started_1h'
  | 'woo_nice_50h'
  | 'long_way_100h'
  | 'getting_disciplined_250h'
  | 'full_control_500h'
  | 'came_so_far_1000h';

export type BadgeTierColor =
  | 'gold'
  | 'emerald'
  | 'cyan'
  | 'indigo'
  | 'amber'
  | 'rose'
  | 'platinum';

export interface AchievementDefinition {
  id: AchievementBadgeId;
  title: string;
  requirementLabel: string;
  description: string;
  kind: 'supporter' | 'single_session_hours' | 'total_hours';
  thresholdHours: number;
  tierColor: BadgeTierColor;
}

export interface EvaluatedBadge extends AchievementDefinition {
  unlocked: boolean;
  progressPct: number;
  progressText: string;
}

export interface BadgeEvaluationSummary {
  badges: EvaluatedBadge[];
  unlockedBadges: EvaluatedBadge[];
  isZeroSupporter: boolean;
  effectiveTotalHours: number;
  maxCompletedSessionHours: number;
}

export const ACHIEVEMENT_DEFINITIONS: AchievementDefinition[] = [
  Object.freeze({
    id: 'zero_supporter',
    title: 'ZERO-SUPPORTER',
    requirementLabel: 'Min ₹50 1st Tip',
    description:
      'Golden crest unlocked strictly after your 1st tip of minimum ₹50 (also gifts +1 Escape Ticket).',
    kind: 'supporter',
    thresholdHours: 0,
    tierColor: 'gold',
  }),
  Object.freeze({
    id: 'getting_started_1h',
    title: 'GETTING STARTED',
    requirementLabel: '1st 1h Session',
    description: 'Completed your first 1-hour (or longer) distraction-free lock session.',
    kind: 'single_session_hours',
    thresholdHours: 1,
    tierColor: 'emerald',
  }),
  Object.freeze({
    id: 'woo_nice_50h',
    title: 'WOO NICE!',
    requirementLabel: '50h Focus',
    description: 'Reclaimed 50 cumulative phone-free hours across completed sessions.',
    kind: 'total_hours',
    thresholdHours: 50,
    tierColor: 'cyan',
  }),
  Object.freeze({
    id: 'long_way_100h',
    title: 'LONG WAY',
    requirementLabel: '100h Focus',
    description: 'Crossed 100 cumulative hours of phone-free discipline.',
    kind: 'total_hours',
    thresholdHours: 100,
    tierColor: 'indigo',
  }),
  Object.freeze({
    id: 'getting_disciplined_250h',
    title: 'GETTING DISCIPLINED',
    requirementLabel: '250h Focus',
    description: 'Forged 250 hours of reclaimed focus away from screen distractions.',
    kind: 'total_hours',
    thresholdHours: 250,
    tierColor: 'amber',
  }),
  Object.freeze({
    id: 'full_control_500h',
    title: 'FULL CONTROL !',
    requirementLabel: '500h Focus',
    description: 'Completed 500 hours phone-free. Habits obey intent.',
    kind: 'total_hours',
    thresholdHours: 500,
    tierColor: 'rose',
  }),
  Object.freeze({
    id: 'came_so_far_1000h',
    title: 'CAME SO FAR',
    requirementLabel: '1000h Focus',
    description: 'Reclaimed 1,000+ hours of real life from algorithmic noise.',
    kind: 'total_hours',
    thresholdHours: 1000,
    tierColor: 'platinum',
  }),
];
Object.freeze(ACHIEVEMENT_DEFINITIONS);

export function computeParachuteBalance(input: {
  cumulativeSeconds: number;
  bonusParachutes: number;
  usedParachutes: number;
}): {
  earnedFromHours: number;
  bonusParachutes: number;
  lifetimeEarned: number;
  currentBalance: number;
} {
  const safeCumulative = Math.max(0, Math.floor(input.cumulativeSeconds || 0));
  const safeBonus = Math.min(MAX_BONUS_PARACHUTES, Math.max(0, Math.floor(input.bonusParachutes || 0)));
  const safeUsed = Math.max(0, Math.floor(input.usedParachutes || 0));
  const earnedFromHours = Math.floor(safeCumulative / SECONDS_PER_PARACHUTE);
  const lifetimeEarned = earnedFromHours + safeBonus;
  const currentBalance = Math.max(0, lifetimeEarned - safeUsed);

  return {
    earnedFromHours,
    bonusParachutes: safeBonus,
    lifetimeEarned,
    currentBalance,
  };
}

export function evaluateBadges(input: {
  sessions: SessionRecord[];
  totalReclaimedHours: number;
  isZeroSupporter: boolean;
}): BadgeEvaluationSummary {
  const completed = input.sessions.filter((s) => s.status === 'completed');
  const maxSessionSeconds = completed.reduce(
    (max, s) => Math.max(max, Math.max(0, s.durationSeconds || 0)),
    0
  );
  const completedHoursFromSessions =
    completed.reduce((sum, s) => sum + Math.max(0, s.durationSeconds || 0), 0) / 3600;

  const maxCompletedSessionHours = Number((maxSessionSeconds / 3600).toFixed(2));
  const effectiveTotalHours = Math.max(
    0,
    Math.max(Number(input.totalReclaimedHours) || 0, completedHoursFromSessions)
  );

  const badges: EvaluatedBadge[] = ACHIEVEMENT_DEFINITIONS.map((def) => {
    if (def.kind === 'supporter') {
      return {
        ...def,
        unlocked: Boolean(input.isZeroSupporter),
        progressPct: input.isZeroSupporter ? 100 : 0,
        progressText: input.isZeroSupporter ? 'Unlocked' : 'Min ₹50 1st tip unlocks gold crest',
      };
    }

    if (def.kind === 'single_session_hours') {
      const unlocked = maxSessionSeconds >= def.thresholdHours * 3600;
      const pct = unlocked
        ? 100
        : Math.min(99, Math.round((maxSessionSeconds / (def.thresholdHours * 3600)) * 100));
      return {
        ...def,
        unlocked,
        progressPct: pct,
        progressText: unlocked
          ? 'Unlocked'
          : `Best lock: ${Math.floor(maxSessionSeconds / 60)}m / 60m`,
      };
    }

    const unlocked = effectiveTotalHours >= def.thresholdHours;
    const pct = unlocked
      ? 100
      : Math.min(99, Math.round((effectiveTotalHours / def.thresholdHours) * 100));
    const displayCur = Number(effectiveTotalHours.toFixed(1));
    return {
      ...def,
      unlocked,
      progressPct: pct,
      progressText: unlocked ? 'Unlocked' : `${displayCur}h / ${def.thresholdHours}h`,
    };
  });

  const unlockedBadges = badges.filter((b) => b.unlocked);

  return {
    badges,
    unlockedBadges,
    isZeroSupporter: Boolean(input.isZeroSupporter),
    effectiveTotalHours: Number(effectiveTotalHours.toFixed(1)),
    maxCompletedSessionHours,
  };
}

// ============================================================================
// PROTECTED INTEGRITY STATE & STRICT MONOTONIC EVENT VERIFICATION
// ============================================================================

export interface ProtectedIntegrityState {
  cumulativeSeconds: number;
  totalReclaimedSeconds: number;
  usedParachutes: number;
  bonusParachutes: number;
  hasClaimedFirstTimeParachute: boolean;
  hasClaimedFirstDonationParachute: boolean;
  isZeroSupporter: boolean;
  sessions: SessionRecord[];
  ledger: ParachuteLedgerEntry[];
  consumedNativeEventIds: string[];
}

export interface SessionMutationResult {
  state: ProtectedIntegrityState;
  acceptedEventIds: string[];
  rejectedEventIds: string[];
  committedSessions: SessionRecord[];
  rewards: Omit<ParachuteRewardEvent, 'id'>[];
}

export interface RestoreInputPayload {
  rawInput: string;
  defaultSchedules: RecurringSchedule[];
  defaultBags: OccasionBag[];
  sanitizeProfile: (p: Partial<ZeroProfile>) => ZeroProfile | null;
  sanitizeThemeConfig: (raw: Partial<ThemeConfig> | null | undefined, legacy?: ThemeStyle) => ThemeConfig;
  environmentSecurity?: NativeEnvironmentSecurity;
}

export interface VerifiedRestoreOutcome {
  ok: boolean;
  message: string;
  state?: ProtectedIntegrityState;
  profile?: ZeroProfile | null;
  schedules?: RecurringSchedule[];
  bags?: OccasionBag[];
  activeBagId?: string;
  themeConfig?: ThemeConfig;
  sleepFarmingMode?: SleepFarmingMode;
  restoredAtMs?: number;
}

function getSleepMultiplier(tag: SessionTag, mode: SleepFarmingMode): number {
  if (tag !== 'Sleep') return 1.0;
  if (mode === 'quarter_credit') return 0.25;
  if (mode === 'daytime_only') return 0.0;
  return 1.0;
}

function createEmptyProtectedState(): ProtectedIntegrityState {
  return {
    cumulativeSeconds: 0,
    totalReclaimedSeconds: 0,
    usedParachutes: 0,
    bonusParachutes: 0,
    hasClaimedFirstTimeParachute: false,
    hasClaimedFirstDonationParachute: false,
    isZeroSupporter: false,
    sessions: [],
    ledger: [],
    consumedNativeEventIds: [],
  };
}

function sanitizeStoredState(raw: Partial<ProtectedIntegrityState>): ProtectedIntegrityState {
  const claimedFirstTime = Boolean(raw.hasClaimedFirstTimeParachute);
  const claimedFirstDonation = Boolean(raw.hasClaimedFirstDonationParachute);
  const maxAllowedBonus = (claimedFirstTime ? 1 : 0) + (claimedFirstDonation ? 1 : 0);
  const rawBonus = Math.max(0, Math.floor(Number(raw.bonusParachutes) || 0));

  return {
    cumulativeSeconds: Math.max(0, Math.round(Number(raw.cumulativeSeconds) || 0)),
    totalReclaimedSeconds: Math.max(0, Math.round(Number(raw.totalReclaimedSeconds) || 0)),
    usedParachutes: Math.max(0, Math.floor(Number(raw.usedParachutes) || 0)),
    bonusParachutes: Math.min(MAX_BONUS_PARACHUTES, maxAllowedBonus, rawBonus),
    hasClaimedFirstTimeParachute: claimedFirstTime,
    hasClaimedFirstDonationParachute: claimedFirstDonation,
    isZeroSupporter: claimedFirstDonation,
    sessions: Array.isArray(raw.sessions) ? [...raw.sessions] : [],
    ledger: Array.isArray(raw.ledger) ? [...raw.ledger] : [],
    consumedNativeEventIds: Array.isArray(raw.consumedNativeEventIds)
      ? raw.consumedNativeEventIds.slice(-500)
      : [],
  };
}

function persistProtectedState(state: ProtectedIntegrityState): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(
    PROTECTED_STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS,
    String(state.cumulativeSeconds)
  );
  localStorage.setItem(
    PROTECTED_STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS,
    String(state.totalReclaimedSeconds)
  );
  localStorage.setItem(PROTECTED_STORAGE_KEYS.USED_PARACHUTES, String(state.usedParachutes));
  localStorage.setItem(PROTECTED_STORAGE_KEYS.BONUS_PARACHUTES, String(state.bonusParachutes));
  localStorage.setItem(
    PROTECTED_STORAGE_KEYS.CLAIMED_FIRST_TIME_PARACHUTE,
    state.hasClaimedFirstTimeParachute ? '1' : '0'
  );
  localStorage.setItem(
    PROTECTED_STORAGE_KEYS.CLAIMED_FIRST_DONATION_PARACHUTE,
    state.hasClaimedFirstDonationParachute ? '1' : '0'
  );
  localStorage.setItem(
    PROTECTED_STORAGE_KEYS.CONSUMED_NATIVE_EVENTS,
    JSON.stringify(state.consumedNativeEventIds.slice(-500))
  );
  localStorage.setItem(PROTECTED_STORAGE_KEYS.SESSIONS, JSON.stringify(state.sessions));
  localStorage.setItem(PROTECTED_STORAGE_KEYS.LEDGER, JSON.stringify(state.ledger));
  localStorage.setItem(PROTECTED_STORAGE_KEYS.SEED_PURGE_FLAG, '1');
}

function purgeLegacyDummySeedsIfNeeded(): void {
  if (typeof localStorage === 'undefined') return;
  if (localStorage.getItem(PROTECTED_STORAGE_KEYS.SEED_PURGE_FLAG) === '1') return;

  try {
    const rawSessions = localStorage.getItem(PROTECTED_STORAGE_KEYS.SESSIONS);
    const rawLedger = localStorage.getItem(PROTECTED_STORAGE_KEYS.LEDGER);
    const parsedSessions: SessionRecord[] = rawSessions ? JSON.parse(rawSessions) : [];
    const parsedLedger: ParachuteLedgerEntry[] = rawLedger ? JSON.parse(rawLedger) : [];

    const hasFakeSeeds = parsedSessions.some((s) => s.id.startsWith('seed_sess_'));
    const hasFakeInitLedger = parsedLedger.some((l) => l.id === 'txn_init_1');

    if (hasFakeSeeds || hasFakeInitLedger) {
      const realSessions = parsedSessions.filter((s) => !s.id.startsWith('seed_sess_'));
      const realLedger = parsedLedger.filter((l) => l.id !== 'txn_init_1');
      const realCumulative = realSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.earnedParachuteSeconds || 0), 0);
      const realReclaimed = realSessions
        .filter((s) => s.status === 'completed')
        .reduce((acc, s) => acc + (s.durationSeconds || 0), 0);

      localStorage.setItem(PROTECTED_STORAGE_KEYS.SESSIONS, JSON.stringify(realSessions));
      localStorage.setItem(PROTECTED_STORAGE_KEYS.LEDGER, JSON.stringify(realLedger));
      localStorage.setItem(
        PROTECTED_STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS,
        String(realCumulative)
      );
      localStorage.setItem(PROTECTED_STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS, String(realReclaimed));
      if (realSessions.length === 0) {
        localStorage.setItem(PROTECTED_STORAGE_KEYS.USED_PARACHUTES, '0');
      }
    }
  } catch {
    // Ignore parse edge cases
  } finally {
    localStorage.setItem(PROTECTED_STORAGE_KEYS.SEED_PURGE_FLAG, '1');
  }
}

function loadProtectedState(): ProtectedIntegrityState {
  if (typeof localStorage === 'undefined') {
    return createEmptyProtectedState();
  }
  purgeLegacyDummySeedsIfNeeded();

  let sessions: SessionRecord[] = [];
  let ledger: ParachuteLedgerEntry[] = [];
  let consumedNativeEventIds: string[] = [];
  try {
    const rawSessions = localStorage.getItem(PROTECTED_STORAGE_KEYS.SESSIONS);
    sessions = rawSessions ? (JSON.parse(rawSessions) as SessionRecord[]) : [];
  } catch {
    sessions = [];
  }
  try {
    const rawLedger = localStorage.getItem(PROTECTED_STORAGE_KEYS.LEDGER);
    ledger = rawLedger ? (JSON.parse(rawLedger) as ParachuteLedgerEntry[]) : [];
  } catch {
    ledger = [];
  }
  try {
    const rawConsumed = localStorage.getItem(PROTECTED_STORAGE_KEYS.CONSUMED_NATIVE_EVENTS);
    consumedNativeEventIds = rawConsumed ? (JSON.parse(rawConsumed) as string[]) : [];
  } catch {
    consumedNativeEventIds = [];
  }

  const claimedFirstTime =
    localStorage.getItem(PROTECTED_STORAGE_KEYS.CLAIMED_FIRST_TIME_PARACHUTE) === '1';
  const claimedFirstDonation =
    localStorage.getItem(PROTECTED_STORAGE_KEYS.CLAIMED_FIRST_DONATION_PARACHUTE) === '1';

  return sanitizeStoredState({
    cumulativeSeconds: Number(
      localStorage.getItem(PROTECTED_STORAGE_KEYS.CUMULATIVE_PARACHUTE_SECONDS) || '0'
    ),
    totalReclaimedSeconds: Number(
      localStorage.getItem(PROTECTED_STORAGE_KEYS.TOTAL_RECLAIMED_SECONDS) || '0'
    ),
    usedParachutes: Number(localStorage.getItem(PROTECTED_STORAGE_KEYS.USED_PARACHUTES) || '0'),
    bonusParachutes: Number(localStorage.getItem(PROTECTED_STORAGE_KEYS.BONUS_PARACHUTES) || '0'),
    hasClaimedFirstTimeParachute: claimedFirstTime,
    hasClaimedFirstDonationParachute: claimedFirstDonation,
    isZeroSupporter: claimedFirstDonation,
    sessions,
    ledger,
    consumedNativeEventIds,
  });
}

export function computeNativeCompletionProofDigest(input: {
  eventId: string;
  sessionId: string;
  tag: string;
  startTime: number;
  endTime: number;
  durationSeconds: number;
  elapsedMonotonicMs: number;
  usedRebootFallback: boolean;
}): string {
  const rebootFlag = input.usedRebootFallback ? 1 : 0;
  const canonical = `ZERO::NATIVE::v1|${input.eventId}|${input.sessionId}|${input.tag}|${input.startTime}|${input.endTime}|${input.durationSeconds}|${input.elapsedMonotonicMs}|${rebootFlag}`;
  return hmacSha256Hex(NATIVE_EVENT_HMAC_SECRET, canonical);
}

export function verifyNativeCompletionEvent(
  event: VerifiedNativeCompletionEvent
): { ok: true } | { ok: false; reason: string } {
  if (!event || typeof event !== 'object') {
    return { ok: false, reason: 'Malformed native completion event' };
  }
  if (!event.eventId || typeof event.eventId !== 'string') {
    return { ok: false, reason: 'Missing native eventId' };
  }
  if (!event.sessionId || typeof event.sessionId !== 'string') {
    return { ok: false, reason: 'Missing native sessionId' };
  }
  if (event.monotonicSource !== NATIVE_MONOTONIC_SOURCE) {
    return { ok: false, reason: 'Untrusted clock source (requires SystemClock.elapsedRealtime())' };
  }
  if (
    typeof event.durationSeconds !== 'number' ||
    !Number.isFinite(event.durationSeconds) ||
    event.durationSeconds <= 0
  ) {
    return { ok: false, reason: 'Invalid session durationSeconds' };
  }
  if (
    typeof event.elapsedMonotonicMs !== 'number' ||
    !Number.isFinite(event.elapsedMonotonicMs) ||
    event.elapsedMonotonicMs < 0
  ) {
    return { ok: false, reason: 'Invalid monotonic elapsed duration' };
  }
  if (!event.usedRebootFallback && event.elapsedMonotonicMs < event.durationSeconds * 1000) {
    return {
      ok: false,
      reason: 'Monotonic elapsedRealtime is less than locked session duration (possible spoof)',
    };
  }
  if (!event.proofDigest || !/^[0-9a-f]{64}$/i.test(event.proofDigest)) {
    return { ok: false, reason: 'Missing or invalid native HMAC proofDigest' };
  }

  const expected = computeNativeCompletionProofDigest({
    eventId: event.eventId,
    sessionId: event.sessionId,
    tag: event.tag,
    startTime: event.startTime,
    endTime: event.endTime,
    durationSeconds: event.durationSeconds,
    elapsedMonotonicMs: event.elapsedMonotonicMs,
    usedRebootFallback: Boolean(event.usedRebootFallback),
  });

  if (!timingSafeEqualHex(event.proofDigest, expected)) {
    return { ok: false, reason: 'Native completion HMAC proof mismatch' };
  }
  return { ok: true };
}

function appendVerifiedCompletedSession(
  state: ProtectedIntegrityState,
  input: {
    sessionId: string;
    tag: SessionTag;
    startTime: number;
    endTime: number;
    durationSeconds: number;
    sleepFarmingMode: SleepFarmingMode;
    eventIdForReplayGuard?: string;
  }
): {
  nextState: ProtectedIntegrityState;
  committedSession: SessionRecord;
  rewards: Omit<ParachuteRewardEvent, 'id'>[];
} {
  const safeDuration = Math.max(0, Math.round(input.durationSeconds));
  const multiplier = getSleepMultiplier(input.tag, input.sleepFarmingMode);
  const earnedParachuteSecs = Math.round(safeDuration * multiplier);
  const dateStr = new Date(input.endTime).toISOString().split('T')[0];

  const newSession: SessionRecord = {
    id: input.sessionId,
    startTime: input.startTime,
    endTime: input.endTime,
    durationSeconds: safeDuration,
    earnedParachuteSeconds: earnedParachuteSecs,
    weightMultiplier: multiplier,
    tag: input.tag,
    status: 'completed',
    dateStr,
  };

  const prevTotal = state.cumulativeSeconds;
  const newTotal = prevTotal + earnedParachuteSecs;
  const prevMilestones = Math.floor(prevTotal / SECONDS_PER_PARACHUTE);
  const newMilestones = Math.floor(newTotal / SECONDS_PER_PARACHUTE);

  const nextLedger = [...state.ledger];
  const rewards: Omit<ParachuteRewardEvent, 'id'>[] = [];

  if (newMilestones > prevMilestones) {
    const delta = newMilestones - prevMilestones;
    const updatedBalance = computeParachuteBalance({
      cumulativeSeconds: newTotal,
      bonusParachutes: state.bonusParachutes,
      usedParachutes: state.usedParachutes,
    }).currentBalance;

    nextLedger.unshift({
      id: `txn_${input.endTime}`,
      timestamp: input.endTime,
      type: 'EARNED',
      description: `20-Hour Milestone reached! (+${delta} Emergency Escape Ticket earned)`,
      delta,
      tag: input.tag,
      note:
        input.tag === 'Sleep'
          ? `Completed Sleep session (credited at ${multiplier}x rate)`
          : 'Full daytime focus credit',
    });

    rewards.push({
      source: 'milestone_20h',
      delta,
      newBalance: updatedBalance,
      title: delta > 1 ? `+${delta} Escape Tickets Earned!` : '20h Milestone Escape Ticket!',
      subtitle: `You completed 20 cumulative hours of phone-free discipline in #${input.tag}.`,
    });
  }

  const nextConsumed = input.eventIdForReplayGuard
    ? [...state.consumedNativeEventIds, input.eventIdForReplayGuard].slice(-500)
    : state.consumedNativeEventIds;

  const nextState: ProtectedIntegrityState = {
    ...state,
    cumulativeSeconds: newTotal,
    totalReclaimedSeconds: state.totalReclaimedSeconds + safeDuration,
    sessions: [newSession, ...state.sessions],
    ledger: nextLedger,
    consumedNativeEventIds: nextConsumed,
  };

  return { nextState, committedSession: newSession, rewards };
}

function commitNativeSessionCompletions(
  currentState: ProtectedIntegrityState,
  events: VerifiedNativeCompletionEvent[],
  sleepFarmingMode: SleepFarmingMode,
  persist = true
): SessionMutationResult {
  let working = currentState;
  const acceptedEventIds: string[] = [];
  const rejectedEventIds: string[] = [];
  const committedSessions: SessionRecord[] = [];
  const rewards: Omit<ParachuteRewardEvent, 'id'>[] = [];

  const consumedSet = new Set(working.consumedNativeEventIds);

  for (const ev of events) {
    if (!ev?.eventId || consumedSet.has(ev.eventId)) {
      if (ev?.eventId) acceptedEventIds.push(ev.eventId); // Already processed; safe to ack natively
      continue;
    }

    const check = verifyNativeCompletionEvent(ev);
    if (!check.ok) {
      rejectedEventIds.push(ev.eventId);
      continue;
    }

    consumedSet.add(ev.eventId);
    const applied = appendVerifiedCompletedSession(working, {
      sessionId: ev.sessionId || `sess_${ev.endTime}`,
      tag: ev.tag || 'Deep Work',
      startTime: ev.startTime,
      endTime: ev.endTime,
      durationSeconds: ev.durationSeconds,
      sleepFarmingMode,
      eventIdForReplayGuard: ev.eventId,
    });
    working = applied.nextState;
    acceptedEventIds.push(ev.eventId);
    committedSessions.push(applied.committedSession);
    rewards.push(...applied.rewards);
  }

  if (persist && committedSessions.length > 0) {
    persistProtectedState(working);
  }

  return {
    state: working,
    acceptedEventIds,
    rejectedEventIds,
    committedSessions,
    rewards,
  };
}

/**
 * Web Preview fallback completion — STRICTLY forbidden on Native Android platforms!
 * Enforces monotonic browser clock (performance.now()) during live tab sessions so
 * system clock tampering cannot spoof focus minutes even in web preview.
 */
function commitWebPreviewSessionCompletion(
  currentState: ProtectedIntegrityState,
  input: {
    lock: ActiveLockSession;
    sleepFarmingMode: SleepFarmingMode;
    isNativeAndroid: boolean;
    startPerfMs: number | null;
    nowPerfMs: number;
    nowWallMs?: number;
  },
  persist = true
):
  | { ok: true; state: ProtectedIntegrityState; committedSession: SessionRecord; rewards: Omit<ParachuteRewardEvent, 'id'>[] }
  | { ok: false; error: string } {
  if (input.isNativeAndroid) {
    return {
      ok: false,
      error: 'Native Android sessions can only increment focus stats via verified SystemClock.elapsedRealtime() events.',
    };
  }
  if (!input.lock.isLocked || input.lock.durationSeconds <= 0) {
    return { ok: false, error: 'No active locked session to complete.' };
  }

  const nowWall = input.nowWallMs ?? Date.now();
  const requiredMs = input.lock.durationSeconds * 1000;

  if (input.startPerfMs !== null && Number.isFinite(input.startPerfMs)) {
    const monotonicElapsedMs = input.nowPerfMs - input.startPerfMs;
    if (monotonicElapsedMs < requiredMs - 250) {
      return {
        ok: false,
        error: 'Monotonic Web Preview timer has not completed the required focus duration yet.',
      };
    }
  } else if (nowWall < input.lock.targetEndTime) {
    return { ok: false, error: 'Target completion time has not been reached.' };
  }

  const applied = appendVerifiedCompletedSession(currentState, {
    sessionId: `sess_${nowWall}`,
    tag: input.lock.tag,
    startTime: input.lock.startTime,
    endTime: nowWall,
    durationSeconds: input.lock.durationSeconds,
    sleepFarmingMode: input.sleepFarmingMode,
  });

  if (persist) {
    persistProtectedState(applied.nextState);
  }

  return {
    ok: true,
    state: applied.nextState,
    committedSession: applied.committedSession,
    rewards: applied.rewards,
  };
}

/**
 * Emergency Escape Ticket Deduction:
 * - Requires currentBalance >= 1
 * - Consumes 1 ticket via usedParachutes + 1
 * - STRICT ANTI-EXPLOIT RULE: Elapsed time in the aborted session is VOIDED (0s earned)
 */
function commitEscapeTicketAbort(
  currentState: ProtectedIntegrityState,
  input: {
    tag: SessionTag;
    startTime: number;
    durationSeconds: number;
    elapsedSeconds: number;
    nowWallMs?: number;
  },
  persist = true
): { ok: true; state: ProtectedIntegrityState } | { ok: false; error: string } {
  const balance = computeParachuteBalance({
    cumulativeSeconds: currentState.cumulativeSeconds,
    bonusParachutes: currentState.bonusParachutes,
    usedParachutes: currentState.usedParachutes,
  }).currentBalance;

  if (balance < 1) {
    return { ok: false, error: '0 Emergency Escape Tickets available.' };
  }

  const now = input.nowWallMs ?? Date.now();
  const dateStr = new Date(now).toISOString().split('T')[0];
  const elapsedMinutes = Math.max(1, Math.floor(Math.max(0, input.elapsedSeconds) / 60));

  const abortedSession: SessionRecord = {
    id: `sess_aborted_${now}`,
    startTime: input.startTime,
    endTime: now,
    durationSeconds: Math.max(0, Math.round(input.durationSeconds)),
    earnedParachuteSeconds: 0,
    weightMultiplier: 0,
    tag: input.tag,
    status: 'parachuted',
    dateStr,
  };

  const newEntry: ParachuteLedgerEntry = {
    id: `txn_${now}`,
    timestamp: now,
    type: 'DEPLOYED',
    description: `Emergency Escape Ticket used (${input.tag} session aborted at ${elapsedMinutes}m)`,
    delta: -1,
    tag: input.tag,
    note: 'Aborted Session Penalty: 0h credited toward Escape Ticket progression (anti-exploit).',
  };

  const nextState: ProtectedIntegrityState = {
    ...currentState,
    usedParachutes: currentState.usedParachutes + 1,
    sessions: [abortedSession, ...currentState.sessions],
    ledger: [newEntry, ...currentState.ledger],
  };

  if (persist) {
    persistProtectedState(nextState);
  }

  return { ok: true, state: nextState };
}

function claimFirstTimerProfileGift(
  currentState: ProtectedIntegrityState,
  profile: ZeroProfile,
  persist = true
): {
  granted: boolean;
  state: ProtectedIntegrityState;
  reward: Omit<ParachuteRewardEvent, 'id'> | null;
} {
  if (currentState.hasClaimedFirstTimeParachute) {
    return { granted: false, state: currentState, reward: null };
  }

  const nextBonus = Math.min(MAX_BONUS_PARACHUTES, currentState.bonusParachutes + 1);
  const now = Date.now();
  const newBalance = computeParachuteBalance({
    cumulativeSeconds: currentState.cumulativeSeconds,
    bonusParachutes: nextBonus,
    usedParachutes: currentState.usedParachutes,
  }).currentBalance;

  const entry: ParachuteLedgerEntry = {
    id: `txn_welcome_${now}`,
    timestamp: now,
    type: 'EARNED',
    description: 'First-Timer Profile Gift: Starter Emergency Escape Ticket (+1 Free)',
    delta: 1,
    tag: 'Onboarding',
    note: `Profile created for ${profile.handle}`,
  };

  const nextState: ProtectedIntegrityState = {
    ...currentState,
    bonusParachutes: nextBonus,
    hasClaimedFirstTimeParachute: true,
    ledger: [entry, ...currentState.ledger],
  };

  if (persist) {
    persistProtectedState(nextState);
  }

  return {
    granted: true,
    state: nextState,
    reward: {
      source: 'first_timer_profile',
      delta: 1,
      newBalance,
      title: 'Starter Escape Ticket Unlocked!',
      subtitle: `Welcome aboard, ${profile.displayName}! Your first free Emergency Escape Ticket is armed in your vault.`,
    },
  };
}

function claimFirstDonationSupporterPerks(
  currentState: ProtectedIntegrityState,
  persist = true
): {
  granted: boolean;
  state: ProtectedIntegrityState;
  reward: Omit<ParachuteRewardEvent, 'id'> | null;
} {
  if (currentState.hasClaimedFirstDonationParachute) {
    return { granted: false, state: currentState, reward: null };
  }

  const nextBonus = Math.min(MAX_BONUS_PARACHUTES, currentState.bonusParachutes + 1);
  const now = Date.now();
  const newBalance = computeParachuteBalance({
    cumulativeSeconds: currentState.cumulativeSeconds,
    bonusParachutes: nextBonus,
    usedParachutes: currentState.usedParachutes,
  }).currentBalance;

  const entry: ParachuteLedgerEntry = {
    id: `txn_supporter_${now}`,
    timestamp: now,
    type: 'EARNED',
    description: `First ₹${FIRST_DONATION_BONUS_INR}+ Supporter Bonus (+1 Free Escape Ticket & Gold Badge)`,
    delta: 1,
    tag: 'Support',
    note: 'One-time gratitude reward: +1 Escape Ticket & Golden ZERO-SUPPORTER Badge unlocked',
  };

  const nextState: ProtectedIntegrityState = {
    ...currentState,
    bonusParachutes: nextBonus,
    hasClaimedFirstDonationParachute: true,
    isZeroSupporter: true,
    ledger: [entry, ...currentState.ledger],
  };

  if (persist) {
    persistProtectedState(nextState);
  }

  return {
    granted: true,
    state: nextState,
    reward: {
      source: 'first_donation_50',
      delta: 1,
      newBalance,
      title: 'Thank-You Escape Ticket Unlocked!',
      subtitle: `Thank you for supporting Zero with ₹${FIRST_DONATION_BONUS_INR}+! +1 bonus Escape Ticket & your Golden ZERO-SUPPORTER Badge are unlocked.`,
    },
  };
}

function activateDonorUnlockToken(
  currentState: ProtectedIntegrityState,
  rawToken: string,
  persist = true
): {
  ok: boolean;
  message: string;
  email?: string;
  grantedNewPerks: boolean;
  state: ProtectedIntegrityState;
  reward: Omit<ParachuteRewardEvent, 'id'> | null;
} {
  const verified = verifyDonorUnlockToken(rawToken);
  if (!verified.ok) {
    return {
      ok: false,
      message: verified.error,
      grantedNewPerks: false,
      state: currentState,
      reward: null,
    };
  }

  if (currentState.hasClaimedFirstDonationParachute) {
    return {
      ok: true,
      email: verified.payload.email,
      grantedNewPerks: false,
      state: currentState,
      reward: null,
      message: `Token verified for ${verified.payload.email}. Your ZERO-SUPPORTER Gold Badge & Escape Ticket gift are already active!`,
    };
  }

  const claim = claimFirstDonationSupporterPerks(currentState, persist);
  return {
    ok: true,
    email: verified.payload.email,
    grantedNewPerks: claim.granted,
    state: claim.state,
    reward: claim.reward,
    message: claim.granted
      ? `Verified ${verified.payload.email}! Unlocked ZERO-SUPPORTER Golden Badge & +1 Free Emergency Escape Ticket.`
      : `Donor token verified for ${verified.payload.email}. ZERO-SUPPORTER Golden Badge is active.`,
  };
}

export const DEFAULT_SAFE_ENVIRONMENT_SECURITY: NativeEnvironmentSecurity = Object.freeze({
  isSignatureValid: true,
  isRooted: false,
  isEmulator: false,
  isCompromised: false,
  restrictions: Object.freeze({
    backupRestoreDisabled: false,
    presetBagEditingDisabled: false,
  }),
  reasons: Object.freeze([]) as unknown as string[],
}) as NativeEnvironmentSecurity;

export function parseEnvironmentSecurityJson(
  rawJson: string | null | undefined
): NativeEnvironmentSecurity {
  if (typeof rawJson !== 'string' || !rawJson.trim()) {
    return DEFAULT_SAFE_ENVIRONMENT_SECURITY;
  }
  try {
    const parsed = JSON.parse(rawJson) as Partial<NativeEnvironmentSecurity>;
    const isSignatureValid = parsed.isSignatureValid !== false;
    const isRooted = Boolean(parsed.isRooted);
    const isEmulator = Boolean(parsed.isEmulator);
    const isCompromised =
      Boolean(parsed.isCompromised) || !isSignatureValid || isRooted || isEmulator;
    const backupRestoreDisabled =
      Boolean(parsed.restrictions?.backupRestoreDisabled) || isCompromised;
    const presetBagEditingDisabled =
      Boolean(parsed.restrictions?.presetBagEditingDisabled) || isCompromised;
    const reasons = Array.isArray(parsed.reasons)
      ? parsed.reasons.filter((r): r is string => typeof r === 'string')
      : [];

    return {
      isSignatureValid,
      isRooted,
      isEmulator,
      isCompromised,
      restrictions: {
        backupRestoreDisabled,
        presetBagEditingDisabled,
      },
      reasons,
    };
  } catch {
    return {
      isSignatureValid: false,
      isRooted: false,
      isEmulator: false,
      isCompromised: true,
      restrictions: {
        backupRestoreDisabled: true,
        presetBagEditingDisabled: true,
      },
      reasons: ['invalid_security_json'],
    };
  }
}

export function isSensitiveFeatureRestricted(
  env: NativeEnvironmentSecurity | null | undefined
): boolean {
  if (!env) return false;
  return Boolean(
    env.isCompromised ||
      env.isRooted ||
      env.isEmulator ||
      !env.isSignatureValid ||
      env.restrictions?.backupRestoreDisabled ||
      env.restrictions?.presetBagEditingDisabled
  );
}

function applyVerifiedRestore(input: RestoreInputPayload, persist = true): VerifiedRestoreOutcome {
  if (isSensitiveFeatureRestricted(input.environmentSecurity)) {
    return {
      ok: false,
      message:
        'Backup restore is disabled on rooted devices, custom test-keys ROMs, or debug emulators to protect ZERO integrity.',
    };
  }

  try {
    const trimmed = input.rawInput.trim();
    if (!trimmed) {
      return { ok: false, message: 'Selected backup file is empty.' };
    }

    let parsed: Partial<ZeroBackupPayload> & { isZeroSupporter?: boolean };
    if (!trimmed.startsWith('{')) {
      const decoded = decodeAndVerifyZbak(trimmed);
      if (!decoded.ok) {
        return { ok: false, message: decoded.error };
      }
      parsed = decoded.payload;
    } else {
      parsed = JSON.parse(trimmed) as Partial<ZeroBackupPayload>;
    }

    if (typeof parsed !== 'object' || parsed === null) {
      return { ok: false, message: 'Invalid backup file format.' };
    }
    if (
      typeof parsed.cumulativeSeconds !== 'number' ||
      !Number.isFinite(parsed.cumulativeSeconds) ||
      parsed.cumulativeSeconds < 0 ||
      !Array.isArray(parsed.sessions) ||
      !Array.isArray(parsed.ledger)
    ) {
      return {
        ok: false,
        message: 'Missing or invalid required Zero fields (cumulativeSeconds, sessions, ledger).',
      };
    }

    const nextCumulative = Math.max(0, Math.round(parsed.cumulativeSeconds));
    const nextReclaimed =
      typeof parsed.totalReclaimedSeconds === 'number' &&
      Number.isFinite(parsed.totalReclaimedSeconds)
        ? Math.max(0, Math.round(parsed.totalReclaimedSeconds))
        : nextCumulative;
    const nextUsed =
      typeof parsed.usedParachutes === 'number' && Number.isFinite(parsed.usedParachutes)
        ? Math.max(0, Math.round(parsed.usedParachutes))
        : 0;

    const nextProfile = parsed.profile ? input.sanitizeProfile(parsed.profile) : null;
    const rawBonus =
      typeof parsed.bonusParachutes === 'number' && Number.isFinite(parsed.bonusParachutes)
        ? Math.max(0, Math.round(parsed.bonusParachutes))
        : 0;
    const nextFirstTimeFlag =
      Boolean(parsed.hasClaimedFirstTimeParachute) || Boolean(nextProfile && rawBonus > 0);
    const nextClaimedFirstDonation = Boolean(
      parsed.hasClaimedFirstDonationParachute ?? parsed.isZeroSupporter
    );
    const minBonusFromFlags =
      (nextFirstTimeFlag ? 1 : 0) + (nextClaimedFirstDonation ? 1 : 0);
    const nextBonus = Math.min(MAX_BONUS_PARACHUTES, Math.max(minBonusFromFlags, rawBonus));

    const nextSessions = parsed.sessions.slice(0, 5000);
    const nextLedger = parsed.ledger.slice(0, 1000);
    const nextSchedules = Array.isArray(parsed.schedules)
      ? parsed.schedules
      : input.defaultSchedules;
    const nextBags =
      Array.isArray(parsed.bags) && parsed.bags.length > 0
        ? parsed.bags.slice(0, 4).map((b, i) => ({
            id: b.id || `bag-${i + 1}`,
            name: (b.name || `Bag ${i + 1}`).slice(0, 28),
            occasionLabel: (b.occasionLabel || 'Custom Occasion').slice(0, 40),
            apps: Array.isArray(b.apps) ? b.apps.slice(0, 3) : [],
            allowCalls: Boolean(b.allowCalls),
            allowSms: Boolean(b.allowSms),
          }))
        : input.defaultBags;
    const nextActiveBagId =
      parsed.activeBagId && nextBags.some((b) => b.id === parsed.activeBagId)
        ? parsed.activeBagId
        : nextBags[0].id;
    const nextThemeConfig = input.sanitizeThemeConfig(parsed.themeConfig, parsed.theme || 'amoled');
    const nextSleepMode: SleepFarmingMode = parsed.sleepFarmingMode || 'quarter_credit';
    const restoredNow = Date.now();

    const nextState: ProtectedIntegrityState = sanitizeStoredState({
      cumulativeSeconds: nextCumulative,
      totalReclaimedSeconds: nextReclaimed,
      usedParachutes: nextUsed,
      bonusParachutes: nextBonus,
      hasClaimedFirstTimeParachute: nextFirstTimeFlag,
      hasClaimedFirstDonationParachute: nextClaimedFirstDonation,
      isZeroSupporter: nextClaimedFirstDonation,
      sessions: nextSessions,
      ledger: nextLedger,
      consumedNativeEventIds: [],
    });

    if (persist) {
      persistProtectedState(nextState);
    }

    const restoredHours = (nextReclaimed / 3600).toFixed(1);
    const donorNote = nextClaimedFirstDonation ? ' + ZERO-SUPPORTER Gold Badge' : '';
    return {
      ok: true,
      message: `Restored ${nextSessions.length} sessions (${restoredHours}h reclaimed), ${nextBags.length} Bags${donorNote}.`,
      state: nextState,
      profile: nextProfile,
      schedules: nextSchedules,
      bags: nextBags,
      activeBagId: nextActiveBagId,
      themeConfig: nextThemeConfig,
      sleepFarmingMode: nextSleepMode,
      restoredAtMs: restoredNow,
    };
  } catch {
    return {
      ok: false,
      message: 'Could not read backup. Make sure you selected a valid .zbak or .json file.',
    };
  }
}

function resetProtectedState(persist = true): ProtectedIntegrityState {
  const empty = createEmptyProtectedState();
  if (persist) {
    persistProtectedState(empty);
  }
  return empty;
}

function computeParachuteMetrics(
  state: ProtectedIntegrityState,
  sleepFarmingMode: SleepFarmingMode
): ParachuteMetrics {
  const balanceSnapshot = computeParachuteBalance({
    cumulativeSeconds: state.cumulativeSeconds,
    bonusParachutes: state.bonusParachutes,
    usedParachutes: state.usedParachutes,
  });
  const currentProgressSeconds = state.cumulativeSeconds % SECONDS_PER_PARACHUTE;
  return {
    totalCumulativeSeconds: state.cumulativeSeconds,
    totalCumulativeHours: Number((state.cumulativeSeconds / 3600).toFixed(1)),
    totalReclaimedHours: Number((state.totalReclaimedSeconds / 3600).toFixed(1)),
    lifetimeEarnedParachutes: balanceSnapshot.lifetimeEarned,
    bonusParachutes: state.bonusParachutes,
    deployedParachutes: state.usedParachutes,
    currentBalance: balanceSnapshot.currentBalance,
    currentProgressSeconds,
    currentProgressHours: Number((currentProgressSeconds / 3600).toFixed(1)),
    hoursUntilNextParachute: Number(
      ((SECONDS_PER_PARACHUTE - currentProgressSeconds) / 3600).toFixed(1)
    ),
    progressPercentage: Math.min(
      100,
      Number(((currentProgressSeconds / SECONDS_PER_PARACHUTE) * 100).toFixed(1))
    ),
    sleepFarmingMode,
  };
}

function computeCurrentStreak(sessions: SessionRecord[]): number {
  const completed = sessions.filter((s) => s.status === 'completed');
  if (completed.length === 0) return 0;
  const completedDates = new Set(completed.map((s) => s.dateStr));
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const str = d.toISOString().split('T')[0];
    if (completedDates.has(str)) {
      streak++;
    } else if (i === 0) {
      continue;
    } else {
      break;
    }
  }
  return streak;
}

function buildZbakPayload(input: {
  state: ProtectedIntegrityState;
  bags: OccasionBag[];
  activeBagId: string;
  schedules: RecurringSchedule[];
  sleepFarmingMode: SleepFarmingMode;
  theme: ThemeStyle;
  themeConfig: ThemeConfig;
  profile: ZeroProfile | null;
}): ZeroZbakPayload {
  const now = Date.now();
  const { state } = input;
  const completedCount = state.sessions.filter((s) => s.status === 'completed').length;
  const liveBalance = computeParachuteBalance({
    cumulativeSeconds: state.cumulativeSeconds,
    bonusParachutes: state.bonusParachutes,
    usedParachutes: state.usedParachutes,
  }).currentBalance;
  const reclaimedHours = Number((state.totalReclaimedSeconds / 3600).toFixed(1));
  const badges = evaluateBadges({
    sessions: state.sessions,
    totalReclaimedHours: reclaimedHours,
    isZeroSupporter: state.isZeroSupporter,
  });

  return {
    schema: 'zero.zbak.v1',
    appName: 'Zero',
    exportedAt: new Date(now).toISOString(),
    exportedAtMs: now,
    onboardingComplete: true,
    cumulativeSeconds: state.cumulativeSeconds,
    totalReclaimedSeconds: state.totalReclaimedSeconds,
    totalCompletedSessions: completedCount,
    currentStreak: computeCurrentStreak(state.sessions),
    usedParachutes: state.usedParachutes,
    bonusParachutes: state.bonusParachutes,
    remainingEscapeTickets: liveBalance,
    hasClaimedFirstTimeParachute: state.hasClaimedFirstTimeParachute,
    hasClaimedFirstDonationParachute: state.hasClaimedFirstDonationParachute,
    isZeroSupporter: state.isZeroSupporter,
    unlockedBadgeIds: badges.unlockedBadges.map((b) => b.id),
    bags: input.bags,
    activeBagId: input.activeBagId,
    schedules: input.schedules,
    sleepFarmingMode: input.sleepFarmingMode,
    theme: input.theme,
    themeConfig: input.themeConfig,
    profile: input.profile,
    sessions: state.sessions.slice(0, 1000),
    ledger: state.ledger.slice(0, 300),
  };
}

function canAcceptNativeStateSync(perms: NativePermissionStatus): boolean {
  return Boolean(perms.isNativeAndroid);
}

// ============================================================================
// HARDCODED ALLOWED DESTINATIONS (ANTI-EXFILTRATION & ENDPOINT ALLOWLIST)
// ============================================================================

export const OFFICIAL_KOFI_URL = 'https://ko-fi.com/mdyousuf2620';
export const OFFICIAL_SUPPORT_EMAIL = 'mdyousuf982007@proton.me';
export const OFFICIAL_GITHUB_REPO_URL = 'https://github.com/MDYOUSUF20007-oss/ZERO';
export const OFFICIAL_GITHUB_RELEASES_URL = 'https://github.com/MDYOUSUF20007-oss/ZERO/releases';
export const OFFICIAL_PAGES_URL = 'https://mdyousuf20007-oss.github.io/ZERO';
export const OFFICIAL_UPI_ID = 'md.y2007@ptaxis';

export const HARDCODED_CLOUD_SAF_DESTINATIONS = Object.freeze([
  Object.freeze({
    id: 'google_drive',
    label: 'Google Drive',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.google.android.apps.docs',
  }),
  Object.freeze({
    id: 'onedrive',
    label: 'Microsoft OneDrive',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.microsoft.skydrive',
  }),
  Object.freeze({
    id: 'jiodrive',
    label: 'JioDrive / JioCloud',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.ril.jio',
  }),
  Object.freeze({
    id: 'dropbox',
    label: 'Dropbox',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.dropbox.android',
  }),
  Object.freeze({
    id: 'local_external_storage',
    label: 'Device Storage (SAF)',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.android.externalstorage.documents',
  }),
  Object.freeze({
    id: 'local_downloads',
    label: 'Downloads (SAF)',
    intentAction: 'android.intent.action.CREATE_DOCUMENT',
    authorityPrefix: 'com.android.providers.downloads.documents',
  }),
  Object.freeze({
    id: 'web_file_handle',
    label: 'Local Browser File Handle',
    intentAction: 'showSaveFilePicker',
    authorityPrefix: 'web-handle://',
  }),
]);

const BLOCKED_SAF_AUTHORITIES = new Set([
  'settings',
  'com.android.providers.settings',
  'contacts',
  'com.android.contacts',
  'telephony',
  'sms',
  'mms',
  'mms-sms',
  'call_log',
  'icc',
  'media_playback',
  'org.zero.detox',
  'org.zero.detox.fileprovider',
]);

export function isAllowedBackupUri(rawUri: string | null | undefined): boolean {
  if (typeof rawUri !== 'string') return false;
  const trimmed = rawUri.trim();
  if (!trimmed || /[\r\n\t]/.test(trimmed) || trimmed.includes('..')) {
    return false;
  }

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('web-handle://')) {
    const rest = trimmed.slice('web-handle://'.length);
    return rest.length > 0 && !rest.includes('http://') && !rest.includes('https://');
  }

  if (!lower.startsWith('content://')) {
    return false;
  }

  const withoutScheme = trimmed.slice('content://'.length);
  const slashIdx = withoutScheme.indexOf('/');
  if (slashIdx <= 0) return false;
  const authority = withoutScheme.slice(0, slashIdx);
  const docPath = withoutScheme.slice(slashIdx + 1);
  if (
    !authority ||
    !docPath.trim() ||
    authority.includes('@') ||
    !/^[A-Za-z0-9._:-]+$/.test(authority)
  ) {
    return false;
  }

  const lowerAuth = authority.toLowerCase();
  if (lowerAuth.startsWith('org.zero.detox') || BLOCKED_SAF_AUTHORITIES.has(lowerAuth)) {
    return false;
  }

  const lowerPath = docPath.toLowerCase();
  if (lowerPath.includes('http://') || lowerPath.includes('https://')) {
    return false;
  }

  return true;
}

export function isAllowedExternalUrl(rawUrl: string | null | undefined): boolean {
  if (typeof rawUrl !== 'string') return false;
  const trimmed = rawUrl.trim();
  if (!trimmed || /[\r\n]/.test(trimmed)) return false;

  const lower = trimmed.toLowerCase();
  if (lower.startsWith('https://')) {
    try {
      const parsed = new URL(trimmed);
      if (parsed.username || parsed.password || parsed.port) return false;
      const host = parsed.hostname.toLowerCase();
      const path = parsed.pathname || '';
      if (host === 'ko-fi.com') {
        const lp = path.toLowerCase();
        return lp === '/mdyousuf2620' || lp.startsWith('/mdyousuf2620/');
      }
      if (host === 'github.com') {
        const lp = path.toLowerCase();
        return lp === '/mdyousuf20007-oss/zero' || lp.startsWith('/mdyousuf20007-oss/zero/');
      }
      if (host === 'mdyousuf20007-oss.github.io') {
        const lp = path.toLowerCase();
        return lp === '/zero' || lp.startsWith('/zero/');
      }
      return false;
    } catch {
      return false;
    }
  }

  if (lower.startsWith('mailto:')) {
    const ssp = trimmed.slice('mailto:'.length);
    const qIdx = ssp.indexOf('?');
    const recipient = (qIdx >= 0 ? ssp.slice(0, qIdx) : ssp).trim();
    if (recipient.includes(',') || recipient.includes(';')) return false;
    if (recipient.toLowerCase() !== OFFICIAL_SUPPORT_EMAIL) return false;
    if (qIdx >= 0) {
      const query = ssp.slice(qIdx + 1);
      for (const pair of query.split('&')) {
        if (!pair) continue;
        const eqIdx = pair.indexOf('=');
        const key = (eqIdx >= 0 ? pair.slice(0, eqIdx) : pair).trim().toLowerCase();
        if (key === 'to' || key === 'cc' || key === 'bcc') {
          return false;
        }
      }
    }
    return true;
  }

  if (lower.startsWith('upi://pay?')) {
    const withoutScheme = trimmed.slice('upi://pay?'.length);
    if (withoutScheme.includes('@') === false) return false;
    const params = new URLSearchParams(withoutScheme);
    return params.get('pa') === OFFICIAL_UPI_ID;
  }

  return false;
}

// ============================================================================
// FROZEN READ-ONLY SINGLETON EXPORT — ZERO PUBLIC SETTERS EXPOSED TO UI
// ============================================================================

export const IntegrityEngine = Object.freeze({
  SECONDS_PER_PARACHUTE,
  FIRST_DONATION_BONUS_INR,
  NATIVE_MONOTONIC_SOURCE,
  ZBAK_FILE_NAME,
  ZBAK_PREFIX,
  ZDON_PREFIX,
  WEEKLY_BACKUP_INTERVAL_MS,
  OFFICIAL_KOFI_URL,
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_GITHUB_REPO_URL,
  OFFICIAL_GITHUB_RELEASES_URL,
  OFFICIAL_PAGES_URL,
  OFFICIAL_UPI_ID,
  HARDCODED_CLOUD_SAF_DESTINATIONS,
  isAllowedBackupUri,
  isAllowedExternalUrl,
  loadState: loadProtectedState,
  commitNativeSessionCompletions,
  commitWebPreviewSessionCompletion,
  commitEscapeTicketAbort,
  claimFirstTimerProfileGift,
  claimFirstDonationSupporterPerks,
  activateDonorUnlockToken,
  applyVerifiedRestore,
  resetProtectedState,
  verifyNativeCompletionEvent,
  computeNativeCompletionProofDigest,
  encodeZbakPayload,
  decodeAndVerifyZbak,
  encodeDonorUnlockToken,
  verifyDonorUnlockToken,
  isWeeklyBackupDue,
  computeParachuteBalance,
  computeParachuteMetrics,
  computeCurrentStreak,
  evaluateBadges,
  buildZbakPayload,
  encodeVerifiedZbakBackup: (input: Parameters<typeof buildZbakPayload>[0]): string =>
    encodeZbakPayload(buildZbakPayload(input)),
  buildLegacyBackupJson: (input: Parameters<typeof buildZbakPayload>[0]): string => {
    const payload: ZeroBackupPayload = {
      schemaVersion: 4,
      appName: 'Zero',
      exportedAt: new Date().toISOString(),
      cumulativeSeconds: input.state.cumulativeSeconds,
      totalReclaimedSeconds: input.state.totalReclaimedSeconds,
      usedParachutes: input.state.usedParachutes,
      bonusParachutes: input.state.bonusParachutes,
      hasClaimedFirstTimeParachute: input.state.hasClaimedFirstTimeParachute,
      hasClaimedFirstDonationParachute: input.state.hasClaimedFirstDonationParachute,
      profile: input.profile,
      sleepFarmingMode: input.sleepFarmingMode,
      ledger: input.state.ledger,
      sessions: input.state.sessions,
      schedules: input.schedules,
      bags: input.bags,
      activeBagId: input.activeBagId,
      theme: input.theme,
      themeConfig: input.themeConfig,
      onboardingComplete: true,
    };
    return JSON.stringify(payload, null, 2);
  },
  canAcceptNativeStateSync,
  DEFAULT_SAFE_ENVIRONMENT_SECURITY,
  parseEnvironmentSecurityJson,
  isSensitiveFeatureRestricted,
});
