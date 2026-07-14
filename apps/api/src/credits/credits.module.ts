import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SignatureAccountEntity } from '../signing/entities/signature-account.entity';
import { CreditsService } from './credits.service';
import { CreditMovementEntity } from './entities/credit-movement.entity';
import { PaymentEntity } from './entities/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SignatureAccountEntity,
      CreditMovementEntity,
      PaymentEntity,
    ]),
  ],
  providers: [CreditsService],
  exports: [CreditsService, TypeOrmModule],
})
export class CreditsModule {}
