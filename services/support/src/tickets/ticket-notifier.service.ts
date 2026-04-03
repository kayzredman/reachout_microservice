import { Injectable, Logger } from '@nestjs/common';
import { Ticket } from './ticket.entity.js';
import {
  ticketResolvedEmail,
  ticketStatusUpdateEmail,
} from './email-templates.js';

const NOTIFICATION_URL =
  process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';
const USER_URL =
  process.env.USER_SERVICE_URL || 'http://localhost:3002';

@Injectable()
export class TicketNotifier {
  private readonly logger = new Logger(TicketNotifier.name);

  /** Fetch the user's email from the user service */
  private async getUserEmail(userId: string): Promise<string | null> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(`${USER_URL}/user/internal/${encodeURIComponent(userId)}`, {
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (!res.ok) return null;
      const user = await res.json();
      return user.email || user.emailAddress || null;
    } catch (err: any) {
      this.logger.warn(`Could not fetch user email for ${userId}: ${err.message}`);
      return null;
    }
  }

  /** Send a notification via the notification service queue */
  private async enqueue(payload: {
    type: string;
    to: string;
    userId: string;
    orgId: string;
    subject: string;
    body: string;
    text?: string;
  }): Promise<void> {
    try {
      const res = await fetch(`${NOTIFICATION_URL}/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        this.logger.warn(`Notification enqueue failed: ${res.status}`);
      }
    } catch (err: any) {
      this.logger.warn(`Notification service unreachable: ${err.message}`);
    }
  }

  /** Notify the ticket owner that their ticket was resolved */
  async onTicketResolved(ticket: Ticket, summary?: string): Promise<void> {
    const email = await this.getUserEmail(ticket.userId);
    if (!email) {
      this.logger.warn(
        `No email for user ${ticket.userId} — skipping resolved notification`,
      );
      return;
    }

    const userName = email.split('@')[0]; // fallback display name
    const tpl = ticketResolvedEmail({
      userName,
      ticketSubject: ticket.subject,
      ticketId: ticket.id,
      summary,
      resolvedAt: new Date().toLocaleString('en-US', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    });

    await this.enqueue({
      type: 'email',
      to: email,
      userId: ticket.userId,
      orgId: ticket.orgId,
      subject: tpl.subject,
      body: tpl.html,
      text: tpl.text,
    });

    this.logger.log(
      `Resolved notification queued for ticket ${ticket.id} → ${email}`,
    );
  }

  /** Notify the ticket owner of a status change */
  async onStatusChange(
    ticket: Ticket,
    oldStatus: string,
    newStatus: string,
  ): Promise<void> {
    // Only notify on meaningful transitions (skip minor updates)
    const notifyStatuses = ['in_progress', 'escalated', 'resolved', 'closed'];
    if (!notifyStatuses.includes(newStatus)) return;

    // Resolved has its own richer template
    if (newStatus === 'resolved') return;

    const email = await this.getUserEmail(ticket.userId);
    if (!email) return;

    const userName = email.split('@')[0];
    const tpl = ticketStatusUpdateEmail({
      userName,
      ticketSubject: ticket.subject,
      ticketId: ticket.id,
      oldStatus,
      newStatus,
    });

    await this.enqueue({
      type: 'email',
      to: email,
      userId: ticket.userId,
      orgId: ticket.orgId,
      subject: tpl.subject,
      body: tpl.html,
      text: tpl.text,
    });

    this.logger.log(
      `Status update notification queued for ticket ${ticket.id} (${oldStatus} → ${newStatus}) → ${email}`,
    );
  }
}
