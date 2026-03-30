import { Controller, Get, Delete, Param, Req, Headers } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';

@Controller('scheduler')
export class SchedulerController {
  constructor(private readonly schedulerService: SchedulerService) {}

  /** GET /scheduler/:orgId — list scheduled posts */
  @Get(':orgId')
  async getScheduled(
    @Param('orgId') orgId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '') || '';
    return this.schedulerService.getScheduledPosts(orgId, token);
  }

  /** GET /scheduler/:orgId/summary — get schedule summary */
  @Get(':orgId/summary')
  async getSummary(
    @Param('orgId') orgId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '') || '';
    return this.schedulerService.getScheduleSummary(orgId, token);
  }

  /** DELETE /scheduler/:orgId/:postId — cancel a scheduled post */
  @Delete(':orgId/:postId')
  async cancel(
    @Param('orgId') orgId: string,
    @Param('postId') postId: string,
    @Headers('authorization') auth: string,
  ) {
    const token = auth?.replace('Bearer ', '') || '';
    return this.schedulerService.cancelScheduledPost(orgId, postId, token);
  }
}
