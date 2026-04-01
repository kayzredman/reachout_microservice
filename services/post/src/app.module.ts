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
      entities: [PostEntity, SeriesEntity, PostMetrics],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([PostEntity, SeriesEntity, PostMetrics]),
  ],
  controllers: [PostController, SeriesController, MetricsController],
  providers: [PostService, SeriesService, MetricsService, PublishProcessor],
})
export class AppModule {}
