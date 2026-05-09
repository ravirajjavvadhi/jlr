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
4. NEURAL TOOLS: You have internal access to Reasoning, OCR, and Technical Diagnostic tools. When performing complex analysis (e.g., studying 100+ page docs or vision data), activate these tools implicitly to provide a beast-level response.
5. DOCUMENT INTEL: Cite [Page X] accurately. Use native Markdown.`;


export function getStoredApiKey(provider: 'groq' | 'openrouter' = 'groq'): string {
  return (API_KEYS as any)[provider] || '';
}

function getSystemPrompt(): string {
  if (typeof window === 'undefined') return SYSTEM_PROMPT_BASE;
  const name = localStorage.getItem('user_name') || 'ravirajjavvadi';
  return SYSTEM_PROMPT_BASE.replace('{USER_NAME}', name);
}

export interface MessageOptions {
  onToken?: (token: string) => void;
  onDone?: (fullText: string) => void;
  onError?: (error: any) => void;
  fileContext?: string;
  userId?: string;
  responseLength?: 'auto' | 'concise' | 'medium' | 'long';
  isSearchMode?: boolean;
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
  
  // [CONTEXT PRUNER]: Increase depth to 20 messages for better continuity
  let prunedMessages = messages.slice(-20);

  // [NEURAL OPTIMIZATION]: Strip Base64 images from historical context
  prunedMessages = prunedMessages.map((msg, index) => {
    if (index < prunedMessages.length - 1 && Array.isArray(msg.content)) {
       const mappedContent = msg.content.map((c: any) => {
         if (c.type === 'image_url') return { type: 'text', text: '[PAST IMAGE OMITTED TO SAVE NEURAL BANDWIDTH]' };
         return c;
       });
       return { ...msg, content: mappedContent };
    }
    return msg;
  });

  const finalMessages = [
    { role: 'system', content: finalSystemPrompt },
    ...prunedMessages
  ];

  const orKey = getStoredApiKey('openrouter');
  const groqKey = getStoredApiKey('groq');
  
  // Look at the CURRENT query for images
  const currentMsg = prunedMessages[prunedMessages.length - 1];
  const hasImages = currentMsg && Array.isArray(currentMsg.content) && currentMsg.content.some((c: any) => typeof c === 'object' && c.type === 'image_url');
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
    const isGroqModel = modelId.includes('versatile') || modelId.includes('instant');
    finalProvider = ((isGroqModel && groqKey) ? 'groq' : (orKey ? 'openrouter' : 'groq'));
  }

  try {
    const payload = {
      model: finalModelId,
      messages: [
        { role: 'system', content: finalSystemPrompt }, 
        ...prunedMessages.map(m => ({ role: m.role, content: m.content }))
      ],
      provider: finalProvider,
      fileContext: fileContext,
      userId: userId,
      isSearchMode: options.isSearchMode
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
    let buffer = ''; // [CRITICAL]: Line buffer to handle partial network packets

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      
      // Keep only the potentially incomplete last line in the buffer
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          const data = trimmed.slice(6).trim();
          if (data === '[DONE]') break;
          try {
            const parsed = JSON.parse(data);
            let content = parsed.choices?.[0]?.delta?.content || '';
            if (content) {
              fullText += content;
              onToken && onToken(content);
            }
          } catch { } // Ignore partial or invalid JSON in a single line
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
  
  // [TRICK]: Route natively to Gemini 2.0 Flash or OpenRouter. Groq vision is officially decommissioned.
  const VISION_ATTEMPTS = [
    { provider: 'gemini', model: 'gemini-2.0-flash' },
    { provider: 'openrouter', model: 'qwen/qwen-2.5-vl-72b-instruct' },
    { provider: 'openrouter', model: 'meta-llama/llama-3.2-90b-vision-instruct' },
  ];

  let attempts = [...VISION_ATTEMPTS];
  let lastProxyError = '';

  for (const attempt of attempts) {
    try {
      console.log(`[JLR-AI] Proxied Vision Attempt: ${attempt.provider}/${attempt.model}`);
      
      const payload = {
        model: attempt.model,
        provider: attempt.provider,
        messages: [
          { role: 'system', content: getSystemPrompt() },
          { 
            role: 'user', 
            content: [
              { type: 'text', text: text || 'Analyze this image in high-density detail.' },
              { type: 'image_url', image_url: { url: imageBase64 } }
            ] 
          }
        ],
        userId: userId
      };

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: options.signal,
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        lastProxyError = errJson.error?.message || `Status ${response.status}`;
        continue;
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let fullText = '';
      let buffer = ''; // [CRITICAL]: Line buffer for vision node stability
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        
        for (const line of lines) {
           const trimmed = line.trim();
           if (trimmed.startsWith('data: ')) {
             const data = trimmed.slice(6).trim();
             if (data === '[DONE]') break;
             try {
               const parsed = JSON.parse(data);
               const content = parsed.choices?.[0]?.delta?.content;
               if (content) { 
                 fullText += content; 
                 onToken && onToken(content); 
               }
             } catch {}
           }
        }
      }
      onDone && onDone(fullText);
      return; 
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      lastProxyError = err.message;
      console.error(`[JLR-AI] Proxy node error:`, err.message);
    }
  }

  onError && onError(`⚠️ JLR AI Supremacy: ${lastProxyError || 'Vision Link Saturated. Standby for link restoration... ⚡'}`);
}
