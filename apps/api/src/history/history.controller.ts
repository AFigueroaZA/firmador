import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { HistoryService } from './history.service';

@Controller('api/history')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('operator')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  @Get()
  async list(@CurrentUser() requestUser: RequestUser) {
    return this.historyService.list(requestUser);
  }

  @Get(':id/audit')
  async auditTrail(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
  ) {
    return this.historyService.auditTrail(requestUser, processId);
  }
}
