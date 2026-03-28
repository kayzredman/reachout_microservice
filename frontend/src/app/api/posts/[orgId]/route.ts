import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/posts/[orgId] — List all posts for an org
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
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}

/**
 * POST /api/posts/[orgId] — Create a new post
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
    const res = await fetch(`${BACKEND_URL}/posts/${orgId}`, {
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
    return NextResponse.json({ error: 'Post service unavailable' }, { status: 503 });
  }
}
