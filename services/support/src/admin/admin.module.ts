import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller.js';
import { AdminService } from './admin.service.js';
import { TicketsModule } from '../tickets/tickets.module.js';
import { ChatModule } from '../chat/chat.module.js';

@Module({
  imports: [TicketsModule, ChatModule],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
