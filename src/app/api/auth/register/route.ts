import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';

function generateAvatar(seed: string): string {
  return `https://api.dicebear.com/9.x/fun-emoji/svg?seed=${encodeURIComponent(seed)}`;
}

export async function POST(req: Request) {
  try {
    const { name, email, password } = await req.json();

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
    }

    await connectDB();

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json({ error: 'Email is already registered' }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const avatar = generateAvatar(name);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      avatar,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        avatar: user.avatar,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
