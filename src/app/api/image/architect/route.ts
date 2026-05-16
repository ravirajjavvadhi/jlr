import { NextRequest, NextResponse } from 'next/server';
import connectToDatabase from '@/services/mongodb';
import User from '@/models/User';

export const maxDuration = 30;

const GROQ_BASE_URL = 'https://api.groq.com/openai/v1';

// [IMAGE ARCHITECT]: Multi-Stage Intelligence Engine
async function architectSovereignPrompt(userPrompt: string, groqKey: string) {
  const blueprint = {
    enhanced: "",
    negative: "blurry, distorted, low quality, bad anatomy, worst quality, lowres, text, watermark, logo, banner, cropped, deformed, extra fingers, mutated hands, poorly drawn face, out of frame, blurred, haze, grainy",
    style: "Cinematic Photorealism",
    seeds: [] as number[]
  };

  try {
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${groqKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          {
            role: 'system',
            content: `You are the Sovereign Image Architect for JLR AI. 
            
            Your mission is to transform a simple user request into a high-density image generation blueprint.
            
            [OBJECTIVES]
            1. ENHANCED PROMPT: Expand the input into a 100-word cinematic masterpiece description. Include camera specs (e.g., 85mm f/1.8), lighting (e.g., volumetric, Rembrandt), and textures.
            2. FACE PERFECTION: If the subject is human, inject hyper-detailed facial morphology (pores, skin luminosity, sharp iris, realistic lashes).
            3. NEGATIVE PROMPT: List specific artifacts to avoid based on the prompt.
            4. STYLE: Identify the dominant aesthetic (e.g., Cyberpunk, Renaissance, Photorealistic, Hyper-Real).
            
            [FORMAT]
            Return ONLY a valid JSON object:
            {
              "enhanced": "...",
              "negative": "...",
              "style": "..."
            }`
          },
          { role: 'user', content: `Architect this vision: "${userPrompt}"` }
        ],
        temperature: 0.8,
        response_format: { type: "json_object" }
      })
    });

    if (res.ok) {
      const data = await res.json();
      const content = JSON.parse(data.choices[0].message.content);
      blueprint.enhanced = content.enhanced;
      blueprint.negative = content.negative || blueprint.negative;
      blueprint.style = content.style || blueprint.style;
    }
  } catch (e) {
    console.error("[ARCHITECT ERROR]:", e);
    blueprint.enhanced = `${userPrompt}, highly detailed, cinematic, 8k, masterpiece`;
  }

  // Generate 4 unique random seeds for variants
  blueprint.seeds = Array.from({ length: 4 }, () => Math.floor(Math.random() * 1000000000));
  
  return blueprint;
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, userId } = await req.json();
    if (!prompt) return NextResponse.json({ error: 'Prompt required' }, { status: 400 });

    // [KEY VAULT]: Fetch keys
    let groqKey = process.env.GROQ_API_KEY || process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
    
    try {
      await connectToDatabase();
      const SystemConfig = (await import('@/models/SystemConfig')).default;
      const [configs, userDoc] = await Promise.all([
        SystemConfig.find({}).lean(),
        userId ? User.findById(userId).lean() : Promise.resolve(null)
      ]);

      const masterGroq = (configs as any[]).find(c => c.key === 'master_groq_keys')?.value;
      if (masterGroq) groqKey = masterGroq.split(',')[0].trim() || groqKey;
      if (userDoc) {
        const userGroqRaw = (userDoc as any).custom_api_key || '';
        if (userGroqRaw) groqKey = userGroqRaw.split(',')[0].trim() || groqKey;
      }
    } catch (e) {}

    const architecture = await architectSovereignPrompt(prompt, groqKey);

    return NextResponse.json(architecture);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
