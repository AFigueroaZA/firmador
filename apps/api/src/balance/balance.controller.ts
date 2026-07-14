import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { CreditsService } from '../credits/credits.service';
import { PurchaseCreditsDto } from '../credits/dto/purchase-credits.dto';

@Controller('api/balance')
@UseGuards(SessionAuthGuard, RolesGuard)
@Roles('operator')
export class BalanceController {
  constructor(private readonly creditsService: CreditsService) {}

  @Get()
  getBalance(@CurrentUser() requestUser: RequestUser) {
    return this.creditsService.getOverview(requestUser.id);
  }

  @Post('purchases')
  purchase(
    @CurrentUser() requestUser: RequestUser,
    @Body() dto: PurchaseCreditsDto,
  ) {
    return this.creditsService.purchase(requestUser.id, dto);
  }
}
