export interface AppConfig {
  apiPort: number;
  apiBaseUrl: string;
  webBaseUrl: string;
  corsOrigin: string;
  databaseUrl?: string;
  databaseSchema?: string;
  databaseSynchronize: boolean;
  supabaseUrl?: string;
  supabasePublishableKey?: string;
  supabaseServiceRoleKey?: string;
  supabaseStorageBucket: string;
  tempFileTtlHours: number;
  encryptionKey: string;
  cookieSecure: boolean;
  signingProviderMode: 'mock' | 'live';
  providerAllowInsecureTls: boolean;
  providerClaveUnicaBaseUrl: string;
  providerChallengeBaseUrl: string;
  providerRaUrl: string;
  providerEsignerUrl: string;
  providerOrigin: string;
  providerRutEmpresa: string;
  providerUsername: string;
  providerPassword: string;
  providerCertDownloadUser: string;
  providerCertDownloadPassword: string;
  providerPinFirma: string;
  providerCertType: string;
  providerQrEnabled: boolean;
  providerQrX?: string;
  providerQrY?: string;
  defaultCertificatePassword: string;
  certificateValidityDays: number;
}

const asBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const env = (name: string) => {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
};

export const loadAppConfig = (): AppConfig => {
  const apiPort = Number.parseInt(process.env.API_PORT ?? '3000', 10);
  const apiBaseUrl = process.env.API_BASE_URL ?? `http://localhost:${apiPort}`;
  const webBaseUrl = process.env.WEB_BASE_URL ?? 'http://localhost:4321';

  return {
    apiPort,
    apiBaseUrl,
    webBaseUrl,
    corsOrigin: process.env.CORS_ORIGIN ?? webBaseUrl,
    databaseUrl: process.env.DATABASE_URL,
    databaseSchema: env('DATABASE_SCHEMA'),
    databaseSynchronize: asBoolean(process.env.DATABASE_SYNCHRONIZE, false),
    supabaseUrl: env('NEXT_PUBLIC_SUPABASE_URL'),
    supabasePublishableKey: env('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    supabaseServiceRoleKey: env('SUPABASE_SERVICE_ROLE_KEY'),
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? 'documents',
    tempFileTtlHours: Number.parseInt(
      process.env.TEMP_FILE_TTL_HOURS ?? '24',
      10,
    ),
    encryptionKey: env('ENCRYPTION_KEY') ?? '',
    cookieSecure: asBoolean(process.env.COOKIE_SECURE, false),
    signingProviderMode:
      process.env.SIGNING_PROVIDER_MODE === 'live' ? 'live' : 'mock',
    providerAllowInsecureTls: asBoolean(
      process.env.PROVIDER_ALLOW_INSECURE_TLS,
      false,
    ),
    providerClaveUnicaBaseUrl:
      process.env.PROVIDER_CLAVE_UNICA_BASE_URL ??
      'https://checkmiid.cl:8443/ClaveUnica',
    providerChallengeBaseUrl:
      process.env.PROVIDER_CHALLENGE_BASE_URL ??
      'https://idfd.e-sign.cl:8443/esign-api-mvn/rest-services',
    providerRaUrl:
      process.env.PROVIDER_RA_URL ??
      'https://ra.e-sign.cl:8543/esign-ra/WSIngresoSolicitud',
    providerEsignerUrl:
      process.env.PROVIDER_ESIGNER_URL ??
      'https://ws.esigner.cl:8543/esign-orq',
    providerOrigin: env('PROVIDER_ORIGIN') ?? '',
    providerRutEmpresa: process.env.PROVIDER_RUT_EMPRESA ?? '',
    providerUsername: process.env.PROVIDER_USERNAME ?? '',
    providerPassword: process.env.PROVIDER_PASSWORD ?? '',
    providerCertDownloadUser: process.env.PROVIDER_CERT_DOWNLOAD_USER ?? '',
    providerCertDownloadPassword:
      process.env.PROVIDER_CERT_DOWNLOAD_PASSWORD ?? '',
    providerPinFirma: env('PROVIDER_PIN_FIRMA') ?? '',
    providerCertType: process.env.PROVIDER_CERT_TYPE ?? 'FEA',
    providerQrEnabled: asBoolean(process.env.PROVIDER_QR_ENABLED, false),
    providerQrX: env('PROVIDER_QR_X'),
    providerQrY: env('PROVIDER_QR_Y'),
    defaultCertificatePassword: env('DEFAULT_CERTIFICATE_PASSWORD') ?? '',
    certificateValidityDays: Number.parseInt(
      process.env.CERTIFICATE_VALIDITY_DAYS ?? '365',
      10,
    ),
  };
};
