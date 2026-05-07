import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/services/postgres';

export const maxDuration = 60; // Extend to 60s for vision reasoning

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, fileContext, userId } = body;

    // [SUPREMACY FAILOVER]: Parse list of keys for rotation
    let groqKeysRaw = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    let orKeysRaw = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';

    // [PERSONAL NEURAL LINK]: Resolve user-specific key from Database
    if (userId && userId !== 'guest') {
      try {
        const userResult = await sql`SELECT custom_api_key FROM users WHERE id = ${userId}`;
        if (userResult[0]?.custom_api_key) {
          console.log(`[SUPREMACY ROUTE]: Activating Dedicated Neural Link for ${userId}`);
          const userKey = userResult[0].custom_api_key;
          if (provider === 'openrouter') orKeysRaw = userKey;
          else groqKeysRaw = userKey;
        }
      } catch (e) {
        console.warn("[SUPREMACY ROUTE]: Personal Link resolution failed, falling back to rotation pool.");
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

    const maxTotalAttempts = (groqKeys.length + orKeys.length) * 2;
    let totalAttempts = 0;

    while (totalAttempts < maxTotalAttempts) {
      // Determine active provider/keys/baseUrl for this specific attempt
      const activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;
      const baseUrl = currentProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
      const apiKey = activeKeys[totalAttempts % (activeKeys.length || 1)];

      if (!apiKey) {
        // Switch provider if current one is exhausted
        currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
        totalAttempts++;
        continue;
      }

      console.log(`[SUPREMACY RESILIENCY]: Try ${totalAttempts + 1} (${currentProvider}/${currentModel})`);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://jlr-ai.vercel.app',
            'X-Title': 'JLR AI Supremacy'
          },
          body: JSON.stringify({ model: currentModel, messages: finalMessages, stream: true }),
        });

        if (response.ok) return new Response(response.body, { 
          headers: { 
            'Content-Type': 'text/event-stream',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST, OPTIONS'
          } 
        });

        const errorData = await response.json().catch(() => ({}));
        const msg = (errorData.error?.message || '').toLowerCase();
        const isSaturated = response.status === 429 || msg.includes('rate limit') || msg.includes('tpd') || msg.includes('saturated');

        // [BEAST SOVEREIGNTY]: Zero-Degradation Retry Loop
        if (isSaturated) {
          console.warn(`[BEAST ALERT]: Node ${totalAttempts + 1} Saturated. Retrying Neural Key...`);
          // Simply continue to next key in rotation for the same model
          // If we've circled through all keys, then try the next high-tier Beast
          if (totalAttempts >= activeKeys.length && currentModel === 'qwen/qwen-2.5-vl-72b-instruct') {
             currentModel = 'meta-llama/llama-3.2-90b-vision-instruct'; // Switch to Llama 90B Beast
          }
           await new Promise(r => setTimeout(r, 1000)); // 1s cooldown for Beast recovery
        }

      } catch (err) {
        console.error(`[SUPREMACY FAIL]: attempt ${totalAttempts}`, err);
      }

      totalAttempts++;
      await new Promise(r => setTimeout(r, 100)); // Ultra-fast retry
    }

    return NextResponse.json({ error: { message: '⚠️ JLR AI Supremacy: Universal Node Saturation. Please standby... ⚡' } }, { status: 503 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
