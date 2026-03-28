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
} from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard.js';
import { PlatformService } from './platform.service.js';

@Controller('platforms')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

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
    @Body() body: { platform: string; phoneNumber?: string; phoneNumberId?: string; accessToken?: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Missing user');

    const { platform, phoneNumber, phoneNumberId, accessToken } = body;
    if (!platform) throw new BadRequestException('Platform is required');

    // WhatsApp: direct connection via Business API credentials
    if (platform === 'WhatsApp') {
      if (!phoneNumberId || !accessToken) {
        throw new BadRequestException(
          'WhatsApp Business Phone Number ID and Access Token are required',
        );
      }
      const conn = await this.platformService.connectWhatsApp(
        orgId, userId, phoneNumberId, accessToken, phoneNumber,
      );
      return {
        connected: true,
        handle: conn.handle,
        platform: conn.platform,
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
    @Body() body: { platform: string; code: string },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Missing user');

    const { platform, code } = body;
    if (!platform || !code) throw new BadRequestException('Platform and code are required');

    const conn = await this.platformService.handleOAuthCallback(platform, orgId, code, userId);
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
}
