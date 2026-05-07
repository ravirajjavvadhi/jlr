import { NextRequest, NextResponse } from 'next/server';
import { sql, initDatabase } from '@/services/postgres';

export async function GET(req: NextRequest) {
  try {
    await initDatabase(); // [SUPREMACY SYNC]: Ensure column exists
    
    // [COMMANDER VERIFICATION]: Only Raviraj can access this vault
    const { searchParams } = new URL(req.url);
    const commander = searchParams.get('commander');
    
    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    const users = await sql`
      SELECT id, username, custom_api_key, created_at 
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
    await initDatabase(); // [SUPREMACY SYNC]: Ensure column exists
    const { commander, targetUserId, keys } = await req.json();

    if (commander !== 'raviraj') {
      return NextResponse.json({ error: 'Access Denied: Supreme Authority required.' }, { status: 403 });
    }

    if (!targetUserId) {
      return NextResponse.json({ error: 'Target Node ID required.' }, { status: 400 });
    }

    await sql`
      UPDATE users 
      SET custom_api_key = ${keys} 
      WHERE id = ${targetUserId};
    `;

    return NextResponse.json({ success: true, message: 'Neural Node Link Updated.' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
