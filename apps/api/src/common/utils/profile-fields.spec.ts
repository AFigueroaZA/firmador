import {
  FECHA_NACIMIENTO_PATTERN,
  NUMERO_DOCUMENTO_PATTERN,
  TELEFONO_PATTERN,
  normalizeEstadoCivil,
  normalizeFechaNacimiento,
  normalizeNumeroDocumento,
  normalizeTelefono,
} from './profile-fields';

describe('profile field normalization', () => {
  it('normalizes Chilean mobile numbers to 9 digits', () => {
    expect(normalizeTelefono('+56 9 1234 5678')).toBe('912345678');
    expect(normalizeTelefono('56912345678')).toBe('912345678');
    expect(normalizeTelefono('0912345678')).toBe('912345678');
    expect(normalizeTelefono('912345678')).toBe('912345678');
    expect(TELEFONO_PATTERN.test('912345678')).toBe(true);
    expect(TELEFONO_PATTERN.test('221234567')).toBe(false);
  });

  it('normalizes document serial numbers', () => {
    expect(normalizeNumeroDocumento('a012.345.678')).toBe('A012345678');
    expect(normalizeNumeroDocumento('123.456.789')).toBe('123456789');
    expect(NUMERO_DOCUMENTO_PATTERN.test('A012345678')).toBe(true);
    expect(NUMERO_DOCUMENTO_PATTERN.test('123456789')).toBe(true);
    // Cedulas nuevas traen letras intercaladas en la serie.
    expect(NUMERO_DOCUMENTO_PATTERN.test('B5S270827')).toBe(true);
    expect(NUMERO_DOCUMENTO_PATTERN.test('ABCDEF')).toBe(false);
    expect(NUMERO_DOCUMENTO_PATTERN.test('12345')).toBe(false);
  });

  it('normalizes birth dates to ISO format', () => {
    expect(normalizeFechaNacimiento('10-01-1990')).toBe('1990-01-10');
    expect(normalizeFechaNacimiento('10/01/1990')).toBe('1990-01-10');
    expect(normalizeFechaNacimiento('1990-01-10')).toBe('1990-01-10');
    expect(FECHA_NACIMIENTO_PATTERN.test('1990-01-10')).toBe(true);
    expect(FECHA_NACIMIENTO_PATTERN.test('1990-13-10')).toBe(false);
  });

  it('normalizes estado civil labels', () => {
    expect(normalizeEstadoCivil('soltero')).toBe('Soltero');
    expect(normalizeEstadoCivil('SOLTERA')).toBe('Soltero');
    expect(normalizeEstadoCivil('casada')).toBe('Casado');
    expect(normalizeEstadoCivil('Conviviente civil')).toBe('Conviviente Civil');
    expect(normalizeEstadoCivil('otro')).toBe('otro');
  });
});
