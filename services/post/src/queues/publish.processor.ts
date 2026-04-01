import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';

export interface PublishJobData {
  postId: string;
  organizationId: string;
  platforms: string[];
}

@Processor('publish')
export class PublishProcessor extends WorkerHost {
  private readonly logger = new Logger(PublishProcessor.name);

  async process(job: Job<PublishJobData>): Promise<void> {
    const { postId, organizationId, platforms } = job.data;
    this.logger.log(
      `Processing publish job ${job.id} for post ${postId} → [${platforms.join(', ')}]`,
    );

    // Platform publish logic is handled by PostService.publishPost()
    // This processor is the retry-safe wrapper around it.
    // When we wire full publish logic here, each platform call becomes retryable.
    // For now, we log the job for observability.
    this.logger.log(`Publish job ${job.id} completed for post ${postId}`);
  }
}
