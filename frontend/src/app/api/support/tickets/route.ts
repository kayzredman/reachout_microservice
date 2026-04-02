import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.SUPPORT_SERVICE_URL || 'http://localhost:3012';

export async function GET(req: NextRequest) {
  try {
    const orgId = req.nextUrl.searchParams.get('orgId');
    const res = await fetch(`${BACKEND}/tickets?orgId=${encodeURIComponent(orgId || '')}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json([], { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Support service unavailable' }, { status: 503 });
  }
}
