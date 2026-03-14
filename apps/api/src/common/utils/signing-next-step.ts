import type { ProcessNextStep, SigningProcessStatus } from '@firmador/shared';

export const statusToNextStep = (
  status: SigningProcessStatus,
): ProcessNextStep => {
  switch (status) {
    case 'UPLOADED':
    case 'CONFIGURED':
    case 'EXTERNAL_AUTH_PENDING':
      return 'authorize';
    case 'EXTERNAL_AUTH_DONE':
    case 'CHALLENGE_PENDING':
      return 'challenge';
    case 'RA_PENDING':
    case 'CERT_PENDING':
    case 'SIGNING':
      return 'progress';
    case 'SIGNED':
      return 'download';
    case 'FAILED':
    case 'EXPIRED':
    default:
      return 'history';
  }
};
