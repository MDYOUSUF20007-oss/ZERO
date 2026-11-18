import {
  ZeroTube,
  isZeroTubeNativeAvailable,
  type WhitelistedChannel,
  type YouTubeGuardConfig,
} from '../plugins/zeroTube';

/**
 * ZeroTube Deterministic Whitelist Store & URL Parser
 *
 * Strictly deterministic: NO AI scoring, NO heuristic tag guessers, NO fuzzy keyword matching,
 * and NO third-party Piped/Invidious proxy APIs.
 *
 * Only full-length videos (>= 120s or live study streams) whose channel matches an exact
 * UC... channel ID, exact @handle (case-insensitive), or exact normalized resolved channel
 * name in the user's whitelist are permitted. Everything else is blocked.
 */

export const STORAGE_KEY_WHITELIST_CHANNELS = 'zero_tube_whitelist_channels_v2';
export const STORAGE_KEY_SAVED_LECTURES = 'zero_tube_saved_lectures_v2';
export const STORAGE_KEY_STUDY_NOTES = 'zero_tube_study_notes_v1';
export const STORAGE_KEY_YT_GUARD_CONFIG = 'zero_tube_official_yt_guard_v1';
export const STORAGE_KEY_VIDEO_PROGRESS = 'zero_tube_video_progress_v1';

// Legacy storage keys (migrated once on read, never written back)
const LEGACY_KEY_CUSTOM_VIDEOS = 'zero_tube_custom_videos_v1';
const LEGACY_KEY_TRUSTED_CHANNELS = 'zero_tube_trusted_channels_v1';
const STORAGE_KEY_MIGRATED_V2 = 'zero_tube_migrated_deterministic_v2';

export const ZEROTUBE_WHITELIST_EVENT = 'zero-tube-whitelist-updated';
export const ZEROTUBE_GUARD_EVENT = 'zero-tube-guard-updated';

export const MIN_FULL_LENGTH_SECONDS = 120;

export interface SavedZeroTubeLecture {
  videoId: string;
  url: string;
  title: string;
  uploaderName: string;
  uploaderChannelId: string;
  uploaderHandle: string;
  duration: number;
  thumbnailUrl: string;
  isLive?: boolean;
  savedAt: number;
}

