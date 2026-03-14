import { PdfValidationService } from './pdf-validation.service';

describe('PdfValidationService', () => {
  const service = new PdfValidationService();

  it('accepts a minimal PDF and computes sha256', () => {
    const buffer = Buffer.from(
      '%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF',
      'utf8',
    );

    const result = service.validatePdf(buffer, 'application/pdf');

    expect(result.sizeBytes).toBe(buffer.byteLength);
    expect(result.sha256).toHaveLength(64);
  });

  it('rejects files without a PDF signature', () => {
    const buffer = Buffer.from('not-a-pdf', 'utf8');

    expect(() => service.validatePdf(buffer, 'application/pdf')).toThrow(
      'Uploaded file is not a valid PDF.',
    );
  });
});
