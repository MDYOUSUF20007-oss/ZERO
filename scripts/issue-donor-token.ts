/**
 * Maintainer helper to issue an offline HMAC-signed ZDON1 donor unlock token
 * after manually verifying a Ko-fi receipt emailed to mdyousuf982007@proton.me.
 *
 * Usage:
 *   npx tsx scripts/issue-donor-token.ts supporter@example.com [KOFI-RECEIPT-ID] [MIN_INR]
 */
import { encodeDonorUnlockToken } from '../src/utils/donorUnlockToken.ts';

const [, , emailArg, receiptArg, minInrArg] = process.argv;

if (!emailArg || !emailArg.includes('@')) {
  console.error('Usage: npx tsx scripts/issue-donor-token.ts <supporter-email> [receipt-ref] [min-inr]');
  process.exit(1);
}

const minInr = minInrArg ? Number(minInrArg) : 50;
const token = encodeDonorUnlockToken({
  email: emailArg,
  receiptRef: receiptArg,
  minInr: Number.isFinite(minInr) ? minInr : 50,
});

console.log(token);
