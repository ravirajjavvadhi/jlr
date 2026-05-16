import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export const maxDuration = 30;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// [PROMPT ARCHITECT]: Expand a short user prompt into a cinematic, photorealistic masterpiece description
async function enhancePromptWithGroq(rawPrompt: string, groqKey: string): Promise<string> {
  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${groqKey}` },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 300,
        temperature: 0.7,
        messages: [
          {
            role: 'system',
            content: `You are an elite AI image prompt engineer. Your job is to transform a short concept into a high-fidelity image generation prompt.

Rules:
- Output ONLY the enhanced prompt — no explanation, no quotes, no preamble.
- Always include: subject details, art style, lighting, mood, camera/lens info, color palette, and quality tags.
- For realistic prompts: add "DSLR photo, 85mm lens, f/1.8, RAW, shot on Sony A7IV, ultra-sharp, 8K resolution, award-winning photography"
- For artistic prompts: add "concept art, intricate details, masterwork, trending on ArtStation, volumetric lighting, 8K"
- For fantasy/sci-fi: add "cinematic render, Unreal Engine 5, photorealistic, hyperdetailed, dramatic lighting"
- Max 200 words. Never add NSFW content.`
          },
          { role: 'user', content: `Enhance this into a perfect image generation prompt: "${rawPrompt}"` }
        ]
      })
    });
    if (res.ok) {
      const data = await res.json();
      const enhanced = data.choices?.[0]?.message?.content?.trim();
      if (enhanced && enhanced.length > 20) return enhanced;
    }
  } catch (e) {
    console.error('[IMAGE-PROMPT-ENHANCE] Groq enhancement failed:', e);
  }
  // Fallback: append quality tags to the raw prompt
  return `${rawPrompt}, ultra detailed, cinematic lighting, 8K resolution, masterpiece quality, sharp focus, professional photography`;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId, width = 1280, height = 1280, style } = await req.json();

    if (!prompt) return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });

    // [KEY VAULT]: Load Groq keys
    let groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    try {
      await connectToDatabase();
      const SystemConfig = (await import('@/models/SystemConfig')).default;
      const [configs, userDoc] = await Promise.all([
        SystemConfig.find({}).lean(),
        userId ? User.findById(userId).lean() : Promise.resolve(null),
      ]);
      const masterGroq = (configs as any[]).find(c => c.key === 'master_groq_keys')?.value;
      if (masterGroq) groqKey = masterGroq.split(',')[0].trim() || groqKey;
      if (userDoc) {
        const userGroqRaw = (userDoc as any).custom_api_key || '';
        if (userGroqRaw) groqKey = userGroqRaw.split(',')[0].trim() || groqKey;
      }
    } catch (e) {}

    // [STEP 1]: Enhance prompt with AI
    const enhancedPrompt = groqKey
      ? await enhancePromptWithGroq(prompt, groqKey)
      : `${prompt}, ultra detailed, cinematic lighting, 8K resolution, masterpiece quality`;

    // [STEP 2]: Build Pollinations URL with best quality settings
    const seed = Math.floor(Math.random() * 9999999);
    const encoded = encodeURIComponent(enhancedPrompt);
    
    // Model priority: flux-pro > flux (flux-pro is higher quality)
    const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&nologo=true&seed=${seed}&model=flux-pro&enhance=false`;

    return NextResponse.json({
      imageUrl,
      enhancedPrompt,
      originalPrompt: prompt,
      seed
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
