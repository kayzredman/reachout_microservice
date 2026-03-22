import { Injectable } from '@nestjs/common';
import { Post } from '../../../shared';
import { randomUUID } from 'crypto';

@Injectable()
export class PostService {
  private posts: Post[] = [];

  findAll(): Post[] {
    return this.posts;
  }

  findOne(id: string): Post | undefined {
    return this.posts.find((p) => p.id === id);
  }

  create(post: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Post {
    const now = new Date().toISOString();
    const newPost: Post = {
      ...post,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    this.posts.push(newPost);
    return newPost;
  }

  update(id: string, post: Partial<Post>): Post | undefined {
    const idx = this.posts.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;
    this.posts[idx] = {
      ...this.posts[idx],
      ...post,
      updatedAt: new Date().toISOString(),
    };
    return this.posts[idx];
  }

  remove(id: string): boolean {
    const idx = this.posts.findIndex((p) => p.id === id);
    if (idx === -1) return false;
    this.posts.splice(idx, 1);
    return true;
  }
}
