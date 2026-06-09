import { existsSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';

export interface AppConfig {
  apiPort: number;
  apiBaseUrl: string;
  webBaseUrl: string;
  corsOrigin: string;
  databaseUrl?: string;
  databaseSynchronize: boolean;
  storageRoot: string;
  tempFileTtlHours: number;
  encryptionKey: string;
  cookieSecure: boolean;
  jwtAccessSecret: string;
  jwtRefreshSecret: string;
  jwtAccessTtl: string;
  jwtRefreshTtl: string;
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
  defaultCertificatePassword: string;
  certificateValidityDays: number;
}

const asBoolean = (value: string | undefined, fallback = false) => {
  if (value === undefined) {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
};

const workspaceRoot = () => {
  const currentDirectory = process.cwd();
  return existsSync(join(currentDirectory, 'apps', 'api'))
    ? currentDirectory
    : resolve(currentDirectory, '..', '..');
};

const resolveWorkspacePath = (value: string | undefined, fallback: string) => {
  const path = value?.trim() || fallback;
  return isAbsolute(path) ? path : resolve(workspaceRoot(), path);
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
    databaseSynchronize: asBoolean(process.env.DATABASE_SYNCHRONIZE, true),
    storageRoot: resolveWorkspacePath(
      process.env.STORAGE_ROOT,
      'apps/api/storage',
    ),
    tempFileTtlHours: Number.parseInt(
      process.env.TEMP_FILE_TTL_HOURS ?? '24',
      10,
    ),
    encryptionKey:
      process.env.ENCRYPTION_KEY ??
      'firmador-dev-encryption-key-change-me-before-production',
    cookieSecure: asBoolean(process.env.COOKIE_SECURE, false),
    jwtAccessSecret:
      process.env.JWT_ACCESS_SECRET ?? 'firmador-dev-access-secret-change-me',
    jwtRefreshSecret:
      process.env.JWT_REFRESH_SECRET ?? 'firmador-dev-refresh-secret-change-me',
    jwtAccessTtl: process.env.JWT_ACCESS_TTL ?? '2h',
    jwtRefreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
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
    providerOrigin: process.env.PROVIDER_ORIGIN ?? 'reddata_idyfdd',
    providerRutEmpresa: process.env.PROVIDER_RUT_EMPRESA ?? '',
    providerUsername: process.env.PROVIDER_USERNAME ?? '',
    providerPassword: process.env.PROVIDER_PASSWORD ?? '',
    providerCertDownloadUser: process.env.PROVIDER_CERT_DOWNLOAD_USER ?? '',
    providerCertDownloadPassword:
      process.env.PROVIDER_CERT_DOWNLOAD_PASSWORD ?? '',
    providerPinFirma: process.env.PROVIDER_PIN_FIRMA ?? '1234',
    providerCertType: process.env.PROVIDER_CERT_TYPE ?? 'FEA',
    defaultCertificatePassword:
      process.env.DEFAULT_CERTIFICATE_PASSWORD ?? '1234',
    certificateValidityDays: Number.parseInt(
      process.env.CERTIFICATE_VALIDITY_DAYS ?? '365',
      10,
    ),
  };
};
