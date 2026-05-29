'use client';

import { useState } from 'react';
import { RoomUser } from '@/lib/types';

interface RoomHeaderProps {
  roomCode: string;
  isHost: boolean;
  users: RoomUser[];
  currentVideoTitle: string | null;
  onLeave: () => void;
}

export default function RoomHeader({
  roomCode,
  isHost,
  users,
  currentVideoTitle,
  onLeave,
}: RoomHeaderProps) {
  const [copied, setCopied] = useState(false);

  const copyRoomCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textArea = document.createElement('textarea');
      textArea.value = roomCode;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex items-center justify-between gap-3 px-3 sm:px-4 py-2.5 border-b border-white/[0.06] bg-[#030712]/60 backdrop-blur-xl">
      {/* Left: Room code + badge */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={copyRoomCode}
          className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] transition-all group shrink-0"
          title="Copy room code"
        >
          <span className="text-[10px] font-semibold text-white/40 uppercase tracking-widest hidden sm:inline">Room</span>
          <span className="text-sm sm:text-base font-bold font-mono tracking-[0.2em] bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
            {roomCode}
          </span>
          {copied ? (
            <svg className="w-3.5 h-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          ) : (
            <svg className="w-3.5 h-3.5 text-white/30 group-hover:text-white/60 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          )}
        </button>

        {isHost && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 shrink-0">
            <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
            </svg>
            <span className="text-[10px] font-bold text-amber-400 uppercase">Host</span>
          </span>
        )}

        {/* Now playing — truncated */}
        {currentVideoTitle && (
          <div className="hidden md:flex items-center gap-2 min-w-0 flex-1 max-w-xs">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <p className="text-xs text-white/50 truncate">
              <span className="text-white/70">{currentVideoTitle}</span>
            </p>
          </div>
        )}
      </div>

      {/* Right: Users + Leave */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.08]">
          <svg className="w-3.5 h-3.5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          <span className="text-xs font-semibold text-white/60">{users.length}</span>
        </div>

        <button
          onClick={onLeave}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/8 border border-red-500/15 text-red-400 hover:bg-red-500/15 transition-all text-xs font-semibold"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
}
