import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

/**
 * POST /api/platforms/[orgId]/callback — Handle OAuth callback code exchange
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
    const res = await fetch(`${BACKEND_URL}/platforms/${orgId}/callback`, {
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
