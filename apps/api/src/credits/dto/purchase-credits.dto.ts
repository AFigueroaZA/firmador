import type { PurchaseCreditsRequest } from '@firmador/shared';
import { IsIn, IsUUID } from 'class-validator';

export class PurchaseCreditsDto implements PurchaseCreditsRequest {
  @IsUUID()
  operationId!: string;

  @IsIn([1, 5, 10])
  credits!: 1 | 5 | 10;
}
