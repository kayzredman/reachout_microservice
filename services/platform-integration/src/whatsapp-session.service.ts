import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PlatformConnection } from './platform-connection.entity.js';
import { BroadcastRecipient } from './broadcast-recipient.entity.js';
import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  WASocket,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  type WAMessageUpdate,
} from '@whiskeysockets/baileys';
import * as QRCode from 'qrcode';
import pino from 'pino';
import { join } from 'path';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { EventEmitter } from 'events';

/** Directory to persist Baileys auth sessions per organization */
const SESSIONS_DIR = join(process.cwd(), '.wa-sessions');
const baileysLogger = pino({ level: 'silent' });

interface SessionInfo {
  socket: WASocket;
  qr?: string;
  status: 'qr' | 'connecting' | 'connected' | 'disconnected';
  phone?: string;
  name?: string;
}

@Injectable()
export class WhatsAppSessionService
  extends EventEmitter
  implements OnModuleDestroy
{
  private readonly logger = new Logger(WhatsAppSessionService.name);
  private sessions = new Map<string, SessionInfo>();

  constructor(
    @InjectRepository(PlatformConnection)
    private connRepo: Repository<PlatformConnection>,
    @InjectRepository(BroadcastRecipient)
    private recipientRepo: Repository<BroadcastRecipient>,
  ) {
    super();
  }

  onModuleDestroy() {
    for (const [orgId, info] of this.sessions) {
      try {
        info.socket.end(undefined);
      } catch {
        /* ignore */
      }
      this.logger.log(`Closed session for org=${orgId}`);
    }
    this.sessions.clear();
  }

  /** Restore sessions for all connected WhatsApp orgs on startup */
  async restoreSessions(): Promise<void> {
    const conns = await this.connRepo.find({
      where: { platform: 'WhatsApp', connected: true },
    });
    for (const conn of conns) {
      const sessionDir = join(SESSIONS_DIR, conn.organizationId);
      if (existsSync(sessionDir)) {
        this.logger.log(`Restoring session for org=${conn.organizationId}`);
        await this.startSession(conn.organizationId);
      }
    }
  }

  /** Start a new Baileys session. Returns QR as data URI for first-time pairing. */
  async startSession(
    organizationId: string,
  ): Promise<{ status: string; qr?: string }> {
    // If already connected, return status
    const existing = this.sessions.get(organizationId);
    if (existing?.status === 'connected') {
      return { status: 'connected' };
    }

    const sessionDir = join(SESSIONS_DIR, organizationId);
    if (!existsSync(sessionDir)) mkdirSync(sessionDir, { recursive: true });

    const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
    const { version } = await fetchLatestBaileysVersion();

    const socket = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
      },
      printQRInTerminal: false,
      logger: baileysLogger,
    });

    const info: SessionInfo = { socket, status: 'connecting' };
    this.sessions.set(organizationId, info);

    // Save credentials when updated
    socket.ev.on('creds.update', () => {
      void saveCreds();
    });

    // Handle connection updates (QR code, connection status)
    socket.ev.on('connection.update', (update) => {
      void this.handleConnectionUpdate(organizationId, info, socket, update);
    });

    // Handle message status updates (sent → delivered → read)
    socket.ev.on('messages.update', (updates) => {
      void this.handleMessageUpdates(updates);
    });

    // Wait briefly for QR or connection
    await new Promise((r) => setTimeout(r, 2000));

    return {
      status: info.status,
      qr: info.qr,
    };
  }

  /** Get current session status + QR for an org */
  getSessionStatus(organizationId: string): {
    status: string;
    qr?: string;
    phone?: string;
    name?: string;
  } {
    const info = this.sessions.get(organizationId);
    if (!info) return { status: 'disconnected' };
    return {
      status: info.status,
      qr: info.qr,
      phone: info.phone,
      name: info.name,
    };
  }

  /** Get the active socket for sending messages */
  getSocket(organizationId: string): WASocket | null {
    const info = this.sessions.get(organizationId);
    if (!info || info.status !== 'connected') return null;
    return info.socket;
  }

  /** Check if a phone number is registered on WhatsApp */
  async isOnWhatsApp(organizationId: string, phone: string): Promise<boolean> {
    const socket = this.getSocket(organizationId);
    if (!socket) return false;
    try {
      const results = await socket.onWhatsApp(phone);
      return results?.[0]?.exists === true;
    } catch {
      return false;
    }
  }

  /** Disconnect and remove a session */
  async clearSession(organizationId: string): Promise<void> {
    const info = this.sessions.get(organizationId);
    if (info) {
      try {
        await info.socket.logout();
      } catch {
        /* ignore */
      }
      try {
        info.socket.end(undefined);
      } catch {
        /* ignore */
      }
    }
    this.sessions.delete(organizationId);

    // Remove auth files
    const sessionDir = join(SESSIONS_DIR, organizationId);
    if (existsSync(sessionDir)) {
      rmSync(sessionDir, { recursive: true, force: true });
    }

    // Mark as disconnected in DB
    const conn = await this.connRepo.findOne({
      where: { organizationId, platform: 'WhatsApp' },
    });
    if (conn) {
      conn.connected = false;
      conn.handle = undefined;
      conn.phoneNumber = undefined;
      conn.platformAccountId = undefined;
      conn.accessToken = undefined;
      await this.connRepo.save(conn);
    }
  }

  // ── Private helpers ─────────────────────────────

  private async handleConnectionUpdate(
    organizationId: string,
    info: SessionInfo,
    socket: WASocket,
    update: Partial<{
      connection: string;
      lastDisconnect: { error?: Error };
      qr: string;
    }>,
  ): Promise<void> {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      info.qr = await QRCode.toDataURL(qr, { width: 280, margin: 2 });
      info.status = 'qr';
      this.emit('qr', organizationId, info.qr);
    }

    if (connection === 'open') {
      info.status = 'connected';
      info.qr = undefined;
      const me = socket.user;
      info.phone = me?.id?.split(':')[0] || '';
      info.name = me?.name || '';

      await this.upsertConnection(organizationId, info.phone, info.name);

      this.logger.log(`Connected org=${organizationId} phone=${info.phone}`);
      this.emit('connected', organizationId, {
        phone: info.phone,
        name: info.name,
      });
    }

    if (connection === 'close') {
      const disconnectError = lastDisconnect?.error as
        | { output?: { statusCode?: number } }
        | undefined;
      const statusCode = disconnectError?.output?.statusCode;
      const loggedOut = statusCode === DisconnectReason.loggedOut;

      info.status = 'disconnected';
      this.logger.warn(
        `Disconnected org=${organizationId} code=${statusCode} loggedOut=${loggedOut}`,
      );

      if (loggedOut) {
        await this.clearSession(organizationId);
      } else {
        this.sessions.delete(organizationId);
        setTimeout(() => {
          void this.startSession(organizationId);
        }, 3000);
      }
    }
  }

  private async handleMessageUpdates(
    updates: WAMessageUpdate[],
  ): Promise<void> {
    const statusMap: Record<number, BroadcastRecipient['status']> = {
      2: 'sent',
      3: 'delivered',
      4: 'read',
      5: 'read',
    };

    for (const update of updates) {
      if (!update.key?.id) continue;
      const msgId = update.key.id;
      const status = (update.update as { status?: number })?.status;
      const newStatus = statusMap[status ?? 0];
      if (!newStatus) continue;

      const recipient = await this.recipientRepo.findOne({
        where: { messageId: msgId },
      });
      if (!recipient) continue;

      // Only advance status forward (don't downgrade read → delivered)
      const order = { queued: 0, sent: 1, delivered: 2, read: 3, failed: -1 };
      if (order[newStatus] <= order[recipient.status]) continue;

      recipient.status = newStatus;
      if (newStatus === 'sent') recipient.sentAt = new Date();
      if (newStatus === 'delivered') recipient.deliveredAt = new Date();
      if (newStatus === 'read') recipient.readAt = new Date();

      await this.recipientRepo.save(recipient);
      this.emit('status-update', recipient.broadcastId, msgId, newStatus);
    }
  }

  /** Upsert the WhatsApp platform connection record when Baileys connects */
  private async upsertConnection(
    organizationId: string,
    phone: string,
    name: string,
  ): Promise<void> {
    let conn = await this.connRepo.findOne({
      where: { organizationId, platform: 'WhatsApp' },
    });
    if (!conn) {
      conn = this.connRepo.create({
        organizationId,
        platform: 'WhatsApp',
        connectedBy: 'system',
      });
    }
    conn.connected = true;
    conn.phoneNumber = phone;
    conn.handle = name || phone;
    conn.platformAccountId = phone;
    // No access token needed — Baileys uses local session
    conn.accessToken = 'baileys-session';
    await this.connRepo.save(conn);
  }
}
