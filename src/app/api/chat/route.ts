import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for fast streaming

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, provider, fileContext } = await req.json();

    const apiKey = provider === 'openrouter' 
      ? (process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY)
      : (process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY);

    if (!apiKey) {
      return NextResponse.json({ error: { message: `Missing API Key for ${provider}` } }, { status: 500 });
    }

    const baseUrl = provider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
    
    // Intelligence injection for documents
    let finalMessages = [...messages];
    if (fileContext) {
      const systemMsg = finalMessages.find(m => m.role === 'system');
      if (systemMsg) {
        systemMsg.content += `\n\n[ATTACHED CONTEXT]:\n${fileContext}`;
      }
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jlr-ai.vercel.app',
        'X-Title': 'JLR AI Supremacy'
      },
      body: JSON.stringify({
        model: model,
        messages: finalMessages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: { message: errorData.error?.message || `Provider status ${response.status}` } }, { status: response.status });
    }

    // Stream the response back to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
