import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { CreditsModule } from '../credits/credits.module';
import { BalanceController } from './balance.controller';

@Module({
  imports: [AuthModule, CreditsModule],
  controllers: [BalanceController],
})
export class BalanceModule {}
