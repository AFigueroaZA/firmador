import type {
  ChallengeQuestion,
  ExternalIdentitySummary,
  PdfMetadata,
  SignOptions,
  SigningProcessStatus,
} from '@firmador/shared';
import type { ExternalProfileOverrides } from '../../provider/types';
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { DocumentEntity } from './document.entity';
import { SignatureAccountEntity } from './signature-account.entity';
import { SigningStatusEntity } from './signing-status.entity';

interface SigningProcessMetadata {
  currentStep?: SigningProcessStatus;
  signOptions?: SignOptions;
  pdfMetadata?: PdfMetadata | null;
  originalStoragePath?: string;
  signatureImageStoragePath?: string | null;
  externalAuthState?: string | null;
  externalIdentity?: ExternalIdentitySummary | null;
  externalProfileOverrides?: ExternalProfileOverrides | null;
  providerContextEncrypted?: string | null;
  challenge?: {
    idChallenge: string;
    questions: ChallengeQuestion[];
  } | null;
}

@Entity('signing_processes')
export class SigningProcessEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @ManyToOne(() => DocumentEntity, { eager: true })
  @JoinColumn({ name: 'document_id' })
  document!: DocumentEntity;

  @Column({ name: 'status_id', type: 'uuid' })
  statusId!: string;

  @ManyToOne(() => SigningStatusEntity, { eager: true })
  @JoinColumn({ name: 'status_id' })
  statusEntity!: SigningStatusEntity;

  @Column({ name: 'signature_registration_id', type: 'uuid', nullable: true })
  signatureRegistrationId!: string | null;

  @Column({ name: 'payment_id', type: 'uuid', nullable: true })
  paymentId!: string | null;

  @Column({ name: 'account_id', type: 'uuid', nullable: true })
  accountId!: string | null;

  @ManyToOne(() => SignatureAccountEntity, { nullable: true })
  @JoinColumn({ name: 'account_id' })
  account!: SignatureAccountEntity | null;

  @Column()
  provider!: string;

  @Column({ name: 'provider_process_id', type: 'varchar', nullable: true })
  providerProcessId!: string | null;

  @Column({ name: 'requested_at', type: 'timestamptz' })
  requestedAt!: Date;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'signed_document_path', type: 'text', nullable: true })
  signedStoragePath!: string | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ type: 'jsonb' })
  metadata!: SigningProcessMetadata;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;

  get status(): SigningProcessStatus {
    return this.metadata?.currentStep ?? 'UPLOADED';
  }

  set status(value: SigningProcessStatus) {
    this.metadata = { ...(this.metadata ?? {}), currentStep: value };
  }

  get originalFileName() {
    return this.document?.originalFileName ?? '';
  }

  get mimeType() {
    return this.document?.mimeType ?? 'application/pdf';
  }

  get sizeBytes() {
    return Number(this.document?.sizeBytes ?? 0);
  }

  get sha256() {
    return this.document?.sha256 ?? '';
  }

  get signOptions(): SignOptions {
    return this.metadata?.signOptions ?? { visible: true };
  }

  set signOptions(value: SignOptions) {
    this.metadata = { ...(this.metadata ?? {}), signOptions: value };
  }

  get pdfMetadata(): PdfMetadata | null {
    return this.metadata?.pdfMetadata ?? null;
  }

  set pdfMetadata(value: PdfMetadata | null) {
    this.metadata = { ...(this.metadata ?? {}), pdfMetadata: value };
  }

  get originalStoragePath() {
    return (
      this.metadata?.originalStoragePath ?? this.document?.storagePath ?? ''
    );
  }

  set originalStoragePath(value: string) {
    this.metadata = { ...(this.metadata ?? {}), originalStoragePath: value };
  }

  get signatureImageStoragePath() {
    return this.metadata?.signatureImageStoragePath ?? null;
  }

  set signatureImageStoragePath(value: string | null) {
    this.metadata = {
      ...(this.metadata ?? {}),
      signatureImageStoragePath: value,
    };
  }

  get externalAuthState() {
    return this.metadata?.externalAuthState ?? null;
  }

  set externalAuthState(value: string | null) {
    this.metadata = { ...(this.metadata ?? {}), externalAuthState: value };
  }

  get externalIdentity() {
    return this.metadata?.externalIdentity ?? null;
  }

  set externalIdentity(value: ExternalIdentitySummary | null) {
    this.metadata = { ...(this.metadata ?? {}), externalIdentity: value };
  }

  get externalProfileOverrides() {
    return this.metadata?.externalProfileOverrides ?? null;
  }

  set externalProfileOverrides(value: ExternalProfileOverrides | null) {
    this.metadata = {
      ...(this.metadata ?? {}),
      externalProfileOverrides: value,
    };
  }

  get providerContextEncrypted() {
    return this.metadata?.providerContextEncrypted ?? null;
  }

  set providerContextEncrypted(value: string | null) {
    this.metadata = {
      ...(this.metadata ?? {}),
      providerContextEncrypted: value,
    };
  }

  get challenge() {
    return this.metadata?.challenge ?? null;
  }

  set challenge(
    value: { idChallenge: string; questions: ChallengeQuestion[] } | null,
  ) {
    this.metadata = { ...(this.metadata ?? {}), challenge: value };
  }
}
