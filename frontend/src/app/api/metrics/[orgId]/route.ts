import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3005';

/**
 * GET /api/metrics/[orgId] — Get aggregated metrics for an organization
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
    const res = await fetch(`${BACKEND_URL}/metrics/${orgId}`, {
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Metrics service unavailable' }, { status: 503 });
  }
}
