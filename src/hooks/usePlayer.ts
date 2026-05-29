'use client';

import { useRef, useCallback, useEffect, useState } from 'react';

interface UsePlayerOptions {
  isHost: boolean;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
  onSeek?: (currentTime: number) => void;
  onEnd?: () => void;
}

interface PlayerState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  isLoading: boolean;
  error: string | null;
}

export function usePlayer(options: UsePlayerOptions) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimeRef = useRef<number>(0);

  const [playerState, setPlayerState] = useState<PlayerState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    isLoading: false,
    error: null,
  });

  // ── Sync guard: suppress own events during programmatic changes ──
  const startSyncGuard = useCallback(() => {
    isSyncingRef.current = true;
    if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    syncTimeoutRef.current = setTimeout(() => {
      isSyncingRef.current = false;
    }, 1000);
  }, []);

  // ── Bind audio element ──
  const bindAudio = useCallback((audio: HTMLAudioElement | null) => {
    audioRef.current = audio;
  }, []);

  // ── Host-initiated actions (emitted to server) ──

  const handlePlay = useCallback(() => {
    if (isSyncingRef.current || !options.isHost) return;
    const audio = audioRef.current;
    if (!audio) return;
    options.onPlay?.(audio.currentTime);
  }, [options]);

  const handlePause = useCallback(() => {
    if (isSyncingRef.current || !options.isHost) return;
    const audio = audioRef.current;
    if (!audio) return;
    options.onPause?.(audio.currentTime);
  }, [options]);

  const handleSeeked = useCallback(() => {
    if (isSyncingRef.current || !options.isHost) return;
    const audio = audioRef.current;
    if (!audio) return;

    const now = Date.now();
    if (now - lastSeekTimeRef.current < 500) return;
    lastSeekTimeRef.current = now;

    options.onSeek?.(audio.currentTime);
  }, [options]);

  const handleEnded = useCallback(() => {
    options.onEnd?.();
  }, [options]);

  const handleTimeUpdate = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayerState((prev) => ({
      ...prev,
      currentTime: audio.currentTime,
      duration: audio.duration || 0,
    }));
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlayerState((prev) => ({
      ...prev,
      duration: audio.duration || 0,
      isLoading: false,
    }));
  }, []);

  const handleWaiting = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isLoading: true }));
  }, []);

  const handleCanPlay = useCallback(() => {
    setPlayerState((prev) => ({ ...prev, isLoading: false }));
  }, []);

  const handleError = useCallback(() => {
    setPlayerState((prev) => ({
      ...prev,
      isLoading: false,
      error: 'Failed to load audio',
    }));
  }, []);

  // ── Attach event listeners to audio element ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('seeked', handleSeeked);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('waiting', handleWaiting);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('seeked', handleSeeked);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('waiting', handleWaiting);
      audio.removeEventListener('canplay', handleCanPlay);
      audio.removeEventListener('error', handleError);
    };
  }, [handlePlay, handlePause, handleSeeked, handleEnded, handleTimeUpdate, handleLoadedMetadata, handleWaiting, handleCanPlay, handleError]);

  // ── Sync methods: called when receiving events from other users ──

  const syncPlay = useCallback((currentTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    startSyncGuard();
    audio.currentTime = currentTime;
    audio.play().catch(() => {});
    setPlayerState((prev) => ({ ...prev, isPlaying: true }));
  }, [startSyncGuard]);

  const syncPause = useCallback((currentTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    startSyncGuard();
    audio.currentTime = currentTime;
    audio.pause();
    setPlayerState((prev) => ({ ...prev, isPlaying: false }));
  }, [startSyncGuard]);

  const syncSeek = useCallback((currentTime: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    const now = Date.now();
    if (now - lastSeekTimeRef.current < 500) return;
    lastSeekTimeRef.current = now;
    startSyncGuard();
    audio.currentTime = currentTime;
  }, [startSyncGuard]);

  const syncVideoChange = useCallback((videoId: string) => {
    const audio = audioRef.current;
    if (!audio) return;
    startSyncGuard();
    audio.src = `/api/stream/${videoId}`;
    audio.load();
    audio.play().catch(() => {});
    setPlayerState({
      isPlaying: true,
      currentTime: 0,
      duration: 0,
      isLoading: true,
      error: null,
    });
  }, [startSyncGuard]);

  const syncToRoomState = useCallback(
    (videoId: string | null, currentTime: number, isPlaying: boolean) => {
      const audio = audioRef.current;
      if (!audio || !videoId) return;
      startSyncGuard();
      audio.src = `/api/stream/${videoId}`;
      audio.load();

      const onCanPlay = () => {
        audio.currentTime = currentTime;
        if (isPlaying) {
          audio.play().catch(() => {});
        }
        audio.removeEventListener('canplay', onCanPlay);
      };
      audio.addEventListener('canplay', onCanPlay);

      setPlayerState({
        isPlaying,
        currentTime,
        duration: 0,
        isLoading: true,
        error: null,
      });
    },
    [startSyncGuard]
  );

  // ── Direct controls (for host UI buttons) ──

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      audio.play().catch(() => {});
      setPlayerState((prev) => ({ ...prev, isPlaying: true }));
    } else {
      audio.pause();
      setPlayerState((prev) => ({ ...prev, isPlaying: false }));
    }
  }, []);

  const seekTo = useCallback((time: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = time;
  }, []);

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, vol));
  }, []);

  // ── Cleanup ──
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, []);

  return {
    audioRef,
    bindAudio,
    playerState,
    syncPlay,
    syncPause,
    syncSeek,
    syncVideoChange,
    syncToRoomState,
    togglePlay,
    seekTo,
    setVolume,
  };
}
