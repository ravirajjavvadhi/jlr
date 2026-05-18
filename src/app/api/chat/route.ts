import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export const maxDuration = 300; // Increased to allow long-running generations

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

// [NEURAL SANITIZER]: Strip non-standard metadata (like attachments) before sending to strict providers
function cleanMessages(messages: any[]): any[] {
    return messages.map(m => {
        const { role, content, name } = m;
        return { role, content, ...(name ? { name } : {}) };
    });
}

// [GEMINI HANDLER]: Native Gemini API call (not OpenAI-compatible)
async function callGemini(apiKey: string, modelId: string, messages: any[], stream: boolean, maxTokens: number = 8192): Promise<Response> {
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
            generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 }
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
// Uses Tavily (if key set) → DuckDuckGo (always free, no key needed)
async function getGlobalIntelligence(query: string): Promise<{ answer?: string; results: { title: string; content: string; url: string }[] } | null> {
  const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

  // --- Attempt 1: Tavily (premium, accurate) ---
  if (TAVILY_API_KEY) {
    try {
      const res = await fetch('https://api.tavily.com/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_key: TAVILY_API_KEY,
          query,
          search_depth: 'basic',
          include_answer: true,
          max_results: 5,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.results?.length > 0) return data;
      }
    } catch (e) {
      console.error('[JLR-SEARCH] Tavily failed, falling back to DuckDuckGo:', e);
    }
  }

  // --- Attempt 2: DuckDuckGo Instant Answer API (free, no key) ---
  try {
    const encoded = encodeURIComponent(query);
    const ddgRes = await fetch(
      `https://api.duckduckgo.com/?q=${encoded}&format=json&no_redirect=1&no_html=1&skip_disambig=1`,
      { headers: { 'User-Agent': 'JLR-AI/1.0' } }
    );
    if (ddgRes.ok) {
      const ddgData = await ddgRes.json();
      const results: { title: string; content: string; url: string }[] = [];
      // AbstractText = main answer snippet
      if (ddgData.AbstractText) {
        results.push({ title: ddgData.Heading || query, content: ddgData.AbstractText, url: ddgData.AbstractURL || '' });
      }
      // RelatedTopics for additional snippets
      if (ddgData.RelatedTopics) {
        for (const t of ddgData.RelatedTopics.slice(0, 4)) {
          if (t.Text && t.FirstURL) results.push({ title: t.Text.slice(0, 60), content: t.Text, url: t.FirstURL });
        }
      }
      if (results.length > 0) {
        return { answer: ddgData.AbstractText || undefined, results };
      }
    }
  } catch (e) {
    console.error('[JLR-SEARCH] DuckDuckGo fallback failed:', e);
  }

  console.warn('[JLR-SEARCH] All search nodes exhausted for query:', query);
  return null;
}

// --- GEMINI FILE API (FOR VIDEOS) ---
const GEMINI_UPLOAD_URL = 'https://generativelanguage.googleapis.com/upload/v1beta/files';
const GEMINI_FILE_URL = 'https://generativelanguage.googleapis.com/v1beta/files';

