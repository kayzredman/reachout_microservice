import { NextRequest, NextResponse } from 'next/server';

const PLANNER_URL =
  process.env.CONTENT_PLANNER_URL || 'http://localhost:3007';

/** GET /api/planner/templates — list available content templates */
export async function GET() {
  try {
    const res = await fetch(`${PLANNER_URL}/planner/templates`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Content planner service unavailable' },
      { status: 503 },
    );
  }
}
