import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SubscriptionModule } from './subscription/subscription.module';
import { Subscription } from './subscription/subscription.entity';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';
import { ResilientHttpService } from './common/resilient-http.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_billing',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [Subscription],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    SubscriptionModule,
  ],
  controllers: [AppController, HealthController],
  providers: [AppService, GracefulShutdownService, ResilientHttpService],
  exports: [ResilientHttpService],
})
export class AppModule {}
