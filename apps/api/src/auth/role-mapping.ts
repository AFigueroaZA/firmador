import type { UserRole } from '@firmador/shared';

export const mapDatabaseRoleToAuthRole = (
  code: string | null | undefined,
): UserRole => (code === 'ADMIN' ? 'admin' : 'operator');

export const mapAuthRoleToDatabaseRoleCode = (role: UserRole) =>
  role === 'admin' ? 'ADMIN' : 'SIGNER';
