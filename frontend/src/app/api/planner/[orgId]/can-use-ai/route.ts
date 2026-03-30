import { NextRequest, NextResponse } from 'next/server';

const PLANNER_URL =
  process.env.CONTENT_PLANNER_URL || 'http://localhost:3007';

/** GET /api/planner/[orgId]/can-use-ai — check if org has AI access */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const res = await fetch(
      `${PLANNER_URL}/planner/${orgId}/can-use-ai`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 200 });
  }
}
