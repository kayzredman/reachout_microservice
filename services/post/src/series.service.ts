import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SeriesEntity } from './series.entity';
import { PostEntity } from './post.entity';

@Injectable()
export class SeriesService {
  constructor(
    @InjectRepository(SeriesEntity)
    private readonly seriesRepo: Repository<SeriesEntity>,
    @InjectRepository(PostEntity)
    private readonly postRepo: Repository<PostEntity>,
  ) {}

  async findAll(organizationId: string): Promise<any[]> {
    const allSeries = await this.seriesRepo.find({
      where: { organizationId },
      order: { createdAt: 'DESC' },
    });

    // Enrich each series with live post counts
    const enriched = await Promise.all(
      allSeries.map(async (s) => {
        const posts = await this.postRepo.find({
          where: { organizationId, seriesId: s.id },
        });
        const publishedCount = posts.filter((p) => p.status === 'published').length;
        const totalCreated = posts.length;
        const progress = s.totalPosts > 0
          ? Math.round((publishedCount / s.totalPosts) * 100)
          : 0;

        return {
          ...s,
          publishedCount,
          totalCreated,
          progress,
        };
      }),
    );

    return enriched;
  }

  async findOne(organizationId: string, id: string) {
    const series = await this.seriesRepo.findOne({
      where: { organizationId, id },
    });
    if (!series) throw new NotFoundException('Series not found');

    const posts = await this.postRepo.find({
      where: { organizationId, seriesId: id },
      order: { seriesNumber: 'ASC' },
    });
    const publishedCount = posts.filter((p) => p.status === 'published').length;
    const progress = series.totalPosts > 0
      ? Math.round((publishedCount / series.totalPosts) * 100)
      : 0;

    return { ...series, posts, publishedCount, progress };
  }

  async create(
    organizationId: string,
    createdBy: string,
    data: {
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
  ): Promise<SeriesEntity> {
    const series = this.seriesRepo.create({
      organizationId,
      createdBy,
      ...data,
    });
    return this.seriesRepo.save(series);
  }

  async update(
    organizationId: string,
    id: string,
    data: Partial<{
      title: string;
      theme: string;
      description: string;
      status: 'Active' | 'Upcoming' | 'Completed';
      color: string;
      totalPosts: number;
      startDate: string;
      endDate: string;
      platforms: string[];
    }>,
  ): Promise<SeriesEntity> {
    const series = await this.seriesRepo.findOne({
      where: { organizationId, id },
    });
    if (!series) throw new NotFoundException('Series not found');

    Object.assign(series, data);
    return this.seriesRepo.save(series);
  }

  async remove(organizationId: string, id: string): Promise<void> {
    const series = await this.seriesRepo.findOne({
      where: { organizationId, id },
    });
    if (!series) throw new NotFoundException('Series not found');

    // Unlink posts from this series
    await this.postRepo.update(
      { organizationId, seriesId: id },
      { seriesId: undefined, seriesNumber: undefined },
    );

    await this.seriesRepo.remove(series);
  }

  /** Get posts that belong to a series */
  async getSeriesPosts(organizationId: string, seriesId: string) {
    const series = await this.seriesRepo.findOne({
      where: { organizationId, id: seriesId },
    });
    if (!series) throw new NotFoundException('Series not found');

    return this.postRepo.find({
      where: { organizationId, seriesId },
      order: { seriesNumber: 'ASC' },
    });
  }

  /** Add an existing post to a series */
  async addPostToSeries(
    organizationId: string,
    seriesId: string,
    postId: string,
  ) {
    const series = await this.seriesRepo.findOne({
      where: { organizationId, id: seriesId },
    });
    if (!series) throw new NotFoundException('Series not found');

    const post = await this.postRepo.findOne({
      where: { organizationId, id: postId },
    });
    if (!post) throw new NotFoundException('Post not found');

    // Get the next series number
    const maxResult = await this.postRepo
      .createQueryBuilder('post')
      .select('MAX(post.seriesNumber)', 'max')
      .where('post.seriesId = :seriesId', { seriesId })
      .getRawOne();
    const nextNumber = (maxResult?.max || 0) + 1;

    post.seriesId = seriesId;
    post.seriesNumber = nextNumber;
    return this.postRepo.save(post);
  }

  /** Remove a post from a series */
  async removePostFromSeries(
    organizationId: string,
    seriesId: string,
    postId: string,
  ) {
    const post = await this.postRepo.findOne({
      where: { organizationId, id: postId, seriesId },
    });
    if (!post) throw new NotFoundException('Post not found in this series');

    post.seriesId = undefined;
    post.seriesNumber = undefined;
    return this.postRepo.save(post);
  }
}
