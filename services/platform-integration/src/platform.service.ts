import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConnection } from './platform-connection.entity.js';

/** Platforms that use OAuth (redirects to external login) */
const OAUTH_PLATFORMS = ['Instagram', 'Facebook', 'X (Twitter)', 'YouTube'];

/** The base URLs for each platform OAuth flow */
const OAUTH_CONFIG: Record<string, { authUrl: string; scopes: string }> = {
  Instagram: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    scopes: 'public_profile,pages_show_list',
  },
  Facebook: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    scopes: 'pages_show_list,pages_read_engagement',
  },
  'X (Twitter)': {
    authUrl: 'https://x.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
  },
  YouTube: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly https://www.googleapis.com/auth/yt-analytics.readonly',
  },
};

@Injectable()
export class PlatformService {
  constructor(
    @InjectRepository(PlatformConnection)
    private connRepo: Repository<PlatformConnection>,
  ) {}

  /** Get all connections for an organization */
  async getConnections(organizationId: string): Promise<PlatformConnection[]> {
    return this.connRepo.find({ where: { organizationId } });
  }

  /** Get one connection by org + platform */
  async getConnection(organizationId: string, platform: string): Promise<PlatformConnection | null> {
    return this.connRepo.findOne({ where: { organizationId, platform } });
  }

  /**
   * Generate an OAuth authorization URL for a given platform.
   * The frontend will redirect the user to this URL.
   */
  getOAuthUrl(platform: string, organizationId: string): string {
    const config = OAUTH_CONFIG[platform];
    if (!config) throw new BadRequestException(`Unknown platform: ${platform}`);

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/platforms/callback`;

    // Build state parameter to carry context through OAuth redirect
    const state = Buffer.from(JSON.stringify({ platform, organizationId })).toString('base64url');

    if (platform === 'X (Twitter)') {
      const clientId = process.env.TWITTER_CLIENT_ID;
      if (!clientId) throw new BadRequestException('Twitter OAuth is not configured. Set TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET environment variables.');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        state,
        code_challenge: 'challenge', // In production, generate proper PKCE challenge
        code_challenge_method: 'plain',
      });
      return `${config.authUrl}?${params.toString()}`;
    }

    if (platform === 'YouTube') {
      const clientId = process.env.GOOGLE_CLIENT_ID;
      if (!clientId) throw new BadRequestException('YouTube OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables.');
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: clientId,
        redirect_uri: redirectUri,
        scope: config.scopes,
        state,
        access_type: 'offline',
        prompt: 'consent',
      });
      return `${config.authUrl}?${params.toString()}`;
    }

    // Instagram and Facebook use the same Meta OAuth
    const metaAppId = process.env.META_APP_ID;
    if (!metaAppId) throw new BadRequestException(`${platform} OAuth is not configured. Set META_APP_ID and META_APP_SECRET environment variables.`);
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: metaAppId,
      redirect_uri: redirectUri,
      scope: config.scopes,
      state,
    });
    return `${config.authUrl}?${params.toString()}`;
  }

  /**
   * Handle the OAuth callback — exchange code for tokens and store the connection.
   */
  async handleOAuthCallback(
    platform: string,
    organizationId: string,
    code: string,
    connectedBy: string,
  ): Promise<PlatformConnection> {
    // Exchange the authorization code for tokens based on platform
    const tokens = await this.exchangeCodeForTokens(platform, code);

    // Upsert the connection record
    let conn = await this.connRepo.findOne({ where: { organizationId, platform } });
    if (!conn) {
      conn = this.connRepo.create({ organizationId, platform, connectedBy });
    }

    conn.connected = true;
    conn.accessToken = tokens.accessToken;
    conn.refreshToken = tokens.refreshToken || undefined;
    conn.tokenExpiresAt = tokens.expiresAt || undefined;
    conn.handle = tokens.handle || '';
    conn.platformAccountId = tokens.accountId || undefined;
    conn.connectedBy = connectedBy;

    return this.connRepo.save(conn);
  }

  /**
   * Connect WhatsApp via phone number (no OAuth redirect).
   */
  async connectWhatsApp(
    organizationId: string,
    phoneNumber: string,
    connectedBy: string,
  ): Promise<PlatformConnection> {
    // Validate phone number format
    const cleaned = phoneNumber.replace(/[^0-9+]/g, '');
    if (cleaned.length < 10) throw new BadRequestException('Invalid phone number');

    let conn = await this.connRepo.findOne({
      where: { organizationId, platform: 'WhatsApp' },
    });
    if (!conn) {
      conn = this.connRepo.create({
        organizationId,
        platform: 'WhatsApp',
        connectedBy,
      });
    }

    conn.connected = true;
    conn.phoneNumber = cleaned;
    conn.handle = cleaned;
    conn.connectedBy = connectedBy;

    return this.connRepo.save(conn);
  }

  /** Disconnect a platform */
  async disconnect(organizationId: string, platform: string): Promise<void> {
    const conn = await this.connRepo.findOne({ where: { organizationId, platform } });
    if (!conn) throw new NotFoundException('Connection not found');

    conn.connected = false;
    conn.accessToken = undefined;
    conn.refreshToken = undefined;
    conn.tokenExpiresAt = undefined;
    conn.platformAccountId = undefined;
    conn.phoneNumber = undefined;
    conn.handle = undefined;

    await this.connRepo.save(conn);
  }

  // ── Private helpers ──────────────────────────────────────

  private async exchangeCodeForTokens(
    platform: string,
    code: string,
  ): Promise<{
    accessToken: string;
    refreshToken?: string;
    expiresAt?: Date;
    handle?: string;
    accountId?: string;
  }> {
    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/platforms/callback`;

    if (platform === 'Instagram' || platform === 'Facebook') {
      return this.exchangeMetaToken(platform, code, redirectUri);
    }
    if (platform === 'X (Twitter)') {
      return this.exchangeTwitterToken(code, redirectUri);
    }
    if (platform === 'YouTube') {
      return this.exchangeGoogleToken(code, redirectUri);
    }
    throw new BadRequestException(`Unsupported platform: ${platform}`);
  }

