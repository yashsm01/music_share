'use client';

import { useRef, useCallback, useEffect } from 'react';
import type { YouTubePlayer } from 'react-youtube';

interface UsePlayerOptions {
  isHost: boolean;
  onPlay?: (currentTime: number) => void;
  onPause?: (currentTime: number) => void;
  onSeek?: (currentTime: number) => void;
  onEnd?: () => void;
}

export function usePlayer(options: UsePlayerOptions) {
  const playerRef = useRef<YouTubePlayer | null>(null);
  const isSyncingRef = useRef(false);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSeekTimeRef = useRef<number>(0);

  // Suppress own state changes during sync
  const startSyncGuard = useCallback(() => {
    isSyncingRef.current = true;
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }
    syncTimeoutRef.current = setTimeout(() => {
      isSyncingRef.current = false;
    }, 1000);
  }, []);

  const onReady = useCallback((event: { target: YouTubePlayer }) => {
    playerRef.current = event.target;
  }, []);

  const onStateChange = useCallback(
    (event: { data: number; target: YouTubePlayer }) => {
      // Ignore events triggered by our own sync
      if (isSyncingRef.current) return;

      // Only host emits control events
      if (!options.isHost) return;

      const player = event.target;
      const currentTime = player.getCurrentTime();

      switch (event.data) {
        case 1: // Playing
          options.onPlay?.(currentTime);
          break;
        case 2: // Paused
          options.onPause?.(currentTime);
          break;
        case 0: // Ended
          options.onEnd?.();
          break;
      }
    },
    [options]
  );

  // Sync methods called when receiving events from other users
  const syncPlay = useCallback(
    (currentTime: number) => {
      const player = playerRef.current;
      if (!player) return;

      startSyncGuard();
      player.seekTo(currentTime, true);
      player.playVideo();
    },
    [startSyncGuard]
  );

  const syncPause = useCallback(
    (currentTime: number) => {
      const player = playerRef.current;
      if (!player) return;

      startSyncGuard();
      player.seekTo(currentTime, true);
      player.pauseVideo();
    },
    [startSyncGuard]
  );

  const syncSeek = useCallback(
    (currentTime: number) => {
      const player = playerRef.current;
      if (!player) return;

      // Debounce rapid seeks
      const now = Date.now();
      if (now - lastSeekTimeRef.current < 500) return;
      lastSeekTimeRef.current = now;

      startSyncGuard();
      player.seekTo(currentTime, true);
    },
    [startSyncGuard]
  );

  const syncVideoChange = useCallback(
    (videoId: string) => {
      const player = playerRef.current;
      if (!player) return;

      startSyncGuard();
      player.loadVideoById(videoId);
    },
    [startSyncGuard]
  );

  // Sync on initial join
  const syncToRoomState = useCallback(
    (videoId: string | null, currentTime: number, isPlaying: boolean) => {
      const player = playerRef.current;
      if (!player || !videoId) return;

      startSyncGuard();
      player.loadVideoById(videoId, currentTime);
      if (!isPlaying) {
        // Small delay to let the video load before pausing
        setTimeout(() => {
          player.pauseVideo();
        }, 500);
      }
    },
    [startSyncGuard]
  );

  // Cleanup
  useEffect(() => {
    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  return {
    playerRef,
    onReady,
    onStateChange,
    syncPlay,
    syncPause,
    syncSeek,
    syncVideoChange,
    syncToRoomState,
  };
}
