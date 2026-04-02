import { Injectable, NotFoundException } from '@nestjs/common';
import { TicketsService } from '../tickets/tickets.service.js';
import { TicketStatus } from '../tickets/ticket.entity.js';
import { ChatService } from '../chat/chat.service.js';
import { ContextGatherer } from '../chat/context-gatherer.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly ticketsService: TicketsService,
    private readonly chatService: ChatService,
    private readonly contextGatherer: ContextGatherer,
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
