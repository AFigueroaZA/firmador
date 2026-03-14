import type { SigningProcessStatus } from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
} from 'typeorm';

@Entity('audit_events')
export class AuditEventEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column()
  processId!: string;

  @Column({ type: 'varchar', nullable: true })
  actorUserId!: string | null;

  @Column()
  actor!: string;

  @Column()
  type!: string;

  @Column()
  message!: string;

  @Column({ type: 'varchar', nullable: true })
  fromStatus!: SigningProcessStatus | null;

  @Column({ type: 'varchar', nullable: true })
  toStatus!: SigningProcessStatus | null;

  @Column({ type: 'simple-json', nullable: true })
  meta!: Record<string, unknown> | null;

  @CreateDateColumn()
  createdAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
