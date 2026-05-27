'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
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
  const [userName, setUserName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [action, setAction] = useState<'create' | 'join'>('create');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load saved name from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('synctunes_name');
    if (saved) setUserName(saved);
  }, []);

  const handleAction = (type: 'create' | 'join') => {
    setAction(type);
    setError(null);
    setShowLoginModal(true);
  };

  const handleSubmit = async () => {
    if (!userName.trim()) {
      setError('Please enter your name');
      return;
    }

    if (action === 'join' && !joinCode.trim()) {
      setError('Please enter a room code');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Save name
    localStorage.setItem('synctunes_name', userName.trim());
    const avatar = generateAvatar(userName.trim());

    try {
      if (action === 'create') {
        emit(
          SOCKET_EVENTS.CREATE_ROOM,
          { userName: userName.trim(), userAvatar: avatar },
          (response: unknown) => {
            const res = response as { success: boolean; data?: { room: { roomCode: string }; userId: string }; error?: string };
            if (res.success && res.data) {
              localStorage.setItem('synctunes_userId', res.data.userId);
              router.push(`/room/${res.data.room.roomCode}`);
            } else {
              setError(res.error || 'Failed to create room');
              setIsLoading(false);
            }
          }
        );
      } else {
        emit(
          SOCKET_EVENTS.JOIN_ROOM,
          { roomCode: joinCode.trim().toUpperCase(), userName: userName.trim(), userAvatar: avatar },
          (response: unknown) => {
            const res = response as { success: boolean; data?: { room: { roomCode: string }; userId: string }; error?: string };
            if (res.success && res.data) {
              localStorage.setItem('synctunes_userId', res.data.userId);
              router.push(`/room/${res.data.room.roomCode}`);
            } else {
              setError(res.error || 'Room not found');
              setIsLoading(false);
            }
          }
        );
      }
    } catch {
      setError('Connection error. Please try again.');
      setIsLoading(false);
    }
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
              <button
                onClick={() => handleAction('create')}
                className="group relative px-8 py-4 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-lg shadow-2xl shadow-violet-500/25 hover:shadow-violet-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <span className="relative z-10 flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                  Create Room
                </span>
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-violet-600 to-pink-600 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              <button
                onClick={() => handleAction('join')}
                className="px-8 py-4 rounded-2xl border border-white/20 bg-white/5 text-white font-semibold text-lg hover:bg-white/10 hover:border-white/30 transition-all hover:scale-[1.02] active:scale-[0.98] backdrop-blur-sm"
              >
                <span className="flex items-center gap-3">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Join Room
                </span>
              </button>
            </div>

            {/* Feature cards */}
            <div className="mt-24 grid grid-cols-1 sm:grid-cols-3 gap-6 w-full max-w-4xl animate-slide-up" style={{ animationDelay: '0.3s' }}>
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
                  <h3 className="text-lg font-semibold text-white/90 mb-2">{feature.title}</h3>
                  <p className="text-sm text-white/50">{feature.desc}</p>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>

      {/* Login / Join Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              setShowLoginModal(false);
              setError(null);
            }}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md rounded-2xl glass-strong p-6 shadow-2xl shadow-violet-500/10 animate-slide-up">
            {/* Close button */}
            <button
              onClick={() => {
                setShowLoginModal(false);
                setError(null);
              }}
              className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Title */}
            <h2 className="text-2xl font-bold text-white mb-2">
              {action === 'create' ? '🎵 Create a Room' : '🚪 Join a Room'}
            </h2>
            <p className="text-sm text-white/50 mb-6">
              {action === 'create'
                ? 'Set your name and start a listening party!'
                : 'Enter the room code to join your friends.'}
            </p>

            {/* Form */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Your Name</label>
                <input
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value);
                    setError(null);
                  }}
                  placeholder="Enter your name..."
                  maxLength={30}
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all"
                  autoFocus
                />
              </div>

              {action === 'join' && (
                <div>
                  <label className="block text-sm font-medium text-white/60 mb-2">Room Code</label>
                  <input
                    type="text"
                    value={joinCode}
                    onChange={(e) => {
                      setJoinCode(e.target.value.toUpperCase());
                      setError(null);
                    }}
                    placeholder="e.g. ABC123"
                    maxLength={6}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 focus:ring-2 focus:ring-violet-500/20 transition-all font-mono text-lg tracking-widest uppercase"
                  />
                </div>
              )}

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <svg className="w-4 h-4 text-red-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <button
                onClick={handleSubmit}
                disabled={isLoading}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-lg hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-violet-500/20 hover:shadow-violet-500/30 flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    {action === 'create' ? 'Creating...' : 'Joining...'}
                  </>
                ) : (
                  action === 'create' ? 'Create Room' : 'Join Room'
                )}
              </button>

              {/* Switch action */}
              <p className="text-center text-sm text-white/40">
                {action === 'create' ? (
                  <>
                    Have a code?{' '}
                    <button
                      onClick={() => {
                        setAction('join');
                        setError(null);
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Join a room instead
                    </button>
                  </>
                ) : (
                  <>
                    Want to host?{' '}
                    <button
                      onClick={() => {
                        setAction('create');
                        setError(null);
                      }}
                      className="text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Create a room instead
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
