import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ticket } from './ticket.entity.js';
import { TicketMessage } from './ticket-message.entity.js';
import { TicketsController } from './tickets.controller.js';
import { TicketsService } from './tickets.service.js';
import { TicketMessagesService } from './ticket-messages.service.js';
import { TicketGateway } from './ticket.gateway.js';
import { TicketNotifier } from './ticket-notifier.service.js';

@Module({
  imports: [TypeOrmModule.forFeature([Ticket, TicketMessage])],
  controllers: [TicketsController],
  providers: [TicketsService, TicketMessagesService, TicketGateway, TicketNotifier],
  exports: [TicketsService, TicketMessagesService, TicketGateway, TicketNotifier],
})
export class TicketsModule {}
