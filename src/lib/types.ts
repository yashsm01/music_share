// ============================================
// SyncTunes — Shared TypeScript Types
// ============================================

// --- User ---
export interface IUser {
  _id: string;
  name: string;
  avatar: string;
  createdAt: Date;
}

export interface RoomUser {
  userId: string;
  name: string;
  avatar: string;
  socketId?: string;
}

// --- Room ---
export interface IRoom {
  _id: string;
  roomCode: string;
  hostId: string;
  currentVideoId: string | null;
  currentVideoTitle: string | null;
  isPlaying: boolean;
  currentTime: number;
  users: RoomUser[];
  createdAt: Date;
}

// --- Queue Item ---
export interface IQueueItem {
  _id: string;
  roomId: string;
  videoId: string;
  title: string;
  thumbnail: string;
  addedBy: {
    userId: string;
    name: string;
  };
  createdAt: Date;
}

// --- Message ---
export interface IMessage {
  _id: string;
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
  type: 'user' | 'system';
  createdAt: Date;
}

// ============================================
// Socket Event Payloads
// ============================================

// Client -> Server
export interface CreateRoomPayload {
  userName: string;
  userAvatar: string;
}

export interface JoinRoomPayload {
  roomCode: string;
  userName: string;
  userAvatar: string;
}

export interface LeaveRoomPayload {
  roomId: string;
  userId: string;
}

export interface PlayPayload {
  roomId: string;
  currentTime: number;
}

export interface PausePayload {
  roomId: string;
  currentTime: number;
}

export interface SeekPayload {
  roomId: string;
  currentTime: number;
}

export interface ChangeVideoPayload {
  roomId: string;
  videoId: string;
  videoTitle: string;
}

export interface AddQueuePayload {
  roomId: string;
  videoId: string;
  title: string;
  thumbnail: string;
  userId: string;
  userName: string;
}

export interface RemoveQueuePayload {
  roomId: string;
  queueItemId: string;
}

export interface SendMessagePayload {
  roomId: string;
  userId: string;
  userName: string;
  userAvatar: string;
  message: string;
}

// Server -> Client
export interface RoomJoinedPayload {
  room: IRoom;
  userId: string;
  queue: IQueueItem[];
  messages: IMessage[];
}

export interface UserJoinedPayload {
  user: RoomUser;
  users: RoomUser[];
}

export interface UserLeftPayload {
  userId: string;
  users: RoomUser[];
  newHostId?: string;
}

export interface VideoChangedPayload {
  videoId: string;
  videoTitle: string;
}

export interface PlaySyncPayload {
  currentTime: number;
}

export interface PauseSyncPayload {
  currentTime: number;
}

export interface SeekSyncPayload {
  currentTime: number;
}

export interface QueueUpdatedPayload {
  queue: IQueueItem[];
}

export interface MessageReceivedPayload {
  message: IMessage;
}

// ============================================
// Socket Event Names
// ============================================
export const SOCKET_EVENTS = {
  // Client -> Server
  CREATE_ROOM: 'CREATE_ROOM',
  JOIN_ROOM: 'JOIN_ROOM',
  LEAVE_ROOM: 'LEAVE_ROOM',
  PLAY: 'PLAY',
  PAUSE: 'PAUSE',
  SEEK: 'SEEK',
  CHANGE_VIDEO: 'CHANGE_VIDEO',
  ADD_QUEUE: 'ADD_QUEUE',
  REMOVE_QUEUE: 'REMOVE_QUEUE',
  SEND_MESSAGE: 'SEND_MESSAGE',

  // Server -> Client
  ROOM_JOINED: 'ROOM_JOINED',
  ROOM_ERROR: 'ROOM_ERROR',
  USER_JOINED: 'USER_JOINED',
  USER_LEFT: 'USER_LEFT',
  VIDEO_CHANGED: 'VIDEO_CHANGED',
  PLAY_SYNC: 'PLAY_SYNC',
  PAUSE_SYNC: 'PAUSE_SYNC',
  SEEK_SYNC: 'SEEK_SYNC',
  QUEUE_UPDATED: 'QUEUE_UPDATED',
  MESSAGE_RECEIVED: 'MESSAGE_RECEIVED',
} as const;
