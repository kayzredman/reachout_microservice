import { Controller, Get, Post as HttpPost, Body, Param, Put, Delete, NotFoundException } from '@nestjs/common';
import { PostService } from './post.service';
import { Post as PostType } from '../../../shared';

@Controller('posts')
export class PostController {
  constructor(private readonly postService: PostService) {}

  @Get()
  findAll(): PostType[] {
    return this.postService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): PostType {
    const post = this.postService.findOne(id);
    if (!post) {
      throw new NotFoundException('Post not found');
    }
    return post;
  }

  @HttpPost()
  create(@Body() post: Omit<PostType, 'id' | 'createdAt' | 'updatedAt'>): PostType {
    return this.postService.create(post);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() post: Partial<PostType>): PostType | undefined {
    return this.postService.update(id, post);
  }

  @Delete(':id')
  remove(@Param('id') id: string): boolean {
    return this.postService.remove(id);
  }
}
