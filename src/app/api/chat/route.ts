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

[SOVEREIGN CINEMATIC PROTOCOL 3.0]
- If user asks for a video (up to 20m):
- 1. Generate Manifest inside: <<<CINEMATIC_MANIFEST_START>>> [JSON_ARRAY] <<<CINEMATIC_MANIFEST_END>>>
- 2. [TOKEN DENSITY & PACING CONTROL]: For long videos (10m+), DO NOT generate 50+ tiny scenes. Instead, generate 15-25 high-fidelity scenes with long durations (20-40s each). 

- ALWAYS be context-aware.
`;

    // [DETECT SEARCH INTENT]
    let lastMessage = '';
    const lastMsgObj = messages[messages.length - 1];
    if (lastMsgObj && typeof lastMsgObj.content === 'string') {
      lastMessage = lastMsgObj.content;
    } else if (Array.isArray(lastMsgObj?.content)) {
      lastMessage = lastMsgObj.content.find((c: any) => c.type === 'text')?.text || '';
    }
    // [INTELLIGENCE TOGGLE]: Only research if Commander explicitly activates High-Intel mode
    const isSearchIntent = isSearchMode; // Removed auto-detection to favor Lightning Speed as requested

    // [KEY POOL]: Parse all keys
    let groqKeysRaw = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    let orKeysRaw = process.env.OPENROUTER_API_KEY || process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '';
    let geminiKeysRaw = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || '';

    // [SOVEREIGN KEY VAULT]: Resolve Master Keys
    try {
      const SystemConfig = (await import('@/models/SystemConfig')).default;
      const configs = await SystemConfig.find({});
      const masterGroq = configs.find(c => c.key === 'master_groq_keys')?.value;
      const masterGemini = configs.find(c => c.key === 'master_gemini_keys')?.value;
      if (masterGroq) groqKeysRaw = groqKeysRaw ? `${masterGroq},${groqKeysRaw}` : masterGroq;
      if (masterGemini) geminiKeysRaw = geminiKeysRaw ? `${masterGemini},${geminiKeysRaw}` : masterGemini;
    } catch (e) {}

    const groqKeys = groqKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    const orKeys = orKeysRaw.split(',').map(k => k.trim()).filter(k => k);
    const geminiKeys = geminiKeysRaw.split(',').map(k => k.trim()).filter(k => k);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let finalIntelligenceContext = '';
        const currentMoment = new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' });
        const timeHeader = `\n[SYSTEM CLOCK]: ${currentMoment} (IST)\n\n`;
        
        if (isSearchIntent) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: '🔍 *JLR Global Intelligence Node Activated. Scanning the live web...*\n\n' } }] })}\n\n`));
          const searchData = await getGlobalIntelligence(lastMessage);
          if (searchData) {
            finalIntelligenceContext = `[JLR GLOBAL INTELLIGENCE FEED]:\n` + 
              (searchData.answer ? `Direct Answer: ${searchData.answer}\n` : '') + 
              searchData.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') + "\n\n";
          }
        }

        const finalMessages = [...messages];
        const systemMsg = finalMessages.find(m => m.role === 'system');
        const content = `${systemInstruction}${timeHeader}${finalIntelligenceContext}${fileContext ? `\n[ATTACHED CONTEXT]:\n${fileContext}` : ''}`;
        
        if (systemMsg) systemMsg.content = content + "\n\n" + systemMsg.content;
        else finalMessages.unshift({ role: 'system', content });

        // [ROUTING LOGIC]
        const hasVisionContent = messages.some((m: any) => Array.isArray(m.content) && m.content.some((c: any) => c.type === 'image_url'));
        let streamProvider = provider;
        let streamModel = model;
        if (hasVisionContent && streamProvider !== 'gemini') {
          if (streamProvider === 'openrouter' && orKeys.length > 0) {
             // Respect OpenRouter vision request
          } else {
            streamProvider = geminiKeys.length > 0 ? 'gemini' : 'openrouter';
            streamModel = streamProvider === 'gemini' ? 'gemini-2.0-flash' : 'qwen/qwen-2.5-vl-72b-instruct';
          }
        }

        let activeKeys = (streamProvider === 'gemini' ? geminiKeys : (streamProvider === 'openrouter' ? orKeys : groqKeys));
        if (activeKeys.length === 0) {
          streamProvider = 'groq';
          activeKeys = groqKeys;
        }

        // Extremely aggressively optimized attempt counter! Try each key max 1 time, plus 1 failover.
        const maxAttempts = Math.min(5, Math.max(2, activeKeys.length * 2));
        let attempts = 0;
        let success = false;
        let lastErrorMsg = 'All Neural Nodes Exhausted';

        while (attempts < maxAttempts && !success) {
          activeKeys = (streamProvider === 'gemini' ? geminiKeys : (streamProvider === 'openrouter' ? orKeys : groqKeys));
          
          // [CRITICAL FIX]: Groq has NO vision models. Force Gemini if OR has no keys for vision.
          if (activeKeys.length === 0 && hasVisionContent) {
             streamProvider = 'gemini';
             activeKeys = geminiKeys;
             streamModel = 'gemini-2.0-flash';
          }
          
          if (activeKeys.length === 0) {
            streamProvider = 'groq';
            activeKeys = groqKeys;
          }

          const apiKey = activeKeys[attempts % activeKeys.length] || '';
          const mappedModel = mapModelId(streamModel, streamProvider);

          try {
            if (streamProvider === 'gemini') {
              const geminiRes = await callGemini(apiKey, streamModel, finalMessages, true);
              if (geminiRes.ok) {
                success = true;
                const reader = geminiRes.body!.getReader();
                const decoder = new TextDecoder();
                while(true) {
                  const {done, value} = await reader.read();
                  if (done) break;
                  const raw = decoder.decode(value);
                  raw.split('\n').forEach(line => {
                    if (line.startsWith('data: ')) {
                      const dataStr = line.slice(6).trim();
                      if (!dataStr || dataStr === '[DONE]') return;
                      try {
                        const text = JSON.parse(dataStr).candidates?.[0]?.content?.parts?.[0]?.text;
                        if (text) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
                      } catch {}
                    }
                  });
                }
                break;
              } else {
                const status = geminiRes.status;
                if (status === 429 || status === 401 || status === 403) {
                    streamProvider = 'openrouter';
                    streamModel = hasVisionContent ? 'qwen/qwen-2.5-vl-72b-instruct' : 'llama-3.3-70b-versatile';
                }
                attempts++;
                await new Promise(r => setTimeout(r, 600));
              }
            } else {
              const baseUrl = streamProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
              const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://jlr-ai.vercel.app' },
                body: JSON.stringify({ model: mappedModel, messages: finalMessages, stream: true, max_tokens: 8192 }),
              });
              
              if (response.ok) {
                success = true;
                const reader = response.body!.getReader();
                while (true) {
                  const { done, value } = await reader.read();
                  if (done) break;
                  controller.enqueue(value);
                }
                break;
              } else {
                const errText = await response.text();
                let msg = errText;
                try { msg = JSON.parse(errText).error?.message || errText; } catch {}
                lastErrorMsg = msg;
                const status = response.status;
                const isAuthError = status === 401 || status === 403 || status === 404;
                const isSaturated = status === 429 || msg.toLowerCase().includes('rate limit') || status >= 500;
                
                if (isAuthError || isSaturated || status === 402) {
                   if (attempts > 0 && attempts % activeKeys.length === 0) {
                     if (streamProvider === 'openrouter') {
                       streamProvider = 'gemini';
                       streamModel = hasVisionContent ? 'gemini-2.0-flash' : 'llama-3.3-70b-versatile';
                     } else {
                       streamProvider = 'openrouter';
                       streamModel = hasVisionContent ? 'qwen/qwen-2.5-vl-72b-instruct' : 'meta-llama/llama-3.3-70b-instruct';
                     }
                   }
                   attempts++;
                   await new Promise(r => setTimeout(r, 600));
                   continue;
                } else {
                   break; // Fatal error or bad request
                }
              }
            }
          } catch (e: any) {
            lastErrorMsg = e.message;
            attempts++;
          }
        }

        if (!success) {
           let safeError = lastErrorMsg;
           const lowerErr = lastErrorMsg.toLowerCase();
           if (lowerErr.includes('rate limit') || lowerErr.includes('429') || lowerErr.includes('console.groq.com') || lowerErr.includes('billing')) {
               safeError = 'JLR Sovereign Servers are currently experiencing maximum computational load. Neural bandwidth is saturated. Please try again in 1-2 minutes.';
           } else if (lowerErr.includes('decommissioned') || lowerErr.includes('unsupported')) {
               safeError = 'The requested Neural Node has been decommissioned by JLR Central. Please try another model.';
           }
           
           controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: `⚠️ Technical Diagnostic: ${safeError}` } }] })}\n\n`));
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    });

    return new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Access-Control-Allow-Origin': '*' } });

  } catch (err: any) {
    return NextResponse.json({ error: { message: err.message } }, { status: 500 });
  }
}
