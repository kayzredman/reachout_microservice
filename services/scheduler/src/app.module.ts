import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SchedulerModule } from './scheduler/scheduler.module';
import { ScheduledPostProcessor } from './queues/scheduled-post.processor';
import { join } from 'path';

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
  controllers: [AppController],
  providers: [AppService, ScheduledPostProcessor],
})
export class AppModule {}
