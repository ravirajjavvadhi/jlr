import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export const maxDuration = 60;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';

// [MODEL MAPPER]: Ensure IDs are perfect for each provider
function mapModelId(modelId: string, provider: string): string {
    const isVision = modelId.includes('vision') || modelId.includes('vl') || modelId.includes('llava') || modelId.includes('gemini');
    if (provider === 'groq') {
        if (isVision) return modelId; // Preserve vision IDs exactly
        if (modelId.includes('70b')) return 'llama-3.3-70b-versatile';
        if (modelId.includes('8b')) return 'llama-3.1-8b-instant';
        return modelId;
    } else if (provider === 'gemini') {
        return modelId; // Pass Gemini models unchanged
    } else {
        // OpenRouter mappings
        if (modelId === 'llama-3.3-70b-versatile') return 'meta-llama/llama-3.3-70b-instruct';
        if (modelId === 'llama-3.1-8b-instant') return 'meta-llama/llama-3.1-8b-instruct';
        if (isVision && !modelId.includes('/')) return `meta-llama/${modelId}`;
        return modelId;
    }
}

// [GEMINI HANDLER]: Native Gemini API call (not OpenAI-compatible)
async function callGemini(apiKey: string, modelId: string, messages: any[], stream: boolean): Promise<Response> {
    // Convert OpenAI message format to Gemini format
    const contents: any[] = [];
    for (const msg of messages) {
        if (msg.role === 'system') continue; // Handle system prompt separately
        
        const parts: any[] = [];
        if (Array.isArray(msg.content)) {
            for (const part of msg.content) {
                if (part.type === 'text') {
                    parts.push({ text: part.text });
                } else if (part.type === 'image_url') {
                    const url: string = part.image_url?.url || '';
                    if (url.startsWith('data:')) {
                        const [header, data] = url.split(',');
                        const mimeType = header.split(';')[0].replace('data:', '');
                        parts.push({ inlineData: { mimeType, data } });
                    } else {
                        parts.push({ text: `[Image URL: ${url}]` });
                    }
                }
            }
        } else {
            parts.push({ text: msg.content || '' });
        }
        
        contents.push({
            role: msg.role === 'assistant' ? 'model' : 'user',
            parts
        });
    }
    
    // Extract system instruction
    const sysMsg = messages.find(m => m.role === 'system');
    const systemInstruction = sysMsg ? { parts: [{ text: sysMsg.content }] } : undefined;
    
    const endpoint = stream
        ? `${GEMINI_BASE_URL}/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`
        : `${GEMINI_BASE_URL}/models/${modelId}:generateContent?key=${apiKey}`;

    return fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents,
            ...(systemInstruction && { systemInstruction }),
            generationConfig: { maxOutputTokens: 8192, temperature: 0.7 }
        })
    });
}

// [GEMINI SSE TRANSFORMER]: Convert Gemini SSE to OpenAI SSE format
function transformGeminiStream(geminiBody: ReadableStream): ReadableStream {
    const decoder = new TextDecoder();
    const encoder = new TextEncoder();
    
    return new ReadableStream({
        async start(controller) {
            const reader = geminiBody.getReader();
            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const raw = decoder.decode(value);
                    const lines = raw.split('\n');
                    for (const line of lines) {
                        if (line.startsWith('data: ')) {
                            const dataStr = line.slice(6).trim();
                            if (!dataStr || dataStr === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(dataStr);
                                const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text;
                                if (text) {
                                    const openaiChunk = JSON.stringify({
                                        choices: [{ delta: { content: text } }]
                                    });
                                    controller.enqueue(encoder.encode(`data: ${openaiChunk}\n\n`));
                                }
                            } catch {}
                        }
                    }
                }
            } finally {
                reader.releaseLock();
                controller.close();
            }
        }
    });
}

