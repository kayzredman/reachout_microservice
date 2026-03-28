import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/posts/[orgId]/[postId] — Get a single post
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
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}/${postId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}

/**
 * PUT /api/posts/[orgId]/[postId] — Update a post (draft only)
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, postId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}/${postId}`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}

/**
 * DELETE /api/posts/[orgId]/[postId] — Delete a post
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; postId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, postId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}/${postId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}
