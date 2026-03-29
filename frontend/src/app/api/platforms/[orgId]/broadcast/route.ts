import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

/**
 * POST /api/platforms/[orgId]/broadcast — Send a broadcast message
 * GET  /api/platforms/[orgId]/broadcast — List broadcast history
 */
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
    const res = await fetch(`${BACKEND_URL}/platforms/${orgId}/broadcast`, {
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
    return NextResponse.json({ error: 'Platform service unavailable' }, { status: 503 });
  }
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/platforms/${orgId}/broadcasts`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform service unavailable' }, { status: 503 });
  }
}
