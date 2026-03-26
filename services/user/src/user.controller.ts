import { Controller, Get, Put, Body, Req, NotFoundException, UseGuards } from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { UserService } from './user.service';
import { User } from './user.entity';

@Controller('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  async getMe(@Req() req: any): Promise<User> {
    const clerkUser = req.user;
    if (!clerkUser) throw new NotFoundException('No Clerk user');
    const user = await this.userService.getOrCreateByClerk(clerkUser.sub, clerkUser);
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
}
