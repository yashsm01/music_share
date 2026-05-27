import { Server as SocketIOServer, Socket } from 'socket.io';
import connectDB from '../lib/mongodb';
import User from '../models/User';
import Room from '../models/Room';
import Queue from '../models/Queue';
import Message from '../models/Message';
import {
  SOCKET_EVENTS,
  CreateRoomPayload,
  JoinRoomPayload,
  LeaveRoomPayload,
  PlayPayload,
  PausePayload,
  SeekPayload,
  ChangeVideoPayload,
  AddQueuePayload,
  RemoveQueuePayload,
  SendMessagePayload,
} from '../lib/types';

// Generate a random 6-character room code
function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded ambiguous: I, O, 0, 1
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Track socket -> room/user mapping for disconnect cleanup
const socketRoomMap = new Map<string, { roomId: string; userId: string }>();

export function registerSocketHandlers(io: SocketIOServer) {
  io.on('connection', (socket: Socket) => {
    console.log(`🔌 User connected: ${socket.id}`);

    // ========================================
    // CREATE_ROOM
    // ========================================
    socket.on(SOCKET_EVENTS.CREATE_ROOM, async (payload: CreateRoomPayload, callback) => {
      try {
        await connectDB();

        // Create guest user
        const user = await User.create({
          name: payload.userName,
          avatar: payload.userAvatar,
        });

        // Generate unique room code
        let roomCode = generateRoomCode();
        let existingRoom = await Room.findOne({ roomCode });
        while (existingRoom) {
          roomCode = generateRoomCode();
          existingRoom = await Room.findOne({ roomCode });
        }

        // Create room with host
        const room = await Room.create({
          roomCode,
          hostId: user._id,
          users: [
            {
              userId: user._id,
              name: user.name,
              avatar: user.avatar,
              socketId: socket.id,
            },
          ],
        });

        // Join socket room
        socket.join(roomCode);
        socketRoomMap.set(socket.id, { roomId: room._id.toString(), userId: user._id.toString() });

        if (callback) {
          callback({
            success: true,
            data: {
              room: room.toObject(),
              userId: user._id.toString(),
              queue: [],
              messages: [],
            },
          });
        }

        console.log(`🏠 Room ${roomCode} created by ${payload.userName}`);
      } catch (error) {
        console.error('Error creating room:', error);
        if (callback) {
          callback({ success: false, error: 'Failed to create room' });
        }
      }
    });

    // ========================================
    // JOIN_ROOM
    // ========================================
    socket.on(SOCKET_EVENTS.JOIN_ROOM, async (payload: JoinRoomPayload, callback) => {
      try {
        await connectDB();

        const room = await Room.findOne({ roomCode: payload.roomCode.toUpperCase() });
        if (!room) {
          if (callback) {
            callback({ success: false, error: 'Room not found' });
          }
          return;
        }

        let user = null;
        if (payload.userId) {
          user = await User.findById(payload.userId);
        }

        // Create guest user if not found
        if (!user) {
          user = await User.create({
            name: payload.userName,
            avatar: payload.userAvatar,
          });
        }

        // Check if user is already in the room
        const existingRoomUserIndex = room.users.findIndex((u) => u.userId.toString() === user!._id.toString());
        
        if (existingRoomUserIndex >= 0) {
          // Update existing user's socketId
          room.users[existingRoomUserIndex].socketId = socket.id;
        } else {
          // Add new user to room
          room.users.push({
            userId: user._id,
            name: user.name,
            avatar: user.avatar,
            socketId: socket.id,
          });
        }

        await room.save();

        // Join socket room
        socket.join(room.roomCode);
        socketRoomMap.set(socket.id, { roomId: room._id.toString(), userId: user._id.toString() });

        // Fetch queue and recent messages
        const queue = await Queue.find({ roomId: room._id }).sort({ createdAt: 1 });
        const messages = await Message.find({ roomId: room._id })
          .sort({ createdAt: 1 })
          .limit(100);

        // Send room data to the joining user
        if (callback) {
          callback({
            success: true,
            data: {
              room: room.toObject(),
              userId: user._id.toString(),
              queue: queue.map((q) => q.toObject()),
              messages: messages.map((m) => m.toObject()),
            },
          });
        }

        // Notify others in the room
        socket.to(room.roomCode).emit(SOCKET_EVENTS.USER_JOINED, {
          user: {
            userId: user._id.toString(),
            name: user.name,
            avatar: user.avatar,
          },
          users: room.users.map((u) => ({
            userId: u.userId.toString(),
            name: u.name,
            avatar: u.avatar,
          })),
        });

        // System message
        const sysMsg = await Message.create({
          roomId: room._id,
          userId: user._id,
          userName: user.name,
          userAvatar: user.avatar,
          message: `${user.name} joined the room`,
          type: 'system',
        });

        io.to(room.roomCode).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          message: sysMsg.toObject(),
        });

        console.log(`👤 ${payload.userName} joined room ${room.roomCode}`);
      } catch (error) {
        console.error('Error joining room:', error);
        if (callback) {
          callback({ success: false, error: 'Failed to join room' });
        }
      }
    });

    // ========================================
    // LEAVE_ROOM
    // ========================================
    socket.on(SOCKET_EVENTS.LEAVE_ROOM, async (payload: LeaveRoomPayload) => {
      await handleUserLeave(io, socket, payload.roomId, payload.userId);
    });

    // ========================================
    // PLAY
    // ========================================
    socket.on(SOCKET_EVENTS.PLAY, async (payload: PlayPayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        room.isPlaying = true;
        room.currentTime = payload.currentTime;
        await room.save();

        socket.to(room.roomCode).emit(SOCKET_EVENTS.PLAY_SYNC, {
          currentTime: payload.currentTime,
        });
      } catch (error) {
        console.error('Error handling play:', error);
      }
    });

    // ========================================
    // PAUSE
    // ========================================
    socket.on(SOCKET_EVENTS.PAUSE, async (payload: PausePayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        room.isPlaying = false;
        room.currentTime = payload.currentTime;
        await room.save();

        socket.to(room.roomCode).emit(SOCKET_EVENTS.PAUSE_SYNC, {
          currentTime: payload.currentTime,
        });
      } catch (error) {
        console.error('Error handling pause:', error);
      }
    });

    // ========================================
    // SEEK
    // ========================================
    socket.on(SOCKET_EVENTS.SEEK, async (payload: SeekPayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        room.currentTime = payload.currentTime;
        await room.save();

        socket.to(room.roomCode).emit(SOCKET_EVENTS.SEEK_SYNC, {
          currentTime: payload.currentTime,
        });
      } catch (error) {
        console.error('Error handling seek:', error);
      }
    });

    // ========================================
    // CHANGE_VIDEO
    // ========================================
    socket.on(SOCKET_EVENTS.CHANGE_VIDEO, async (payload: ChangeVideoPayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        room.currentVideoId = payload.videoId;
        room.currentVideoTitle = payload.videoTitle;
        room.currentTime = 0;
        room.isPlaying = true;
        await room.save();

        // Broadcast to ALL in room (including sender for confirmation)
        io.to(room.roomCode).emit(SOCKET_EVENTS.VIDEO_CHANGED, {
          videoId: payload.videoId,
          videoTitle: payload.videoTitle,
        });
      } catch (error) {
        console.error('Error changing video:', error);
      }
    });

    // ========================================
    // ADD_QUEUE
    // ========================================
    socket.on(SOCKET_EVENTS.ADD_QUEUE, async (payload: AddQueuePayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        await Queue.create({
          roomId: room._id,
          videoId: payload.videoId,
          title: payload.title,
          thumbnail: payload.thumbnail,
          addedBy: {
            userId: payload.userId,
            name: payload.userName,
          },
        });

        const queue = await Queue.find({ roomId: room._id }).sort({ createdAt: 1 });

        io.to(room.roomCode).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
          queue: queue.map((q) => q.toObject()),
        });
      } catch (error) {
        console.error('Error adding to queue:', error);
      }
    });

    // ========================================
    // REMOVE_QUEUE
    // ========================================
    socket.on(SOCKET_EVENTS.REMOVE_QUEUE, async (payload: RemoveQueuePayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        await Queue.findByIdAndDelete(payload.queueItemId);

        const queue = await Queue.find({ roomId: room._id }).sort({ createdAt: 1 });

        io.to(room.roomCode).emit(SOCKET_EVENTS.QUEUE_UPDATED, {
          queue: queue.map((q) => q.toObject()),
        });
      } catch (error) {
        console.error('Error removing from queue:', error);
      }
    });

    // ========================================
    // SEND_MESSAGE
    // ========================================
    socket.on(SOCKET_EVENTS.SEND_MESSAGE, async (payload: SendMessagePayload) => {
      try {
        await connectDB();
        const room = await Room.findById(payload.roomId);
        if (!room) return;

        const message = await Message.create({
          roomId: room._id,
          userId: payload.userId,
          userName: payload.userName,
          userAvatar: payload.userAvatar,
          message: payload.message,
          type: 'user',
        });

        io.to(room.roomCode).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
          message: message.toObject(),
        });
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    // ========================================
    // DISCONNECT
    // ========================================
    socket.on('disconnect', async () => {
      console.log(`🔌 User disconnected: ${socket.id}`);
      const mapping = socketRoomMap.get(socket.id);
      if (mapping) {
        await handleUserLeave(io, socket, mapping.roomId, mapping.userId);
        socketRoomMap.delete(socket.id);
      }
    });
  });
}

