import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge'; // Use Edge for fast streaming

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, provider, fileContext } = await req.json();

    // [SUPREMACY FAILOVER]: Parse list of keys for rotation
    const groqKeysRaw = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    const groqKeys = groqKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    
    const orKeysRaw = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    const orKeys = orKeysRaw.split(',').map(k => k.trim()).filter(k => k);

    let currentModel = model;
    let currentProvider = provider;
    let attempts = 0;
    const maxAttempts = Math.min(3, groqKeys.length + orKeys.length + 1);

    // Fallback chain for models
    const MODEL_FALLBACKS: Record<string, string> = {
      'llama-3.3-70b-versatile': 'llama-3.1-8b-instant',
      'llama-3.1-70b-versatile': 'llama-3.1-8b-instant',
      'qwen/qwen-2.5-vl-72b-instruct': 'meta-llama/llama-3.2-3b-instruct'
    };

    while (attempts < maxAttempts) {
      attempts++;
      
      let apiKey = '';
      if (currentProvider === 'openrouter') {
        apiKey = orKeys[(attempts - 1) % orKeys.length] || orKeys[0];
      } else {
        apiKey = groqKeys[(attempts - 1) % groqKeys.length] || groqKeys[0];
      }

      if (!apiKey) {
        return NextResponse.json({ error: { message: `Missing API Key for ${currentProvider}` } }, { status: 500 });
      }

    const baseUrl = currentProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
    
    // [SUPREMACY CONTEXT]: Restore document injection
    let finalMessages = [...messages];
    if (fileContext) {
      const systemMsg = finalMessages.find(m => m.role === 'system');
      if (systemMsg) {
        systemMsg.content += `\n\n[ATTACHED CONTEXT]:\n${fileContext}`;
      } else {
        finalMessages.unshift({ role: 'system', content: `[ATTACHED CONTEXT]:\n${fileContext}` });
      }
    }

    console.log(`[SUPREMACY ROUTE]: Attempt ${attempts} using ${currentModel} on ${currentProvider}...`);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://jlr-ai.vercel.app',
        'X-Title': 'JLR AI Supremacy'
      },
      body: JSON.stringify({
        model: currentModel,
        messages: finalMessages,
        stream: true,
      }),
    });

      if (response.ok) {
        // [SUCCESS]: Stream the response back
        return new Response(response.body, {
          headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive',
          },
        });
      }

      // [FAILOVER LOGIC]: Handle Rate Limits (429) or Service Overload (503)
      if (response.status === 429 || response.status === 503) {
        console.warn(`[SUPREMACY FAILOVER]: Node ${currentModel} saturated. Rerouting...`);
        
        // If we have more keys, the next loop will use the next key.
        // If we are on the last attempt or out of keys, try a lighter model.
        if (attempts >= groqKeys.length && currentProvider === 'groq') {
          if (MODEL_FALLBACKS[currentModel]) {
            currentModel = MODEL_FALLBACKS[currentModel];
            console.log(`[SUPREMACY FAILOVER]: Downgrading to lightweight core: ${currentModel}`);
          } else {
            // Try OpenRouter as a last resort provider
            currentProvider = 'openrouter';
            currentModel = 'deepseek/deepseek-chat';
          }
        }
        continue; // Try again with the updated params
      }

      // If it's a different error, don't retry (e.g. 400 Bad Request)
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ error: { message: errorData.error?.message || `Provider failure: ${response.status}` } }, { status: response.status });
    }

    return NextResponse.json({ error: { message: 'SUPREMACY COLLAPSE: All neural links are saturated. Please upgrade to Dev Tier or add more keys.' } }, { status: 429 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}

