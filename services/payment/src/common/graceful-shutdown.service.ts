import { Injectable, Logger, OnModuleDestroy, OnApplicationShutdown } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GracefulShutdownService implements OnModuleDestroy, OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  constructor(private readonly dataSource: DataSource) {}

  async onModuleDestroy() {
    this.logger.log('Module destroying — cleaning up resources...');
  }

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (signal: ${signal ?? 'none'})`);

    // Close database connections
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connections closed');
    }

    this.logger.log('Shutdown complete');
  }
}
