'use client';

import { useState } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: any, token: string) => void;
  onGuestJoin: (name: string, roomCode?: string) => void;
  initialMode?: 'login' | 'register' | 'guest';
}

export default function LoginModal({ isOpen, onClose, onSuccess, onGuestJoin, initialMode = 'login' }: LoginModalProps) {
  const [mode, setMode] = useState<'login' | 'register' | 'guest'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'guest') {
      if (!name.trim()) {
        setError('Please enter your name');
        return;
      }
      onGuestJoin(name, roomCode);
      return;
    }

    if (!email || !password || (mode === 'register' && !name)) {
      setError('Please fill all fields');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = mode === 'login' ? '/api/auth/login' : '/api/auth/register';
      const body = mode === 'login' ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (data.success) {
        if (mode === 'login') {
          onSuccess(data.user, data.token);
        } else {
          // If registered successfully, automatically log them in
          const loginRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });
          const loginData = await loginRes.json();
          if (loginData.success) {
            onSuccess(loginData.user, loginData.token);
          }
        }
      } else {
        setError(data.error);
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl glass-strong p-6 shadow-2xl shadow-violet-500/10 animate-slide-up">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-xl hover:bg-white/10 text-white/40 hover:text-white/70 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex border-b border-white/10 mb-6">
          {(['login', 'register', 'guest'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setMode(t);
                setError(null);
              }}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors relative ${
                mode === t ? 'text-violet-400' : 'text-white/40 hover:text-white/60'
              }`}
            >
              {t}
              {mode === t && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-violet-500 to-pink-500" />
              )}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {(mode === 'register' || mode === 'guest') && (
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
              />
            </div>
          )}

          {(mode === 'login' || mode === 'register') && (
            <>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/60 mb-2">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50"
                />
              </div>
            </>
          )}

          {mode === 'guest' && (
            <div>
              <label className="block text-sm font-medium text-white/60 mb-2">Room Code (Optional)</label>
              <input
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="Leave blank to create a room"
                className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/30 focus:outline-none focus:border-violet-500/50 uppercase tracking-widest"
                maxLength={6}
              />
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold text-lg hover:from-violet-600 hover:to-pink-600 disabled:opacity-50 transition-all shadow-lg"
          >
            {isLoading ? 'Processing...' : mode === 'login' ? 'Log In' : mode === 'register' ? 'Sign Up' : 'Continue as Guest'}
          </button>
        </form>
      </div>
    </div>
  );
}
