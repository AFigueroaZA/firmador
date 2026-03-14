import { Module } from '@nestjs/common';
import { EncryptedFileStoreService } from './encrypted-file-store.service';
import { PdfValidationService } from './pdf-validation.service';
import { SealedPayloadService } from './sealed-payload.service';

@Module({
  providers: [
    PdfValidationService,
    SealedPayloadService,
    EncryptedFileStoreService,
  ],
  exports: [
    PdfValidationService,
    SealedPayloadService,
    EncryptedFileStoreService,
  ],
})
export class DocumentsModule {}
