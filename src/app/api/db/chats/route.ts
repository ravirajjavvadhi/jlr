import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import { initDatabase } from '@/services/postgres';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);


    const userId = searchParams.get('userId');

    if (!userId) return NextResponse.json({ error: 'User ID required' }, { status: 400 });

    const result = await sql`
      SELECT * FROM chats WHERE user_id = ${userId} ORDER BY updated_at DESC;
    `;
    
    return NextResponse.json({ chats: result.rows });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { chatId, userId, title, messages } = await req.json();


    if (!chatId || !userId) {
      return NextResponse.json({ error: 'ChatID and UserID required' }, { status: 400 });
    }

    // Upsert logic for PostgreSQL
    const result = await sql`
      INSERT INTO chats (id, user_id, title, messages, updated_at)
      VALUES (${chatId}, ${userId}, ${title}, ${JSON.stringify(messages)}, CURRENT_TIMESTAMP)
      ON CONFLICT (id) 
      DO UPDATE SET 
        title = EXCLUDED.title, 
        messages = EXCLUDED.messages, 
        updated_at = CURRENT_TIMESTAMP;
    `;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[DB CHAT SAVE ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const chatId = searchParams.get('chatId');

    if (!chatId) return NextResponse.json({ error: 'Chat ID required' }, { status: 400 });

    await sql`DELETE FROM chats WHERE id = ${chatId};`;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
