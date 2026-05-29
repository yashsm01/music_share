'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import {
  SOCKET_EVENTS,
  IRoom,
  IQueueItem,
  IMessage,
  RoomUser,
  RoomJoinedPayload,
  UserJoinedPayload,
  UserLeftPayload,
  VideoChangedPayload,
  QueueUpdatedPayload,
  MessageReceivedPayload,
  PlaySyncPayload,
  PauseSyncPayload,
  SeekSyncPayload,
  AdminGrantedPayload,
} from '@/lib/types';

interface RoomState {
  room: IRoom | null;
  userId: string | null;
  users: RoomUser[];
  queue: IQueueItem[];
  messages: IMessage[];
  isHost: boolean;
  isLoading: boolean;
  error: string | null;
  playbackMode: 'audio' | 'video';
}

interface SyncEvent {
  type: 'play' | 'pause' | 'seek' | 'video_change';
  currentTime?: number;
  videoId?: string;
  videoTitle?: string;
}

export function useRoom() {
  const { emit, on } = useSocket();

  const [state, setState] = useState<RoomState>({
    room: null,
    userId: null,
    users: [],
    queue: [],
    messages: [],
    isHost: false,
    isLoading: false,
    error: null,
    playbackMode: 'audio',
  });

  const [syncEvent, setSyncEvent] = useState<SyncEvent | null>(null);

  // ========================================
  // Socket event listeners
  // ========================================
  useEffect(() => {
    const cleanups: (() => void)[] = [];

    cleanups.push(
      on(SOCKET_EVENTS.USER_JOINED, (data: unknown) => {
        const payload = data as UserJoinedPayload;
        setState((prev) => ({
          ...prev,
          users: payload.users,
        }));
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.USER_LEFT, (data: unknown) => {
        const payload = data as UserLeftPayload;
        setState((prev) => ({
          ...prev,
          users: payload.users,
          isHost: payload.newHostId
            ? payload.newHostId === prev.userId || (prev.room?.coHostIds || []).includes(prev.userId || '')
            : prev.isHost,
          room: prev.room
            ? {
                ...prev.room,
                hostId: payload.newHostId || prev.room.hostId,
                users: payload.users,
              }
            : null,
        }));
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.VIDEO_CHANGED, (data: unknown) => {
        const payload = data as VideoChangedPayload;
        setState((prev) => ({
          ...prev,
          room: prev.room
            ? {
                ...prev.room,
                currentVideoId: payload.videoId,
                currentVideoTitle: payload.videoTitle,
                currentTime: 0,
                isPlaying: true,
              }
            : null,
        }));
        setSyncEvent({
          type: 'video_change',
          videoId: payload.videoId,
          videoTitle: payload.videoTitle,
        });
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.PLAY_SYNC, (data: unknown) => {
        const payload = data as PlaySyncPayload;
        setState((prev) => ({
          ...prev,
          room: prev.room
            ? { ...prev.room, isPlaying: true, currentTime: payload.currentTime }
            : null,
        }));
        setSyncEvent({ type: 'play', currentTime: payload.currentTime });
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.PAUSE_SYNC, (data: unknown) => {
        const payload = data as PauseSyncPayload;
        setState((prev) => ({
          ...prev,
          room: prev.room
            ? { ...prev.room, isPlaying: false, currentTime: payload.currentTime }
            : null,
        }));
        setSyncEvent({ type: 'pause', currentTime: payload.currentTime });
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.SEEK_SYNC, (data: unknown) => {
        const payload = data as SeekSyncPayload;
        setState((prev) => ({
          ...prev,
          room: prev.room
            ? { ...prev.room, currentTime: payload.currentTime }
            : null,
        }));
        setSyncEvent({ type: 'seek', currentTime: payload.currentTime });
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.QUEUE_UPDATED, (data: unknown) => {
        const payload = data as QueueUpdatedPayload;
        setState((prev) => ({
          ...prev,
          queue: payload.queue,
        }));
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.MESSAGE_RECEIVED, (data: unknown) => {
        const payload = data as MessageReceivedPayload;
        
        // Intercept mode sync messages
        if (payload.message.type === 'user' && payload.message.message.startsWith('__MODE_SYNC__:')) {
          const mode = payload.message.message.split(':')[1] as 'audio' | 'video';
          if (mode === 'audio' || mode === 'video') {
            setState((prev) => ({ ...prev, playbackMode: mode }));
          }
          return;
        }

        setState((prev) => ({
          ...prev,
          messages: [...prev.messages, payload.message],
        }));
      })
    );

    cleanups.push(
      on(SOCKET_EVENTS.ADMIN_GRANTED, (data: unknown) => {
        const payload = data as AdminGrantedPayload;
        setState((prev) => {
          if (!prev.room) return prev;
          
          const updatedRoom = {
            ...prev.room,
            coHostIds: payload.coHostIds,
          };
          
          return {
            ...prev,
            room: updatedRoom,
            isHost: prev.userId === updatedRoom.hostId || payload.coHostIds.includes(prev.userId || ''),
          };
        });
      })
    );

    return () => {
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [on]);

  // ========================================
  // Actions
  // ========================================
  const createRoom = useCallback(
    (userName: string, userAvatar: string): Promise<RoomJoinedPayload> => {
      return new Promise((resolve, reject) => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        emit(
          SOCKET_EVENTS.CREATE_ROOM,
          { userName, userAvatar },
          (response: unknown) => {
            const res = response as { success: boolean; data?: RoomJoinedPayload; error?: string };
            if (res.success && res.data) {
              setState((prev) => ({
                ...prev,
                room: res.data!.room,
                userId: res.data!.userId,
                users: res.data!.room.users,
                queue: res.data!.queue,
                messages: res.data!.messages,
                isHost: true,
                isLoading: false,
                error: null,
              }));
              resolve(res.data);
            } else {
              setState((prev) => ({
                ...prev,
                isLoading: false,
                error: res.error || 'Failed to create room',
              }));
              reject(new Error(res.error || 'Failed to create room'));
            }
          }
        );
      });
    },
    [emit]
  );

  const joinRoom = useCallback(
    (roomCode: string, userName: string, userAvatar: string, userId?: string): Promise<RoomJoinedPayload> => {
      return new Promise((resolve, reject) => {
        setState((prev) => ({ ...prev, isLoading: true, error: null }));

        emit(
          SOCKET_EVENTS.JOIN_ROOM,
          { roomCode, userName, userAvatar, userId },
          (response: unknown) => {
            const res = response as { success: boolean; data?: RoomJoinedPayload; error?: string };
            if (res.success && res.data) {
              setState({
                room: res.data.room,
                userId: res.data.userId,
                users: res.data.room.users,
                queue: res.data.queue,
                messages: res.data.messages,
                isHost: res.data.room.hostId === res.data.userId || (res.data.room.coHostIds || []).includes(res.data.userId || ''),
                isLoading: false,
                error: null,
                playbackMode: 'audio',
              });

              // Save to room history
              try {
                const historyKey = 'synctunes_room_history';
                const raw = localStorage.getItem(historyKey);
                const history: { code: string; joinedAt: string }[] = raw ? JSON.parse(raw) : [];
                // Remove duplicate
                const filtered = history.filter((h) => h.code !== res.data!.room.roomCode);
                // Add at the front
                filtered.unshift({ code: res.data.room.roomCode, joinedAt: new Date().toISOString() });
                // Keep last 10
                localStorage.setItem(historyKey, JSON.stringify(filtered.slice(0, 10)));
                localStorage.setItem('synctunes_lastRoom', res.data.room.roomCode);
              } catch { /* swallow */ }

              resolve(res.data);
            } else {
              setState((prev) => ({
                ...prev,
                isLoading: false,
                error: res.error || 'Failed to join room',
              }));
              reject(new Error(res.error || 'Failed to join room'));
            }
          }
        );
      });
    },
    [emit]
  );

  const leaveRoom = useCallback(() => {
    if (state.room && state.userId) {
      emit(SOCKET_EVENTS.LEAVE_ROOM, {
        roomId: state.room._id,
        userId: state.userId,
      });
      setState((prev) => ({
      ...prev,
      room: null,
      userId: null,
      users: [],
      queue: [],
      messages: [],
      isHost: false,
    }));
    setSyncEvent(null);
    }
  }, [emit, state.room, state.userId]);

  const play = useCallback(
    (currentTime: number) => {
      if (state.room) {
        emit(SOCKET_EVENTS.PLAY, {
          roomId: state.room._id,
          currentTime,
        });
      }
    },
    [emit, state.room]
  );

  const pause = useCallback(
    (currentTime: number) => {
      if (state.room) {
        emit(SOCKET_EVENTS.PAUSE, {
          roomId: state.room._id,
          currentTime,
        });
      }
    },
    [emit, state.room]
  );

  const seek = useCallback(
    (currentTime: number) => {
      if (state.room) {
        emit(SOCKET_EVENTS.SEEK, {
          roomId: state.room._id,
          currentTime,
        });
      }
    },
    [emit, state.room]
  );

  const changeVideo = useCallback(
    (videoId: string, videoTitle: string) => {
      if (state.room) {
        emit(SOCKET_EVENTS.CHANGE_VIDEO, {
          roomId: state.room._id,
          videoId,
          videoTitle,
        });
      }
    },
    [emit, state.room]
  );

  const addToQueue = useCallback(
    (videoId: string, title: string, thumbnail: string) => {
      if (state.room && state.userId) {
        const user = state.users.find((u) => u.userId === state.userId);
        emit(SOCKET_EVENTS.ADD_QUEUE, {
          roomId: state.room._id,
          videoId,
          title,
          thumbnail,
          userId: state.userId,
          userName: user?.name || 'Unknown',
        });
      }
    },
    [emit, state.room, state.userId, state.users]
  );

  const removeFromQueue = useCallback(
    (queueItemId: string) => {
      if (state.room) {
        emit(SOCKET_EVENTS.REMOVE_QUEUE, {
          roomId: state.room._id,
          queueItemId,
        });
      }
    },
    [emit, state.room]
  );

  const sendMessage = useCallback(
    (message: string) => {
      if (state.room && state.userId) {
        const user = state.users.find((u) => u.userId === state.userId);
        emit(SOCKET_EVENTS.SEND_MESSAGE, {
          roomId: state.room._id,
          userId: state.userId,
          userName: user?.name || 'Unknown',
          userAvatar: user?.avatar || '',
          message,
        });
      }
    },
    [emit, state.room, state.userId, state.users]
  );

  const clearSyncEvent = useCallback(() => {
    setSyncEvent(null);
  }, []);

  const grantAdmin = useCallback(
    (targetUserId: string) => {
      if (state.room && state.isHost) {
        emit(SOCKET_EVENTS.GRANT_ADMIN, {
          roomId: state.room._id,
          targetUserId,
        });
      }
    },
    [emit, state.room, state.isHost]
  );

  const changePlaybackMode = useCallback(
    (mode: 'audio' | 'video') => {
      if (!state.room || !state.userId) return;
      // Send a hidden message to sync mode
      emit(SOCKET_EVENTS.SEND_MESSAGE, {
        roomId: state.room._id,
        userId: state.userId,
        userName: 'System',
        userAvatar: '',
        message: `__MODE_SYNC__:${mode}`,
      });
      // Optimistic update
      setState((prev) => ({ ...prev, playbackMode: mode }));
    },
    [emit, state.room, state.userId]
  );

  return {
    ...state,
    syncEvent,
    createRoom,
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
    changePlaybackMode,
    clearSyncEvent,
  };
}
