import {
  Controller,
  Get,
  Post as HttpPost,
  Body,
  Param,
  Put,
  Delete,
  Req,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { PostService } from './post.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  /** GET /posts/:orgId — List all posts for an organization */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId')
  async findAll(@Param('orgId') orgId: string) {
    return this.postService.findAll(orgId);
  }

  /** GET /posts/:orgId/:id — Get a single post */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/:id')
  async findOne(@Param('orgId') orgId: string, @Param('id') id: string) {
    return this.postService.findOne(orgId, id);
  }

  /** POST /posts/:orgId — Create a new post */
  @UseGuards(ClerkAuthGuard)
  @HttpPost(':orgId')
  async create(
    @Param('orgId') orgId: string,
    @Body() body: { content: string; imageUrl?: string; platforms: string[] },
    @Req() req: any,
  ) {
    const userId = req.user?.sub;
    if (!userId) throw new BadRequestException('Missing user');

    return this.postService.create({
      organizationId: orgId,
      createdBy: userId,
      content: body.content,
      imageUrl: body.imageUrl,
      platforms: body.platforms,
    });
  }

  /** PUT /posts/:orgId/:id — Update a draft post */
  @UseGuards(ClerkAuthGuard)
  @Put(':orgId/:id')
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: Partial<{ content: string; imageUrl: string; platforms: string[] }>,
  ) {
    return this.postService.update(orgId, id, body);
  }

  /** DELETE /posts/:orgId/:id — Delete a post */
  @UseGuards(ClerkAuthGuard)
  @Delete(':orgId/:id')
  async remove(@Param('orgId') orgId: string, @Param('id') id: string) {
    await this.postService.remove(orgId, id);
    return { deleted: true };
  }

  /** POST /posts/:orgId/:id/publish — Publish a post to platforms */
  @UseGuards(ClerkAuthGuard)
  @HttpPost(':orgId/:id/publish')
  async publish(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Req() req: any,
  ) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.postService.publish(orgId, id, token);
  }

  /** POST /posts/:orgId/:id/schedule — Schedule a post for later */
  @UseGuards(ClerkAuthGuard)
  @HttpPost(':orgId/:id/schedule')
  async schedule(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: { scheduledAt: string },
    @Req() req: any,
  ) {
    const authHeader = req.headers['authorization'];
    const token = authHeader?.replace('Bearer ', '') || '';
    return this.postService.schedule(orgId, id, body.scheduledAt, token);
  }

  /** DELETE /posts/:orgId/:id/schedule — Cancel a scheduled post (revert to draft) */
  @UseGuards(ClerkAuthGuard)
  @Delete(':orgId/:id/schedule')
  async cancelSchedule(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.postService.cancelSchedule(orgId, id);
  }

  /** GET /posts/:orgId/scheduled — List scheduled posts */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/scheduled')
  async findScheduled(@Param('orgId') orgId: string) {
    return this.postService.findScheduled(orgId);
  }
}