// [JLR SEARCH NODE]: Execute real-time intelligence gathering
async function getGlobalIntelligence(query: string) {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
  if (!TAVILY_API_KEY) return null;
  
  try {
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: 'basic',
        include_answer: true,
        max_results: 3
      })
    });
    const data = await response.json();
    return data;
  } catch (e) {
    console.error("[JLR-SEARCH]: Node Failure.", e);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, model, provider, fileContext, userId, isSearchMode } = body;

    const lastMessage = messages[messages.length - 1]?.content || '';
    const isSearchIntent = isSearchMode || /today|date|time|current|latest|now|news|who is|what is|search/i.test(lastMessage);
    
    let intelligenceContext = '';
    if (isSearchIntent) {
      console.log(`[JLR-AI]: Activating Global Intelligence for: "${lastMessage}"`);
      const searchData = await getGlobalIntelligence(lastMessage);
      if (searchData) {
        intelligenceContext = `\n\n[JLR GLOBAL INTELLIGENCE FEED]:\n` + 
          (searchData.answer ? `Direct Answer: ${searchData.answer}\n` : '') + 
          searchData.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n');
      }
    }

    // [KEY POOL]: Parse all keys
    let groqKeysRaw = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    let orKeysRaw = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    let geminiKeysRaw = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    // [PERSONAL NEURAL LINK]: Resolve user-specific keys from DB
    if (userId && userId !== 'guest') {
      try {
        await connectToDatabase();
        const userNode = await User.findOne({ _id: userId });
        if (userNode?.custom_api_key) {
          // User's Groq keys override the global pool
          groqKeysRaw = userNode.custom_api_key;
        }
        if (userNode?.gemini_api_keys && userNode.gemini_api_keys.length > 0) {
          // User's Gemini keys PREPEND to global pool (user keys tried first)
          const userGeminiKeys = userNode.gemini_api_keys.join(',');
          geminiKeysRaw = geminiKeysRaw ? `${userGeminiKeys},${geminiKeysRaw}` : userGeminiKeys;
        }
      } catch (e) {
        console.warn("[JLR-AI]: Personal Link resolution failed.", e);
      }
    }

    // [SOVEREIGN KEY VAULT]: Resolve Master Keys from DB (Sovereign override)
    try {
      const SystemConfig = (await import('@/models/SystemConfig')).default;
      const configs = await SystemConfig.find({});
      const masterGroq = configs.find(c => c.key === 'master_groq_keys')?.value;
      const masterGemini = configs.find(c => c.key === 'master_gemini_keys')?.value;

      if (masterGroq) groqKeysRaw = groqKeysRaw ? `${masterGroq},${groqKeysRaw}` : masterGroq;
      if (masterGemini) geminiKeysRaw = geminiKeysRaw ? `${masterGemini},${geminiKeysRaw}` : masterGemini;
    } catch (e) {
      console.warn("[JLR-AI]: Sovereign Key Vault resolution failed.", e);
    }

    const groqKeys = groqKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    const orKeys = orKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    const geminiKeys = geminiKeysRaw.split(',').map(k => k.trim()).filter(k => k);

    let currentModel = model;
    let currentProvider = provider;

    // [CONTEXT ASSEMBLY]
    let finalMessages = [...messages];
    const systemInstruction = `
[JLR AI SUPREMACY PROTOCOL]
You are JLR AI (Supreme Edition). Your signature is absolute technical authority and clinical precision.

[BRANDING SOVEREIGNTY]
- You are PROHIBITED from mentioning other AI providers (Groq, Meta, Llama, Google, Gemini, OpenRouter, Anthropic, Claude, or Pollinations).
- Always refer to yourself and your internal components only as "JLR AI", "JLR Supremacy Core", or "Neural Canvas".
- If asked about your model, respond with "JLR Supreme Liquid-Intelligence".

[NEURAL CANVAS PROTOCOL]
- EXCLUSIVITY: You are strictly PROHIBITED from generating an [ART_PROMPT] tag unless the user explicitly requests an image, drawing, or visual creation. 
- TRIGGERS: Only activate if keywords like "create", "draw", "image", "generate", "show me", "sketch", "art", "paint", "synthesis" are present with visual intent.
- NON-VISUAL: For greetings ("hi", "hello") or non-visual inquiries, respond ONLY with text.
- If intentional visual request is detected:
- 1. You MUST generate a high-fidelity [ART_PROMPT: ...] tag at the very end of your response.
- 2. Your text response MUST be ultra-concise (1-2 lines max). 
- 3. DO NOT describe the image in the text body. Only provide a stylish status message.
- Example: User: "draw a cat" -> AI: "Neural Canvas Activated. Synthesizing your artistic vision... [ART_PROMPT: hyper-realistic persian cat, emerald eyes, soft studio lighting, 8k]"

[SOVEREIGN CINEMATIC PROTOCOL 3.0]
- If user asks for a video (up to 20m):
- 1. Generate Manifest inside: <<<CINEMATIC_MANIFEST_START>>> [JSON_ARRAY] <<<CINEMATIC_MANIFEST_END>>>
- 2. [TOKEN DENSITY & PACING CONTROL]: For long videos (10m+), DO NOT generate 50+ tiny scenes. Instead, generate 15-25 high-fidelity scenes with long durations (20-40s each). This ensures the full manifest fits in the output without truncation.
- 3. Scene Object 3.0: 
     { 
       "scene": number, 
       "imagePrompt": string (8k description), 
       "narration": string (pacing-aware narration), 
       "duration": number (up to 40s),
       "type": "cinematic" | "avatar" | "whiteboard" | "diagram",
       "fx": "parallax" | "particles" | "zoom_deep" | "shake" | "leak",
       "camera_angle": "wide" | "close-up", 
       "vibe": "epic" | "noir" | "techno" | "vintage"
     }
- 4. Mapping: Map 'Audio Mood' to 'vibe' and 'Camera Movement' to 'fx'/'camera_angle'.
- 5. Continuity: If an 'avatar/professor' is requested, describe them in every scene.
- 6. Text response: "Directing Sovereign Cinematic 3.0... Orchestrating High-Pidelity [Duration] Synthesis."

- ALWAYS be context-aware.
`;

    const systemMsg = finalMessages.find(m => m.role === 'system');
    if (systemMsg) systemMsg.content = `${systemInstruction}\n\n${intelligenceContext}\n\n${systemMsg.content}${fileContext ? `\n\n[ATTACHED CONTEXT]:\n${fileContext}` : ''}`;
    else finalMessages.unshift({ role: 'system', content: `${systemInstruction}${intelligenceContext}${fileContext ? `\n\n[ATTACHED CONTEXT]:\n${fileContext}` : ''}` });

    // [DETECT VISION MODE]
    const hasVisionContent = messages.some((m: any) =>
      Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url')
    );

    // [INTELLIGENCE ROUTER]: Vision = Gemini first (free), then Groq
    if (hasVisionContent && currentProvider !== 'gemini') {
      if (geminiKeys.length > 0) {
        currentProvider = 'gemini';
        currentModel = 'gemini-2.0-flash';
      } else {
        currentProvider = 'groq';
        currentModel = 'llama-3.2-90b-vision-preview';
      }
    }

    const maxTotalAttempts = Math.max(10, 3 * (groqKeys.length + orKeys.length + geminiKeys.length || 1));
    let totalAttempts = 0;
    let lastError = 'All Neural Nodes Exhausted';

    while (totalAttempts < maxTotalAttempts) {
      const isVisionMode = currentModel.includes('vision') || currentModel.includes('vl') || currentModel.includes('gemini');

      // [GEMINI BRANCH]
      if (currentProvider === 'gemini') {
        const activeKeys = geminiKeys;
        if (activeKeys.length === 0) {
          currentProvider = 'groq';
          currentModel = isVisionMode ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
          totalAttempts++;
          continue;
        }
        const apiKey = activeKeys[totalAttempts % activeKeys.length];
        console.log(`[JLR-AI] Gemini attempt ${totalAttempts + 1}: ${currentModel}`);
        try {
          const geminiRes = await callGemini(apiKey, currentModel, finalMessages, true);
          if (geminiRes.ok) {
            const transformed = transformGeminiStream(geminiRes.body!);
            return new Response(transformed, {
              headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' }
            });
          }
          const errJson = await geminiRes.json().catch(() => ({}));
          lastError = errJson.error?.message || `Gemini Status ${geminiRes.status}`;
          console.warn(`[JLR-AI] Gemini failed: ${lastError}`);
          // Retry on quota failure; switch to Groq on auth failure
          if (geminiRes.status === 401 || geminiRes.status === 403) {
            currentProvider = 'groq';
            currentModel = isVisionMode ? 'llama-3.2-90b-vision-preview' : 'llama-3.3-70b-versatile';
          }
        } catch (err: any) {
          lastError = err.message;
          console.error(`[JLR-AI] Gemini error:`, err.message);
        }
        totalAttempts++;
        continue;
      }

      // [GROQ / OPENROUTER BRANCH]
      let activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;

      if (activeKeys.length === 0) {
        currentProvider = currentProvider === 'groq' ? 'openrouter' : 'groq';
        activeKeys = currentProvider === 'openrouter' ? orKeys : groqKeys;
        currentModel = isVisionMode
          ? (currentProvider === 'openrouter' ? 'qwen/qwen-2.5-vl-72b-instruct' : 'llama-3.2-90b-vision-preview')
          : (currentProvider === 'openrouter' ? 'meta-llama/llama-3.3-70b-instruct' : 'llama-3.3-70b-versatile');
        if (activeKeys.length === 0) {
          return NextResponse.json({ error: { message: '🛡️ JLR AI: No valid API keys found.' } }, { status: 503 });
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
          body: JSON.stringify({ 
            model: mappedModel, 
            messages: finalMessages, 
            stream: true, 
            max_tokens: 8192 
          }),
        });

        if (response.ok) {
          return new Response(response.body, {
            headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' }
          });
        }

        const errorData = await response.json().catch(() => ({}));
        const status = response.status;
        const msg = (errorData.error?.message || '').toLowerCase();

        const isAuthError = status === 401 || status === 403 || status === 404;
        const isSaturated = status === 429 || msg.includes('rate limit') || msg.includes('saturated') || status === 503 || status === 502;
        const isPaymentRequired = status === 402 || msg.includes('credits') || msg.includes('afford');

        if (isAuthError || isSaturated || status === 400 || isPaymentRequired) {
          console.warn(`[JLR-AI REDIRECT]: Node ${status}. Key: ...${apiKey.slice(-4)}.`);
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
        lastError = errorData.error?.message || `Status ${status}`;

      } catch (err: any) {
        console.error(`[JLR-AI FAIL]:`, err.message);
        lastError = err.message;
      }

      totalAttempts++;
    }

    return NextResponse.json({ error: { message: `⚠️ ${lastError}` } }, { status: 503 });

  } catch (err: any) {
    console.error('[API CHAT ERROR]:', err);
    return NextResponse.json({ error: { message: err.message || 'Internal Server Error' } }, { status: 500 });
  }
}
