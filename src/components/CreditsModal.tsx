import { useState, useEffect } from 'react';
import type { GithubContributor } from '../types';
import { haptics } from '../utils/haptics';
import { X, ExternalLink, Heart, Award, Code, Users } from 'lucide-react';

interface CreditsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY_CONTRIBUTORS = 'zero_cached_contributors_v1';

const FALLBACK_CONTRIBUTORS: GithubContributor[] = [
  {
    login: 'MDYOUSUF20007-oss',
    avatar_url: 'https://github.com/MDYOUSUF20007-oss.png',
    html_url: 'https://github.com/MDYOUSUF20007-oss',
    contributions: 180,
    role: 'Creator & Lead Architect',
  },
];

export function CreditsModal({ isOpen, onClose }: CreditsModalProps) {
  const [contributors, setContributors] = useState<GithubContributor[]>(() => {
    if (typeof localStorage === 'undefined') return FALLBACK_CONTRIBUTORS;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_CONTRIBUTORS);
      if (saved) return JSON.parse(saved);
    } catch {}
    return FALLBACK_CONTRIBUTORS;
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchContributors = async () => {
      setLoading(true);
      try {
        const res = await fetch('https://api.github.com/repos/MDYOUSUF20007-oss/ZERO/contributors', {
          headers: { Accept: 'application/vnd.github.v3+json' },
        });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0 && isMounted) {
            const mapped: GithubContributor[] = data.map((item: any) => ({
              login: item.login,
              avatar_url: item.avatar_url,
              html_url: item.html_url,
              contributions: item.contributions || 1,
              role: item.login === 'MDYOUSUF20007-oss' ? 'Creator & Lead Architect' : 'Open Source Contributor',
            }));
            setContributors(mapped);
            localStorage.setItem(STORAGE_KEY_CONTRIBUTORS, JSON.stringify(mapped));
          }
        }
      } catch {
        // Fallback is already loaded
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchContributors();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

      <div className="relative max-w-lg w-full bg-zinc-950 border border-zinc-700 rounded-2xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/30">
              <Award size={20} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white tracking-tight">Credits & Contributors</h2>
              <p className="text-xs text-zinc-400">The minds behind Zero-Distractions</p>
            </div>
          </div>
          <button
            onClick={() => {
              haptics.tick(900);
              onClose();
            }}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Lead Developer Spotlight Card */}
        <div className="p-4 rounded-xl border border-blue-500/40 bg-blue-950/20 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-blue-400 font-bold px-2 py-0.5 rounded bg-blue-500/20 border border-blue-500/30">
              Lead Developer & Architect
            </span>
            <span className="text-[10px] font-mono text-zinc-400">v1.0.0 FOSS</span>
          </div>

          <div className="flex items-center gap-3.5 pt-1">
            <img
              src="https://github.com/MDYOUSUF20007-oss.png"
              alt="Mohammed Yusuf"
              className="w-14 h-14 rounded-full border-2 border-blue-400 shadow-md bg-zinc-900 object-cover"
              onError={(e) => {
                // If avatar fails to load offline, use fallback initials
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div>
              <h3 className="text-base font-bold text-white">Mohammed Yusuf</h3>
              <p className="text-xs font-mono text-zinc-400">@MDYOUSUF20007-oss</p>
              <p className="text-xs text-zinc-300 mt-1 leading-snug">
                Designed & developed Zero as an uncompromising, offline-first digital detox tool with zero ads and zero subscriptions.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2 border-t border-blue-900/40">
            <a
              href="https://github.com/MDYOUSUF20007-oss"
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-1.5 px-3 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-mono text-zinc-200 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Code size={13} /> GitHub Profile
            </a>
            <a
              href="https://ko-fi.com/mdyousuf2620"
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-1.5 px-3 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-xs font-mono text-amber-300 flex items-center justify-center gap-1.5 transition-colors"
            >
              <Heart size={13} /> Ko-fi Tip
            </a>
          </div>
        </div>

        {/* Contributors Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="font-mono uppercase tracking-wider flex items-center gap-1.5 text-zinc-300 font-semibold">
              <Users size={14} /> Open-Source Contributors
            </span>
            {loading && <span className="font-mono text-[10px] text-blue-400 animate-pulse">Syncing...</span>}
          </div>

          <div className="space-y-2">
            {contributors.map((c) => (
              <a
                key={c.login}
                href={c.html_url}
                target="_blank"
                rel="noreferrer"
                className="p-3 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900/50 flex items-center justify-between text-xs transition-colors group"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={c.avatar_url}
                    alt={c.login}
                    className="w-9 h-9 rounded-full border border-zinc-700 bg-zinc-800 object-cover"
                  />
                  <div>
                    <div className="font-bold text-white group-hover:text-blue-400 transition-colors flex items-center gap-1.5">
                      {c.login}
                      <ExternalLink size={11} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <div className="text-[11px] text-zinc-400">{c.role || 'Contributor'}</div>
                  </div>
                </div>

                <div className="text-right">
                  <span className="font-mono text-[11px] text-zinc-300 bg-zinc-800 px-2 py-0.5 rounded-full border border-zinc-700">
                    {c.contributions} {c.contributions === 1 ? 'commit' : 'commits'}
                  </span>
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* FOSS Philosophy Guarantee */}
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/30 text-xs text-zinc-400 space-y-1">
          <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
            <Code size={13} className="text-emerald-400" /> Free & Open-Source
          </div>
          <p className="leading-relaxed text-[11px]">
            Zero is licensed under permissive open-source principles. Pull requests, translations, and architectural improvements from the global community are warmly welcomed.
          </p>
        </div>
      </div>
    </div>
  );
}
