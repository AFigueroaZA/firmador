import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { HistoryService } from './history.service';

@Controller('api/history')
@UseGuards(SessionAuthGuard)
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
