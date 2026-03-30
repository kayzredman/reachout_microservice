import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

const SYSTEM_PROMPT = `You are a social media content writer for churches and faith-based organizations.
You create engaging, uplifting posts that combine scripture with practical application.
Keep posts concise and suitable for social media. Use emojis sparingly but effectively.
Always include relevant scripture references when appropriate.
Match the requested tone and platform conventions.`;

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly client: OpenAI | null;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized');
    } else {
      this.client = null;
      this.logger.warn(
        'OPENAI_API_KEY not set — AI features will return error',
      );
    }
  }

  private ensureClient(): OpenAI {
    if (!this.client) {
      throw new Error(
        'AI service unavailable — OPENAI_API_KEY not configured',
      );
    }
    return this.client;
  }

  /**
   * Generate a full content plan using AI.
   * Returns an array of post content strings.
   */
  async generateContentPlan(opts: {
    topic: string;
    posts: number;
    platforms: string[];
    tone?: string;
    themes?: string[];
    churchName?: string;
  }): Promise<string[]> {
    const client = this.ensureClient();

    const prompt = `Create ${opts.posts} social media posts for a church content series titled "${opts.topic}".

Target platforms: ${opts.platforms.join(', ')}
Tone: ${opts.tone || 'warm, encouraging, faith-building'}
${opts.themes?.length ? `Themes to cover: ${opts.themes.join(', ')}` : ''}
${opts.churchName ? `Church name: ${opts.churchName}` : ''}

Requirements:
- Each post should include a relevant Bible verse with reference
- Include appropriate hashtags
- Vary the format (questions, quotes, challenges, stories, reflections)
- Make them shareable and engagement-friendly
- Keep each post under 280 characters for X/Twitter compatibility where applicable

Return ONLY a JSON array of strings, one per post. No other text.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.8,
      max_tokens: 4000,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '[]';

    try {
      // Strip markdown code fences if present
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      const posts: string[] = JSON.parse(cleaned);
      return posts;
    } catch {
      this.logger.error('Failed to parse AI response as JSON array');
      return [raw];
    }
  }

  /** Rewrite a single post in a different tone */
  async rewritePost(opts: {
    content: string;
    tone: string;
    platform?: string;
  }): Promise<string> {
    const client = this.ensureClient();

    const prompt = `Rewrite this social media post in a ${opts.tone} tone${opts.platform ? ` optimized for ${opts.platform}` : ''}:

"${opts.content}"

Return ONLY the rewritten post text. No explanations.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    return response.choices[0]?.message?.content?.trim() || opts.content;
  }

  /** Generate hashtags for a post */
  async generateHashtags(opts: {
    content: string;
    count?: number;
  }): Promise<string[]> {
    const client = this.ensureClient();
    const count = opts.count ?? 5;

    const prompt = `Generate ${count} relevant hashtags for this church/faith-based social media post:

"${opts.content}"

Return ONLY a JSON array of strings (hashtags including the # symbol). No other text.`;

    const response = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: prompt },
      ],
      temperature: 0.6,
      max_tokens: 200,
    });

    const raw = response.choices[0]?.message?.content?.trim() || '[]';
    try {
      const cleaned = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
      return JSON.parse(cleaned);
    } catch {
      return [];
    }
  }
}
