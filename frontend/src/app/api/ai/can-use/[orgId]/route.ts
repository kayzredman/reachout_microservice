import { NextRequest, NextResponse } from 'next/server';

const BILLING_URL = process.env.BILLING_URL || 'http://localhost:3008';

/** GET /api/ai/can-use/[orgId] — check if org can use AI features */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const res = await fetch(
      `${BILLING_URL}/billing/${orgId}/can-use/ai-rewrite`,
    );
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ allowed: false }, { status: 200 });
  }
}
