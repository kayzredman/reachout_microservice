import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  /** Internal lookup by Clerk user ID */
  async findById(clerkId: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id: clerkId } });
  }

  async getOrCreateByClerk(clerkId: string, clerkPayload: any): Promise<User> {
    let user = await this.userRepository.findOne({ where: { id: clerkId } });
    if (!user) {
      const email = clerkPayload.email || `${clerkId}@placeholder.local`;
      user = this.userRepository.create({
        id: clerkId,
        email,
        name: clerkPayload.name || clerkPayload.email || 'User',
        imageUrl: clerkPayload.image_url || undefined,
      });
      await this.userRepository.save(user);
    }
    return user;
  }

  async updateByClerk(clerkId: string, updates: Partial<User>): Promise<User | null> {
    const user = await this.userRepository.findOne({ where: { id: clerkId } });
    if (!user) return null;
    // Only allow updating safe fields
    const { name, bio, location, organization, role } = updates;
    await this.userRepository.update(clerkId, {
      ...(name !== undefined && { name }),
      ...(bio !== undefined && { bio }),
      ...(location !== undefined && { location }),
      ...(organization !== undefined && { organization }),
      ...(role !== undefined && { role }),
    });
    return this.userRepository.findOne({ where: { id: clerkId } });
  }

  /**
   * Handle webhook sync from the auth service.
   * Creates, updates, or deletes users based on Clerk webhook events.
   */
  async webhookSync(payload: {
    clerkId: string;
    email?: string;
    name?: string;
    imageUrl?: string;
    action: 'create' | 'update' | 'delete';
  }): Promise<{ ok: boolean }> {
    const { clerkId, email, name, imageUrl, action } = payload;

    if (action === 'delete') {
      await this.userRepository.delete(clerkId);
      this.logger.log(`User deleted via webhook: ${clerkId}`);
      return { ok: true };
    }

    let user = await this.userRepository.findOne({ where: { id: clerkId } });

    if (action === 'create' && !user) {
      user = this.userRepository.create({
        id: clerkId,
        email: email || `${clerkId}@placeholder.local`,
        name: name || 'User',
        imageUrl: imageUrl || undefined,
      });
      await this.userRepository.save(user);
      this.logger.log(`User created via webhook: ${clerkId}`);
    } else if (user) {
      // Update existing user
      if (email) user.email = email;
      if (name) user.name = name;
      if (imageUrl !== undefined) user.imageUrl = imageUrl || undefined;
      await this.userRepository.save(user);
      this.logger.log(`User updated via webhook: ${clerkId}`);
    }

    return { ok: true };
  }
}
