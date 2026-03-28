import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PostEntity } from './post.entity';
import { PostMetrics } from './post-metrics.entity';

@Injectable()
export class MetricsService {
  private readonly logger = new Logger(MetricsService.name);

  constructor(
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
    @InjectRepository(PostMetrics)
    private metricsRepo: Repository<PostMetrics>,
  ) {}

  /** Get all metrics for a specific post */
  async getMetricsForPost(postId: string): Promise<PostMetrics[]> {
    return this.metricsRepo.find({
      where: { postId },
      order: { fetchedAt: 'DESC' },
    });
  }

  /** Get latest metrics for a post grouped by platform */
  async getLatestMetrics(postId: string): Promise<Record<string, PostMetrics>> {
    const metrics = await this.metricsRepo
      .createQueryBuilder('m')
      .where('m.postId = :postId', { postId })
      .orderBy('m.fetchedAt', 'DESC')
      .getMany();

    const latest: Record<string, PostMetrics> = {};
    for (const m of metrics) {
      if (!latest[m.platform]) {
        latest[m.platform] = m;
      }
    }
    return latest;
  }

  /** Get aggregated metrics for all posts in an organization */
  async getOrgMetrics(organizationId: string): Promise<{
    totalImpressions: number;
    totalLikes: number;
    totalComments: number;
    totalShares: number;
    totalReach: number;
    byPlatform: Record<string, { impressions: number; likes: number; comments: number; shares: number; reach: number }>;
  }> {
    const posts = await this.postRepo.find({
      where: { organizationId, status: In(['published', 'partially_failed']) },
      select: ['id'],
    });

    if (!posts.length) {
      return {
        totalImpressions: 0, totalLikes: 0, totalComments: 0,
        totalShares: 0, totalReach: 0, byPlatform: {},
      };
    }

    const postIds = posts.map((p) => p.id);

    // Get latest metric per post+platform
    const allMetrics = await this.metricsRepo.find({
      where: { postId: In(postIds) },
      order: { fetchedAt: 'DESC' },
    });

    // Deduplicate: keep only latest per postId+platform
    const seen = new Set<string>();
    const latestMetrics: PostMetrics[] = [];
    for (const m of allMetrics) {
      const key = `${m.postId}:${m.platform}`;
      if (!seen.has(key)) {
        seen.add(key);
        latestMetrics.push(m);
      }
    }

    const byPlatform: Record<string, { impressions: number; likes: number; comments: number; shares: number; reach: number }> = {};
    let totalImpressions = 0, totalLikes = 0, totalComments = 0, totalShares = 0, totalReach = 0;

    for (const m of latestMetrics) {
      totalImpressions += m.impressions;
      totalLikes += m.likes;
      totalComments += m.comments;
      totalShares += m.shares;
      totalReach += m.reach;

      if (!byPlatform[m.platform]) {
        byPlatform[m.platform] = { impressions: 0, likes: 0, comments: 0, shares: 0, reach: 0 };
      }
      byPlatform[m.platform].impressions += m.impressions;
      byPlatform[m.platform].likes += m.likes;
      byPlatform[m.platform].comments += m.comments;
      byPlatform[m.platform].shares += m.shares;
      byPlatform[m.platform].reach += m.reach;
    }

    return { totalImpressions, totalLikes, totalComments, totalShares, totalReach, byPlatform };
  }

  /**
   * Cron job: poll metrics from platform APIs every hour for recently published posts.
   * Fetches engagement data from Twitter, Facebook, and Instagram.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async pollMetrics() {
    this.logger.log('Starting metrics poll...');

    // Get posts published in the last 30 days with platform post IDs
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const posts = await this.postRepo
      .createQueryBuilder('p')
      .where('p.status IN (:...statuses)', { statuses: ['published', 'partially_failed'] })
      .andWhere('p.publishedAt > :since', { since: thirtyDaysAgo })
      .getMany();

    let polled = 0;
    for (const post of posts) {
      for (const result of post.publishResults) {
        if (result.status !== 'published' || !result.platformPostId) continue;

        try {
          const metrics = await this.fetchPlatformMetrics(
            post.organizationId,
            result.platform,
            result.platformPostId,
          );
          if (!metrics) continue;

          const entry = this.metricsRepo.create({
            postId: post.id,
            platform: result.platform,
            platformPostId: result.platformPostId,
            ...metrics,
          });
          await this.metricsRepo.save(entry);
          polled++;
        } catch (err) {
          this.logger.warn(`Failed to poll ${result.platform} metrics for post ${post.id}: ${err}`);
        }
      }
    }

    this.logger.log(`Metrics poll complete: ${polled} entries updated`);
  }

  /**
   * Fetch metrics from a specific platform's API.
   * Returns null if the platform doesn't support metrics or creds are missing.
   */
  private async fetchPlatformMetrics(
    organizationId: string,
    platform: string,
    platformPostId: string,
  ): Promise<Partial<PostMetrics> | null> {
    // Get the platform connection to obtain access tokens
    // We query the platform-integration service's DB directly via HTTP
    const platformServiceUrl = process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009';

    if (platform === 'X (Twitter)') {
      return this.fetchTwitterMetrics(platformServiceUrl, organizationId, platformPostId);
    }
    if (platform === 'Facebook') {
      return this.fetchFacebookMetrics(platformServiceUrl, organizationId, platformPostId);
    }
    if (platform === 'Instagram') {
      return this.fetchInstagramMetrics(platformServiceUrl, organizationId, platformPostId);
    }

    // WhatsApp metrics come via webhooks, not polling
    return null;
  }

