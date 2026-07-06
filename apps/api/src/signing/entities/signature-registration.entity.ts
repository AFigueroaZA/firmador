import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export type SignatureRegistrationStatus =
  | 'ACTIVE'
  | 'PENDING'
  | 'EXPIRED'
  | 'REVOKED';

@Entity('signature_registrations')
export class SignatureRegistrationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column()
  provider!: string;

  @Column({ name: 'provider_registration_id', type: 'text', nullable: true })
  providerRegistrationId!: string | null;

  @Column({ name: 'certificate_subject', type: 'text', nullable: true })
  certificateSubject!: string | null;

  @Column({ type: 'varchar' })
  status!: SignatureRegistrationStatus;

  @Column({ name: 'valid_from', type: 'timestamptz', nullable: true })
  validFrom!: Date | null;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  validUntil!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  get providerContextEncrypted() {
    return this.providerRegistrationId;
  }

  set providerContextEncrypted(value: string | null) {
    this.providerRegistrationId = value;
  }
}
