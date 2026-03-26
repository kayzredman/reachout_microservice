"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const clerk_auth_guard_1 = require("./clerk-auth.guard");
const common_1 = require("@nestjs/common");
const clerk_sdk_node_1 = require("@clerk/clerk-sdk-node");
jest.mock('@clerk/clerk-sdk-node', () => ({
    verifyToken: jest.fn(),
}));
const mockedVerifyToken = clerk_sdk_node_1.verifyToken;
function createMockContext(authHeader) {
    const request = {
        headers: authHeader ? { authorization: authHeader } : {},
    };
    return {
        switchToHttp: () => ({
            getRequest: () => request,
        }),
    };
}
describe('ClerkAuthGuard', () => {
    let guard;
    beforeEach(() => {
        guard = new clerk_auth_guard_1.ClerkAuthGuard();
        jest.clearAllMocks();
        process.env.CLERK_SECRET_KEY = 'test_secret';
    });
    it('throws UnauthorizedException when no authorization header', async () => {
        const ctx = createMockContext();
        await expect(guard.canActivate(ctx)).rejects.toThrow(common_1.UnauthorizedException);
    });
    it('verifies token and attaches user to request', async () => {
        const payload = { sub: 'user_123', email: 'test@test.com' };
        mockedVerifyToken.mockResolvedValue(payload);
        const ctx = createMockContext('Bearer valid_token');
        const result = await guard.canActivate(ctx);
        expect(result).toBe(true);
        expect(mockedVerifyToken).toHaveBeenCalledWith('valid_token', {
            secretKey: 'test_secret',
        });
        const request = ctx.switchToHttp().getRequest();
        expect(request.user).toEqual(payload);
    });
    it('throws UnauthorizedException for invalid token', async () => {
        mockedVerifyToken.mockRejectedValue(new Error('invalid'));
        const ctx = createMockContext('Bearer bad_token');
        await expect(guard.canActivate(ctx)).rejects.toThrow(common_1.UnauthorizedException);
    });
});
//# sourceMappingURL=clerk-auth.guard.spec.js.map