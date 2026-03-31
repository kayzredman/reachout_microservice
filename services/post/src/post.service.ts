import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostEntity } from './post.entity';

/** Platforms that require an image */
const IMAGE_REQUIRED_PLATFORMS = ['Instagram'];
/** Platforms that optionally support images */
const IMAGE_OPTIONAL_PLATFORMS = ['Facebook', 'YouTube'];
/** Text-only platforms */
const TEXT_ONLY_PLATFORMS = ['X (Twitter)', 'WhatsApp'];

@Injectable()
export class PostService {
  private readonly logger = new Logger(PostService.name);

  constructor(
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
  ) {}

  /** List all posts for an organization, newest first */
  async findAll(organizationId: string): Promise<PostEntity[]> {
    return this.postRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });
  }

  /** Get a single post */
  async findOne(organizationId: string, id: string): Promise<PostEntity> {
    const post = await this.postRepo.findOne({ where: { id, organizationId } });
    if (!post) throw new NotFoundException('Post not found');
    return post;
  }

  /** Create a new post (draft or ready to publish) */
  async create(data: {
    organizationId: string;
    createdBy: string;
    content: string;
    imageUrl?: string;
    platforms: string[];
    broadcastMode?: 'direct' | 'broadcast';
    broadcastId?: string;
  }): Promise<PostEntity> {
    // Validate: Instagram requires an image
    if (data.platforms.includes('Instagram') && !data.imageUrl) {
      throw new BadRequestException('Instagram posts require an image');
    }

    const post = this.postRepo.create({
      organizationId: data.organizationId,
      createdBy: data.createdBy,
      content: data.content,
      imageUrl: data.imageUrl,
      platforms: data.platforms,
      status: 'draft',
      publishResults: [],
      broadcastMode: data.broadcastMode,
      broadcastId: data.broadcastId,
    });

    return this.postRepo.save(post);
  }

  /** Update a draft post */
  async update(
    organizationId: string,
    id: string,
    data: Partial<{ content: string; imageUrl: string; platforms: string[]; broadcastId: string }>,
  ): Promise<PostEntity> {
    const post = await this.findOne(organizationId, id);
    if (post.status !== 'draft') {
      throw new BadRequestException('Only draft posts can be edited');
    }
    Object.assign(post, data);
    return this.postRepo.save(post);
  }

  /** Delete a post */
  async remove(organizationId: string, id: string): Promise<void> {
    const post = await this.findOne(organizationId, id);
    await this.postRepo.remove(post);
  }

  /**
   * Publish a post to selected platforms.
   * Calls the platform-integration service for each platform.
   */
  async publish(
    organizationId: string,
    id: string,
    authToken: string,
  ): Promise<PostEntity> {
    const post = await this.findOne(organizationId, id);

    if (post.status === 'published') {
      throw new BadRequestException('Post is already published');
    }

    // Validate: Instagram requires an image
    if (post.platforms.includes('Instagram') && !post.imageUrl) {
      throw new BadRequestException('Instagram posts require an image. Add an image before publishing.');
    }

    if (!post.platforms || post.platforms.length === 0) {
      throw new BadRequestException('No platforms selected for publishing.');
    }

    post.status = 'publishing';
    post.publishResults = post.platforms.map((p) => ({
      platform: p,
      status: 'pending' as const,
    }));
    await this.postRepo.save(post);

    const platformServiceUrl = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

    // Publish to each platform in parallel
    const results = await Promise.allSettled(
      post.platforms.map(async (platform) => {
        // WhatsApp broadcast mode: the broadcast was already sent from the frontend
        // via the /broadcast endpoint. Just record it as published.
        if (platform === 'WhatsApp' && post.broadcastMode === 'broadcast' && post.broadcastId) {
          return { platform, data: { platformPostId: `broadcast:${post.broadcastId}` } };
        }

        // Normal publish flow
        const body: Record<string, string> = { platform, content: post.content };

        // Attach image for platforms that support it
        if (post.imageUrl && !TEXT_ONLY_PLATFORMS.includes(platform)) {
          body.imageUrl = post.imageUrl;
        }

        this.logger.log(`Publishing to ${platform} for org=${organizationId}`);

        const res = await fetch(`${platformServiceUrl}/platforms/${organizationId}/publish`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        let data: Record<string, unknown>;
        try {
          data = await res.json();
        } catch {
          throw new Error(`${platform}: Invalid response from platform service (status ${res.status})`);
        }

        if (!res.ok) {
          const errMsg = (data.message as string) || (data.error as string) || 'Publish failed';
          this.logger.warn(`Failed to publish to ${platform}: ${errMsg}`);
          throw new Error(errMsg);
        }
        return { platform, data };
      }),
    );

    // Map results back to the post (use index to match platform correctly)
    let allSucceeded = true;
    let anySucceeded = false;

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      const pr = post.publishResults[i];

      if (result.status === 'fulfilled') {
        const { data } = result.value;
        if (pr) {
          pr.status = 'published';
          pr.platformPostId = data.platformPostId as string;
        }
        anySucceeded = true;
      } else {
        allSucceeded = false;
        const errMsg = result.reason?.message || 'Unknown error';
        if (pr) {
          pr.status = 'failed';
          pr.error = errMsg;
        }
      }
    }

    post.status = allSucceeded
      ? 'published'
      : anySucceeded
        ? 'partially_failed'
        : 'failed';

    if (anySucceeded) {
      post.publishedAt = new Date();
    }

    return this.postRepo.save(post);
  }

  /** Schedule a post for future publishing */
  async schedule(
    organizationId: string,
    id: string,
    scheduledAt: string,
    authToken: string,
  ): Promise<PostEntity> {
    const post = await this.findOne(organizationId, id);

    if (post.status === 'published') {
      throw new BadRequestException('Post is already published');
    }

    const scheduleDate = new Date(scheduledAt);
    if (isNaN(scheduleDate.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    if (scheduleDate.getTime() <= Date.now()) {
      throw new BadRequestException('Scheduled time must be in the future');
    }

    // Validate Instagram image requirement upfront
    if (post.platforms.includes('Instagram') && !post.imageUrl) {
      throw new BadRequestException('Instagram posts require an image');
    }

    post.scheduledAt = scheduleDate;
    post.status = 'scheduled';
    // Store the auth token for later use by the cron job
    // (We'll store it in publishResults temporarily as metadata)
    post.publishResults = [{ platform: '__auth__', status: 'pending', platformPostId: authToken }];

    return this.postRepo.save(post);
  }

  /** Cancel a scheduled post — revert to draft */
  async cancelSchedule(
    organizationId: string,
    id: string,
  ): Promise<PostEntity> {
    const post = await this.findOne(organizationId, id);

    if (post.status !== 'scheduled') {
      throw new BadRequestException('Post is not scheduled');
    }

    post.status = 'draft';
    post.scheduledAt = undefined;
    post.publishResults = [];

    return this.postRepo.save(post);
  }

  /** List all scheduled posts for an organization */
  async findScheduled(organizationId: string): Promise<PostEntity[]> {
    return this.postRepo.find({
      where: { organizationId, status: 'scheduled' },
      order: { scheduledAt: 'ASC' },
    });
  }

  /**
   * Cron job: runs every 30 seconds.
   * Picks up posts where status = 'scheduled' and scheduledAt <= now, then publishes them.
   */
  @Cron(CronExpression.EVERY_30_SECONDS)
  async handleScheduledPosts(): Promise<void> {
    const now = new Date();
    const duePosts = await this.postRepo.find({
      where: {
        status: 'scheduled',
        scheduledAt: LessThanOrEqual(now),
      },
    });

    if (duePosts.length === 0) return;

    this.logger.log(`Found ${duePosts.length} scheduled post(s) ready to publish`);

    for (const post of duePosts) {
      try {
        // Retrieve stored auth token
        const authEntry = post.publishResults?.find(r => r.platform === '__auth__');
        const authToken = authEntry?.platformPostId || '';

        if (!authToken) {
          this.logger.warn(`No auth token for scheduled post ${post.id}, marking failed`);
          post.status = 'failed';
          post.publishResults = post.platforms.map(p => ({
            platform: p,
            status: 'failed' as const,
            error: 'No authentication token available',
          }));
          await this.postRepo.save(post);
          continue;
        }

        // Reset publishResults before publish
        post.publishResults = [];
        await this.postRepo.save(post);

        this.logger.log(`Publishing scheduled post ${post.id}...`);
        await this.publish(post.organizationId, post.id, authToken);
        this.logger.log(`Scheduled post ${post.id} published successfully`);
      } catch (err) {
        this.logger.error(`Failed to publish scheduled post ${post.id}: ${err}`);
      }
    }
  }
}
