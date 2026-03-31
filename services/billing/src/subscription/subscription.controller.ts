import { Controller, Get, Param, Put, Body } from '@nestjs/common';
import {
  SubscriptionService,
  SubscriptionTier,
} from './subscription.service';

@Controller('billing')
export class SubscriptionController {
  constructor(private readonly subscriptionService: SubscriptionService) {}

  /** GET /billing/:orgId — get the subscription for an org */
  @Get(':orgId')
  async getSubscription(@Param('orgId') orgId: string) {
    return this.subscriptionService.getSubscription(orgId);
  }

  /** GET /billing/:orgId/can-use/:feature — check feature access */
  @Get(':orgId/can-use/:feature')
  async canUse(
    @Param('orgId') orgId: string,
    @Param('feature') feature: string,
  ) {
    return this.subscriptionService.canUse(orgId, feature);
  }

  /** GET /billing/:orgId/limits — get tier limits */
  @Get(':orgId/limits')
  async getLimits(@Param('orgId') orgId: string) {
    return this.subscriptionService.getLimits(orgId);
  }

  /** PUT /billing/:orgId/tier — update tier (admin / Stripe webhook) */
  @Put(':orgId/tier')
  async setTier(
    @Param('orgId') orgId: string,
    @Body() body: { tier: string },
  ) {
    const validTiers: SubscriptionTier[] = [
      'starter',
      'creator',
      'ministry_pro',
    ];
    const tier = body.tier as SubscriptionTier;
    if (!validTiers.includes(tier)) {
      return { error: `Invalid tier. Valid: ${validTiers.join(', ')}` };
    }
    return this.subscriptionService.setTier(orgId, tier);
  }
}
