import { ClerkAuthGuard } from './clerk-auth.guard';
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { verifyToken } from '@clerk/clerk-sdk-node';

jest.mock('@clerk/clerk-sdk-node', () => ({
  verifyToken: jest.fn(),
}));

const mockedVerifyToken = verifyToken as jest.MockedFunction<typeof verifyToken>;

function createMockContext(authHeader?: string): ExecutionContext {
  const request: Record<string, any> = {
    headers: authHeader ? { authorization: authHeader } : {},
  };
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  } as unknown as ExecutionContext;
}

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;

  beforeEach(() => {
    guard = new ClerkAuthGuard();
    jest.clearAllMocks();
    process.env.CLERK_SECRET_KEY = 'test_secret';
  });

  it('throws UnauthorizedException when no authorization header', async () => {
    const ctx = createMockContext();
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });

  it('verifies token and attaches user to request', async () => {
    const payload = { sub: 'user_123', email: 'test@test.com' };
    mockedVerifyToken.mockResolvedValue(payload as any);

    const ctx = createMockContext('Bearer valid_token');
    const result = await guard.canActivate(ctx);

    expect(result).toBe(true);
    expect(mockedVerifyToken).toHaveBeenCalledWith('valid_token', {
      secretKey: 'test_secret',
    });
    // Verify user was attached to request
    const request = ctx.switchToHttp().getRequest();
    expect(request.user).toEqual(payload);
  });

  it('throws UnauthorizedException for invalid token', async () => {
    mockedVerifyToken.mockRejectedValue(new Error('invalid'));

    const ctx = createMockContext('Bearer bad_token');
    await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
  });
});
