import { Injectable, Logger, OnApplicationShutdown, Inject, Optional } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  constructor(
    @Optional() @Inject('HEALTH_REDIS') private readonly redis?: Redis,
  ) {}

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (signal: ${signal ?? 'none'})`);

    if (this.redis) {
      this.redis.disconnect();
      this.logger.log('Redis connection closed');
    }

    this.logger.log('Shutdown complete');
  }
}
