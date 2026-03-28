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
} from '@nestjs/common';
import { SeriesService } from './series.service';
import { ClerkAuthGuard } from './clerk-auth.guard';

@Controller('series')
export class SeriesController {
  constructor(private readonly seriesService: SeriesService) {}

  /** GET /series/:orgId — List all series for an org */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId')
  async findAll(@Param('orgId') orgId: string) {
    return this.seriesService.findAll(orgId);
  }

  /** GET /series/:orgId/:id — Get a single series with its posts */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/:id')
  async findOne(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.seriesService.findOne(orgId, id);
  }

  /** POST /series/:orgId — Create a new series */
  @UseGuards(ClerkAuthGuard)
  @HttpPost(':orgId')
  async create(
    @Param('orgId') orgId: string,
    @Req() req: any,
    @Body()
    body: {
      title: string;
      theme?: string;
      description?: string;
      status?: 'Active' | 'Upcoming' | 'Completed';
      color?: string;
      totalPosts?: number;
      startDate?: string;
      endDate?: string;
      platforms?: string[];
    },
  ) {
    const userId = req.auth?.userId || req.user?.id || 'unknown';
    return this.seriesService.create(orgId, userId, body);
  }

  /** PUT /series/:orgId/:id — Update a series */
  @UseGuards(ClerkAuthGuard)
  @Put(':orgId/:id')
  async update(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Body() body: any,
  ) {
    return this.seriesService.update(orgId, id, body);
  }

  /** DELETE /series/:orgId/:id — Delete a series */
  @UseGuards(ClerkAuthGuard)
  @Delete(':orgId/:id')
  async remove(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    await this.seriesService.remove(orgId, id);
    return { deleted: true };
  }

  /** GET /series/:orgId/:id/posts — Get posts in a series */
  @UseGuards(ClerkAuthGuard)
  @Get(':orgId/:id/posts')
  async getSeriesPosts(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
  ) {
    return this.seriesService.getSeriesPosts(orgId, id);
  }

  /** POST /series/:orgId/:id/posts/:postId — Add a post to a series */
  @UseGuards(ClerkAuthGuard)
  @HttpPost(':orgId/:id/posts/:postId')
  async addPostToSeries(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.seriesService.addPostToSeries(orgId, id, postId);
  }

  /** DELETE /series/:orgId/:id/posts/:postId — Remove a post from a series */
  @UseGuards(ClerkAuthGuard)
  @Delete(':orgId/:id/posts/:postId')
  async removePostFromSeries(
    @Param('orgId') orgId: string,
    @Param('id') id: string,
    @Param('postId') postId: string,
  ) {
    return this.seriesService.removePostFromSeries(orgId, id, postId);
  }
}
