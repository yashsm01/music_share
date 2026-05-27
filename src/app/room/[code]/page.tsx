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
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/types';

type MobileTab = 'queue' | 'chat' | 'users';

// Generate a random avatar URL using DiceBear
function generateAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

export default function RoomPage() {
  const params = useParams();
  const router = useRouter();
  const roomCode = (params.code as string)?.toUpperCase();

  const { emit } = useSocket();

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
    clearSyncEvent,
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
    onReady,
    onStateChange,
    syncPlay,
    syncPause,
    syncSeek,
    syncVideoChange,
    syncToRoomState,
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
      // Redirect to home if no name
      router.push('/');
      return;
    }

    // Check if we already have a userId (meaning we created/joined from home page)
    if (savedUserId && room) {
      setHasJoined(true);
      return;
    }

    // Join the room
    const avatar = generateAvatar(savedName);
    joinRoom(roomCode, savedName, avatar)
      .then(() => setHasJoined(true))
      .catch(() => {
        // Room not found or error
        router.push('/');
      });
  }, [roomCode, hasJoined, joinRoom, router, room]);

  // Handle sync events from other users
  useEffect(() => {
    if (!syncEvent) return;

    switch (syncEvent.type) {
      case 'play':
        if (syncEvent.currentTime !== undefined) {
          syncPlay(syncEvent.currentTime);
        }
        break;
      case 'pause':
        if (syncEvent.currentTime !== undefined) {
          syncPause(syncEvent.currentTime);
        }
        break;
      case 'seek':
        if (syncEvent.currentTime !== undefined) {
          syncSeek(syncEvent.currentTime);
        }
        break;
      case 'video_change':
        if (syncEvent.videoId) {
          syncVideoChange(syncEvent.videoId);
        }
        break;
    }

    clearSyncEvent();
  }, [syncEvent, syncPlay, syncPause, syncSeek, syncVideoChange, clearSyncEvent]);

  // Sync to room state when player is ready and we first join
  const handlePlayerReady = useCallback(
    (event: { target: any }) => {
      onReady(event);

      // If room already has a video playing, sync to it
      if (room?.currentVideoId) {
        setTimeout(() => {
          syncToRoomState(room.currentVideoId, room.currentTime, room.isPlaying);
        }, 500);
      }
    },
    [onReady, room, syncToRoomState]
  );

  const handleLeave = () => {
    leaveRoom();
    localStorage.removeItem('synctunes_userId');
    router.push('/');
  };

  const handlePlaySong = (videoId: string, title: string) => {
    if (isHost) {
      changeVideo(videoId, title);
    }
  };

  // Loading state
  if (isLoading || !room) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 animate-fade-in">
          <div className="w-16 h-16 rounded-full border-4 border-violet-500/30 border-t-violet-500 animate-spin" />
          <p className="text-white/50 text-sm">Joining room...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-white/70 text-lg">Failed to join room</p>
          <p className="text-white/40 text-sm">{error}</p>
          <button
            onClick={() => router.push('/')}
            className="mt-4 px-6 py-2 rounded-xl bg-white/10 border border-white/20 text-white/70 hover:bg-white/20 transition-all"
          >
            Go Home
          </button>
        </div>
      </div>
    );
  }

  const currentUser = users.find((u) => u.userId === userId);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar
        userName={currentUser?.name}
        userAvatar={currentUser?.avatar}
        onLogout={handleLeave}
      />

      <div className="pt-16 flex-1 flex flex-col">
        <RoomHeader
          roomCode={room.roomCode}
          isHost={isHost}
          users={users}
          currentVideoTitle={room.currentVideoTitle}
          onLeave={handleLeave}
        />

        {/* Main content */}
        <div className="flex-1 flex flex-col lg:flex-row">
          {/* Player area */}
          <div className="flex-1 p-4 lg:p-6">
            <Player
              videoId={room.currentVideoId}
              isHost={isHost}
              onReady={handlePlayerReady}
              onStateChange={onStateChange}
            />
          </div>

          {/* Sidebar (Desktop) */}
          <div className="hidden lg:flex lg:w-96 border-l border-white/10 flex-col">
            {/* Tabs */}
            <div className="flex border-b border-white/10">
              {(['queue', 'chat', 'users'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors relative ${
                    mobileTab === tab
                      ? 'text-violet-400'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {tab}
                  {mobileTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
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
                <div className="p-4">
                  <UserList
                    users={users}
                    hostId={room.hostId}
                    currentUserId={userId}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Mobile tabs */}
          <div className="lg:hidden flex flex-col border-t border-white/10">
            {/* Tab bar */}
            <div className="flex border-b border-white/10">
              {(['queue', 'chat', 'users'] as MobileTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setMobileTab(tab)}
                  className={`flex-1 py-3 text-sm font-medium capitalize transition-colors relative ${
                    mobileTab === tab
                      ? 'text-violet-400'
                      : 'text-white/40 hover:text-white/60'
                  }`}
                >
                  {tab}
                  {tab === 'chat' && messages.length > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 rounded-full bg-pink-500/20 text-pink-400 text-[10px]">
                      {messages.filter((m) => m.type === 'user').length}
                    </span>
                  )}
                  {mobileTab === tab && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500" />
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="h-80">
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
                <div className="p-4 overflow-y-auto h-full custom-scrollbar">
                  <UserList
                    users={users}
                    hostId={room.hostId}
                    currentUserId={userId}
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
