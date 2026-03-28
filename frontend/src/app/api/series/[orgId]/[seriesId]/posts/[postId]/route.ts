import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * POST /api/series/[orgId]/[seriesId]/posts/[postId] — Add a post to a series
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; seriesId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, seriesId, postId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/series/${orgId}/${seriesId}/posts/${postId}`, {
      method: 'POST',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

/**
 * DELETE /api/series/[orgId]/[seriesId]/posts/[postId] — Remove a post from a series
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; seriesId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, seriesId, postId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/series/${orgId}/${seriesId}/posts/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
