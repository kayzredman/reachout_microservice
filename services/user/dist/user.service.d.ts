import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UserService {
    private userRepository;
    constructor(userRepository: Repository<User>);
    getOrCreateByClerk(clerkId: string, clerkPayload: any): Promise<User>;
    updateByClerk(clerkId: string, updates: Partial<User>): Promise<User | null>;
}
