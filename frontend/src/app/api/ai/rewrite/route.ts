import { NextRequest, NextResponse } from 'next/server';

const AI_URL = process.env.AI_ASSISTANT_URL || 'http://localhost:3006';

/** POST /api/ai/rewrite — rewrite post content with a given tone */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${AI_URL}/ai/rewrite`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'AI service unavailable' },
      { status: 503 },
    );
  }
}
