import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  ValidateNested,
} from 'class-validator';

class ChallengeAnswerDto {
  @IsInt()
  question!: number;

  @IsInt()
  answer!: number;
}

export class ChallengePayloadDto {
  @IsString()
  idChallenge!: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ChallengeAnswerDto)
  answers!: ChallengeAnswerDto[];
}
