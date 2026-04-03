/**
 * Email templates for support ticket notifications.
 * Generates { subject, html, text } for the notification service.
 */

const BRAND_COLOR = '#6366f1';
const LOGO_TEXT = 'FaithReach';

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 16px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">
          <tr>
            <td style="background:${BRAND_COLOR};padding:24px 32px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">${LOGO_TEXT}</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              ${body}
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px;background:#fafafa;border-top:1px solid #e4e4e7;">
              <p style="margin:0;font-size:12px;color:#71717a;text-align:center;">
                &copy; ${new Date().getFullYear()} FaithReach. All rights reserved.<br/>
                You received this email because you have a support ticket on FaithReach.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function ticketResolvedEmail(data: {
  userName: string;
  ticketSubject: string;
  ticketId: string;
  summary?: string;
  resolvedAt: string;
}): { subject: string; html: string; text: string } {
  const safeSubject = escapeHtml(data.ticketSubject);
  const safeName = escapeHtml(data.userName);
  const subject = `Your support ticket has been resolved — ${data.ticketSubject}`;

  const summaryBlock = data.summary
    ? `<div style="margin:16px 0;padding:16px;background:#f0fdf4;border-left:4px solid #22c55e;border-radius:4px;">
        <p style="margin:0 0 4px;font-weight:600;color:#15803d;">Resolution Summary</p>
        <p style="margin:0;color:#374151;">${escapeHtml(data.summary)}</p>
      </div>`
    : '';

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Ticket Resolved &#10003;</h2>
    <p style="margin:0 0 20px;color:#52525b;">Hi ${safeName},</p>
    <p style="margin:0 0 16px;color:#374151;">
      Great news! Your support ticket <strong>&ldquo;${safeSubject}&rdquo;</strong> has been resolved.
    </p>
    ${summaryBlock}
    <table width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;">
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:14px;">Ticket ID</td>
        <td style="padding:8px 0;color:#18181b;font-size:14px;text-align:right;font-family:monospace;">${escapeHtml(data.ticketId.slice(0, 8))}</td>
      </tr>
      <tr>
        <td style="padding:8px 0;color:#71717a;font-size:14px;">Resolved At</td>
        <td style="padding:8px 0;color:#18181b;font-size:14px;text-align:right;">${escapeHtml(data.resolvedAt)}</td>
      </tr>
    </table>
    <p style="margin:20px 0 0;color:#52525b;font-size:14px;">
      If you still need help, feel free to open a new ticket or chat with our AI support agent anytime.
    </p>
    <p style="margin:16px 0 0;color:#52525b;font-size:14px;">
      Blessings,<br/><strong>The FaithReach Support Team</strong>
    </p>
  `;

  const text = `Hi ${data.userName},

Your support ticket "${data.ticketSubject}" has been resolved.
${data.summary ? `\nResolution: ${data.summary}\n` : ''}
Ticket ID: ${data.ticketId.slice(0, 8)}
Resolved At: ${data.resolvedAt}

If you still need help, feel free to open a new ticket or chat with our AI support agent.

— The FaithReach Support Team`;

  return { subject, html: layout(subject, body), text };
}

export function ticketStatusUpdateEmail(data: {
  userName: string;
  ticketSubject: string;
  ticketId: string;
  oldStatus: string;
  newStatus: string;
}): { subject: string; html: string; text: string } {
  const safeSubject = escapeHtml(data.ticketSubject);
  const safeName = escapeHtml(data.userName);
  const subject = `Ticket update: ${data.ticketSubject}`;

  const statusColor: Record<string, string> = {
    open: '#3b82f6',
    in_progress: '#f59e0b',
    escalated: '#ef4444',
    resolved: '#22c55e',
    closed: '#6b7280',
    ai_handled: '#8b5cf6',
  };

  const color = statusColor[data.newStatus] || '#6b7280';
  const label = escapeHtml(
    data.newStatus.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
  );

  const body = `
    <h2 style="margin:0 0 8px;font-size:20px;color:#18181b;">Ticket Status Updated</h2>
    <p style="margin:0 0 20px;color:#52525b;">Hi ${safeName},</p>
    <p style="margin:0 0 16px;color:#374151;">
      Your support ticket <strong>&ldquo;${safeSubject}&rdquo;</strong> has been updated.
    </p>
    <div style="margin:16px 0;padding:16px;background:#f9fafb;border-radius:8px;text-align:center;">
      <span style="display:inline-block;padding:6px 16px;background:${color};color:white;border-radius:20px;font-weight:600;font-size:14px;">
        ${label}
      </span>
    </div>
    <p style="margin:20px 0 0;color:#52525b;font-size:14px;">
      Ticket ID: <code style="background:#f4f4f5;padding:2px 6px;border-radius:4px;">${escapeHtml(data.ticketId.slice(0, 8))}</code>
    </p>
    <p style="margin:16px 0 0;color:#52525b;font-size:14px;">
      Blessings,<br/><strong>The FaithReach Support Team</strong>
    </p>
  `;

  const text = `Hi ${data.userName},

Your support ticket "${data.ticketSubject}" status has changed to: ${data.newStatus.replace(/_/g, ' ')}

Ticket ID: ${data.ticketId.slice(0, 8)}

— The FaithReach Support Team`;

  return { subject, html: layout(subject, body), text };
}
