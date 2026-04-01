import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:3011';

/** GET /api/payment/verify/[txRef] — check payment status after redirect */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ txRef: string }> },
) {
  const { txRef } = await params;
  try {
    const res = await fetch(`${PAYMENT_URL}/payment/verify/${encodeURIComponent(txRef)}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Payment service unavailable' },
      { status: 503 },
    );
  }
}
