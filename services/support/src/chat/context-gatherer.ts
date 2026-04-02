import { Injectable, Logger } from '@nestjs/common';

/**
 * Gathers context from other FaithReach microservices
 * so the AI agent can answer with full awareness of the user's state.
 */
@Injectable()
export class ContextGatherer {
  private readonly logger = new Logger(ContextGatherer.name);

  private readonly urls = {
    user: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    post: process.env.POST_SERVICE_URL || 'http://localhost:3003',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3008',
    platform: process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009',
    scheduler: process.env.SCHEDULER_SERVICE_URL || 'http://localhost:3010',
    payment: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3011',
  };

  /** Fetch JSON from a service, returning null on error */
  private async fetch(url: string): Promise<any> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) return null;
      return res.json();
    } catch {
      this.logger.warn(`Failed to fetch ${url}`);
      return null;
    }
  }

  /**
   * Gather full context for a user/org.
   * Returns a structured object the AI agent can reference.
   */
  async gather(orgId: string, userId: string): Promise<Record<string, any>> {
    const [profile, posts, billing, platforms, scheduled, payments] =
      await Promise.all([
        this.fetch(`${this.urls.user}/users/${userId}`),
        this.fetch(`${this.urls.post}/posts/${orgId}?limit=10`),
        this.fetch(`${this.urls.billing}/billing/${orgId}`),
        this.fetch(`${this.urls.platform}/platforms/${orgId}`),
        this.fetch(`${this.urls.scheduler}/scheduled/${orgId}`),
        this.fetch(`${this.urls.payment}/payments/${orgId}?limit=5`),
      ]);

    // Detect health signals
    const signals: string[] = [];

    if (platforms) {
      const disconnected = (Array.isArray(platforms) ? platforms : [])
        .filter((p: any) => !p.connected);
      if (disconnected.length > 0) {
        signals.push(
          `Disconnected platforms: ${disconnected.map((p: any) => p.platform).join(', ')}`,
        );
      }
    }

    if (Array.isArray(posts)) {
      const failed = posts.filter((p: any) => p.status === 'failed');
      if (failed.length > 0) {
        signals.push(`${failed.length} recent failed publish(es)`);
      }
    }

    if (billing?.status === 'past_due') {
      signals.push('Billing is past due');
    }

    return {
      profile: profile || { id: userId, orgId },
      recentPosts: Array.isArray(posts) ? posts.slice(0, 5) : [],
      billing: billing || null,
      platforms: platforms || [],
      scheduledPosts: scheduled || [],
      recentPayments: payments || [],
      healthSignals: signals,
    };
  }
}
