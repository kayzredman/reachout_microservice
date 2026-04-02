import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TicketMessage, SenderRole } from './ticket-message.entity.js';
import { Ticket } from './ticket.entity.js';

@Injectable()
export class TicketMessagesService {
  constructor(
    @InjectRepository(TicketMessage)
    private readonly msgRepo: Repository<TicketMessage>,
    @InjectRepository(Ticket)
    private readonly ticketRepo: Repository<Ticket>,
  ) {}

  /** Get all messages for a ticket, ordered by time */
  async findByTicket(ticketId: string): Promise<TicketMessage[]> {
    return this.msgRepo.find({
      where: { ticketId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Add a message to a ticket */
  async addMessage(data: {
    ticketId: string;
    senderId: string;
    senderRole: SenderRole;
    senderName?: string;
    content: string;
  }): Promise<TicketMessage> {
    const ticket = await this.ticketRepo.findOne({ where: { id: data.ticketId } });
    if (!ticket) throw new NotFoundException('Ticket not found');

    const msg = this.msgRepo.create(data);
    return this.msgRepo.save(msg);
  }

  /** Mark a message as sent via WhatsApp */
  async markWhatsAppSent(messageId: string): Promise<void> {
    await this.msgRepo.update(messageId, { sentViaWhatsApp: true });
  }
}
