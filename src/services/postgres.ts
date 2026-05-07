import postgres from 'postgres';

// [SUPREMACY CORE]: Initialize the high-stability postgres driver
// Use ssl: 'require' for Supabase/Vercel compatibility
const sql = postgres(process.env.POSTGRES_URL!, {
  ssl: 'require',
  connect_timeout: 10,
  max: 10
});

export { sql };

let isInitialized = false;

export async function initDatabase() {
  if (isInitialized) return;
  
  try {
    console.log('[SUPREMACY DB]: Initiating Schema Link...');
    // Create tables
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        custom_api_key TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Ensure the custom_api_key column exists
    try {
      await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS custom_api_key TEXT;`;
    } catch {}


    await sql`
      CREATE TABLE IF NOT EXISTS chats (
        id TEXT PRIMARY KEY,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        model TEXT DEFAULT 'JLR-SUPREME-ULTRA',
        messages JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `;

    // Ensure the model column exists for existing tables
    try {
      await sql`ALTER TABLE chats ADD COLUMN IF NOT EXISTS model TEXT DEFAULT 'llama-3.3-70b-versatile';`;
    } catch {}

    isInitialized = true;
    console.log('[SUPREMACY DB]: Neural Vaults Verified');

  } catch (err) {
    console.error('[SUPREMACY DB ERROR]:', err);
    if (!isInitialized) throw err;
  }
}


