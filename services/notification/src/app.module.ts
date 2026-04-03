import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { NotificationPrefs } from './notification-prefs.entity';
import { Notification } from './notification.entity';
import { NotificationPrefsModule } from './notification-prefs.module';
import { NotifyProcessor } from './queues/notify.processor';
import { EmailService } from './email.service';
import { InAppNotificationService } from './in-app-notification.service';
import { InAppNotificationController } from './in-app-notification.controller';
import { NotificationGateway } from './notification.gateway';
import { SendNotificationController } from './send-notification.controller';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';
import { ResilientHttpService } from './common/resilient-http.service';
import Redis from 'ioredis';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'notify' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_notification',
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      entities: [NotificationPrefs, Notification],
      synchronize: false,
      migrationsRun: true,
      migrationsTableName: 'typeorm_migrations_notification',
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([Notification]),
    NotificationPrefsModule,
  ],
  controllers: [AppController, SendNotificationController, InAppNotificationController, HealthController],
  providers: [
    AppService, NotifyProcessor, EmailService,
    InAppNotificationService, NotificationGateway,
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
