import { Repository } from 'typeorm';
import { User } from './user.entity';
export declare class UserService {
    private userRepository;
    private readonly logger;
    constructor(userRepository: Repository<User>);
    getOrCreateByClerk(clerkId: string, clerkPayload: any): Promise<User>;
    updateByClerk(clerkId: string, updates: Partial<User>): Promise<User | null>;
    webhookSync(payload: {
        clerkId: string;
        email?: string;
        name?: string;
        imageUrl?: string;
        action: 'create' | 'update' | 'delete';
    }): Promise<{
        ok: boolean;
    }>;
}
