import { Injectable, Logger } from '@nestjs/common';

/**
 * Self-healing actions the AI agent can invoke to resolve issues automatically.
 * Each method returns a human-readable result string.
 */
@Injectable()
export class ActionRunner {
  private readonly logger = new Logger(ActionRunner.name);

  private readonly urls = {
    post: process.env.POST_SERVICE_URL || 'http://localhost:3003',
    platform: process.env.PLATFORM_SERVICE_URL || 'http://localhost:3009',
    billing: process.env.BILLING_SERVICE_URL || 'http://localhost:3008',
    scheduler: process.env.SCHEDULER_SERVICE_URL || 'http://localhost:3010',
  };

  /** Retry a failed publish */
  async retryPublish(postId: string, orgId: string): Promise<string> {
    try {
      const res = await fetch(
        `${this.urls.post}/posts/${orgId}/${postId}/publish`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' } },
      );
      if (res.ok) return `Successfully re-queued post ${postId} for publishing.`;
      const body = await res.text();
      return `Retry failed (${res.status}): ${body}`;
    } catch (err: any) {
      this.logger.error(`retryPublish error: ${err.message}`);
      return `Could not reach the post service to retry. Please try again later.`;
    }
  }

  /** Reconnect a platform (triggers OAuth re-init) */
  async reconnectPlatform(orgId: string, platform: string): Promise<string> {
    try {
      const res = await fetch(
        `${this.urls.platform}/platforms/${orgId}/${platform}/reconnect`,
        { method: 'POST' },
      );
      if (res.ok) return `Initiated reconnection flow for ${platform}. Please complete the OAuth prompt if required.`;
      return `Reconnection request failed (${res.status}). You may need to reconnect manually from Settings > Platforms.`;
    } catch {
      return `Platform service is unreachable. Please reconnect manually from Settings > Platforms.`;
    }
  }

  /** Check billing status / subscription details */
  async checkBilling(orgId: string): Promise<string> {
    try {
      const res = await fetch(`${this.urls.billing}/billing/${orgId}`);
      if (!res.ok) return 'Could not retrieve billing info.';
      const data = await res.json();
      return `Your subscription: tier=${data.tier}, status=${data.status}, renews=${data.currentPeriodEnd || 'N/A'}.`;
    } catch {
      return 'Billing service is unreachable right now.';
    }
  }

  /** Cancel a scheduled post */
  async cancelScheduledPost(postId: string, orgId: string): Promise<string> {
    try {
      const res = await fetch(
        `${this.urls.scheduler}/scheduled/${orgId}/${postId}`,
        { method: 'DELETE' },
      );
      if (res.ok) return `Scheduled post ${postId} has been cancelled.`;
      return `Could not cancel the scheduled post (${res.status}).`;
    } catch {
      return 'Scheduler service is unreachable.';
    }
  }

  /**
   * Route a function-call name to the correct action.
   */
  async run(
    name: string,
    args: Record<string, string>,
  ): Promise<string> {
    switch (name) {
      case 'retry_publish':
        return this.retryPublish(args.postId, args.orgId);
      case 'reconnect_platform':
        return this.reconnectPlatform(args.orgId, args.platform);
      case 'check_billing':
        return this.checkBilling(args.orgId);
      case 'cancel_scheduled_post':
        return this.cancelScheduledPost(args.postId, args.orgId);
      default:
        return `Unknown action: ${name}`;
    }
  }
}
