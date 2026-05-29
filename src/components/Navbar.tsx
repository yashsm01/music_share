'use client';

import { useState } from 'react';

interface NavbarProps {
  userName?: string;
  userAvatar?: string;
  onLogout?: () => void;
}

export default function Navbar({ userName, userAvatar, onLogout }: NavbarProps) {
  const [showMenu, setShowMenu] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-strong" style={{ paddingTop: 'var(--sat)' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center shadow-lg shadow-cyan-500/20 group-hover:shadow-cyan-500/35 transition-shadow">
                <svg className="w-4.5 h-4.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
                </svg>
              </div>
            </div>
            <span className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-violet-400 bg-clip-text text-transparent">
              SyncTunes
            </span>
          </a>

          {/* User */}
          {userName && (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-2.5 px-2.5 py-1.5 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ring-white/10">
                  {userAvatar ? (
                    <img src={userAvatar} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    userName.charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-sm font-medium text-white/70 hidden sm:block max-w-[100px] truncate">
                  {userName}
                </span>
              </button>

              {showMenu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowMenu(false)} />
                  <div className="absolute right-0 mt-2 w-44 rounded-xl glass-strong shadow-2xl shadow-black/50 overflow-hidden z-50">
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        onLogout?.();
                      }}
                      className="w-full text-left px-4 py-3 text-sm text-white/70 hover:bg-white/5 hover:text-white transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Room
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
