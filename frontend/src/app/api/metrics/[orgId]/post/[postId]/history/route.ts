import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/metrics/[orgId]/post/[postId]/history — Get full metrics history for a post
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, postId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/metrics/${orgId}/post/${postId}/history`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Metrics service unavailable' }, { status: 503 });
  }
}
