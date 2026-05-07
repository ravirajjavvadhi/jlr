import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const { username, password } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: 'Username and password required' }, { status: 400 });
    }

    if (action === 'signup') {
      const hashedPassword = await bcrypt.hash(password, 10);
      try {
        const result = await sql`
          INSERT INTO users (username, password)
          VALUES (${username.toLowerCase()}, ${hashedPassword})
          RETURNING id, username;
        `;
        return NextResponse.json({ user: result.rows[0] });
      } catch (err: any) {
        if (err.code === '23505') { // Unique violation
          return NextResponse.json({ error: 'Identity already established' }, { status: 409 });
        }
        throw err;
      }
    }

    if (action === 'login') {
      const result = await sql`
        SELECT * FROM users WHERE username = ${username.toLowerCase()};
      `;

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Identity not found' }, { status: 404 });
      }

      const user = result.rows[0];
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
    console.error('[AUTH API ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
