import type { UserRole } from '@firmador/shared';

export interface RequestUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}
