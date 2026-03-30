import { Controller, Post, Body, HttpCode, HttpException, HttpStatus } from '@nestjs/common';
import { AiService } from './ai.service';

@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  /** POST /ai/generate-content — generate AI content plan */
  @Post('generate-content')
  @HttpCode(200)
  async generateContent(
    @Body()
    body: {
      topic: string;
      posts: number;
      platforms: string[];
      tone?: string;
      themes?: string[];
      churchName?: string;
    },
  ) {
    try {
      const posts = await this.aiService.generateContentPlan(body);
      return { posts };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI generation failed';
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** POST /ai/rewrite — rewrite a post in a different tone */
  @Post('rewrite')
  @HttpCode(200)
  async rewrite(
    @Body()
    body: {
      content: string;
      tone: string;
      platform?: string;
    },
  ) {
    try {
      const rewritten = await this.aiService.rewritePost(body);
      return { content: rewritten };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI rewrite failed';
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }

  /** POST /ai/hashtags — generate hashtags for a post */
  @Post('hashtags')
  @HttpCode(200)
  async hashtags(
    @Body()
    body: {
      content: string;
      count?: number;
    },
  ) {
    try {
      const tags = await this.aiService.generateHashtags(body);
      return { hashtags: tags };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'AI hashtag generation failed';
      throw new HttpException(message, HttpStatus.SERVICE_UNAVAILABLE);
    }
  }
}
