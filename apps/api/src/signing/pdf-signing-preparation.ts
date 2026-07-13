import type { SignOptions } from '@firmador/shared';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

interface PreparePdfForSigningInput {
  originalPdf: Buffer;
  imageBuffer: Buffer | null;
  signOptions: SignOptions;
}

export interface PreparedPdfForSigning {
  pdfBuffer: Buffer;
  signOptions: SignOptions;
}

const hasManualSignaturePlacement = (options: SignOptions, pageCount: number) =>
  options.visible &&
  options.page !== undefined &&
  options.page >= 1 &&
  options.page <= pageCount &&
  options.x !== undefined &&
  options.y !== undefined &&
  options.width !== undefined &&
  options.height !== undefined;

export const preparePdfForSigning = async (
  input: PreparePdfForSigningInput,
): Promise<PreparedPdfForSigning> => {
  const pdfDocument = await PDFDocument.load(input.originalPdf, {
    ignoreEncryption: true,
  });
  const originalPageCount = pdfDocument.getPageCount();

  if (
    input.imageBuffer &&
    hasManualSignaturePlacement(input.signOptions, originalPageCount)
  ) {
    const isPng =
      input.imageBuffer[0] === 0x89 && input.imageBuffer[1] === 0x50;
    const image = isPng
      ? await pdfDocument.embedPng(input.imageBuffer)
      : await pdfDocument.embedJpg(input.imageBuffer);
    pdfDocument
      .getPage((input.signOptions.page as number) - 1)
      .drawImage(image, {
        x: input.signOptions.x as number,
        y: input.signOptions.y as number,
        width: input.signOptions.width as number,
        height: input.signOptions.height as number,
      });
  }

  const lastOriginalPage = pdfDocument.getPage(originalPageCount - 1);
  const { width: pageWidth, height: pageHeight } = lastOriginalPage.getSize();
  const providerPage = pdfDocument.addPage([pageWidth, pageHeight]);

  const margin = Math.min(24, pageWidth / 10, pageHeight / 10);
  const headingHeight = 32;
  const providerWidth = Math.max(1, pageWidth - margin * 2);
  const providerHeight = Math.max(1, pageHeight - margin * 2 - headingHeight);
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  providerPage.drawText('Firma Electrónica Avanzada', {
    x: margin,
    y: margin + providerHeight + 12,
    size: 9,
    font,
    color: rgb(0.42, 0.45, 0.5),
  });

  return {
    pdfBuffer: Buffer.from(await pdfDocument.save()),
    signOptions: {
      visible: true,
      page: originalPageCount + 1,
      x: margin,
      y: margin,
      width: providerWidth,
      height: providerHeight,
    },
  };
};
