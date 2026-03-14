import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SigningModule } from '../signing/signing.module';
import { HistoryController } from './history.controller';
import { HistoryService } from './history.service';

@Module({
  imports: [AuthModule, SigningModule],
  controllers: [HistoryController],
  providers: [HistoryService],
})
export class HistoryModule {}
