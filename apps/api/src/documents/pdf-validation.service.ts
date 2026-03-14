import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';

export interface PdfMetadata {
  mimeType: string;
  sizeBytes: number;
  sha256: string;
}

@Injectable()
export class PdfValidationService {
  private readonly maxSizeBytes = 20 * 1024 * 1024;

  validatePdf(buffer: Buffer, mimeType?: string): PdfMetadata {
    if (buffer.byteLength > this.maxSizeBytes) {
      throw new PayloadTooLargeException('PDF exceeds the 20 MB limit.');
    }

    const signature = buffer.subarray(0, 5).toString('utf8');
    if (signature !== '%PDF-') {
      throw new BadRequestException('Uploaded file is not a valid PDF.');
    }

    if (mimeType && mimeType !== 'application/pdf') {
      throw new BadRequestException('MIME type must be application/pdf.');
    }

    return {
      mimeType: mimeType ?? 'application/pdf',
      sizeBytes: buffer.byteLength,
      sha256: createHash('sha256').update(buffer).digest('hex'),
    };
  }
}
