import { Injectable } from '@nestjs/common';

export type SubscriptionTier = 'starter' | 'creator' | 'ministry_pro';

export interface Subscription {
  orgId: string;
  tier: SubscriptionTier;
  status: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string;
}

/** Feature-to-tier mapping: minimum tier required for each feature */
const FEATURE_GATES: Record<string, SubscriptionTier> = {
  'ai-content': 'creator',
  'ai-rewrite': 'creator',
  'ai-hashtags': 'creator',
  'ai-tone': 'creator',
  'unlimited-ai': 'ministry_pro',
  'team-access': 'ministry_pro',
  'priority-support': 'ministry_pro',
};

const TIER_RANK: Record<SubscriptionTier, number> = {
  starter: 0,
  creator: 1,
  ministry_pro: 2,
};

export const TIER_LIMITS: Record<
  SubscriptionTier,
  { maxSeries: number; maxPostsPerMonth: number; aiPlansPerMonth: number }
> = {
  starter: { maxSeries: 3, maxPostsPerMonth: 30, aiPlansPerMonth: 0 },
  creator: { maxSeries: 20, maxPostsPerMonth: -1, aiPlansPerMonth: 20 },
  ministry_pro: { maxSeries: -1, maxPostsPerMonth: -1, aiPlansPerMonth: -1 },
};

@Injectable()
export class SubscriptionService {
  /**
   * In-memory store — will be replaced with PostgreSQL + Stripe webhooks.
   * Default: every org starts on the free "starter" tier.
   */
  private subscriptions = new Map<string, Subscription>();

  /** Get (or create) a subscription for an org */
  getSubscription(orgId: string): Subscription {
    if (!this.subscriptions.has(orgId)) {
      this.subscriptions.set(orgId, {
        orgId,
        tier: 'starter',
        status: 'active',
        currentPeriodEnd: new Date(
          Date.now() + 365 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      });
    }
    return this.subscriptions.get(orgId)!;
  }

  /** Check if an org can use a given feature */
  canUse(orgId: string, feature: string): { allowed: boolean; tier: SubscriptionTier; requiredTier: SubscriptionTier | null } {
    const sub = this.getSubscription(orgId);
    const requiredTier = FEATURE_GATES[feature] ?? null;

    if (!requiredTier) {
      // Unknown feature → allow (free features not gated)
      return { allowed: true, tier: sub.tier, requiredTier: null };
    }

    const allowed =
      sub.status === 'active' &&
      TIER_RANK[sub.tier] >= TIER_RANK[requiredTier];

    return { allowed, tier: sub.tier, requiredTier };
  }

  /** Get tier limits for an org */
  getLimits(orgId: string) {
    const sub = this.getSubscription(orgId);
    return { tier: sub.tier, limits: TIER_LIMITS[sub.tier] };
  }

  /** Upgrade an org's tier (will be called by Stripe webhook later) */
  setTier(orgId: string, tier: SubscriptionTier): Subscription {
    const sub = this.getSubscription(orgId);
    sub.tier = tier;
    return sub;
  }
}
