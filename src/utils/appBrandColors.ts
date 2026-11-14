import type { BagApp } from '../types';

export interface AppBrandVisual {
  bgColor: string;
  borderColor: string;
  textColor: string;
  initial: string;
}

const BRAND_HEX_BY_PACKAGE: Record<string, string> = {
  'com.whatsapp': '#16A34A',
  'com.whatsapp.w4b': '#16A34A',
  'com.spotify.music': '#1DB954',
  'com.spotify.lite': '#1DB954',
  'md.obsidian': '#7C3AED',
  'com.notion.id': '#27272A',
  'notion.id': '#27272A',
  'com.google.android.apps.maps': '#2563EB',
  'com.google.android.gm': '#DC2626',
  'com.google.android.youtube': '#E11D48',
  'app.morphe.android.youtube': '#E11D48',
  'app.revanced.android.youtube': '#E11D48',
  'org.zero.tube': '#06B6D4',
  'com.google.android.apps.youtube.music': '#E11D48',
  'org.telegram.messenger': '#0284C7',
  'org.telegram.plus': '#0284C7',
  'org.thoughtcrime.securesms': '#2563EB',
  'com.discord': '#5865F2',
  'com.Slack': '#6D28D9',
  'com.slack': '#6D28D9',
  'com.google.android.calculator': '#0D9488',
  'com.android.calculator2': '#0D9488',
  'com.sec.android.app.popupcalculator': '#0D9488',
  'com.google.android.deskclock': '#0284C7',
  'com.sec.android.app.clockpackage': '#0284C7',
  'com.android.camera2': '#3F3F46',
  'com.google.android.GoogleCamera': '#3F3F46',
  'com.sec.android.app.camera': '#3F3F46',
  'com.ubercab': '#18181B',
  'com.google.android.apps.docs': '#2563EB',
  'com.google.android.apps.photos': '#EA580C',
  'com.google.android.calendar': '#2563EB',
  'com.amazon.kindle': '#D97706',
  'com.ichi2.anki': '#0EA5E9',
  'cc.forestapp': '#15803D',
  'us.zoom.videomeetings': '#2563EB',
  'com.google.android.apps.meetings': '#059669',
  'com.microsoft.teams': '#4F46E5',
  'com.google.android.dialer': '#16A34A',
  'com.samsung.android.dialer': '#16A34A',
  'com.android.dialer': '#16A34A',
  'com.google.android.apps.messaging': '#0284C7',
  'com.samsung.android.messaging': '#0284C7',
  'com.android.mms': '#0284C7',
};

const FALLBACK_PALETTE = [
  '#16A34A', // Emerald / WhatsApp
  '#2563EB', // Cobalt
  '#7C3AED', // Obsidian Purple
  '#0284C7', // Cerulean
  '#0D9488', // Teal
  '#D97706', // Amber
  '#DC2626', // Ruby
  '#4F46E5', // Indigo
];

function hashPackage(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

function getBrandHexByKeywords(lowerPkg: string, lowerName: string): string | null {
  if (lowerPkg.includes('whatsapp') || lowerName.includes('whatsapp')) return '#16A34A';
  if (lowerPkg.includes('spotify') || lowerName.includes('spotify')) return '#1DB954';
  if (lowerPkg.includes('obsidian') || lowerName.includes('obsidian')) return '#7C3AED';
  if (lowerPkg.includes('telegram') || lowerName.includes('telegram')) return '#0284C7';
  if (lowerPkg.includes('dialer') || lowerPkg.includes('phone') || lowerName === 'phone calls') {
    return '#16A34A';
  }
  if (lowerPkg.includes('messaging') || lowerPkg.includes('mms') || lowerPkg === 'sms:') {
    return '#0284C7';
  }
  if (lowerPkg.includes('maps') || lowerName.includes('maps')) return '#2563EB';
  if (lowerPkg.includes('youtube') || lowerName.includes('youtube') || lowerPkg.includes('morphe') || lowerName.includes('morphe')) return '#E11D48';
  if (lowerPkg.includes('zerotube') || lowerPkg === 'org.zero.tube' || lowerName.includes('zerotube')) return '#06B6D4';
  if (lowerPkg.includes('mail') || lowerName.includes('gmail')) return '#DC2626';
  if (lowerPkg.includes('calc') || lowerName.includes('calculator')) return '#0D9488';
  if (lowerPkg.includes('clock') || lowerName.includes('clock')) return '#0284C7';
  if (lowerPkg.includes('camera') || lowerName.includes('camera')) return '#3F3F46';
  return null;
}

export function resolveAppBrandVisual(
  app: Pick<BagApp, 'packageName' | 'appName' | 'iconBgColor' | 'category'>,
  fallbackHex?: string
): AppBrandVisual {
  const pkg = (app.packageName || '').trim();
  const name = (app.appName || pkg || 'A').trim();
  const initial = name.charAt(0).toUpperCase() || 'A';

  let bgColor =
    app.iconBgColor && /^#[0-9A-F]{6}$/i.test(app.iconBgColor)
      ? app.iconBgColor.toUpperCase()
      : BRAND_HEX_BY_PACKAGE[pkg] ||
        getBrandHexByKeywords(pkg.toLowerCase(), name.toLowerCase()) ||
        (app.category === 'calls'
          ? '#16A34A'
          : app.category === 'messages'
          ? '#0284C7'
          : null);

  if (!bgColor) {
    bgColor = pkg ? FALLBACK_PALETTE[hashPackage(pkg) % FALLBACK_PALETTE.length] : fallbackHex || '#2563EB';
  }

  const hexClean = bgColor.replace('#', '');
  const r = parseInt(hexClean.slice(0, 2), 16) || 0;
  const g = parseInt(hexClean.slice(2, 4), 16) || 0;
  const b = parseInt(hexClean.slice(4, 6), 16) || 0;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  return {
    bgColor,
    borderColor: lum >= 0.55 ? 'rgba(9, 9, 11, 0.28)' : 'rgba(255, 255, 255, 0.2)',
    textColor: lum >= 0.55 ? '#09090B' : '#FFFFFF',
    initial,
  };
}
