import {
  Controller,
  Get,
  Param,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { InAppNotificationService } from './in-app-notification.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('notifications')
@UseGuards(ClerkAuthGuard)
export class InAppNotificationController {
  constructor(private readonly svc: InAppNotificationService) {}

  /** GET /notifications/:orgId/list — get recent notifications + unread count */
  @Get(':orgId/list')
  async list(@Param('orgId') orgId: string, @Req() req: any) {
    const userId: string = req.userId ?? req.auth?.userId;
    return this.svc.listForUser(userId, orgId);
  }

  /** PATCH /notifications/:orgId/read/:id — mark single notification as read */
  @Patch(':orgId/read/:id')
  async markRead(
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const userId: string = req.userId ?? req.auth?.userId;
    await this.svc.markAsRead(id, userId);
    return { success: true };
  }

  /** PATCH /notifications/:orgId/read-all — mark all notifications as read */
  @Patch(':orgId/read-all')
  async markAllRead(
    @Param('orgId') orgId: string,
    @Req() req: any,
  ) {
    const userId: string = req.userId ?? req.auth?.userId;
    await this.svc.markAllRead(userId, orgId);
    return { success: true };
  }
}
