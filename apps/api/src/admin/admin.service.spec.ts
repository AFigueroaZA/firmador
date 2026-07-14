import { AdminService } from './admin.service';

describe('AdminService', () => {
  it('returns signer users with their real account balance', async () => {
    const dataSource = {
      query: jest.fn((sql: string) => {
        if (sql.includes('select count(*)::int as total')) {
          return Promise.resolve([{ total: 2 }]);
        }

        return Promise.resolve([
          {
            id: 'user-1',
            full_name: 'Usuario Uno',
            email: 'uno@example.test',
            is_active: true,
            identity_status: 'READY',
            current_balance: 41,
            last_login_at: '2026-07-13T20:00:00.000Z',
            created_at: '2026-07-01T12:00:00.000Z',
          },
          {
            id: 'user-2',
            full_name: 'Usuario Dos',
            email: 'dos@example.test',
            is_active: true,
            identity_status: 'NOT_STARTED',
            current_balance: 1,
            last_login_at: null,
            created_at: '2026-07-02T12:00:00.000Z',
          },
        ]);
      }),
    };
    const service = new AdminService(dataSource as never, {} as never);

    const result = await service.listUsers({ page: '1' });

    expect(result.total).toBe(2);
    expect(result.items).toEqual([
      expect.objectContaining({ id: 'user-1', currentBalance: 41 }),
      expect.objectContaining({ id: 'user-2', currentBalance: 1 }),
    ]);
    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(dataSource.query.mock.calls[1]?.[0]).toContain(
      "where roles.code = 'SIGNER'",
    );
  });

  it('returns only aggregate dashboard data', async () => {
    const dataSource = {
      query: jest
        .fn()
        .mockResolvedValueOnce([
          {
            total: 6,
            active: 6,
            inactive: 0,
            ready: 2,
            pending: 4,
            failed: 0,
            total_credits: 46,
          },
        ])
        .mockResolvedValueOnce([
          {
            total: 23,
            signed: 7,
            in_progress: 10,
            failed: 5,
            expired: 1,
          },
        ]),
    };
    const service = new AdminService(dataSource as never, {} as never);

    const result = await service.getDashboard();

    expect(result).toEqual({
      users: { total: 6, active: 6, inactive: 0 },
      identities: { ready: 2, pending: 4, failed: 0 },
      totalAvailableCredits: 46,
      signing: {
        total: 23,
        signed: 7,
        inProgress: 10,
        failed: 5,
        expired: 1,
      },
    });
    expect(JSON.stringify(result)).not.toMatch(/file|document|path|hash/i);
  });
});
