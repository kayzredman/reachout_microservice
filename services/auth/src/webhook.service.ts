import { Injectable, Logger } from '@nestjs/common';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  /**
   * Process a verified Clerk webhook event.
   * Forwards relevant user/org events to the user service for DB sync.
   */
  async processEvent(type: string, data: Record<string, any>): Promise<void> {
    this.logger.log(`Processing webhook event: ${type}`);

    switch (type) {
      case 'user.created':
        await this.handleUserCreated(data);
        break;
      case 'user.updated':
        await this.handleUserUpdated(data);
        break;
      case 'user.deleted':
        await this.handleUserDeleted(data);
        break;
      case 'organization.created':
      case 'organization.updated':
        this.logger.log(`Org event ${type}: ${data.id} — ${data.name}`);
        break;
      case 'organizationMembership.created':
      case 'organizationMembership.deleted':
        this.logger.log(
          `Membership event ${type}: user=${data.public_user_data?.user_id} org=${data.organization?.id}`,
        );
        break;
      default:
        this.logger.log(`Unhandled webhook event type: ${type}`);
    }
  }

  private async handleUserCreated(data: Record<string, any>): Promise<void> {
    const clerkId = data.id;
    const email =
      data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)
        ?.email_address || '';
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || email || 'User';
    const imageUrl = data.image_url || '';

    this.logger.log(`User created: ${clerkId} (${email})`);

    try {
      // Call user service to create the user in the DB
      const res = await fetch(`${USER_SERVICE_URL}/user/webhook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId, email, name, imageUrl, action: 'create' }),
      });
      if (!res.ok) {
        this.logger.warn(`User service sync failed for user.created: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to forward user.created to user service: ${err}`);
    }
  }

  private async handleUserUpdated(data: Record<string, any>): Promise<void> {
    const clerkId = data.id;
    const email =
      data.email_addresses?.find((e: any) => e.id === data.primary_email_address_id)
        ?.email_address || '';
    const name =
      [data.first_name, data.last_name].filter(Boolean).join(' ') || email || 'User';
    const imageUrl = data.image_url || '';

    this.logger.log(`User updated: ${clerkId} (${email})`);

    try {
      const res = await fetch(`${USER_SERVICE_URL}/user/webhook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId, email, name, imageUrl, action: 'update' }),
      });
      if (!res.ok) {
        this.logger.warn(`User service sync failed for user.updated: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to forward user.updated to user service: ${err}`);
    }
  }

  private async handleUserDeleted(data: Record<string, any>): Promise<void> {
    const clerkId = data.id;
    this.logger.log(`User deleted: ${clerkId}`);

    try {
      const res = await fetch(`${USER_SERVICE_URL}/user/webhook/sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clerkId, action: 'delete' }),
      });
      if (!res.ok) {
        this.logger.warn(`User service sync failed for user.deleted: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn(`Failed to forward user.deleted to user service: ${err}`);
    }
  }
}
