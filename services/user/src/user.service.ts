import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getOrCreateByClerk(clerkId: string, clerkPayload: any): Promise<User> {
    let user = await this.userRepository.findOne({ where: { id: clerkId } });
    if (!user) {
      user = this.userRepository.create({
        id: clerkId,
        email: clerkPayload.email ?? '',
        name: clerkPayload.name ?? clerkPayload.email ?? 'User',
        imageUrl: clerkPayload.image_url,
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
}
