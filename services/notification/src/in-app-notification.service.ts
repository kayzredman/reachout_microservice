import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './notification.entity';

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async create(data: {
    userId: string;
    organizationId: string;
    title: string;
    body: string;
  }): Promise<Notification> {
    const notif = this.notifRepo.create(data);
    const saved = await this.notifRepo.save(notif);
    this.logger.log(`Created in-app notification ${saved.id} for user ${data.userId}`);
    return saved;
  }

  async listForUser(
    userId: string,
    organizationId: string,
    limit = 30,
  ): Promise<{ notifications: Notification[]; unreadCount: number }> {
    const [notifications, unreadCount] = await Promise.all([
      this.notifRepo.find({
        where: { userId, organizationId },
        order: { createdAt: 'DESC' },
        take: limit,
      }),
      this.notifRepo.count({
        where: { userId, organizationId, read: false },
      }),
    ]);
    return { notifications, unreadCount };
  }

  async markAsRead(id: string, userId: string): Promise<void> {
    await this.notifRepo.update({ id, userId }, { read: true });
  }

  async markAllRead(userId: string, organizationId: string): Promise<void> {
    await this.notifRepo.update(
      { userId, organizationId, read: false },
      { read: true },
    );
  }
}