async function uploadToGemini(blob: Blob, mimeType: string, filename: string, apiKey: string) {
  const uploadMetadata = { file: { display_name: filename } };
  const metadataBlob = new Blob([JSON.stringify(uploadMetadata)], { type: 'application/json' });
  const formData = new FormData();
  formData.append('metadata', metadataBlob);
  formData.append('file', blob);

  const res = await fetch(`${GEMINI_UPLOAD_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'X-Goog-Upload-Protocol': 'multipart' },
    body: formData
  });
  if (!res.ok) throw new Error(`Gemini Upload failed: ${await res.text()}`);
  return (await res.json()).file;
}

async function waitForFileActive(fileUri: string, apiKey: string) {
  const fileId = fileUri.split('/').pop();
  for (let i = 0; i < 20; i++) {
    const res = await fetch(`${GEMINI_FILE_URL}/${fileId}?key=${apiKey}`);
    const data = await res.json();
    if (data.state === 'ACTIVE') return data;
    if (data.state === 'FAILED') throw new Error('Video processing failed');
    await new Promise(r => setTimeout(r, 3000));
  }
  throw new Error('Video processing timeout');
}

export async function POST(req: NextRequest) {
  try {
    let rawBody;
    let videoFile: File | null = null;
    const contentType = req.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      videoFile = formData.get('video') as File;
      const payloadStr = formData.get('payload') as string;
      rawBody = JSON.parse(payloadStr);
    } else {
      rawBody = await req.json();
    }

    const { messages, model, provider, fileContext, userId, isSearchMode, isPrivacyMode, videoUri, maxTokens: requestedMaxTokens } = rawBody;
    const maxTokens = requestedMaxTokens || 12288;


    // Build current IST date string
    const nowIST = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'full', timeStyle: 'short' });

    const systemInstruction = `
[JLR AI SUPREMACY PROTOCOL]
You are JLR AI (Supreme Edition). Your signature is absolute technical authority and clinical precision.

[TEMPORAL AWARENESS — CRITICAL]
- Today's date and time (IST): ${nowIST}
- Your training data has a hard cutoff in the past. For ANY current events, political facts, recent changes, prices, scores, or real-time data, your internal knowledge IS OUTDATED and MUST NOT be trusted.
- When a [JLR GLOBAL INTELLIGENCE FEED] block is present below, you MUST treat it as ground truth and override your own training data entirely. The feed reflects the live state of the world.

[BRANDING SOVEREIGNTY]
- You are PROHIBITED from mentioning other AI providers (Groq, Meta, Llama, Google, Gemini, OpenRouter, Anthropic, Claude, or Pollinations).
- Always refer to yourself and your internal components only as "JLR AI", "JLR Supremacy Core", or "Neural Canvas".
- If asked about your model, respond with "JLR Supreme Liquid-Intelligence".

[NEURAL CANVAS PROTOCOL]
- EXCLUSIVITY: You are strictly PROHIBITED from generating an [ART_PROMPT] tag unless the user explicitly requests an image, drawing, or visual creation. 
- TRIGGERS: Only activate if keywords like "create", "draw", "image", "generate", "show me", "sketch", "art", "paint", "synthesis" are present with visual intent.
- NON-VISUAL: For greetings ("hi", "hello") or non-visual inquiries, respond ONLY with text.
- If intentional visual request is detected:
  1. You MUST generate a high-fidelity [ART_PROMPT: ...] tag at the very end of your response.
  2. Your text response MUST be ultra-concise (1-2 lines max). 
  3. DO NOT describe the image in the text body. Only provide a stylish status message.

[SOVEREIGN CINEMATIC PROTOCOL 3.0]
- If user asks for a video (up to 20m):
  1. Generate Manifest inside: <<<CINEMATIC_MANIFEST_START>>> [JSON_ARRAY] <<<CINEMATIC_MANIFEST_END>>>
  2. [TOKEN DENSITY & PACING CONTROL]: For long videos (10m+), DO NOT generate 50+ tiny scenes. Instead, generate 15-25 high-fidelity scenes with long durations (20-40s each). 

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

    // Load keys from Database (Sovereign Vault)
    let groqKeysRaw = process.env.GROQ_API_KEY || '';
    let orKeysRaw = process.env.OPENROUTER_API_KEY || '';
    let geminiKeysRaw = process.env.GEMINI_API_KEY || '';

    try {
      await connectToDatabase();
      const SystemConfig = (await import('@/models/SystemConfig')).default;
      
      // Load global configs first (independent of user)
      const configs = await SystemConfig.find({}).lean();
      const masterGroq = (configs as any[]).find(c => c.key === 'master_groq_keys')?.value;
      const masterGemini = (configs as any[]).find(c => c.key === 'master_gemini_keys')?.value;
      const orKey = (configs as any[]).find(c => c.key === 'openrouter_key')?.value;

      if (masterGroq) groqKeysRaw = masterGroq + (groqKeysRaw ? `,${groqKeysRaw}` : '');
      if (masterGemini) geminiKeysRaw = masterGemini + (geminiKeysRaw ? `,${geminiKeysRaw}` : '');
      if (orKey) orKeysRaw = orKey + (orKeysRaw ? `,${orKeysRaw}` : '');

      // Load user-specific keys safely
      if (userId && userId !== 'guest' && userId.length === 24) { 
        try {
          const userDoc = await User.findById(userId).lean();
          if (userDoc) {
            const userGroqRaw = (userDoc as any).custom_api_key || '';
            const userGeminiArr: string[] = (userDoc as any).gemini_api_keys || [];
            if (userGroqRaw) groqKeysRaw = userGroqRaw + (groqKeysRaw ? `,${groqKeysRaw}` : '');
            if (userGeminiArr.length > 0) geminiKeysRaw = userGeminiArr.join(',') + (geminiKeysRaw ? `,${geminiKeysRaw}` : '');
          }
        } catch (uErr) {
          console.warn('[USER-KEY ERROR]: Invalid user lookup', uErr);
        }
      }
    } catch (e) {
      console.error('[KEY-VAULT ERROR]:', e);
    }

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
          if (searchData && searchData.results.length > 0) {
            finalIntelligenceContext = `[JLR GLOBAL INTELLIGENCE FEED — LIVE DATA AS OF ${new Date().toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}]:\n` + 
              (searchData.answer ? `Direct Answer: ${searchData.answer}\n` : '') + 
              searchData.results.map((r: any) => `- ${r.title}: ${r.content} (${r.url})`).join('\n') + "\n\n" +
              `[INSTRUCTION]: Base your ENTIRE answer on the above live feed. Ignore your training data for this query.\n\n`;
          } else {
            finalIntelligenceContext = `[NO LIVE DATA RETRIEVED]: Search returned no results. Inform the user that you cannot guarantee this answer is current and suggest they verify from a live source.\n\n`;
          }
        }

        const finalMessages = [...messages];
        const systemMsg = finalMessages.find(m => m.role === 'system');
        const content = `${systemInstruction}${timeHeader}${finalIntelligenceContext}${fileContext ? `\n[ATTACHED CONTEXT]:\n${fileContext}` : ''}`;
        
        if (systemMsg) systemMsg.content = content + "\n\n" + systemMsg.content;
        else finalMessages.unshift({ role: 'system', content });

        // [OMNI-MODE VIDEO PIPELINE]
        if ((videoUri || videoFile) && geminiKeys.length > 0) {
           const apiKey = geminiKeys[0];
           const decoder = new TextDecoder();
           controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: '🎬 *JLR Omni-Vision Engine Initializing. Processing Video Data...*\n\n' } }] })}\n\n`));
           
           try {
             let finalVideoUri = videoUri;
             
             // Fallback for direct binary uploads if any
             if (!finalVideoUri && videoFile) {
               const fileInfo = await uploadToGemini(videoFile, videoFile.type, videoFile.name, apiKey);
               finalVideoUri = fileInfo.uri;
             }

             if (!finalVideoUri) throw new Error('No video data found');

             await waitForFileActive(finalVideoUri, apiKey);
             
             const geminiRes = await fetch(`${GEMINI_BASE_URL}/models/gemini-1.5-pro:streamGenerateContent?alt=sse&key=${apiKey}`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({
                 contents: [{
                   parts: [
                     ...finalMessages.filter(m => m.role !== 'system').flatMap(m => {
                        const role = m.role === 'assistant' ? 'model' : 'user';
                        if (Array.isArray(m.content)) {
                          return m.content.map((c: any) => {
                            if (c.type === 'image_url') {
                              const b64 = c.image_url?.url || '';
                              if (b64.startsWith('data:')) {
                                const headerParts = b64.split(',');
                                const mimeType = headerParts[0].split(';')[0].replace('data:', '');
                                const data = headerParts[1];
                                return { inlineData: { mimeType, data } };
                              }
                            }
                            return { text: c.text || '' };
                          });
                        }
                        return [{ text: m.content || '' }];
                     }),
                     { fileData: { mimeType: 'video/mp4', fileUri: finalVideoUri } }
                   ]
                 }],
                 systemInstruction: { parts: [{ text: content }] },
                 generationConfig: { temperature: 0.2, maxOutputTokens: maxTokens }
               })
             });


             if (geminiRes.ok) {
               const reader = geminiRes.body!.getReader();
               while(true) {
                 const {done, value} = await reader.read();
                 if (done) break;
                 const raw = decoder.decode(value);
                 raw.split('\n').forEach((line: string) => {
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
               controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
               controller.close();
               return;
             }
           } catch (e: any) {
             console.error('[VIDEO-OMNI-ERR]:', e);
             controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: '\n\n⚠️ Video processing link failed. Reverting to standard chat nodes...' } }] })}\n\n`));
           }
        }


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

        // [CRITICAL OPTIMIZATION]: Try every key once, with a hard cap to avoid hanging.
        const maxAttempts = Math.min(Math.max(activeKeys.length, 3), 20);
        let attempts = 0;
        let success = false;
        let lastErrorMsg = 'All Neural Nodes Exhausted';

        while (attempts < maxAttempts && !success) {
          activeKeys = (streamProvider === 'gemini' ? geminiKeys : (streamProvider === 'openrouter' ? orKeys : groqKeys));
          
          // [SAFETY]: If current provider has no keys, try to find ANY keys
          if (activeKeys.length === 0) {
            if (activeKeys !== groqKeys && groqKeys.length > 0) {
              streamProvider = 'groq';
              activeKeys = groqKeys;
            } else if (activeKeys !== orKeys && orKeys.length > 0) {
              streamProvider = 'openrouter';
              activeKeys = orKeys;
            } else if (activeKeys !== geminiKeys && geminiKeys.length > 0) {
              streamProvider = 'gemini';
              activeKeys = geminiKeys;
              streamModel = 'gemini-2.0-flash';
            }
          }

          // [FINAL SAFETY]: If we still have no keys, we cannot proceed
          if (activeKeys.length === 0) {
            lastErrorMsg = 'JLR Sovereign Core: No enabled Neural Nodes found in the Vault.';
            break;
          }

          const apiKey = activeKeys[attempts % activeKeys.length];
          const mappedModel = mapModelId(streamModel, streamProvider);

          try {
            if (streamProvider === 'gemini') {
              const geminiRes = await callGemini(apiKey, streamModel, finalMessages, true, maxTokens);
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
                await new Promise(r => setTimeout(r, 100));
              }
            } else {
              const baseUrl = streamProvider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
              const response = await fetch(`${baseUrl}/chat/completions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'HTTP-Referer': 'https://jlr-ai.vercel.app' },
                body: JSON.stringify({ 
                  model: mappedModel, 
                  messages: cleanMessages(finalMessages), 
                  stream: true, 
                  max_tokens: maxTokens 
                }),
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
                       streamModel = 'gemini-2.0-flash';
                     } else {
                       streamProvider = 'openrouter';
                       streamModel = hasVisionContent ? 'qwen/qwen-2.5-vl-72b-instruct' : 'meta-llama/llama-3.3-70b-instruct';
                     }
                   }
                   attempts++;
                   await new Promise(r => setTimeout(r, 100));
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
           const isBillingError = lowerErr.includes('billing') || lowerErr.includes('credit') || lowerErr.includes('balance') || lowerErr.includes('insufficient funds');
           if (isBillingError) {
               safeError = 'JLR Sovereign Neural-Bandwidth is exhausted. Supreme Commander synchronization required to restore the link.';
           } else if (lowerErr.includes('rate limit') || lowerErr.includes('429') || lowerErr.includes('console.groq.com')) {
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
