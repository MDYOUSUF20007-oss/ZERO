import type { ZeroZbakPayload } from '../types';

export const ZBAK_FILE_NAME = 'zero-backup.zbak';
export const ZBAK_PREFIX = 'ZBAK1';
export const WEEKLY_BACKUP_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// App-bound domain-separated secrets for offline obfuscation & anti-cheat HMAC verification
const ZBAK_HMAC_SECRET = 'ZERO::FOSS::ZBAK1::HMAC::INTG::v1::org.zero.detox';
const ZBAK_STREAM_SECRET = 'ZERO::FOSS::ZBAK1::MASK::KEY::v1::org.zero.detox';

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

    // Cross-check internal escape ticket math so forged values fail consistency validation
    const cumSecs = Math.round(parsed.cumulativeSeconds);
    const used = Math.round(parsed.usedParachutes);
    const bonus = Math.round(parsed.bonusParachutes);
    const maxGiftAllowed =
      (parsed.hasClaimedFirstTimeParachute ? 1 : 0) +
      (parsed.hasClaimedFirstDonationParachute ? 1 : 0);

    if (bonus > 2 || bonus > maxGiftAllowed + 0.001) {
      return {
        ok: false,
        error: 'Backup ticket integrity check failed (bonus ticket count out of bounds).',
      };
    }

    const expectedRemaining = Math.max(0, Math.floor(cumSecs / 72000) + bonus - used);
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
