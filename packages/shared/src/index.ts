export type UserRole = "operator" | "admin";

export const SIGNING_PROCESS_STATUSES = [
  "UPLOADED",
  "CONFIGURED",
  "EXTERNAL_AUTH_PENDING",
  "EXTERNAL_AUTH_DONE",
  "CHALLENGE_PENDING",
  "RA_PENDING",
  "CERT_PENDING",
  "SIGNING",
  "SIGNED",
  "FAILED",
  "EXPIRED",
] as const;

export type SigningProcessStatus = (typeof SIGNING_PROCESS_STATUSES)[number];

export type ProcessNextStep =
  | "configure"
  | "authorize"
  | "challenge"
  | "progress"
  | "download"
  | "history";

export interface SignOptions {
  visible: boolean;
  /**
   * Coordinates are PDF points with a bottom-left origin.
   */
  page?: number;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  imageFileName?: string;
}

export interface PdfPageMetadata {
  page: number;
  width: number;
  height: number;
  rotation: number;
}

export interface PdfMetadata {
  pageCount: number;
  pages: PdfPageMetadata[];
}

export interface ChallengeAnswer {
  question: number;
  answer: number;
}

export interface ChallengePayload {
  idChallenge: string;
  answers: ChallengeAnswer[];
}

export interface ChallengeOption {
  value: number;
  label: string;
}

export interface ChallengeQuestion {
  id: number;
  prompt: string;
  options: ChallengeOption[];
}

export interface ExternalIdentitySummary {
  run: string;
  fullName: string;
  email?: string;
}

export const IDENTITY_STATUSES = [
  "NOT_STARTED",
  "VALIDATED",
  "READY",
  "FAILED",
] as const;

export type IdentityStatus = (typeof IDENTITY_STATUSES)[number];

export interface IdentityProfile {
  rut?: string | null;
  nombres?: string | null;
  apellidoPaterno?: string | null;
  apellidoMaterno?: string | null;
  email?: string | null;
  telefono?: string | null;
  numeroDocumento?: string | null;
  fechaNacimiento?: string | null;
  estadoCivil?: string | null;
  claveUnicaValidatedAt?: string | null;
}

export interface IdentityStatusResponse {
  status: IdentityStatus;
  canSign: boolean;
  isValidated: boolean;
  isProfileComplete: boolean;
  missingFields: Array<keyof IdentityProfile>;
  profile: IdentityProfile | null;
}

export interface PaymentEligibilityResponse {
  mode: "mock" | "live";
  eligible: boolean;
  costCredits: number;
  availableCredits: number;
  reason:
    | "READY"
    | "IDENTITY_REQUIRED"
    | "SIGN_OPTIONS_REQUIRED"
    | "INSUFFICIENT_CREDITS";
  message: string;
  requiresExternalAuthorization: boolean;
}

export type CreditMovementType =
  | "CHARGE"
  | "CONSUMPTION"
  | "REFUND"
  | "ADJUSTMENT";

export interface CreditMovementSummary {
  id: string;
  type: CreditMovementType;
  quantity: number;
  balanceAfter: number;
  description: string | null;
  createdAt: string;
}

export interface BalanceResponse {
  currentBalance: number;
  packs: readonly [1, 5, 10];
  movements: CreditMovementSummary[];
}

export interface PurchaseCreditsRequest {
  operationId: string;
  credits: 1 | 5 | 10;
}

export interface PurchaseCreditsResponse {
  paymentId: string;
  creditsPurchased: 1 | 5 | 10;
  currentBalance: number;
}

export interface AdminDashboardResponse {
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  identities: {
    ready: number;
    pending: number;
    failed: number;
  };
  totalAvailableCredits: number;
  signing: {
    total: number;
    signed: number;
    inProgress: number;
    failed: number;
    expired: number;
  };
}

export interface AdminUserSummary {
  id: string;
  fullName: string;
  email: string;
  isActive: boolean;
  identityStatus: IdentityStatus;
  currentBalance: number;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface AdminUsersResponse {
  items: AdminUserSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export type EnrollmentStatus = "NONE" | "PENDING" | "ACTIVE";

export interface EnrollmentChallenge {
  idChallenge: string;
  questions: ChallengeQuestion[];
}

export interface EnrollmentClaveValidation {
  validatedAt: string | null;
  /** ClaveUnica validations are short-lived at the provider; stale ones must be redone. */
  fresh: boolean;
}

export interface EnrollmentStatusResponse {
  status: EnrollmentStatus;
  validUntil: string | null;
  challenge: EnrollmentChallenge | null;
  claveValidation?: EnrollmentClaveValidation | null;
}

export interface AuditEventSummary {
  id: string;
  type: string;
  actor: string;
  message: string;
  fromStatus?: SigningProcessStatus;
  toStatus?: SigningProcessStatus;
  createdAt: string;
  meta?: Record<string, unknown>;
}

export interface SigningProcessSummary {
  id: string;
  status: SigningProcessStatus;
  nextStep: ProcessNextStep;
  originalFileName: string;
  sizeBytes: number;
  sha256: string;
  signOptions: SignOptions;
  expiresAt: string;
  createdAt: string;
  updatedAt: string;
  signedAt?: string | null;
  errorMessage?: string | null;
  externalIdentity?: ExternalIdentitySummary | null;
}

export interface SigningProcessDetail extends SigningProcessSummary {
  pdfMetadata?: PdfMetadata | null;
  challenge?: {
    idChallenge: string;
    questions: ChallengeQuestion[];
  } | null;
  auditCount: number;
}

export interface SigningProcessListResponse {
  items: SigningProcessSummary[];
}

export interface AuditTrailResponse {
  process: SigningProcessSummary;
  events: AuditEventSummary[];
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthSession {
  user: AuthUser;
}

export interface CreateSigningProcessResponse {
  processId: string;
  status: SigningProcessStatus;
  nextStep: ProcessNextStep;
}
