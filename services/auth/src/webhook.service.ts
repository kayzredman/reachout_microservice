import { Injectable, Logger } from '@nestjs/common';

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:3002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:3008';
const NOTIFICATION_SERVICE_URL = process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3004';

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
        await this.handleOrgCreated(data);
        break;
      case 'organization.updated':
        this.logger.log(`Org updated: ${data.id} — ${data.name}`);
        break;
      case 'organizationMembership.created':
        await this.handleMembershipCreated(data);
        break;
      case 'organizationMembership.deleted':
        await this.handleMembershipDeleted(data);
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

  /** When a new org is created, provision a starter subscription in billing */
  private async handleOrgCreated(data: Record<string, any>): Promise<void> {
    const orgId = data.id;
    const orgName = data.name || 'New Organization';
    this.logger.log(`Organization created: ${orgId} — ${orgName}`);

    try {
      const res = await fetch(`${BILLING_SERVICE_URL}/billing/${orgId}`, {
        method: 'GET',
      });
      if (res.ok) {
        this.logger.log(`Billing subscription already exists for org ${orgId}`);
      }
      // GET auto-creates a starter subscription if none exists (billing service behavior)
    } catch (err) {
      this.logger.warn(`Failed to provision billing for org ${orgId}: ${err}`);
    }
  }

  /** When a member joins an org, ensure their user record exists and notify */
  private async handleMembershipCreated(data: Record<string, any>): Promise<void> {
    const userId = data.public_user_data?.user_id;
    const orgId = data.organization?.id;
    const orgName = data.organization?.name || 'the organization';
    const memberName =
      [data.public_user_data?.first_name, data.public_user_data?.last_name]
        .filter(Boolean)
        .join(' ') || 'A new member';
    const role = data.role || 'org:member';

    this.logger.log(`Membership created: user=${userId} org=${orgId} role=${role}`);

    // Ensure user exists in user service
    if (userId) {
      try {
        await fetch(`${USER_SERVICE_URL}/user/webhook/sync`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            clerkId: userId,
            email: data.public_user_data?.identifier || '',
            name: memberName,
            imageUrl: data.public_user_data?.image_url || '',
            action: 'create',
          }),
        });
      } catch (err) {
        this.logger.warn(`Failed to sync member user record: ${err}`);
      }
    }

    // Notify the org about the new member
    if (orgId) {
      try {
        await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'in-app',
            userId: 'system',
            orgId,
            subject: 'New Team Member',
            body: `${memberName} has joined ${orgName} as ${role.replace('org:', '')}.`,
          }),
        });
      } catch (err) {
        this.logger.warn(`Failed to send membership notification: ${err}`);
      }
    }
  }

  /** When a member leaves an org, notify the org */
  private async handleMembershipDeleted(data: Record<string, any>): Promise<void> {
    const userId = data.public_user_data?.user_id;
    const orgId = data.organization?.id;
    const orgName = data.organization?.name || 'the organization';
    const memberName =
      [data.public_user_data?.first_name, data.public_user_data?.last_name]
        .filter(Boolean)
        .join(' ') || 'A member';

    this.logger.log(`Membership deleted: user=${userId} org=${orgId}`);

    if (orgId) {
      try {
        await fetch(`${NOTIFICATION_SERVICE_URL}/notifications/send`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'in-app',
            userId: 'system',
            orgId,
            subject: 'Team Member Removed',
            body: `${memberName} has left ${orgName}.`,
          }),
        });
      } catch (err) {
        this.logger.warn(`Failed to send membership removal notification: ${err}`);
      }
    }
  }
}
