import type React from 'react';

export const KOFI_URL = 'https://ko-fi.com/mdyousuf2620';
export const SUPPORT_EMAIL = 'mdyousuf982007@proton.me';
export const SUPPORT_MAILTO_URL = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('ZERO Ko-fi Donor Verification')}`;
export const RELEASES_URL = 'https://github.com/MDYOUSUF20007-oss/ZERO/releases';
export const SOURCE_URL = 'https://github.com/MDYOUSUF20007-oss/ZERO';
export const UPI_ID = 'md.y2007@ptaxis';
export const FIRST_DONATION_BONUS_INR = 50;
export const UPI_PAY_URL = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('Zero FOSS')}&cu=INR`;
export const UPI_FIFTY_RS_PAY_URL = `upi://pay?pa=${encodeURIComponent(UPI_ID)}&pn=${encodeURIComponent('Zero FOSS')}&am=${FIRST_DONATION_BONUS_INR}&cu=INR`;

export function handleOpenExternalUrl(e: React.MouseEvent, url: string): void {
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
