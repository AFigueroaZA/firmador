import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class SignOptionsDto {
  @IsBoolean()
  visible!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  width?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  height?: number;
}
