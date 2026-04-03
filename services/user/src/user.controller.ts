import { Controller, Get, Put, Post, Body, Req, Param, NotFoundException, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  /**
   * GET /user/internal/:id — internal service-to-service lookup (no auth).
   * Returns basic user info including email for notifications.
   */
  @Get('internal/:id')
  async getInternal(@Param('id') id: string): Promise<User> {
    const user = await this.userService.findById(id);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async getMe(@Req() req: any): Promise<User> {
    const clerkUser = req.user;
    if (!clerkUser) throw new NotFoundException('No Clerk user');
    // Use headers from frontend API route for reliable user info
    const clerkPayload = {
      ...clerkUser,
      email: req.headers['x-clerk-user-email'] || clerkUser.email || '',
      name: req.headers['x-clerk-user-name'] || clerkUser.name || '',
      image_url: req.headers['x-clerk-user-image'] || clerkUser.image_url || '',
    };
    const user = await this.userService.getOrCreateByClerk(clerkUser.sub, clerkPayload);
    return user;
  }

  @UseGuards(ClerkAuthGuard)
  @Put('me')
  async updateMe(@Req() req: any, @Body() updates: Partial<User>): Promise<User> {
    const clerkUser = req.user;
    if (!clerkUser) throw new NotFoundException('No Clerk user');
    const user = await this.userService.updateByClerk(clerkUser.sub, updates);
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  /**
   * POST /user/webhook/sync
   * Internal endpoint called by the auth service when Clerk webhook events arrive.
   * Not guarded — only called service-to-service.
   */
  @Post('webhook/sync')
  async webhookSync(
    @Body() body: { clerkId: string; email?: string; name?: string; imageUrl?: string; action: 'create' | 'update' | 'delete' },
  ) {
    return this.userService.webhookSync(body);
  }
}
