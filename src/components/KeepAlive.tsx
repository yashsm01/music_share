'use client';

import { useEffect, useRef, useCallback } from 'react';

interface KeepAliveProps {
  isPlaying: boolean;
  videoTitle?: string;
}

/**
 * KeepAlive — Simplified for audio-first player
 *
 * Since we now have a real <audio> element playing music (not just a YouTube iframe),
 * the browser/OS already treats us as an active media app. We just need:
 * 1. Screen Wake Lock (prevents auto-lock while screen is on)
 * 2. Visibility change handler (re-acquire wake lock after tab switch)
 *
 * The <audio> element + MediaSession (in Player.tsx) handle lock screen controls.
 */
export default function KeepAlive({ isPlaying }: KeepAliveProps) {
  const wakeLockRef = useRef<any>(null);

  const requestWakeLock = useCallback(async () => {
    try {
      if ('wakeLock' in navigator && isPlaying) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch { /* may fail if tab hidden — OK */ }
  }, [isPlaying]);

  const releaseWakeLock = useCallback(async () => {
    try {
      await wakeLockRef.current?.release();
      wakeLockRef.current = null;
    } catch { /* swallow */ }
  }, []);

  useEffect(() => {
    if (isPlaying) {
      requestWakeLock();
    } else {
      releaseWakeLock();
    }
    return () => { releaseWakeLock(); };
  }, [isPlaying, requestWakeLock, releaseWakeLock]);

  // Re-acquire wake lock when returning to tab
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible' && isPlaying) {
        requestWakeLock();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isPlaying, requestWakeLock]);

  return null;
}
