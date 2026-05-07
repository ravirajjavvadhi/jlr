import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/services/postgres';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const action = searchParams.get('action');
    const { username, password } = await req.json();

    console.log(`[AUTH API]: Action=${action}, Username=${username.toLowerCase()}`);

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (action === 'signup') {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        console.log('[AUTH DB]: Inserting User...');
        const result = await sql`
          INSERT INTO users (username, password)
          VALUES (${username.toLowerCase()}, ${hashedPassword})
          RETURNING id, username;
        `;
        console.log('[AUTH DB]: User Inserted Successfully');
        return NextResponse.json({ user: result[0] });
      } catch (err: any) {
        console.error('[AUTH DB INSERT ERROR]:', err);
        if (err.code === '23505') { // Unique violation
          return NextResponse.json({ error: 'Identity already established' }, { status: 409 });
        }
        return NextResponse.json({ error: `DB Save Error: ${err.message}` }, { status: 500 });
      }
    }

    if (action === 'login') {
      console.log('[AUTH DB]: Querying User...');
      const result = await sql`
        SELECT * FROM users WHERE username = ${username.toLowerCase()};
      `;

      if (result.length === 0) {
        return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
      }

      const user = result[0];

      const isValid = await bcrypt.compare(password, user.password);

      if (!isValid) {
        return NextResponse.json({ error: 'Invalid supremacy key' }, { status: 401 });
      }

      return NextResponse.json({ 
        user: { id: user.id, username: user.username } 
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (err: any) {
    console.error('[AUTH CRITICAL ERROR]:', err);
    return NextResponse.json({ error: `System Error: ${err.message}` }, { status: 500 });
  }
}

