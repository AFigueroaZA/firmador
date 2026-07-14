import {
  IsInt,
  IsNotEmpty,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class AdjustBalanceDto {
  @IsUUID()
  operationId!: string;

  @IsInt()
  quantity!: number;

  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(250)
  reason!: string;
}
