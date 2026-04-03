import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Ticket, TicketStatus } from './ticket.entity.js';

@Injectable()
export class TicketsService {
  constructor(
    @InjectRepository(Ticket) private readonly repo: Repository<Ticket>,
  ) {}

  async create(data: Partial<Ticket>): Promise<Ticket> {
    const ticket = this.repo.create(data);
    return this.repo.save(ticket);
  }

  async findByOrg(orgId: string): Promise<Ticket[]> {
    return this.repo.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }

  async findById(id: string): Promise<Ticket | null> {
    return this.repo.findOne({ where: { id } });
  }

  async update(id: string, data: Partial<Ticket>): Promise<Ticket | null> {
    await this.repo.update(id, data);
    return this.findById(id);
  }

  async escalate(id: string): Promise<Ticket | null> {
    return this.update(id, {
      status: TicketStatus.ESCALATED,
      priority: undefined, // keep existing
    });
  }

  async resolve(id: string, aiSummary?: string): Promise<Ticket | null> {
    return this.update(id, {
      status: TicketStatus.RESOLVED,
      aiSummary,
      resolvedAt: new Date(),
    });
  }

  /** Admin: all open/escalated tickets across orgs */
  async findOpenTickets(): Promise<Ticket[]> {
    return this.repo.find({
      where: [
        { status: TicketStatus.OPEN },
        { status: TicketStatus.ESCALATED },
        { status: TicketStatus.IN_PROGRESS },
      ],
      order: { createdAt: 'ASC' },
    });
  }

  /** Dashboard stats */
  async getStats(): Promise<{
    total: number;
    open: number;
    escalated: number;
    resolved: number;
    avgResolutionMs: number | null;
  }> {
    const total = await this.repo.count();
    const open = await this.repo.count({ where: { status: TicketStatus.OPEN } });
    const escalated = await this.repo.count({ where: { status: TicketStatus.ESCALATED } });
    const resolved = await this.repo.count({ where: { status: TicketStatus.RESOLVED } });

    const avgResult = await this.repo
      .createQueryBuilder('t')
      .select('AVG(EXTRACT(EPOCH FROM (t."resolvedAt" - t."createdAt")) * 1000)', 'avg')
      .where('t.status = :status', { status: TicketStatus.RESOLVED })
      .andWhere('t."resolvedAt" IS NOT NULL')
      .getRawOne();

    return {
      total,
      open,
      escalated,
      resolved,
      avgResolutionMs: avgResult?.avg ? parseFloat(avgResult.avg) : null,
    };
  }

  /** Find an open ticket linked to this WhatsApp phone */
  async findByWhatsAppPhone(
    orgId: string,
    phone: string,
  ): Promise<Ticket | null> {
    return this.repo.findOne({
      where: [
        { orgId, whatsappPhone: phone, status: TicketStatus.OPEN },
        { orgId, whatsappPhone: phone, status: TicketStatus.ESCALATED },
        { orgId, whatsappPhone: phone, status: TicketStatus.IN_PROGRESS },
      ],
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Find any active ticket for this org that has a whatsappPhone set.
   * Used as a fallback when the sender's phone (e.g. a LID) doesn't directly
   * match the stored engineer phone.
   */
  async findActiveTicketWithWhatsApp(
    orgId: string,
  ): Promise<Ticket | null> {
    return this.repo.findOne({
      where: [
        { orgId, status: TicketStatus.OPEN },
        { orgId, status: TicketStatus.ESCALATED },
        { orgId, status: TicketStatus.IN_PROGRESS },
      ],
      order: { createdAt: 'DESC' },
    }).then(t => (t?.whatsappPhone ? t : null));
  }
}
