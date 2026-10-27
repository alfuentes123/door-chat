import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { SessionGuard } from './session.guard';

function contextWithUser(userId?: string): ExecutionContext {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ session: { userId } }),
    }),
  } as unknown as ExecutionContext;
}

describe('SessionGuard', () => {
  const guard = new SessionGuard();

  it('rejects requests without a user ID', () => {
    expect(() => guard.canActivate(contextWithUser()))
      .toThrow(UnauthorizedException);
  });

  it('allows requests with a user ID', () => {
    expect(guard.canActivate(contextWithUser('alice-id'))).toBe(true);
  });
});
