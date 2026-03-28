import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PlatformController } from './platform.controller.js';
import { PlatformService } from './platform.service.js';
import { PlatformConnection } from './platform-connection.entity.js';
import { WhatsAppWebhookController } from './whatsapp-webhook.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'localhost',
      port: 5432,
      username: 'postgres',
      password: 'postgres',
      database: 'faithreach_platform',
      entities: [PlatformConnection],
      synchronize: true,
    }),
    TypeOrmModule.forFeature([PlatformConnection]),
  ],
  controllers: [PlatformController, WhatsAppWebhookController],
  providers: [PlatformService],
})
export class AppModule {}
