import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SignatureRegistrationStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'EXPIRED'
  | 'REVOKED';

@Entity('signature_registrations')
export class SignatureRegistrationEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column()
  userId!: string;

  @Column({ type: 'varchar' })
  status!: SignatureRegistrationStatus;

  @Column({ type: 'datetime' })
  validFrom!: Date;

  @Column({ type: 'datetime' })
  validUntil!: Date;

  @Column({ type: 'text', nullable: true })
  providerContextEncrypted!: string | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
