import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PostEntity } from './entities/post.entity';
import { PostMetrics } from './entities/post-metrics.entity';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '.env') }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'faithreach_post',
      entities: [PostEntity, PostMetrics],
      synchronize: false, // read-only: post service owns the schema
    }),
    TypeOrmModule.forFeature([PostEntity, PostMetrics]),
  ],
  controllers: [AppController, AnalyticsController],
  providers: [AppService, AnalyticsService],
})
export class AppModule {}