export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = (input || '').trim();
  if (!trimmed) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  try {
    const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(withScheme);
    const host = parsed.hostname.toLowerCase();

    if (host.includes('youtu.be')) {
      const seg = parsed.pathname.slice(1).split('/')[0];
      if (/^[a-zA-Z0-9_-]{11}$/.test(seg)) return seg;
    }

    if (host.includes('youtube.com') || host.includes('youtube-nocookie.com')) {
      const vParam = parsed.searchParams.get('v');
      if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

      const segments = parsed.pathname.split('/').filter(Boolean);
      for (const marker of ['shorts', 'embed', 'live', 'v']) {
        const idx = segments.indexOf(marker);
        if (idx !== -1 && segments[idx + 1]) {
          const candidate = segments[idx + 1].split('?')[0];
          if (/^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
        }
      }
    }
  } catch {
    const match =
      /(?:youtube\.com\/(?:watch\?.*v=|shorts\/|embed\/|live\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i.exec(
        trimmed
      );
    if (match?.[1]) return match[1];
  }

  return null;
}

export function isYouTubeShortsUrl(input: string): boolean {
  return (input || '').toLowerCase().includes('/shorts/');
}

export function extractYouTubeChannelId(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (/^UC[a-zA-Z0-9_-]{22}$/.test(trimmed)) return trimmed;
  const match = /(?:^|\/)(UC[a-zA-Z0-9_-]{22})(?:[/?#&]|$)/.exec(trimmed);
  return match?.[1] || '';
}

export function extractYouTubeChannelHandle(input: string): string {
  const trimmed = (input || '').trim();
  if (!trimmed) return '';
  if (/^@[a-zA-Z0-9_.-]{3,60}$/.test(trimmed)) return trimmed;
  const match = /(?:^|\/)@([a-zA-Z0-9_.-]{3,60})(?:[/?#&]|$)/.exec(trimmed);
  return match?.[1] ? `@${match[1]}` : '';
}

export function isDirectYouTubeUrlOrId(input: string): boolean {
  const trimmed = (input || '').trim();
  if (!trimmed) return false;
  if (extractYouTubeVideoId(trimmed)) return true;
  return /^(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com|youtu\.be|youtube-nocookie\.com)\//i.test(
    trimmed
  );
}

export function normalizeChannelHandle(handle?: string): string {
  const trimmed = (handle || '').trim();
  if (!trimmed) return '';
  const withAt = trimmed.startsWith('@') ? trimmed : `@${trimmed}`;
  return withAt.toLowerCase();
}

export function normalizeChannelName(name?: string): string {
  return (name || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

export function formatDurationSeconds(seconds?: number, isLive?: boolean): string {
  if (isLive) return 'LIVE';
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds <= 0) {
    return '--:--';
  }
  const total = Math.floor(seconds);
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Deterministic Whitelist Verification:
 * Permits a video ONLY when its channel's exact UC... ID, exact @handle (case-insensitive),
 * or exact normalized display name matches a user-saved WhitelistedChannel.
 */
export function matchWhitelistedChannel(
  candidate: {
    channelId?: string;
    handle?: string;
    uploaderUrl?: string;
    uploaderName?: string;
  },
  whitelist: WhitelistedChannel[]
): WhitelistedChannel | null {
  const candidateId =
    extractYouTubeChannelId(candidate.channelId || '') ||
    extractYouTubeChannelId(candidate.uploaderUrl || '');
  const candidateHandle = normalizeChannelHandle(
    candidate.handle || extractYouTubeChannelHandle(candidate.uploaderUrl || '')
  );
  const candidateName = normalizeChannelName(candidate.uploaderName);

  for (const ch of whitelist) {
    const wlId = extractYouTubeChannelId(ch.id || '') || extractYouTubeChannelId(ch.url || '');
    const wlHandle = normalizeChannelHandle(ch.handle || extractYouTubeChannelHandle(ch.url || ''));
    const wlName = normalizeChannelName(ch.name);

    // 1. Exact UC... Channel ID match
    if (wlId && candidateId && wlId === candidateId) {
      return ch;
    }

    // 2. Exact @handle match (case-insensitive)
    if (wlHandle && candidateHandle && wlHandle === candidateHandle) {
      return ch;
    }

    // 3. Exact normalized channel display name match (case-insensitive)
    if (wlName && candidateName && wlName === candidateName) {
      return ch;
    }
  }

  return null;
}

function notifyWhitelistUpdated(): void {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ZEROTUBE_WHITELIST_EVENT));
  }
}

function migrateLegacyWhitelistOnce(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (localStorage.getItem(STORAGE_KEY_MIGRATED_V2) === '1') return;

    const existingRaw = localStorage.getItem(STORAGE_KEY_WHITELIST_CHANNELS);
    const channels: WhitelistedChannel[] = existingRaw ? JSON.parse(existingRaw) : [];

    const addIfMissing = (candidate: Omit<WhitelistedChannel, 'addedAt'>) => {
      const id = extractYouTubeChannelId(candidate.id || candidate.url);
      const handle = normalizeChannelHandle(candidate.handle || extractYouTubeChannelHandle(candidate.url));
      const name = (candidate.name || '').trim();
      if (!id && !handle) return;

      const dup = channels.some(
        (c) =>
          (id && c.id === id) ||
          (handle && normalizeChannelHandle(c.handle) === handle)
      );
      if (!dup) {
        channels.push({
          id,
          handle,
          name: name || handle || id,
          url:
            candidate.url ||
            (id
              ? `https://www.youtube.com/channel/${id}`
              : `https://www.youtube.com/${handle}`),
          addedAt: Date.now(),
        });
      }
    };

    const legacyVideosRaw = localStorage.getItem(LEGACY_KEY_CUSTOM_VIDEOS);
    if (legacyVideosRaw) {
      const parsed = JSON.parse(legacyVideosRaw);
      if (Array.isArray(parsed)) {
        for (const item of parsed) {
          if (item && item.isChannel) {
            const handle = extractYouTubeChannelHandle(item.channelHandle || item.url || item.id || '');
            const id = extractYouTubeChannelId(item.url || item.id || '');
            if (id || handle) {
              addIfMissing({
                id,
                handle,
                name: String(item.title || item.channel || handle || id),
                url: String(item.url || ''),
              });
            }
          }
        }
      }
    }

    const legacyTrustedRaw = localStorage.getItem(LEGACY_KEY_TRUSTED_CHANNELS);
    if (legacyTrustedRaw) {
      const parsed = JSON.parse(legacyTrustedRaw);
      if (Array.isArray(parsed)) {
        for (const entry of parsed) {
          if (typeof entry !== 'string') continue;
          const id = extractYouTubeChannelId(entry);
          const handle = extractYouTubeChannelHandle(entry);
          if (id || handle) {
            addIfMissing({
              id,
              handle,
              name: handle || id,
              url: id
                ? `https://www.youtube.com/channel/${id}`
                : `https://www.youtube.com/${handle}`,
            });
          }
        }
      }
    }

    localStorage.setItem(STORAGE_KEY_WHITELIST_CHANNELS, JSON.stringify(channels.slice(0, 100)));
    localStorage.setItem(STORAGE_KEY_MIGRATED_V2, '1');
    // Remove legacy AI-scored storage keys
    localStorage.removeItem(LEGACY_KEY_CUSTOM_VIDEOS);
    localStorage.removeItem(LEGACY_KEY_TRUSTED_CHANNELS);
  } catch {
    // Ignore storage errors
  }
}

export function getWhitelistedChannels(): WhitelistedChannel[] {
  if (typeof localStorage === 'undefined') return [];
  migrateLegacyWhitelistOnce();
  try {
    const raw = localStorage.getItem(STORAGE_KEY_WHITELIST_CHANNELS);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveWhitelistedChannel(
  channel: Omit<WhitelistedChannel, 'addedAt'> & { addedAt?: number }
): WhitelistedChannel[] {
  if (typeof localStorage === 'undefined') return [];
  const normalizedId =
    extractYouTubeChannelId(channel.id || '') || extractYouTubeChannelId(channel.url || '');
  const normalizedHandle = normalizeChannelHandle(
    channel.handle || extractYouTubeChannelHandle(channel.url || '')
  );
  const cleanName = (channel.name || normalizedHandle || normalizedId).trim();
  const cleanUrl =
    (channel.url || '').trim() ||
    (normalizedId
      ? `https://www.youtube.com/channel/${normalizedId}`
      : normalizedHandle
      ? `https://www.youtube.com/${normalizedHandle}`
      : '');

  if (!normalizedId && !normalizedHandle && !cleanName) {
    return getWhitelistedChannels();
  }

  const entry: WhitelistedChannel = {
    id: normalizedId,
    handle: normalizedHandle,
    name: cleanName,
    url: cleanUrl,
    avatarUrl: channel.avatarUrl || undefined,
    addedAt: channel.addedAt ?? Date.now(),
  };

  try {
    const existing = getWhitelistedChannels().filter((c) => {
      if (entry.id && c.id && c.id === entry.id) return false;
      if (entry.handle && c.handle && normalizeChannelHandle(c.handle) === entry.handle) return false;
      if (!entry.id && !entry.handle && normalizeChannelName(c.name) === normalizeChannelName(entry.name)) {
        return false;
      }
      return true;
    });
    const next = [entry, ...existing].slice(0, 100);
    localStorage.setItem(STORAGE_KEY_WHITELIST_CHANNELS, JSON.stringify(next));
    notifyWhitelistUpdated();
    void syncYouTubeGuardToNative(undefined, next);
    return next;
  } catch {
    return getWhitelistedChannels();
  }
}

export function removeWhitelistedChannel(key: { id?: string; handle?: string; name?: string }): WhitelistedChannel[] {
  if (typeof localStorage === 'undefined') return [];
  const targetId = extractYouTubeChannelId(key.id || '');
  const targetHandle = normalizeChannelHandle(key.handle || '');
  const targetName = normalizeChannelName(key.name || '');

  try {
    const filtered = getWhitelistedChannels().filter((c) => {
      if (targetId && c.id === targetId) return false;
      if (targetHandle && normalizeChannelHandle(c.handle) === targetHandle) return false;
      if (!targetId && !targetHandle && targetName && normalizeChannelName(c.name) === targetName) {
        return false;
      }
      return true;
    });
    localStorage.setItem(STORAGE_KEY_WHITELIST_CHANNELS, JSON.stringify(filtered));
    notifyWhitelistUpdated();
    void syncYouTubeGuardToNative(undefined, filtered);
    return filtered;
  } catch {
    return getWhitelistedChannels();
  }
}

export function getYouTubeGuardConfig(): YouTubeGuardConfig {
  if (typeof localStorage === 'undefined') {
    return { blockOfficialShorts: false, strictOfficialStudyMode: false };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY_YT_GUARD_CONFIG);
    if (!raw) {
      return { blockOfficialShorts: false, strictOfficialStudyMode: false };
    }
    const parsed = JSON.parse(raw);
    return {
      blockOfficialShorts: Boolean(parsed?.blockOfficialShorts),
      strictOfficialStudyMode: Boolean(parsed?.strictOfficialStudyMode),
    };
  } catch {
    return { blockOfficialShorts: false, strictOfficialStudyMode: false };
  }
}

export function saveYouTubeGuardConfig(next: YouTubeGuardConfig): YouTubeGuardConfig {
  const sanitized: YouTubeGuardConfig = {
    blockOfficialShorts: Boolean(next.blockOfficialShorts),
    strictOfficialStudyMode: Boolean(next.strictOfficialStudyMode),
  };
  if (typeof localStorage !== 'undefined') {
    try {
      localStorage.setItem(STORAGE_KEY_YT_GUARD_CONFIG, JSON.stringify(sanitized));
    } catch {
      // Ignore storage errors
    }
  }
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ZEROTUBE_GUARD_EVENT));
  }
  void syncYouTubeGuardToNative(sanitized);
  return sanitized;
}

/**
 * Builds the flat, deduplicated, normalized array of channel names and @handles
 * synced to native Android SharedPreferences (`zero_noise_yt_guard_prefs`).
 */
export function buildNativeGuardWhitelistStrings(channels: WhitelistedChannel[]): string[] {
  const seen = new Set<string>();
  for (const ch of channels) {
    const name = normalizeChannelName(ch.name);
    if (name) seen.add(name);
    const handle = normalizeChannelHandle(ch.handle);
    if (handle) seen.add(handle);
  }
  return Array.from(seen);
}

/**
 * Syncs Official YouTube App Guard toggles and deterministic whitelist strings
 * from React to native Android SharedPreferences via ZeroTubePlugin.
 */
export async function syncYouTubeGuardToNative(
  overrideConfig?: YouTubeGuardConfig,
  overrideChannels?: WhitelistedChannel[]
): Promise<void> {
  if (!isZeroTubeNativeAvailable()) return;
  const cfg = overrideConfig ?? getYouTubeGuardConfig();
  const channels = overrideChannels ?? getWhitelistedChannels();
  const whitelistedChannels = buildNativeGuardWhitelistStrings(channels);

  try {
    await ZeroTube.syncYouTubeGuardConfig({
      blockOfficialShorts: cfg.blockOfficialShorts,
      strictOfficialStudyMode: cfg.strictOfficialStudyMode,
      whitelistedChannels,
    });
  } catch {
    // Non-fatal in preview or restricted environments
  }
}

export function getSavedZeroTubeLectures(): SavedZeroTubeLecture[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SAVED_LECTURES);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveZeroTubeLecture(lecture: SavedZeroTubeLecture): SavedZeroTubeLecture[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const existing = getSavedZeroTubeLectures().filter((l) => l.videoId !== lecture.videoId);
    const next = [lecture, ...existing].slice(0, 50);
    localStorage.setItem(STORAGE_KEY_SAVED_LECTURES, JSON.stringify(next));
    return next;
  } catch {
    return getSavedZeroTubeLectures();
  }
}

