import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';
import Queue from '@/models/Queue';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');
    } catch (e) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const userId = decoded.userId;

    await connectDB();

    // Find all rooms hosted by this user
    const rooms = await Room.find({ hostId: userId }).sort({ createdAt: -1 });

    // For each room, get the queue length
    const roomsWithStats = await Promise.all(
      rooms.map(async (room) => {
        const queueCount = await Queue.countDocuments({ roomId: room._id });
        return {
          id: room._id.toString(),
          roomCode: room.roomCode,
          createdAt: room.createdAt,
          queueCount,
        };
      })
    );

    return NextResponse.json({ success: true, rooms: roomsWithStats });
  } catch (error) {
    console.error('Fetch rooms error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
