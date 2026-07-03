import { Module } from '@nestjs/common';
import { DocumentStorageService } from './document-storage.service';
import { PdfValidationService } from './pdf-validation.service';
import { SealedPayloadService } from './sealed-payload.service';

@Module({
  providers: [
    PdfValidationService,
    SealedPayloadService,
    DocumentStorageService,
  ],
  exports: [PdfValidationService, SealedPayloadService, DocumentStorageService],
})
export class DocumentsModule {}
