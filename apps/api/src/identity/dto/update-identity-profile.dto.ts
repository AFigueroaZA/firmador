import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateIdentityProfileDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  telefono?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  numeroDocumento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  fechaNacimiento?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  estadoCivil?: string;
}
