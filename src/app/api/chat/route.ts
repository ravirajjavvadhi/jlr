import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/services/postgres';

export const maxDuration = 60; // Extend to 60s for vision reasoning

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// [MODEL MAPPER]: Ensure IDs are perfect for each provider
function mapModelId(modelId: string, provider: string): string {
    if (provider === 'groq') {
        if (modelId.includes('70b')) return 'llama-3.3-70b-versatile';
        if (modelId.includes('8b')) return 'llama-3.1-8b-instant';
        return modelId; // default
    } else {
        // OpenRouter mappings
        if (modelId === 'llama-3.3-70b-versatile') return 'meta-llama/llama-3.3-70b-instruct';
        if (modelId === 'llama-3.1-8b-instant') return 'meta-llama/llama-3.1-8b-instruct';
        if (modelId.includes('vision') && !modelId.includes('/')) return `meta-llama/${modelId}`;
        return modelId;
    }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, fileContext, userId } = body;

    // [SUPREMACY FAILOVER]: Parse list of keys for rotation
    let groqKeysRaw = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    let orKeysRaw = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

    // [PERSONAL NEURAL LINK]: Resolve user-specific key
    if (userId && userId !== 'guest') {
      try {
        const userResult = await sql`SELECT custom_api_key FROM users WHERE id = ${userId}`;
        if (userResult[0]?.custom_api_key) {
          const userKey = userResult[0].custom_api_key;
          if (provider === 'openrouter') orKeysRaw = userKey;
          else groqKeysRaw = userKey;
        }
      } catch (e) {
        console.warn("[SUPREMACY ROUTE]: Personal Link resolution failed.");
      }
    }

    const groqKeys = groqKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    const orKeys = orKeysRaw.split(',').map(k => k.trim()).filter(k => k);

    let currentModel = model;
    let currentProvider = provider;
    
    // [SUPREMACY CONTEXT]
    let finalMessages = [...messages];
    if (fileContext) {
      const systemMsg = finalMessages.find(m => m.role === 'system');
      if (systemMsg) systemMsg.content += `\n\n[ATTACHED CONTEXT]:\n${fileContext}`;
      else finalMessages.unshift({ role: 'system', content: `[ATTACHED CONTEXT]:\n${fileContext}` });
    }

    // [BEAST PERSISTENCE]: Increase attempts to ensure result
    const maxTotalAttempts = 20; 
    let totalAttempts = 0;
    let lastError = 'Universal Node Saturation';

    while (totalAttempts < maxTotalAttempts) {
      const activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;
      const baseUrl = currentProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
      
      if (activeKeys.length === 0) {
        currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
        totalAttempts++;
        if (totalAttempts > 2) break; // If both pools empty, stop
        continue;
      }

      const apiKey = activeKeys[totalAttempts % activeKeys.length];
      const mappedModel = mapModelId(currentModel, currentProvider);

      console.log(`[JLR-AI] Attempt ${totalAttempts + 1}: ${currentProvider}/${mappedModel}`);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://jlr-ai.vercel.app',
          },
          body: JSON.stringify({ model: mappedModel, messages: finalMessages, stream: true }),
        });

        if (response.ok) {
           return new Response(response.body, { 
             headers: { 
               'Content-Type': 'text/event-stream',
               'Access-Control-Allow-Origin': '*'
             } 
           });
        }

        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = (errorData.error?.message || '').toLowerCase();
        
        // Critical Auth/Model Errors - STOP and surface
        if (status === 401 || status === 404) {
           return NextResponse.json({ error: { message: `🛡️ JLR AI: Node ${status} Error (${currentProvider}). Check API keys/model support.` } }, { status });
        }

        const isSaturated = status === 429 || msg.includes('rate limit') || msg.includes('saturated') || status === 503 || status === 502;
        
        if (isSaturated) {
           // Retry logic for Beast mode
           if (currentModel === 'qwen/qwen-2.5-vl-72b-instruct' && totalAttempts < activeKeys.length) {
              // try next key for same beast
              await new Promise(r => setTimeout(r, 1000));
           } else {
              // Switch model or provider
              currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
              if (currentModel.includes('vision')) {
                 currentModel = 'meta-llama/llama-3.2-90b-vision-instruct'; 
              } else {
                 currentModel = 'llama-3.1-8b-instant';
              }
           }
        }
        lastError = msg || `Status ${status}`;

      } catch (err: any) {
        console.error(`[JLR-AI FAIL]:`, err.message);
        currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
      }

      totalAttempts++;
    }

    return NextResponse.json({ error: { message: `⚠️ JLR AI Supremacy: ${lastError}` } }, { status: 503 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
