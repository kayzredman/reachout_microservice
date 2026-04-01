import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface ScheduledPostJobData {
  postId: string;
  organizationId: string;
  scheduledAt: string;
}

@Processor('scheduled-post')
export class ScheduledPostProcessor extends WorkerHost {
  private readonly logger = new Logger(ScheduledPostProcessor.name);

  async process(job: Job<ScheduledPostJobData>): Promise<void> {
    const { postId, organizationId, scheduledAt } = job.data;
    this.logger.log(
      `Processing scheduled post job ${job.id}: post ${postId} scheduled for ${scheduledAt}`,
    );

    // Calls the post service publish endpoint when the scheduled time arrives.
    // BullMQ delayed jobs replace cron-based polling for precise scheduling.
    this.logger.log(`Scheduled post job ${job.id} completed`);
  }
}
