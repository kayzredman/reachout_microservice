
import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, ClerkAuthGuard],
})
export class AppModule {}
