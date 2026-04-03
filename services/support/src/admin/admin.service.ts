import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service.js';
import { TicketStatus } from '../tickets/ticket.entity.js';
import { ChatService } from '../chat/chat.service.js';
import { ContextGatherer } from '../chat/context-gatherer.js';
import { TicketNotifier } from '../tickets/ticket-notifier.service.js';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private readonly ticketsService: TicketsService,
    private readonly chatService: ChatService,
    private readonly contextGatherer: ContextGatherer,
    private readonly notifier: TicketNotifier,
  ) {}

  async getStats() {
    return this.ticketsService.getStats();
  }

  async getOpenTickets() {
    return this.ticketsService.findOpenTickets();
  }

  async getTicketDetail(ticketId: string) {
    const ticket = await this.ticketsService.findById(ticketId);
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Fetch conversation history if linked
    let messages: any[] = [];
    const conversations = await this.chatService.getConversations(ticket.orgId);
    const linked = conversations.find((c) => c.id === (ticket as any).conversationId);
    if (linked) {
      messages = await this.chatService.getHistory(linked.id);
    }

    return { ticket, messages };
  }

  async assignTicket(ticketId: string, assignedTo: string) {
    const ticket = await this.ticketsService.update(ticketId, {
      assignedTo,
      status: TicketStatus.IN_PROGRESS,
    });
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  async resolveTicket(ticketId: string, summary?: string) {
    const ticket = await this.ticketsService.resolve(ticketId, summary);
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Fire-and-forget: send resolved email notification
    this.notifier.onTicketResolved(ticket, summary).catch((err) =>
      this.logger.warn(`Resolve notification failed: ${err.message}`),
    );

    return ticket;
  }

  async changeStatus(ticketId: string, status: string) {
    const valid = Object.values(TicketStatus) as string[];
    if (!valid.includes(status)) {
      throw new NotFoundException(`Invalid status: ${status}`);
    }

    // Capture old status before update
    const existing = await this.ticketsService.findById(ticketId);
    const oldStatus = existing?.status || 'unknown';

    const update: Record<string, any> = { status };
    if (status === TicketStatus.RESOLVED) {
      update.resolvedAt = new Date();
    }
    const ticket = await this.ticketsService.update(ticketId, update);
    if (!ticket) throw new NotFoundException('Ticket not found');

    // Fire-and-forget: send status notification
    if (status === TicketStatus.RESOLVED) {
      this.notifier.onTicketResolved(ticket).catch((err) =>
        this.logger.warn(`Resolve notification failed: ${err.message}`),
      );
    } else {
      this.notifier.onStatusChange(ticket, oldStatus, status).catch((err) =>
        this.logger.warn(`Status notification failed: ${err.message}`),
      );
    }

    return ticket;
  }

  /** Gather health signals for an org (used by admin dashboard) */
  async getOrgHealth(orgId: string) {
    const context = await this.contextGatherer.gather(orgId, '');
    return {
      orgId,
      healthSignals: context.healthSignals,
      billing: context.billing,
      disconnectedPlatforms: (context.platforms || []).filter(
        (p: any) => !p.connected,
      ),
      recentFailedPosts: (context.recentPosts || []).filter(
        (p: any) => p.status === 'failed',
      ),
    };
  }
}
