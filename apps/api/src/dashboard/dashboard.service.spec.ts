import { DashboardService } from './dashboard.service';

describe('DashboardService', () => {
  it('returns the operator dashboard from independent queries', async () => {
    const signing = { total: 8, signed: 2, pending: 3 };
    const identity = {
      status: 'READY' as const,
      canSign: true,
      isValidated: true,
      isProfileComplete: true,
      missingFields: [],
      profile: null,
    };
    const service = new DashboardService(
      {} as never,
      {
        getDashboardCounts: jest.fn().mockResolvedValue(signing),
      } as never,
      {
        getStatus: jest.fn().mockResolvedValue(identity),
      } as never,
      {
        getCurrentBalance: jest.fn().mockResolvedValue(5),
      } as never,
    );
    const requestUser = {
      id: 'operator-1',
      email: 'operator@example.test',
      fullName: 'Operator Test',
      role: 'operator' as const,
    };

    await expect(service.getDashboard(requestUser, {})).resolves.toEqual({
      role: 'operator',
      signing,
      identity,
      currentBalance: 5,
    });
  });

  it('returns the admin dashboard and propagates every user filter', async () => {
    const filters = {
      page: '2',
      q: 'ana',
      isActive: 'true',
      identityStatus: 'READY',
    };
    const summary = {
      users: { total: 1, active: 1, inactive: 0 },
      identities: { ready: 1, pending: 0, failed: 0 },
      totalAvailableCredits: 4,
      signing: {
        total: 3,
        signed: 2,
        inProgress: 1,
        failed: 0,
        expired: 0,
      },
    };
    const users = {
      items: [],
      page: 2,
      pageSize: 25,
      total: 0,
      totalPages: 1,
    };
    const adminService = {
      getDashboard: jest.fn().mockResolvedValue(summary),
      listUsers: jest.fn().mockResolvedValue(users),
    };
    const service = new DashboardService(
      adminService as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.getDashboard(
        {
          id: 'admin-1',
          email: 'admin@example.test',
          fullName: 'Admin Test',
          role: 'admin',
        },
        filters,
      ),
    ).resolves.toEqual({ role: 'admin', summary, users });
    expect(adminService.listUsers).toHaveBeenCalledWith(filters);
  });
});
