
import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AppService } from './app.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { Request } from 'express';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @UseGuards(ClerkAuthGuard)
  @Get('me')
  getMe(@Req() req: Request) {
    // user info is attached by the guard
    return { user: (req as any).user };
  }
}
