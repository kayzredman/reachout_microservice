import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThan } from 'typeorm';
import { PostEntity } from './entities/post.entity';
import { PostMetrics } from './entities/post-metrics.entity';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(PostEntity)
    private postRepo: Repository<PostEntity>,
    @InjectRepository(PostMetrics)
    private metricsRepo: Repository<PostMetrics>,
  ) {}

  /* ── Org-level overview (compatible with existing frontend) ── */

  async getOrgMetrics(organizationId: string) {
    const posts = await this.postRepo.find({
      where: { organizationId, status: In(['published', 'partially_failed']) },
      select: ['id'],
    });

    if (!posts.length) {
      return {
        totalImpressions: 0,
        totalLikes: 0,
        totalComments: 0,
        totalShares: 0,
        totalReach: 0,
        byPlatform: {},
      };
    }

    const postIds = posts.map((p) => p.id);
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

  /* ── Per-post metrics (compatible with existing frontend) ── */

  async getLatestMetrics(postId: string): Promise<Record<string, PostMetrics>> {
    const metrics = await this.metricsRepo.find({
      where: { postId },
      order: { fetchedAt: 'DESC' },
    });

    const latest: Record<string, PostMetrics> = {};
    for (const m of metrics) {
      if (!latest[m.platform]) {
        latest[m.platform] = m;
      }
    }
    return latest;
  }

  async getMetricsHistory(postId: string): Promise<PostMetrics[]> {
    return this.metricsRepo.find({
      where: { postId },
      order: { fetchedAt: 'DESC' },
    });
  }

  /* ── Enhanced analytics: all-in-one dashboard ── */

  async getDashboard(organizationId: string) {
    const orgMetrics = await this.getOrgMetrics(organizationId);
    const topPosts = await this.getTopPosts(organizationId, 10);
    const trends = await this.getTrends(organizationId, 30);

    const totalEngagement =
      orgMetrics.totalLikes + orgMetrics.totalComments + orgMetrics.totalShares;
    const engagementRate =
      orgMetrics.totalImpressions > 0
        ? ((totalEngagement / orgMetrics.totalImpressions) * 100)
        : 0;

    return {
      overview: {
        ...orgMetrics,
        totalEngagement,
        engagementRate: Number(engagementRate.toFixed(2)),
        platformCount: Object.keys(orgMetrics.byPlatform).length,
      },
      topPosts,
      trends,
    };
  }

  /* ── Top performing posts ── */

  async getTopPosts(organizationId: string, limit = 10) {
    const posts = await this.postRepo.find({
      where: { organizationId, status: In(['published', 'partially_failed']) },
      order: { publishedAt: 'DESC' },
      take: 50, // look at recent 50 posts for ranking
    });

    if (!posts.length) return [];

    const postIds = posts.map((p) => p.id);
    const allMetrics = await this.metricsRepo.find({
      where: { postId: In(postIds) },
      order: { fetchedAt: 'DESC' },
    });

    // Deduplicate: latest per postId+platform
    const seen = new Set<string>();
    const latestByPost = new Map<string, PostMetrics[]>();
    for (const m of allMetrics) {
      const key = `${m.postId}:${m.platform}`;
      if (!seen.has(key)) {
        seen.add(key);
        if (!latestByPost.has(m.postId)) latestByPost.set(m.postId, []);
        latestByPost.get(m.postId)!.push(m);
      }
    }

    const ranked = posts
      .map((post) => {
        const metrics = latestByPost.get(post.id) || [];
        const totalEngagement = metrics.reduce((s, m) => s + m.likes + m.comments + m.shares, 0);
        const totalReach = metrics.reduce((s, m) => s + m.reach, 0);
        const totalImpressions = metrics.reduce((s, m) => s + m.impressions, 0);

        return {
          id: post.id,
          content: post.content.substring(0, 120),
          platforms: post.platforms,
          publishedAt: post.publishedAt,
          totalEngagement,
          totalReach,
          totalImpressions,
          engagementRate:
            totalImpressions > 0
              ? Number(((totalEngagement / totalImpressions) * 100).toFixed(2))
              : 0,
          platformBreakdown: Object.fromEntries(
            metrics.map((m) => [
              m.platform,
              {
                likes: m.likes,
                comments: m.comments,
                shares: m.shares,
                reach: m.reach,
                impressions: m.impressions,
              },
            ]),
          ),
        };
      })
      .sort((a, b) => b.totalEngagement - a.totalEngagement)
      .slice(0, limit);

    return ranked;
  }

  /* ── Time-series trend data ── */

  async getTrends(organizationId: string, days = 30) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const posts = await this.postRepo.find({
      where: { organizationId, status: In(['published', 'partially_failed']) },
      select: ['id'],
    });

    if (!posts.length) return [];

    const postIds = posts.map((p) => p.id);
    const metrics = await this.metricsRepo.find({
      where: {
        postId: In(postIds),
        fetchedAt: MoreThan(since),
      },
      order: { fetchedAt: 'ASC' },
    });

    // Aggregate by day
    const byDate = new Map<
      string,
      { engagement: number; reach: number; impressions: number; likes: number; comments: number; shares: number }
    >();

    for (const m of metrics) {
      const day = m.fetchedAt.toISOString().split('T')[0];
      if (!byDate.has(day)) {
        byDate.set(day, { engagement: 0, reach: 0, impressions: 0, likes: 0, comments: 0, shares: 0 });
      }
      const d = byDate.get(day)!;
      d.engagement += m.likes + m.comments + m.shares;
      d.reach += m.reach;
      d.impressions += m.impressions;
      d.likes += m.likes;
      d.comments += m.comments;
      d.shares += m.shares;
    }

    return Array.from(byDate.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, vals]) => ({ date, ...vals }));
  }

  /* ── Platform comparison ── */

  async getPlatformComparison(organizationId: string) {
    const orgMetrics = await this.getOrgMetrics(organizationId);
    const platforms = Object.entries(orgMetrics.byPlatform);

    return platforms.map(([platform, stats]) => {
      const engagement = stats.likes + stats.comments + stats.shares;
      return {
        platform,
        ...stats,
        totalEngagement: engagement,
        engagementRate:
          stats.impressions > 0
            ? Number(((engagement / stats.impressions) * 100).toFixed(2))
            : 0,
      };
    });
  }
}
