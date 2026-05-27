import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import Room from '@/models/Room';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    await connectDB();

    const { code } = await params;
    const room = await Room.findOne({ roomCode: code.toUpperCase() });

    if (!room) {
      return NextResponse.json(
        { error: 'Room not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      room: {
        _id: room._id.toString(),
        roomCode: room.roomCode,
        hostId: room.hostId.toString(),
        currentVideoId: room.currentVideoId,
        currentVideoTitle: room.currentVideoTitle,
        isPlaying: room.isPlaying,
        currentTime: room.currentTime,
        users: room.users.map((u) => ({
          userId: u.userId.toString(),
          name: u.name,
          avatar: u.avatar,
        })),
        createdAt: room.createdAt,
      },
    });
  } catch (error) {
    console.error('Error fetching room:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
