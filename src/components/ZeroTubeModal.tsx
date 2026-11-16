import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Search,
  BookOpen,
  FileText,
  ExternalLink,
  Lock,
  Sparkles,
  Settings,
  Plus,
  GraduationCap,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import {
  extractYouTubeVideoId,
  extractYouTubeChannelHandle,
  evaluateVideoForStudy,
  getCustomZeroTubeVideos,
  saveCustomZeroTubeVideo,
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

interface ProductiveVideo {
  id: string;
  title: string;
  channel: string;
  category: string;
  duration?: string;
}

const VERIFIED_STUDY_VIDEOS: ProductiveVideo[] = [
  {
    id: 'kqtD5dpn9C8',
    title: 'Python for Beginners – Full Course [Programming Tutorial]',
    channel: 'freeCodeCamp.org',
    category: 'Computer Science',
    duration: '4h 26m',
  },
  {
    id: 'aircAruvnKk',
    title: 'Neural Networks: But what is a neural network? | Deep learning Chapter 1',
    channel: '3Blue1Brown',
    category: 'Mathematics & AI',
    duration: '19m 13s',
  },
  {
    id: 'zNMMpP8xTzE',
    title: 'Harvard CS50 – Full Computer Science University Course',
    channel: 'CS50',
    category: 'Computer Science',
    duration: '11h 55m',
  },
  {
    id: 'VMj-3S1tku0',
    title: 'Building micrograd: A neural network from scratch in Python',
    channel: 'Andrej Karpathy',
    category: 'AI & Engineering',
    duration: '2h 25m',
  },
  {
    id: 'vA5TTLM5U1g',
    title: 'How to Focus & Master Attention | Huberman Lab Podcast',
    channel: 'Andrew Huberman',
    category: 'Neuroscience & Deep Work',
    duration: '1h 35m',
  },
  {
    id: '7eh4d6sabA0',
    title: 'Linear Algebra – Full College Course',
    channel: 'MIT OpenCourseWare',
    category: 'Mathematics',
    duration: '45m 12s',
  },
];

export const ZeroTubeModal: React.FC<ZeroTubeModalProps> = ({
  isOpen,
  onClose,
  onLaunchMorphApp,
  initialVideoId,
  onOpenSettingsStudio,
}) => {
  const [activeVideoId, setActiveVideoId] = useState<string>('aircAruvnKk');
  const [activeVideoTitle, setActiveVideoTitle] = useState<string>(
    'Neural Networks: But what is a neural network? | Deep learning Chapter 1'
  );
  const [activeChannel, setActiveChannel] = useState<string>('3Blue1Brown');
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
  const [pendingVideo, setPendingVideo] = useState<{ id: string; title: string; channel: string } | null>(
    null
  );
  const [frictionPhrase, setFrictionPhrase] = useState('');
  const [frictionError, setFrictionError] = useState(false);

  // Sync custom videos and initial video ID on modal open
  useEffect(() => {
    if (isOpen) {
      const vids = getCustomZeroTubeVideos();
      setCustomVideos(vids);

      if (initialVideoId) {
        const found =
          vids.find((v) => v.id === initialVideoId) ||
          VERIFIED_STUDY_VIDEOS.find((v) => v.id === initialVideoId);
        if (found) {
          setActiveVideoId(found.id);
          setActiveVideoTitle(found.title);
          setActiveChannel(found.channel);
        } else {
          setActiveVideoId(initialVideoId);
          setActiveVideoTitle(`Lecture (${initialVideoId})`);
          setActiveChannel('Custom Source');
        }
      }
    }
  }, [isOpen, initialVideoId]);

  const handleSelectVideo = (video: ProductiveVideo | ZeroTubeCustomVideo) => {
    haptics.tick(600);
    setActiveVideoId(video.id);
    setActiveVideoTitle(video.title);
    setActiveChannel(video.channel);
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
    if (!searchUrlInput.trim()) return;

    const extractedId = extractYouTubeVideoId(searchUrlInput);
    const channelHandle = extractYouTubeChannelHandle(searchUrlInput);

    if (extractedId) {
      const aiEval = evaluateVideoForStudy({ urlOrId: searchUrlInput });
      if (aiEval.verdict === 'verified_productive') {
        // High AI score: auto-whitelist immediately
        setActiveVideoId(extractedId);
        setActiveVideoTitle(`AI Verified Lecture (${extractedId})`);
        setActiveChannel(aiEval.domainCategory);
        setSearchUrlInput('');
        haptics.tick(900);
      } else {
        // Moderate or high distraction risk: trigger intentional cognitive friction
        setPendingVideo({
          id: extractedId,
          title: `Custom Video (${extractedId})`,
          channel: aiEval.domainCategory || 'External Source',
        });
        setShowFrictionGate(true);
        setFrictionPhrase('');
        setFrictionError(false);
        haptics.thud();
      }
    } else if (channelHandle) {
      const aiEval = evaluateVideoForStudy({ urlOrId: searchUrlInput });
      if (aiEval.verdict === 'verified_productive') {
        // Educational channel verified! Auto-whitelist channel and trust creator (Regain style)
        saveUserTrustedChannel(channelHandle);
        if (aiEval.channelName) saveUserTrustedChannel(aiEval.channelName);

        const newChan: ZeroTubeCustomVideo = {
          id: channelHandle,
          url: searchUrlInput.trim().startsWith('http')
            ? searchUrlInput.trim()
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
        alert(
          `Distraction Risk: ${channelHandle} carries leisure or entertainment markers (${aiEval.studyScore}/100) and cannot be whitelisted.`
        );
      }
    } else {
      alert(
        'Productive Mode: Direct video or educational channel URL pasting is verified with AI study evaluation. Searching uncurated algorithmic feeds is blocked to prevent dopamine traps.'
      );
    }
  };

  const handleConfirmFriction = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = frictionPhrase.trim().toLowerCase();
    if (clean === 'i am productive.' || clean === 'i am productive') {
      haptics.tick(900);
      if (pendingVideo) {
        setActiveVideoId(pendingVideo.id);
        setActiveVideoTitle(pendingVideo.title);
        setActiveChannel(pendingVideo.channel);
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
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold tracking-wide uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Productive Only
                </span>
              </div>
              <p className="text-[10px] text-zinc-400 font-mono tracking-widest mt-0.5">
                NO SHORTS • NO ALGORITHMIC FEEDS • NO COMMENTS
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

        {/* Video Screen Container */}
        <div className="w-full bg-black relative aspect-video shrink-0 border-b border-white/[0.08]">
          <iframe
            title={activeVideoTitle}
            src={`https://www.youtube-nocookie.com/embed/${activeVideoId}?autoplay=1&rel=0&modestbranding=1&controls=1`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0"
          />
        </div>

        {/* Video Metadata & Controls */}
        <div className="px-5 py-2.5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-white/[0.01]">
          <div className="min-w-0 flex-1 pr-3">
            <h4 className="text-xs font-semibold text-white truncate">{activeVideoTitle}</h4>
            <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider">
              {activeChannel}
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleLaunchExternalApp}
              title="Launch YouTube or YouTube Morph"
              className="px-2.5 py-1.5 rounded-xl liquid-pill-inactive text-[10px] font-bold uppercase tracking-wider text-rose-400 hover:text-white flex items-center gap-1.5 cursor-pointer"
            >
              <ExternalLink size={12} />
              <span>Morph App</span>
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
                    placeholder="Paste YouTube or Morph URL to play (AI Evaluated)..."
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
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() => handleLaunchExternalUrl(vid.url)}
                        className="text-left p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 hover:border-emerald-500/40 transition-all cursor-pointer flex flex-col justify-between"
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <div className="text-xs font-semibold text-white line-clamp-1 leading-snug">
                            {vid.title}
                          </div>
                          <ExternalLink size={11} className="text-emerald-400 shrink-0 mt-0.5" />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
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
                      </button>
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
                        <button
                          key={vid.id}
                          type="button"
                          onClick={() => handleSelectVideo(vid)}
                          className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                            isPlaying
                              ? 'bg-cyan-500/10 border-cyan-400/40 text-white'
                              : 'liquid-inset border-white/5 text-zinc-300 hover:border-white/20'
                          }`}
                        >
                          <div className="text-xs font-semibold line-clamp-2 mb-1.5 leading-snug">
                            {vid.title}
                          </div>
                          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                            <span className="text-cyan-300">{vid.channel}</span>
                            <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-500/20 text-cyan-300">
                              AI: {vid.aiStudyScore}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Verified Productive Lectures */}
              <div className="space-y-1.5 pt-1">
                <div className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 flex items-center gap-1.5 px-0.5">
                  <BookOpen size={11} className="text-cyan-400" />
                  <span>Curated Study Catalog (Built-in)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {VERIFIED_STUDY_VIDEOS.map((vid) => {
                    const isPlaying = vid.id === activeVideoId;
                    return (
                      <button
                        key={vid.id}
                        type="button"
                        onClick={() => handleSelectVideo(vid)}
                        className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isPlaying
                            ? 'bg-cyan-500/10 border-cyan-400/40 text-white'
                            : 'liquid-inset border-white/5 text-zinc-300 hover:border-white/20'
                        }`}
                      >
                        <div className="text-xs font-semibold line-clamp-2 mb-1.5 leading-snug">
                          {vid.title}
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono">
                          <span className="text-cyan-300">{vid.channel}</span>
                          <span>{vid.duration}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
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
                  This video carries potential distraction flags. If this content is strictly required for
                  your studies, confirm by typing:
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
