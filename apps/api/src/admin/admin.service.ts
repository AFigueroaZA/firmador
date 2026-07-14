import type {
  AdminDashboardResponse,
  AdminUsersResponse,
  IdentityStatus,
} from '@firmador/shared';
import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CreditsService } from '../credits/credits.service';

const IDENTITY_STATUSES: IdentityStatus[] = [
  'NOT_STARTED',
  'VALIDATED',
  'READY',
  'FAILED',
];

interface AdminUserStatsRow {
  total: number;
  active: number;
  inactive: number;
  ready: number;
  pending: number;
  failed: number;
  total_credits: number;
}

interface AdminSigningStatsRow {
  total: number;
  signed: number;
  in_progress: number;
  failed: number;
  expired: number;
}

interface AdminUserRow {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  identity_status: IdentityStatus;
  current_balance: number;
  last_login_at: Date | string | null;
  created_at: Date | string;
}

const isIdentityStatus = (value: string | undefined): value is IdentityStatus =>
  typeof value === 'string' &&
  IDENTITY_STATUSES.some((status) => status === value);

@Injectable()
export class AdminService {
  private readonly pageSize = 25;

  constructor(
    private readonly dataSource: DataSource,
    private readonly creditsService: CreditsService,
  ) {}

  async getDashboard(): Promise<AdminDashboardResponse> {
    const [userRows, signingRows] = await Promise.all([
      this.dataSource.query<AdminUserStatsRow[]>(`
        select
          count(*)::int as total,
          count(*) filter (where users.is_active)::int as active,
          count(*) filter (where not users.is_active)::int as inactive,
          count(*) filter (where identities.status = 'READY')::int as ready,
          count(*) filter (
            where identities.status is null
               or identities.status not in ('READY', 'FAILED')
          )::int as pending,
          count(*) filter (where identities.status = 'FAILED')::int as failed,
          coalesce(sum(accounts.current_balance), 0)::int as total_credits
        from public.users users
        join public.roles roles on roles.id = users.role_id and roles.code = 'SIGNER'
        left join public.user_identities identities on identities.user_id = users.id
        left join public.signature_accounts accounts on accounts.user_id = users.id
      `),
      this.dataSource.query<AdminSigningStatsRow[]>(`
        select
          count(*)::int as total,
          count(*) filter (
            where metadata ->> 'currentStep' = 'SIGNED'
          )::int as signed,
          count(*) filter (
            where metadata ->> 'currentStep' in (
              'UPLOADED', 'CONFIGURED', 'EXTERNAL_AUTH_PENDING',
              'EXTERNAL_AUTH_DONE', 'CHALLENGE_PENDING', 'RA_PENDING',
              'CERT_PENDING', 'SIGNING'
            )
          )::int as in_progress,
          count(*) filter (
            where metadata ->> 'currentStep' = 'FAILED'
          )::int as failed,
          count(*) filter (
            where metadata ->> 'currentStep' = 'EXPIRED'
          )::int as expired
        from public.signing_processes
      `),
    ]);

    const users = userRows[0];
    const signing = signingRows[0];
    return {
      users: {
        total: users?.total ?? 0,
        active: users?.active ?? 0,
        inactive: users?.inactive ?? 0,
      },
      identities: {
        ready: users?.ready ?? 0,
        pending: users?.pending ?? 0,
        failed: users?.failed ?? 0,
      },
      totalAvailableCredits: users?.total_credits ?? 0,
      signing: {
        total: signing?.total ?? 0,
        signed: signing?.signed ?? 0,
        inProgress: signing?.in_progress ?? 0,
        failed: signing?.failed ?? 0,
        expired: signing?.expired ?? 0,
      },
    };
  }

  async listUsers(input: {
    page?: string;
    q?: string;
    isActive?: string;
    identityStatus?: string;
  }): Promise<AdminUsersResponse> {
    const page = Math.max(1, Number.parseInt(input.page ?? '1', 10) || 1);
    const q = input.q?.trim() ?? '';
    const activeFilter =
      input.isActive === 'true'
        ? true
        : input.isActive === 'false'
          ? false
          : null;
    const identityFilter = isIdentityStatus(input.identityStatus)
      ? input.identityStatus
      : null;
    const params: unknown[] = [];
    const conditions = [`roles.code = 'SIGNER'`];

    if (q) {
      params.push(`%${q}%`);
      conditions.push(`(
        concat_ws(' ', users.first_name, users.last_name) ilike $${params.length}
        or users.email ilike $${params.length}
      )`);
    }
    if (activeFilter !== null) {
      params.push(activeFilter);
      conditions.push(`users.is_active = $${params.length}`);
    }
    if (identityFilter) {
      params.push(identityFilter);
      conditions.push(
        `coalesce(identities.status, 'NOT_STARTED') = $${params.length}`,
      );
    }

    const where = conditions.join(' and ');
    const countRows = await this.dataSource.query<Array<{ total: number }>>(
      `select count(*)::int as total
       from public.users users
       join public.roles roles on roles.id = users.role_id
       left join public.user_identities identities on identities.user_id = users.id
       where ${where}`,
      params,
    );
    const total = countRows[0]?.total ?? 0;

    const listParams = [...params, this.pageSize, (page - 1) * this.pageSize];
    const rows = await this.dataSource.query<AdminUserRow[]>(
      `select
         users.id,
         concat_ws(' ', users.first_name, users.last_name) as full_name,
         users.email,
         users.is_active,
         coalesce(identities.status, 'NOT_STARTED') as identity_status,
         coalesce(accounts.current_balance, 0)::int as current_balance,
         users.last_login_at,
         users.created_at
       from public.users users
       join public.roles roles on roles.id = users.role_id
       left join public.user_identities identities on identities.user_id = users.id
       left join public.signature_accounts accounts on accounts.user_id = users.id
       where ${where}
       order by users.created_at desc
       limit $${params.length + 1} offset $${params.length + 2}`,
      listParams,
    );

    return {
      items: rows.map((row) => ({
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        isActive: row.is_active,
        identityStatus: row.identity_status,
        currentBalance: row.current_balance,
        lastLoginAt: row.last_login_at
          ? new Date(row.last_login_at).toISOString()
          : null,
        createdAt: new Date(row.created_at).toISOString(),
      })),
      page,
      pageSize: this.pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / this.pageSize)),
    };
  }

  async setUserStatus(userId: string, isActive: boolean) {
    const rows = await this.dataSource.query<
      Array<{ id: string; is_active: boolean }>
    >(
      `update public.users users
       set is_active = $2, updated_at = now()
       where users.id = $1
         and users.role_id = (
           select id from public.roles where code = 'SIGNER'
         )
       returning users.id, users.is_active`,
      [userId, isActive],
    );
    if (!rows[0]) {
      throw new NotFoundException('Signer user was not found.');
    }
    return { id: rows[0].id, isActive: rows[0].is_active };
  }

  async adjustUserBalance(input: {
    userId: string;
    actorUserId: string;
    operationId: string;
    quantity: number;
    reason: string;
  }) {
    const rows = await this.dataSource.query<Array<{ id: string }>>(
      `select users.id
       from public.users users
       join public.roles roles on roles.id = users.role_id
       where users.id = $1 and roles.code = 'SIGNER'`,
      [input.userId],
    );
    if (!rows[0]) {
      throw new NotFoundException('Signer user was not found.');
    }

    const currentBalance = await this.creditsService.adjustBalance(input);
    return { id: input.userId, currentBalance };
  }
}
