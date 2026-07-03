import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { IdentityModule } from '../identity/identity.module';
import { ProviderModule } from '../provider/provider.module';
import { DocumentEntity } from './entities/document.entity';
import { SignatureAccountEntity } from './entities/signature-account.entity';
import { SignatureAssetEntity } from './entities/signature-asset.entity';
import { SignatureRegistrationEntity } from './entities/signature-registration.entity';
import { SigningStatusEntity } from './entities/signing-status.entity';
import { SigningProcessEntity } from './entities/signing-process.entity';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      SigningProcessEntity,
      SignatureRegistrationEntity,
      DocumentEntity,
      SignatureAssetEntity,
      SignatureAccountEntity,
      SigningStatusEntity,
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
