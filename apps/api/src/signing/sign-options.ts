import type { PdfMetadata, SignOptions } from '@firmador/shared';
import { BadRequestException } from '@nestjs/common';

const coordinateFields = ['page', 'x', 'y', 'width', 'height'] as const;
const signOptionFields = ['visible', ...coordinateFields] as const;

const parseBoolean = (value: string | undefined) =>
  value !== undefined &&
  ['true', '1', 'on', 'yes'].includes(value.toLowerCase());

const hasAnyField = (
  fields: Record<string, string | undefined>,
  names: readonly string[],
) => names.some((name) => fields[name] !== undefined);

const parseRequiredNumber = (field: string, value: string | undefined) => {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`Field "${field}" must be a number.`);
  }
  return parsed;
};

export const hasSignOptionFields = (
  fields: Record<string, string | undefined>,
) => hasAnyField(fields, signOptionFields);

export const normalizeSignOptions = (
  fields: Record<string, string | undefined>,
  imageFileName?: string,
  pdfMetadata?: PdfMetadata | null,
): SignOptions => {
  const visible =
    fields.visible === undefined
      ? hasAnyField(fields, coordinateFields)
      : parseBoolean(fields.visible);

  if (!visible) {
    return { visible: false };
  }

  const page = parseRequiredNumber('page', fields.page);
  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestException('Field "page" must be an integer >= 1.');
  }

  const x = parseRequiredNumber('x', fields.x);
  const y = parseRequiredNumber('y', fields.y);
  const width = parseRequiredNumber('width', fields.width);
  const height = parseRequiredNumber('height', fields.height);

  if (width <= 0 || height <= 0) {
    throw new BadRequestException(
      'Fields "width" and "height" must be greater than zero.',
    );
  }

  const signOptions = {
    visible: true,
    page,
    x,
    y,
    width,
    height,
    imageFileName,
  };

  validateSignOptionsForPdf(signOptions, pdfMetadata);
  return signOptions;
};

export const validateSignOptionsForPdf = (
  signOptions: SignOptions,
  pdfMetadata?: PdfMetadata | null,
) => {
  if (!signOptions.visible) {
    return;
  }

  const page = signOptions.page;
  const x = signOptions.x;
  const y = signOptions.y;
  const width = signOptions.width;
  const height = signOptions.height;

  if (
    page === undefined ||
    x === undefined ||
    y === undefined ||
    width === undefined ||
    height === undefined
  ) {
    throw new BadRequestException(
      'Visible signature coordinates must be configured before signing.',
    );
  }

  if (!Number.isInteger(page) || page < 1) {
    throw new BadRequestException('Field "page" must be an integer >= 1.');
  }

  if (x < 0 || y < 0) {
    throw new BadRequestException('Fields "x" and "y" must be >= 0.');
  }

  if (width <= 0 || height <= 0) {
    throw new BadRequestException(
      'Fields "width" and "height" must be greater than zero.',
    );
  }

  if (!pdfMetadata) {
    return;
  }

  const pageMetadata = pdfMetadata.pages.find((item) => item.page === page);
  if (!pageMetadata) {
    throw new BadRequestException(
      `Field "page" must be between 1 and ${pdfMetadata.pageCount}.`,
    );
  }

  const epsilon = 0.01;
  if (
    x + width > pageMetadata.width + epsilon ||
    y + height > pageMetadata.height + epsilon
  ) {
    throw new BadRequestException(
      'Signature rectangle must fit inside the selected PDF page.',
    );
  }
};
