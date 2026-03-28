import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * POST /api/posts/[orgId]/[postId]/publish — Publish a post to selected platforms
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, postId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}/${postId}/publish`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}
