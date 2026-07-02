import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('provider_events')
export class AuditEventEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'signing_process_id', type: 'uuid', nullable: true })
  processId!: string | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column()
  provider!: string;

  @Column({ name: 'event_type' })
  eventType!: string;

  @Column({ name: 'external_event_id', type: 'varchar', nullable: true })
  externalEventId!: string | null;

  @Column({ type: 'varchar', nullable: true })
  status!: string | null;

  @Column({ type: 'jsonb' })
  payload!: Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
