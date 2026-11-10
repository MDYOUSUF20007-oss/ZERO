import {
  fromBase64Url,
  hmacSha256Hex,
  timingSafeEqualHex,
  toBase64Url,
} from './zbakCodec';
import { FIRST_DONATION_BONUS_INR } from './supportLinks';

export const ZDON_PREFIX = 'ZDON1';
const ZDON_HMAC_SECRET = 'ZERO::FOSS::ZDON1::DONOR::UNLOCK::v1::org.zero.detox';

const utf8Encoder = new TextEncoder();
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

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

  const payloadB64 = toBase64Url(utf8Encoder.encode(JSON.stringify(payload)));
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
    const rawJson = utf8Decoder.decode(fromBase64Url(payloadB64));
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
