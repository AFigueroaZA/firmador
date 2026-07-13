import { buildSignDocumentSoapEnvelope } from './document-exchange.client';

describe('buildSignDocumentSoapEnvelope', () => {
  const baseInput = {
    username: 'user',
    password: 'pass',
    configurationName: 'config',
    pinFirma: '1234',
    fileName: 'demo.pdf',
    pdfBuffer: Buffer.from('%PDF-demo', 'utf8'),
  };

  it('maps page 1 to PaginaImagen 0 and keeps NumeroPagina 1', () => {
    const xml = buildSignDocumentSoapEnvelope({
      ...baseInput,
      signOptions: {
        visible: true,
        page: 1,
        x: 150,
        y: 100,
        width: 160,
        height: 80,
      },
    });

    expect(xml).toContain(
      '<CoordenadaXInferiorizquierda>150</CoordenadaXInferiorizquierda>',
    );
    expect(xml).toContain(
      '<CoordenadaYInferiorizquierda>100</CoordenadaYInferiorizquierda>',
    );
    expect(xml).toContain(
      '<CoordenadaXSuperiorDerecha>310</CoordenadaXSuperiorDerecha>',
    );
    expect(xml).toContain(
      '<CoordenadaYSuperiorDerecha>180</CoordenadaYSuperiorDerecha>',
    );
    expect(xml).toContain('<PaginaImagen>0</PaginaImagen>');
    expect(xml).toContain('<NumeroPagina>1</NumeroPagina>');
  });

  it('maps page 2 to PaginaImagen 1 and NumeroPagina 2', () => {
    const xml = buildSignDocumentSoapEnvelope({
      ...baseInput,
      signOptions: {
        visible: true,
        page: 2,
        x: 10,
        y: 20,
        width: 30,
        height: 40,
      },
    });

    expect(xml).toContain('<PaginaImagen>1</PaginaImagen>');
    expect(xml).toContain('<NumeroPagina>2</NumeroPagina>');
  });

  it('serializes decimal PDF coordinates as integers for the SOAP contract', () => {
    const xml = buildSignDocumentSoapEnvelope({
      ...baseInput,
      signOptions: {
        visible: true,
        page: 2,
        x: 24,
        y: 16,
        width: 547.2756,
        height: 110.4,
      },
    });

    expect(xml).toContain(
      '<CoordenadaXInferiorizquierda>24</CoordenadaXInferiorizquierda>',
    );
    expect(xml).toContain(
      '<CoordenadaYInferiorizquierda>16</CoordenadaYInferiorizquierda>',
    );
    expect(xml).toContain(
      '<CoordenadaXSuperiorDerecha>571</CoordenadaXSuperiorDerecha>',
    );
    expect(xml).toContain(
      '<CoordenadaYSuperiorDerecha>126</CoordenadaYSuperiorDerecha>',
    );
  });
});
