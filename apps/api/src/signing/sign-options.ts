import type { SignOptions } from '@firmador/shared';
import { BadRequestException } from '@nestjs/common';

const parseBoolean = (value: string | undefined) =>
  value !== undefined &&
  ['true', '1', 'on', 'yes'].includes(value.toLowerCase());

const parseRequiredNumber = (field: string, value: string | undefined) => {
  const parsed = Number.parseFloat(value ?? '');
  if (!Number.isFinite(parsed)) {
    throw new BadRequestException(`Field "${field}" must be a number.`);
  }
  return parsed;
};

export const normalizeSignOptions = (
  fields: Record<string, string | undefined>,
  imageFileName?: string,
): SignOptions => {
  const visible = parseBoolean(fields.visible);

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

  return {
    visible: true,
    page,
    x,
    y,
    width,
    height,
    imageFileName,
  };
};
