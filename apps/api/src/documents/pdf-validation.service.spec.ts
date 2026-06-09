import { PDFDocument } from 'pdf-lib';
import { PdfValidationService } from './pdf-validation.service';

describe('PdfValidationService', () => {
  const service = new PdfValidationService();

  const createPdf = async () => {
    const document = await PDFDocument.create();
    document.addPage([612, 792]);
    document.addPage([300, 400]);
    return Buffer.from(await document.save());
  };

  it('accepts a PDF and extracts metadata', async () => {
    const buffer = await createPdf();

    const result = await service.validatePdf(buffer, 'application/pdf');

    expect(result.sizeBytes).toBe(buffer.byteLength);
    expect(result.sha256).toHaveLength(64);
    expect(result.pdfMetadata).toEqual({
      pageCount: 2,
      pages: [
        { page: 1, width: 612, height: 792, rotation: 0 },
        { page: 2, width: 300, height: 400, rotation: 0 },
      ],
    });
  });

  it('rejects files without a PDF signature', async () => {
    const buffer = Buffer.from('not-a-pdf', 'utf8');

    await expect(
      service.validatePdf(buffer, 'application/pdf'),
    ).rejects.toThrow('Uploaded file is not a valid PDF.');
  });
});
