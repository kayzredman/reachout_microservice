import { NextRequest, NextResponse } from 'next/server';

const BACKEND = process.env.SUPPORT_SERVICE_URL || 'http://localhost:3012';

export async function GET() {
  const [statsRes, ticketsRes] = await Promise.all([
    fetch(`${BACKEND}/admin/support/stats`),
    fetch(`${BACKEND}/admin/support/tickets`),
  ]);
  const stats = await statsRes.json();
  const tickets = await ticketsRes.json();
  return NextResponse.json({ stats, tickets });
}
