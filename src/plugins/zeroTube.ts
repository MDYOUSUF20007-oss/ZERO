import { Capacitor, registerPlugin } from '@capacitor/core';

export interface WhitelistedChannel {
  id: string; // Exact YouTube UC... channel ID (canonical primary identifier)
  handle: string; // Exact @handle (e.g., @3Blue1Brown)
  name: string; // Display name
  url: string; // Canonical channel URL
  avatarUrl?: string;
  addedAt: number;
}

export interface ZeroTubeSearchVideo {
  videoId: string;
  url: string;
  title: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderChannelId: string;
  uploaderHandle: string;
  duration: number; // Seconds (-1 for live)
  thumbnailUrl: string;
  viewCount: number;
  textualUploadDate: string;
  isLive: boolean;
}

export interface ZeroTubeSearchResult {
  videos: ZeroTubeSearchVideo[];
  scannedCount: number;
}

export interface ZeroTubeResolvedChannel {
  id: string;
  handle: string;
  name: string;
  url: string;
  avatarUrl?: string;
  videoId?: string;
  videoTitle?: string;
  videoDuration?: number;
  videoThumbnailUrl?: string;
  isShort?: boolean;
  isLive?: boolean;
}

export interface ZeroTubeMuxedStream {
  url: string;
  resolution: string;
  height: number;
  format: string;
  mimeType: string;
  bitrate: number;
}

export interface ZeroTubeAudioStream {
  url: string;
  averageBitrate: number;
  format: string;
  mimeType: string;
  quality: string;
}

export interface ZeroTubeStreamResult {
  videoId: string;
  title: string;
  uploaderName: string;
  uploaderUrl: string;
  uploaderChannelId: string;
  uploaderHandle: string;
  duration: number;
  thumbnailUrl: string;
  isLive: boolean;
  isShort: boolean;
  hlsUrl: string;
  muxedStreams: ZeroTubeMuxedStream[];
  audioStreams: ZeroTubeAudioStream[];
}

export interface YouTubeGuardConfig {
  blockOfficialShorts: boolean;
  strictOfficialStudyMode: boolean;
}

export interface YouTubeGuardSyncResult {
  synced: boolean;
  blockOfficialShorts: boolean;
  strictOfficialStudyMode: boolean;
  whitelistedCount: number;
  revision: number;
}

export interface ZeroTubePluginInterface {
  searchVideos(options: {
    query: string;
    whitelistedChannels: Array<{
      id: string;
      handle: string;
      name: string;
      url: string;
    }>;
  }): Promise<ZeroTubeSearchResult>;

  resolveChannel(options: {
    input: string;
  }): Promise<ZeroTubeResolvedChannel>;

  getStream(options: {
    videoUrl: string;
  }): Promise<ZeroTubeStreamResult>;

  syncYouTubeGuardConfig(options: {
    blockOfficialShorts: boolean;
    strictOfficialStudyMode: boolean;
    whitelistedChannels: string[];
  }): Promise<YouTubeGuardSyncResult>;
}

export const ZeroTube = registerPlugin<ZeroTubePluginInterface>('ZeroTube');

export function isZeroTubeNativeAvailable(): boolean {
  try {
    return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('ZeroTube');
  } catch {
    return false;
  }
}
