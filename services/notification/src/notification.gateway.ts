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

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/notifications',
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(NotificationGateway.name);

  handleConnection(client: Socket) {
    this.logger.debug(`Client connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Client disconnected: ${client.id}`);
  }

  /** Client joins their user-specific room to receive notifications */
  @SubscribeMessage('subscribe')
  handleSubscribe(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { userId: string; orgId: string },
  ) {
    const room = `user:${data.userId}:${data.orgId}`;
    client.join(room);
    this.logger.debug(`${client.id} joined room ${room}`);
    return { event: 'subscribed', room };
  }

  /** Push a notification to a specific user */
  pushToUser(userId: string, orgId: string, notification: Record<string, unknown>) {
    const room = `user:${userId}:${orgId}`;
    this.server.to(room).emit('notification', notification);
  }
}
