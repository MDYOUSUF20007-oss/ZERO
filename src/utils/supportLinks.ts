import type React from 'react';
import {
  IntegrityEngine,
  OFFICIAL_GITHUB_RELEASES_URL,
  OFFICIAL_GITHUB_REPO_URL,
  OFFICIAL_KOFI_URL,
  OFFICIAL_SUPPORT_EMAIL,
  OFFICIAL_UPI_ID,
} from '../core/integrity/IntegrityEngine';

export const KOFI_URL = OFFICIAL_KOFI_URL;
export const SUPPORT_EMAIL = OFFICIAL_SUPPORT_EMAIL;
export const SUPPORT_MAILTO_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ZERO Ko-fi Donor Verification')}`;
export const RELEASES_URL = OFFICIAL_GITHUB_RELEASES_URL;
export const SOURCE_URL = OFFICIAL_GITHUB_REPO_URL;
export const UPI_ID = OFFICIAL_UPI_ID;
export const FIRST_DONATION_BONUS_INR = IntegrityEngine.FIRST_DONATION_BONUS_INR;
export const UPI_PAY_URL = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('Zero FOSS')}&cu=INR`;
export const UPI_FIFTY_RS_PAY_URL = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('Zero FOSS')}&am=${FIRST_DONATION_BONUS_INR}&cu=INR`;

export function handleOpenExternalUrl(e: React.MouseEvent, url: string): void {
  if (!IntegrityEngine.isAllowedExternalUrl(url)) {
    e.preventDefault();
    return;
  }
  if (typeof window !== 'undefined' && window.ZeroNative?.openExternalUrl) {
    e.preventDefault();
    window.ZeroNative.openExternalUrl(url);
  }
}

export async function copyTextSafely(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(textarea);
    }
  }
}
