import type {
  ChallengeQuestion,
  ExternalIdentitySummary,
  SignOptions,
  SigningProcessStatus,
} from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  PrimaryColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('signing_processes')
export class SigningProcessEntity {
  @PrimaryColumn('varchar')
  id!: string;

  @Column()
  userId!: string;

  @Column()
  status!: SigningProcessStatus;

  @Column()
  originalFileName!: string;

  @Column()
  mimeType!: string;

  @Column('integer')
  sizeBytes!: number;

  @Column()
  sha256!: string;

  @Column({ type: 'simple-json' })
  signOptions!: SignOptions;

  @Column()
  originalStoragePath!: string;

  @Column({ type: 'varchar', nullable: true })
  signedStoragePath!: string | null;

  @Column({ type: 'varchar', nullable: true })
  signatureImageStoragePath!: string | null;

  @Column({ type: 'varchar', nullable: true })
  externalAuthState!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  externalIdentity!: ExternalIdentitySummary | null;

  @Column({ type: 'text', nullable: true })
  providerContextEncrypted!: string | null;

  @Column({ type: 'simple-json', nullable: true })
  challenge!: {
    idChallenge: string;
    questions: ChallengeQuestion[];
  } | null;

  @Column({ type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column()
  expiresAt!: Date;

  @Column({ type: 'datetime', nullable: true })
  signedAt!: Date | null;

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  @BeforeInsert()
  assignId() {
    this.id = this.id ?? randomUUID();
  }
}
