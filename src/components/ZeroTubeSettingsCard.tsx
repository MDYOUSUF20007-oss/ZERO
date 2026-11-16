import React, { useState } from 'react';
import {
  Play,
  ExternalLink,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  Check,
  Video,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import { ObsidianCard } from './ObsidianCard';
import {
  evaluateVideoForStudy,
  getCustomZeroTubeVideos,
  saveCustomZeroTubeVideo,
  removeCustomZeroTubeVideo,
  getUserTrustedChannels,
  saveUserTrustedChannel,
  isChannelTrusted,
  type ZeroTubeCustomVideo,
  type AiStudyVerificationResult,
} from '../utils/aiStudyVerifier';

interface ZeroTubeSettingsCardProps {
  isBespoke?: boolean;
  isFluentGlass?: boolean;
  isModernFont?: boolean;
  onOpenZeroTubePlayer: (videoId?: string) => void;
}

export const ZeroTubeSettingsCard: React.FC<ZeroTubeSettingsCardProps> = ({
  isBespoke = false,
  isFluentGlass = false,
  isModernFont = true,
  onOpenZeroTubePlayer,
}) => {
  const [customVideos, setCustomVideos] = useState<ZeroTubeCustomVideo[]>(() =>
    getCustomZeroTubeVideos()
  );

  // Form states
  const [urlInput, setUrlInput] = useState('');
  const [titleInput, setTitleInput] = useState('');
  const [channelInput, setChannelInput] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');

  // AI Verification states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AiStudyVerificationResult | null>(null);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [, setUserTrustedChannels] = useState<string[]>(() =>
    getUserTrustedChannels()
  );

  const handleTrustChannel = (channel: string) => {
    saveUserTrustedChannel(channel);
    setUserTrustedChannels(getUserTrustedChannels());
    haptics.tick(900);
    if (urlInput.trim()) {
      const tagsArray = tagsInput
        .split(/[,# ]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const result = evaluateVideoForStudy({
        urlOrId: urlInput,
        title: titleInput,
        channel: channel,
        tags: tagsArray,
        description: descriptionInput,
      });
      setAnalysisResult(result);
    }
  };

  // Refresh custom videos on mount or save
  const reloadVideos = () => {
    setCustomVideos(getCustomZeroTubeVideos());
  };

  const handleLaunchYouTubeApp = () => {
    haptics.tick(700);
    const pkg = 'app.morphe.android.youtube';
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchYouTubeOrMorphApp) {
      const launched = (window.ZeroNative as any).launchYouTubeOrMorphApp();
      if (launched) return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchBagApp) {
      const launched = (window.ZeroNative as any).launchBagApp(pkg);
      if (launched) return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.openYouTubeUrl) {
      (window.ZeroNative as any).openYouTubeUrl('https://www.youtube.com');
      return;
    }
    window.location.href = 'https://www.youtube.com';
  };

  // 1-Tap Quick Whitelist: Zero Forms! Just paste the link and done.
  const handleQuickWhitelistLink = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const rawUrl = urlInput.trim();
    if (!rawUrl) return;

    haptics.tick(600);
    setIsAnalyzing(true);
    setSaveSuccessMsg('');

    setTimeout(() => {
      const tagsArray = tagsInput
        .split(/[,# ]+/)
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);

      const result = evaluateVideoForStudy({
        urlOrId: rawUrl,
        title: titleInput.trim() || undefined,
        channel: channelInput.trim() || undefined,
        tags: tagsArray.length > 0 ? tagsArray : undefined,
        description: descriptionInput.trim() || undefined,
      });

      setAnalysisResult(result);
      setIsAnalyzing(false);

      if (result.isValidId && result.verdict === 'verified_productive') {
        const mergedTags = Array.from(new Set([...tagsArray, ...result.recommendedTags]));

        const defaultTitle = result.isChannelOnly
          ? (result.channelName || result.channelHandle || 'Verified Educational Channel')
          : (result.detectedExam
              ? `${result.detectedExam} Lecture (${result.videoId})`
              : `Study Lecture (${result.videoId})`);

        const defaultChannel =
          result.channelHandle || result.channelName || result.domainCategory || 'Verified Creator';

        const newVideo: ZeroTubeCustomVideo = {
          id: result.videoId || result.channelHandle || '@channel',
          url: rawUrl.startsWith('http')
            ? rawUrl
            : (result.isChannelOnly ? `https://youtube.com/${result.channelHandle}` : `https://youtube.com/watch?v=${result.videoId}`),
          title: titleInput.trim() || defaultTitle,
          channel: channelInput.trim() || defaultChannel,
          category: result.domainCategory,
          isChannel: result.isChannelOnly,
          channelHandle: result.channelHandle,
          tags: mergedTags,
          description: descriptionInput.trim(),
          aiStudyScore: result.studyScore,
          aiVerdict: result.verdict,
          domainCategory: result.domainCategory,
          detectedExam: result.detectedExam,
          aiRationale: result.rationale,
          addedAt: Date.now(),
        };

        saveCustomZeroTubeVideo(newVideo);

        // Regain-Style: Auto-whitelist this creator so ANY lecture from them is trusted!
        if (result.channelHandle) {
          saveUserTrustedChannel(result.channelHandle);
        }
        if (result.channelName) {
          saveUserTrustedChannel(result.channelName);
        }
        setUserTrustedChannels(getUserTrustedChannels());

        reloadVideos();
        haptics.tick(950);

        setSaveSuccessMsg(
          result.isChannelOnly
            ? `🎉 Whitelisted Channel "${newVideo.title}"! All creator lectures auto-authorized.`
            : `🎉 Added "${newVideo.title}" to Whitelist (${result.studyScore}/100 - ${result.domainCategory})!`
        );
        setUrlInput('');
        setTitleInput('');
        setChannelInput('');
        setTagsInput('');
        setDescriptionInput('');
        setShowAdvanced(false);

        setTimeout(() => setSaveSuccessMsg(''), 5000);
      } else if (result.isValidId) {
        haptics.tick(700);
      } else {
        haptics.thud();
      }
    }, 220);
  };

  const handleAddVideo = () => {
    if (!analysisResult?.isValidId) return;

    const tagsArray = tagsInput
      .split(/[,# ]+/)
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const mergedTags = Array.from(new Set([...tagsArray, ...analysisResult.recommendedTags]));

    const defaultTitle = analysisResult.isChannelOnly
      ? (analysisResult.channelName || analysisResult.channelHandle || 'Verified Educational Channel')
      : `Study Lecture (${analysisResult.videoId})`;

    const defaultChannel =
      analysisResult.channelHandle || analysisResult.channelName || 'Verified Channel';

    const newVideo: ZeroTubeCustomVideo = {
      id: analysisResult.videoId || analysisResult.channelHandle || '@channel',
      url: urlInput.trim(),
      title: titleInput.trim() || defaultTitle,
      channel: channelInput.trim() || defaultChannel,
      category: analysisResult.domainCategory,
      isChannel: analysisResult.isChannelOnly,
      channelHandle: analysisResult.channelHandle,
      tags: mergedTags,
      description: descriptionInput.trim(),
      aiStudyScore: analysisResult.studyScore,
      aiVerdict: analysisResult.verdict,
      domainCategory: analysisResult.domainCategory,
      detectedExam: analysisResult.detectedExam,
      aiRationale: analysisResult.rationale,
      addedAt: Date.now(),
    };

    saveCustomZeroTubeVideo(newVideo);

    // Regain-Style: Auto-whitelist this creator so ANY lecture from them is trusted!
    if (analysisResult.channelHandle) {
      saveUserTrustedChannel(analysisResult.channelHandle);
    }
    if (analysisResult.channelName) {
      saveUserTrustedChannel(analysisResult.channelName);
    }
    setUserTrustedChannels(getUserTrustedChannels());

    reloadVideos();
    haptics.tick(950);

    setSaveSuccessMsg(`Added "${newVideo.title}" to ZeroTube Whitelist!`);
    setUrlInput('');
    setTitleInput('');
    setChannelInput('');
    setTagsInput('');
    setDescriptionInput('');
    setAnalysisResult(null);
    setShowAdvanced(false);

    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  const handleDeleteVideo = (id: string) => {
    haptics.thud();
    removeCustomZeroTubeVideo(id);
    reloadVideos();
  };

  const handleOpenChannel = (url: string) => {
    haptics.tick(600);
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.openYouTubeUrl) {
      (window.ZeroNative as any).openYouTubeUrl(url);
      return;
    }
    if (typeof window !== 'undefined' && (window.ZeroNative as any)?.launchYouTubeOrMorphApp) {
      (window.ZeroNative as any).launchYouTubeOrMorphApp();
      return;
    }
    window.open(url, '_blank');
  };

  return (
    <ObsidianCard
      ambientGlow={!isBespoke}
      className={isModernFont ? 'font-sans' : 'font-mono'}
      headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 space-y-3.5'}
      footerClassName={
        isModernFont
          ? 'px-5 py-3 text-[11px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
          : 'px-4 py-2.5 text-[10px] text-zinc-400 leading-relaxed flex items-center justify-between gap-2 flex-wrap'
      }
      headerContent={
        <>
          {/* Header Title Row */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={
                  isFluentGlass
                    ? 'liquid-squircle text-cyan-300'
                    : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md text-cyan-400' : 'rounded-xl'
                      }`
                }
              >
                <Play
                  size={16}
                  fill="currentColor"
                  strokeWidth={1.75}
                  style={isModernFont ? undefined : { color: '#06B6D4' }}
                />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-white font-semibold uppercase tracking-wider flex items-center gap-1.5">
                  <span>ZeroTube // Study &amp; Video Whitelist</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    AI Verified
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 truncate">
                  Curate distraction-free lectures • No algorithmic feeds • No comments
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.tick(600);
                onOpenZeroTubePlayer();
              }}
              className={`px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 transition-all ${
                isFluentGlass
                  ? 'liquid-pill-active rounded-full'
                  : `obsidian-pill-active ${isBespoke ? 'rounded-sm' : 'rounded-xl font-black'} active:scale-95`
              }`}
            >
              <Video size={13} />
              <span>Open Player</span>
            </button>
          </div>

          {/* Quick External Video App Launch Pill */}
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-200">
                Browse &amp; Inspect Channels
              </div>
              <p className="text-[11px] text-zinc-400 leading-snug mt-0.5">
                Launch YouTube or YouTube Morphe to copy video links and inspect creators.
              </p>
            </div>

            <button
              type="button"
              onClick={handleLaunchYouTubeApp}
              className="px-3 py-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 hover:text-white hover:bg-rose-500/25 transition-colors text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer active:scale-95"
            >
              <ExternalLink size={13} />
              <span>Open App</span>
            </button>
          </div>

          {/* Toast / Notification Banner */}
          {saveSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 size={15} className="shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* QUICK WHITELIST LINK (ZERO FORMS - JUST PASTE & WHITELIST) */}
          <div className="p-4 rounded-2xl bg-black/40 border border-white/10 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-white font-semibold text-xs">
                <Sparkles size={14} className="text-cyan-400" />
                <span>Quick Whitelist (Just Give The Link)</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Zero Forms • 1-Tap AI
              </span>
            </div>

            <form onSubmit={handleQuickWhitelistLink} className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setAnalysisResult(null);
                }}
                placeholder="Paste YouTube video or @channel link (e.g. https://youtube.com/@paramountmerchantnavy)..."
                className="flex-1 px-3.5 py-2.5 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
              />
              <button
                type="submit"
                disabled={!urlInput.trim() || isAnalyzing}
                className="px-4 py-2.5 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md disabled:opacity-40 active:scale-95 shrink-0"
              >
                <Sparkles size={13} className={isAnalyzing ? 'animate-spin' : ''} />
                <span>{isAnalyzing ? 'Verifying...' : 'Whitelist Link'}</span>
              </button>
            </form>

            {/* Optional Manual Overrides (hidden by default) */}
            <div className="pt-0.5">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1 cursor-pointer font-mono"
              >
                <span>{showAdvanced ? '▾ Hide manual details' : '▸ Optional custom title or tags (not required)'}</span>
              </button>

              {showAdvanced && (
                <div className="mt-2.5 pt-2.5 border-t border-white/5 space-y-2 animate-fadeIn">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block mb-1">
                        Custom Title (Optional)
                      </label>
                      <input
                        type="text"
                        value={titleInput}
                        onChange={(e) => setTitleInput(e.target.value)}
                        placeholder="Custom lecture name..."
                        className="w-full px-3 py-2 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block mb-1">
                        Channel / Creator (Optional)
                      </label>
                      <input
                        type="text"
                        value={channelInput}
                        onChange={(e) => setChannelInput(e.target.value)}
                        placeholder="Creator name..."
                        className="w-full px-3 py-2 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                      />
                      {channelInput.trim() && (
                        <div className="mt-1 flex items-center justify-between text-[10px]">
                          {isChannelTrusted(channelInput) ? (
                            <span className="text-emerald-400 font-semibold flex items-center gap-1">
                              <CheckCircle2 size={12} /> Trusted Creator
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleTrustChannel(channelInput)}
                              className="text-cyan-300 hover:text-cyan-200 underline font-semibold flex items-center gap-1 cursor-pointer"
                            >
                              <Plus size={11} /> Trust Creator (+28 pts)
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-mono uppercase text-zinc-400 tracking-wider block mb-1">
                      Tags (Optional)
                    </label>
                    <input
                      type="text"
                      value={tagsInput}
                      onChange={(e) => setTagsInput(e.target.value)}
                      placeholder="e.g. math, deep learning, python"
                      className="w-full px-3 py-2 rounded-xl liquid-inset text-xs text-white placeholder-zinc-500 border border-white/10 focus:outline-none focus:ring-1 focus:ring-cyan-400"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* AI Verification Analysis Card */}
            {analysisResult && (
              <div
                className={`p-3.5 rounded-xl border space-y-2 text-xs transition-all ${
                  analysisResult.verdict === 'verified_productive'
                    ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : analysisResult.verdict === 'caution_entertainment'
                    ? 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                    : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[11px]">
                    {analysisResult.verdict === 'verified_productive' && (
                      <>
                        <CheckCircle2 size={15} className="text-emerald-400" />
                        <span className="text-emerald-300">Verified Productive</span>
                      </>
                    )}
                    {analysisResult.verdict === 'caution_entertainment' && (
                      <>
                        <AlertTriangle size={15} className="text-amber-400" />
                        <span className="text-amber-300">Caution: Leisure Risk</span>
                      </>
                    )}
                    {analysisResult.verdict === 'high_distraction_risk' && (
                      <>
                        <ShieldAlert size={15} className="text-rose-400" />
                        <span className="text-rose-300">High Distraction Risk</span>
                      </>
                    )}
                  </div>

                  <div className="px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-white/10 text-white border border-white/10">
                    Study Score: {analysisResult.studyScore}/100
                  </div>
                </div>

                {analysisResult.isChannelOnly && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-400/30 text-emerald-200 font-mono text-[11px] font-bold">
                    <span>🎓 Regain-Style Whitelist:</span>
                    <span className="text-white underline">
                      Entire Channel ({analysisResult.channelHandle || analysisResult.channelName})
                    </span>
                    <span className="text-[10px] text-emerald-300 font-normal">All channel lectures auto-authorized</span>
                  </div>
                )}

                {analysisResult.detectedExam && (
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/15 border border-cyan-400/30 text-cyan-200 font-mono text-[11px] font-bold">
                    <span>🎯 Target Curriculum:</span>
                    <span className="text-white underline">{analysisResult.detectedExam}</span>
                    <span className="text-[10px] text-cyan-300 font-normal">(+18 pt Exam Bonus)</span>
                  </div>
                )}

                <p className="text-[11px] leading-relaxed text-zinc-300">
                  {analysisResult.rationale}
                </p>

                <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                  <span>Category: <strong className="text-cyan-300">{analysisResult.domainCategory}</strong></span>
                  <span>•</span>
                  <span>{analysisResult.isChannelOnly ? 'Channel Handle:' : 'Video ID:'} <strong className="text-white">{analysisResult.videoId || analysisResult.channelHandle || 'Invalid'}</strong></span>
                </div>

                {analysisResult.distractionFlags.length > 0 && (
                  <div className="text-[10px] text-rose-400 font-mono">
                    Flags: {analysisResult.distractionFlags.join(', ')}
                  </div>
                )}

                {/* Add Whitelist Action (for caution or manual confirmation) */}
                {analysisResult.isValidId && (
                  <button
                    type="button"
                    onClick={handleAddVideo}
                    className="w-full mt-2 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    <span>
                      {analysisResult.isChannelOnly
                        ? `Whitelist Entire Channel (${analysisResult.channelHandle || '@creator'})`
                        : 'Add to My ZeroTube Whitelist'}
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* CUSTOM WHITELISTED VIDEOS LIST */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-widest">
                Whitelisted Study Catalog ({customVideos.length} Saved)
              </span>
            </div>
            {customVideos.length === 0 ? (
              <div className="p-4 rounded-xl border border-white/5 bg-white/[0.01] text-center text-zinc-500 text-xs">
                No custom study links added yet. Paste any YouTube video or channel link above to whitelist instantly!
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {customVideos.map((vid) => (
                  <div
                    key={vid.id}
                    className="p-3 rounded-xl border border-white/10 bg-white/[0.02] flex flex-col justify-between space-y-2 hover:border-cyan-400/40 transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-xs font-semibold text-white line-clamp-2 leading-snug">
                          {vid.title}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteVideo(vid.id)}
                          title="Remove from Whitelist"
                          className="p-1 text-zinc-500 hover:text-rose-400 transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      <div className="text-[10px] text-cyan-300 font-mono mt-1">
                        {vid.channel}
                      </div>

                      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                        {vid.isChannel && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            🎓 Channel
                          </span>
                        )}
                        {vid.detectedExam && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-200 border border-amber-400/40">
                            🎯 {vid.detectedExam}
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/15 text-cyan-300 border border-cyan-500/20">
                          {vid.category}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/10 text-white">
                          AI: {vid.aiStudyScore}/100
                        </span>
                      </div>
                    </div>

                    {vid.isChannel ? (
                      <button
                        type="button"
                        onClick={() => handleOpenChannel(vid.url)}
                        className="w-full py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 hover:text-white text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <ExternalLink size={12} />
                        <span>Browse Channel in YouTube</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          haptics.tick(600);
                          onOpenZeroTubePlayer(vid.id);
                        }}
                        className="w-full py-1.5 rounded-lg bg-white/10 hover:bg-cyan-500/20 text-white hover:text-cyan-300 text-[11px] font-semibold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                      >
                        <Play size={11} fill="currentColor" />
                        <span>Play in ZeroTube</span>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      }
      footerContent={
        <p>
          ZeroTube strips recommendations, comments, autoplay next, and side feeds to guarantee 100% focused study.
        </p>
      }
    />
  );
};
