import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { EmailService } from '../email.service';
import { InAppNotificationService } from '../in-app-notification.service';
import { NotificationGateway } from '../notification.gateway';

export interface NotifyJobData {
  type: 'email' | 'push' | 'in-app';
  to?: string; // email address (for email type)
  userId: string;
  orgId: string;
  subject: string;
  body: string; // HTML body for email, plain text for others
  text?: string; // optional plain-text fallback
}

@Processor('notify')
export class NotifyProcessor extends WorkerHost {
  private readonly logger = new Logger(NotifyProcessor.name);

  constructor(
    @Inject(EmailService) private readonly emailService: EmailService,
    private readonly inAppService: InAppNotificationService,
    private readonly gateway: NotificationGateway,
  ) {
    super();
  }

  async process(job: Job<NotifyJobData>): Promise<void> {
    const { type, userId, subject } = job.data;
    this.logger.log(
      `Processing ${type} notification job ${job.id} for user ${userId}: ${subject}`,
    );

    switch (type) {
      case 'email':
        await this.handleEmail(job.data);
        break;
      case 'push':
        // Push also creates an in-app notification + WebSocket delivery
        await this.handleInApp(job.data);
        break;
      case 'in-app':
        await this.handleInApp(job.data);
        break;
    }

    this.logger.log(`Notification job ${job.id} completed`);
  }

  private async handleEmail(data: NotifyJobData): Promise<void> {
    if (!data.to) {
      this.logger.warn(`Email job missing 'to' address for user ${data.userId}`);
      return;
    }

    await this.emailService.send({
      to: data.to,
      subject: data.subject,
      html: data.body,
      text: data.text,
    });
  }

  private async handleInApp(data: NotifyJobData): Promise<void> {
    const notif = await this.inAppService.create({
      userId: data.userId,
      organizationId: data.orgId,
      title: data.subject,
      body: data.text || data.body,
    });

    this.gateway.pushToUser(data.userId, data.orgId, {
      id: notif.id,
      title: notif.title,
      body: notif.body,
      read: notif.read,
      createdAt: notif.createdAt,
    });
  }
}
