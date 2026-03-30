import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Headers,
} from '@nestjs/common';
import { TemplateService } from '../template/template.service';
import type { GenerateOptions, Template } from '../template/template.service';
import { PlannerService } from './planner.service';

@Controller('planner')
export class PlannerController {
  constructor(
    private readonly templateService: TemplateService,
    private readonly plannerService: PlannerService,
  ) {}

  /** GET /planner/templates — list available templates (lightweight) */
  @Get('templates')
  getTemplates() {
    return this.templateService.getTemplates();
  }

  /** GET /planner/templates/:id — full template detail */
  @Get('templates/:id')
  getTemplate(@Param('id') id: string): Template {
    return this.templateService.getTemplate(id);
  }

  /** POST /planner/:orgId/generate — generate a plan preview (template-based, free) */
  @Post(':orgId/generate')
  generate(
    @Body()
    body: {
      templateId: string;
      topic?: string;
      platforms?: string[];
      postsPerWeek?: number;
      duration?: number;
      startDate?: string;
      churchName?: string;
    },
  ) {
    return this.templateService.generatePlan(body);
  }

  /** POST /planner/:orgId/generate-ai — generate a plan with AI (premium) */
  @Post(':orgId/generate-ai')
  generateAi(
    @Param('orgId') orgId: string,
    @Body()
    body: {
      topic: string;
      posts: number;
      platforms: string[];
      tone?: string;
      themes?: string[];
      startDate?: string;
      churchName?: string;
    },
  ) {
    return this.plannerService.generateAiPlan(orgId, body);
  }

  /** GET /planner/:orgId/can-use-ai — check if org has AI access */
  @Get(':orgId/can-use-ai')
  canUseAi(@Param('orgId') orgId: string) {
    return this.plannerService.checkFeatureAccess(orgId, 'ai-content').then(
      (allowed) => ({ allowed }),
    );
  }

  /** POST /planner/:orgId/commit — commit a plan (create series + posts) */
  @Post(':orgId/commit')
  commit(
    @Param('orgId') orgId: string,
    @Headers('authorization') authToken: string,
    @Body() body: { series: any; posts: any[] },
  ) {
    return this.plannerService.commit(orgId, authToken, body as any);
  }
}
