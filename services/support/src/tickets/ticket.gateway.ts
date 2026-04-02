import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { TicketMessagesService } from './ticket-messages.service.js';
import { SenderRole } from './ticket-message.entity.js';

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/tickets',
})
export class TicketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TicketGateway.name);

  constructor(private readonly msgSvc: TicketMessagesService) {}

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Client joins a ticket room to receive live messages */
  @SubscribeMessage('join_ticket')
  handleJoinTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.join(`ticket:${data.ticketId}`);
    this.logger.debug(`${client.id} joined ticket:${data.ticketId}`);
    return { event: 'joined', ticketId: data.ticketId };
  }

  /** Client leaves a ticket room */
  @SubscribeMessage('leave_ticket')
  handleLeaveTicket(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { ticketId: string },
  ) {
    client.leave(`ticket:${data.ticketId}`);
  }

  /** Client sends a message — save to DB and broadcast to ticket room */
  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      ticketId: string;
      senderId: string;
      senderRole: SenderRole;
      senderName?: string;
      content: string;
    },
  ) {
    const message = await this.msgSvc.addMessage({
      ticketId: data.ticketId,
      senderId: data.senderId,
      senderRole: data.senderRole,
      senderName: data.senderName,
      content: data.content,
    });

    // Broadcast to everyone in the ticket room (including sender)
    this.server.to(`ticket:${data.ticketId}`).emit('new_message', message);

    return message;
  }

  /** Emit a message from the server side (e.g., WhatsApp reply, system event) */
  emitToTicket(ticketId: string, event: string, data: any) {
    this.server.to(`ticket:${ticketId}`).emit(event, data);
  }
}
