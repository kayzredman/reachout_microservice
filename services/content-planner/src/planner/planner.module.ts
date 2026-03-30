import { Module } from '@nestjs/common';
import { TemplateModule } from '../template/template.module';
import { PlannerController } from './planner.controller';
import { PlannerService } from './planner.service';

@Module({
  imports: [TemplateModule],
  controllers: [PlannerController],
  providers: [PlannerService],
})
export class PlannerModule {}
