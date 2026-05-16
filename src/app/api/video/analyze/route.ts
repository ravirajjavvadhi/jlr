import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export const maxDuration = 300; // 5 minutes for long video processing

const GEMINI_API_KEY = 'AIzaSyD5V_C0fvdsktygZBmLelv8nHnoC4T_bK4'; // Sovereign Key provided by Commander
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_FILE_URL = 'https://generativelanguage.googleapis.com/v1beta/files';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

async function uploadToGemini(blob: Blob, mimeType: string, filename: string) {
  const uploadMetadata = {
    file: { display_name: filename }
  };

  const metadataJson = JSON.stringify(uploadMetadata);
  const metadataBlob = new Blob([metadataJson], { type: 'application/json' });

  const formData = new FormData();
  formData.append('metadata', metadataBlob);
  formData.append('file', blob);

  // Gemini Upload Protocol (Multipart)
  const res = await fetch(`${GEMINI_UPLOAD_URL}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: {
      'X-Goog-Upload-Protocol': 'multipart'
    },
    body: formData
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Upload failed: ${err}`);
  }

  const data = await res.json();
  return data.file;
}

async function waitForFileActive(fileUri: string) {
  const fileId = fileUri.split('/').pop();
  let attempts = 0;
  while (attempts < 20) {
    const res = await fetch(`${GEMINI_FILE_URL}/${fileId}?key=${GEMINI_API_KEY}`);
    const data = await res.json();
    if (data.state === 'ACTIVE') return data;
    if (data.state === 'FAILED') throw new Error('File processing failed in Gemini');
    
    await new Promise(r => setTimeout(r, 4000)); // Wait 4s
    attempts++;
  }
  throw new Error('File processing timeout');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const videoFile = formData.get('video') as File;
    const userPrompt = formData.get('prompt') as string || 'Analyze this video and provide a detailed script synchronized with timestamps.';

    if (!videoFile) return NextResponse.json({ error: 'No video file provided' }, { status: 400 });

    console.log(`[VIDEO-INTEL] Received file: ${videoFile.name}, size: ${videoFile.size}`);

    // [STEP 1]: Upload to Gemini File API
    const fileInfo = await uploadToGemini(videoFile, videoFile.type, videoFile.name);
    console.log(`[VIDEO-INTEL] Uploaded: ${fileInfo.uri}`);

    // [STEP 2]: Wait for processing
    await waitForFileActive(fileInfo.uri);
    console.log(`[VIDEO-INTEL] File Active`);

    // [STEP 3]: Detailed Prompt Engineering
    const systemInstruction = `You are a professional video analyzer and scriptwriter for JLR AI.
    Your task is to provide a "pin-to-pin" synchronized script of the provided video.
    
    [REQUIREMENTS]
    1. TIMESTAMPS: Use exact MM:SS format.
    2. SCRIPTING: Provide a verbatim or highly accurate narrative of everything happening (visuals and audio).
    3. SYNC: Ensure every major event or visual change has a timestamp.
    4. ACCURACY: If the video is a website presentation, include all technical details, tab switches, and UI elements mentioned.
    5. FORMAT: Use Markdown with bold timestamps.
    
    [OUTPUT EXAMPLE]
    **00:05** - Introduction begins with the JLR logo.
    **00:45** - The presenter switches to the Dashboard view.
    ...`;

    // [STEP 4]: Generate Analysis
    const generateRes = await fetch(`${GEMINI_BASE_URL}/gemini-1.5-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [
            { text: userPrompt },
            { fileData: { mimeType: videoFile.type, fileUri: fileInfo.uri } }
          ]
        }],
        systemInstruction: { parts: [{ text: systemInstruction }] },
        generationConfig: { temperature: 0.2, maxOutputTokens: 8192 }
      })
    });

    if (!generateRes.ok) {
        const err = await generateRes.text();
        throw new Error(`Generation failed: ${err}`);
    }

    const data = await generateRes.json();
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No analysis generated.';

    return NextResponse.json({ 
      success: true, 
      analysis: resultText,
      fileUri: fileInfo.uri 
    });

  } catch (err: any) {
    console.error('[VIDEO-ANALYZER ERROR]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
