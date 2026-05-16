import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import SystemConfig from '@/models/SystemConfig';

export async function POST(req: NextRequest) {
  try {
    const { filename, mimeType, userId } = await req.json();

    await connectToDatabase();
    
    // Resolve Master Gemini Keys
    const config = await SystemConfig.findOne({ key: 'master_gemini_keys' });
    const geminiKeys = config?.value ? config.value.split(',').map((k: string) => k.trim()).filter((k: string) => k) : [];
    
    if (geminiKeys.length === 0) {
      return NextResponse.json({ error: 'No Sovereign Keys found' }, { status: 500 });
    }

    const apiKey = geminiKeys[0];
    const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';

    // Initialize Resumable Upload
    const res = await fetch(`${GEMINI_UPLOAD_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': '0', // We don't know the size yet or it's handled by client
        'X-Goog-Upload-Header-Content-Type': mimeType,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        file: { display_name: filename }
      })
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error('[GEMINI-UPLOAD-INIT] failed:', errorText);
      return NextResponse.json({ error: `Upload initialization failed: ${errorText}` }, { status: res.status });
    }

    const uploadUrl = res.headers.get('X-Goog-Upload-URL');
    // The response body for 'start' command doesn't contain the URI yet, 
    // but the final URI will be based on the file ID returned in the headers or final upload response.
    // Actually, for Gemini, we just need the Upload-URL to push the bytes.
    
    return NextResponse.json({ 
      uploadUrl,
      status: 'initialized'
    });

  } catch (error: any) {
    console.error('[API-INIT-UPLOAD] error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
