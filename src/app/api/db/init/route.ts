import { NextResponse } from 'next/server';
import { initDatabase } from '@/services/postgres';

export async function GET() {
  try {
    console.log('[SUPREMACY SETUP]: Manually triggering DB initialization...');
    await initDatabase();
    return NextResponse.json({ 
      success: true, 
      message: 'SUPREMACY DB INITIALIZED: Neural Vaults are now online and ready for deployment.' 
    });
  } catch (err: any) {
    console.error('[SUPREMACY SETUP ERROR]:', err);
    return NextResponse.json({ 
      success: false, 
      error: err.message,
      advice: 'Ensure your POSTGRES_URL is correctly set in the Vercel Dashboard.'
    }, { status: 500 });
  }
}
