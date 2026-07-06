import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { UserIdentityEntity } from '../identity/entities/user-identity.entity';
import { ProviderModule } from '../provider/provider.module';
import { SignatureRegistrationEntity } from '../signing/entities/signature-registration.entity';
import { EnrollmentController } from './enrollment.controller';
import { EnrollmentService } from './enrollment.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SignatureRegistrationEntity, UserIdentityEntity]),
    AuthModule,
    DocumentsModule,
    forwardRef(() => ProviderModule),
  ],
  controllers: [EnrollmentController],
  providers: [EnrollmentService],
  exports: [EnrollmentService],
})
export class EnrollmentModule {}
