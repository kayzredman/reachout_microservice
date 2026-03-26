import { UserService } from './user.service';
import { User } from './user.entity';
export declare class UserController {
    private readonly userService;
    constructor(userService: UserService);
    getMe(req: any): Promise<User>;
    updateMe(req: any, updates: Partial<User>): Promise<User>;
}
