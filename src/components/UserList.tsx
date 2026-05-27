'use client';

import { RoomUser } from '@/lib/types';

interface UserListProps {
  users: RoomUser[];
  hostId: string;
  currentUserId: string | null;
}

export default function UserList({ users, hostId, currentUserId }: UserListProps) {
  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 px-1">
        Listeners ({users.length})
      </h3>

      <div className="flex flex-col gap-1">
        {users.map((user) => {
          const isHost = user.userId === hostId;
          const isYou = user.userId === currentUserId;

          return (
            <div
              key={user.userId}
              className="flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
            >
              {/* Avatar */}
              <div className="relative">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden ${
                    isHost
                      ? 'bg-gradient-to-br from-yellow-400 to-amber-500'
                      : 'bg-gradient-to-br from-violet-500 to-pink-500'
                  }`}
                >
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                  ) : (
                    user.name.charAt(0).toUpperCase()
                  )}
                </div>
                {/* Online indicator */}
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-400 border-2 border-[#1A1A2E]" />
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">
                  {user.name}
                  {isYou && <span className="text-white/40 ml-1">(you)</span>}
                </p>
              </div>

              {/* Host badge */}
              {isHost && (
                <svg className="w-4 h-4 text-yellow-400 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M5 16L3 5l5.5 5L12 4l3.5 6L21 5l-2 11H5z" />
                </svg>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
