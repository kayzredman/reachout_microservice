import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostEntity } from './post.entity';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { SeriesEntity } from './series.entity';
import { PostMetrics } from './post-metrics.entity';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { PublishProcessor } from './queues/publish.processor';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';
import { ResilientHttpService } from './common/resilient-http.service';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'publish' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_post',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [PostEntity, SeriesEntity, PostMetrics],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([PostEntity, SeriesEntity, PostMetrics]),
  ],
  controllers: [PostController, SeriesController, MetricsController, HealthController],
  providers: [
    PostService, SeriesService, MetricsService, PublishProcessor,
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
