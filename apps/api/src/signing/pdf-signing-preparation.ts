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

const isPng = (buffer: Buffer) =>
  buffer.length >= 8 &&
  buffer
    .subarray(0, 8)
    .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));

export const preparePdfForSigning = async (
  input: PreparePdfForSigningInput,
): Promise<PreparedPdfForSigning> => {
  if (
    input.signOptions.visible &&
    input.signOptions.imageFileName &&
    !input.imageBuffer
  ) {
    throw new Error('Configured signature image is unavailable.');
  }

  const pdfDocument = await PDFDocument.load(input.originalPdf, {
    ignoreEncryption: true,
  });
  const originalPageCount = pdfDocument.getPageCount();

  if (
    input.imageBuffer &&
    hasManualSignaturePlacement(input.signOptions, originalPageCount)
  ) {
    const image = isPng(input.imageBuffer)
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
  const { width: originalPageWidth } = lastOriginalPage.getSize();
  const pageWidth = Math.max(1, Math.round(originalPageWidth));
  const margin = Math.max(1, Math.min(12, Math.floor(pageWidth / 10)));
  const headingHeight = 20;
  const providerWidth = Math.max(1, Math.min(420, pageWidth - margin * 2));
  const providerHeight = Math.min(
    70,
    Math.max(56, Math.round(providerWidth / 6)),
  );
  const providerX = Math.max(0, Math.round((pageWidth - providerWidth) / 2));
  const providerPageHeight = margin * 2 + headingHeight + providerHeight;
  const providerPage = pdfDocument.addPage([pageWidth, providerPageHeight]);
  const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
  providerPage.drawText('Firma Electrónica Avanzada', {
    x: providerX,
    y: margin + providerHeight + 8,
    size: 9,
    font,
    color: rgb(0.42, 0.45, 0.5),
  });

  return {
    pdfBuffer: Buffer.from(await pdfDocument.save()),
    signOptions: {
      visible: true,
      page: originalPageCount + 1,
      x: providerX,
      y: margin,
      width: providerWidth,
      height: providerHeight,
    },
  };
};
