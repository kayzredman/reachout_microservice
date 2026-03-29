import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConnection } from './platform-connection.entity.js';
import { WhatsAppSessionService } from './whatsapp-session.service.js';

/** Platforms that use OAuth (redirects to external login) */
const OAUTH_PLATFORMS = ['Instagram', 'Facebook', 'X (Twitter)', 'YouTube'];

/** The base URLs for each platform OAuth flow */
const OAUTH_CONFIG: Record<string, { authUrl: string; scopes: string }> = {
  Instagram: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    scopes: 'public_profile,pages_show_list,pages_read_engagement,instagram_basic,instagram_content_publish',
  },
  Facebook: {
    authUrl: 'https://www.facebook.com/v21.0/dialog/oauth',
    scopes: 'public_profile,pages_show_list,pages_read_engagement,pages_manage_posts',
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
  private readonly logger = new Logger(PlatformService.name);

  constructor(
    @InjectRepository(PlatformConnection)
    private connRepo: Repository<PlatformConnection>,
    private sessionService: WhatsAppSessionService,
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
   * Mark WhatsApp as connected after Baileys QR pairing succeeds.
   * Called internally by WhatsAppSessionService once the socket opens.
   */
  async markWhatsAppConnected(
    organizationId: string,
    connectedBy: string,
    phone: string,
    pushName: string,
  ): Promise<PlatformConnection> {
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
    conn.phoneNumber = phone;
    conn.handle = pushName || phone;
    conn.connectedBy = connectedBy;

    return this.connRepo.save(conn);
  }

  /** Disconnect a platform */
  async disconnect(organizationId: string, platform: string): Promise<void> {
    const conn = await this.connRepo.findOne({ where: { organizationId, platform } });
    if (!conn) throw new NotFoundException('Connection not found');

    // For WhatsApp, also tear down the Baileys session
    if (platform === 'WhatsApp') {
      await this.sessionService.clearSession(organizationId);
    }

    conn.connected = false;
    conn.accessToken = undefined;
    conn.refreshToken = undefined;
    conn.tokenExpiresAt = undefined;
    conn.platformAccountId = undefined;
    conn.phoneNumber = undefined;
    conn.handle = undefined;
    conn.channelId = undefined;

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

  // ── Publishing ────────────────────────────────────────

  /**
   * Publish content to a specific platform using stored OAuth tokens.
   * Returns the platform-specific post ID on success.
   */
  async publishToplatform(
    organizationId: string,
    platform: string,
    content: string,
    imageUrl?: string,
  ): Promise<{ platformPostId?: string }> {
    const conn = await this.connRepo.findOne({ where: { organizationId, platform } });
    if (!conn || !conn.connected) {
      throw new BadRequestException(`${platform} is not connected. Connect it in Settings first.`);
    }

    if (platform === 'X (Twitter)') {
      return this.publishToTwitter(conn, content);
    }
    if (platform === 'Facebook') {
      return this.publishToFacebook(conn, content, imageUrl);
    }
    if (platform === 'Instagram') {
      if (!imageUrl) throw new BadRequestException('Instagram requires an image');
      return this.publishToInstagram(conn, content, imageUrl);
    }
    if (platform === 'WhatsApp') {
      return this.publishToWhatsApp(conn, content, imageUrl);
    }
    throw new BadRequestException(`Publishing to ${platform} is not supported yet`);
  }

  /** Refresh an expired Twitter OAuth2 access token */
  private async refreshTwitterToken(conn: PlatformConnection): Promise<void> {
    if (!conn.refreshToken) {
      throw new BadRequestException('Twitter session expired. Reconnect X (Twitter) in Settings.');
    }

    const clientId = process.env.TWITTER_CLIENT_ID || '';
    const clientSecret = process.env.TWITTER_CLIENT_SECRET || '';

    const res = await fetch('https://api.x.com/2/oauth2/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: conn.refreshToken,
        client_id: clientId,
      }),
    });
    const data = await res.json() as any;

    if (!data.access_token) {
      throw new BadRequestException('Twitter session expired. Reconnect X (Twitter) in Settings.');
    }

    conn.accessToken = data.access_token;
    conn.refreshToken = data.refresh_token || conn.refreshToken;
    conn.tokenExpiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000);
    await this.connRepo.save(conn);
  }

  /** Refresh a Meta (Facebook/Instagram) long-lived token before it expires (~60 days) */
  private async refreshMetaToken(conn: PlatformConnection): Promise<void> {
    const appId = process.env.META_APP_ID || '';
    const appSecret = process.env.META_APP_SECRET || '';

    const res = await fetch(
      `https://graph.facebook.com/v21.0/oauth/access_token?` +
        new URLSearchParams({
          grant_type: 'fb_exchange_token',
          client_id: appId,
          client_secret: appSecret,
          fb_exchange_token: conn.accessToken!,
        }),
    );
    const data = await res.json() as any;

    if (!data.access_token) {
      throw new BadRequestException(
        `${conn.platform} session expired. Reconnect ${conn.platform} in Settings.`,
      );
    }

    conn.accessToken = data.access_token;
    conn.tokenExpiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000);
    await this.connRepo.save(conn);
  }

  /** Ensure Meta token is still valid; refresh if expiring within 7 days */
  private async ensureMetaToken(conn: PlatformConnection): Promise<void> {
    if (!conn.tokenExpiresAt) return;
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    if (conn.tokenExpiresAt.getTime() - Date.now() < sevenDays) {
      await this.refreshMetaToken(conn);
    }
  }

  /** Post a tweet via X API v2 */
  private async publishToTwitter(
    conn: PlatformConnection,
    content: string,
  ): Promise<{ platformPostId?: string }> {
    // Refresh token if expired
    if (conn.tokenExpiresAt && conn.tokenExpiresAt < new Date()) {
      await this.refreshTwitterToken(conn);
    }

    // Truncate to 280 chars for Twitter
    const text = content.length > 280 ? content.slice(0, 277) + '...' : content;

    const res = await fetch('https://api.x.com/2/tweets', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${conn.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json() as any;

    if (!res.ok) {
      throw new BadRequestException(
        `Twitter publish failed: ${data.detail || data.title || 'Unknown error'}`,
      );
    }

    return { platformPostId: data.data?.id };
  }

  /** Post to a Facebook Page feed */
  /** Convert a base64 data URI to a Buffer and mime type */
  private parseBase64Image(dataUri: string): { buffer: ArrayBuffer; mimeType: string; ext: string } | null {
    const match = dataUri.match(/^data:(image\/(png|jpeg|jpg|gif|webp));base64,(.+)$/);
    if (!match) return null;
    const buf = Buffer.from(match[3], 'base64');
    return {
      buffer: buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength),
      mimeType: match[1],
      ext: match[2] === 'jpeg' || match[2] === 'jpg' ? 'jpg' : match[2],
    };
  }

  private async publishToFacebook(
    conn: PlatformConnection,
    content: string,
    imageUrl?: string,
  ): Promise<{ platformPostId?: string }> {
    await this.ensureMetaToken(conn);
    const pageId = conn.platformAccountId;
    if (!pageId) throw new BadRequestException('Facebook page not found. Reconnect Facebook in Settings.');

    // Get page access token
    const pagesRes = await fetch(
      `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${conn.accessToken}`,
    );
    const pageData = await pagesRes.json() as any;
    const pageToken = pageData.access_token || conn.accessToken;

    let res: Response;

    if (imageUrl && imageUrl.startsWith('data:image/')) {
      // Base64 image — upload via multipart form data
      const parsed = this.parseBase64Image(imageUrl);
      if (!parsed) throw new BadRequestException('Invalid image format');

      const formData = new FormData();
      formData.append('source', new Blob([parsed.buffer], { type: parsed.mimeType }), `image.${parsed.ext}`);
      formData.append('caption', content);
      formData.append('access_token', pageToken);

      res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: 'POST',
        body: formData,
      });
    } else if (imageUrl) {
      // Regular URL
      res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: imageUrl, caption: content, access_token: pageToken }),
      });
    } else {
      // Text-only post
      res = await fetch(`https://graph.facebook.com/v21.0/${pageId}/feed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: content, access_token: pageToken }),
      });
    }

    const data = await res.json() as any;

    if (!res.ok) {
      throw new BadRequestException(
        `Facebook publish failed: ${data.error?.message || 'Unknown error'}`,
      );
    }

    return { platformPostId: data.id || data.post_id };
  }

  /** Post an image + caption to Instagram via Graph API content publishing */
  private async publishToInstagram(
    conn: PlatformConnection,
    caption: string,
    imageUrl: string,
  ): Promise<{ platformPostId?: string }> {
    await this.ensureMetaToken(conn);
    const igAccountId = conn.platformAccountId;
    if (!igAccountId) {
      throw new BadRequestException('Instagram Business account not found. Reconnect Instagram in Settings.');
    }

    let publicImageUrl = imageUrl;

    // If the image is base64, upload it to Facebook first to get a public URL
    if (imageUrl.startsWith('data:image/')) {
      const parsed = this.parseBase64Image(imageUrl);
      if (!parsed) throw new BadRequestException('Invalid image format');

      // Upload as unpublished photo to the user's Facebook page to get a public URL
      // First, find a connected Facebook page to host the image
      const fbConn = await this.connRepo.findOne({
        where: { organizationId: conn.organizationId, platform: 'Facebook' },
      });

      if (fbConn?.platformAccountId) {
        // Get page token
        const ptRes = await fetch(
          `https://graph.facebook.com/v21.0/${fbConn.platformAccountId}?fields=access_token&access_token=${fbConn.accessToken}`,
        );
        const ptData = await ptRes.json() as any;
        const pageToken = ptData.access_token || fbConn.accessToken;

        // Upload as unpublished photo
        const formData = new FormData();
        formData.append('source', new Blob([parsed.buffer], { type: parsed.mimeType }), `image.${parsed.ext}`);
        formData.append('published', 'false');
        formData.append('access_token', pageToken);

        const uploadRes = await fetch(
          `https://graph.facebook.com/v21.0/${fbConn.platformAccountId}/photos`,
          { method: 'POST', body: formData },
        );
        const uploadData = await uploadRes.json() as any;

        if (uploadData.id) {
          // Get the public URL of the uploaded photo
          const photoRes = await fetch(
            `https://graph.facebook.com/v21.0/${uploadData.id}?fields=images&access_token=${pageToken}`,
          );
          const photoData = await photoRes.json() as any;
          publicImageUrl = photoData.images?.[0]?.source || '';
        }
      }

      if (!publicImageUrl || publicImageUrl.startsWith('data:')) {
        throw new BadRequestException(
          'Instagram requires a publicly accessible image URL. Connect Facebook first to enable image hosting.',
        );
      }
    }

    // Step 1: Create a media container
    const containerRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: publicImageUrl,
          caption,
          access_token: conn.accessToken,
        }),
      },
    );
    const containerData = await containerRes.json() as any;

    if (!containerData.id) {
      throw new BadRequestException(
        `Instagram container creation failed: ${containerData.error?.message || 'Unknown error'}`,
      );
    }

    // Step 2: Publish the container
    const publishRes = await fetch(
      `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          creation_id: containerData.id,
          access_token: conn.accessToken,
        }),
      },
    );
    const publishData = await publishRes.json() as any;

    if (!publishData.id) {
      throw new BadRequestException(
        `Instagram publish failed: ${publishData.error?.message || 'Unknown error'}`,
      );
    }

    return { platformPostId: publishData.id };
  }

  /**
   * WhatsApp: Send a text message via Baileys (user's own WhatsApp session).
   * This is used for single-message publishing (e.g. post to own number).
   * Broadcasting to many recipients is handled by BroadcastService.
   */
  private async publishToWhatsApp(
    conn: PlatformConnection,
    content: string,
    _imageUrl?: string,
  ): Promise<{ platformPostId?: string }> {
    const socket = this.sessionService.getSocket(conn.organizationId);
    if (!socket) {
      throw new BadRequestException(
        'WhatsApp is not connected. Go to Settings → Platforms and scan the QR code to connect.',
      );
    }

    // Send to the connected number itself (test/preview)
    const phone = conn.phoneNumber;
    if (!phone) {
      throw new BadRequestException(
        'No phone number found for WhatsApp session. Reconnect in Settings.',
      );
    }

    const jid = phone.replace(/[^\d]/g, '') + '@s.whatsapp.net';

    try {
      const sent = await socket.sendMessage(jid, { text: content });
      return { platformPostId: sent?.key?.id || undefined };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown WhatsApp send error';
      this.logger.error(`WhatsApp send failed for org=${conn.organizationId}: ${msg}`);
      throw new BadRequestException(`WhatsApp send failed: ${msg}`);
    }
  }
}
