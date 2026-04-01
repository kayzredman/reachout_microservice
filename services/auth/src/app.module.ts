
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { WebhookProcessor } from './queues/webhook.processor';
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
    BullModule.registerQueue({ name: 'webhook' }),
  ],
  controllers: [AppController, AuthController, WebhookController],
  providers: [AppService, ClerkAuthGuard, WebhookService, WebhookProcessor],
})
export class AppModule {}
