import { NextRequest, NextResponse } from 'next/server';

const PLANNER_URL =
  process.env.CONTENT_PLANNER_URL || 'http://localhost:3007';

/** POST /api/planner/[orgId]/commit — commit a plan (create series + posts) */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${PLANNER_URL}/planner/${orgId}/commit`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
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
