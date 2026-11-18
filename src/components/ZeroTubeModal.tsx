import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  X,
  Play,
  Pause,
  Search,
  FileText,
  Settings,
  Plus,
  Trash2,
  ShieldCheck,
  ShieldBan,
  RotateCcw,
  RotateCw,
  Headphones,
  MonitorPlay,
  Maximize2,
  Loader2,
  Radio,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ExternalLink,
  Shield,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import { OfficialYouTubeGuardCard } from './OfficialYouTubeGuardCard';
import {
  ZeroTube,
  isZeroTubeNativeAvailable,
  type WhitelistedChannel,
  type ZeroTubeSearchVideo,
  type ZeroTubeStreamResult,
  type ZeroTubeMuxedStream,
} from '../plugins/zeroTube';
import {
  STORAGE_KEY_STUDY_NOTES,
  ZEROTUBE_WHITELIST_EVENT,
  MIN_FULL_LENGTH_SECONDS,
  extractYouTubeVideoId,
  extractYouTubeChannelId,
  extractYouTubeChannelHandle,
  isYouTubeShortsUrl,
  isDirectYouTubeUrlOrId,
  matchWhitelistedChannel,
  formatDurationSeconds,
  getWhitelistedChannels,
  saveWhitelistedChannel,
  removeWhitelistedChannel,
  getSavedZeroTubeLectures,
  saveZeroTubeLecture,
  removeSavedZeroTubeLecture,
  getChannelKey,
  type SavedZeroTubeLecture,
} from '../utils/zeroTubeWhitelist';

interface ZeroTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchMorphApp?: () => void;
  initialVideoId?: string;
  onOpenSettingsStudio?: () => void;
}

interface ActiveLectureState {
  videoId: string;
  url: string;
  title: string;
  uploaderName: string;
  uploaderChannelId: string;
  uploaderHandle: string;
  duration: number;
  thumbnailUrl: string;
  isLive: boolean;
}

interface BlockedNotice {
  reason: 'short_form' | 'not_whitelisted' | 'unverifiable';
  title: string;
  message: string;
  videoTitle?: string;
  channelName?: string;
  channelHandle?: string;
  channelId?: string;
}

type PlayerEngineMode = 'idle' | 'loading' | 'native' | 'fallback_iframe';

const PLAYBACK_SPEEDS = [1, 1.25, 1.5, 1.75, 2] as const;

