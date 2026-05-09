import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();
    
    const { searchParams } = new URL(req.url);
    const commander = searchParams.get('commander');
    
    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    const usersRaw = await User.find({}).sort({ createdAt: -1 });
    
    // Transform for frontend compatibility (id instead of _id, created_at instead of createdAt)
    const users = usersRaw.map(u => ({
      id: u._id.toString(),
      username: u.username,
      custom_api_key: u.custom_api_key,
      gemini_api_keys: Array.isArray(u.gemini_api_keys) ? u.gemini_api_keys.join(',') : u.gemini_api_keys,
      created_at: u.createdAt
    }));

    return NextResponse.json({ users });
  } catch (err: any) {
    console.error('[ADMIN FETCH ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectToDatabase();
    const { commander, targetUserId, keys, geminiKeys } = await req.json();

    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target Node ID required.' }, { status: 400 });
    }

    // Atomic update for Groq and Gemini key arrays
    const updateData: any = {};
    if (keys !== undefined) updateData.custom_api_key = keys;
    
    if (geminiKeys !== undefined) {
      // Handle string input from frontend textarea (comma separated)
      if (typeof geminiKeys === 'string') {
        updateData.gemini_api_keys = geminiKeys.split(',').map(k => k.trim()).filter(k => k);
      } else {
        updateData.gemini_api_keys = geminiKeys;
      }
    }

    await User.findByIdAndUpdate(targetUserId, updateData);

    return NextResponse.json({ success: true, message: 'Neural Node Link Updated.' });
  } catch (err: any) {
    console.error('[ADMIN UPDATE ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
