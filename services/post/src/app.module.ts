import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { PostController } from './post.controller';
import { PostService } from './post.service';
import { PostEntity } from './post.entity';
import { SeriesController } from './series.controller';
import { SeriesService } from './series.service';
import { SeriesEntity } from './series.entity';
import { PostMetrics } from './post-metrics.entity';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'faithreach_post',
      entities: [PostEntity, SeriesEntity, PostMetrics],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([PostEntity, SeriesEntity, PostMetrics]),
  ],
  controllers: [PostController, SeriesController, MetricsController],
  providers: [PostService, SeriesService, MetricsService],
})
export class AppModule {}
