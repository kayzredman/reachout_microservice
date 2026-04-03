import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

/**
 * GET /api/analytics/[orgId]/dashboard
 * All-in-one analytics: overview + top posts + trends in a single request.
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
    const res = await fetch(`${BACKEND_URL}/analytics/${orgId}/dashboard`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Analytics service unavailable' }, { status: 503 });
  }
}
