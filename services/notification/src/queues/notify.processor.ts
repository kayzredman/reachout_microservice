import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface NotifyJobData {
  type: 'email' | 'push' | 'in-app';
  userId: string;
  orgId: string;
  subject: string;
  body: string;
}

@Processor('notify')
export class NotifyProcessor extends WorkerHost {
  private readonly logger = new Logger(NotifyProcessor.name);

  async process(job: Job<NotifyJobData>): Promise<void> {
    const { type, userId, subject } = job.data;
    this.logger.log(
      `Processing ${type} notification job ${job.id} for user ${userId}: ${subject}`,
    );

    // Actual email/push delivery logic will be added here.
    // BullMQ provides automatic retries with exponential backoff.
    this.logger.log(`Notification job ${job.id} completed`);
  }
}
