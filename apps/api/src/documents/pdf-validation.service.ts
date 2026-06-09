import { createHash } from 'node:crypto';
import {
  BadRequestException,
  Injectable,
  PayloadTooLargeException,
} from '@nestjs/common';
import type { PdfMetadata as DocumentPdfMetadata } from '@firmador/shared';
import { PDFDocument } from 'pdf-lib';

export interface PdfValidationMetadata {
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  pdfMetadata: DocumentPdfMetadata;
}

@Injectable()
export class PdfValidationService {
  private readonly maxSizeBytes = 20 * 1024 * 1024;

  async validatePdf(
    buffer: Buffer,
    mimeType?: string,
  ): Promise<PdfValidationMetadata> {
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

    let document: PDFDocument;
    try {
      document = await PDFDocument.load(buffer, {
        ignoreEncryption: true,
      });
    } catch {
      throw new BadRequestException('Uploaded file is not a valid PDF.');
    }

    const pages = document.getPages().map((page, index) => {
      const size = page.getSize();
      return {
        page: index + 1,
        width: Math.round(size.width * 100) / 100,
        height: Math.round(size.height * 100) / 100,
        rotation: page.getRotation().angle,
      };
    });

    return {
      mimeType: mimeType ?? 'application/pdf',
      sizeBytes: buffer.byteLength,
      sha256: createHash('sha256').update(buffer).digest('hex'),
      pdfMetadata: {
        pageCount: pages.length,
        pages,
      },
    };
  }
}
