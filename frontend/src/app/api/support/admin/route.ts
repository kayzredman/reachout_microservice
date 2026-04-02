import { NextRequest, NextResponse } from 'next/server';
import { currentUser, clerkClient } from '@clerk/nextjs/server';

const BACKEND = process.env.SUPPORT_SERVICE_URL || 'http://localhost:3012';

async function requireSystemAdmin() {
  const user = await currentUser();
  if (!user || (user.publicMetadata as Record<string, unknown>)?.systemAdmin !== true) {
    return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  if (!(await requireSystemAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const listAdmins = searchParams.get('admins');

  // If ?admins=true, list all system admins from Clerk
  if (listAdmins === 'true') {
    try {
      const client = await clerkClient();
      const usersRes = await client.users.getUserList({ limit: 200 });
      const admins = usersRes.data
        .filter((u) => (u.publicMetadata as Record<string, unknown>)?.systemAdmin === true)
        .map((u) => ({
          id: u.id,
          name: [u.firstName, u.lastName].filter(Boolean).join(' ') || u.emailAddresses?.[0]?.emailAddress || u.id,
          imageUrl: u.imageUrl,
        }));
      return NextResponse.json({ admins });
    } catch {
      return NextResponse.json({ admins: [] }, { status: 503 });
    }
  }

  try {
    const [statsRes, ticketsRes] = await Promise.all([
      fetch(`${BACKEND}/admin/support/stats`),
      fetch(`${BACKEND}/admin/support/tickets`),
    ]);
    const stats = await statsRes.json();
    const tickets = await ticketsRes.json();
    return NextResponse.json({ stats, tickets });
  } catch {
    return NextResponse.json(
      { stats: { total: 0, open: 0, escalated: 0, resolved: 0, avgResolutionMs: null }, tickets: [] },
      { status: 503 },
    );
  }
}

export async function POST(req: NextRequest) {
  if (!(await requireSystemAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  try {
    const body = await req.json();
    const { action, ticketId, assignedTo, summary } = body;

    if (action === 'assign' && ticketId && assignedTo) {
      const res = await fetch(`${BACKEND}/admin/support/tickets/${encodeURIComponent(ticketId)}/assign`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assignedTo }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'resolve' && ticketId) {
      const res = await fetch(`${BACKEND}/admin/support/tickets/${encodeURIComponent(ticketId)}/resolve`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary: summary || '' }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    if (action === 'status_change' && ticketId && body.status) {
      const res = await fetch(`${BACKEND}/admin/support/tickets/${encodeURIComponent(ticketId)}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: body.status }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch {
    return NextResponse.json({ error: 'Support service unavailable' }, { status: 503 });
  }
}
