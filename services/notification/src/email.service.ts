import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

export interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    if (process.env.SMTP_USER) {
      this.transporter.verify().then(() => {
        this.logger.log('SMTP connection verified');
      }).catch((err) => {
        this.logger.warn(`SMTP connection failed: ${err.message}`);
      });
    } else {
      this.logger.warn('SMTP_USER not set — emails will be logged but not sent');
    }
  }

  async send(payload: EmailPayload): Promise<boolean> {
    const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@faithreach.io';

    if (!process.env.SMTP_USER) {
      this.logger.log(`[DRY RUN] Email to=${payload.to} subject="${payload.subject}"`);
      return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"FaithReach Support" <${from}>`,
        to: payload.to,
        subject: payload.subject,
        html: payload.html,
        text: payload.text,
      });
      this.logger.log(`Email sent to ${payload.to}: ${info.messageId}`);
      return true;
    } catch (err: any) {
      this.logger.error(`Failed to send email to ${payload.to}: ${err.message}`);
      return false;
    }
  }
}
