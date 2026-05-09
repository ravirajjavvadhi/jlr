import { NextResponse } from 'next/server';

const TAVILY_API_KEY = process.env.TAVILY_API_KEY;

export async function POST(req: Request) {
  if (!TAVILY_API_KEY) {
    return NextResponse.json({ error: 'TAVILY_API_KEY is not configured.' }, { status: 500 });
  }

  try {
    const { query, searchDepth = 'basic', includeAnswer = true } = await req.json();

    console.log(`[JLR-AI SEARCH]: Querying "${query}"...`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query,
        search_depth: searchDepth,
        include_answer: includeAnswer,
        max_results: 5
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.detail?.message || 'Tavily Search Failed');
    }

    return NextResponse.json(data);
  } catch (error: any) {
    console.error('[SEARCH ERROR]:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
