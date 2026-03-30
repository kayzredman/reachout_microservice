import { Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

interface Scripture {
  ref: string;
  text: string;
}

interface PostPattern {
  format: string;
  templates: string[];
}

export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  suggestedDuration: number;
  suggestedPostsPerWeek: number;
  suggestedPlatforms: string[];
  themes: string[];
  postPatterns: PostPattern[];
  reflections: string[];
}

export interface GenerateOptions {
  templateId: string;
  topic?: string;
  platforms?: string[];
  postsPerWeek?: number;
  duration?: number;
  startDate?: string;
  churchName?: string;
}

export interface GeneratedPost {
  content: string;
  platforms: string[];
  suggestedDate: string;
  seriesNumber: number;
}

export interface GeneratedPlan {
  series: {
    title: string;
    theme: string;
    description: string;
    color: string;
    startDate: string;
    endDate: string;
    platforms: string[];
    totalPosts: number;
  };
  posts: GeneratedPost[];
}

@Injectable()
export class TemplateService {
  private readonly templates: Template[];
  private readonly scriptures: Record<string, Scripture[]>;

  constructor() {
    const dataDir = join(__dirname, '..', 'data');
    this.templates = JSON.parse(
      readFileSync(join(dataDir, 'templates.json'), 'utf-8'),
    );
    this.scriptures = JSON.parse(
      readFileSync(join(dataDir, 'scriptures.json'), 'utf-8'),
    );
  }

  /** Return lightweight template list (no patterns/reflections) */
  getTemplates() {
    return this.templates.map(
      ({
        id,
        name,
        description,
        icon,
        color,
        suggestedDuration,
        suggestedPostsPerWeek,
        suggestedPlatforms,
        themes,
      }) => ({
        id,
        name,
        description,
        icon,
        color,
        suggestedDuration,
        suggestedPostsPerWeek,
        suggestedPlatforms,
        themes,
      }),
    );
  }

  /** Get a single template with full details */
  getTemplate(id: string): Template {
    const template = this.templates.find((t) => t.id === id);
    if (!template) throw new NotFoundException(`Template "${id}" not found`);
    return template;
  }

  /** Generate a content plan from a template + options */
  generatePlan(options: GenerateOptions): GeneratedPlan {
    const template = this.getTemplate(options.templateId);

    const postsPerWeek =
      options.postsPerWeek ?? template.suggestedPostsPerWeek;
    const duration = options.duration ?? template.suggestedDuration;
    const platforms = options.platforms ?? template.suggestedPlatforms;
    const startDate = new Date(
      options.startDate || new Date().toISOString().split('T')[0],
    );
    const churchName = options.churchName ?? 'our church';
    const topic = options.topic ?? template.name;

    const totalPosts = Math.ceil(postsPerWeek * (duration / 7));

    // Collect scriptures matching template themes
    const pool: { theme: string; scripture: Scripture }[] = [];
    for (const theme of template.themes) {
      for (const s of this.scriptures[theme] || []) {
        pool.push({ theme, scripture: s });
      }
    }

    // Schedule dates
    const dates = this.scheduleDates(startDate, totalPosts, postsPerWeek);
    const endDate = dates.length > 0 ? dates[dates.length - 1] : startDate;

    // Flatten pattern templates for cycling
    const patternPool = template.postPatterns.flatMap((p) => p.templates);

    const posts: GeneratedPost[] = [];
    for (let i = 0; i < totalPosts; i++) {
      const entry = pool[i % pool.length];
      const reflection =
        template.reflections[i % template.reflections.length];
      const pattern = patternPool[i % patternPool.length];

      const daysUntil = Math.max(
        0,
        Math.ceil(
          (endDate.getTime() - dates[i].getTime()) / (1000 * 60 * 60 * 24),
        ),
      );

      const content = pattern
        .replace(/{n}/g, String(i + 1))
        .replace(/{seriesTitle}/g, topic)
        .replace(/{scriptureText}/g, entry.scripture.text)
        .replace(/{scriptureRef}/g, entry.scripture.ref)
        .replace(/{reflection}/g, reflection)
        .replace(
          /{themeTitle}/g,
          entry.theme.charAt(0).toUpperCase() + entry.theme.slice(1),
        )
        .replace(
          /{themeDescription}/g,
          `what it means to live in ${entry.theme}`,
        )
        .replace(/{hashtag}/g, topic.replace(/[^a-zA-Z0-9]/g, ''))
        .replace(/{daysUntil}/g, String(daysUntil))
        .replace(/{churchName}/g, churchName);

      posts.push({
        content,
        platforms,
        suggestedDate: dates[i].toISOString().split('T')[0],
        seriesNumber: i + 1,
      });
    }

    return {
      series: {
        title: topic,
        theme: template.themes[0],
        description: template.description,
        color: template.color,
        startDate: this.fmt(startDate),
        endDate: this.fmt(endDate),
        platforms,
        totalPosts,
      },
      posts,
    };
  }

  // ─── Private helpers ──────────────────────────────────────

  /** Walk forward day-by-day from startDate, picking preferred days */
  private scheduleDates(
    startDate: Date,
    totalPosts: number,
    postsPerWeek: number,
  ): Date[] {
    const preferred = this.preferredDays(postsPerWeek);
    const dates: Date[] = [];
    const current = new Date(startDate);

    while (dates.length < totalPosts) {
      if (preferred.includes(current.getDay())) {
        dates.push(new Date(current));
      }
      current.setDate(current.getDate() + 1);
    }
    return dates;
  }

  /** Map postsPerWeek → preferred day-of-week indices (0=Sun…6=Sat) */
  private preferredDays(ppw: number): number[] {
    switch (ppw) {
      case 7:
        return [0, 1, 2, 3, 4, 5, 6];
      case 6:
        return [1, 2, 3, 4, 5, 6];
      case 5:
        return [1, 2, 3, 4, 5];
      case 4:
        return [1, 3, 5, 0];
      case 3:
        return [2, 4, 0];
      case 2:
        return [3, 0];
      case 1:
        return [0];
      default:
        return [2, 4, 0];
    }
  }

  private fmt(d: Date): string {
    return d.toISOString().split('T')[0];
  }
}
