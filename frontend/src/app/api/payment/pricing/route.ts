import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:3011';

/** GET /api/payment/pricing?currency=GHS */
export async function GET(req: NextRequest) {
  try {
    const currency = req.nextUrl.searchParams.get('currency') || 'USD';
    const res = await fetch(`${PAYMENT_URL}/payment/pricing?currency=${encodeURIComponent(currency)}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Payment service unavailable' },
      { status: 503 },
    );
  }
}
