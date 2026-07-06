/**
 * Normalization for the identity fields the e-sign provider consumes.
 * The provider expects (see Postman contract):
 * - telefono: 9-digit Chilean mobile, e.g. "912341234"
 * - fechaNacimiento: stored as ISO "AAAA-MM-DD" (converted to DD-MM-AAAA
 *   for the challenge call by provider-normalization.ts)
 * - numeroDocumento: cedula serial number without dots, e.g. "A012345678"
 * - estadoCivil: plain label, e.g. "Soltero"
 */

export const TELEFONO_PATTERN = /^9\d{8}$/;
export const NUMERO_DOCUMENTO_PATTERN = /^[A-Z]?\d{6,10}$/;
export const FECHA_NACIMIENTO_PATTERN =
  /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

export const ESTADO_CIVIL_OPTIONS = [
  'Soltero',
  'Casado',
  'Divorciado',
  'Viudo',
  'Separado',
  'Conviviente Civil',
] as const;

export const normalizeTelefono = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  let digits = value.replace(/\D/g, '');
  if (digits.length === 11 && digits.startsWith('56')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10 && digits.startsWith('0')) {
    digits = digits.slice(1);
  }
  return digits;
};

export const normalizeNumeroDocumento = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  return value.replace(/[.\s-]/g, '').toUpperCase();
};

export const normalizeFechaNacimiento = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim();
  // DD-MM-AAAA or DD/MM/AAAA -> AAAA-MM-DD
  const dmyMatch = trimmed.match(/^(\d{2})[-/](\d{2})[-/](\d{4})$/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }
  return trimmed.replaceAll('/', '-');
};

export const normalizeEstadoCivil = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }
  const trimmed = value.trim().toLowerCase();
  const match = ESTADO_CIVIL_OPTIONS.find(
    (option) =>
      option.toLowerCase() === trimmed ||
      // Accept feminine variants ("soltera" -> "Soltero").
      option.toLowerCase().replace(/o$/, 'a') === trimmed,
  );
  return match ?? value.trim();
};