export function removeSavedZeroTubeLecture(videoId: string): SavedZeroTubeLecture[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const next = getSavedZeroTubeLectures().filter((l) => l.videoId !== videoId);
    localStorage.setItem(STORAGE_KEY_SAVED_LECTURES, JSON.stringify(next));
    return next;
  } catch {
    return getSavedZeroTubeLectures();
  }
}

export function getChannelKey(ch: Pick<WhitelistedChannel, 'id' | 'handle' | 'name'>): string {
  return ch.id || normalizeChannelHandle(ch.handle) || normalizeChannelName(ch.name);
}

export interface VideoWatchProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export function getAllVideoProgress(): Record<string, VideoWatchProgress> {
  if (typeof localStorage === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY_VIDEO_PROGRESS);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, VideoWatchProgress>) : {};
  } catch {
    return {};
  }
}

export function getVideoProgress(videoId: string): VideoWatchProgress | null {
  if (!videoId) return null;
  const all = getAllVideoProgress();
  const entry = all[videoId];
  if (!entry || typeof entry.currentTime !== 'number' || !Number.isFinite(entry.currentTime)) {
    return null;
  }
  return entry;
}

export function saveVideoProgress(
  videoId: string,
  currentTime: number,
  duration: number
): Record<string, VideoWatchProgress> {
  if (typeof localStorage === 'undefined' || !videoId) return {};
  if (!Number.isFinite(currentTime) || currentTime < 0) return getAllVideoProgress();

  const all = getAllVideoProgress();
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;

  // If completed (>95% watched or within 8 seconds of end on long videos), clear save-point
  const isFinished =
    safeDuration > 20 &&
    (currentTime >= safeDuration - 8 || currentTime / safeDuration >= 0.96);

  if (isFinished || currentTime < 3) {
    if (all[videoId]) {
      delete all[videoId];
      try {
        localStorage.setItem(STORAGE_KEY_VIDEO_PROGRESS, JSON.stringify(all));
      } catch {
        // Ignore storage errors
      }
    }
    return all;
  }

  all[videoId] = {
    currentTime: Math.floor(currentTime),
    duration: Math.floor(safeDuration),
    updatedAt: Date.now(),
  };

  // Prune to 200 most recently updated entries
  const entries = Object.entries(all);
  if (entries.length > 200) {
    entries.sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
    const pruned: Record<string, VideoWatchProgress> = {};
    for (const [k, v] of entries.slice(0, 200)) {
      pruned[k] = v;
    }
    try {
      localStorage.setItem(STORAGE_KEY_VIDEO_PROGRESS, JSON.stringify(pruned));
    } catch {
      // Ignore
    }
    return pruned;
  }

  try {
    localStorage.setItem(STORAGE_KEY_VIDEO_PROGRESS, JSON.stringify(all));
  } catch {
    // Ignore storage errors
  }
  return all;
}

export function clearVideoProgress(videoId: string): Record<string, VideoWatchProgress> {
  if (typeof localStorage === 'undefined' || !videoId) return {};
  const all = getAllVideoProgress();
  if (all[videoId]) {
    delete all[videoId];
    try {
      localStorage.setItem(STORAGE_KEY_VIDEO_PROGRESS, JSON.stringify(all));
    } catch {
      // Ignore
    }
  }
  return all;
}
