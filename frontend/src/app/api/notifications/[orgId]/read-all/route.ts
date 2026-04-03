import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

/** PATCH /api/notifications/[orgId]/read-all — mark all notifications as read */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ orgId: string }> },
) {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }
  const { orgId } = await params;
  try {
    const res = await fetch(`${BACKEND_URL}/notifications/${orgId}/read-all`, {
      method: 'PATCH',
      headers: { Authorization: authHeader },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ error: 'Notification service unavailable' }, { status: 503 });
  }
}
