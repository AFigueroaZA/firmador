import { BadGatewayException, Injectable } from '@nestjs/common';
import type { SignOptions } from '@firmador/shared';
import { XMLParser } from 'fast-xml-parser';
import { loadAppConfig } from '../../config/app.config';
import {
  coerceString,
  deepFindValue,
  xmlEscape,
} from '../utils/provider-response.util';

@Injectable()
export class DocumentExchangeClient {
  private readonly config = loadAppConfig();
  private readonly parser = new XMLParser({ ignoreAttributes: false });

  async signDocument(input: {
    fileName: string;
    pdfBuffer: Buffer;
    signOptions: SignOptions;
    configurationName?: string;
    pinFirma?: string;
  }) {
    const url = `${this.config.providerEsignerUrl}/WSIntercambiaDocSoap`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
      },
      body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.signserver.esign.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:intercambiaDocCoorPDFTSAPin>
      <Encabezado>
        <User>${xmlEscape(this.config.providerUsername)}</User>
        <Password>${xmlEscape(this.config.providerPassword)}</Password>
        <NombreConfiguracion>${xmlEscape(input.configurationName ?? '')}</NombreConfiguracion>
        <PinFirma>${xmlEscape(input.pinFirma ?? this.config.providerPinFirma)}</PinFirma>
      </Encabezado>
      <Parametro>
        <Documento>${xmlEscape(input.pdfBuffer.toString('base64'))}</Documento>
        <NombreDocumento>${xmlEscape(input.fileName)}</NombreDocumento>
        <MetaData></MetaData>
        <UtilizaImagen>${xmlEscape(input.signOptions.visible)}</UtilizaImagen>
        <ImagenDinamica>${xmlEscape(input.signOptions.visible)}</ImagenDinamica>
        <CoordenadaXInferiorizquierda>${xmlEscape(input.signOptions.x)}</CoordenadaXInferiorizquierda>
        <CoordenadaYInferiorizquierda>${xmlEscape(input.signOptions.y)}</CoordenadaYInferiorizquierda>
        <CoordenadaXSuperiorDerecha>${xmlEscape(
          input.signOptions.x !== undefined &&
            input.signOptions.width !== undefined
            ? input.signOptions.x + input.signOptions.width
            : '',
        )}</CoordenadaXSuperiorDerecha>
        <CoordenadaYSuperiorDerecha>${xmlEscape(
          input.signOptions.y !== undefined &&
            input.signOptions.height !== undefined
            ? input.signOptions.y + input.signOptions.height
            : '',
        )}</CoordenadaYSuperiorDerecha>
        <PaginaImagen>${xmlEscape(
          input.signOptions.page ? input.signOptions.page - 1 : 0,
        )}</PaginaImagen>
        <UtilizaTSA>false</UtilizaTSA>
        <NumeroPagina>${xmlEscape(input.signOptions.page ?? 1)}</NumeroPagina>
      </Parametro>
    </ws:intercambiaDocCoorPDFTSAPin>
  </soapenv:Body>
</soapenv:Envelope>`,
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new BadGatewayException('Document signing exchange failed.');
    }

    const data = this.parser.parse(rawText) as Record<string, unknown>;
    const base64Document =
      coerceString(
        deepFindValue(data, [
          'Documento',
          'documento',
          'documentoFirmado',
          'return',
        ]),
      ) ?? '';

    if (!base64Document.startsWith('JVBER')) {
      throw new BadGatewayException(
        'Signing response did not include a PDF payload.',
      );
    }

    return {
      signedPdfBuffer: Buffer.from(base64Document, 'base64'),
      raw: data,
    };
  }
}
