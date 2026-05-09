import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action');
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    const normalizedUsername = username.toLowerCase();

    if (action === 'signup') {
      try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = await User.create({
          username: normalizedUsername,
          password: hashedPassword
        });

        return NextResponse.json({ 
          user: { 
            id: newUser._id.toString(), 
            username: newUser.username 
          } 
        });
      } catch (err: any) {
        if (err.code === 11000) { // MongoDB duplicate key
          return NextResponse.json({ error: 'Identity already established' }, { status: 409 });
        }
        throw err;
      }
    }

    if (action === 'login') {
      const user = await User.findOne({ username: normalizedUsername });

      if (!user) {
        return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
      }

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid supremacy key' }, { status: 401 });
      }

      return NextResponse.json({ 
        user: { 
          id: user._id.toString(), 
          username: user.username, 
          custom_api_key: user.custom_api_key 
        } 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('[AUTH CRITICAL ERROR]:', err);
    return NextResponse.json({ error: `System Error: ${err.message}` }, { status: 500 });
  }
}

