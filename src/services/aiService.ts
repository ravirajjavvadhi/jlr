// JLR AI - Power Multi-API Service (Supremacy Edition)

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

// [CORE CONFIG] - Hardcode your keys here for instant supremacy
const API_KEYS = {
  groq: process.env.NEXT_PUBLIC_GROQ_API_KEY || '',
  openrouter: process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || '',
};


export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'JLR SUPREMACY (ULTRA)', label: '⚡ 70B' },
  { id: 'llama-3.1-8b-instant', name: 'JLR SUPREMACY (FAST)', label: '🚀 UNLIMITED' },
  { id: 'deepseek/deepseek-chat', name: 'JLR SUPREMACY (GENIUS)', label: '🧠 NEW' },
  { id: 'meta-llama/llama-3.3-70b-instruct', name: 'JLR SUPREMACY (SQUAD)', label: '🛡️ VERSATILE' },
];


const GEMINI_MODELS: any[] = [];

const SYSTEM_PROMPT_BASE = `You are JLR AI (Supremacy Power Edition), the world's most advanced AI platform.
Created by: Javvadhi Lakshman Rao (Founder) & Javvadhi Raviraj (Lead Developer).

YOUR ROLE:
- Absolute Power: No limits on reasoning, coding, or creativity.
- Context Awareness: You can analyze attached images and documents with precision.

RESPONSE REQUIRMENTS:
- STRUCTURE: Use native Markdown (Headers # ##, Bold **, Lists -) for all responses.
- NO BOXING: NEVER wrap your entire response in a triple-backtick block. Only use code blocks for actual source code or data blocks.
- NEATNESS: Ensure answers are structured and professional.
- MEMORY: Chatting with {USER_NAME}. Never mention other models. You are JLR AI.`;


export function getStoredApiKey(provider: 'groq' | 'openrouter' = 'groq'): string {
  return (API_KEYS as any)[provider] || '';
}

function getSystemPrompt(): string {
  if (typeof window === 'undefined') return SYSTEM_PROMPT_BASE;
  const name = localStorage.getItem('user_name') || 'Raviraj';
  return SYSTEM_PROMPT_BASE.replace('{USER_NAME}', name);
}

export type ChatHandlers = {
  onChunk?: (chunk: string, full: string) => void;
  onDone?: (fullText: string | null) => void;
  onError?: (error: string) => void;
  signal?: AbortSignal;
};

export async function sendMessage(messages: any[], modelId: string, handlers: ChatHandlers, userId?: string, fileContext?: string) {
  const orKey = getStoredApiKey('openrouter');
  const groqKey = getStoredApiKey('groq');
  
  // [SMART ROUTER] - Automatically allocate best model based on content
  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => typeof c === 'object' && c.type === 'image_url'));
  const hasComplexDocs = !!fileContext;
  
  let finalModelId = modelId;
  let finalProvider = '';

  if (hasImages) {
    finalProvider = 'openrouter';
    finalModelId = 'qwen/qwen-2.5-vl-72b-instruct';
  } else if (hasComplexDocs) {
    finalProvider = 'openrouter';
    finalModelId = 'deepseek/deepseek-chat'; 
  } else {
    const isGroqModel = modelId.includes('versatile') || modelId.includes('instant');
    finalProvider = ((isGroqModel && groqKey) ? 'groq' : (orKey ? 'openrouter' : 'groq'));
  }

  // Intelligence Boost for Documents
  let systemPrompt = getSystemPrompt();

  try {
    const payload = {
      model: finalModelId || (finalProvider === 'openrouter' ? 'deepseek/deepseek-chat' : 'llama-3.3-70b-versatile'),
      messages: [
        { role: 'system', content: systemPrompt }, 
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      provider: finalProvider,
      fileContext: fileContext,
      userId: userId
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: handlers.signal,
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({}));
      throw new Error(errorBody.error?.message || `Status ${response.status}`);
    }

    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullText = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const raw = decoder.decode(value);
      
      const lines = raw.split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            let content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              handlers.onChunk && handlers.onChunk(content, fullText);
            }
          } catch { }
        }
      }
    }
    handlers.onDone && handlers.onDone(fullText);
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    const msg: string = err.message || '';
    // [SUPREMACY BRANDING]: Silent failover mask
    const isSaturated = msg.toLowerCase().includes('rate limit') || msg.toLowerCase().includes('tpd') || msg.toLowerCase().includes('token') || msg.toLowerCase().includes('429') || msg.toLowerCase().includes('busy');
    handlers.onError && handlers.onError(isSaturated ? '⚠️ JLR AI Supremacy Node Saturated. Initiating link restoration... ⚡' : msg);
  }
}


