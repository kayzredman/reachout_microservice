import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotificationPrefs } from './notification-prefs.entity.js';

@Injectable()
export class NotificationService {
  constructor(
    @InjectRepository(NotificationPrefs)
    private prefsRepo: Repository<NotificationPrefs>,
  ) {}

  /** Get prefs for a user within an org, returning defaults if none saved */
  async getPrefs(organizationId: string, userId: string): Promise<NotificationPrefs> {
    const existing = await this.prefsRepo.findOne({ where: { organizationId, userId } });
    if (existing) return existing;

    // Return defaults (not yet persisted)
    const defaults = this.prefsRepo.create({
      organizationId,
      userId,
      scheduled: true,
      engagement: true,
      followers: true,
      tips: true,
      push: false,
      weeklyReport: true,
    });
    return defaults;
  }

  /** Upsert notification prefs */
  async updatePrefs(
    organizationId: string,
    userId: string,
    prefs: Partial<Pick<NotificationPrefs, 'scheduled' | 'engagement' | 'followers' | 'tips' | 'push' | 'weeklyReport'>>,
  ): Promise<NotificationPrefs> {
    let existing = await this.prefsRepo.findOne({ where: { organizationId, userId } });

    if (!existing) {
      existing = this.prefsRepo.create({ organizationId, userId });
    }

    Object.assign(existing, prefs);
    return this.prefsRepo.save(existing);
  }
}
