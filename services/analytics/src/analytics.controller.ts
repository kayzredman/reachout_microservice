import {
  Controller,
  Get,
  Param,
  Query,
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  /**
   * GET /metrics/:orgId
   * Org overview metrics — backward-compatible with existing frontend proxies.
   */
  @Get('metrics/:orgId')
  async getOrgMetrics(@Param('orgId') orgId: string) {
    return this.analyticsService.getOrgMetrics(orgId);
  }

  /**
   * GET /metrics/:orgId/post/:postId
   * Latest metrics for a post — backward-compatible.
   */
  @Get('metrics/:orgId/post/:postId')
  async getPostMetrics(@Param('postId') postId: string) {
    return this.analyticsService.getLatestMetrics(postId);
  }

  /**
   * GET /metrics/:orgId/post/:postId/history
   * Full metrics history for a post — backward-compatible.
   */
  @Get('metrics/:orgId/post/:postId/history')
  async getPostMetricsHistory(@Param('postId') postId: string) {
    return this.analyticsService.getMetricsHistory(postId);
  }

  /* ── Enhanced analytics endpoints ── */

  /**
   * GET /analytics/:orgId/dashboard
   * All-in-one dashboard: overview + top posts + trends.
   * Reduces multiple frontend calls to a single request.
   */
  @Get('analytics/:orgId/dashboard')
  async getDashboard(@Param('orgId') orgId: string) {
    return this.analyticsService.getDashboard(orgId);
  }

  /**
   * GET /analytics/:orgId/trends?days=30
   * Time-series trend data for charting.
   */
  @Get('analytics/:orgId/trends')
  async getTrends(
    @Param('orgId') orgId: string,
    @Query('days') days?: string,
  ) {
    const numDays = days ? parseInt(days, 10) : 30;
    return this.analyticsService.getTrends(orgId, numDays > 0 ? numDays : 30);
  }

  /**
   * GET /analytics/:orgId/top-posts?limit=10
   * Top performing posts ranked by engagement.
   */
  @Get('analytics/:orgId/top-posts')
  async getTopPosts(
    @Param('orgId') orgId: string,
    @Query('limit') limit?: string,
  ) {
    const num = limit ? parseInt(limit, 10) : 10;
    return this.analyticsService.getTopPosts(orgId, num > 0 ? num : 10);
  }

  /**
   * GET /analytics/:orgId/platforms
   * Platform comparison data.
   */
  @Get('analytics/:orgId/platforms')
  async getPlatformComparison(@Param('orgId') orgId: string) {
    return this.analyticsService.getPlatformComparison(orgId);
  }
}