// ============================================
// Helper: Handle user leaving a room
// ============================================
async function handleUserLeave(
  io: SocketIOServer,
  socket: Socket,
  roomId: string,
  userId: string
) {
  try {
    await connectDB();
    const room = await Room.findById(roomId);
    if (!room) return;

    // Remove user from room
    room.users = room.users.filter((u) => u.userId.toString() !== userId);

    let newHostId: string | undefined;

    // If room is empty, we keep it alive so the host can rejoin if they accidentally refreshed
    if (room.users.length === 0) {
      console.log(`⏳ Room ${room.roomCode} is now empty (kept alive for reconnect)`);
      // We don't delete immediately to allow for reconnects
      return;
    }

    // If host left, assign new host
    if (room.hostId.toString() === userId && room.users.length > 0) {
      room.hostId = room.users[0].userId as any;
      newHostId = room.users[0].userId.toString();
    }

    await room.save();

    socket.leave(room.roomCode);

    // Notify remaining users
    io.to(room.roomCode).emit(SOCKET_EVENTS.USER_LEFT, {
      userId,
      users: room.users.map((u) => ({
        userId: u.userId.toString(),
        name: u.name,
        avatar: u.avatar,
      })),
      newHostId,
    });

    // Fetch the user for the system message
    const user = await User.findById(userId);
    if (user) {
      const sysMsg = await Message.create({
        roomId: room._id,
        userId: user._id,
        userName: user.name,
        userAvatar: user.avatar,
        message: `${user.name} left the room`,
        type: 'system',
      });

      io.to(room.roomCode).emit(SOCKET_EVENTS.MESSAGE_RECEIVED, {
        message: sysMsg.toObject(),
      });
    }
  } catch (error) {
    console.error('Error handling user leave:', error);
  }
}
