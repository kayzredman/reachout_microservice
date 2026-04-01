import { NextRequest, NextResponse } from 'next/server';

const PAYMENT_URL = process.env.PAYMENT_URL || 'http://localhost:3011';

/** POST /api/payment/charge/momo — direct Mobile Money charge */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${PAYMENT_URL}/payment/charge/momo`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json(
      { error: 'Payment service unavailable' },
      { status: 503 },
    );
  }
}
