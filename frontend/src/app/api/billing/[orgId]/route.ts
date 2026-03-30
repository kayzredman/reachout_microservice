import { NextRequest, NextResponse } from 'next/server';

const BILLING_URL = process.env.BILLING_URL || 'http://localhost:3008';

/** GET  /api/billing/[orgId] — get subscription info */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const res = await fetch(`${BILLING_URL}/billing/${orgId}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { tier: 'starter', orgId },
      { status: 200 },
    );
  }
}

/** PUT  /api/billing/[orgId] — update subscription tier */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const { orgId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${BILLING_URL}/billing/${orgId}/tier`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Billing service unavailable' },
      { status: 503 },
    );
  }
}
