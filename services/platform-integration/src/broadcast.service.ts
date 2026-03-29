import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BroadcastLog } from './broadcast-log.entity.js';
import { BroadcastRecipient } from './broadcast-recipient.entity.js';
import { WhatsAppSessionService } from './whatsapp-session.service.js';
import type { WASocket } from '@whiskeysockets/baileys';

@Injectable()
export class BroadcastService {
  private readonly logger = new Logger(BroadcastService.name);

  constructor(
    @InjectRepository(BroadcastLog)
    private logRepo: Repository<BroadcastLog>,
    @InjectRepository(BroadcastRecipient)
    private recipientRepo: Repository<BroadcastRecipient>,
    private sessionService: WhatsAppSessionService,
  ) {}

  /**
   * Parse and validate a CSV string of contacts.
   * Returns validated phones + a count of skipped entries.
   * Does NOT show individual contact details.
   */
  validateCsv(csv: string): {
    phones: string[];
    valid: number;
    skipped: number;
    errors: string[];
  } {
    const lines = csv.trim().split(/\r?\n/);
    if (lines.length === 0) {
      return { phones: [], valid: 0, skipped: 0, errors: ['Empty CSV'] };
    }

    // Detect header row
    const header = lines[0].toLowerCase();
    const startIdx =
      header.includes('phone') || header.includes('name') ? 1 : 0;

    const phones: string[] = [];
    const seen = new Set<string>();
    let skipped = 0;
    const errors: string[] = [];

    for (let i = startIdx; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        skipped++;
        continue;
      }

      // Extract phone — could be CSV with name,phone or just phone
      const parts = line.split(',');
      const rawPhone = (parts.length >= 2 ? parts[1] : parts[0])
        .trim()
        .replace(/['"]/g, '');

      // Normalize to E.164
      const phone = this.normalizePhone(rawPhone);
      if (!phone) {
        skipped++;
        errors.push(`Row ${i + 1}: invalid phone format`);
        continue;
      }

      if (seen.has(phone)) {
        skipped++;
        continue; // Duplicate
      }

      seen.add(phone);
      phones.push(phone);
    }

    return { phones, valid: phones.length, skipped, errors };
  }

  /**
   * Execute a broadcast: send a message to all provided phones.
   * Rate-limited with random delays to stay safe.
   */
  async broadcast(
    organizationId: string,
    message: string,
    phones: string[],
    postId?: string,
  ): Promise<BroadcastLog> {
    const socket = this.sessionService.getSocket(organizationId);
    if (!socket) {
      throw new BadRequestException(
        'WhatsApp is not connected. Go to Settings → Platforms and scan the QR code.',
      );
    }

    if (!phones.length) {
      throw new BadRequestException('No recipients provided');
    }

    // Create broadcast log
    const log = this.logRepo.create({
      organizationId,
      postId,
      message,
      totalRecipients: phones.length,
      status: 'sending',
    });
    await this.logRepo.save(log);

    // Create recipient records (bulk)
    const recipients = phones.map((phone) =>
      this.recipientRepo.create({
        broadcastId: log.id,
        phone,
        status: 'queued',
      }),
    );
    await this.recipientRepo.save(recipients);

    // Send messages asynchronously (don't block the request)
    this.sendMessages(log, recipients, socket, message).catch((err: Error) => {
      this.logger.error(`Broadcast ${log.id} failed: ${err.message}`);
    });

    return log;
  }

  /** Get broadcast logs for an organization */
  async getLogs(organizationId: string, limit = 20): Promise<BroadcastLog[]> {
    return this.logRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /** Get a single broadcast with its aggregate stats (refreshed from recipients) */
  async getLog(broadcastId: string): Promise<BroadcastLog | null> {
    const log = await this.logRepo.findOne({ where: { id: broadcastId } });
    if (!log) return null;

    // Refresh aggregate counts from recipient records
    const stats = await this.recipientRepo
      .createQueryBuilder('r')
      .select('r.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('r.broadcastId = :id', { id: broadcastId })
      .groupBy('r.status')
      .getRawMany<{ status: string; count: string }>();

    log.sent = 0;
    log.delivered = 0;
    log.read = 0;
    log.failed = 0;
    for (const s of stats) {
      const n = parseInt(s.count, 10);
      if (s.status === 'sent') log.sent = n;
      else if (s.status === 'delivered') log.delivered = n;
      else if (s.status === 'read') log.read = n;
      else if (s.status === 'failed') log.failed = n;
    }
    // Sent also includes delivered+read (they passed through sent)
    log.sent += log.delivered + log.read;
    log.delivered += log.read;

    await this.logRepo.save(log);
    return log;
  }

  // ── Private ──────────────────────────────────────

  private async sendMessages(
    log: BroadcastLog,
    recipients: BroadcastRecipient[],
    socket: WASocket,
    message: string,
  ): Promise<void> {
    let sentCount = 0;
    let failedCount = 0;

    for (const recipient of recipients) {
      try {
        // Format phone as WhatsApp JID
        const jid = recipient.phone.replace('+', '') + '@s.whatsapp.net';

        const result = await socket.sendMessage(jid, { text: message });

        recipient.messageId = result?.key?.id ?? undefined;
        recipient.status = 'sent';
        recipient.sentAt = new Date();
        sentCount++;
      } catch (err: unknown) {
        recipient.status = 'failed';
        recipient.failureReason =
          err instanceof Error ? err.message : 'Send failed';
        failedCount++;
      }

      await this.recipientRepo.save(recipient);

      // Random delay between 1-3 seconds to stay safe
      const delay = 1000 + Math.random() * 2000;
      await new Promise((r) => setTimeout(r, delay));
    }

    // Update log totals
    log.sent = sentCount;
    log.failed = failedCount;
    log.status =
      failedCount === 0 ? 'completed' : sentCount === 0 ? 'failed' : 'partial';
    await this.logRepo.save(log);

    this.logger.log(
      `Broadcast ${log.id} done: sent=${sentCount} failed=${failedCount} total=${recipients.length}`,
    );
  }

  private normalizePhone(raw: string): string | null {
    // Strip spaces, dashes, parens
    let phone = raw.replace(/[\s\-()]/g, '');
    // Ensure starts with +
    if (!phone.startsWith('+')) phone = '+' + phone;
    // Validate E.164: + followed by 7-15 digits
    if (/^\+\d{7,15}$/.test(phone)) return phone;
    return null;
  }
}
