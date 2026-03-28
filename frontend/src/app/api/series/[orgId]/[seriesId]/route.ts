import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.POST_SERVICE_URL || 'http://localhost:3003';

/**
 * GET /api/series/[orgId]/[seriesId] — Get a single series with posts
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; seriesId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, seriesId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/series/${orgId}/${seriesId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

/**
 * PUT /api/series/[orgId]/[seriesId] — Update a series
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; seriesId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, seriesId } = await params;
  try {
    const body = await req.json();
    const res = await fetch(`${BACKEND_URL}/series/${orgId}/${seriesId}`, {
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
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}

/**
 * DELETE /api/series/[orgId]/[seriesId] — Delete a series
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; seriesId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, seriesId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/series/${orgId}/${seriesId}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
