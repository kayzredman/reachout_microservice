import {
  Controller,
  Get,
  Post,
  Query,
  Body,
  Res,
  Logger,
  HttpCode,
} from '@nestjs/common';
import type { Response } from 'express';

/**
 * WhatsApp Webhook Controller
 * Handles webhook verification and incoming status updates from WhatsApp Cloud API.
 * The Post service's MetricsService is called via HTTP to record delivery statuses.
 */
@Controller('webhooks/whatsapp')
export class WhatsAppWebhookController {
  private readonly logger = new Logger(WhatsAppWebhookController.name);

  /**
   * GET /webhooks/whatsapp
   * Webhook verification — WhatsApp sends a challenge to verify the endpoint.
   */
  @Get()
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ) {
    const verifyToken = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'faithreach_whatsapp_verify';

    if (mode === 'subscribe' && token === verifyToken) {
      this.logger.log('WhatsApp webhook verified');
      return res.status(200).send(challenge);
    }

    this.logger.warn('WhatsApp webhook verification failed');
    return res.status(403).send('Forbidden');
  }

  /**
   * POST /webhooks/whatsapp
   * Receives status updates from WhatsApp Cloud API.
   * Statuses: sent, delivered, read, failed
   */
  @Post()
  @HttpCode(200)
  async handleWebhook(@Body() body: any) {
    const entries = body?.entry;
    if (!Array.isArray(entries)) return { received: true };

    const postServiceUrl = process.env.POST_SERVICE_URL || 'http://localhost:3003';

    for (const entry of entries) {
      const changes = entry.changes;
      if (!Array.isArray(changes)) continue;

      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const statuses = change.value?.statuses;
        if (!Array.isArray(statuses)) continue;

        for (const status of statuses) {
          const messageId = status.id;
          const statusValue = status.status; // sent, delivered, read, failed

          if (!messageId || !statusValue) continue;

          // Map WhatsApp status to our schema
          const mappedStatus = this.mapStatus(statusValue);
          if (!mappedStatus) continue;

          this.logger.log(`WhatsApp status update: ${messageId} → ${mappedStatus}`);

          // Forward to post service metrics
          try {
            await fetch(`${postServiceUrl}/webhooks/whatsapp/status`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ messageId, status: mappedStatus }),
            });
          } catch (err) {
            this.logger.warn(`Failed to forward WhatsApp status to post service: ${err}`);
          }
        }
      }
    }

    return { received: true };
  }

  private mapStatus(whatsappStatus: string): 'sent' | 'delivered' | 'read' | 'failed' | null {
    switch (whatsappStatus) {
      case 'sent': return 'sent';
      case 'delivered': return 'delivered';
      case 'read': return 'read';
      case 'failed': return 'failed';
      default: return null;
    }
  }
}