  private async fetchTwitterMetrics(
    platformServiceUrl: string,
    organizationId: string,
    tweetId: string,
  ): Promise<Partial<PostMetrics> | null> {
    // Get access token from platform service
    const connRes = await fetch(
      `${platformServiceUrl}/platforms/${organizationId}/connection/X (Twitter)`,
    );
    if (!connRes.ok) return null;
    const conn = (await connRes.json()) as Record<string, string>;
    if (!conn.accessToken) return null;

    const res = await fetch(
      `https://api.x.com/2/tweets/${tweetId}?tweet.fields=public_metrics`,
      { headers: { Authorization: `Bearer ${conn.accessToken}` } },
    );
    const data = (await res.json()) as Record<string, any>;
    const m = data.data?.public_metrics;
    if (!m) return null;

    const impressions = m.impression_count || 0;
    const likes = m.like_count || 0;
    const comments = m.reply_count || 0;
    const shares = m.retweet_count + (m.quote_count || 0);
    const views = m.impression_count || 0;
    const saves = m.bookmark_count || 0;

    return {
      impressions,
      likes,
      comments,
      shares,
      reach: impressions,
      views,
      saves,
      engagementRate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
    };
  }

  private async fetchFacebookMetrics(
    platformServiceUrl: string,
    organizationId: string,
    postId: string,
  ): Promise<Partial<PostMetrics> | null> {
    const connRes = await fetch(
      `${platformServiceUrl}/platforms/${organizationId}/connection/Facebook`,
    );
    if (!connRes.ok) return null;
    const conn = (await connRes.json()) as Record<string, string>;
    if (!conn.accessToken) return null;

    // Get post insights
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${postId}?fields=insights.metric(post_impressions,post_engaged_users,post_reactions_by_type_total,post_clicks),shares,comments.summary(true)&access_token=${conn.accessToken}`,
    );
    const data = (await res.json()) as Record<string, any>;

    let impressions = 0;
    let reach = 0;
    let likes = 0;
    const comments = data.comments?.summary?.total_count || 0;
    const shares = data.shares?.count || 0;

    if (data.insights?.data) {
      for (const insight of data.insights.data) {
        if (insight.name === 'post_impressions') {
          impressions = insight.values?.[0]?.value || 0;
        }
        if (insight.name === 'post_engaged_users') {
          reach = insight.values?.[0]?.value || 0;
        }
        if (insight.name === 'post_reactions_by_type_total') {
          const reactions = insight.values?.[0]?.value || {};
          likes = (Object.values(reactions) as number[]).reduce((sum, v) => sum + (Number(v) || 0), 0);
        }
      }
    }

    return {
      impressions,
      likes,
      comments,
      shares,
      reach,
      views: 0,
      saves: 0,
      engagementRate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
    };
  }

  private async fetchInstagramMetrics(
    platformServiceUrl: string,
    organizationId: string,
    mediaId: string,
  ): Promise<Partial<PostMetrics> | null> {
    const connRes = await fetch(
      `${platformServiceUrl}/platforms/${organizationId}/connection/Instagram`,
    );
    if (!connRes.ok) return null;
    const conn = (await connRes.json()) as Record<string, string>;
    if (!conn.accessToken) return null;

    const res = await fetch(
      `https://graph.facebook.com/v21.0/${mediaId}/insights?metric=impressions,reach,likes,comments,shares,saved&access_token=${conn.accessToken}`,
    );
    const data = (await res.json()) as Record<string, any>;

    let impressions = 0, reach = 0, likes = 0, comments = 0, shares = 0, saves = 0;

    if (data.data) {
      for (const metric of data.data) {
        const val = metric.values?.[0]?.value || 0;
        switch (metric.name) {
          case 'impressions': impressions = val; break;
          case 'reach': reach = val; break;
          case 'likes': likes = val; break;
          case 'comments': comments = val; break;
          case 'shares': shares = val; break;
          case 'saved': saves = val; break;
        }
      }
    }

    return {
      impressions,
      likes,
      comments,
      shares,
      reach,
      views: 0,
      saves,
      engagementRate: impressions > 0 ? (likes + comments + shares) / impressions : 0,
    };
  }

  /** Record WhatsApp delivery status update (called from webhook handler) */
  async updateWhatsAppStatus(
    platformPostId: string,
    status: 'sent' | 'delivered' | 'read' | 'failed',
  ): Promise<void> {
    // Find existing metric or create new one
    let metric = await this.metricsRepo.findOne({
      where: { platformPostId, platform: 'WhatsApp' },
      order: { fetchedAt: 'DESC' },
    });

    if (metric) {
      metric.deliveryStatus = status;
      await this.metricsRepo.save(metric);
    } else {
      // Find the post by searching publishResults
      const posts = await this.postRepo
        .createQueryBuilder('p')
        .where(`p."publishResults"::text LIKE :pid`, { pid: `%${platformPostId}%` })
        .getMany();

      const post = posts.find((p) =>
        p.publishResults.some((r) => r.platformPostId === platformPostId),
      );
      if (!post) return;

      metric = this.metricsRepo.create({
        postId: post.id,
        platform: 'WhatsApp',
        platformPostId,
        deliveryStatus: status,
      });
      await this.metricsRepo.save(metric);
    }
  }
}
