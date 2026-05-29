import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: user.savedSongs || [],
    });
  } catch (error) {
    console.error('Fetch saved songs error:', error);
    return NextResponse.json({ error: 'Failed to fetch saved songs' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('x-user-id');
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { videoId, title, thumbnail, action } = await request.json();

    if (!videoId) {
      return NextResponse.json({ error: 'Missing videoId' }, { status: 400 });
    }

    await connectDB();
    const user = await User.findById(userId);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (action === 'remove') {
      user.savedSongs = user.savedSongs.filter((song) => song.videoId !== videoId) as any;
    } else {
      // Add if not already present
      if (!user.savedSongs.some((song) => song.videoId === videoId)) {
        user.savedSongs.push({ videoId, title, thumbnail } as any);
      }
    }

    await user.save();

    return NextResponse.json({
      success: true,
      data: user.savedSongs,
    });
  } catch (error) {
    console.error('Update saved songs error:', error);
    return NextResponse.json({ error: 'Failed to update saved songs' }, { status: 500 });
  }
}
