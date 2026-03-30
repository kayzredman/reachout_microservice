import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PlannerModule } from './planner/planner.module';

@Module({
  imports: [PlannerModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
