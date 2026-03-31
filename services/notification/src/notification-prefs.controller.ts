import { Controller, Get, Put, Param, Body, Req, UseGuards } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('notifications')
@UseGuards(ClerkAuthGuard)
export class NotificationPrefsController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get(':orgId/preferences')
  async getPrefs(@Param('orgId') orgId: string, @Req() req: any) {
    const userId = req.user?.sub;
    return this.notificationService.getPrefs(orgId, userId);
  }

  @Put(':orgId/preferences')
  async updatePrefs(
    @Param('orgId') orgId: string,
    @Req() req: any,
    @Body() body: { scheduled?: boolean; engagement?: boolean; followers?: boolean; tips?: boolean; push?: boolean; weeklyReport?: boolean },
  ) {
    const userId = req.user?.sub;
    return this.notificationService.updatePrefs(orgId, userId, body);
  }
}
