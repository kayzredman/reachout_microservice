import {
  Controller,
  Get,
  Post,
  Body,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  UnauthorizedException,
} from '@nestjs/common';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { verifyToken } from '@clerk/clerk-sdk-node';
import type { Request } from 'express';

@Controller('auth')
export class AuthController {
  /**
   * POST /auth/verify
   * Service-to-service token verification.
   * Other microservices call this to validate a Clerk JWT
   * without needing the Clerk secret key themselves.
   */
  @Post('verify')
  @HttpCode(200)
  async verifyTokenEndpoint(
    @Headers('authorization') authHeader: string,
  ) {
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header');
    }

    const token = authHeader.replace('Bearer ', '');
    try {
      const payload = await verifyToken(token, {
        secretKey: process.env.CLERK_SECRET_KEY,
      });

      return {
        valid: true,
        userId: payload.sub,
        orgId: payload.org_id || null,
        orgRole: payload.org_role || null,
        sessionId: payload.sid,
        exp: payload.exp,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * GET /auth/me
   * Returns the authenticated user's Clerk JWT payload.
   */
  @UseGuards(ClerkAuthGuard)
  @Get('me')
  getMe(@Req() req: Request) {
    const user = (req as any).user;
    return {
      userId: user.sub,
      orgId: user.org_id || null,
      orgRole: user.org_role || null,
      sessionId: user.sid,
    };
  }
}
