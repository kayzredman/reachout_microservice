import { Module, OnModuleInit } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';
import { PlatformConnection } from './platform-connection.entity.js';
import { BroadcastLog } from './broadcast-log.entity.js';
import { BroadcastRecipient } from './broadcast-recipient.entity.js';
import { WhatsAppSessionService } from './whatsapp-session.service.js';
import { BroadcastService } from './broadcast.service.js';
import { BroadcastProcessor } from './queues/broadcast.processor.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379', 10),
      },
    }),
    BullModule.registerQueue({ name: 'broadcast' }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'faithreach_platform',
      entities: [PlatformConnection, BroadcastLog, BroadcastRecipient],
      synchronize: false,
      migrationsRun: true,
      migrations: [__dirname + '/migrations/*{.ts,.js}'],
    }),
    TypeOrmModule.forFeature([PlatformConnection, BroadcastLog, BroadcastRecipient]),
  ],
  controllers: [PlatformController],
  providers: [PlatformService, WhatsAppSessionService, BroadcastService, BroadcastProcessor],
})
export class AppModule implements OnModuleInit {
  constructor(private sessionService: WhatsAppSessionService) {}

  async onModuleInit() {
    // Restore any persisted WhatsApp sessions on startup
    await this.sessionService.restoreSessions();
  }
}
