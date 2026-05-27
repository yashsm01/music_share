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

// Extract YouTube video ID from various URL formats
function extractVideoId(input: string): string | null {
  // Direct video ID (11 chars)
  if (/^[a-zA-Z0-9_-]{11}$/.test(input.trim())) {
    return input.trim();
  }

  try {
    const url = new URL(input);

    // youtube.com/watch?v=ID
    if (url.hostname.includes('youtube.com')) {
      return url.searchParams.get('v');
    }

    // youtu.be/ID
    if (url.hostname === 'youtu.be') {
      return url.pathname.slice(1);
    }

    // youtube.com/embed/ID
    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/embed/')[1];
    }
  } catch {
    // Not a valid URL
  }

  return null;
}

export default function Queue({
  queue,
  isHost,
  currentUserId,
  onAddSong,
  onRemoveSong,
  onPlaySong,
}: QueueProps) {
  const [urlInput, setUrlInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAddSong = async () => {
    if (!urlInput.trim()) return;

    const videoId = extractVideoId(urlInput.trim());
    if (!videoId) {
      setError('Invalid YouTube URL or video ID');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetch video info via oEmbed API
      const res = await fetch(`/api/oembed?videoId=${videoId}`);
      const data = await res.json();

      if (data.error) {
        setError(data.error);
        setIsLoading(false);
        return;
      }

      onAddSong(
        videoId,
        data.title || `Video ${videoId}`,
        data.thumbnail || `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      );

      setUrlInput('');
    } catch {
      // Fallback: add with default info
      onAddSong(
        videoId,
        `YouTube Video`,
        `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      );
      setUrlInput('');
    }

    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddSong();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h2 className="text-sm font-semibold text-white/80 flex items-center gap-2">
          <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
          </svg>
          Queue
          {queue.length > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-violet-500/20 text-violet-400 text-xs">
              {queue.length}
            </span>
          )}
        </h2>
      </div>

      {/* Add song input */}
      <div className="px-4 py-3 border-b border-white/10">
        <div className="flex gap-2">
          <input
            type="text"
            value={urlInput}
            onChange={(e) => {
              setUrlInput(e.target.value);
              setError(null);
            }}
            onKeyDown={handleKeyDown}
            placeholder="Paste YouTube URL..."
            className="flex-1 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-sm text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
          <button
            onClick={handleAddSong}
            disabled={isLoading || !urlInput.trim()}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white text-sm font-medium hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30"
          >
            {isLoading ? (
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
            )}
          </button>
        </div>
        {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {queue.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-center px-4">
            <svg className="w-8 h-8 text-white/20 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
            </svg>
            <p className="text-sm text-white/30">Queue is empty</p>
            <p className="text-xs text-white/20 mt-1">Add songs to get the party started!</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {queue.map((item, index) => (
              <div
                key={item._id}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors group"
              >
                {/* Index */}
                <span className="text-xs font-mono text-white/30 w-5 text-right flex-shrink-0">
                  {index + 1}
                </span>

                {/* Thumbnail */}
                <div className="w-12 h-9 rounded-lg overflow-hidden flex-shrink-0 bg-white/5">
                  <img
                    src={item.thumbnail}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white/80 truncate">{item.title}</p>
                  <p className="text-xs text-white/40 truncate">Added by {item.addedBy.name}</p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 transition-opacity">
                  {isHost && (
                    <button
                      onClick={() => onPlaySong(item.videoId, item.title)}
                      className="p-1.5 rounded-lg hover:bg-violet-500/20 text-violet-400 transition-colors"
                      title="Play now"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </button>
                  )}

                  {(isHost || item.addedBy.userId === currentUserId) && (
                    <button
                      onClick={() => onRemoveSong(item._id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                      title="Remove"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
