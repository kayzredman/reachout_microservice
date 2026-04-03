import { Controller, Get, Inject, Optional } from '@nestjs/common';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    @Optional() @Inject('HEALTH_REDIS') private readonly redis?: Redis,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {};

    if (this.redis) {
      try {
        await this.redis.ping();
        checks.redis = 'up';
      } catch {
        checks.redis = 'down';
      }
    }

    const healthy = Object.values(checks).every((v) => v === 'up');

    return {
      status: healthy ? 'ok' : 'degraded',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      checks,
    };
  }
}
