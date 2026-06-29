import { buildCertificateConfigSoapEnvelope } from './certificate.client';

describe('buildCertificateConfigSoapEnvelope', () => {
  const baseInput = {
    certDownloadUser: 'download-user',
    certDownloadPassword: 'download-password',
    pinFirma: '1234',
    downloadPin: '4jyQ00',
    nroSolicitud: 'SOL-1',
    certificatePassword: 'cert-pass',
    certType: 'FEA',
    rutEmpresa: '76123456-7',
    username: 'provider-user',
    qrEnabled: false,
    qrX: '',
    qrY: '',
    signOptions: {
      visible: true,
      page: 1,
      x: 10,
      y: 20,
      width: 100,
      height: 50,
    },
    imageBuffer: null,
  };

  it('keeps QR disabled by default', () => {
    const xml = buildCertificateConfigSoapEnvelope(baseInput);

    expect(xml).toContain('<codigoQR>false</codigoQR>');
    expect(xml).toContain('<posicionXCodigoQR></posicionXCodigoQR>');
    expect(xml).toContain('<posicionYCodigoQR></posicionYCodigoQR>');
  });

  it('writes QR coordinates when QR is enabled', () => {
    const xml = buildCertificateConfigSoapEnvelope({
      ...baseInput,
      qrEnabled: true,
      qrX: 10,
      qrY: 15,
    });

    expect(xml).toContain('<codigoQR>true</codigoQR>');
    expect(xml).toContain('<posicionXCodigoQR>10</posicionXCodigoQR>');
    expect(xml).toContain('<posicionYCodigoQR>15</posicionYCodigoQR>');
  });
});
