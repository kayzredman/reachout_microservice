import { Controller, Post, Body, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

/**
 * Internal API for other microservices to enqueue notifications.
 * No auth guard — only reachable within the Docker network.
 */
@Controller('notifications')
export class SendNotificationController {
  private readonly logger = new Logger(SendNotificationController.name);

  constructor(
    @InjectQueue('notify') private readonly notifyQueue: Queue,
  ) {}

  /**
   * POST /notifications/send — enqueue a notification job.
   * Body: { type, to?, userId, orgId, subject, body, text? }
   */
  @Post('send')
  async send(
    @Body()
    data: {
      type: 'email' | 'push' | 'in-app';
      to?: string;
      userId: string;
      orgId: string;
      subject: string;
      body: string;
      text?: string;
    },
  ) {
    const job = await this.notifyQueue.add(data.type, data, {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
    });

    this.logger.log(
      `Queued ${data.type} notification job=${job.id} for user=${data.userId} subject="${data.subject}"`,
    );

    return { queued: true, jobId: job.id };
  }
}
