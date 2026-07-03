import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserIdentityEntity } from '../identity/entities/user-identity.entity';
import { ClaveUnicaClient } from '../provider/clients/clave-unica.client';
import { RegistrationIntentEntity } from './entities/registration-intent.entity';
import { RegistrationController } from './registration.controller';
import { RegistrationService } from './registration.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([RegistrationIntentEntity, UserIdentityEntity]),
  ],
  controllers: [RegistrationController],
  providers: [RegistrationService, ClaveUnicaClient],
})
export class RegistrationModule {}
