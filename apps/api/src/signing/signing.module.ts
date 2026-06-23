import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { IdentityModule } from '../identity/identity.module';
import { ProviderModule } from '../provider/provider.module';
import { SignatureRegistrationEntity } from './entities/signature-registration.entity';
import { SigningProcessEntity } from './entities/signing-process.entity';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SigningProcessEntity,
      SignatureRegistrationEntity,
    ]),
    AuditModule,
    AuthModule,
    DocumentsModule,
    IdentityModule,
    forwardRef(() => ProviderModule),
  ],
  controllers: [SigningController],
  providers: [SigningService],
  exports: [SigningService, TypeOrmModule],
})
export class SigningModule {}
