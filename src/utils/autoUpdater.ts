import type { AppUpdateReleaseInfo } from '../types';

export const CURRENT_APP_VERSION = '1.0.0';
export const GITHUB_RELEASES_API = 'https://api.github.com/repos/MDYOUSUF20007-oss/ZERO/releases/latest';
export const OFFICIAL_FALLBACK_RELEASES_URL = 'https://github.com/MDYOUSUF20007-oss/ZERO/releases';

const STORAGE_KEYS = {
  LAST_CHECK_TS: 'zero_last_update_check_ts',
  LAST_PROMPT_TS: 'zero_last_update_prompt_ts',
  CACHED_RELEASE: 'zero_cached_release_info',
};

const CHECK_THROTTLE_MS = 24 * 60 * 60 * 1000; // 24 hours
const REPEATING_NUDGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export function normalizeVersion(v: string): number[] {
  const cleaned = v.replace(/^v/i, '').trim();
  const parts = cleaned.split('.').map((p) => parseInt(p, 10) || 0);
  while (parts.length < 3) parts.push(0);
  return parts;
}

export function isVersionNewer(latest: string, current: string): boolean {
  const latestParts = normalizeVersion(latest);
  const currentParts = normalizeVersion(current);

  for (let i = 0; i < Math.max(latestParts.length, currentParts.length); i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

export function isUpdatePromptDue(nowMs: number = Date.now()): boolean {
  if (typeof localStorage === 'undefined') return false;
  const raw = localStorage.getItem(STORAGE_KEYS.LAST_PROMPT_TS);
  if (!raw) return true;
  const lastPrompt = parseInt(raw, 10) || 0;
  return nowMs - lastPrompt >= REPEATING_NUDGE_MS;
}

export function recordUpdatePromptShown(nowMs: number = Date.now()): void {
  if (typeof localStorage === 'undefined') return;
  localStorage.setItem(STORAGE_KEYS.LAST_PROMPT_TS, String(nowMs));
}

export function getCachedReleaseInfo(): AppUpdateReleaseInfo | null {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CACHED_RELEASE);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function checkForAppUpdate(force = false): Promise<AppUpdateReleaseInfo | null> {
  const now = Date.now();
  if (typeof localStorage === 'undefined') return null;

  if (!force) {
    const lastCheckStr = localStorage.getItem(STORAGE_KEYS.LAST_CHECK_TS);
    const lastCheck = lastCheckStr ? parseInt(lastCheckStr, 10) || 0 : 0;
    if (now - lastCheck < CHECK_THROTTLE_MS) {
      const cached = getCachedReleaseInfo();
      if (cached && isVersionNewer(cached.latestVersion, CURRENT_APP_VERSION)) {
        return cached;
      }
      return null;
    }
  }

  try {
    localStorage.setItem(STORAGE_KEYS.LAST_CHECK_TS, String(now));
    const response = await fetch(GITHUB_RELEASES_API, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!response.ok) {
      return getCachedReleaseInfo();
    }

    const data = await response.json();
    const tagName: string = data.tag_name || '';
    const cleanTag = tagName.replace(/^v/i, '');

    let apkDownloadUrl: string | undefined;
    if (Array.isArray(data.assets)) {
      const apkAsset = data.assets.find((a: { name?: string; browser_download_url?: string }) =>
        typeof a.name === 'string' && a.name.toLowerCase().endsWith('.apk')
      );
      if (apkAsset) {
        apkDownloadUrl = apkAsset.browser_download_url;
      }
    }

    const isNewer = isVersionNewer(cleanTag || CURRENT_APP_VERSION, CURRENT_APP_VERSION);
    const releaseInfo: AppUpdateReleaseInfo = {
      latestVersion: cleanTag || CURRENT_APP_VERSION,
      currentVersion: CURRENT_APP_VERSION,
      hasUpdate: isNewer,
      releaseNotes: data.body || 'New features and bug fixes in this release.',
      apkDownloadUrl: apkDownloadUrl || data.html_url || OFFICIAL_FALLBACK_RELEASES_URL,
      htmlUrl: data.html_url || OFFICIAL_FALLBACK_RELEASES_URL,
      publishedAt: data.published_at || new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEYS.CACHED_RELEASE, JSON.stringify(releaseInfo));

    if (isNewer) {
      return releaseInfo;
    }

    return null;
  } catch {
    return getCachedReleaseInfo();
  }
}
