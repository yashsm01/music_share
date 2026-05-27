'use client';

import { useEffect, useRef } from 'react';
import dynamic from 'next/dynamic';
import type { YouTubeProps } from 'react-youtube';

// Dynamically import react-youtube to avoid SSR issues
const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

interface PlayerProps {
  videoId: string | null;
  isHost: boolean;
  onReady: YouTubeProps['onReady'];
  onStateChange: YouTubeProps['onStateChange'];
}

export default function Player({ videoId, isHost, onReady, onStateChange }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const opts: YouTubeProps['opts'] = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: isHost ? 1 : 0,
      disablekb: isHost ? 0 : 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
    },
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Player container */}
      <div
        ref={containerRef}
        className="relative w-full rounded-2xl overflow-hidden border border-white/10 bg-black/50 shadow-2xl shadow-violet-500/10"
        style={{ aspectRatio: '16/9' }}
      >
        {videoId ? (
          <div className="absolute inset-0">
            <YouTube
              videoId={videoId}
              opts={opts}
              onReady={onReady}
              onStateChange={onStateChange}
              className="w-full h-full"
              iframeClassName="w-full h-full"
            />
          </div>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            {/* Animated music icon */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-violet-500/20 to-pink-500/20 border border-white/10 flex items-center justify-center">
                <svg className="w-10 h-10 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-violet-500 to-pink-500 opacity-20 blur-xl animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white/70">No song playing</p>
              <p className="text-sm text-white/40 mt-1">
                {isHost
                  ? 'Add a song from the queue to get started'
                  : 'Waiting for the host to play a song...'}
              </p>
            </div>
          </div>
        )}

        {/* Non-host overlay indicator */}
        {videoId && !isHost && (
          <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
            <span className="text-xs text-white/60">
              🔒 Host controls playback
            </span>
          </div>
        )}
      </div>

      {/* Equalizer animation */}
      {videoId && (
        <div className="flex items-end justify-center gap-1 h-6">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="w-1 bg-gradient-to-t from-violet-500 to-pink-500 rounded-full animate-equalizer"
              style={{
                animationDelay: `${i * 0.15}s`,
                height: '4px',
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
