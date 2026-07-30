import { AuthController } from './auth.controller';

describe('AuthController', () => {
  it('returns the user already validated by the guard without another query', () => {
    const authService = {
      getSession: jest.fn(),
    };
    const controller = new AuthController(authService as never);
    const requestUser = {
      id: 'user-1',
      email: 'user@example.test',
      fullName: 'User Test',
      role: 'operator' as const,
    };

    expect(controller.me(requestUser)).toEqual({ user: requestUser });
    expect(authService.getSession).not.toHaveBeenCalled();
  });
});
