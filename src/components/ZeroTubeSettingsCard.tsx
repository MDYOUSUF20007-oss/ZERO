import React, { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Video,
  Loader2,
} from 'lucide-react';
import { haptics } from '../utils/haptics';
import { ObsidianCard } from './ObsidianCard';
import { OfficialYouTubeGuardCard } from './OfficialYouTubeGuardCard';
import {
  ZeroTube,
  isZeroTubeNativeAvailable,
  type WhitelistedChannel,
} from '../plugins/zeroTube';
import {
  ZEROTUBE_WHITELIST_EVENT,
  extractYouTubeChannelId,
  extractYouTubeChannelHandle,
  getWhitelistedChannels,
  saveWhitelistedChannel,
  removeWhitelistedChannel,
  getChannelKey,
} from '../utils/zeroTubeWhitelist';

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
  const [channels, setChannels] = useState<WhitelistedChannel[]>(() =>
    getWhitelistedChannels()
  );
  const [channelInput, setChannelInput] = useState('');
  const [isResolving, setIsResolving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    const sync = () => setChannels(getWhitelistedChannels());
    window.addEventListener(ZEROTUBE_WHITELIST_EVENT, sync);
    return () => window.removeEventListener(ZEROTUBE_WHITELIST_EVENT, sync);
  }, []);

  const handleAddChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = channelInput.trim();
    if (!raw) return;

    haptics.tick(600);
    setIsResolving(true);
    setFeedback(null);

    try {
      if (isZeroTubeNativeAvailable()) {
        const resolved = await ZeroTube.resolveChannel({ input: raw });
        const next = saveWhitelistedChannel({
          id: resolved.id,
          handle: resolved.handle,
          name: resolved.name,
          url: resolved.url,
          avatarUrl: resolved.avatarUrl,
        });
        setChannels(next);
        setChannelInput('');
        haptics.tick(900);
        setFeedback({
          type: 'success',
          text: `Whitelisted "${resolved.name}" (${resolved.handle || resolved.id})`,
        });
      } else {
        const id = extractYouTubeChannelId(raw);
        const handle = extractYouTubeChannelHandle(raw);
        if (!id && !handle) {
          haptics.thud();
          setFeedback({
            type: 'error',
            text: 'Enter a valid @handle, UC... channel ID, or YouTube channel URL.',
          });
          setIsResolving(false);
          return;
        }
        const next = saveWhitelistedChannel({
          id,
          handle,
          name: handle || id,
          url: id
            ? `https://www.youtube.com/channel/${id}`
            : `https://www.youtube.com/${handle}`,
        });
        setChannels(next);
        setChannelInput('');
        haptics.tick(900);
        setFeedback({
          type: 'success',
          text: `Whitelisted "${handle || id}"`,
        });
      }
    } catch (err) {
      haptics.thud();
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to resolve channel identity.',
      });
    } finally {
      setIsResolving(false);
    }
  };

  const handleRemove = (ch: WhitelistedChannel) => {
    haptics.thud();
    const next = removeWhitelistedChannel({
      id: ch.id,
      handle: ch.handle,
      name: ch.name,
    });
    setChannels(next);
  };

  return (
    <ObsidianCard
      ambientGlow={!isBespoke}
      className={isModernFont ? 'font-sans' : 'font-mono'}
      headerClassName={isModernFont ? 'p-5 space-y-4' : 'p-4 space-y-3.5'}
      footerClassName={
        isModernFont
          ? 'px-5 py-3 text-[11px] leading-relaxed flex items-center justify-between gap-2 flex-wrap'
          : 'px-4 py-2.5 text-[10px] leading-relaxed flex items-center justify-between gap-2 flex-wrap'
      }
      headerContent={
        <>
          {/* Header Row */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0 flex-1">
              <div
                className={
                  isFluentGlass
                    ? 'liquid-squircle shrink-0'
                    : `w-9 h-9 obsidian-icon-box flex items-center justify-center shrink-0 ${
                        isBespoke ? 'rounded-md' : 'rounded-xl'
                      }`
                }
                style={{ color: 'var(--accent-primary)' }}
              >
                <Play size={16} fill="currentColor" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <div
                  className="text-xs font-semibold tracking-wider flex items-center gap-1.5 flex-wrap"
                  style={{ color: 'var(--text-primary)' }}
                >
                  <span>ZeroTube // Study Channel Whitelist</span>
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-mono font-bold inline-flex items-center gap-1 shrink-0"
                    style={{
                      backgroundColor: 'var(--accent-soft)',
                      color: 'var(--accent-primary)',
                      border: '1px solid var(--accent-border)',
                    }}
                  >
                    <ShieldCheck size={10} />
                    Deterministic
                  </span>
                </div>
                <div
                  className="text-[11px] truncate mt-0.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Exact UC... ID &amp; @handle lock • Local ad-free stream playback
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                haptics.tick(600);
                onOpenZeroTubePlayer();
              }}
              className={`px-3 py-1.5 text-[11px] font-bold tracking-wider flex items-center gap-1.5 shrink-0 cursor-pointer transition-all ${
                isFluentGlass
                  ? 'liquid-pill-active rounded-full'
                  : `obsidian-pill-active ${isBespoke ? 'rounded-sm' : 'rounded-xl'} active:scale-95`
              }`}
              style={{
                backgroundColor: 'var(--accent-soft)',
                border: '1px solid var(--accent-border)',
                color: 'var(--accent-primary)',
              }}
            >
              <Video size={13} />
              <span>Open Player</span>
            </button>
          </div>

          {/* Official YouTube App Guard Card */}
          <OfficialYouTubeGuardCard />

          {/* Add Study Channel Form */}
          <div
            className="p-4 rounded-2xl space-y-3"
            style={{
              backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
              border: '1px solid var(--border-subtle)',
            }}
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <span
                className="text-xs font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Add Study Channel
              </span>
              <span
                className="text-[10px] font-mono"
                style={{ color: 'var(--text-muted)' }}
              >
                @handle • Channel URL • Sample Video URL
              </span>
            </div>

            <form onSubmit={handleAddChannel} className="flex gap-2 flex-wrap sm:flex-nowrap">
              <input
                type="text"
                value={channelInput}
                onChange={(e) => {
                  setChannelInput(e.target.value);
                  if (feedback) setFeedback(null);
                }}
                placeholder="e.g. @3Blue1Brown, channel URL, or lecture video URL..."
                className="flex-1 min-w-0 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                disabled={!channelInput.trim() || isResolving}
                className="px-4 py-2.5 rounded-xl font-bold text-xs tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-40 active:scale-95 shrink-0"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: 'var(--text-on-accent)',
                }}
              >
                {isResolving ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <Plus size={13} />
                )}
                <span>{isResolving ? 'Resolving...' : 'Whitelist'}</span>
              </button>
            </form>

            {feedback && (
              <div
                className="p-2.5 rounded-xl text-xs flex items-center gap-2 animate-fadeIn"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  border: `1px solid ${feedback.type === 'success' ? 'var(--status-success)' : 'var(--status-danger)'}`,
                  color:
                    feedback.type === 'success'
                      ? 'var(--status-success)'
                      : 'var(--status-danger)',
                }}
              >
                {feedback.type === 'success' ? (
                  <CheckCircle2 size={14} className="shrink-0" />
                ) : (
                  <AlertCircle size={14} className="shrink-0" />
                )}
                <span>{feedback.text}</span>
              </div>
            )}
          </div>

          {/* Whitelisted Channels List */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <span
                className="text-[11px] font-mono tracking-wider"
                style={{ color: 'var(--text-muted)' }}
              >
                WHITELISTED CHANNELS ({channels.length})
              </span>
            </div>

            {channels.length === 0 ? (
              <div
                className="p-4 rounded-xl text-center text-xs"
                style={{
                  backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                No study channels whitelisted yet. Add a channel above to unlock deterministic search and ad-free playback.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {channels.map((ch) => (
                  <div
                    key={getChannelKey(ch)}
                    className="p-3 rounded-xl flex items-start justify-between gap-2 transition-colors"
                    style={{
                      backgroundColor: 'var(--surface-tonal, var(--bg-surface))',
                      border: '1px solid var(--border-subtle)',
                    }}
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div
                        className="text-xs font-semibold truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {ch.name}
                      </div>
                      {ch.handle && (
                        <div
                          className="text-[10px] font-mono truncate"
                          style={{ color: 'var(--accent-primary)' }}
                        >
                          {ch.handle}
                        </div>
                      )}
                      {ch.id && (
                        <div
                          className="text-[9px] font-mono truncate"
                          style={{ color: 'var(--text-muted)' }}
                        >
                          {ch.id}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(ch)}
                      title="Remove from Whitelist"
                      aria-label={`Remove ${ch.name}`}
                      className="p-1.5 rounded-lg cursor-pointer shrink-0 transition-opacity hover:opacity-100 opacity-75"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--status-danger)',
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      }
      footerContent={
        <p style={{ color: 'var(--text-muted)' }}>
          ZeroTube permits full-length lectures (≥ 2 min) exclusively from your whitelisted channels — zero AI guesswork, zero Shorts, zero ads.
        </p>
      }
    />
  );
};
