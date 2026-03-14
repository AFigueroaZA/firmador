import type { AppConfig } from './app.config';

export const validateConfig = (config: AppConfig) => {
  if (!config.jwtAccessSecret || !config.jwtRefreshSecret) {
    throw new Error('JWT secrets are required.');
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
    ];

    const missing = required
      .filter(([, value]) => !value)
      .map(([name]) => name);
    if (missing.length > 0) {
      throw new Error(
        `Missing provider configuration in live mode: ${missing.join(', ')}`,
      );
    }
  }
};