export async function analyzeImage(imageBase64: string, text: string, selectedModelId: string, handlers: ChatHandlers, userId?: string) {
  const orKey = getStoredApiKey('openrouter');
  const groqKey = getStoredApiKey('groq');
  
  // Supremacy Vision Engine - Automatically used in background for all images
  const VISION_FALLBACKS = [
    { provider: 'openrouter', model: 'qwen/qwen-2.5-vl-72b-instruct' }, // PRIMARY BEAST
    { provider: 'groq', model: 'llama-3.2-11b-vision-preview' },       // SUPREME SPEED (ZERO COST)
    { provider: 'openrouter', model: 'google/gemini-pro-1.5' },
  ];

  let attempts = [];
  // FORCE QWEN 2.5 VL AS PRIMARY BEAST FOR ALL VISION
  attempts.push({ provider: 'openrouter', model: 'qwen/qwen-2.5-vl-72b-instruct' });
  
    if (selectedModelId.includes('vision') && selectedModelId !== 'qwen/qwen-2.5-vl-72b-instruct') {
      if (selectedModelId.includes('groq')) attempts.push({ provider: 'groq', model: selectedModelId });
      else attempts.push({ provider: 'openrouter', model: selectedModelId });
    }
  
  VISION_FALLBACKS.forEach(f => {
    if (!attempts.find(a => a.model === f.model)) attempts.push(f);
  });

  let errorLogs: string[] = [];
  
  for (const attempt of attempts) {
    const provider = attempt.provider as any;
    const apiKey = getStoredApiKey(provider);
    if (!apiKey) continue;

    try {
      const baseUrl = provider === 'openrouter' ? OPENROUTER_BASE_URL : GROQ_BASE_URL;
      const model = attempt.model;
      
      console.log(`[JLR-AI] Attempting ${provider} with ${model}...`);

      let response: Response;
      if (provider === 'openrouter') {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'http://localhost:3000'
          },
            body: JSON.stringify({
              model: model,
              messages: [
                { role: 'system', content: getSystemPrompt() },
                { role: 'user', content: [{ type: 'text', text: text || 'Analyze this image in extreme high-density detail (OCR + Vision Logic).' }, { type: 'image_url', image_url: { url: imageBase64 } }] }
              ],
              stream: true,
              max_tokens: 2048 // [CREDIT PROTECTION]: Avoid being blocked by balance checks
            }),
            signal: handlers.signal
          });
      } else if (provider === 'gemini') {
        // Direct Google AI Studio Logic
        const geminiPayload = {
          contents: [{ parts: [{ text: text || 'Analyze this image.' }, { inline_data: { mime_type: 'image/jpeg', data: imageBase64.split(',')[1] } }] }]
        };
        response = await fetch(`${baseUrl}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
          signal: handlers.signal
        });
      } else {
        // Groq Fallback
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: [{ type: 'text', text: text || 'Explain image' }, { type: 'image_url', image_url: { url: imageBase64 } }] }],
            stream: true
          }),
          signal: handlers.signal
        });
      }

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error?.message || `Status ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value);
        if (provider === 'gemini') {
          // Google SSE Parsing
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) { fullText += content; handlers.onChunk && handlers.onChunk(content, fullText); }
              } catch {}
            }
          }
        } else {
          // OpenAI Compatible Parsing
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) { fullText += content; handlers.onChunk && handlers.onChunk(content, fullText); }
              } catch {}
            }
          }
        }
      }
      handlers.onDone && handlers.onDone(fullText);
      return; // SUCCESS EXIT
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(`[JLR-AI] Provider ${attempt.provider} (${attempt.model}) failed:`, err.message);
      errorLogs.push(`${attempt.provider.toUpperCase()}: ${err.message}`);
    }
  }

  handlers.onError && handlers.onError(`⚠️ JLR AI Supremacy: Vision Link Saturated.\n\nAll intelligence cores are currently processing at full capacity. Please standby for link restoration... ⚡`);
}
