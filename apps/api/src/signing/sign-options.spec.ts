import type { PdfMetadata } from '@firmador/shared';
import {
  normalizeSignOptions,
  validateSignOptionsForPdf,
} from './sign-options';

describe('normalizeSignOptions', () => {
  const pdfMetadata: PdfMetadata = {
    pageCount: 2,
    pages: [
      { page: 1, width: 612, height: 792, rotation: 0 },
      { page: 2, width: 300, height: 400, rotation: 0 },
    ],
  };

  it('returns invisible signature config when visible is false', () => {
    expect(normalizeSignOptions({ visible: 'false' })).toEqual({
      visible: false,
    });
  });

  it('normalizes visible signature coordinates', () => {
    expect(
      normalizeSignOptions(
        {
          visible: 'true',
          page: '1',
          x: '120',
          y: '80',
          width: '160',
          height: '64',
        },
        undefined,
        pdfMetadata,
      ),
    ).toEqual({
      visible: true,
      page: 1,
      x: 120,
      y: 80,
      width: 160,
      height: 64,
      imageFileName: undefined,
    });
  });

  it('rejects a page outside the PDF metadata', () => {
    expect(() =>
      normalizeSignOptions(
        {
          visible: 'true',
          page: '3',
          x: '120',
          y: '80',
          width: '160',
          height: '64',
        },
        undefined,
        pdfMetadata,
      ),
    ).toThrow('Field "page" must be between 1 and 2.');
  });

  it('rejects rectangles that exceed the selected page', () => {
    expect(() =>
      normalizeSignOptions(
        {
          visible: 'true',
          page: '2',
          x: '250',
          y: '80',
          width: '160',
          height: '64',
        },
        undefined,
        pdfMetadata,
      ),
    ).toThrow('Signature rectangle must fit inside the selected PDF page.');
  });

  it('rejects incomplete visible coordinates before signing', () => {
    expect(() =>
      validateSignOptionsForPdf({ visible: true }, pdfMetadata),
    ).toThrow(
      'Visible signature coordinates must be configured before signing.',
    );
  });
});
