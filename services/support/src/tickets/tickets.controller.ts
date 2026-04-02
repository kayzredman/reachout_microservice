import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { TicketsService } from './tickets.service.js';
import { TicketCategory, TicketPriority } from './ticket.entity.js';

@Controller('tickets')
export class TicketsController {
  constructor(private readonly svc: TicketsService) {}

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
}
