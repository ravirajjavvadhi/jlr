import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/services/postgres';

export const maxDuration = 60; // Extend to 60s for vision reasoning

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// [MODEL MAPPER]: Ensure IDs are perfect for each provider
function mapModelId(modelId: string, provider: string): string {
    const isVision = modelId.includes('vision') || modelId.includes('vl') || modelId.includes('llava');
    if (provider === 'groq') {
        if (isVision) return modelId; // Preserve vision IDs exactly (e.g. llama-3.2-90b-vision-preview)
        if (modelId.includes('70b')) return 'llama-3.3-70b-versatile';
        if (modelId.includes('8b')) return 'llama-3.1-8b-instant';
        return modelId;
    } else {
        // OpenRouter mappings
        if (modelId === 'llama-3.3-70b-versatile') return 'meta-llama/llama-3.3-70b-instruct';
        if (modelId === 'llama-3.1-8b-instant') return 'meta-llama/llama-3.1-8b-instruct';
        if (isVision && !modelId.includes('/')) return `meta-llama/${modelId}`;
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
    // [BEAST PERSISTENCE]: Increase attempts to ensure result
    const maxTotalAttempts = 5 * (groqKeys.length + orKeys.length || 1); 
    let totalAttempts = 0;
    let lastError = 'Universal Node Saturation';

    while (totalAttempts < maxTotalAttempts) {
      let activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;
      
      // If selected provider has no keys, seamlessly swap and remap model
      if (activeKeys.length === 0) {
        currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
        activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;
        const isVision = currentModel.includes('vision') || currentModel.includes('vl');
        
        if (currentProvider === 'openrouter') {
            currentModel = isVision ? 'qwen/qwen-2.5-vl-72b-instruct' : 'meta-llama/llama-3.3-70b-instruct';
        } else {
            currentModel = isVision ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
        }

        if (activeKeys.length === 0) {
            return NextResponse.json({ error: { message: `🛡️ JLR AI: Zero valid Neural Keys found.` } }, { status: 503 });
        }
        totalAttempts++;
        continue;
      }

      const baseUrl = currentProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
      const apiKey = activeKeys[totalAttempts % activeKeys.length];
      const mappedModel = mapModelId(currentModel, currentProvider);

      console.log(`[JLR-AI] Attempt ${totalAttempts + 1}: ${currentProvider}/${mappedModel} (Key: ...${apiKey.slice(-4)})`);

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
        
        const isAuthError = status === 401 || status === 403 || status === 404;
        const isSaturated = status === 429 || msg.includes('rate limit') || msg.includes('saturated') || status === 503 || status === 502;
        
        const isVisionMode = currentModel.includes('vision') || currentModel.includes('vl');

        if (isAuthError || isSaturated || status === 400) {
           console.warn(`[JLR-AI REDIRECT]: Node ${status} encountered. Key: ...${apiKey.slice(-4)}. Re-routing...`);
           
           // If we've tried all keys for THIS provider, THEN swap provider
           if (totalAttempts > 0 && totalAttempts % activeKeys.length === 0) {
              if (currentProvider === 'openrouter') {
                 currentProvider = 'groq';
                 currentModel = isVisionMode ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
              } else {
                 currentProvider = 'openrouter';
                 currentModel = isVisionMode ? 'qwen/qwen-2.5-vl-72b-instruct' : 'meta-llama/llama-3.3-70b-instruct';
              }
           }
           await new Promise(r => setTimeout(r, 600)); 
        }
        lastError = msg || `Status ${status}`;

      } catch (err: any) {
        console.error(`[JLR-AI FAIL]:`, err.message);
      }

      totalAttempts++;
    }

    return NextResponse.json({ error: { message: `⚠️ JLR AI Supremacy: ${lastError}` } }, { status: 503 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
