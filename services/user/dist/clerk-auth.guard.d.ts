import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class ClerkAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext): Promise<boolean>;
}
