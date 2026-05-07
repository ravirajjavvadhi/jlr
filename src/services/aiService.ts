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

const SYSTEM_PROMPT_BASE = `You are JLR AI (Supreme Edition), a top-tier, helpful, and highly articulate AI assistant.
Created by J. Lakshman Rao (Founder) & Javvadhi Raviraj (Commander).

CORE PROTOCOLS:
1. TONE: Professional, articulate, and natural. Think "Beast ChatGPT". Avoid unnecessary repetition.
2. INTELLIGENT SCALING:
   - GREETINGS: Be warm and professional. 
   - DEFINITIONS/TECHNICAL: Provide clear, accurate, and thorough explanations (e.g., Explain 504 errors accurately).
   - ACADEMIC (10 MARKS): Give exhaustive detail with headers, bullet points, and deep analysis.
3. CONTEXT: You are chatting with {USER_NAME}. Be helpful and direct.
4. DOCUMENT INTEL: Cite page numbers as [Page X] and specific headers accurately.`;


export function getStoredApiKey(provider: 'groq' | 'openrouter' = 'groq'): string {
  return (API_KEYS as any)[provider] || '';
}

function getSystemPrompt(): string {
  if (typeof window === 'undefined') return SYSTEM_PROMPT_BASE;
  const name = localStorage.getItem('user_name') || 'Raviraj';
  return SYSTEM_PROMPT_BASE.replace('{USER_NAME}', name);
}

export interface MessageOptions {
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: any) => void;
  fileContext?: string;
  userId?: string;
  responseLength?: 'auto' | 'concise' | 'medium' | 'long';
  signal?: AbortSignal;
}

export async function sendMessage(messages: any[], modelId: string, options: MessageOptions = {}) {
  const { onToken, onDone, onError, fileContext, userId, responseLength = 'auto' } = options;
  
  // [INTELLIGENCE SCALING]: Inject precise length instructions
  let lengthInstruction = "";
  if (responseLength === 'concise') {
    lengthInstruction = "\n- MANDATORY: Keep response ultra-concise (2-3 lines max).";
  } else if (responseLength === 'medium') {
    lengthInstruction = "\n- MANDATORY: Keep response medium length (10-15 lines approx).";
  } else if (responseLength === 'long') {
    lengthInstruction = "\n- MANDATORY: Provide a highly detailed, long, and comprehensive answer.";
  }

  const name = (typeof window !== 'undefined' && localStorage.getItem('user_name')) || 'Commander';
  const finalSystemPrompt = SYSTEM_PROMPT_BASE.replace('{USER_NAME}', name) + `\n\n[LENGTH PRIORITY]: ${lengthInstruction}`;
  
  const finalMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...messages
  ];

  const orKey = getStoredApiKey('openrouter');
  const groqKey = getStoredApiKey('groq');
  
  // [SMART ROUTER] - Automatically allocate best model based on content
  const hasImages = messages.some(m => Array.isArray(m.content) && m.content.some((c: any) => typeof c === 'object' && c.type === 'image_url'));
  const hasComplexDocs = !!fileContext || messages.some(m => m.attachments?.length > 0);
  
  let finalModelId = modelId;
  let finalProvider = '';

  if (hasImages) {
    finalProvider = 'openrouter';
    finalModelId = 'qwen/qwen-2.5-vl-72b-instruct';
  } else if (hasComplexDocs) {
    finalProvider = 'openrouter';
    finalModelId = 'deepseek/deepseek-chat'; 
  } else {
    // Check if selected model is still valid
    const isGroqModel = modelId.includes('versatile') || modelId.includes('instant');
    finalProvider = ((isGroqModel && groqKey) ? 'groq' : (orKey ? 'openrouter' : 'groq'));
  }

  // Intelligence Boost for Documents
  let systemPrompt = getSystemPrompt();

  try {
    const payload = {
      model: finalModelId,
      messages: [
        { role: 'system', content: finalSystemPrompt }, 
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
      signal: options.signal,
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
              onToken && onToken(content);
            }
          } catch { }
        }
      }
    }
    onDone && onDone(fullText);
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    const msg: string = err.message || '';
    console.error('[JLR-AI CRITICAL]:', err);

    // [SOVEREIGN DIAGNOSTICS]: Transform generic errors into actionable intelligence
    let friendlyError = msg;
    if (msg.includes('Failed to fetch') || msg.includes('NetworkError')) {
      friendlyError = '⚠️ Connection Link Unstable. Node timeout or network loss. Please retry your command.';
    } else if (msg.includes('504') || msg.includes('502')) {
      friendlyError = '⚠️ Sovereign Gateway Timeout. Upstream node is saturated. Please retry in 5 seconds.';
    } else if (msg.includes('rate limit') || msg.includes('429')) {
      friendlyError = '⚠️ Pulse Saturated. Neural link rate limit reached. Re-routing to backup node... ⚡';
    }

    onError && onError(friendlyError);
  }
}


export async function analyzeImage(imageBase64: string, text: string, selectedModelId: string, options: MessageOptions = {}) {
  const { onToken, onDone, onError, userId } = options;
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
            signal: options.signal
          });
      } else if (provider === 'gemini') {
        const geminiPayload = {
          contents: [{ parts: [{ text: text || 'Analyze this image.' }, { inline_data: { mime_type: 'image/jpeg', data: imageBase64.split(',')[1] } }] }]
        };
        response = await fetch(`${baseUrl}/${model}:streamGenerateContent?alt=sse&key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(geminiPayload),
          signal: options.signal
        });
      } else {
        response = await fetch(`${baseUrl}/chat/completions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: model,
            messages: [{ role: 'user', content: [{ type: 'text', text: text || 'Explain image' }, { type: 'image_url', image_url: { url: imageBase64 } }] }],
            stream: true
          }),
          signal: options.signal
        });
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const raw = decoder.decode(value);
        if (provider === 'gemini') {
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const json = JSON.parse(line.slice(6));
                const content = json.candidates?.[0]?.content?.parts?.[0]?.text;
                if (content) { fullText += content; onToken && onToken(content); }
              } catch {}
            }
          }
        } else {
          const lines = raw.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim();
              if (data === '[DONE]') break;
              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content;
                if (content) { fullText += content; onToken && onToken(content); }
              } catch {}
            }
          }
        }
      }
      onDone && onDone(fullText);
      return; 
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.error(`[JLR-AI] Provider ${attempt.provider} failed:`, err.message);
    }
  }

  onError && onError(`⚠️ JLR AI Supremacy: Vision Link Saturated.\n\nAll intelligence cores are currently processing at full capacity. Please standby for link restoration... ⚡`);
}
