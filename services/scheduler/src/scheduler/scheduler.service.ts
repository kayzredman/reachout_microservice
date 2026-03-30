import { Injectable, Logger } from '@nestjs/common';

const POST_SERVICE_URL =
  process.env.POST_SERVICE_URL || 'http://localhost:3003';

export interface ScheduledPost {
  id: string;
  organizationId: string;
  content: string;
  platforms: string[];
  scheduledAt: string;
  status: string;
}

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  /** Get all scheduled posts for an organization */
  async getScheduledPosts(
    orgId: string,
    token: string,
  ): Promise<ScheduledPost[]> {
    const res = await fetch(
      `${POST_SERVICE_URL}/posts/${orgId}/scheduled`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      this.logger.warn(`Failed to fetch scheduled posts for ${orgId}`);
      return [];
    }
    return res.json();
  }

  /** Get a summary of scheduled posts across an org */
  async getScheduleSummary(
    orgId: string,
    token: string,
  ): Promise<{
    total: number;
    upcoming: number;
    today: number;
    thisWeek: number;
    platforms: Record<string, number>;
  }> {
    const posts = await this.getScheduledPosts(orgId, token);
    const now = new Date();
    const endOfDay = new Date(now);
    endOfDay.setHours(23, 59, 59, 999);
    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    let today = 0;
    let thisWeek = 0;
    const platforms: Record<string, number> = {};

    for (const post of posts) {
      const schedDate = new Date(post.scheduledAt);
      if (schedDate <= endOfDay) today++;
      if (schedDate <= endOfWeek) thisWeek++;
      for (const p of post.platforms) {
        platforms[p] = (platforms[p] || 0) + 1;
      }
    }

    return {
      total: posts.length,
      upcoming: posts.length,
      today,
      thisWeek,
      platforms,
    };
  }

  /** Cancel a scheduled post */
  async cancelScheduledPost(
    orgId: string,
    postId: string,
    token: string,
  ): Promise<{ success: boolean; error?: string }> {
    const res = await fetch(
      `${POST_SERVICE_URL}/posts/${orgId}/${postId}/schedule`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return {
        success: false,
        error: (data as Record<string, string>).message || 'Failed to cancel',
      };
    }
    return { success: true };
  }
}
