import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  HttpCode,
} from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller()
export class MetricsController {
  constructor(private readonly metricsService: MetricsService) {}

  /**
   * GET /metrics/:orgId
   * Get aggregated metrics for all posts in an organization.
   */
  @Get('metrics/:orgId')
  async getOrgMetrics(@Param('orgId') orgId: string) {
    return this.metricsService.getOrgMetrics(orgId);
  }

  /**
   * GET /metrics/:orgId/post/:postId
   * Get latest metrics for a specific post, grouped by platform.
   */
  @Get('metrics/:orgId/post/:postId')
  async getPostMetrics(@Param('postId') postId: string) {
    return this.metricsService.getLatestMetrics(postId);
  }

  /**
   * GET /metrics/:orgId/post/:postId/history
   * Get full metrics history for a specific post.
   */
  @Get('metrics/:orgId/post/:postId/history')
  async getPostMetricsHistory(@Param('postId') postId: string) {
    return this.metricsService.getMetricsForPost(postId);
  }

  /**
   * POST /webhooks/whatsapp/status
   * Internal endpoint: receives forwarded WhatsApp delivery status updates.
   */
  @Post('webhooks/whatsapp/status')
  @HttpCode(200)
  async whatsappStatus(
    @Body() body: { messageId: string; status: 'sent' | 'delivered' | 'read' | 'failed' },
  ) {
    await this.metricsService.updateWhatsAppStatus(body.messageId, body.status);
    return { received: true };
  }
}
