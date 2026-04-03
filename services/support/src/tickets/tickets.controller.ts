import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { TicketMessagesService } from './ticket-messages.service.js';
import { TicketCategory, TicketPriority } from './ticket.entity.js';
import { SenderRole } from './ticket-message.entity.js';
import { TicketGateway } from './ticket.gateway.js';

@Controller('tickets')
export class TicketsController {
  private readonly logger = new Logger(TicketsController.name);

  constructor(
    private readonly svc: TicketsService,
    private readonly msgSvc: TicketMessagesService,
    private readonly gateway: TicketGateway,
  ) {}

  /** POST /tickets — create a new support ticket */
  @Post()
  create(
    @Body()
    body: {
      orgId: string;
      userId: string;
      subject: string;
      description: string;
      category?: TicketCategory;
      priority?: TicketPriority;
    },
  ) {
    return this.svc.create(body);
  }

  /** GET /tickets?orgId=xxx — list tickets for an org */
  @Get()
  list(@Query('orgId') orgId: string) {
    return this.svc.findByOrg(orgId);
  }

  /** GET /tickets/:id — get single ticket */
  @Get(':id')
  async findOne(@Param('id') id: string) {
    const ticket = await this.svc.findById(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /** PATCH /tickets/:id — update ticket */
  @Patch(':id')
  async update(@Param('id') id: string, @Body() body: Record<string, any>) {
    const ticket = await this.svc.update(id, body);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /** POST /tickets/:id/escalate — escalate to human */
  @Post(':id/escalate')
  async escalate(@Param('id') id: string) {
    const ticket = await this.svc.escalate(id);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /** POST /tickets/:id/resolve — mark resolved */
  @Post(':id/resolve')
  async resolve(
    @Param('id') id: string,
    @Body() body: { aiSummary?: string },
  ) {
    const ticket = await this.svc.resolve(id, body.aiSummary);
    if (!ticket) throw new NotFoundException('Ticket not found');
    return ticket;
  }

  /* ── Ticket Messages (human-to-human chat) ── */

  /** GET /tickets/:id/messages — list messages on a ticket */
  @Get(':id/messages')
  getMessages(@Param('id') id: string) {
    return this.msgSvc.findByTicket(id);
  }

  /** POST /tickets/:id/messages — add a message to a ticket */
  @Post(':id/messages')
  addMessage(
    @Param('id') id: string,
    @Body()
    body: {
      senderId: string;
      senderRole: SenderRole;
      senderName?: string;
      content: string;
    },
  ) {
    return this.msgSvc.addMessage({
      ticketId: id,
      senderId: body.senderId,
      senderRole: body.senderRole,
      senderName: body.senderName,
      content: body.content,
    });
  }

  /** PATCH /tickets/mark-wa/:messageId — mark a ticket message as sent via WhatsApp */
  @Patch('mark-wa/:messageId')
  markWhatsAppSent(@Param('messageId') messageId: string) {
    return this.msgSvc.markWhatsAppSent(messageId);
  }

  /**
   * POST /tickets/whatsapp/incoming — receive an incoming WhatsApp message
   * Called by the platform-integration service when a customer texts in.
   * Finds the open ticket linked to that phone, adds the message, and
   * pushes it to connected admins via WebSocket.
   */
  @Post('whatsapp/incoming')
  async whatsappIncoming(
    @Body()
    body: {
      orgId: string;
      senderPhone: string;
      senderName?: string;
      fromMe?: boolean;
      text: string;
      messageId?: string;
      timestamp?: string;
    },
  ) {
    const { orgId, senderPhone, senderName, text } = body;
    if (!orgId || !senderPhone || !text) {
      return { received: false, reason: 'Missing required fields' };
    }

    // Find an open ticket where whatsappPhone matches the sender
    let ticket = await this.svc.findByWhatsAppPhone(orgId, senderPhone);

    // Fallback: if no match (e.g. sender is a WhatsApp LID, not a phone number),
    // find any active ticket for this org that has WhatsApp enabled
    if (!ticket) {
      ticket = await this.svc.findActiveTicketWithWhatsApp(orgId);
      if (ticket) {
        this.logger.log(
          `LID fallback: matched ticket ${ticket.id} for org=${orgId} (sender=${senderPhone})`,
        );
      }
    }

    if (!ticket) {
      this.logger.debug(
        `No open ticket for phone=${senderPhone} org=${orgId}, ignoring`,
      );
      return { received: false, reason: 'No matching open ticket' };
    }

    // Determine if the sender is the engineer:
    // - Direct match: senderPhone === ticket.whatsappPhone
    // - LID fallback: phone didn't match, but message was NOT fromMe
    //   (fromMe = sent from the Baileys-connected device = the user/org phone,
    //    !fromMe = received from external = the engineer's phone)
    const isEngineer =
      ticket.whatsappPhone === senderPhone || body.fromMe === false;
    const role = isEngineer ? SenderRole.ADMIN : SenderRole.USER;
    const name = isEngineer
      ? (senderName || 'Support Engineer')
      : (senderName || senderPhone);

    // Save the message
    const message = await this.msgSvc.addMessage({
      ticketId: ticket.id,
      senderId: senderPhone,
      senderRole: role,
      senderName: name,
      content: text,
    });

    // Push to admin browsers via WebSocket
    this.gateway.emitToTicket(ticket.id, 'new_message', message);

    this.logger.log(
      `WhatsApp message from ${senderPhone} → ticket ${ticket.id}`,
    );
    return { received: true, ticketId: ticket.id, messageId: message.id };
  }
}
