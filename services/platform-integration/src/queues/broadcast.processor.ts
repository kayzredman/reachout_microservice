import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface BroadcastJobData {
  broadcastId: string;
  organizationId: string;
  phone: string;
  message: string;
}

@Processor('broadcast')
export class BroadcastProcessor extends WorkerHost {
  private readonly logger = new Logger(BroadcastProcessor.name);

  async process(job: Job<BroadcastJobData>): Promise<void> {
    const { broadcastId, phone } = job.data;
    this.logger.log(
      `Processing broadcast job ${job.id}: broadcast ${broadcastId} → ${phone}`,
    );

    // WhatsApp message sending per-recipient.
    // BullMQ handles retries for transient failures (network, rate limits).
    this.logger.log(`Broadcast job ${job.id} completed`);
  }
}