export const ZeroTubeModal: React.FC<ZeroTubeModalProps> = ({
  isOpen,
  onClose,
  onLaunchMorphApp,
  initialVideoId,
  onOpenSettingsStudio,
}) => {
  const [whitelistedChannels, setWhitelistedChannels] = useState<WhitelistedChannel[]>(() =>
    getWhitelistedChannels()
  );
  const [savedLectures, setSavedLectures] = useState<SavedZeroTubeLecture[]>(() =>
    getSavedZeroTubeLectures()
  );
  const [selectedChannelKey, setSelectedChannelKey] = useState<string>('all');

  // Search & paste bar state
  const [searchOrUrlInput, setSearchOrUrlInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ZeroTubeSearchVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [blockedNotice, setBlockedNotice] = useState<BlockedNotice | null>(null);

  // Quick add channel drawer & Official YouTube Guard drawer inside modal
  const [showQuickAddChannel, setShowQuickAddChannel] = useState(false);
  const [showAppGuardPanel, setShowAppGuardPanel] = useState(false);
  const [channelAddInput, setChannelAddInput] = useState('');
  const [isResolvingChannel, setIsResolvingChannel] = useState(false);
  const [channelAddFeedback, setChannelAddFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Tabs (Catalog/Search vs Study Notes)
  const [activeTab, setActiveTab] = useState<'catalog' | 'notes'>('catalog');
  const [studyNotes, setStudyNotes] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_STUDY_NOTES) || '';
    } catch {
      return '';
    }
  });

  // Dual-Engine Player state
  const [activeLecture, setActiveLecture] = useState<ActiveLectureState | null>(null);
  const [engineMode, setEngineMode] = useState<PlayerEngineMode>('idle');
  const [streamData, setStreamData] = useState<ZeroTubeStreamResult | null>(null);
  const [selectedMuxedIndex, setSelectedMuxedIndex] = useState(0);
  const [audioOnlyMode, setAudioOnlyMode] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [mediaDuration, setMediaDuration] = useState(0);
  const [fallbackReason, setFallbackReason] = useState('');

  const mediaRef = useRef<HTMLVideoElement | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const shouldResumeAfterSwapRef = useRef<boolean>(false);

  // Keep whitelist synced with Settings Studio
  useEffect(() => {
    const syncWhitelist = () => {
      setWhitelistedChannels(getWhitelistedChannels());
      setSavedLectures(getSavedZeroTubeLectures());
    };
    window.addEventListener(ZEROTUBE_WHITELIST_EVENT, syncWhitelist);
    return () => window.removeEventListener(ZEROTUBE_WHITELIST_EVENT, syncWhitelist);
  }, []);

  // Load initial state when modal opens
  useEffect(() => {
    if (!isOpen) return;
    const channels = getWhitelistedChannels();
    const lectures = getSavedZeroTubeLectures();
    setWhitelistedChannels(channels);
    setSavedLectures(lectures);
    setBlockedNotice(null);
    setSearchError('');

    if (initialVideoId) {
      const existing = lectures.find((l) => l.videoId === initialVideoId);
      if (existing) {
        void loadLectureIntoPlayer({
          videoId: existing.videoId,
          url: existing.url,
          title: existing.title,
          uploaderName: existing.uploaderName,
          uploaderChannelId: existing.uploaderChannelId,
          uploaderHandle: existing.uploaderHandle,
          duration: existing.duration,
          thumbnailUrl: existing.thumbnailUrl,
          isLive: Boolean(existing.isLive),
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, initialVideoId]);

  const pickPreferredMuxedIndex = useCallback((streams: ZeroTubeMuxedStream[]): number => {
    if (streams.length === 0) return 0;
    const mp4720 = streams.findIndex(
      (s) => s.format.toLowerCase() === 'mp4' && s.height === 720
    );
    if (mp4720 !== -1) return mp4720;
    const any720 = streams.findIndex((s) => s.height === 720);
    if (any720 !== -1) return any720;
    const mp4360 = streams.findIndex(
      (s) => s.format.toLowerCase() === 'mp4' && s.height === 360
    );
    if (mp4360 !== -1) return mp4360;
    return 0;
  }, []);

  const loadLectureIntoPlayer = useCallback(
    async (lecture: ActiveLectureState, preloadedStream?: ZeroTubeStreamResult) => {
      setBlockedNotice(null);
      setFallbackReason('');
      setActiveLecture(lecture);
      setCurrentTime(0);
      setMediaDuration(lecture.duration > 0 ? lecture.duration : 0);
      setIsPlaying(false);
      pendingSeekTimeRef.current = null;
      shouldResumeAfterSwapRef.current = true;

      // Save to recent whitelisted lectures
      const updatedLectures = saveZeroTubeLecture({
        videoId: lecture.videoId,
        url: lecture.url,
        title: lecture.title,
        uploaderName: lecture.uploaderName,
        uploaderChannelId: lecture.uploaderChannelId,
        uploaderHandle: lecture.uploaderHandle,
        duration: lecture.duration,
        thumbnailUrl: lecture.thumbnailUrl,
        isLive: lecture.isLive,
        savedAt: Date.now(),
      });
      setSavedLectures(updatedLectures);

      const activateStream = (stream: ZeroTubeStreamResult) => {
        const hasMuxed = stream.muxedStreams.length > 0;
        const hasAudio = stream.audioStreams.length > 0;
        const hasHls = Boolean(stream.hlsUrl);
        if (hasMuxed || hasAudio || hasHls) {
          setStreamData(stream);
          setSelectedMuxedIndex(pickPreferredMuxedIndex(stream.muxedStreams));
          if (!hasMuxed && !hasHls && hasAudio) {
            setAudioOnlyMode(true);
          }
          setEngineMode('native');
        } else {
          setStreamData(null);
          setFallbackReason('No direct stream available — using No-Cookie embed');
          setEngineMode('fallback_iframe');
        }
      };

      if (preloadedStream) {
        activateStream(preloadedStream);
        return;
      }

      if (!isZeroTubeNativeAvailable()) {
        setStreamData(null);
        setFallbackReason('Web preview mode — using No-Cookie embed');
        setEngineMode('fallback_iframe');
        return;
      }

      setEngineMode('loading');
      try {
        const extracted = await ZeroTube.getStream({
          videoUrl: lecture.url || `https://www.youtube.com/watch?v=${lecture.videoId}`,
        });
        activateStream(extracted);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Native extraction unavailable';
        setStreamData(null);
        setFallbackReason(`${msg} — switched to No-Cookie embed`);
        setEngineMode('fallback_iframe');
      }
    },
    [pickPreferredMuxedIndex]
  );

  // Compute active media source URL for HTML5 <video>
  const activeMediaSrc = useMemo(() => {
    if (engineMode !== 'native' || !streamData) return '';
    if (audioOnlyMode && streamData.audioStreams.length > 0) {
      return streamData.audioStreams[0].url;
    }
    if (streamData.isLive && streamData.hlsUrl) {
      return streamData.hlsUrl;
    }
    const chosen =
      streamData.muxedStreams[selectedMuxedIndex] || streamData.muxedStreams[0];
    if (chosen?.url) return chosen.url;
    if (streamData.hlsUrl) return streamData.hlsUrl;
    if (streamData.audioStreams[0]?.url) return streamData.audioStreams[0].url;
    return '';
  }, [engineMode, streamData, audioOnlyMode, selectedMuxedIndex]);

  const activeResolutionLabel = useMemo(() => {
    if (engineMode !== 'native' || !streamData) return '';
    if (audioOnlyMode && streamData.audioStreams.length > 0) {
      const audio = streamData.audioStreams[0];
      return `${audio.format.toUpperCase()} Audio`;
    }
    if (streamData.isLive && streamData.hlsUrl) return 'LIVE HLS';
    const chosen =
      streamData.muxedStreams[selectedMuxedIndex] || streamData.muxedStreams[0];
    return chosen?.resolution || 'Auto';
  }, [engineMode, streamData, audioOnlyMode, selectedMuxedIndex]);

  // Keep playbackRate synced to <video>
  useEffect(() => {
    const el = mediaRef.current;
    if (el) {
      el.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, activeMediaSrc]);

  const handleMediaLoadedMetadata = () => {
    const el = mediaRef.current;
    if (!el) return;
    el.playbackRate = playbackSpeed;
    if (Number.isFinite(el.duration) && el.duration > 0) {
      setMediaDuration(el.duration);
    }
    if (pendingSeekTimeRef.current !== null && Number.isFinite(pendingSeekTimeRef.current)) {
      el.currentTime = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
    }
    if (shouldResumeAfterSwapRef.current) {
      shouldResumeAfterSwapRef.current = false;
      void el.play().catch(() => {
        setIsPlaying(false);
      });
    }
  };

  const handleMediaError = () => {
    if (engineMode === 'native' && activeLecture) {
      setFallbackReason('Stream playback error — switched to No-Cookie embed');
      setEngineMode('fallback_iframe');
      setIsPlaying(false);
    }
  };

  const handleTogglePlayPause = () => {
    const el = mediaRef.current;
    if (!el) return;
    haptics.tick(500);
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  const handleSkipSeconds = (delta: number) => {
    const el = mediaRef.current;
    if (!el) return;
    haptics.tick(450);
    const maxTime = Number.isFinite(el.duration) ? el.duration : mediaDuration || 0;
    const next = Math.max(0, Math.min(maxTime > 0 ? maxTime : el.currentTime + delta, el.currentTime + delta));
    el.currentTime = next;
    setCurrentTime(next);
  };

  const handleCycleSpeed = () => {
    haptics.tick(550);
    const idx = PLAYBACK_SPEEDS.indexOf(playbackSpeed as (typeof PLAYBACK_SPEEDS)[number]);
    const nextSpeed = PLAYBACK_SPEEDS[(idx + 1) % PLAYBACK_SPEEDS.length];
    setPlaybackSpeed(nextSpeed);
  };

  const handleCycleResolution = () => {
    if (!streamData || streamData.muxedStreams.length <= 1) return;
    haptics.tick(550);
    const el = mediaRef.current;
    if (el) {
      pendingSeekTimeRef.current = el.currentTime;
      shouldResumeAfterSwapRef.current = !el.paused;
    }
    setAudioOnlyMode(false);
    setSelectedMuxedIndex((prev) => (prev + 1) % streamData.muxedStreams.length);
  };

  const handleToggleAudioOnly = () => {
    if (!streamData || streamData.audioStreams.length === 0) return;
    haptics.tick(600);
    const el = mediaRef.current;
    if (el) {
      pendingSeekTimeRef.current = el.currentTime;
      shouldResumeAfterSwapRef.current = !el.paused;
    }
    setAudioOnlyMode((prev) => !prev);
  };

  const handleSeekBarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const el = mediaRef.current;
    if (el && Number.isFinite(val)) {
      el.currentTime = val;
      setCurrentTime(val);
    }
  };

  const handleFullscreen = () => {
    const el = mediaRef.current;
    if (!el) return;
    haptics.tick(500);
    if (el.requestFullscreen) {
      void el.requestFullscreen().catch(() => {});
    }
  };

  // Search & Direct URL Paste Handler
  const handleSearchOrPasteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = searchOrUrlInput.trim();
    if (!raw) return;

    haptics.tick(600);
    setBlockedNotice(null);
    setSearchError('');

    const pastedVideoId = extractYouTubeVideoId(raw);

    // CASE 1: Direct Video URL or 11-char Video ID pasted
    if (pastedVideoId || isDirectYouTubeUrlOrId(raw)) {
      // Instant block for Shorts URLs
      if (isYouTubeShortsUrl(raw)) {
        haptics.thud();
        setBlockedNotice({
          reason: 'short_form',
          title: 'YouTube Shorts Blocked',
          message:
            'ZeroTube strictly strips all YouTube Shorts and videos under 2 minutes to protect deep focus.',
        });
        return;
      }

      if (!pastedVideoId) {
        // User pasted a channel URL instead of a video URL — offer to add via quick channel drawer
        setChannelAddInput(raw);
        setShowQuickAddChannel(true);
        setSearchError('Channel link detected — resolve and add it to your Whitelist below.');
        return;
      }

      if (whitelistedChannels.length === 0) {
        haptics.thud();
        setBlockedNotice({
          reason: 'not_whitelisted',
          title: 'Channel Whitelist Is Empty',
          message:
            'Add at least one study channel to your deterministic whitelist before playing pasted video links.',
        });
        return;
      }

      if (!isZeroTubeNativeAvailable()) {
        haptics.thud();
        setBlockedNotice({
          reason: 'unverifiable',
          title: 'Native Verification Required',
          message:
            'Channel ownership verification for pasted YouTube links runs locally through the Android NewPipeExtractor engine.',
        });
        return;
      }

      setIsSearching(true);
      const videoUrl = `https://www.youtube.com/watch?v=${pastedVideoId}`;

      try {
        // Extract stream & uploader metadata in one local call
        const extracted = await ZeroTube.getStream({ videoUrl });

        // Enforce non-Short rule (< 120s)
        if (extracted.isShort || (!extracted.isLive && extracted.duration >= 0 && extracted.duration < MIN_FULL_LENGTH_SECONDS)) {
          haptics.thud();
          setBlockedNotice({
            reason: 'short_form',
            title: 'Short-Form Video Blocked (< 2 min)',
            videoTitle: extracted.title,
            channelName: extracted.uploaderName,
            channelHandle: extracted.uploaderHandle,
            channelId: extracted.uploaderChannelId,
            message:
              'Videos shorter than 120 seconds are automatically stripped to prevent dopamine loops.',
          });
          setIsSearching(false);
          return;
        }

        // Strict deterministic whitelist check on UC... ID / @handle / resolved name
        let matched = matchWhitelistedChannel(
          {
            channelId: extracted.uploaderChannelId,
            handle: extracted.uploaderHandle,
            uploaderUrl: extracted.uploaderUrl,
            uploaderName: extracted.uploaderName,
          },
          whitelistedChannels
        );

        // If handle wasn't in uploaderUrl (e.g. only /channel/UC...), resolve channel to compare all 3 identifiers
        let resolvedHandle = extracted.uploaderHandle;
        let resolvedId = extracted.uploaderChannelId;
        if (!matched && extracted.uploaderUrl) {
          try {
            const chInfo = await ZeroTube.resolveChannel({ input: extracted.uploaderUrl });
            resolvedId = chInfo.id || resolvedId;
            resolvedHandle = chInfo.handle || resolvedHandle;
            matched = matchWhitelistedChannel(
              {
                channelId: resolvedId,
                handle: resolvedHandle,
                uploaderUrl: chInfo.url,
                uploaderName: chInfo.name || extracted.uploaderName,
              },
              whitelistedChannels
            );
          } catch {
            // Keep initial mismatch result
          }
        }

        if (!matched) {
          haptics.thud();
          setBlockedNotice({
            reason: 'not_whitelisted',
            title: 'Blocked: Channel Not Whitelisted',
            videoTitle: extracted.title,
            channelName: extracted.uploaderName || 'Unknown Channel',
            channelHandle: resolvedHandle || undefined,
            channelId: resolvedId || undefined,
            message:
              'Deterministic Whitelist Lock is active. Only full-length videos from your explicitly whitelisted study channels are permitted.',
          });
          setIsSearching(false);
          return;
        }

        // Permitted! Load immediately with pre-extracted stream
        haptics.tick(900);
        setSearchOrUrlInput('');
        await loadLectureIntoPlayer(
          {
            videoId: extracted.videoId || pastedVideoId,
            url: videoUrl,
            title: extracted.title || `Lecture (${pastedVideoId})`,
            uploaderName: matched.name || extracted.uploaderName,
            uploaderChannelId: resolvedId || matched.id,
            uploaderHandle: resolvedHandle || matched.handle,
            duration: extracted.duration,
            thumbnailUrl: extracted.thumbnailUrl,
            isLive: extracted.isLive,
          },
          extracted
        );
      } catch {
        // Stream extraction failed — verify channel ownership via resolveChannel before allowing nocookie embed fallback
        try {
          const resolved = await ZeroTube.resolveChannel({ input: videoUrl });
          if (resolved.isShort || (!resolved.isLive && (resolved.videoDuration ?? 0) >= 0 && (resolved.videoDuration ?? 0) < MIN_FULL_LENGTH_SECONDS)) {
            haptics.thud();
            setBlockedNotice({
              reason: 'short_form',
              title: 'Short-Form Video Blocked (< 2 min)',
              videoTitle: resolved.videoTitle,
              channelName: resolved.name,
              channelHandle: resolved.handle,
              channelId: resolved.id,
              message:
                'Videos shorter than 120 seconds are automatically stripped to prevent dopamine loops.',
            });
            setIsSearching(false);
            return;
          }

          const matched = matchWhitelistedChannel(
            {
              channelId: resolved.id,
              handle: resolved.handle,
              uploaderUrl: resolved.url,
              uploaderName: resolved.name,
            },
            whitelistedChannels
          );

          if (!matched) {
            haptics.thud();
            setBlockedNotice({
              reason: 'not_whitelisted',
              title: 'Blocked: Channel Not Whitelisted',
              videoTitle: resolved.videoTitle,
              channelName: resolved.name || 'Unknown Channel',
              channelHandle: resolved.handle || undefined,
              channelId: resolved.id || undefined,
              message:
                'Deterministic Whitelist Lock is active. Only full-length videos from your explicitly whitelisted study channels are permitted.',
            });
            setIsSearching(false);
            return;
          }

          // Channel verified, but stream extraction errored -> seamless iframe fallback
          setSearchOrUrlInput('');
          setActiveLecture({
            videoId: resolved.videoId || pastedVideoId,
            url: videoUrl,
            title: resolved.videoTitle || `Lecture (${pastedVideoId})`,
            uploaderName: matched.name || resolved.name,
            uploaderChannelId: resolved.id || matched.id,
            uploaderHandle: resolved.handle || matched.handle,
            duration: resolved.videoDuration ?? -1,
            thumbnailUrl: resolved.videoThumbnailUrl || '',
            isLive: Boolean(resolved.isLive),
          });
          setStreamData(null);
          setFallbackReason('Stream extraction error — switched to No-Cookie embed');
          setEngineMode('fallback_iframe');
        } catch (resolveErr) {
          haptics.thud();
          setBlockedNotice({
            reason: 'unverifiable',
            title: 'Could Not Verify Video Channel',
            message:
              resolveErr instanceof Error
                ? resolveErr.message
                : 'Unable to verify channel ownership. Unverified videos are blocked by default.',
          });
        }
      } finally {
        setIsSearching(false);
      }
      return;
    }

    // CASE 2: Topic Search (strictly whitelisted channels only)
    if (whitelistedChannels.length === 0) {
      setSearchError('Add at least one study channel to your whitelist before searching.');
      setShowQuickAddChannel(true);
      return;
    }

    if (!isZeroTubeNativeAvailable()) {
      setSearchError('Local YouTube search runs natively on Android via NewPipeExtractor.');
      return;
    }

    const activePillChannel =
      selectedChannelKey === 'all'
        ? null
        : whitelistedChannels.find((c) => getChannelKey(c) === selectedChannelKey) || null;

    const scopedWhitelist = activePillChannel ? [activePillChannel] : whitelistedChannels;
    const effectiveQuery =
      activePillChannel && !raw.toLowerCase().includes(activePillChannel.name.toLowerCase())
        ? `${raw} ${activePillChannel.name}`
        : raw;

    setIsSearching(true);
    setHasSearched(true);
    setLastSearchQuery(raw);

    try {
      const res = await ZeroTube.searchVideos({
        query: effectiveQuery,
        whitelistedChannels: scopedWhitelist.map((c) => ({
          id: c.id,
          handle: c.handle,
          name: c.name,
          url: c.url,
        })),
      });
      setSearchResults(res.videos || []);
    } catch (err) {
      setSearchResults([]);
      setSearchError(err instanceof Error ? err.message : 'Search failed. Check your connection.');
    } finally {
      setIsSearching(false);
    }
  };

  // Inline Quick Add Study Channel
  const handleQuickAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = channelAddInput.trim();
    if (!raw) return;

    haptics.tick(600);
    setIsResolvingChannel(true);
    setChannelAddFeedback(null);

    try {
      if (isZeroTubeNativeAvailable()) {
        const resolved = await ZeroTube.resolveChannel({ input: raw });
        const updated = saveWhitelistedChannel({
          id: resolved.id,
          handle: resolved.handle,
          name: resolved.name,
          url: resolved.url,
          avatarUrl: resolved.avatarUrl,
        });
        setWhitelistedChannels(updated);
        setChannelAddInput('');
        setChannelAddFeedback({
          type: 'success',
          text: `Whitelisted ${resolved.name}${resolved.handle ? ` (${resolved.handle})` : ''}`,
        });
        haptics.tick(900);
      } else {
        // Deterministic URL/ID parser fallback for web preview
        const id = extractYouTubeChannelId(raw);
        const handle = extractYouTubeChannelHandle(raw);
        if (!id && !handle) {
          setChannelAddFeedback({
            type: 'error',
            text: 'Enter a valid @handle, UC... channel ID, or YouTube channel URL.',
          });
          setIsResolvingChannel(false);
          return;
        }
        const updated = saveWhitelistedChannel({
          id,
          handle,
          name: handle || id,
          url: id
            ? `https://www.youtube.com/channel/${id}`
            : `https://www.youtube.com/${handle}`,
        });
        setWhitelistedChannels(updated);
        setChannelAddInput('');
        setChannelAddFeedback({
          type: 'success',
          text: `Whitelisted ${handle || id}`,
        });
      }
    } catch (err) {
      haptics.thud();
      setChannelAddFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resolve channel.',
      });
    } finally {
      setIsResolvingChannel(false);
    }
  };

  const handleRemoveChannel = (ch: WhitelistedChannel) => {
    haptics.thud();
    const key = getChannelKey(ch);
    const updated = removeWhitelistedChannel({ id: ch.id, handle: ch.handle, name: ch.name });
    setWhitelistedChannels(updated);
    if (selectedChannelKey === key) {
      setSelectedChannelKey('all');
    }
  };

  const handleDeleteSavedLecture = (e: React.MouseEvent, videoId: string) => {
    e.stopPropagation();
    haptics.tick(700);
    setSavedLectures(removeSavedZeroTubeLecture(videoId));
  };

  const handleSaveNotes = (text: string) => {
    setStudyNotes(text);
    try {
      localStorage.setItem(STORAGE_KEY_STUDY_NOTES, text);
    } catch {
      // Ignore
    }
  };

  const handleLaunchExternalApp = () => {
    haptics.tick(700);
    if (onLaunchMorphApp) {
      onLaunchMorphApp();
      return;
    }
    const pkg = 'app.morphe.android.youtube';
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchYouTubeOrMorphApp) {
      if ((window.ZeroNative as any).launchYouTubeOrMorphApp()) return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchBagApp) {
      if ((window.ZeroNative as any).launchBagApp(pkg)) return;
    }
  };

  // Filtered search results & saved lectures according to selected Whitelist Pill
  const selectedChannelObj = useMemo(
    () =>
      selectedChannelKey === 'all'
        ? null
        : whitelistedChannels.find((c) => getChannelKey(c) === selectedChannelKey) || null,
    [selectedChannelKey, whitelistedChannels]
  );

  const visibleSearchResults = useMemo(() => {
    if (!selectedChannelObj) return searchResults;
    return searchResults.filter((v) =>
      Boolean(
        matchWhitelistedChannel(
          {
            channelId: v.uploaderChannelId,
            handle: v.uploaderHandle,
            uploaderUrl: v.uploaderUrl,
            uploaderName: v.uploaderName,
          },
          [selectedChannelObj]
        )
      )
    );
  }, [searchResults, selectedChannelObj]);

  const visibleSavedLectures = useMemo(() => {
    if (!selectedChannelObj) return savedLectures;
    return savedLectures.filter((l) =>
      Boolean(
        matchWhitelistedChannel(
          {
            channelId: l.uploaderChannelId,
            handle: l.uploaderHandle,
            uploaderName: l.uploaderName,
          },
          [selectedChannelObj]
        )
      )
    );
  }, [savedLectures, selectedChannelObj]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ZeroTube Study Player"
      className="fixed inset-0 z-[120] flex items-center justify-center p-2.5 sm:p-5 backdrop-blur-2xl animate-fadeIn select-none font-sans"
      style={{ backgroundColor: 'color-mix(in srgb, var(--bg-primary) 86%, transparent)' }}
    >
      <div
        className="relative w-full max-w-2xl max-h-[94vh] rounded-[24px] modal-glass shadow-2xl flex flex-col overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-modal, var(--bg-primary))',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        {/* Header Bar */}
        <div
          className="px-4 sm:px-5 py-3 flex items-center justify-between gap-2 shrink-0"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
          }}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
              style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <Play size={15} fill="currentColor" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="text-xs font-bold tracking-wider truncate"
                  style={{ color: 'var(--text-primary)' }}
                >
                  ZeroTube
                </span>
                <span
                  className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wide flex items-center gap-1 shrink-0"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  <ShieldCheck size={10} />
                  Whitelist Locked
                </span>
              </div>
              <p
                className="text-[10px] font-mono tracking-wider truncate mt-0.5"
                style={{ color: 'var(--text-muted)' }}
              >
                AD-FREE LOCAL ENGINE • NO SHORTS • DETERMINISTIC CHANNELS
              </p>
            </div>
          </div>

          <button
            type="button"
            aria-label="Close ZeroTube"
            onClick={() => {
              haptics.thud();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer transition-opacity hover:opacity-85"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Dual-Engine Player Container */}
        <div
          className="w-full relative shrink-0"
          style={{
            backgroundColor: 'var(--bg-primary)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          <div className="w-full aspect-video relative overflow-hidden flex items-center justify-center">
            {engineMode === 'loading' && (
              <div
                className="w-full h-full flex flex-col items-center justify-center gap-2.5 p-6 text-center"
                style={{ backgroundColor: 'var(--bg-primary)' }}
              >
                <Loader2
                  size={26}
                  className="animate-spin"
                  style={{ color: 'var(--accent-primary)' }}
                />
                <p
                  className="text-xs font-medium"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Extracting ad-free stream locally...
                </p>
              </div>
            )}

            {engineMode === 'native' && activeLecture && activeMediaSrc && (
              <>
                <video
                  ref={mediaRef}
                  key={activeMediaSrc}
                  src={activeMediaSrc}
                  playsInline
                  preload="metadata"
                  onLoadedMetadata={handleMediaLoadedMetadata}
                  onTimeUpdate={() => {
                    if (mediaRef.current) setCurrentTime(mediaRef.current.currentTime);
                  }}
                  onPlay={() => setIsPlaying(true)}
                  onPause={() => setIsPlaying(false)}
                  onEnded={() => setIsPlaying(false)}
                  onError={handleMediaError}
                  onClick={handleTogglePlayPause}
                  className={audioOnlyMode ? 'sr-only' : 'w-full h-full object-contain cursor-pointer'}
                />

                {audioOnlyMode && (
                  <div
                    className="w-full h-full flex flex-col items-center justify-center p-5 text-center gap-2.5"
                    style={{
                      backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
                    }}
                  >
                    <div
                      className="w-14 h-14 rounded-2xl flex items-center justify-center"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        border: '1px solid var(--accent-border)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Headphones size={26} />
                    </div>
                    <div className="max-w-md px-2">
                      <p
                        className="text-xs font-bold line-clamp-2"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {activeLecture.title}
                      </p>
                      <p
                        className="text-[11px] font-mono mt-1"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        Audio-Only Lecture Mode • {activeResolutionLabel}
                      </p>
                    </div>
                  </div>
                )}
              </>
            )}

            {engineMode === 'fallback_iframe' && activeLecture && (
              <iframe
                title={activeLecture.title}
                src={`https://www.youtube-nocookie.com/embed/${activeLecture.videoId}?rel=0&modestbranding=1&playsinline=1`}
                referrerPolicy="strict-origin-when-cross-origin"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                className="w-full h-full border-0"
              />
            )}

            {engineMode === 'idle' && (
              <div
                className="w-full h-full flex flex-col items-center justify-center p-6 text-center"
                style={{ backgroundColor: 'var(--surface-tonal, var(--bg-surface))' }}
              >
                <div
                  className="w-12 h-12 rounded-2xl flex items-center justify-center mb-3"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    border: '1px solid var(--accent-border)',
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Play size={22} fill="currentColor" />
                </div>
                <h3
                  className="text-xs font-bold tracking-wide"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Ready for Focused Study
                </h3>
                <p
                  className="text-[11px] mt-1 max-w-xs leading-relaxed"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Search topics across your whitelisted study channels or paste a direct lecture URL below.
                </p>
              </div>
            )}
          </div>

          {/* Native Study Controls Bar (shown when Native Stream Engine is active) */}
          {engineMode === 'native' && activeLecture && (
            <div
              className="px-3.5 py-2.5 space-y-2"
              style={{
                backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
                borderTop: '1px solid var(--border-subtle)',
              }}
            >
              {/* Timeline Scrubber */}
              {!activeLecture.isLive && (
                <div className="flex items-center gap-2">
                  <span
                    className="text-[10px] font-mono tabular-nums shrink-0"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {formatDurationSeconds(currentTime)}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(1, mediaDuration || activeLecture.duration || 1)}
                    step={1}
                    value={Math.min(currentTime, mediaDuration || activeLecture.duration || currentTime)}
                    onChange={handleSeekBarChange}
                    aria-label="Seek lecture timeline"
                    className="flex-1 h-1.5 rounded-full cursor-pointer"
                    style={{ accentColor: 'var(--accent-primary)' }}
                  />
                  <span
                    className="text-[10px] font-mono tabular-nums shrink-0"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {formatDurationSeconds(mediaDuration || activeLecture.duration)}
                  </span>
                </div>
              )}

              {/* Tactile Study Controls */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={handleTogglePlayPause}
                    aria-label={isPlaying ? 'Pause' : 'Play'}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)',
                    }}
                  >
                    {isPlaying ? <Pause size={12} fill="currentColor" /> : <Play size={12} fill="currentColor" />}
                    <span>{isPlaying ? 'Pause' : 'Play'}</span>
                  </button>

                  {!activeLecture.isLive && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSkipSeconds(-10)}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <RotateCcw size={11} />
                        <span>-10s</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleSkipSeconds(10)}
                        className="px-2 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-primary)',
                        }}
                      >
                        <RotateCw size={11} />
                        <span>+10s</span>
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Playback Speed 1x -> 2x */}
                  <button
                    type="button"
                    onClick={handleCycleSpeed}
                    title="Cycle playback speed (1x to 2x)"
                    className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer shrink-0"
                    style={{
                      backgroundColor: playbackSpeed !== 1 ? 'var(--accent-soft)' : 'var(--bg-surface)',
                      border: `1px solid ${playbackSpeed !== 1 ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      color: playbackSpeed !== 1 ? 'var(--accent-primary)' : 'var(--text-primary)',
                    }}
                  >
                    {playbackSpeed}x
                  </button>

                  {/* Resolution Toggle */}
                  {!audioOnlyMode && streamData && streamData.muxedStreams.length > 0 && (
                    <button
                      type="button"
                      onClick={handleCycleResolution}
                      disabled={streamData.muxedStreams.length <= 1}
                      title="Toggle stream resolution"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-70"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <MonitorPlay size={11} />
                      <span>{activeResolutionLabel}</span>
                    </button>
                  )}

                  {/* Audio-Only Lecture Toggle */}
                  {streamData && streamData.audioStreams.length > 0 && (
                    <button
                      type="button"
                      onClick={handleToggleAudioOnly}
                      title="Toggle Audio-Only Lecture Mode (M4A)"
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                      style={{
                        backgroundColor: audioOnlyMode ? 'var(--accent-soft)' : 'var(--bg-surface)',
                        border: `1px solid ${audioOnlyMode ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        color: audioOnlyMode ? 'var(--accent-primary)' : 'var(--text-secondary)',
                      }}
                    >
                      <Headphones size={11} />
                      <span>{audioOnlyMode ? 'Video' : 'Audio'}</span>
                    </button>
                  )}

                  {/* Fullscreen */}
                  {!audioOnlyMode && (
                    <button
                      type="button"
                      onClick={handleFullscreen}
                      aria-label="Fullscreen"
                      className="p-1.5 rounded-lg cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Maximize2 size={12} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lecture Metadata & Action Bar */}
        <div
          className="px-4 sm:px-5 py-2.5 flex items-center justify-between gap-2 flex-wrap shrink-0"
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
          }}
        >
          <div className="min-w-0 flex-1">
            <h4
              className="text-xs font-semibold truncate"
              style={{ color: 'var(--text-primary)' }}
            >
              {activeLecture ? activeLecture.title : 'Select or search a whitelisted lecture'}
            </h4>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              <span
                className="text-[10px] font-mono truncate"
                style={{ color: 'var(--accent-primary)' }}
              >
                {activeLecture
                  ? `${activeLecture.uploaderName}${activeLecture.uploaderHandle ? ` (${activeLecture.uploaderHandle})` : ''}`
                  : 'Deterministic Channel Lock Active'}
              </span>
              {engineMode === 'native' && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--accent-soft)',
                    color: 'var(--accent-primary)',
                    border: '1px solid var(--accent-border)',
                  }}
                >
                  Native • {activeResolutionLabel}
                </span>
              )}
              {engineMode === 'fallback_iframe' && (
                <span
                  className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    color: 'var(--text-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                  title={fallbackReason}
                >
                  No-Cookie Embed
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap shrink-0">
            <button
              type="button"
              onClick={() => {
                haptics.tick(500);
                setShowAppGuardPanel((prev) => !prev);
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              style={{
                backgroundColor: showAppGuardPanel
                  ? 'var(--accent-soft)'
                  : 'var(--surface-tonal)',
                border: `1px solid ${showAppGuardPanel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                color: showAppGuardPanel
                  ? 'var(--accent-primary)'
                  : 'var(--text-primary)',
              }}
            >
              <Shield size={11} />
              <span>App Guard</span>
            </button>

            {onLaunchMorphApp && (
              <button
                type="button"
                onClick={handleLaunchExternalApp}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <ExternalLink size={11} />
                <span>App</span>
              </button>
            )}

            {onOpenSettingsStudio && (
              <button
                type="button"
                onClick={() => {
                  haptics.tick(600);
                  onOpenSettingsStudio();
                }}
                className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                style={{
                  backgroundColor: 'var(--surface-tonal)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Settings size={11} />
                <span>Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                haptics.tick(500);
                setActiveTab(activeTab === 'catalog' ? 'notes' : 'catalog');
              }}
              className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
              style={{
                backgroundColor:
                  activeTab === 'notes' ? 'var(--accent-soft)' : 'var(--surface-tonal)',
                border: `1px solid ${activeTab === 'notes' ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                color:
                  activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-primary)',
              }}
            >
              <FileText size={11} />
              <span>{activeTab === 'notes' ? 'Search' : 'Notes'}</span>
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3.5 sm:p-4 space-y-3">
          {showAppGuardPanel && (
            <div className="animate-fadeIn">
              <OfficialYouTubeGuardCard compact />
            </div>
          )}

          {activeTab === 'catalog' ? (
            <>
              {/* Whitelist Pill Bar */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2 px-0.5">
                  <span
                    className="text-[10px] font-mono tracking-wider"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    WHITELISTED CHANNELS ({whitelistedChannels.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tick(500);
                      setShowQuickAddChannel((prev) => !prev);
                      setChannelAddFeedback(null);
                    }}
                    className="text-[10px] font-semibold flex items-center gap-1 px-2 py-0.5 rounded-full cursor-pointer shrink-0"
                    style={{
                      backgroundColor: showQuickAddChannel
                        ? 'var(--accent-soft)'
                        : 'var(--surface-tonal)',
                      border: `1px solid ${showQuickAddChannel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <Plus size={11} />
                    <span>Add Channel</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.tick(450);
                      setSelectedChannelKey('all');
                    }}
                    className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                    style={{
                      backgroundColor:
                        selectedChannelKey === 'all'
                          ? 'var(--accent-soft)'
                          : 'var(--surface-tonal)',
                      border: `1px solid ${selectedChannelKey === 'all' ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                      color:
                        selectedChannelKey === 'all'
                          ? 'var(--accent-primary)'
                          : 'var(--text-secondary)',
                    }}
                  >
                    All Channels
                  </button>

                  {whitelistedChannels.map((ch) => {
                    const key = getChannelKey(ch);
                    const isSelected = selectedChannelKey === key;
                    return (
                      <div
                        key={key}
                        className="inline-flex items-center rounded-full shrink-0 overflow-hidden"
                        style={{
                          backgroundColor: isSelected
                            ? 'var(--accent-soft)'
                            : 'var(--surface-tonal)',
                          border: `1px solid ${isSelected ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(450);
                            setSelectedChannelKey(key);
                          }}
                          className="pl-3 pr-2 py-1.5 text-[11px] font-semibold whitespace-nowrap cursor-pointer"
                          style={{
                            color: isSelected
                              ? 'var(--accent-primary)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {ch.name || ch.handle || ch.id}
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${ch.name}`}
                          onClick={() => handleRemoveChannel(ch)}
                          className="pr-2.5 pl-0.5 py-1.5 cursor-pointer opacity-70 hover:opacity-100"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          <X size={11} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Inline Add Channel Drawer */}
              {showQuickAddChannel && (
                <form
                  onSubmit={handleQuickAddChannel}
                  className="p-3 rounded-2xl space-y-2 animate-fadeIn"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--border-strong)',
                  }}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className="text-[11px] font-semibold flex items-center gap-1.5"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      <SlidersHorizontal size={12} style={{ color: 'var(--accent-primary)' }} />
                      <span>Resolve &amp; Whitelist Study Channel</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowQuickAddChannel(false)}
                      className="text-[10px] cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Close
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={channelAddInput}
                      onChange={(e) => setChannelAddInput(e.target.value)}
                      placeholder="@handle, channel URL, UC... ID, or sample video URL"
                      className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs focus:outline-none"
                      style={{
                        backgroundColor: 'var(--bg-input)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    />
                    <button
                      type="submit"
                      disabled={isResolvingChannel || !channelAddInput.trim()}
                      className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      {isResolvingChannel ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <Plus size={13} />
                      )}
                      <span>{isResolvingChannel ? 'Resolving' : 'Add'}</span>
                    </button>
                  </div>
                  {channelAddFeedback && (
                    <p
                      className="text-[11px] flex items-center gap-1.5"
                      style={{
                        color:
                          channelAddFeedback.type === 'success'
                            ? 'var(--status-success)'
                            : 'var(--status-danger)',
                      }}
                    >
                      {channelAddFeedback.type === 'success' ? (
                        <CheckCircle2 size={12} />
                      ) : (
                        <AlertCircle size={12} />
                      )}
                      <span>{channelAddFeedback.text}</span>
                    </p>
                  )}
                </form>
              )}

              {/* Search & Paste Bar */}
              <form onSubmit={handleSearchOrPasteSubmit} className="flex gap-2">
                <div className="relative flex-1 min-w-0">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    style={{ color: 'var(--text-muted)' }}
                  />
                  <input
                    type="text"
                    value={searchOrUrlInput}
                    onChange={(e) => setSearchOrUrlInput(e.target.value)}
                    placeholder={
                      selectedChannelObj
                        ? `Search ${selectedChannelObj.name} or paste video URL...`
                        : 'Search whitelisted topics or paste a YouTube video URL...'
                    }
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl text-xs focus:outline-none"
                    style={{
                      backgroundColor: 'var(--bg-input)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSearching || !searchOrUrlInput.trim()}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0 cursor-pointer disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--accent-primary)',
                    color: 'var(--text-on-accent)',
                  }}
                >
                  {isSearching ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
                  <span>{isSearching ? 'Checking' : 'Go'}</span>
                </button>
              </form>

              {/* Search Error Banner */}
              {searchError && (
                <div
                  className="p-3 rounded-xl text-xs flex items-start gap-2"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--status-warning)',
                    color: 'var(--status-warning)',
                  }}
                >
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{searchError}</span>
                </div>
              )}

              {/* Instant Block Card (Non-Whitelisted Channel or Short) */}
              {blockedNotice && (
                <div
                  className="p-4 rounded-2xl space-y-2.5 animate-fadeIn"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--status-danger)',
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--status-danger)',
                          color: 'var(--status-danger)',
                        }}
                      >
                        <ShieldBan size={16} />
                      </div>
                      <div>
                        <h4
                          className="text-xs font-bold"
                          style={{ color: 'var(--status-danger)' }}
                        >
                          {blockedNotice.title}
                        </h4>
                        {blockedNotice.videoTitle && (
                          <p
                            className="text-[11px] font-medium line-clamp-1 mt-0.5"
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {blockedNotice.videoTitle}
                          </p>
                        )}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setBlockedNotice(null)}
                      className="p-1 cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <X size={13} />
                    </button>
                  </div>

                  <p
                    className="text-[11px] leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {blockedNotice.message}
                  </p>

                  {(blockedNotice.channelName || blockedNotice.channelHandle || blockedNotice.channelId) && (
                    <div
                      className="px-3 py-2 rounded-xl text-[10px] font-mono flex flex-wrap items-center gap-x-3 gap-y-1"
                      style={{
                        backgroundColor: 'var(--bg-primary)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      {blockedNotice.channelName && (
                        <span>Channel: {blockedNotice.channelName}</span>
                      )}
                      {blockedNotice.channelHandle && (
                        <span>Handle: {blockedNotice.channelHandle}</span>
                      )}
                      {blockedNotice.channelId && (
                        <span>ID: {blockedNotice.channelId}</span>
                      )}
                    </div>
                  )}

                  {blockedNotice.reason === 'not_whitelisted' && (
                    <div className="flex items-center gap-2 flex-wrap pt-0.5">
                      {onOpenSettingsStudio && (
                        <button
                          type="button"
                          onClick={() => {
                            haptics.tick(600);
                            onOpenSettingsStudio();
                          }}
                          className="px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            border: '1px solid var(--border-strong)',
                            color: 'var(--text-primary)',
                          }}
                        >
                          Manage Whitelist in Studio
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setBlockedNotice(null)}
                        className="px-3 py-1.5 rounded-xl text-[11px] font-semibold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--bg-surface)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-muted)',
                        }}
                      >
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Whitelisted Search Results */}
              {hasSearched && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className="text-[10px] font-mono tracking-wider"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      WHITELISTED RESULTS FOR &quot;{lastSearchQuery}&quot; ({visibleSearchResults.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="text-[10px] cursor-pointer"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      Clear
                    </button>
                  </div>

                  {visibleSearchResults.length === 0 && !isSearching ? (
                    <div
                      className="p-4 rounded-2xl text-center space-y-1"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <p
                        className="text-xs font-semibold"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        No whitelisted full-length matches
                      </p>
                      <p
                        className="text-[11px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        Non-whitelisted channels, Shorts (&lt;2 min), and mixes were stripped automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {visibleSearchResults.map((vid) => {
                        const isCurrent = activeLecture?.videoId === vid.videoId;
                        return (
                          <button
                            key={vid.videoId}
                            type="button"
                            onClick={() => {
                              haptics.tick(600);
                              void loadLectureIntoPlayer({
                                videoId: vid.videoId,
                                url: vid.url,
                                title: vid.title,
                                uploaderName: vid.uploaderName,
                                uploaderChannelId: vid.uploaderChannelId,
                                uploaderHandle: vid.uploaderHandle,
                                duration: vid.duration,
                                thumbnailUrl: vid.thumbnailUrl,
                                isLive: vid.isLive,
                              });
                            }}
                            className="w-full p-2.5 rounded-2xl flex items-center gap-3 text-left cursor-pointer transition-colors"
                            style={{
                              backgroundColor: isCurrent
                                ? 'var(--accent-soft)'
                                : 'var(--surface-tonal)',
                              border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                            }}
                          >
                            <div
                              className="w-24 aspect-video rounded-xl overflow-hidden shrink-0 relative flex items-center justify-center"
                              style={{ backgroundColor: 'var(--bg-primary)' }}
                            >
                              {vid.thumbnailUrl ? (
                                <img
                                  src={vid.thumbnailUrl}
                                  alt={vid.title}
                                  className="w-full h-full object-cover"
                                  loading="lazy"
                                />
                              ) : (
                                <Play size={16} style={{ color: 'var(--accent-primary)' }} />
                              )}
                              <span
                                className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold"
                                style={{
                                  backgroundColor: 'var(--bg-primary)',
                                  color: vid.isLive
                                    ? 'var(--status-danger)'
                                    : 'var(--text-primary)',
                                }}
                              >
                                {vid.isLive ? (
                                  <span className="inline-flex items-center gap-0.5">
                                    <Radio size={8} /> LIVE
                                  </span>
                                ) : (
                                  formatDurationSeconds(vid.duration)
                                )}
                              </span>
                            </div>

                            <div className="min-w-0 flex-1 space-y-1">
                              <p
                                className="text-xs font-semibold line-clamp-2 leading-snug"
                                style={{ color: 'var(--text-primary)' }}
                              >
                                {vid.title}
                              </p>
                              <div className="flex items-center gap-2 flex-wrap text-[10px] font-mono">
                                <span
                                  className="truncate max-w-[160px]"
                                  style={{ color: 'var(--accent-primary)' }}
                                >
                                  {vid.uploaderName}
                                </span>
                                {vid.textualUploadDate && (
                                  <span style={{ color: 'var(--text-muted)' }}>
                                    • {vid.textualUploadDate}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Recent Whitelisted Lectures */}
              {visibleSavedLectures.length > 0 && (
                <div className="space-y-2">
                  <div className="text-[10px] font-mono tracking-wider px-0.5" style={{ color: 'var(--text-muted)' }}>
                    RECENT STUDY LECTURES ({visibleSavedLectures.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleSavedLectures.map((lec) => {
                      const isCurrent = activeLecture?.videoId === lec.videoId;
                      return (
                        <div
                          key={lec.videoId}
                          className="p-2.5 rounded-xl flex flex-col justify-between gap-1.5 transition-colors"
                          style={{
                            backgroundColor: isCurrent
                              ? 'var(--accent-soft)'
                              : 'var(--surface-tonal)',
                            border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <div className="flex items-start justify-between gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                haptics.tick(600);
                                void loadLectureIntoPlayer({
                                  videoId: lec.videoId,
                                  url: lec.url,
                                  title: lec.title,
                                  uploaderName: lec.uploaderName,
                                  uploaderChannelId: lec.uploaderChannelId,
                                  uploaderHandle: lec.uploaderHandle,
                                  duration: lec.duration,
                                  thumbnailUrl: lec.thumbnailUrl,
                                  isLive: Boolean(lec.isLive),
                                });
                              }}
                              className="text-xs font-semibold line-clamp-2 leading-snug text-left cursor-pointer flex-1"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {lec.title}
                            </button>
                            <button
                              type="button"
                              aria-label="Remove lecture"
                              onClick={(e) => handleDeleteSavedLecture(e, lec.videoId)}
                              className="p-0.5 shrink-0 cursor-pointer opacity-70 hover:opacity-100"
                              style={{ color: 'var(--text-muted)' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 text-[10px] font-mono">
                            <span
                              className="truncate"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {lec.uploaderName}
                            </span>
                            <span style={{ color: 'var(--text-muted)' }}>
                              {formatDurationSeconds(lec.duration, lec.isLive)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Empty Whitelist Guide */}
              {whitelistedChannels.length === 0 && !showQuickAddChannel && (
                <div
                  className="py-7 px-4 text-center rounded-2xl space-y-2.5"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center mx-auto"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <ShieldCheck size={20} />
                  </div>
                  <h3
                    className="text-xs font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Build Your Deterministic Study Whitelist
                  </h3>
                  <p
                    className="text-[11px] max-w-sm mx-auto leading-relaxed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Add your trusted educators by @handle, channel URL, or sample lecture link. Only full-length videos from whitelisted channels can be searched or played.
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowQuickAddChannel(true)}
                    className="px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--accent-primary)',
                      color: 'var(--text-on-accent)',
                    }}
                  >
                    <Plus size={13} />
                    <span>Add First Study Channel</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Study Notes Tab */
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono tracking-wider px-0.5">
                <span style={{ color: 'var(--text-secondary)' }}>LECTURE SCRATCHPAD</span>
                <span style={{ color: 'var(--accent-primary)' }}>Auto-Saved Locally</span>
              </div>
              <textarea
                value={studyNotes}
                onChange={(e) => handleSaveNotes(e.target.value)}
                placeholder="Write formulas, code snippets, or lecture timestamps while studying..."
                className="w-full min-h-[200px] flex-1 p-3 rounded-xl text-xs focus:outline-none resize-none font-mono leading-relaxed"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
