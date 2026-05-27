'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LoginModal from '@/components/LoginModal';
import { useSocket } from '@/hooks/useSocket';
import { SOCKET_EVENTS } from '@/lib/types';

// Generate a random avatar URL using DiceBear
function generateAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

export default function HomePage() {
  const router = useRouter();
  const { emit } = useSocket();

  const [showLoginModal, setShowLoginModal] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register' | 'guest'>('login');
  
  const [userName, setUserName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [myRooms, setMyRooms] = useState<any[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);

  // Load saved data and auth token
  useEffect(() => {
    const savedName = localStorage.getItem('synctunes_name');
    if (savedName) setUserName(savedName);
    
    const savedRoom = localStorage.getItem('synctunes_lastRoom');
    if (savedRoom) setJoinCode(savedRoom);

    const token = localStorage.getItem('synctunes_token');
    if (token) {
      setIsLoggedIn(true);
      setIsLoadingRooms(true);
      fetch('/api/user/rooms', {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setMyRooms(data.rooms);
        } else {
          localStorage.removeItem('synctunes_token');
          setIsLoggedIn(false);
        }
      })
      .catch(() => {})
      .finally(() => setIsLoadingRooms(false));
    }
  }, []);

  const handleCreateRoom = (name: string, userId?: string) => {
    const avatar = generateAvatar(name);
    emit(
      SOCKET_EVENTS.CREATE_ROOM,
      { userName: name, userAvatar: avatar, userId },
      (response: unknown) => {
        const res = response as { success: boolean; data?: { room: { roomCode: string }; userId: string }; error?: string };
        if (res.success && res.data) {
          localStorage.setItem('synctunes_userId', res.data.userId);
          localStorage.setItem('synctunes_lastRoom', res.data.room.roomCode);
          router.push(`/room/${res.data.room.roomCode}`);
        } else {
          alert(res.error || 'Failed to create room');
        }
      }
    );
  };

  const handleJoinRoom = (code: string, name: string, userId?: string) => {
    const avatar = generateAvatar(name);
    emit(
      SOCKET_EVENTS.JOIN_ROOM,
      { roomCode: code, userName: name, userAvatar: avatar, userId },
      (response: unknown) => {
        const res = response as { success: boolean; data?: { room: { roomCode: string }; userId: string }; error?: string };
        if (res.success && res.data) {
          localStorage.setItem('synctunes_userId', res.data.userId);
          localStorage.setItem('synctunes_lastRoom', res.data.room.roomCode);
          router.push(`/room/${res.data.room.roomCode}`);
        } else {
          alert(res.error || 'Room not found');
        }
      }
    );
  };

  const handleAuthSuccess = (user: any, token: string) => {
    localStorage.setItem('synctunes_token', token);
    localStorage.setItem('synctunes_userId', user.id);
    localStorage.setItem('synctunes_name', user.name);
    setUserName(user.name);
    setIsLoggedIn(true);
    setShowLoginModal(false);
    window.location.reload(); // Refresh to fetch rooms
  };

  const handleGuestJoin = (name: string, code?: string) => {
    localStorage.setItem('synctunes_name', name);
    setUserName(name);
    setShowLoginModal(false);
    if (code) {
      handleJoinRoom(code, name);
    } else {
      handleCreateRoom(name);
    }
  };

  const openAuth = (mode: 'login' | 'register' | 'guest') => {
    setAuthMode(mode);
    setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen relative">
      <Navbar />

      {/* Hero Section */}
      <main className="pt-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Hero */}
          <section className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] text-center py-20">
            {/* Animated music bars */}
            <div className="flex items-end gap-1.5 mb-8">
              <div className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-violet-400 animate-music-bar-1" style={{ height: '20px' }} />
              <div className="w-1.5 rounded-full bg-gradient-to-t from-violet-400 to-pink-400 animate-music-bar-2" style={{ height: '16px' }} />
              <div className="w-1.5 rounded-full bg-gradient-to-t from-pink-400 to-pink-500 animate-music-bar-3" style={{ height: '24px' }} />
              <div className="w-1.5 rounded-full bg-gradient-to-t from-pink-500 to-violet-500 animate-music-bar-1" style={{ height: '12px', animationDelay: '0.3s' }} />
              <div className="w-1.5 rounded-full bg-gradient-to-t from-violet-500 to-pink-400 animate-music-bar-2" style={{ height: '20px', animationDelay: '0.2s' }} />
            </div>

            {/* Title */}
            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight animate-slide-up">
              <span className="bg-gradient-to-r from-violet-400 via-pink-400 to-violet-400 bg-clip-text text-transparent animate-gradient">
                Listen Together
              </span>
              <br />
              <span className="text-white/90 text-4xl sm:text-5xl md:text-6xl">
                In Perfect Sync
              </span>
            </h1>

            {/* Subtitle */}
            <p className="mt-6 text-lg sm:text-xl text-white/50 max-w-2xl animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Create a room, share the code, and enjoy YouTube music with friends — 
              synchronized playback, shared queue, and live chat.
            </p>

            {/* Action buttons */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              {!isLoggedIn ? (
                <>
                  <button
                    onClick={() => openAuth('register')}
                    className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-lg shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span className="relative z-10">Create Account</span>
                  </button>
                  <button
                    onClick={() => openAuth('guest')}
                    className="px-8 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
                  >
                    Continue as Guest
                  </button>
                </>
              ) : (
                <div className="flex flex-col items-center gap-6">
                  <div className="flex gap-4">
                    <button
                      onClick={() => handleCreateRoom(userName, localStorage.getItem('synctunes_userId') || undefined)}
                      className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-lg shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <span className="relative z-10 flex items-center gap-3">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        Create Room
                      </span>
                    </button>

                    <div className="flex items-center gap-2">
                      <input 
                        type="text" 
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                        placeholder="ROOM CODE"
                        maxLength={6}
                        className="px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 uppercase tracking-widest w-36 text-center font-mono"
                      />
                      <button
                        onClick={() => {
                          if (joinCode) handleJoinRoom(joinCode, userName, localStorage.getItem('synctunes_userId') || undefined);
                        }}
                        className="px-6 py-4 rounded-xl border border-white/20 bg-white/5 text-white font-semibold hover:bg-white/10 transition-all"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Dashboard / Feature Cards */}
            <div className="mt-24 w-full max-w-4xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
              {isLoggedIn ? (
                <div className="glass p-8 rounded-3xl text-left">
                  <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-white">My Rooms & Playlists</h2>
                    <button onClick={() => {
                        localStorage.removeItem('synctunes_token');
                        window.location.reload();
                      }}
                      className="text-sm text-red-400 hover:text-red-300"
                    >
                      Log out
                    </button>
                  </div>
                  
                  {isLoadingRooms ? (
                    <p className="text-white/50 text-center py-8">Loading rooms...</p>
                  ) : myRooms.length === 0 ? (
                    <div className="text-center py-12 bg-white/5 rounded-2xl border border-white/10">
                      <p className="text-white/50 mb-2">You haven't created any rooms yet.</p>
                      <p className="text-sm text-white/30">Rooms you create will be saved here along with their playlists.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {myRooms.map((r) => (
                        <div key={r.id} className="p-5 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group relative overflow-hidden">
                          <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                          <div className="relative z-10">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-xl font-bold text-white font-mono tracking-widest">{r.roomCode}</h3>
                                <p className="text-xs text-white/40 mt-1">{new Date(r.createdAt).toLocaleDateString()}</p>
                              </div>
                              <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-300">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                                </svg>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-sm text-white/60">{r.queueCount} songs saved</span>
                              <button 
                                onClick={() => handleJoinRoom(r.roomCode, userName, localStorage.getItem('synctunes_userId') || undefined)}
                                className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm font-medium transition-colors"
                              >
                                Rejoin
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                    </svg>
                  ),
                  title: 'Synced Playback',
                  desc: 'Play, pause, and seek — everyone stays in sync automatically.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                    </svg>
                  ),
                  title: 'Shared Queue',
                  desc: 'Anyone can add songs. The party keeps going non-stop.',
                },
                {
                  icon: (
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                  ),
                  title: 'Live Chat',
                  desc: 'Chat in real-time while listening. React with emojis.',
                },
              ].map((feature) => (
                <div
                  key={feature.title}
                  className="group p-6 rounded-2xl glass hover:bg-white/10 transition-all hover:scale-[1.02] cursor-default"
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-pink-500/20 flex items-center justify-center text-violet-400 mb-4 group-hover:from-violet-500/30 group-hover:to-pink-500/30 transition-colors">
                    {feature.icon}
                  </div>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </div>
              ))}
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      <LoginModal 
        isOpen={showLoginModal} 
        onClose={() => setShowLoginModal(false)}
        initialMode={authMode}
        onSuccess={handleAuthSuccess}
        onGuestJoin={handleGuestJoin}
      />
    </div>
  );
}
