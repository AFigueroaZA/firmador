import type { DashboardResponse } from '@firmador/shared';
import { Injectable } from '@nestjs/common';
import { AdminService } from '../admin/admin.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreditsService } from '../credits/credits.service';
import { IdentityService } from '../identity/identity.service';
import { SigningService } from '../signing/signing.service';

interface DashboardFilters {
  page?: string;
  q?: string;
  isActive?: string;
  identityStatus?: string;
}

@Injectable()
export class DashboardService {
  constructor(
    private readonly adminService: AdminService,
    private readonly signingService: SigningService,
    private readonly identityService: IdentityService,
    private readonly creditsService: CreditsService,
  ) {}

  async getDashboard(
    requestUser: RequestUser,
    filters: DashboardFilters,
  ): Promise<DashboardResponse> {
    if (requestUser.role === 'admin') {
      const [summary, users] = await Promise.all([
        this.adminService.getDashboard(),
        this.adminService.listUsers(filters),
      ]);
      return { role: 'admin', summary, users };
    }

    const [signing, identity, currentBalance] = await Promise.all([
      this.signingService.getDashboardCounts(requestUser.id),
      this.identityService.getStatus(requestUser),
      this.creditsService.getCurrentBalance(requestUser.id),
    ]);
    return {
      role: 'operator',
      signing,
      identity,
      currentBalance,
    };
  }
}
