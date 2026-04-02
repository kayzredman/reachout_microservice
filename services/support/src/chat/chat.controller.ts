import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  HttpCode,
} from '@nestjs/common';
import { ChatService } from './chat.service.js';

@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  /** POST /chat — send a message to the AI support agent */
  @Post()
  @HttpCode(200)
  async chat(
    @Body()
    body: {
      orgId: string;
      userId: string;
      message: string;
      conversationId?: string;
    },
  ) {
    return this.chatService.chat(
      body.orgId,
      body.userId,
      body.message,
      body.conversationId,
    );
  }

  /** GET /chat/conversations?orgId=xxx — list conversations */
  @Get('conversations')
  getConversations(@Query('orgId') orgId: string) {
    return this.chatService.getConversations(orgId);
  }

  /** GET /chat/conversations/:id/messages — get history */
  @Get('conversations/:id/messages')
  getHistory(@Param('id') id: string) {
    return this.chatService.getHistory(id);
  }
}
