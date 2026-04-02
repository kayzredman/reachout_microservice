import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Conversation } from './conversation.entity.js';
import { Message } from './message.entity.js';
import { ChatController } from './chat.controller.js';
import { ChatService } from './chat.service.js';
import { ContextGatherer } from './context-gatherer.js';
import { ActionRunner } from './action-runner.js';
import { TicketsModule } from '../tickets/tickets.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Conversation, Message]),
    TicketsModule,
  ],
  controllers: [ChatController],
  providers: [ChatService, ContextGatherer, ActionRunner],
  exports: [ChatService, ContextGatherer],
})
export class ChatModule {}
