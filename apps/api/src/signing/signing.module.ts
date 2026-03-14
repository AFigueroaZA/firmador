import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { AuthModule } from '../auth/auth.module';
import { DocumentsModule } from '../documents/documents.module';
import { ProviderModule } from '../provider/provider.module';
import { SigningProcessEntity } from './entities/signing-process.entity';
import { SigningController } from './signing.controller';
import { SigningService } from './signing.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([SigningProcessEntity]),
    AuditModule,
    AuthModule,
    DocumentsModule,
    forwardRef(() => ProviderModule),
  ],
  controllers: [SigningController],
  providers: [SigningService],
  exports: [SigningService, TypeOrmModule],
})
export class SigningModule {}
