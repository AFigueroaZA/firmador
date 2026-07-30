import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { DashboardService } from './dashboard.service';

@Controller('api/dashboard')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('operator', 'admin')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get()
  @Header('Cache-Control', 'private, no-store')
  getDashboard(
    @CurrentUser() requestUser: RequestUser,
    @Query('page') page?: string,
    @Query('q') q?: string,
    @Query('isActive') isActive?: string,
    @Query('identityStatus') identityStatus?: string,
  ) {
    return this.dashboardService.getDashboard(requestUser, {
      page,
      q,
      isActive,
      identityStatus,
    });
  }
}
