import type { AppConfig } from './app.config';

export const validateConfig = (config: AppConfig) => {
  if (!config.databaseUrl) {
    throw new Error('DATABASE_URL is required.');
  }

  if (
    !config.supabaseUrl ||
    !config.supabasePublishableKey ||
    !config.supabaseServiceRoleKey
  ) {
    throw new Error(
      'Supabase configuration is required: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SERVICE_ROLE_KEY.',
    );
  }

  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY is required.');
  }

  if (config.signingProviderMode === 'live') {
    const required = [
      ['PROVIDER_USERNAME', config.providerUsername],
      ['PROVIDER_PASSWORD', config.providerPassword],
      ['PROVIDER_CERT_DOWNLOAD_USER', config.providerCertDownloadUser],
      ['PROVIDER_CERT_DOWNLOAD_PASSWORD', config.providerCertDownloadPassword],
      ['PROVIDER_RUT_EMPRESA', config.providerRutEmpresa],
      ['PROVIDER_ORIGIN', config.providerOrigin],
      ['PROVIDER_PIN_FIRMA', config.providerPinFirma],
      ['DEFAULT_CERTIFICATE_PASSWORD', config.defaultCertificatePassword],
    ];

    const missing = required
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Missing provider configuration in live mode: ${missing.join(', ')}`,
      );
    }

    if (config.providerQrEnabled) {
      const missingQr = [
        ['PROVIDER_QR_X', config.providerQrX],
        ['PROVIDER_QR_Y', config.providerQrY],
      ]
        .filter(([, value]) => !value)
        .map(([name]) => name);

      if (missingQr.length > 0) {
        throw new Error(
          `Missing QR configuration in live mode: ${missingQr.join(', ')}`,
        );
      }
    }
  }
};
