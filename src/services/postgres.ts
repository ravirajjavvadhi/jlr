import { sql } from '@vercel/postgres';

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;
  
  try {
    // [SUPREMACY OPTIMIZATION]: Run both table checks in parallel to save critical milliseconds
    await Promise.all([
      sql`
        CREATE TABLE IF NOT EXISTS users (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          username TEXT UNIQUE NOT NULL,
          password TEXT NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `,
      sql`
        CREATE TABLE IF NOT EXISTS chats (
          id TEXT PRIMARY KEY,
          user_id UUID REFERENCES users(id) ON DELETE CASCADE,
          title TEXT,
          messages JSONB DEFAULT '[]'::jsonb,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
      `
    ]);

    isInitialized = true;
    console.log('[SUPREMACY DB]: Schema Verified/Initialized');
  } catch (err) {
    console.error('[SUPREMACY DB ERROR]:', err);
    // Don't throw if it's already initialized by another concurrent request
    if (!isInitialized) throw err;
  }
}

