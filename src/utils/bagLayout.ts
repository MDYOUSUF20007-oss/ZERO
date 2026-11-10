export const DEFAULT_SESSION_TAGS: readonly string[] = [
  'Deep Work',
  'Study',
  'Family',
  'Sleep',
  'Detox',
];

/**
 * Normalizes a custom session hashtag into a clean, compact tag label (without leading '#').
 */
export function normalizeCustomHashtag(raw: string | null | undefined): string | null {
  if (typeof raw !== 'string') return null;
  const stripped = raw
    .replace(/^#+/, '')
    .replace(/[#\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!stripped) return null;
  return stripped.slice(0, 24).trim() || null;
}

/**
 * Merges default mission tags and user custom hashtags without case-insensitive duplicates.
 */
export function mergeHashtagList(
  customTags: readonly string[],
  defaults: readonly string[] = DEFAULT_SESSION_TAGS
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const tag of defaults) {
    const clean = normalizeCustomHashtag(tag);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }

  for (const tag of customTags) {
    const clean = normalizeCustomHashtag(tag);
    if (!clean) continue;
    const key = clean.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(clean);
    }
  }

  return out;
}

/**
 * Determines whether the currently active occasion bag is the Work Bag.
 * Used on the lock screen (web + native Android) to switch to Work Bag spotlight layout:
 * big centered #HASHTAG between top clock/timer and bottom bag apps dock.
 */
export function isWorkBag(bagId?: string | null, bagName?: string | null): boolean {
  const normalizedId = (bagId ?? '').trim().toLowerCase();
  if (normalizedId === 'bag-work') return true;
  const normalizedName = (bagName ?? '').trim().toLowerCase();
  return normalizedName === 'work bag' || normalizedName.includes('work');
}
