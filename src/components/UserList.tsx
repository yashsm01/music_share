'use client';

import { RoomUser } from '@/lib/types';

interface UserListProps {
  users: RoomUser[];
  hostId: string;
  coHostIds?: string[];
  currentUserId: string | null;
  onGrantAdmin?: (userId: string) => void;
}

export default function UserList({ users, hostId, coHostIds = [], currentUserId, onGrantAdmin }: UserListProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 px-0.5 mb-1">
        Listeners ({users.length})
      </h3>

      <div className="flex flex-col gap-0.5">
        {users.map((user) => {
          const isHost = user.userId === hostId;
          const isCoHost = coHostIds.includes(user.userId);
          const isYou = user.userId === currentUserId;
          const amIHost = currentUserId === hostId;

          return (
            <div
              key={user.userId}
              className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
            >
              {/* Avatar */}
              <div className="relative shrink-0">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-1 ${
                    isHost
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 ring-amber-400/30'
                      : isCoHost
                      ? 'bg-gradient-to-br from-cyan-400 to-blue-500 ring-cyan-400/30'
                      : 'bg-gradient-to-br from-cyan-500 to-violet-500 ring-white/10'
                  }`}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#111827]" />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-xs sm:text-sm font-medium text-white/80 truncate">
                  {user.name}
                  {isYou && <span className="text-white/30 ml-1 text-[10px]">(you)</span>}
                </p>
              </div>

              {/* Badges */}
              {isHost && (
                <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <title>Host</title>
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                </svg>
              )}

              {!isHost && isCoHost && (
                <svg className="w-3.5 h-3.5 text-cyan-400 shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <title>Co-Host</title>
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                </svg>
              )}

              {/* Grant Admin */}
              {amIHost && !isHost && !isCoHost && onGrantAdmin && (
                <button
                  onClick={() => onGrantAdmin(user.userId)}
                  className="p-1 rounded-md bg-white/[0.04] hover:bg-cyan-500/15 text-white/30 hover:text-cyan-400 transition-colors"
                  title="Grant Co-Host"
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
