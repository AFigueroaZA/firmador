import type {
  SigningProcessDetail,
  SigningProcessSummary,
} from '@firmador/shared';
import { statusToNextStep } from '../common/utils/signing-next-step';
import { SigningProcessEntity } from './entities/signing-process.entity';

export const mapProcessToSummary = (
  process: SigningProcessEntity,
): SigningProcessSummary => ({
  id: process.id,
  status: process.status,
  nextStep: statusToNextStep(process.status),
  originalFileName: process.originalFileName,
  sizeBytes: process.sizeBytes,
  sha256: process.sha256,
  signOptions: process.signOptions,
  expiresAt: process.expiresAt.toISOString(),
  createdAt: process.createdAt.toISOString(),
  updatedAt: process.updatedAt.toISOString(),
  signedAt: process.signedAt?.toISOString() ?? null,
  errorMessage: process.errorMessage ?? null,
  externalIdentity: process.externalIdentity ?? null,
});

export const mapProcessToDetail = (
  process: SigningProcessEntity,
  auditCount: number,
): SigningProcessDetail => ({
  ...mapProcessToSummary(process),
  pdfMetadata: process.pdfMetadata ?? null,
  challenge:
    process.status === 'CHALLENGE_PENDING' ||
    process.status === 'EXTERNAL_AUTH_DONE'
      ? process.challenge
      : null,
  auditCount,
});
