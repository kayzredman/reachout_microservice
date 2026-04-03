import { Controller, Get, Inject, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(
    private readonly dataSource: DataSource,
    @Optional() @Inject('HEALTH_REDIS') private readonly redis?: Redis,
  ) {}

  @Get()
  async check() {
    const checks: Record<string, string> = {};

    // Database check
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch {
      checks.database = 'down';
    }

    // Redis check (only for services with BullMQ)
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
