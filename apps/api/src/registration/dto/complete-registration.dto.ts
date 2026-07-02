import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CompleteRegistrationDto {
  @IsEmail()
  @MaxLength(255)
  email!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;

  @IsString()
  @MaxLength(64)
  telefono!: string;

  @IsString()
  @MaxLength(64)
  numeroDocumento!: string;

  @IsString()
  @MaxLength(64)
  fechaNacimiento!: string;

  @IsString()
  @MaxLength(64)
  estadoCivil!: string;
}
