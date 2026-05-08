import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/services/postgres';

export async function GET(req: NextRequest) {
  try {
    await initDatabase();
    
    const { searchParams } = new URL(req.url);
    const commander = searchParams.get('commander');
    
    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    const users = await sql`
      SELECT id, username, custom_api_key, gemini_api_keys, created_at 
      FROM users 
      ORDER BY created_at DESC;
    `;

    return NextResponse.json({ users });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await initDatabase();
    const { commander, targetUserId, keys, geminiKeys } = await req.json();

    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target Node ID required.' }, { status: 400 });
    }

    // Update both Groq and Gemini keys in one shot
    await sql`
      UPDATE users 
      SET 
        custom_api_key = COALESCE(${keys ?? null}, custom_api_key),
        gemini_api_keys = COALESCE(${geminiKeys ?? null}, gemini_api_keys)
      WHERE id = ${targetUserId};
    `;

    return NextResponse.json({ success: true, message: 'Neural Node Link Updated.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
