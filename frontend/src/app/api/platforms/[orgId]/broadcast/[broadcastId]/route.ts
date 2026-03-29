import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

/**
 * GET /api/platforms/[orgId]/broadcast/[broadcastId] — Get single broadcast with stats
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; broadcastId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, broadcastId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/platforms/${orgId}/broadcasts/${broadcastId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform service unavailable' }, { status: 503 });
  }
}
