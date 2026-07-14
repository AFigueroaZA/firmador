import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { AdjustBalanceDto } from '../credits/dto/adjust-balance.dto';
import { UpdateUserStatusDto } from '../credits/dto/update-user-status.dto';
import { AdminService } from './admin.service';

@Controller('api/admin')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  listUsers(
    @Query('page') page?: string,
    @Query('q') q?: string,
    @Query('isActive') isActive?: string,
    @Query('identityStatus') identityStatus?: string,
  ) {
    return this.adminService.listUsers({ page, q, isActive, identityStatus });
  }

  @Patch('users/:id/status')
  setStatus(@Param('id') userId: string, @Body() dto: UpdateUserStatusDto) {
    return this.adminService.setUserStatus(userId, dto.isActive);
  }

  @Post('users/:id/balance-adjustments')
  adjustBalance(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') userId: string,
    @Body() dto: AdjustBalanceDto,
  ) {
    return this.adminService.adjustUserBalance({
      userId,
      actorUserId: requestUser.id,
      operationId: dto.operationId,
      quantity: dto.quantity,
      reason: dto.reason,
    });
  }
}
