import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Subscription, SubscriptionTier } from './subscription.entity';

export type { SubscriptionTier } from './subscription.entity';

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
  constructor(
    @InjectRepository(Subscription)
    private subscriptionRepo: Repository<Subscription>,
  ) {}

  /** Get (or create) a subscription for an org */
  async getSubscription(orgId: string): Promise<Subscription> {
    let sub = await this.subscriptionRepo.findOne({ where: { orgId } });
    if (!sub) {
      sub = this.subscriptionRepo.create({
        orgId,
        tier: 'starter',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      });
      sub = await this.subscriptionRepo.save(sub);
    }
    return sub;
  }

  /** Check if an org can use a given feature */
  async canUse(orgId: string, feature: string): Promise<{ allowed: boolean; tier: SubscriptionTier; requiredTier: SubscriptionTier | null }> {
    const sub = await this.getSubscription(orgId);
    const requiredTier = FEATURE_GATES[feature] ?? null;

    if (!requiredTier) {
      return { allowed: true, tier: sub.tier, requiredTier: null };
    }

    const allowed =
      sub.status === 'active' &&
      TIER_RANK[sub.tier] >= TIER_RANK[requiredTier];

    return { allowed, tier: sub.tier, requiredTier };
  }

  /** Get tier limits for an org */
  async getLimits(orgId: string) {
    const sub = await this.getSubscription(orgId);
    return { tier: sub.tier, limits: TIER_LIMITS[sub.tier] };
  }

  /** Upgrade an org's tier (will be called by Stripe webhook later) */
  async setTier(orgId: string, tier: SubscriptionTier): Promise<Subscription> {
    const sub = await this.getSubscription(orgId);
    sub.tier = tier;
    return this.subscriptionRepo.save(sub);
  }
}
