import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ScheduledPostProcessor } from './queues/scheduled-post.processor';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';
import { ResilientHttpService } from './common/resilient-http.service';
import { join } from 'path';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '.env') }),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'scheduled-post' }),
    SchedulerModule,
  ],
  controllers: [AppController, HealthController],
  providers: [
    AppService, ScheduledPostProcessor,
    GracefulShutdownService, ResilientHttpService,
    {
      provide: 'HEALTH_REDIS',
      useFactory: () => new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
        lazyConnect: true,
      }),
    },
  ],
  exports: [ResilientHttpService],
})
export class AppModule {}
