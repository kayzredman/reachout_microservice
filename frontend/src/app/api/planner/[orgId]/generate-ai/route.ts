import { NextRequest, NextResponse } from 'next/server';

const PLANNER_URL =
  process.env.CONTENT_PLANNER_URL || 'http://localhost:3007';

/** POST /api/planner/[orgId]/generate-ai — generate AI content plan (premium) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${PLANNER_URL}/planner/${orgId}/generate-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Content planner service unavailable' },
      { status: 503 },
    );
  }
}
