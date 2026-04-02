import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { join } from 'path';
import { Ticket } from './tickets/ticket.entity.js';
import { TicketMessage } from './tickets/ticket-message.entity.js';
import { Conversation } from './chat/conversation.entity.js';
import { Message } from './chat/message.entity.js';
import { TicketsModule } from './tickets/tickets.module.js';
import { ChatModule } from './chat/chat.module.js';
import { AdminModule } from './admin/admin.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '.env'), isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_support',
      entities: [Ticket, TicketMessage, Conversation, Message],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TicketsModule,
    ChatModule,
    AdminModule,
  ],
})
export class AppModule {}
