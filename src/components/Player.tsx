'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';

const YouTube = dynamic(() => import('react-youtube'), { ssr: false });

interface PlayerProps {
  videoId: string | null;
  isHost: boolean;
  audioRef: React.RefObject<HTMLAudioElement | null>;
  bindAudio: (audio: HTMLAudioElement | null) => void;
  playerState: {
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    isLoading: boolean;
    error: string | null;
  };
  togglePlay: () => void;
  seekTo: (time: number) => void;
  setVolume: (vol: number) => void;
  // YouTube iframe sync (for video mode)
  onVideoReady?: (player: any) => void;
  onVideoStateChange?: (event: any) => void;
  mode: 'audio' | 'video';
  toggleMode: (mode: 'audio' | 'video') => void;
}

interface VideoInfo {
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
}

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Player({
  videoId,
  isHost,
  audioRef,
  bindAudio,
  playerState,
  togglePlay,
  seekTo,
  setVolume,
  mode,
  toggleMode,
}: PlayerProps) {
  const progressRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [volume, setVolumeState] = useState(0.8);
  const [showVolume, setShowVolume] = useState(false);

  // Fetch video info when videoId changes
  useEffect(() => {
    if (!videoId) { setVideoInfo(null); return; }
    fetch(`/api/info/${videoId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.error) setVideoInfo(data);
      })
      .catch(() => {});
  }, [videoId]);

  // ── Sync YouTube iframe to audio state ──
  // Mirror play/pause/seek from audio to video iframe
  useEffect(() => {
    const yt = ytPlayerRef.current;
    if (!yt || mode !== 'video') return;

    try {
      if (playerState.isPlaying) {
        const ytState = yt.getPlayerState?.();
        // 1 = playing, 2 = paused, 3 = buffering
        if (ytState !== 1 && ytState !== 3) {
          yt.playVideo?.();
        }
      } else {
        const ytState = yt.getPlayerState?.();
        if (ytState === 1 || ytState === 3) {
          yt.pauseVideo?.();
        }
      }
    } catch { /* iframe not ready */ }
  }, [playerState.isPlaying, mode]);

  // Sync seek to YouTube iframe
  useEffect(() => {
    const yt = ytPlayerRef.current;
    if (!yt || mode !== 'video') return;

    try {
      const ytTime = yt.getCurrentTime?.() || 0;
      // Only sync if difference > 2 seconds (avoid jitter)
      if (Math.abs(ytTime - playerState.currentTime) > 2) {
        yt.seekTo?.(playerState.currentTime, true);
      }
    } catch { /* iframe not ready */ }
  }, [playerState.currentTime, mode]);

  // YouTube event handlers
  const handleYTReady = useCallback((event: any) => {
    ytPlayerRef.current = event.target;
    if (mode === 'video') {
      event.target.unMute?.();
      event.target.setVolume?.(volume * 100);
    } else {
      event.target.mute?.();
    }
    // Sync initial state
    if (playerState.isPlaying) {
      event.target.playVideo?.();
    }
  }, [playerState.isPlaying, mode, volume]);

  const handleYTStateChange = useCallback((event: any) => {
    // Don't let the iframe drive playback — it's just visual
    // If host interacts with iframe controls directly, we ignore it
  }, []);

  // MediaSession — lock screen controls
  useEffect(() => {
    if (!('mediaSession' in navigator) || !videoInfo) return;

    navigator.mediaSession.metadata = new MediaMetadata({
      title: videoInfo.title,
      artist: videoInfo.author,
      album: 'SyncTunes',
      artwork: [
        { src: videoInfo.thumbnail, sizes: '512x512', type: 'image/jpeg' },
      ],
    });

    if (isHost) {
      navigator.mediaSession.setActionHandler('play', () => togglePlay());
      navigator.mediaSession.setActionHandler('pause', () => togglePlay());
      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (details.seekTime !== undefined) seekTo(details.seekTime);
      });
    } else {
      navigator.mediaSession.setActionHandler('play', null);
      navigator.mediaSession.setActionHandler('pause', null);
    }

    return () => {
      try {
        navigator.mediaSession.setActionHandler('play', null);
        navigator.mediaSession.setActionHandler('pause', null);
        navigator.mediaSession.setActionHandler('seekto', null);
      } catch { /* */ }
    };
  }, [videoInfo, isHost, togglePlay, seekTo]);

  // Update MediaSession position state
  useEffect(() => {
    if (!('mediaSession' in navigator) || !playerState.duration) return;
    try {
      navigator.mediaSession.setPositionState({
        duration: playerState.duration,
        playbackRate: 1,
        position: Math.min(playerState.currentTime, playerState.duration),
      });
    } catch { /* */ }
  }, [playerState.currentTime, playerState.duration]);

  // Handle seek from progress bar
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!isHost || !playerState.duration) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const fraction = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      seekTo(fraction * playerState.duration);
    },
    [isHost, playerState.duration, seekTo]
  );

  const handleVolumeChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = parseFloat(e.target.value);
      setVolumeState(v);
      setVolume(v);
      if (mode === 'video' && ytPlayerRef.current) {
        ytPlayerRef.current.setVolume?.(v * 100);
      }
    },
    [setVolume, mode]
  );

  const progress = playerState.duration > 0
    ? (playerState.currentTime / playerState.duration) * 100
    : 0;

  // YouTube iframe opts — controls disabled for everyone (audio element drives playback)
  const ytOpts = {
    width: '100%',
    height: '100%',
    playerVars: {
      autoplay: 1,
      controls: 0,
      disablekb: 1,
      modestbranding: 1,
      rel: 0,
      fs: 1,
      playsinline: 1,
    },
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Hidden audio element — always present for background playback, muted in video mode */}
      <audio
        ref={(el) => bindAudio(el)}
        preload="auto"
        playsInline
        crossOrigin="anonymous"
        muted={mode === 'video'}
      />

      {/* Mode toggle */}
      {videoId && (
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5 bg-white/[0.04] rounded-lg p-0.5 border border-white/[0.06]">
            <button
              onClick={() => toggleMode('audio')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === 'audio'
                  ? 'bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-lg shadow-cyan-500/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
              <span>Audio</span>
            </button>
            <button
              onClick={() => toggleMode('video')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                mode === 'video'
                  ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg shadow-pink-500/20'
                  : 'text-white/40 hover:text-white/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              Video
            </button>
          </div>

          {mode === 'audio' && (
            <span className="text-[10px] text-emerald-400/60 flex items-center gap-1">
              <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
              Lock screen ready
            </span>
          )}
        </div>
      )}

      {/* Visual area */}
      <div
        className="relative w-full rounded-xl sm:rounded-2xl overflow-hidden border border-white/[0.06] bg-black/60 shadow-2xl shadow-cyan-500/[0.06]"
        style={{ aspectRatio: '16/9' }}
      >
        {videoId ? (
          <>
            {/* ── VIDEO MODE ── */}
            {mode === 'video' && (
              <div className="absolute inset-0">
                <YouTube
                  videoId={videoId}
                  opts={ytOpts}
                  className="w-full h-full"
                  iframeClassName="w-full h-full"
                  onReady={handleYTReady}
                  onStateChange={handleYTStateChange}
                />
              </div>
            )}

            {/* ── AUDIO MODE ── */}
            {mode === 'audio' && videoInfo && (
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <div className="relative w-full h-full">
                  <img
                    src={videoInfo.thumbnail}
                    alt={videoInfo.title}
                    className="w-full h-full object-cover opacity-40 blur-sm"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />

                  {/* Center content */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6">
                    <div className={`w-20 h-20 sm:w-28 sm:h-28 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl shadow-cyan-500/20 relative ${playerState.isPlaying ? 'animate-vinyl' : ''}`}>
                      <img src={videoInfo.thumbnail} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-[#030712] border-2 border-white/10" />
                      </div>
                    </div>
                    <div className="text-center max-w-xs">
                      <p className="text-sm sm:text-base font-semibold text-white truncate">{videoInfo.title}</p>
                      <p className="text-xs text-white/40 mt-0.5">{videoInfo.author}</p>
                    </div>
                  </div>
                </div>

                {playerState.isLoading && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <div className="w-10 h-10 rounded-full border-3 border-cyan-500/20 border-t-cyan-500 animate-spin" />
                  </div>
                )}
              </div>
            )}

            {/* Loading for audio mode when no info yet */}
            {mode === 'audio' && !videoInfo && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full border-3 border-cyan-500/20 border-t-cyan-500 animate-spin" />
              </div>
            )}
          </>
        ) : (
          /* Empty state */
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-cyan-500/15 to-violet-500/15 border border-white/[0.08] flex items-center justify-center">
                <svg className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-400/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 opacity-15 blur-xl animate-pulse" />
            </div>
            <div className="text-center px-4">
              <p className="text-sm sm:text-base font-semibold text-white/60">No song playing</p>
              <p className="text-xs sm:text-sm text-white/30 mt-1">
                {isHost ? 'Add a song from the queue' : 'Waiting for the host…'}
              </p>
            </div>
          </div>
        )}

        {/* Non-host badge */}
        {videoId && !isHost && (
          <div className="absolute top-2 right-2 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-sm border border-white/[0.08]">
            <span className="text-[10px] text-white/50">🔒 Host controls</span>
          </div>
        )}
      </div>

      {/* ── Controls bar (visible in both modes) ── */}
      {videoId && (
        <div className="flex flex-col gap-2 px-1">
          {/* Progress bar */}
          <div
            ref={progressRef}
            className={`relative h-1.5 rounded-full bg-white/[0.08] overflow-hidden ${isHost ? 'cursor-pointer' : 'cursor-default'}`}
            onClick={handleProgressClick}
          >
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-500 to-violet-500 rounded-full transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
            {isHost && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-lg shadow-cyan-500/30 transition-[left] duration-200"
                style={{ left: `calc(${progress}% - 6px)` }}
              />
            )}
          </div>

          {/* Time + buttons */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono text-white/30 w-20">
              {formatTime(playerState.currentTime)} / {formatTime(playerState.duration)}
            </span>

            <div className="flex items-center gap-2">
              {isHost && (
                <button
                  onClick={togglePlay}
                  className="w-10 h-10 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40 transition-all hover:scale-105 active:scale-95"
                >
                  {playerState.isPlaying ? (
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>
              )}
              {!isHost && (
                <div className="flex items-center gap-1.5 text-white/40">
                  {playerState.isPlaying ? (
                    <div className="flex items-end gap-[2px] h-4">
                      {[...Array(4)].map((_, i) => (
                        <div
                          key={i}
                          className="w-[3px] bg-gradient-to-t from-cyan-500 to-violet-500 rounded-full animate-equalizer"
                          style={{ animationDelay: `${i * 0.15}s`, height: '3px' }}
                        />
                      ))}
                    </div>
                  ) : (
                    <span className="text-xs">Paused</span>
                  )}
                </div>
              )}
            </div>

            {/* Volume */}
            <div className="relative w-20 flex justify-end">
              <button
                onClick={() => setShowVolume(!showVolume)}
                className="p-1 rounded-md text-white/30 hover:text-white/60 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  {volume === 0 ? (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072M12 6.253v11.494m0-11.494l-4.293 4.293A1 1 0 017 10.586H4a1 1 0 00-1 1v.828a1 1 0 001 1h3a1 1 0 01.707.293L12 17.747" />
                  )}
                </svg>
              </button>
              {showVolume && (
                <div className="absolute bottom-full right-0 mb-2 p-2 rounded-lg glass-strong">
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 accent-cyan-500"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {playerState.error && (
        <div className="text-center text-xs text-red-400/70 py-1">{playerState.error}</div>
      )}
    </div>
  );
}