  private async exchangeMetaToken(
    platform: string,
    code: string,
    redirectUri: string,
  ) {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';

    // Exchange code for short-lived token
    const tokenRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          client_id: appId,
          client_secret: appSecret,
          redirect_uri: redirectUri,
          code,
        }),
    );
    const tokenData = await tokenRes.json() as any;
    if (!tokenData.access_token) {
      throw new BadRequestException(`Meta OAuth failed: ${tokenData.error?.message || 'Unknown error'}`);
    }

    // Exchange for long-lived token
    const longRes = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: tokenData.access_token,
        }),
    );
    const longData = await longRes.json() as any;
    const accessToken = longData.access_token || tokenData.access_token;

    // Fetch user/page info
    let handle = '';
    let accountId = '';

    if (platform === 'Facebook') {
      const meRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`);
      const meData = await meRes.json() as any;
      const page = meData.data?.[0];
      if (page) {
        handle = page.name;
        accountId = page.id;
      }
    } else {
      // Instagram Business Account
      const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?access_token=${accessToken}`);
      const pagesData = await pagesRes.json() as any;
      const page = pagesData.data?.[0];
      if (page) {
        const igRes = await fetch(
          `https://graph.facebook.com/v21.0/${page.id}?fields=instagram_business_account&access_token=${accessToken}`,
        );
        const igData = await igRes.json() as any;
        accountId = igData.instagram_business_account?.id || '';
        if (accountId) {
          const profileRes = await fetch(
            `https://graph.facebook.com/v21.0/${accountId}?fields=username&access_token=${accessToken}`,
          );
          const profileData = await profileRes.json() as any;
          handle = profileData.username ? `@${profileData.username}` : '';
        }
      }
    }

    return {
      accessToken,
      expiresAt: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // ~60 days for long-lived
      handle,
      accountId,
    };
  }

  private async exchangeTwitterToken(code: string, redirectUri: string) {
    const clientId = process.env.TWITTER_CLIENT_ID || '';
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';

    const tokenRes = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        code_verifier: 'challenge', // Must match the code_challenge sent earlier
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      throw new BadRequestException(`Twitter OAuth failed: ${tokenData.error_description || 'Unknown error'}`);
    }

    // Fetch user info
    const meRes = await fetch('https://api.x.com/2/users/me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const meData = await meRes.json() as any;

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      handle: meData.data?.username ? `@${meData.data.username}` : '',
      accountId: meData.data?.id,
    };
  }

  private async exchangeGoogleToken(code: string, redirectUri: string) {
    const clientId = process.env.GOOGLE_CLIENT_ID || '';
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });
    const tokenData = await tokenRes.json() as any;

    if (!tokenData.access_token) {
      throw new BadRequestException(`Google OAuth failed: ${tokenData.error_description || 'Unknown error'}`);
    }

    // Fetch YouTube channel info
    const chRes = await fetch(
      `https://www.googleapis.com/youtube/v3/channels?part=snippet&mine=true`,
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const chData = await chRes.json() as any;
    const channel = chData.items?.[0];

    return {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      handle: channel?.snippet?.title || '',
      accountId: channel?.id,
    };
  }
}
