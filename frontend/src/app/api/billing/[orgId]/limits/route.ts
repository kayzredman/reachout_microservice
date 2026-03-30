import { NextRequest, NextResponse } from 'next/server';

const BILLING_URL = process.env.BILLING_URL || 'http://localhost:3008';

/** GET /api/billing/[orgId]/limits — get tier limits */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const res = await fetch(`${BILLING_URL}/billing/${orgId}/limits`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { tier: 'starter', limits: { maxSeries: 3, maxPostsPerMonth: 30, aiPlansPerMonth: 0 } },
      { status: 200 },
    );
  }
}
