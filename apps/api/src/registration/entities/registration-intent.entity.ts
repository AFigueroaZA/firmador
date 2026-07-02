import type { ExternalProfile } from '../../provider/types';
import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type RegistrationIntentStatus =
  | 'PENDING'
  | 'VALIDATED'
  | 'FAILED'
  | 'COMPLETED';

@Entity('registration_intents')
export class RegistrationIntentEntity {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ unique: true })
  state!: string;

  @Column({ type: 'varchar' })
  status!: RegistrationIntentStatus;

  @Column({ name: 'clave_code', type: 'varchar', nullable: true })
  claveCode!: string | null;

  @Column({ type: 'jsonb', nullable: true })
  profile!: ExternalProfile | null;

  @Column({ name: 'completed_user_id', type: 'uuid', nullable: true })
  completedUserId!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt!: Date;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
