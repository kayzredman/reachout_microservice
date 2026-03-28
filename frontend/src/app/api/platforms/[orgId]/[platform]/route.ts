import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

/**
 * DELETE /api/platforms/[orgId]/[platform] — Disconnect a platform
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string; platform: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId, platform } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/platforms/${orgId}/${encodeURIComponent(platform)}`, {
      method: 'DELETE',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Platform service unavailable' }, { status: 503 });
  }
}
