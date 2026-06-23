import { Module } from '@nestjs/common';
import { DocumentStorageService } from './document-storage.service';
import { EncryptedFileStoreService } from './encrypted-file-store.service';
import { PdfValidationService } from './pdf-validation.service';
import { SealedPayloadService } from './sealed-payload.service';

@Module({
  providers: [
    PdfValidationService,
    SealedPayloadService,
    EncryptedFileStoreService,
    DocumentStorageService,
  ],
  exports: [
    PdfValidationService,
    SealedPayloadService,
    EncryptedFileStoreService,
    DocumentStorageService,
  ],
})
export class DocumentsModule {}
