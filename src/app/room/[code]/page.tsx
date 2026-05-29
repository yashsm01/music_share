'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import RoomHeader from '@/components/RoomHeader';
import Player from '@/components/Player';
import Queue from '@/components/Queue';
import Chat from '@/components/Chat';
import UserList from '@/components/UserList';
import { useRoom } from '@/hooks/useRoom';
import { usePlayer } from '@/hooks/usePlayer';
import KeepAlive from '@/components/KeepAlive';

type MobileTab = 'queue' | 'chat' | 'users';

const TAB_ICONS: Record<MobileTab, React.ReactNode> = {
  queue: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
    </svg>
  ),
  chat: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
  users: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
};

function generateAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const {
    room,
    userId,
    users,
    queue,
    messages,
    isHost,
    isLoading,
    error,
    syncEvent,
    joinRoom,
    leaveRoom,
    play,
    pause,
    seek,
    changeVideo,
    addToQueue,
    removeFromQueue,
    sendMessage,
    grantAdmin,
    clearSyncEvent,
    playbackMode,
    changePlaybackMode,
  } = useRoom();

  const [mobileTab, setMobileTab] = useState<MobileTab>('queue');
  const [hasJoined, setHasJoined] = useState(false);

  // Handle video end → auto-play next in queue
  const handleVideoEnd = useCallback(() => {
    if (!isHost || queue.length === 0) return;

    const nextSong = queue[0];
    changeVideo(nextSong.videoId, nextSong.title);
    removeFromQueue(nextSong._id);
  }, [isHost, queue, changeVideo, removeFromQueue]);

  const {
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
  } = usePlayer({
    isHost,
    onPlay: play,
    onPause: pause,
    onSeek: seek,
    onEnd: handleVideoEnd,
  });

  // Join room on mount
  useEffect(() => {
    if (hasJoined || !roomCode) return;

    const savedName = localStorage.getItem('synctunes_name');
    const savedUserId = localStorage.getItem('synctunes_userId');

    if (!savedName) {
      router.push('/');
      return;
    }

    if (savedUserId && room) {
      setHasJoined(true);
      return;
    }

    const avatar = generateAvatar(savedName);
    joinRoom(roomCode, savedName, avatar, savedUserId || undefined)
      .then(() => setHasJoined(true))
      .catch(() => {
        router.push('/');
      });
  }, [roomCode, hasJoined, joinRoom, router, room]);

  // Handle sync events from other users
  useEffect(() => {
    if (!syncEvent) return;

    switch (syncEvent.type) {
      case 'play':
        if (syncEvent.currentTime !== undefined) syncPlay(syncEvent.currentTime);
        break;
      case 'pause':
        if (syncEvent.currentTime !== undefined) syncPause(syncEvent.currentTime);
        break;
      case 'seek':
        if (syncEvent.currentTime !== undefined) syncSeek(syncEvent.currentTime);
        break;
      case 'video_change':
        if (syncEvent.videoId) syncVideoChange(syncEvent.videoId);
        break;
    }

    clearSyncEvent();
  }, [syncEvent, syncPlay, syncPause, syncSeek, syncVideoChange, clearSyncEvent]);

  // Sync to room state on initial join
  useEffect(() => {
    if (!room?.currentVideoId || !hasJoined) return;
    // Small delay to ensure audio element is mounted
    const t = setTimeout(() => {
      syncToRoomState(room.currentVideoId, room.currentTime, room.isPlaying);
    }, 300);
    return () => clearTimeout(t);
    // Only run once when we first join a room with a video
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasJoined]);

  const handleLeave = () => {
    leaveRoom();
    localStorage.removeItem('synctunes_userId');
    router.push('/');
  };

  const handlePlaySong = (videoId: string, title: string) => {
    if (isHost) changeVideo(videoId, title);
  };

  // ── Loading ──
  if (isLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-14 h-14 rounded-full border-[3px] border-cyan-500/20 border-t-cyan-500 animate-spin" />
          <p className="text-white/40 text-sm">Joining room…</p>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <div className="w-14 h-14 rounded-full bg-red-500/10 border border-red-500/15 flex items-center justify-center">
            <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white/60 text-base">Failed to join room</p>
          <p className="text-white/30 text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-2 px-5 py-2 rounded-xl bg-white/[0.06] border border-white/[0.1] text-white/60 hover:bg-white/[0.1] transition-all text-sm"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentUser = users.find((u) => u.userId === userId);
  const unreadChat = messages.filter((m) => m.type === 'user').length;

  return (
    <div className="min-h-screen flex flex-col">
      <KeepAlive isPlaying={room.isPlaying} videoTitle={room.currentVideoTitle || undefined} />

      <Navbar
        userName={currentUser?.name}
        userAvatar={currentUser?.avatar}
        onLogout={handleLeave}
      />

      {/* Content wrapper — starts below navbar */}
      <div className="pt-14 flex-1 flex flex-col" style={{ paddingTop: 'calc(3.5rem + var(--sat))' }}>
        <RoomHeader
          roomCode={room.roomCode}
          isHost={isHost}
          users={users}
          currentVideoTitle={room.currentVideoTitle}
          onLeave={handleLeave}
        />

        {/* ══ Desktop: side-by-side ══ */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Player area */}
          <div className="flex-1 p-3 sm:p-4 lg:p-5">
            <Player
              videoId={room.currentVideoId}
              videoTitle={room.currentVideoTitle || null}
              isHost={isHost}
              audioRef={audioRef}
              bindAudio={bindAudio}
              playerState={playerState}
              togglePlay={togglePlay}
              seekTo={seekTo}
              setVolume={setVolume}
              mode={playbackMode}
              toggleMode={changePlaybackMode}
            />

            {/* Now playing (mobile) */}
            {room.currentVideoTitle && (
              <div className="flex md:hidden items-center gap-2 mt-3 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <p className="text-xs text-white/50 truncate">{room.currentVideoTitle}</p>
              </div>
            )}
          </div>

          {/* ── Desktop sidebar ── */}
          <div className="hidden lg:flex lg:w-[340px] xl:w-[380px] border-l border-white/[0.06] flex-col">
            {/* Tabs */}
            <div className="flex border-b border-white/[0.06]">
              {(['queue', 'chat', 'users'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
                    mobileTab === tab
                      ? 'text-cyan-400'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {TAB_ICONS[tab]}
                  {tab}
                  {tab === 'chat' && unreadChat > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[9px] font-bold">
                      {unreadChat}
                    </span>
                  )}
                  {mobileTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500" />
                  )}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-hidden">
              {mobileTab === 'queue' && (
                <Queue
                  queue={queue}
                  isHost={isHost}
                  currentUserId={userId}
                  onAddSong={addToQueue}
                  onRemoveSong={removeFromQueue}
                  onPlaySong={handlePlaySong}
                />
              )}
              {mobileTab === 'chat' && (
                <Chat
                  messages={messages}
                  currentUserId={userId}
                  onSendMessage={sendMessage}
                />
              )}
              {mobileTab === 'users' && (
                <div className="p-3">
                  <UserList
                    users={users}
                    hostId={room.hostId}
                    coHostIds={room.coHostIds}
                    currentUserId={userId}
                    onGrantAdmin={grantAdmin}
                  />
                </div>
              )}
            </div>
          </div>

          {/* ── Mobile bottom panel ── */}
          <div className="lg:hidden flex flex-col border-t border-white/[0.06]">
            {/* Tab bar */}
            <div className="flex border-b border-white/[0.06] bg-[#030712]/80 backdrop-blur-xl">
              {(['queue', 'chat', 'users'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-semibold uppercase tracking-wider transition-colors relative ${
                    mobileTab === tab
                      ? 'text-cyan-400'
                      : 'text-white/30 hover:text-white/50'
                  }`}
                >
                  {TAB_ICONS[tab]}
                  {tab}
                  {tab === 'chat' && unreadChat > 0 && (
                    <span className="ml-0.5 px-1.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-400 text-[9px] font-bold">
                      {unreadChat}
                    </span>
                  )}
                  {mobileTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-500 to-violet-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content — fill remaining space */}
            <div className="h-72 sm:h-80" style={{ paddingBottom: 'var(--sab)' }}>
              {mobileTab === 'queue' && (
                <Queue
                  queue={queue}
                  isHost={isHost}
                  currentUserId={userId}
                  onAddSong={addToQueue}
                  onRemoveSong={removeFromQueue}
                  onPlaySong={handlePlaySong}
                />
              )}
              {mobileTab === 'chat' && (
                <Chat
                  messages={messages}
                  currentUserId={userId}
                  onSendMessage={sendMessage}
                />
              )}
              {mobileTab === 'users' && (
                <div className="p-3 overflow-y-auto h-full custom-scrollbar">
                  <UserList
                    users={users}
                    hostId={room.hostId}
                    coHostIds={room.coHostIds}
                    currentUserId={userId}
                    onGrantAdmin={grantAdmin}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
