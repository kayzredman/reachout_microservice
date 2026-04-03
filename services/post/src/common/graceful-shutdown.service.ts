import { Injectable, Logger, OnModuleDestroy, OnApplicationShutdown, Inject, Optional } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';

@Injectable()
export class GracefulShutdownService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  constructor(
    private readonly dataSource: DataSource,
    @Optional() @Inject('HEALTH_REDIS') private readonly redis?: Redis,
  ) {}

  async onModuleDestroy() {
    this.logger.log('Module destroying — cleaning up resources...');
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (signal: ${signal ?? 'none'})`);

    // Close Redis connections
    if (this.redis) {
      this.redis.disconnect();
      this.logger.log('Redis connection closed');
    }

    // Close database connections
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connections closed');
    }

    this.logger.log('Shutdown complete');
  }
}
