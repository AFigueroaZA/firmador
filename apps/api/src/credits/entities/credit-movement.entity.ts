import type { CreditMovementType } from '@firmador/shared';
import { Column, CreateDateColumn, Entity, PrimaryColumn } from 'typeorm';

@Entity('signature_credit_movements')
export class CreditMovementEntity {
  @PrimaryColumn({ type: 'uuid' })
  id!: string;

  @Column({ name: 'account_id', type: 'uuid' })
  accountId!: string;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'signing_process_id', type: 'uuid', nullable: true })
  signingProcessId!: string | null;

  @Column({ name: 'actor_user_id', type: 'uuid', nullable: true })
  actorUserId!: string | null;

  @Column({ name: 'movement_type' })
  movementType!: CreditMovementType;

  @Column({ type: 'integer' })
  quantity!: number;

  @Column({ name: 'balance_after', type: 'integer' })
  balanceAfter!: number;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
