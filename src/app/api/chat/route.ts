import { NextRequest, NextResponse } from 'next/server';
import { sql } from '@/services/postgres';

export const runtime = 'edge'; // Use Edge for fast streaming

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export async function POST(req: NextRequest) {
  try {
    const { messages, model, provider, fileContext, userId } = await req.json();

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

    let attempts = 0;
    const keys = currentProvider === 'openrouter' ? orKeys : groqKeys;
    const baseUrl = currentProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;

    if (keys.length === 0) {
      return NextResponse.json({ error: { message: `Supreme Status: No neural links active for ${currentProvider}. Checking backup...` } }, { status: 503 });
    }

    while (attempts < keys.length * 2) { // Allow two full rotations (one for primary, one for failover backup model)
      const apiKey = keys[attempts % keys.length];
      console.log(`[SUPREMACY FAILOVER]: Node ${attempts + 1} (${currentProvider}/${currentModel}) - Using Key: ${apiKey.slice(0, 8)}...`);

      try {
        const response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://jlr-ai.vercel.app', // Required for OpenRouter
            'X-Title': 'JLR AI Supremacy'
          },
          body: JSON.stringify({
            model: currentModel,
            messages: finalMessages,
            stream: true,
          }),
        });

        if (response.ok) {
          return new Response(response.body, {
            headers: {
              'Content-Type': 'text/event-stream',
              'Cache-Control': 'no-cache',
              'Connection': 'keep-alive',
            },
          });
        }

        // Handle JSON error response if possible
        const errorData = await response.json().catch(() => ({}));
        console.warn(`[SUPREMACY REDIRECT]: Node ${attempts + 1} failed (${response.status}). ${errorData.error?.message || ''}`);
        
        // [SOVEREIGN BYPASS]: If first model fails on all keys, degrade to high-capacity core
        if (attempts >= keys.length - 1 && currentModel !== 'llama-3.1-8b-instant' && currentProvider === 'groq') {
          console.log(`[SUPREMACY DEGRADE]: Primary nodes saturated. Activating High-Capacity Core (8B)...`);
          currentModel = 'llama-3.1-8b-instant';
        }

      } catch (err) {
        console.error(`[SUPREMACY CRITICAL]: Node ${attempts + 1} link failure.`, err);
      }

      attempts++;
      // Small pause before next node activation to avoid instant hammer
      await new Promise(r => setTimeout(r, 200));
    }

    return NextResponse.json({ error: { message: '⚠️ JLR AI Supremacy Node Saturated. Please standby for link restoration... ⚡' } }, { status: 503 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
