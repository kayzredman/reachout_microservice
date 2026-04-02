import { NextRequest, NextResponse } from 'next/server';

const PLATFORM_URL = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';
const SUPPORT_URL = process.env.SUPPORT_SERVICE_URL || 'http://localhost:3012';

export async function POST(req: NextRequest) {
  try {
    const { orgId, phone, message, ticketMessageId } = await req.json();

    if (!orgId || !phone || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Send WhatsApp message via platform-integration Baileys
    const res = await fetch(`${PLATFORM_URL}/platforms/${encodeURIComponent(orgId)}/whatsapp/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, message }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      return NextResponse.json({ error: err.message || 'WhatsApp send failed' }, { status: res.status });
    }

    // Mark the ticket message as sent via WhatsApp
    if (ticketMessageId) {
      fetch(`${SUPPORT_URL}/tickets/mark-wa/${encodeURIComponent(ticketMessageId)}`, {
        method: 'PATCH',
      }).catch(() => { /* best-effort */ });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Service unavailable' }, { status: 503 });
  }
}
