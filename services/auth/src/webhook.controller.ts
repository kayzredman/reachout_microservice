import {
  Controller,
  Post,
  Req,
  HttpCode,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { Webhook } from 'svix';
import { WebhookService } from './webhook.service';

@Controller('webhooks')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  /**
   * POST /webhooks/clerk
   * Receives Clerk webhook events with svix signature verification.
   *
   * Required env: CLERK_WEBHOOK_SECRET (whsec_... from Clerk Dashboard)
   */
  @Post('clerk')
  @HttpCode(200)
  async handleClerkWebhook(@Req() req: Request) {
    const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.error('CLERK_WEBHOOK_SECRET not configured');
      throw new BadRequestException('Webhook secret not configured');
    }

    // Svix headers for verification
    const svixId = req.headers['svix-id'] as string;
    const svixTimestamp = req.headers['svix-timestamp'] as string;
    const svixSignature = req.headers['svix-signature'] as string;

    if (!svixId || !svixTimestamp || !svixSignature) {
      throw new BadRequestException('Missing svix verification headers');
    }

    const body = (req as any).rawBody;
    if (!body) {
      throw new BadRequestException('Missing request body');
    }

    // Verify the webhook signature
    const wh = new Webhook(webhookSecret);
    let event: { type: string; data: Record<string, any> };

    try {
      event = wh.verify(body, {
        'svix-id': svixId,
        'svix-timestamp': svixTimestamp,
        'svix-signature': svixSignature,
      }) as { type: string; data: Record<string, any> };
    } catch (err) {
      this.logger.warn(`Webhook signature verification failed: ${err}`);
      throw new BadRequestException('Invalid webhook signature');
    }

    // Process the verified event
    await this.webhookService.processEvent(event.type, event.data);

    return { received: true };
  }
}
