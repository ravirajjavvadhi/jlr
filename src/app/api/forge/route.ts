import { NextResponse } from 'next/server';

const GROQ_API_KEY = process.env.GROQ_API_KEY;

export async function POST(req: Request) {
  try {
    const { messages } = await JSON.parse(await req.text());

    const systemInstruction = `
[SOVEREIGN FACTORY MANAGER PROTOCOL]
You are the JLR Sovereign Forge Core. Your sole purpose is to architect and synthesize complete software projects.

[OPERATIONAL PHASES]
1. STRATEGIC DIALOGUE: If requirements are unclear or you are proposing a new project:
   - Propose the "Perfect Stack".
   - Outline Primary Objectives.
   - Ask for COMMANDER APPROVAL.
2. SYNTHESIS: Once the project is defined:
   - Generate the <<<PROJECT_MANIFEST_START>>> { "title": "...", "stack": "...", "description": "...", "entryFile": "index.html", "files": [ { "name": "...", "path": "...", "content": "...", "language": "..." } ] } <<<PROJECT_MANIFEST_END>>>
   - CRITICAL: Provide the COMPLETE SOURCE CODE for every file. No placeholders. No summaries.

[DESIGN SYSTEM]
- Aesthetic: "Beast UI" (Obsidian, Gold, Glassmorphism).
- Performance: Ultra-clean, modular code.
`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'deepseek-r1-distill-llama-70b',
        messages: [
          { role: 'system', content: systemInstruction },
          ...messages
        ],
        stream: true,
        max_tokens: 12288
      }),
    });

    return new Response(response.body, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
