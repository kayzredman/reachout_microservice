
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthController } from './auth.controller';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';
import { ClerkAuthGuard } from './clerk-auth.guard';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({ envFilePath: join(__dirname, '..', '.env') }),
  ],
  controllers: [AppController, AuthController, WebhookController],
  providers: [AppService, ClerkAuthGuard, WebhookService],
})
export class AppModule {}
