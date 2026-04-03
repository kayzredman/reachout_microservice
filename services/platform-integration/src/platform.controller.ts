import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard.js';
import { PlatformService } from './platform.service.js';
import { WhatsAppSessionService } from './whatsapp-session.service.js';
import { BroadcastService } from './broadcast.service.js';

@Controller('platforms')
export class PlatformController {
  constructor(
    private readonly platformService: PlatformService,
    private readonly sessionService: WhatsAppSessionService,
    private readonly broadcastService: BroadcastService,
  ) {}

  /**
   * GET /platforms/:orgId
   * List all platform connections for an organization.
   */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId')
  async listConnections(@Param('orgId') orgId: string) {
    const connections = await this.platformService.getConnections(orgId);
    // Strip tokens from response
    return connections.map((c) => ({
      id: c.id,
      platform: c.platform,
      connected: c.connected,
      handle: c.handle,
      phoneNumber: c.phoneNumber,
      channelId: c.channelId,
      tokenExpiresAt: c.tokenExpiresAt,
      connectedBy: c.connectedBy,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));
  }

  /**
   * POST /platforms/:orgId/connect
   * Start an OAuth flow — returns the authorization URL to redirect to.
   * For WhatsApp, directly connects with the provided phone number.
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/connect')
  async connect(
    @Param('orgId') orgId: string,
    @Body() body: { platform: string; phoneNumber?: string; phoneNumberId?: string; accessToken?: string; channelId?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Missing user');

    const { platform, phoneNumber, phoneNumberId, accessToken, channelId } = body;
    if (!platform) throw new BadRequestException('Platform is required');

    // WhatsApp: start Baileys QR session
    if (platform === 'WhatsApp') {
      const result = await this.sessionService.startSession(orgId);
      return {
        connected: result.status === 'connected',
        qr: result.qr,
        status: result.status,
        platform: 'WhatsApp',
      };
    }

    // OAuth platforms: return the authorization URL
    const authUrl = this.platformService.getOAuthUrl(platform, orgId);
    return { authUrl };
  }

  /**
   * POST /platforms/:orgId/callback
   * Handle OAuth callback — exchange code for tokens.
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/callback')
  async oauthCallback(
    @Param('orgId') orgId: string,
    @Body() body: { platform: string; code: string; state?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Missing user');

    const { platform, code, state } = body;
    if (!platform || !code) throw new BadRequestException('Platform and code are required');

    const conn = await this.platformService.handleOAuthCallback(platform, orgId, code, userId, state);
    return {
      connected: true,
      handle: conn.handle,
      platform: conn.platform,
    };
  }

  /**
   * POST /platforms/:orgId/publish
   * Publish content to a platform using stored OAuth tokens.
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/publish')
  async publish(
    @Param('orgId') orgId: string,
    @Body() body: { platform: string; content: string; imageUrl?: string },
  ) {
    const { platform, content, imageUrl } = body;
    if (!platform || !content) {
      throw new BadRequestException('Platform and content are required');
    }
    const result = await this.platformService.publishToplatform(orgId, platform, content, imageUrl);
    return { published: true, platform, ...result };
  }

  /**
   * DELETE /platforms/:orgId/:platform
   * Disconnect a platform.
   */
  @UseGuards(ClerkAuthGuard)
  @Delete(':orgId/:platform')
  async disconnect(
    @Param('orgId') orgId: string,
    @Param('platform') platform: string,
  ) {
    await this.platformService.disconnect(orgId, platform);
    return { disconnected: true, platform };
  }

  /**
   * GET /platforms/:orgId/connection/:platform
   * Internal endpoint for service-to-service calls (metrics polling).
   * Returns the full connection including tokens.
   */
  @Get(':orgId/connection/:platform')
  async getConnection(
    @Param('orgId') orgId: string,
    @Param('platform') platform: string,
  ) {
    const conn = await this.platformService.getConnection(orgId, platform);
    if (!conn || !conn.connected) {
      throw new NotFoundException(`${platform} is not connected for this organization`);
    }
    return {
      accessToken: conn.accessToken,
      platformAccountId: conn.platformAccountId,
      channelId: conn.channelId,
    };
  }

  /**
   * GET /platforms/:orgId/whatsapp/status
   * Get current WhatsApp session status + QR code if pairing.
   */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/whatsapp/status')
  async whatsappStatus(@Param('orgId') orgId: string) {
    return this.sessionService.getSessionStatus(orgId);
  }

  /**
   * POST /platforms/:orgId/whatsapp/qr
   * Start or refresh a WhatsApp QR session for pairing.
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/whatsapp/qr')
  async whatsappQr(@Param('orgId') orgId: string) {
    return this.sessionService.startSession(orgId);
  }

  /**
   * POST /platforms/:orgId/broadcast/validate
   * Validate a CSV of contacts. Returns summary (counts only, no data exposed).
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/broadcast/validate')
  async validateCsv(
    @Param('orgId') orgId: string,
    @Body() body: { csv: string },
  ) {
    if (!body.csv) throw new BadRequestException('CSV content is required');
    return this.broadcastService.validateCsv(body.csv);
  }

  /**
   * POST /platforms/:orgId/broadcast
   * Send a broadcast message to validated phone numbers.
   */
  @UseGuards(ClerkAuthGuard)
  @Post(':orgId/broadcast')
  async broadcast(
    @Param('orgId') orgId: string,
    @Body() body: { message: string; phones: string[]; postId?: string },
  ) {
    const { message, phones, postId } = body;
    if (!message || !phones?.length) {
      throw new BadRequestException('Message and phone list are required');
    }
    return this.broadcastService.broadcast(orgId, message, phones, postId);
  }

  /**
   * GET /platforms/:orgId/broadcasts
   * Get broadcast history for an organization.
   */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/broadcasts')
  async broadcastLogs(@Param('orgId') orgId: string) {
    return this.broadcastService.getLogs(orgId);
  }

  /**
   * GET /platforms/:orgId/broadcasts/:broadcastId
   * Get a single broadcast with refreshed aggregate stats.
   */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/broadcasts/:broadcastId')
  async broadcastLog(
    @Param('orgId') orgId: string,
    @Param('broadcastId') broadcastId: string,
  ) {
    const log = await this.broadcastService.getLog(broadcastId);
    if (!log) throw new NotFoundException('Broadcast not found');
    return log;
  }

  /**
   * POST /platforms/:orgId/whatsapp/send
   * Send a single WhatsApp text message to a specific phone number.
   * Used by the support ticket system to notify users via WhatsApp.
   */
  @Post(':orgId/whatsapp/send')
  async sendWhatsAppMessage(
    @Param('orgId') orgId: string,
    @Body() body: { phone: string; message: string },
  ) {
    const socket = this.sessionService.getSocket(orgId);
    if (!socket) {
      throw new NotFoundException('WhatsApp is not connected for this organization.');
    }
    const jid = body.phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';
    // Track this phone so we can map the LID when the echo comes in
    this.sessionService.trackSentPhone(orgId, body.phone);
    const sent = await socket.sendMessage(jid, { text: body.message });
    return { success: true, messageId: sent?.key?.id };
  }
}
