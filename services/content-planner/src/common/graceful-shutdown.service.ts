import { Injectable, Logger, OnApplicationShutdown } from '@nestjs/common';

@Injectable()
export class GracefulShutdownService implements OnApplicationShutdown {
  private readonly logger = new Logger('Shutdown');

  async onApplicationShutdown(signal?: string) {
    this.logger.log(`Application shutting down (signal: ${signal ?? 'none'})`);
    this.logger.log('Shutdown complete');
  }
}
