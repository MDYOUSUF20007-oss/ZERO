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
  Minimize2,
  Lock,
  Unlock,
  Undo2,
  Loader2,
  Radio,
  CheckCircle2,
  AlertCircle,
  SlidersHorizontal,
  ExternalLink,
  Shield,
  RefreshCw,
  ChevronDown,
  Tv,
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
  getAllVideoProgress,
  getVideoProgress,
  saveVideoProgress,
  clearVideoProgress,
  type SavedZeroTubeLecture,
  type VideoWatchProgress,
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

function formatCompactViews(views?: number): string {
  if (typeof views !== 'number' || !Number.isFinite(views) || views <= 0) return '';
  if (views >= 1_000_000) return `${(views / 1_000_000).toFixed(1).replace(/\.0$/, '')}M views`;
  if (views >= 1_000) return `${(views / 1_000).toFixed(1).replace(/\.0$/, '')}K views`;
  return `${views} views`;
}

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

  // Channel videos feed cache & loading state
  const [channelVideosCache, setChannelVideosCache] = useState<Record<string, ZeroTubeSearchVideo[]>>({});
  const [channelAvatars, setChannelAvatars] = useState<Record<string, string>>({});
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [feedError, setFeedError] = useState('');

  // Search & paste bar state
  const [searchOrUrlInput, setSearchOrUrlInput] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<ZeroTubeSearchVideo[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [lastSearchQuery, setLastSearchQuery] = useState('');
  const [searchError, setSearchError] = useState('');
  const [blockedNotice, setBlockedNotice] = useState<BlockedNotice | null>(null);

  // Quick drawers inside header
  const [showQuickAddChannel, setShowQuickAddChannel] = useState(false);
  const [showAppGuardPanel, setShowAppGuardPanel] = useState(false);
  const [channelAddInput, setChannelAddInput] = useState('');
  const [isResolvingChannel, setIsResolvingChannel] = useState(false);
  const [channelAddFeedback, setChannelAddFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  // Tabs (Feed vs Study Notes)
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
  const [previousLecture, setPreviousLecture] = useState<{
    lecture: ActiveLectureState;
    savedTime: number;
  } | null>(null);
  const [pendingSwitchLecture, setPendingSwitchLecture] = useState<ActiveLectureState | null>(null);
  const [videoProgressMap, setVideoProgressMap] = useState<Record<string, VideoWatchProgress>>(() =>
    getAllVideoProgress()
  );
  const [resumedAtSeconds, setResumedAtSeconds] = useState<number | null>(null);
  const [iframeStartSeconds, setIframeStartSeconds] = useState<number>(0);

  // Fullscreen & touch-lock state
  const [isVideoFullscreen, setIsVideoFullscreen] = useState(false);
  const [showFsControls, setShowFsControls] = useState(true);
  const [isScreenTouchLocked, setIsScreenTouchLocked] = useState(false);

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
  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const pendingSeekTimeRef = useRef<number | null>(null);
  const shouldResumeAfterSwapRef = useRef<boolean>(false);
  const lastSavedSecRef = useRef<number>(-10);
  const activeLectureRef = useRef<ActiveLectureState | null>(null);
  const currentTimeRef = useRef<number>(0);
  const mediaDurationRef = useRef<number>(0);
  const fsControlsTimerRef = useRef<number | null>(null);
  const feedRequestSeqRef = useRef<number>(0);
  const channelVideosCacheRef = useRef<Record<string, ZeroTubeSearchVideo[]>>({});

  activeLectureRef.current = activeLecture;
  currentTimeRef.current = currentTime;
  mediaDurationRef.current = mediaDuration;

  const persistCurrentWatchProgress = useCallback((force = false) => {
    const lec = activeLectureRef.current;
    if (!lec || lec.isLive) return;
    const el = mediaRef.current;
    const t = el && Number.isFinite(el.currentTime) ? el.currentTime : currentTimeRef.current;
    const d =
      el && Number.isFinite(el.duration) && el.duration > 0
        ? el.duration
        : mediaDurationRef.current || lec.duration || 0;
    if (!force && Math.abs(t - lastSavedSecRef.current) < 2) return;
    lastSavedSecRef.current = t;
    const nextMap = saveVideoProgress(lec.videoId, t, d);
    setVideoProgressMap(nextMap);
  }, []);

  const exitVideoFullscreen = useCallback(() => {
    setIsVideoFullscreen(false);
    setIsScreenTouchLocked(false);
    setShowFsControls(true);
    try {
      window.ZeroNative?.setVideoFullscreenMode?.(false);
    } catch {
      // Ignore on web preview
    }
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        void document.exitFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  const enterVideoFullscreen = useCallback(() => {
    setIsVideoFullscreen(true);
    setShowFsControls(true);
    setIsScreenTouchLocked(false);
    try {
      window.ZeroNative?.setVideoFullscreenMode?.(true);
    } catch {
      // Ignore on web preview
    }
    try {
      const container = playerContainerRef.current;
      if (container && container.requestFullscreen && !window.ZeroNative?.setVideoFullscreenMode) {
        void container.requestFullscreen().catch(() => {});
      }
    } catch {
      // Ignore
    }
  }, []);

  // Ensure native landscape/immersive fullscreen always cleans up on close or unmount
  useEffect(() => {
    if (!isOpen && isVideoFullscreen) {
      exitVideoFullscreen();
    }
  }, [isOpen, isVideoFullscreen, exitVideoFullscreen]);

  useEffect(() => {
    return () => {
      persistCurrentWatchProgress(true);
      try {
        window.ZeroNative?.setVideoFullscreenMode?.(false);
      } catch {
        // Ignore
      }
    };
  }, [persistCurrentWatchProgress]);

  // Auto-hide fullscreen controls after 3.5s while playing
  const scheduleHideFsControls = useCallback(() => {
    if (fsControlsTimerRef.current !== null) {
      window.clearTimeout(fsControlsTimerRef.current);
      fsControlsTimerRef.current = null;
    }
    if (isVideoFullscreen && isPlaying && !isScreenTouchLocked) {
      fsControlsTimerRef.current = window.setTimeout(() => {
        setShowFsControls(false);
      }, 3500);
    }
  }, [isVideoFullscreen, isPlaying, isScreenTouchLocked]);

  useEffect(() => {
    scheduleHideFsControls();
    return () => {
      if (fsControlsTimerRef.current !== null) {
        window.clearTimeout(fsControlsTimerRef.current);
      }
    };
  }, [scheduleHideFsControls, showFsControls]);

  // Escape key exits fullscreen cleanly
  useEffect(() => {
    if (!isVideoFullscreen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        exitVideoFullscreen();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isVideoFullscreen, exitVideoFullscreen]);

  // Sync whitelist with Settings Studio
  useEffect(() => {
    const syncWhitelist = () => {
      setWhitelistedChannels(getWhitelistedChannels());
      setSavedLectures(getSavedZeroTubeLectures());
    };
    window.addEventListener(ZEROTUBE_WHITELIST_EVENT, syncWhitelist);
    return () => window.removeEventListener(ZEROTUBE_WHITELIST_EVENT, syncWhitelist);
  }, []);

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
    async (
      lecture: ActiveLectureState,
      preloadedStream?: ZeroTubeStreamResult,
      options?: { skipSavePrevious?: boolean; overrideResumeSeconds?: number }
    ) => {
      // Save current video's exact timestamp BEFORE switching & push to previousLecture
      const prevLec = activeLectureRef.current;
      if (prevLec && prevLec.videoId !== lecture.videoId) {
        const el = mediaRef.current;
        const prevTime =
          el && Number.isFinite(el.currentTime) ? el.currentTime : currentTimeRef.current;
        const prevDur =
          el && Number.isFinite(el.duration) && el.duration > 0
            ? el.duration
            : mediaDurationRef.current || prevLec.duration || 0;
        if (!prevLec.isLive && prevTime >= 3) {
          const nextMap = saveVideoProgress(prevLec.videoId, prevTime, prevDur);
          setVideoProgressMap(nextMap);
        }
        if (!options?.skipSavePrevious) {
          setPreviousLecture({
            lecture: prevLec,
            savedTime: Math.floor(Math.max(0, prevTime)),
          });
        }
      }

      // Check for saved watch progress on the incoming video
      const savedEntry = !lecture.isLive ? getVideoProgress(lecture.videoId) : null;
      const resumeSec =
        typeof options?.overrideResumeSeconds === 'number'
          ? Math.max(0, options.overrideResumeSeconds)
          : savedEntry && savedEntry.currentTime >= 3
          ? savedEntry.currentTime
          : 0;

      setPendingSwitchLecture(null);
      setBlockedNotice(null);
      setFallbackReason('');
      setActiveLecture(lecture);
      setCurrentTime(resumeSec);
      setResumedAtSeconds(resumeSec >= 3 ? Math.floor(resumeSec) : null);
      setIframeStartSeconds(Math.floor(resumeSec));
      setMediaDuration(lecture.duration > 0 ? lecture.duration : 0);
      setIsPlaying(false);
      lastSavedSecRef.current = resumeSec;
      pendingSeekTimeRef.current = resumeSec >= 3 ? resumeSec : null;
      shouldResumeAfterSwapRef.current = true;

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

  /**
   * Misclick guard: if a lecture is actively playing and the user taps a different video card,
   * prompt briefly before switching so stray thumb taps never interrupt your current lecture.
   */
  const requestLectureSwitch = useCallback(
    (candidate: ActiveLectureState) => {
      if (activeLecture && activeLecture.videoId === candidate.videoId) {
        // Already watching this video — keep playing!
        setPendingSwitchLecture(null);
        return;
      }
      if (activeLecture && engineMode !== 'idle' && isPlaying) {
        haptics.tick(450);
        setPendingSwitchLecture(candidate);
        return;
      }
      haptics.tick(600);
      void loadLectureIntoPlayer(candidate);
    },
    [activeLecture, engineMode, isPlaying, loadLectureIntoPlayer]
  );

  const handleSwitchBackToPrevious = useCallback(() => {
    if (!previousLecture) return;
    haptics.tick(650);
    const target = previousLecture;
    void loadLectureIntoPlayer(target.lecture, undefined, {
      overrideResumeSeconds: target.savedTime,
    });
  }, [previousLecture, loadLectureIntoPlayer]);

  // Fetch uploaded full-length videos for one or all whitelisted channels
  const fetchChannelVideosFeed = useCallback(
    async (
      targetKey: string,
      channelsList: WhitelistedChannel[],
      forceRefresh = false
    ) => {
      if (channelsList.length === 0) {
        setFeedError('');
        setIsLoadingFeed(false);
        return;
      }
      if (!isZeroTubeNativeAvailable()) {
        setFeedError('');
        setIsLoadingFeed(false);
        return;
      }

      const targetChannels =
        targetKey === 'all'
          ? channelsList.slice(0, 6)
          : channelsList.filter((c) => getChannelKey(c) === targetKey);

      if (targetChannels.length === 0) return;

      const missingChannels = forceRefresh
        ? targetChannels
        : targetChannels.filter((c) => !channelVideosCacheRef.current[getChannelKey(c)]);

      if (missingChannels.length === 0) {
        setFeedError('');
        return;
      }

      const seq = ++feedRequestSeqRef.current;
      setIsLoadingFeed(true);
      setFeedError('');

      try {
        const perChannelLimit = targetKey === 'all' ? 10 : 24;
        const settled = await Promise.allSettled(
          missingChannels.map(async (ch) => {
            const res = await ZeroTube.getChannelVideos({
              channelUrl: ch.url,
              channelId: ch.id,
              channelHandle: ch.handle,
              channelName: ch.name,
              limit: perChannelLimit,
            });
            return { key: getChannelKey(ch), res };
          })
        );

        if (seq !== feedRequestSeqRef.current) return;

        const nextVideosMap: Record<string, ZeroTubeSearchVideo[]> = {};
        const nextAvatarsMap: Record<string, string> = {};
        let successCount = 0;
        let firstErrMsg = '';

        for (const outcome of settled) {
          if (outcome.status === 'fulfilled') {
            successCount++;
            nextVideosMap[outcome.value.key] = outcome.value.res.videos || [];
            if (outcome.value.res.avatarUrl) {
              nextAvatarsMap[outcome.value.key] = outcome.value.res.avatarUrl;
            }
          } else if (!firstErrMsg) {
            firstErrMsg =
              outcome.reason instanceof Error
                ? outcome.reason.message
                : 'Could not load channel videos.';
          }
        }

        if (Object.keys(nextVideosMap).length > 0) {
          channelVideosCacheRef.current = {
            ...channelVideosCacheRef.current,
            ...nextVideosMap,
          };
          setChannelVideosCache((prev) => ({ ...prev, ...nextVideosMap }));
        }
        if (Object.keys(nextAvatarsMap).length > 0) {
          setChannelAvatars((prev) => ({ ...prev, ...nextAvatarsMap }));
        }
        if (successCount === 0 && firstErrMsg) {
          setFeedError(firstErrMsg);
        }
      } catch (err) {
        if (seq === feedRequestSeqRef.current) {
          setFeedError(err instanceof Error ? err.message : 'Failed to load channel videos.');
        }
      } finally {
        if (seq === feedRequestSeqRef.current) {
          setIsLoadingFeed(false);
        }
      }
    },
    []
  );

  // Sync on modal open & auto-load channel videos feed
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

  // Automatically fetch channel videos whenever modal is open, selected pill changes, or channels change
  useEffect(() => {
    if (!isOpen) return;
    if (whitelistedChannels.length === 0) return;
    void fetchChannelVideosFeed(selectedChannelKey, whitelistedChannels, false);
  }, [isOpen, selectedChannelKey, whitelistedChannels, fetchChannelVideosFeed]);

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
      const clampedSeek =
        Number.isFinite(el.duration) && el.duration > 5
          ? Math.min(pendingSeekTimeRef.current, Math.max(0, el.duration - 3))
          : pendingSeekTimeRef.current;
      el.currentTime = clampedSeek;
      setCurrentTime(clampedSeek);
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
      persistCurrentWatchProgress(true);
      setIframeStartSeconds(Math.floor(currentTimeRef.current));
      setFallbackReason('Stream playback error — switched to No-Cookie embed');
      setEngineMode('fallback_iframe');
      setIsPlaying(false);
    }
  };

  const handleClosePlayer = () => {
    haptics.tick(450);
    persistCurrentWatchProgress(true);
    if (isVideoFullscreen) {
      exitVideoFullscreen();
    }
    if (mediaRef.current) {
      mediaRef.current.pause();
    }
    setIsPlaying(false);
    setPendingSwitchLecture(null);
    setActiveLecture(null);
    setStreamData(null);
    setEngineMode('idle');
  };

  const handleTogglePlayPause = () => {
    const el = mediaRef.current;
    if (!el) return;
    haptics.tick(500);
    if (el.paused) {
      void el.play().catch(() => {});
    } else {
      el.pause();
      persistCurrentWatchProgress(true);
    }
  };

  const handleSkipSeconds = (delta: number) => {
    const el = mediaRef.current;
    if (!el) return;
    haptics.tick(450);
    const maxTime = Number.isFinite(el.duration) ? el.duration : mediaDuration || 0;
    const next = Math.max(
      0,
      Math.min(maxTime > 0 ? maxTime : el.currentTime + delta, el.currentTime + delta)
    );
    el.currentTime = next;
    setCurrentTime(next);
    persistCurrentWatchProgress(true);
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
      if (activeLecture && !activeLecture.isLive) {
        const nextMap = saveVideoProgress(
          activeLecture.videoId,
          val,
          mediaDuration || activeLecture.duration || 0
        );
        setVideoProgressMap(nextMap);
      }
    }
  };

  const handleFullscreen = () => {
    haptics.tick(500);
    if (isVideoFullscreen) {
      exitVideoFullscreen();
    } else {
      enterVideoFullscreen();
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
        setChannelAddInput(raw);
        setShowQuickAddChannel(true);
        setSearchError('Channel link detected — tap Add below to whitelist and browse its videos.');
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
        const extracted = await ZeroTube.getStream({ videoUrl });

        if (
          extracted.isShort ||
          (!extracted.isLive &&
            extracted.duration >= 0 &&
            extracted.duration < MIN_FULL_LENGTH_SECONDS)
        ) {
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

        let matched = matchWhitelistedChannel(
          {
            channelId: extracted.uploaderChannelId,
            handle: extracted.uploaderHandle,
            uploaderUrl: extracted.uploaderUrl,
            uploaderName: extracted.uploaderName,
          },
          whitelistedChannels
        );

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
        try {
          const resolved = await ZeroTube.resolveChannel({ input: videoUrl });
          if (
            resolved.isShort ||
            (!resolved.isLive &&
              (resolved.videoDuration ?? 0) >= 0 &&
              (resolved.videoDuration ?? 0) < MIN_FULL_LENGTH_SECONDS)
          ) {
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
        const addedKey = getChannelKey({
          id: resolved.id,
          handle: resolved.handle,
          name: resolved.name,
        });
        setSelectedChannelKey(addedKey);
        setChannelAddInput('');
        setShowQuickAddChannel(false);
        setChannelAddFeedback({
          type: 'success',
          text: `Whitelisted ${resolved.name}${resolved.handle ? ` (${resolved.handle})` : ''}`,
        });
        haptics.tick(900);
      } else {
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

  const selectedChannelObj = useMemo(
    () =>
      selectedChannelKey === 'all'
        ? null
        : whitelistedChannels.find((c) => getChannelKey(c) === selectedChannelKey) || null,
    [selectedChannelKey, whitelistedChannels]
  );

  // Merge channel videos for either the selected channel pill OR All Channels (interleaved round-robin)
  const feedVideos = useMemo(() => {
    if (selectedChannelObj) {
      return channelVideosCache[getChannelKey(selectedChannelObj)] || [];
    }
    const lists = whitelistedChannels
      .map((ch) => channelVideosCache[getChannelKey(ch)] || [])
      .filter((arr) => arr.length > 0);
    if (lists.length === 0) return [];
    const merged: ZeroTubeSearchVideo[] = [];
    const seen = new Set<string>();
    const maxLen = Math.max(...lists.map((l) => l.length));
    for (let i = 0; i < maxLen; i++) {
      for (const list of lists) {
        const item = list[i];
        if (item && !seen.has(item.videoId)) {
          seen.add(item.videoId);
          merged.push(item);
        }
      }
    }
    return merged;
  }, [selectedChannelObj, whitelistedChannels, channelVideosCache]);

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

  const renderVideoCard = (vid: ZeroTubeSearchVideo) => {
    const isCurrent = activeLecture?.videoId === vid.videoId;
    const savedProg = !vid.isLive ? videoProgressMap[vid.videoId] : undefined;
    const progressPct =
      savedProg && savedProg.currentTime >= 3 && (savedProg.duration || vid.duration) > 0
        ? Math.min(100, Math.round((savedProg.currentTime / (savedProg.duration || vid.duration)) * 100))
        : 0;
    const viewsText = formatCompactViews(vid.viewCount);
    const metaParts = [vid.uploaderName, viewsText, vid.textualUploadDate].filter(Boolean);
    const chInitial = (vid.uploaderName || 'Z').charAt(0).toUpperCase();
    const matchedCh = whitelistedChannels.find(
      (c) =>
        (c.id && c.id === vid.uploaderChannelId) ||
        (c.name && c.name.toLowerCase() === vid.uploaderName.toLowerCase())
    );
    const avatarSrc =
      matchedCh?.avatarUrl ||
      (matchedCh ? channelAvatars[getChannelKey(matchedCh)] : undefined);

    return (
      <button
        key={vid.videoId}
        type="button"
        onClick={() => {
          requestLectureSwitch({
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
        className="w-full rounded-2xl overflow-hidden text-left cursor-pointer transition-all flex flex-col"
        style={{
          backgroundColor: isCurrent ? 'var(--accent-soft)' : 'var(--surface-tonal)',
          border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
        }}
      >
        {/* 16:9 YouTube-Style Thumbnail */}
        <div
          className="w-full aspect-video relative overflow-hidden flex items-center justify-center"
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
            <Play size={28} style={{ color: 'var(--accent-primary)' }} />
          )}

          {isCurrent ? (
            <span
              className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-on-accent)',
              }}
            >
              PLAYING
            </span>
          ) : (
            savedProg &&
            savedProg.currentTime >= 3 && (
              <span
                className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold"
                style={{
                  backgroundColor: 'var(--bg-primary)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                RESUME {formatDurationSeconds(savedProg.currentTime)}
              </span>
            )
          )}

          {progressPct > 0 && (
            <div
              className="absolute bottom-0 left-0 right-0 h-1"
              style={{ backgroundColor: 'var(--border-subtle)' }}
            >
              <div
                className="h-full"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: 'var(--accent-primary)',
                }}
              />
            </div>
          )}

          <span
            className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded-md text-[10px] font-mono font-bold"
            style={{
              backgroundColor: 'var(--bg-primary)',
              color: vid.isLive ? 'var(--status-danger)' : 'var(--text-primary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {vid.isLive ? (
              <span className="inline-flex items-center gap-1">
                <Radio size={9} /> LIVE
              </span>
            ) : (
              formatDurationSeconds(vid.duration)
            )}
          </span>
        </div>

        {/* Video Info Row (YouTube Feed Style) */}
        <div className="p-3 flex items-start gap-2.5">
          <div
            className="w-8 h-8 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold mt-0.5"
            style={{
              backgroundColor: 'var(--accent-soft)',
              border: '1px solid var(--accent-border)',
              color: 'var(--accent-primary)',
            }}
          >
            {avatarSrc ? (
              <img src={avatarSrc} alt={vid.uploaderName} className="w-full h-full object-cover" />
            ) : (
              chInitial
            )}
          </div>

          <div className="min-w-0 flex-1 space-y-1">
            <h4
              className="text-[13px] font-semibold leading-snug line-clamp-2"
              style={{ color: 'var(--text-primary)' }}
            >
              {vid.title}
            </h4>
            <p
              className="text-[11px] truncate"
              style={{ color: 'var(--text-secondary)' }}
            >
              {metaParts.join(' • ')}
            </p>
          </div>
        </div>
      </button>
    );
  };

  if (!isOpen) return null;

  const isPlayerVisible = engineMode !== 'idle' && Boolean(activeLecture || engineMode === 'loading');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="ZeroTube Study Feed"
      className="fixed inset-0 z-[120] flex flex-col select-none font-sans overflow-hidden animate-fadeIn"
      style={{
        backgroundColor: 'var(--bg-primary)',
        color: 'var(--text-primary)',
        paddingTop: 'var(--zero-safe-top, 0px)',
        paddingBottom: 'var(--zero-safe-bottom, 0px)',
      }}
    >
      {/* Top YouTube-Style App Header */}
      <div
        className="px-4 py-2.5 flex items-center justify-between gap-2 shrink-0"
        style={{
          borderBottom: '1px solid var(--border-subtle)',
          backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
        }}
      >
        <div className="flex items-center gap-2 min-w-0">
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
            <div className="flex items-center gap-1.5">
              <span
                className="text-sm font-bold tracking-tight truncate"
                style={{ color: 'var(--text-primary)' }}
              >
                ZeroTube
              </span>
              <span
                className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold inline-flex items-center gap-1 shrink-0"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--accent-border)',
                }}
              >
                <ShieldCheck size={9} />
                Study Feed
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              haptics.tick(500);
              setShowAppGuardPanel((prev) => !prev);
            }}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            style={{
              backgroundColor: showAppGuardPanel ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: `1px solid ${showAppGuardPanel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color: showAppGuardPanel ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            <Shield size={11} />
            <span>Guard</span>
          </button>

          <button
            type="button"
            onClick={() => {
              haptics.tick(500);
              setActiveTab(activeTab === 'catalog' ? 'notes' : 'catalog');
            }}
            className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
            style={{
              backgroundColor: activeTab === 'notes' ? 'var(--accent-soft)' : 'var(--bg-surface)',
              border: `1px solid ${activeTab === 'notes' ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
              color: activeTab === 'notes' ? 'var(--accent-primary)' : 'var(--text-primary)',
            }}
          >
            <FileText size={11} />
            <span>{activeTab === 'notes' ? 'Feed' : 'Notes'}</span>
          </button>

          {onOpenSettingsStudio && (
            <button
              type="button"
              aria-label="Open Studio Settings"
              onClick={() => {
                haptics.tick(600);
                onOpenSettingsStudio();
              }}
              className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              <Settings size={14} />
            </button>
          )}

          <button
            type="button"
            aria-label="Close ZeroTube"
            onClick={() => {
              haptics.thud();
              persistCurrentWatchProgress(true);
              if (isVideoFullscreen) {
                exitVideoFullscreen();
              }
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>

      {/* Collapsible Dual-Engine Video Player (supports full landscape native fullscreen + touch lock) */}
      {isPlayerVisible && (
        <div
          ref={playerContainerRef}
          className={
            isVideoFullscreen
              ? 'fixed inset-0 z-[200] flex flex-col justify-center bg-black'
              : 'w-full shrink-0'
          }
          style={
            isVideoFullscreen
              ? undefined
              : {
                  backgroundColor: 'var(--bg-primary)',
                  borderBottom: '1px solid var(--border-subtle)',
                }
          }
        >
          <div className={isVideoFullscreen ? 'w-full h-full flex flex-col relative' : 'w-full max-w-3xl mx-auto'}>
            <div
              className={
                isVideoFullscreen
                  ? 'w-full h-full relative overflow-hidden flex items-center justify-center bg-black'
                  : 'w-full aspect-video relative overflow-hidden flex items-center justify-center'
              }
              onClick={() => {
                if (!isVideoFullscreen || isScreenTouchLocked) return;
                setShowFsControls((prev) => !prev);
              }}
            >
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
                  <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
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
                      if (mediaRef.current) {
                        setCurrentTime(mediaRef.current.currentTime);
                        persistCurrentWatchProgress(false);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => {
                      setIsPlaying(false);
                      persistCurrentWatchProgress(true);
                    }}
                    onEnded={() => {
                      setIsPlaying(false);
                      if (activeLecture) {
                        setVideoProgressMap(clearVideoProgress(activeLecture.videoId));
                      }
                    }}
                    onError={handleMediaError}
                    onClick={(e) => {
                      if (isVideoFullscreen) {
                        if (isScreenTouchLocked) {
                          e.stopPropagation();
                          return;
                        }
                        return;
                      }
                      handleTogglePlayPause();
                    }}
                    className={
                      audioOnlyMode ? 'sr-only' : 'w-full h-full object-contain cursor-pointer'
                    }
                  />

                  {audioOnlyMode && (
                    <div
                      className="w-full h-full flex flex-col items-center justify-center p-5 text-center gap-2.5"
                      style={{ backgroundColor: 'var(--surface-tonal, var(--bg-surface))' }}
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

                  {/* Fullscreen Landscape Overlay Controls (auto-hides after 3.5s, supports Touch Lock) */}
                  {isVideoFullscreen && isScreenTouchLocked && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        haptics.tick(500);
                        setIsScreenTouchLocked(false);
                        setShowFsControls(true);
                      }}
                      className="absolute top-4 right-5 z-20 px-3 py-1.5 rounded-full text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'rgba(10, 10, 14, 0.78)',
                        border: '1px solid var(--accent-border)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <Lock size={12} />
                      <span>Tap to Unlock</span>
                    </button>
                  )}

                  {isVideoFullscreen && !isScreenTouchLocked && showFsControls && (
                    <div
                      className="absolute inset-0 z-10 flex flex-col justify-between p-4 sm:p-5"
                      style={{
                        background:
                          'linear-gradient(180deg, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.18) 38%, rgba(0,0,0,0.18) 62%, rgba(0,0,0,0.82) 100%)',
                      }}
                    >
                      {/* Fullscreen Top Bar */}
                      <div
                        className="flex items-center justify-between gap-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {activeLecture.title}
                          </p>
                          <p
                            className="text-[11px] font-mono truncate"
                            style={{ color: 'var(--accent-primary)' }}
                          >
                            {activeLecture.uploaderName} • {activeResolutionLabel}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              haptics.tick(500);
                              setIsScreenTouchLocked(true);
                              setShowFsControls(false);
                            }}
                            className="px-2.5 py-1.5 rounded-lg text-[11px] font-semibold flex items-center gap-1.5 cursor-pointer text-white"
                            style={{
                              backgroundColor: 'rgba(24, 24, 30, 0.8)',
                              border: '1px solid rgba(255,255,255,0.18)',
                            }}
                          >
                            <Unlock size={12} />
                            <span>Lock Screen</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleFullscreen}
                            aria-label="Exit Fullscreen"
                            className="px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                            style={{
                              backgroundColor: 'var(--accent-primary)',
                              color: 'var(--text-on-accent)',
                            }}
                          >
                            <Minimize2 size={13} />
                            <span>Exit</span>
                          </button>
                        </div>
                      </div>

                      {/* Fullscreen Center Transport */}
                      <div
                        className="flex items-center justify-center gap-6"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {!activeLecture.isLive && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSkipSeconds(-10);
                              scheduleHideFsControls();
                            }}
                            className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white cursor-pointer"
                            style={{
                              backgroundColor: 'rgba(20, 20, 26, 0.72)',
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            <RotateCcw size={16} />
                            <span className="text-[9px] font-mono">-10s</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            handleTogglePlayPause();
                            scheduleHideFsControls();
                          }}
                          className="w-16 h-16 rounded-full flex items-center justify-center cursor-pointer shadow-lg"
                          style={{
                            backgroundColor: 'var(--accent-primary)',
                            color: 'var(--text-on-accent)',
                          }}
                        >
                          {isPlaying ? (
                            <Pause size={26} fill="currentColor" />
                          ) : (
                            <Play size={26} fill="currentColor" className="ml-0.5" />
                          )}
                        </button>
                        {!activeLecture.isLive && (
                          <button
                            type="button"
                            onClick={() => {
                              handleSkipSeconds(10);
                              scheduleHideFsControls();
                            }}
                            className="w-12 h-12 rounded-full flex flex-col items-center justify-center text-white cursor-pointer"
                            style={{
                              backgroundColor: 'rgba(20, 20, 26, 0.72)',
                              border: '1px solid rgba(255,255,255,0.2)',
                            }}
                          >
                            <RotateCw size={16} />
                            <span className="text-[9px] font-mono">+10s</span>
                          </button>
                        )}
                      </div>

                      {/* Fullscreen Bottom Seek + Speed/Quality */}
                      <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
                        {!activeLecture.isLive && (
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono tabular-nums text-white shrink-0">
                              {formatDurationSeconds(currentTime)}
                            </span>
                            <input
                              type="range"
                              min={0}
                              max={Math.max(1, mediaDuration || activeLecture.duration || 1)}
                              step={1}
                              value={Math.min(
                                currentTime,
                                mediaDuration || activeLecture.duration || currentTime
                              )}
                              onChange={handleSeekBarChange}
                              aria-label="Seek lecture timeline"
                              className="flex-1 h-2 rounded-full cursor-pointer"
                              style={{ accentColor: 'var(--accent-primary)' }}
                            />
                            <span className="text-xs font-mono tabular-nums text-zinc-300 shrink-0">
                              {formatDurationSeconds(mediaDuration || activeLecture.duration)}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={handleCycleSpeed}
                            className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold text-white cursor-pointer"
                            style={{
                              backgroundColor: 'rgba(24, 24, 30, 0.8)',
                              border: '1px solid rgba(255,255,255,0.18)',
                            }}
                          >
                            {playbackSpeed}x
                          </button>
                          {streamData && streamData.muxedStreams.length > 1 && (
                            <button
                              type="button"
                              onClick={handleCycleResolution}
                              className="px-2.5 py-1 rounded-lg text-[11px] font-mono font-semibold text-white flex items-center gap-1 cursor-pointer"
                              style={{
                                backgroundColor: 'rgba(24, 24, 30, 0.8)',
                                border: '1px solid rgba(255,255,255,0.18)',
                              }}
                            >
                              <MonitorPlay size={12} />
                              <span>{activeResolutionLabel}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              {engineMode === 'fallback_iframe' && activeLecture && (
                <>
                  <iframe
                    title={activeLecture.title}
                    src={`https://www.youtube-nocookie.com/embed/${activeLecture.videoId}?rel=0&modestbranding=1&playsinline=1${iframeStartSeconds >= 3 ? `&start=${iframeStartSeconds}` : ''}`}
                    referrerPolicy="strict-origin-when-cross-origin"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                  {isVideoFullscreen && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleFullscreen();
                      }}
                      className="absolute top-3 right-4 z-20 px-3 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      <Minimize2 size={13} />
                      <span>Exit Fullscreen</span>
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Native Study Controls Bar (hidden while in landscape fullscreen overlay) */}
            {!isVideoFullscreen && engineMode === 'native' && activeLecture && (
              <div
                className="px-3.5 py-2 space-y-2"
                style={{
                  backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
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
                      value={Math.min(
                        currentTime,
                        mediaDuration || activeLecture.duration || currentTime
                      )}
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

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={handleTogglePlayPause}
                      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--accent-primary)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      {isPlaying ? (
                        <Pause size={12} fill="currentColor" />
                      ) : (
                        <Play size={12} fill="currentColor" />
                      )}
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
                    <button
                      type="button"
                      onClick={handleCycleSpeed}
                      className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold cursor-pointer shrink-0"
                      style={{
                        backgroundColor:
                          playbackSpeed !== 1 ? 'var(--accent-soft)' : 'var(--bg-surface)',
                        border: `1px solid ${playbackSpeed !== 1 ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                        color:
                          playbackSpeed !== 1 ? 'var(--accent-primary)' : 'var(--text-primary)',
                      }}
                    >
                      {playbackSpeed}x
                    </button>

                    {!audioOnlyMode && streamData && streamData.muxedStreams.length > 0 && (
                      <button
                        type="button"
                        onClick={handleCycleResolution}
                        disabled={streamData.muxedStreams.length <= 1}
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

                    {streamData && streamData.audioStreams.length > 0 && (
                      <button
                        type="button"
                        onClick={handleToggleAudioOnly}
                        className="px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-semibold flex items-center gap-1 cursor-pointer shrink-0"
                        style={{
                          backgroundColor: audioOnlyMode
                            ? 'var(--accent-soft)'
                            : 'var(--bg-surface)',
                          border: `1px solid ${audioOnlyMode ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                          color: audioOnlyMode
                            ? 'var(--accent-primary)'
                            : 'var(--text-secondary)',
                        }}
                      >
                        <Headphones size={11} />
                        <span>{audioOnlyMode ? 'Video' : 'Audio'}</span>
                      </button>
                    )}

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

            {/* Active Lecture Title Strip with Previous-Video Return & Minimize Player */}
            {!isVideoFullscreen && activeLecture && (
              <div
                className="px-4 py-2 space-y-2"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderTop: '1px solid var(--border-subtle)',
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h4
                      className="text-xs font-semibold truncate"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {activeLecture.title}
                    </h4>
                    <div className="flex items-center gap-2 flex-wrap mt-0.5">
                      <span
                        className="text-[10px] font-mono truncate"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {activeLecture.uploaderName}
                      </span>
                      <span
                        className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                        style={{
                          backgroundColor: 'var(--surface-tonal)',
                          color: 'var(--text-muted)',
                          border: '1px solid var(--border-subtle)',
                        }}
                        title={fallbackReason}
                      >
                        {engineMode === 'native'
                          ? `Native • ${activeResolutionLabel}`
                          : 'No-Cookie Embed'}
                      </span>
                      {resumedAtSeconds !== null && resumedAtSeconds >= 3 && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded-full"
                          style={{
                            backgroundColor: 'var(--accent-soft)',
                            color: 'var(--accent-primary)',
                            border: '1px solid var(--accent-border)',
                          }}
                        >
                          Resumed {formatDurationSeconds(resumedAtSeconds)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {engineMode === 'fallback_iframe' && (
                      <button
                        type="button"
                        onClick={handleFullscreen}
                        aria-label="Fullscreen"
                        className="p-1.5 rounded-xl cursor-pointer shrink-0"
                        style={{
                          backgroundColor: 'var(--surface-tonal)',
                          border: '1px solid var(--border-subtle)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Maximize2 size={12} />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleClosePlayer}
                      className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <ChevronDown size={12} />
                      <span>Hide</span>
                    </button>
                  </div>
                </div>

                {previousLecture && previousLecture.lecture.videoId !== activeLecture.videoId && (
                  <button
                    type="button"
                    onClick={handleSwitchBackToPrevious}
                    className="w-full px-3 py-1.5 rounded-xl text-[11px] font-semibold flex items-center justify-between gap-2 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      border: '1px solid var(--accent-border)',
                      color: 'var(--accent-primary)',
                    }}
                  >
                    <span className="flex items-center gap-1.5 min-w-0 truncate">
                      <Undo2 size={12} className="shrink-0" />
                      <span className="truncate">
                        Switch back: {previousLecture.lecture.title}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] shrink-0">
                      {previousLecture.savedTime >= 3
                        ? formatDurationSeconds(previousLecture.savedTime)
                        : 'Return'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Scrollable YouTube-Style Feed Container */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="w-full max-w-3xl mx-auto p-3.5 sm:p-4 space-y-3.5">
          {/* Official YouTube App Guard Drawer */}
          {showAppGuardPanel && (
            <div className="animate-fadeIn">
              <OfficialYouTubeGuardCard compact />
            </div>
          )}

          {activeTab === 'catalog' ? (
            <>
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
                        : 'Search whitelisted topics or paste YouTube URL...'
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
                  {isSearching ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <Search size={13} />
                  )}
                  <span>{isSearching ? 'Checking' : 'Go'}</span>
                </button>
              </form>

              {/* Whitelist Channel Pill Bar (YouTube Filter Chips Style) */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5">
                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(450);
                    setSelectedChannelKey('all');
                    setHasSearched(false);
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
                  All Channels ({whitelistedChannels.length})
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
                          setHasSearched(false);
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

                <button
                  type="button"
                  onClick={() => {
                    haptics.tick(500);
                    setShowQuickAddChannel((prev) => !prev);
                    setChannelAddFeedback(null);
                  }}
                  className="px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap shrink-0 inline-flex items-center gap-1 cursor-pointer"
                  style={{
                    backgroundColor: showQuickAddChannel
                      ? 'var(--accent-soft)'
                      : 'var(--surface-tonal)',
                    border: `1px solid ${showQuickAddChannel ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                    color: 'var(--accent-primary)',
                  }}
                >
                  <Plus size={12} />
                  <span>Add Channel</span>
                </button>
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

                  {(blockedNotice.channelName ||
                    blockedNotice.channelHandle ||
                    blockedNotice.channelId) && (
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
                      {blockedNotice.channelId && <span>ID: {blockedNotice.channelId}</span>}
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

              {/* Active Channel Profile Strip (when a specific channel pill is selected) */}
              {selectedChannelObj && !hasSearched && (
                <div
                  className="p-3 rounded-2xl flex items-center justify-between gap-3"
                  style={{
                    backgroundColor: 'var(--surface-tonal)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-sm font-bold"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        border: '1px solid var(--accent-border)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      {selectedChannelObj.avatarUrl ||
                      channelAvatars[getChannelKey(selectedChannelObj)] ? (
                        <img
                          src={
                            selectedChannelObj.avatarUrl ||
                            channelAvatars[getChannelKey(selectedChannelObj)]
                          }
                          alt={selectedChannelObj.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        selectedChannelObj.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0">
                      <h3
                        className="text-xs font-bold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {selectedChannelObj.name}
                      </h3>
                      <p
                        className="text-[10px] font-mono truncate"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        {selectedChannelObj.handle || selectedChannelObj.id} •{' '}
                        {feedVideos.length} full-length videos
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isLoadingFeed}
                    onClick={() => {
                      haptics.tick(500);
                      void fetchChannelVideosFeed(
                        selectedChannelKey,
                        whitelistedChannels,
                        true
                      );
                    }}
                    className="px-2.5 py-1.5 rounded-xl text-[10px] font-bold flex items-center gap-1 cursor-pointer shrink-0 disabled:opacity-50"
                    style={{
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    <RefreshCw size={11} className={isLoadingFeed ? 'animate-spin' : ''} />
                    <span>Refresh</span>
                  </button>
                </div>
              )}

              {/* Search Results OR YouTube-Style Channel Videos Feed */}
              {hasSearched ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className="text-[10px] font-mono tracking-wider"
                      style={{ color: 'var(--accent-primary)' }}
                    >
                      SEARCH RESULTS FOR &quot;{lastSearchQuery}&quot; (
                      {visibleSearchResults.length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setHasSearched(false);
                        setSearchResults([]);
                      }}
                      className="text-[10px] font-semibold cursor-pointer"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Back to Channel Feed
                    </button>
                  </div>

                  {visibleSearchResults.length === 0 && !isSearching ? (
                    <div
                      className="p-6 rounded-2xl text-center space-y-1.5"
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
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Non-whitelisted channels, Shorts (&lt;2 min), and mixes were stripped
                        automatically.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {visibleSearchResults.map(renderVideoCard)}
                    </div>
                  )}
                </div>
              ) : whitelistedChannels.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-0.5">
                    <span
                      className="text-[10px] font-mono tracking-wider flex items-center gap-1.5"
                      style={{ color: 'var(--text-muted)' }}
                    >
                      <Tv size={11} style={{ color: 'var(--accent-primary)' }} />
                      <span>
                        {selectedChannelObj
                          ? 'CHANNEL VIDEOS (SHORTS STRIPPED)'
                          : 'WHITELISTED STUDY FEED'}
                      </span>
                    </span>
                    {!selectedChannelObj && (
                      <button
                        type="button"
                        disabled={isLoadingFeed}
                        onClick={() => {
                          haptics.tick(500);
                          void fetchChannelVideosFeed('all', whitelistedChannels, true);
                        }}
                        className="text-[10px] font-mono flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        style={{ color: 'var(--accent-primary)' }}
                      >
                        <RefreshCw size={10} className={isLoadingFeed ? 'animate-spin' : ''} />
                        <span>Refresh</span>
                      </button>
                    )}
                  </div>

                  {isLoadingFeed && feedVideos.length === 0 ? (
                    <div
                      className="py-12 px-4 rounded-2xl flex flex-col items-center justify-center gap-2.5 text-center"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <Loader2
                        size={24}
                        className="animate-spin"
                        style={{ color: 'var(--accent-primary)' }}
                      />
                      <p className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                        Loading full-length lectures from{' '}
                        {selectedChannelObj ? selectedChannelObj.name : 'your whitelisted channels'}
                        ...
                      </p>
                    </div>
                  ) : feedError && feedVideos.length === 0 ? (
                    <div
                      className="p-5 rounded-2xl text-center space-y-2.5"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <AlertCircle
                        size={20}
                        className="mx-auto"
                        style={{ color: 'var(--status-warning)' }}
                      />
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Could not load channel videos
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        {feedError}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          void fetchChannelVideosFeed(
                            selectedChannelKey,
                            whitelistedChannels,
                            true
                          )
                        }
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold cursor-pointer"
                        style={{
                          backgroundColor: 'var(--accent-primary)',
                          color: 'var(--text-on-accent)',
                        }}
                      >
                        Retry
                      </button>
                    </div>
                  ) : feedVideos.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {feedVideos.map(renderVideoCard)}
                    </div>
                  ) : (
                    <div
                      className="p-6 rounded-2xl text-center space-y-2"
                      style={{
                        backgroundColor: 'var(--surface-tonal)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                        {isZeroTubeNativeAvailable()
                          ? 'No full-length videos returned for this channel'
                          : 'Channel videos load natively on Android'}
                      </p>
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        Tap Refresh above or search a specific topic in the search bar.
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                !showQuickAddChannel && (
                  <div
                    className="py-10 px-4 text-center rounded-2xl space-y-3"
                    style={{
                      backgroundColor: 'var(--surface-tonal)',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto"
                      style={{
                        backgroundColor: 'var(--accent-soft)',
                        border: '1px solid var(--accent-border)',
                        color: 'var(--accent-primary)',
                      }}
                    >
                      <ShieldCheck size={22} />
                    </div>
                    <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                      Build Your Distraction-Free Study Feed
                    </h3>
                    <p
                      className="text-xs max-w-sm mx-auto leading-relaxed"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      Add your trusted study channels by @handle, channel link, or sample video URL. Their full-length videos appear right here — zero Shorts, zero ads, zero algorithm traps.
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
                      <Plus size={14} />
                      <span>Add First Study Channel</span>
                    </button>
                  </div>
                )
              )}

              {/* Recently Watched Lectures Strip */}
              {visibleSavedLectures.length > 0 && !hasSearched && (
                <div className="space-y-2 pt-2">
                  <div
                    className="text-[10px] font-mono tracking-wider px-0.5"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    RECENTLY WATCHED ({visibleSavedLectures.length})
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {visibleSavedLectures.slice(0, 6).map((lec) => {
                      const isCurrent = activeLecture?.videoId === lec.videoId;
                      const savedProg = !lec.isLive ? videoProgressMap[lec.videoId] : undefined;
                      return (
                        <div
                          key={lec.videoId}
                          className="p-2.5 rounded-xl flex items-start justify-between gap-2 transition-colors"
                          style={{
                            backgroundColor: isCurrent
                              ? 'var(--accent-soft)'
                              : 'var(--surface-tonal)',
                            border: `1px solid ${isCurrent ? 'var(--accent-border)' : 'var(--border-subtle)'}`,
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => {
                              requestLectureSwitch({
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
                            className="min-w-0 flex-1 text-left cursor-pointer space-y-0.5"
                          >
                            <p
                              className="text-xs font-semibold line-clamp-1"
                              style={{ color: 'var(--text-primary)' }}
                            >
                              {lec.title}
                            </p>
                            <p
                              className="text-[10px] font-mono truncate"
                              style={{ color: 'var(--accent-primary)' }}
                            >
                              {lec.uploaderName} •{' '}
                              {savedProg && savedProg.currentTime >= 3
                                ? `Resume ${formatDurationSeconds(savedProg.currentTime)}`
                                : formatDurationSeconds(lec.duration, lec.isLive)}
                            </p>
                          </button>
                          <button
                            type="button"
                            aria-label="Remove lecture"
                            onClick={(e) => handleDeleteSavedLecture(e, lec.videoId)}
                            className="p-1 shrink-0 cursor-pointer opacity-70 hover:opacity-100"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {onLaunchMorphApp && (
                <div className="pt-1 flex justify-center">
                  <button
                    type="button"
                    onClick={handleLaunchExternalApp}
                    className="px-3.5 py-2 rounded-xl text-[11px] font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                    style={{
                      backgroundColor: 'var(--surface-tonal)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)',
                    }}
                  >
                    <ExternalLink size={12} />
                    <span>Open External YouTube App</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Study Notes Tab */
            <div className="flex flex-col space-y-2 min-h-[60vh]">
              <div className="flex items-center justify-between text-[10px] font-mono tracking-wider px-0.5">
                <span style={{ color: 'var(--text-secondary)' }}>LECTURE SCRATCHPAD</span>
                <span style={{ color: 'var(--accent-primary)' }}>Auto-Saved Locally</span>
              </div>
              <textarea
                value={studyNotes}
                onChange={(e) => handleSaveNotes(e.target.value)}
                placeholder="Write formulas, code snippets, or lecture timestamps while studying..."
                className="w-full min-h-[320px] flex-1 p-3.5 rounded-2xl text-xs focus:outline-none resize-none font-mono leading-relaxed"
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

      {/* Accidental Misclick Guard Confirmation Toast */}
      {pendingSwitchLecture && !isVideoFullscreen && (
        <div
          className="fixed bottom-4 left-4 right-4 z-[150] max-w-xl mx-auto p-3.5 rounded-2xl shadow-2xl space-y-2.5 animate-fadeIn"
          style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--accent-border)',
          }}
        >
          <div className="min-w-0">
            <p
              className="text-[10px] font-mono font-bold tracking-wider"
              style={{ color: 'var(--accent-primary)' }}
            >
              ACCIDENTAL TAP GUARD • CURRENT SAVED AT {formatDurationSeconds(currentTime)}
            </p>
            <p
              className="text-xs font-semibold line-clamp-1 mt-0.5"
              style={{ color: 'var(--text-primary)' }}
            >
              Switch to: {pendingSwitchLecture.title}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                haptics.tick(450);
                setPendingSwitchLecture(null);
              }}
              className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--surface-tonal)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              Keep Watching
            </button>
            <button
              type="button"
              onClick={() => {
                haptics.tick(650);
                const nextTarget = pendingSwitchLecture;
                setPendingSwitchLecture(null);
                void loadLectureIntoPlayer(nextTarget);
              }}
              className="flex-1 py-2 rounded-xl text-xs font-bold cursor-pointer"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: 'var(--text-on-accent)',
              }}
            >
              Switch Video
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
