import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/posts/[orgId]/scheduled — List all scheduled posts
 */
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
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}/scheduled`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}
