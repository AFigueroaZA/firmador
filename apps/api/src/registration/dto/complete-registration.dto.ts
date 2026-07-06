import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsIn,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import {
  ESTADO_CIVIL_OPTIONS,
  FECHA_NACIMIENTO_PATTERN,
  NUMERO_DOCUMENTO_PATTERN,
  TELEFONO_PATTERN,
  normalizeEstadoCivil,
  normalizeFechaNacimiento,
  normalizeNumeroDocumento,
  normalizeTelefono,
} from '../../common/utils/profile-fields';

export class CompleteRegistrationDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @Transform(({ value }) => normalizeTelefono(value))
  @IsString()
  @Matches(TELEFONO_PATTERN, {
    message:
      'telefono debe ser un celular chileno de 9 dígitos, por ejemplo 912345678.',
  })
  telefono!: string;

  @Transform(({ value }) => normalizeNumeroDocumento(value))
  @IsString()
  @Matches(NUMERO_DOCUMENTO_PATTERN, {
    message:
      'numeroDocumento debe ser el número de serie/documento de la cédula, sin puntos (ej: A012345678 o 123456789).',
  })
  numeroDocumento!: string;

  @Transform(({ value }) => normalizeFechaNacimiento(value))
  @IsString()
  @Matches(FECHA_NACIMIENTO_PATTERN, {
    message: 'fechaNacimiento debe tener formato AAAA-MM-DD.',
  })
  fechaNacimiento!: string;

  @Transform(({ value }) => normalizeEstadoCivil(value))
  @IsString()
  @IsIn(ESTADO_CIVIL_OPTIONS, {
    message: `estadoCivil debe ser uno de: ${ESTADO_CIVIL_OPTIONS.join(', ')}.`,
  })
  estadoCivil!: string;
}
