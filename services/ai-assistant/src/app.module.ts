import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AiModule } from './ai/ai.module';
import { HealthController } from './common/health.controller';
import { GracefulShutdownService } from './common/graceful-shutdown.service';
import { ResilientHttpService } from './common/resilient-http.service';

@Module({
  imports: [ConfigModule.forRoot(), AiModule],
  controllers: [AppController, HealthController],
  providers: [AppService, GracefulShutdownService, ResilientHttpService],
  exports: [ResilientHttpService],
})
export class AppModule {}
