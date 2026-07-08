import type {
  ChallengePayload,
  ChallengeQuestion,
  ExternalIdentitySummary,
  SignOptions,
} from '@firmador/shared';

export interface ExternalProfile extends Record<string, unknown> {
  rut: string;
  numeroDocumento: string;
  nombres: string;
  apellidoPaterno: string;
  apellidoMaterno: string;
  email: string;
  fechaNacimiento?: string;
  estadoCivil?: string;
  telefono?: string;
}

export interface ExternalProfileOverrides extends Record<string, unknown> {
  numeroDocumento?: string;
  fechaNacimiento?: string;
  estadoCivil?: string;
  telefono?: string;
  /** ClaveUnica users/info carries no email; it must come from the account. */
  email?: string;
}

export interface ProviderContext extends Record<string, unknown> {
  claveCode?: string;
  claveAccessToken?: string;
  claveIdValidation?: string;
  challengeToken?: string;
  idChallenge?: string;
  /** Validation id returned by ingresoValidacionChallenge (challenge creation). */
  idValidation?: string;
  /** Validation id returned by respuestaValidacionChallenge (answers accepted). */
  answerIdValidation?: string;
  nroSolicitud?: string;
  downloadPin?: string;
  pinFirma?: string;
  configurationName?: string;
  externalProfile?: ExternalProfile;
  externalProfileOverrides?: ExternalProfileOverrides;
}

export interface AuthorizationResult {
  state: string;
  redirectUrl: string;
  providerContext?: ProviderContext;
  auditMeta?: Record<string, unknown>;
}

export interface AuthorizationCompletionResult {
  identity: ExternalIdentitySummary;
  challenge: {
    idChallenge: string;
    questions: ChallengeQuestion[];
  };
  providerContext: ProviderContext;
  auditMeta?: Record<string, unknown>;
}

export interface ProviderStageResult {
  providerContext: ProviderContext;
  auditMeta?: Record<string, unknown>;
}

export interface SignDocumentResult extends ProviderStageResult {
  signedPdfBuffer: Buffer;
}

export interface CreateAuthorizationInput {
  processId: string;
  state: string;
  successRedirect: string;
  failedRedirect: string;
}

export interface CompleteAuthorizationInput {
  callbackCode?: string;
  providerContext?: ProviderContext | null;
}

export interface SubmitChallengeInput {
  payload: ChallengePayload;
  providerContext: ProviderContext;
}

export interface CertificateRequestInput {
  providerContext: ProviderContext;
}

export interface DownloadCertificateInput {
  providerContext: ProviderContext;
  signOptions: SignOptions;
  imageBuffer?: Buffer | null;
}

export interface SignDocumentInput {
  providerContext: ProviderContext;
  fileName: string;
  pdfBuffer: Buffer;
  signOptions: SignOptions;
  imageBuffer?: Buffer | null;
}
