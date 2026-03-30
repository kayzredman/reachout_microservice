import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import axios from 'axios';
import { GeneratedPlan } from '../template/template.service';

const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || 'http://localhost:3003';
const BILLING_SERVICE_URL =
  process.env.BILLING_SERVICE_URL || 'http://localhost:3008';
const AI_SERVICE_URL =
  process.env.AI_SERVICE_URL || 'http://localhost:3006';

@Injectable()
export class PlannerService {
  private readonly logger = new Logger(PlannerService.name);

  /**
   * Check whether an org has access to a given feature via the billing service.
   */
  async checkFeatureAccess(orgId: string, feature: string): Promise<boolean> {
    try {
      const res = await axios.get(
        `${BILLING_SERVICE_URL}/billing/${orgId}/can-use/${feature}`,
      );
      return res.data.allowed === true;
    } catch {
      this.logger.warn(`Billing service unreachable — denying ${feature}`);
      return false;
    }
  }

  /**
   * Generate a content plan using AI (premium feature).
   * Checks billing first, then calls AI assistant.
   */
  async generateAiPlan(
    orgId: string,
    opts: {
      topic: string;
      posts: number;
      platforms: string[];
      tone?: string;
      themes?: string[];
      startDate?: string;
      churchName?: string;
    },
  ): Promise<GeneratedPlan> {
    // Gate check
    const allowed = await this.checkFeatureAccess(orgId, 'ai-content');
    if (!allowed) {
      throw new ForbiddenException(
        'AI content generation requires a Creator or Ministry Pro subscription',
      );
    }

    // Call AI assistant
    const aiRes = await axios.post(`${AI_SERVICE_URL}/ai/generate-content`, {
      topic: opts.topic,
      posts: opts.posts,
      platforms: opts.platforms,
      tone: opts.tone,
      themes: opts.themes,
      churchName: opts.churchName,
    });

    const aiPosts: string[] = aiRes.data.posts;

    // Schedule dates
    const startDate = new Date(
      opts.startDate || new Date().toISOString().split('T')[0],
    );
    const postsPerWeek = Math.min(7, Math.max(1, Math.ceil(opts.posts / 4)));
    const preferred = this.preferredDays(postsPerWeek);
    const dates: Date[] = [];
    const current = new Date(startDate);
    while (dates.length < aiPosts.length) {
      if (preferred.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    const endDate = dates.length > 0 ? dates[dates.length - 1] : startDate;

    return {
      series: {
        title: opts.topic,
        theme: opts.themes?.[0] || 'faith',
        description: `AI-generated series: ${opts.topic}`,
        color: '#7c3aed',
        startDate: startDate.toISOString().split('T')[0],
        endDate: endDate.toISOString().split('T')[0],
        platforms: opts.platforms,
        totalPosts: aiPosts.length,
      },
      posts: aiPosts.map((content, i) => ({
        content,
        platforms: opts.platforms,
        suggestedDate: dates[i]?.toISOString().split('T')[0] || startDate.toISOString().split('T')[0],
        seriesNumber: i + 1,
      })),
    };
  }

  /**
   * Commit a generated plan → create a real series + draft posts
   * in the Post service, forwarding the caller's auth token.
   */
  async commit(
    orgId: string,
    authToken: string,
    plan: GeneratedPlan,
  ): Promise<{ series: Record<string, unknown>; posts: Record<string, unknown>[] }> {
    const headers = {
      Authorization: authToken,
      'Content-Type': 'application/json',
    };

    // 1. Create the series
    const seriesRes = await axios.post(
      `${POST_SERVICE_URL}/series/${orgId}`,
      {
        title: plan.series.title,
        theme: plan.series.theme,
        description: plan.series.description,
        color: plan.series.color,
        totalPosts: plan.series.totalPosts,
        startDate: plan.series.startDate,
        endDate: plan.series.endDate,
        platforms: plan.series.platforms,
        status: 'Active',
      },
      { headers },
    );
    const seriesId: string = seriesRes.data.id;
    this.logger.log(`Created series ${seriesId} for org ${orgId}`);

    // 2. Create each post as a draft and link to the series
    const createdPosts: Record<string, unknown>[] = [];

    for (const post of plan.posts) {
      // Create post
      const postRes = await axios.post(
        `${POST_SERVICE_URL}/posts/${orgId}`,
        {
          content: post.content,
          platforms: post.platforms,
        },
        { headers },
      );
      const postId: string = postRes.data.id;

      // Add to series (sets seriesId + seriesNumber on the post)
      await axios.post(
        `${POST_SERVICE_URL}/series/${orgId}/${seriesId}/posts/${postId}`,
        {},
        { headers },
      );

      createdPosts.push({
        ...postRes.data,
        seriesNumber: post.seriesNumber,
      });
    }

    this.logger.log(
      `Committed ${createdPosts.length} posts for series ${seriesId}`,
    );

    return { series: seriesRes.data, posts: createdPosts };
  }

  private preferredDays(ppw: number): number[] {
    switch (ppw) {
      case 7: return [0, 1, 2, 3, 4, 5, 6];
      case 6: return [1, 2, 3, 4, 5, 6];
      case 5: return [1, 2, 3, 4, 5];
      case 4: return [1, 3, 5, 0];
      case 3: return [2, 4, 0];
      case 2: return [3, 0];
      case 1: return [0];
      default: return [2, 4, 0];
    }
  }
}
