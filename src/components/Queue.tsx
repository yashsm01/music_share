'use client';

import { useState } from 'react';
import { IQueueItem } from '@/lib/types';

interface QueueProps {
  queue: IQueueItem[];
  isHost: boolean;
  currentUserId: string | null;
  onAddSong: (videoId: string, title: string, thumbnail: string) => void;
  onRemoveSong: (queueItemId: string) => void;
  onPlaySong: (videoId: string, title: string) => void;
}

function extractVideoId(input: string): string | null {
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) return input.trim();
  try {
    const url = new URL(input);
    if (url.hostname.includes('youtube.com')) return url.searchParams.get('v');
    if (url.hostname === 'youtu.be') return url.pathname.slice(1);
    if (url.pathname.startsWith('/embed/')) return url.pathname.split('/embed/')[1];
  } catch { /* not a URL */ }
  return null;
}

export default function Queue({ queue, isHost, currentUserId, onAddSong, onRemoveSong, onPlaySong }: QueueProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSong = async () => {
    if (!urlInput.trim()) return;
    const videoId = extractVideoId(urlInput.trim());
    if (!videoId) { setError('Invalid YouTube URL'); return; }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/oembed?videoId=${videoId}`);
      const data = await res.json();
      if (data.error) { setError(data.error); setIsLoading(false); return; }
      onAddSong(videoId, data.title || `Video ${videoId}`, data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      setUrlInput('');
    } catch {
      onAddSong(videoId, 'YouTube Video', `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`);
      setUrlInput('');
    }
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 border-b border-white/[0.06]">
        <h2 className="text-xs font-semibold text-white/60 flex items-center gap-1.5 uppercase tracking-wider">
          <svg className="w-3.5 h-3.5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Queue
          {queue.length > 0 && (
            <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-bold">
              {queue.length}
            </span>
          )}
        </h2>
      </div>

      {/* Input */}
      <div className="px-3 sm:px-4 py-2.5 border-b border-white/[0.06]">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => { setUrlInput(e.target.value); setError(null); }}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSong()}
            placeholder="Paste YouTube URL…"
            className="flex-1 px-3 py-2 rounded-lg bg-white/[0.04] border border-white/[0.08] text-sm text-white placeholder-white/25 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/15 transition-all"
          />
          <button
            onClick={handleAddSong}
            disabled={isLoading || !urlInput.trim()}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white text-sm font-semibold hover:from-cyan-600 hover:to-violet-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-cyan-500/15"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="text-[11px] text-red-400 mt-1.5 px-0.5">{error}</p>}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-28 text-center px-4">
            <svg className="w-7 h-7 text-white/15 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-xs text-white/25">Queue is empty</p>
            <p className="text-[10px] text-white/15 mt-0.5">Add songs to start the party!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {queue.map((item, index) => (
              <div key={item._id} className="flex items-center gap-2.5 px-3 sm:px-4 py-2.5 hover:bg-white/[0.03] transition-colors group">
                <span className="text-[10px] font-mono text-white/20 w-4 text-right shrink-0">{index + 1}</span>

                <div className="w-10 h-7 rounded-md overflow-hidden shrink-0 bg-white/[0.04]">
                  <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-white/75 truncate leading-tight">{item.title}</p>
                  <p className="text-[10px] text-white/30 truncate">by {item.addedBy.name}</p>
                </div>

                <div className="flex items-center gap-0.5">
                  {isHost && (
                    <button
                      onClick={() => onPlaySong(item.videoId, item.title)}
                      className="p-1.5 rounded-md hover:bg-cyan-500/15 text-cyan-400 transition-colors"
                      title="Play now"
                    >
                      <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    </button>
                  )}
                  {(isHost || item.addedBy.userId === currentUserId) && (
                    <button
                      onClick={() => onRemoveSong(item._id)}
                      className="p-1.5 rounded-md hover:bg-red-500/15 text-red-400/70 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
