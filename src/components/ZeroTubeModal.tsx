import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Search,
  FileText,
  ExternalLink,
  Lock,
  Sparkles,
  Settings,
  Plus,
  GraduationCap,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import {
  extractYouTubeVideoId,
  extractYouTubeChannelHandle,
  evaluateVideoForStudy,
  getCustomZeroTubeVideos,
  saveCustomZeroTubeVideo,
  removeCustomZeroTubeVideo,
  saveUserTrustedChannel,
  type ZeroTubeCustomVideo,
} from '../utils/aiStudyVerifier';

interface ZeroTubeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLaunchMorphApp?: () => void;
  initialVideoId?: string;
  onOpenSettingsStudio?: () => void;
}

interface PendingItem {
  id: string;
  url?: string;
  title: string;
  channel: string;
  category?: string;
  isChannel?: boolean;
  channelHandle?: string;
  tags?: string[];
  aiStudyScore?: number;
  detectedExam?: string;
}

export const ZeroTubeModal: React.FC<ZeroTubeModalProps> = ({
  isOpen,
  onClose,
  onLaunchMorphApp,
  initialVideoId,
  onOpenSettingsStudio,
}) => {
  const [activeVideoId, setActiveVideoId] = useState<string>('');
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>('');
  const [activeChannel, setActiveChannel] = useState<string>('');
  const [searchUrlInput, setSearchUrlInput] = useState('');
  const [activeTab, setActiveTab] = useState<'catalog' | 'notes'>('catalog');
  const [customVideos, setCustomVideos] = useState<ZeroTubeCustomVideo[]>([]);
  const customChannels = customVideos.filter((v) => v.isChannel);
  const customLectures = customVideos.filter((v) => !v.isChannel);
  const [studyNotes, setStudyNotes] = useState<string>(() => {
    try {
      return localStorage.getItem('zero_tube_study_notes_v1') || '';
    } catch {
      return '';
    }
  });

  // Intent friction check state
  const [showFrictionGate, setShowFrictionGate] = useState(false);
  const [pendingVideo, setPendingVideo] = useState<PendingItem | null>(null);
  const [frictionPhrase, setFrictionPhrase] = useState('');
  const [frictionError, setFrictionError] = useState(false);

  // Sync custom videos and initial video ID on modal open
  useEffect(() => {
    if (isOpen) {
      const vids = getCustomZeroTubeVideos();
      setCustomVideos(vids);

      if (initialVideoId) {
        const found = vids.find((v) => v.id === initialVideoId);
        if (found) {
          setActiveVideoId(found.id);
          setActiveVideoTitle(found.title);
          setActiveChannel(found.channel);
        } else {
          setActiveVideoId(initialVideoId);
          setActiveVideoTitle(`Lecture (${initialVideoId})`);
          setActiveChannel('Custom Source');
        }
      } else {
        const firstLecture = vids.find((v) => !v.isChannel);
        if (firstLecture) {
          setActiveVideoId(firstLecture.id);
          setActiveVideoTitle(firstLecture.title);
          setActiveChannel(firstLecture.channel);
        }
      }
    }
  }, [isOpen, initialVideoId]);

  const handleSelectVideo = (video: ZeroTubeCustomVideo) => {
    haptics.tick(600);
    setActiveVideoId(video.id);
    setActiveVideoTitle(video.title);
    setActiveChannel(video.channel);
  };

  const handleDeleteVideo = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    haptics.tick(800);
    removeCustomZeroTubeVideo(id);
    const updated = getCustomZeroTubeVideos();
    setCustomVideos(updated);
    if (activeVideoId === id) {
      const next = updated.find((v) => !v.isChannel);
      if (next) {
        setActiveVideoId(next.id);
        setActiveVideoTitle(next.title);
        setActiveChannel(next.channel);
      } else {
        setActiveVideoId('');
        setActiveVideoTitle('');
        setActiveChannel('');
      }
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
      const launched = (window.ZeroNative as any).launchYouTubeOrMorphApp();
      if (launched) return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchBagApp) {
      const launched = (window.ZeroNative as any).launchBagApp(pkg);
      if (launched) return;
    }
    window.location.href = 'https://www.youtube.com';
  };

  const handleLaunchExternalUrl = (url: string) => {
    haptics.tick(700);
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.openYouTubeUrl) {
      (window.ZeroNative as any).openYouTubeUrl(url);
      return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchYouTubeOrMorphApp) {
      const launched = (window.ZeroNative as any).launchYouTubeOrMorphApp();
      if (launched) return;
    }
    window.open(url, '_blank');
  };

  const handleSubmitUrlOrSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = searchUrlInput.trim();
    if (!rawInput) return;

    const extractedId = extractYouTubeVideoId(rawInput);
    const channelHandle = extractYouTubeChannelHandle(rawInput);

    if (extractedId) {
      const aiEval = evaluateVideoForStudy({ urlOrId: rawInput });
      if (aiEval.verdict === 'verified_productive') {
        // High AI score: auto-whitelist and save immediately
        const title = aiEval.channelName || `Study Lecture (${extractedId})`;
        const channel = aiEval.domainCategory || 'Verified Study';

        const newVideo: ZeroTubeCustomVideo = {
          id: extractedId,
          url: rawInput.startsWith('http')
            ? rawInput
            : `https://www.youtube.com/watch?v=${extractedId}`,
          title,
          channel,
          category: aiEval.domainCategory || 'Academic',
          isChannel: false,
          tags: aiEval.recommendedTags,
          aiStudyScore: aiEval.studyScore,
          aiVerdict: aiEval.verdict,
          domainCategory: aiEval.domainCategory,
          detectedExam: aiEval.detectedExam,
          aiRationale: aiEval.rationale,
          addedAt: Date.now(),
        };

        saveCustomZeroTubeVideo(newVideo);
        setCustomVideos(getCustomZeroTubeVideos());
        setActiveVideoId(extractedId);
        setActiveVideoTitle(title);
        setActiveChannel(channel);
        setSearchUrlInput('');
        haptics.tick(900);
      } else {
        // Potential distraction risk or unrecognized lecture: trigger intentional cognitive friction
        setPendingVideo({
          id: extractedId,
          url: rawInput.startsWith('http')
            ? rawInput
            : `https://www.youtube.com/watch?v=${extractedId}`,
          title: `Study Lecture (${extractedId})`,
          channel: aiEval.domainCategory || 'Personal Study',
          category: aiEval.domainCategory || 'Academic',
          isChannel: false,
          tags: aiEval.recommendedTags,
          aiStudyScore: aiEval.studyScore,
          detectedExam: aiEval.detectedExam,
        });
        setShowFrictionGate(true);
        setFrictionPhrase('');
        setFrictionError(false);
        haptics.thud();
      }
    } else if (channelHandle) {
      const aiEval = evaluateVideoForStudy({ urlOrId: rawInput });
      if (aiEval.verdict === 'verified_productive') {
        // Educational channel verified! Auto-whitelist channel and trust creator (Regain style)
        saveUserTrustedChannel(channelHandle);
        if (aiEval.channelName) saveUserTrustedChannel(aiEval.channelName);

        const newChan: ZeroTubeCustomVideo = {
          id: channelHandle,
          url: rawInput.startsWith('http')
            ? rawInput
            : `https://youtube.com/${channelHandle}`,
          title: aiEval.channelName || channelHandle,
          channel: channelHandle,
          category: aiEval.domainCategory,
          isChannel: true,
          channelHandle,
          tags: aiEval.recommendedTags,
          aiStudyScore: aiEval.studyScore,
          aiVerdict: aiEval.verdict,
          domainCategory: aiEval.domainCategory,
          detectedExam: aiEval.detectedExam,
          aiRationale: aiEval.rationale,
          addedAt: Date.now(),
        };

        saveCustomZeroTubeVideo(newChan);
        setCustomVideos(getCustomZeroTubeVideos());
        haptics.tick(900);
        setSearchUrlInput('');
        handleLaunchExternalUrl(newChan.url);
      } else {
        // Educational channel with moderate score: let the student pledge intent via friction gate
        setPendingVideo({
          id: channelHandle,
          url: rawInput.startsWith('http')
            ? rawInput
            : `https://youtube.com/${channelHandle}`,
          title: channelHandle,
          channel: channelHandle,
          category: 'Study Channel',
          isChannel: true,
          channelHandle,
          tags: aiEval.recommendedTags,
          aiStudyScore: aiEval.studyScore,
          detectedExam: aiEval.detectedExam,
        });
        setShowFrictionGate(true);
        setFrictionPhrase('');
        setFrictionError(false);
        haptics.thud();
      }
    } else {
      alert(
        'Productive Mode: Direct video or educational channel URL pasting is verified with AI study evaluation. Paste a YouTube link or handle.'
      );
    }
  };

  const handleConfirmFriction = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = frictionPhrase.trim().toLowerCase();
    if (clean === 'i am productive.' || clean === 'i am productive') {
      haptics.tick(900);
      if (pendingVideo) {
        if (pendingVideo.isChannel) {
          saveUserTrustedChannel(pendingVideo.id);
          if (pendingVideo.channelHandle) saveUserTrustedChannel(pendingVideo.channelHandle);
        }

        const newVideo: ZeroTubeCustomVideo = {
          id: pendingVideo.id,
          url:
            pendingVideo.url ||
            (pendingVideo.isChannel
              ? `https://youtube.com/${pendingVideo.id}`
              : `https://www.youtube.com/watch?v=${pendingVideo.id}`),
          title: pendingVideo.title,
          channel: pendingVideo.channel,
          category: pendingVideo.category || (pendingVideo.isChannel ? 'Study Channel' : 'Personal Study'),
          isChannel: pendingVideo.isChannel || false,
          channelHandle: pendingVideo.channelHandle,
          tags: pendingVideo.tags || ['study', 'user-whitelisted'],
          aiStudyScore: pendingVideo.aiStudyScore ?? 85,
          aiVerdict: 'verified_productive',
          domainCategory: pendingVideo.category || 'Study Video',
          detectedExam: pendingVideo.detectedExam,
          aiRationale: 'Authorized by student under productive friction pledge: "I am productive."',
          addedAt: Date.now(),
        };

        // Persist to custom ZeroTube list
        saveCustomZeroTubeVideo(newVideo);
        const updated = getCustomZeroTubeVideos();
        setCustomVideos(updated);

        if (!pendingVideo.isChannel) {
          setActiveVideoId(pendingVideo.id);
          setActiveVideoTitle(pendingVideo.title);
          setActiveChannel(pendingVideo.channel);
        } else {
          handleLaunchExternalUrl(newVideo.url);
        }
      }
      setShowFrictionGate(false);
      setPendingVideo(null);
      setFrictionPhrase('');
      setSearchUrlInput('');
    } else {
      haptics.thud();
      setFrictionError(true);
    }
  };

  const handleSaveNotes = (text: string) => {
    setStudyNotes(text);
    try {
      localStorage.setItem('zero_tube_study_notes_v1', text);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-black/85 backdrop-blur-2xl animate-fadeIn select-none font-sans"
    >
      <div className="relative w-full max-w-2xl max-h-[92vh] rounded-[26px] modal-glass border border-white/10 shadow-2xl flex flex-col overflow-hidden text-zinc-200">
        {/* Header Bar */}
        <div className="px-5 py-3.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl liquid-inset flex items-center justify-center text-cyan-300">
              <Play size={16} fill="currentColor" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold tracking-wider text-white uppercase">
                  ZeroTube // Study Player
                </span>
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1">
                  <ShieldCheck size={10} />
                  Productive Only
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-widest mt-0.5">
                NO ADS • NO SHORTS • NO ALGORITHMIC FEEDS
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              haptics.thud();
              onClose();
            }}
            className="w-8 h-8 rounded-full liquid-pill-inactive flex items-center justify-center text-zinc-400 hover:text-white cursor-pointer"
          >
            <X size={15} />
          </button>
        </div>

        {/* Video Screen Container - Ad-free & Distraction-free */}
        <div className="w-full bg-black relative aspect-video shrink-0 border-b border-white/[0.08]">
          {activeVideoId ? (
            <iframe
              title={activeVideoTitle || 'Study Video'}
              src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&iv_load_policy=3&controls=1&playsinline=1`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              className="w-full h-full border-0"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400 bg-zinc-950/60">
              <div className="w-12 h-12 rounded-2xl liquid-inset flex items-center justify-center text-cyan-400 mb-3 border border-white/5 shadow-inner">
                <Play size={22} fill="currentColor" />
              </div>
              <h3 className="text-xs font-bold text-white tracking-wide">No Lecture Loaded</h3>
              <p className="text-[11px] text-zinc-400 mt-1 max-w-xs leading-relaxed">
                Paste any YouTube video or channel link below to stream ad-free without distraction traps.
              </p>
            </div>
          )}
        </div>

        {/* Video Metadata & Controls */}
        <div className="px-5 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.01]">
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="text-xs font-semibold text-white truncate">
              {activeVideoTitle || 'Select a lecture to play'}
            </h4>
            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
              {activeChannel || 'Zero-Distraction Mode'}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLaunchExternalApp}
              title="Launch YouTube or Ad-Free Morph App"
              className="px-2.5 py-1.5 rounded-xl liquid-pill-inactive text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={12} />
              <span>Morph App (Ad-Free)</span>
            </button>

            {onOpenSettingsStudio && (
              <button
                type="button"
                onClick={() => {
                  haptics.tick(600);
                  onOpenSettingsStudio();
                }}
                title="Manage Whitelist in Settings"
                className="px-2.5 py-1.5 rounded-xl liquid-pill-inactive text-[10px] font-bold uppercase tracking-wider text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
              >
                <Settings size={12} />
                <span>Studio</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                haptics.tick(500);
                setActiveTab(activeTab === 'catalog' ? 'notes' : 'catalog');
              }}
              className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'notes' ? 'liquid-pill-active' : 'liquid-pill-inactive text-zinc-300'
              }`}
            >
              <FileText size={12} />
              <span>{activeTab === 'notes' ? 'Lectures' : 'Study Notes'}</span>
            </button>
          </div>
        </div>

        {/* Dynamic Tab Body */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3">
          {activeTab === 'catalog' ? (
            <>
              {/* URL Direct Paste Bar */}
              <form onSubmit={handleSubmitUrlOrSearch} className="flex gap-2">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
                  />
                  <input
                    type="text"
                    value={searchUrlInput}
                    onChange={(e) => setSearchUrlInput(e.target.value)}
                    placeholder="Paste YouTube video or channel link (@handle or URL)..."
                    className="w-full pl-9 pr-3 py-2 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 border border-white/10"
                  />
                </div>
                <button
                  type="submit"
                  className="px-3.5 py-2 rounded-xl liquid-pill-active text-xs font-bold uppercase tracking-wider cursor-pointer"
                >
                  Load
                </button>
              </form>

              {/* Custom Whitelisted Channels (Regain-Style) */}
              {customChannels.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-emerald-400 flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <GraduationCap size={12} />
                      <span>Whitelisted Study Channels ({customChannels.length})</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-mono">Regain-Style Whitelist</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customChannels.map((vid) => (
                      <div
                        key={vid.id}
                        className="p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all flex flex-col justify-between group"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <button
                            type="button"
                            onClick={() => handleLaunchExternalUrl(vid.url)}
                            className="text-xs font-semibold text-white line-clamp-1 leading-snug text-left hover:text-emerald-300 cursor-pointer flex-1"
                          >
                            {vid.title}
                          </button>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVideo(e, vid.id)}
                              title="Remove from Whitelist"
                              className="text-zinc-500 hover:text-rose-400 p-0.5 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                            <ExternalLink size={11} className="text-emerald-400 shrink-0" />
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mt-1">
                          <span className="text-emerald-300 font-bold">{vid.channel}</span>
                          <div className="flex items-center gap-1">
                            {vid.detectedExam && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                {vid.detectedExam}
                              </span>
                            )}
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-500/20 text-emerald-300">
                              AI: {vid.aiStudyScore}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Custom Whitelisted Lectures (if any) */}
              {customLectures.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-300 flex items-center justify-between px-0.5">
                    <div className="flex items-center gap-1.5">
                      <Sparkles size={11} />
                      <span>My Whitelisted Lectures ({customLectures.length})</span>
                    </div>
                    {onOpenSettingsStudio && (
                      <button
                        type="button"
                        onClick={onOpenSettingsStudio}
                        className="text-[9px] uppercase tracking-wider text-zinc-400 hover:text-white flex items-center gap-0.5 cursor-pointer"
                      >
                        <Plus size={10} />
                        <span>Add More</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {customLectures.map((vid) => {
                      const isPlaying = vid.id === activeVideoId;
                      return (
                        <div
                          key={vid.id}
                          className={`p-2.5 rounded-xl border transition-all flex flex-col justify-between group ${
                            isPlaying
                              ? 'bg-cyan-500/10 border-cyan-400/40 text-white'
                              : 'liquid-inset border-white/5 text-zinc-300 hover:border-white/20'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-1 mb-1.5">
                            <button
                              type="button"
                              onClick={() => handleSelectVideo(vid)}
                              className="text-xs font-semibold line-clamp-2 leading-snug text-left hover:text-cyan-300 cursor-pointer flex-1"
                            >
                              {vid.title}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteVideo(e, vid.id)}
                              title="Remove lecture"
                              className="text-zinc-500 hover:text-rose-400 p-0.5 shrink-0 cursor-pointer"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span className="text-cyan-300 truncate max-w-[140px]">{vid.channel}</span>
                            <div className="flex items-center gap-1 shrink-0">
                              {vid.detectedExam && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-amber-500/20 text-amber-200 border border-amber-500/30">
                                  {vid.detectedExam}
                                </span>
                              )}
                              <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                                AI: {vid.aiStudyScore}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Zero Custom Videos Empty State */}
              {customChannels.length === 0 && customLectures.length === 0 && (
                <div className="py-10 px-4 text-center rounded-2xl liquid-inset border border-white/5 space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 mx-auto">
                    <GraduationCap size={24} />
                  </div>
                  <h3 className="text-xs font-bold text-white tracking-wide">
                    Your Study Whitelist Is Clean &amp; Empty
                  </h3>
                  <p className="text-[11px] text-zinc-400 max-w-sm mx-auto leading-relaxed">
                    ZeroTube is dedicated solely to your own curriculum. Paste any YouTube lecture or exam channel link above to study ad-free without algorithm traps.
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Study Notes Tab */
            <div className="h-full flex flex-col space-y-2">
              <div className="flex items-center justify-between text-[10px] font-mono text-zinc-400 uppercase tracking-widest px-0.5">
                <span>Lecture &amp; Study Scratchpad</span>
                <span className="text-cyan-400">Auto-Saved Locally</span>
              </div>
              <textarea
                value={studyNotes}
                onChange={(e) => handleSaveNotes(e.target.value)}
                placeholder="Take notes, write down code snippets, or summarize key takeaways while watching..."
                className="w-full h-40 flex-1 p-3 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 resize-none border border-white/10 font-mono leading-relaxed"
              />
            </div>
          )}
        </div>

        {/* COGNITIVE "I AM PRODUCTIVE." FRICTION INTERVENTION MODAL */}
        {showFrictionGate && pendingVideo && (
          <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-5 text-center animate-fadeIn">
            <div className="w-full max-w-sm rounded-2xl modal-glass p-5 border border-white/10 shadow-2xl space-y-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg">
                <Lock size={20} />
              </div>

              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Productive Intent Check
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  To confirm this content is strictly required for your studies, verify your intent by typing:
                </p>
                <div className="my-2 py-1.5 px-3 rounded-lg bg-white/5 border border-white/10 text-cyan-300 font-mono text-xs font-bold select-all">
                  I am productive.
                </div>
              </div>

              <form onSubmit={handleConfirmFriction} className="space-y-2">
                <input
                  type="text"
                  autoFocus
                  value={frictionPhrase}
                  onChange={(e) => {
                    setFrictionPhrase(e.target.value);
                    setFrictionError(false);
                  }}
                  placeholder="Type: I am productive."
                  className={`w-full px-3 py-2 rounded-xl liquid-inset text-xs text-center text-white placeholder-zinc-500 focus:outline-none border ${
                    frictionError ? 'border-rose-500 ring-1 ring-rose-500' : 'border-white/10'
                  }`}
                />

                {frictionError && (
                  <p className="text-[10px] text-rose-400 font-medium">
                    Exact phrase required: &quot;I am productive.&quot;
                  </p>
                )}

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      haptics.thud();
                      setShowFrictionGate(false);
                      setPendingVideo(null);
                    }}
                    className="flex-1 py-2 rounded-xl liquid-pill-inactive text-xs font-semibold text-zinc-400 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2 rounded-xl liquid-pill-active text-xs font-bold uppercase tracking-wider text-white cursor-pointer shadow-md"
                  >
                    Confirm
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
