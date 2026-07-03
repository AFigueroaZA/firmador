import { BadGatewayException, Injectable } from '@nestjs/common';
import type { SignOptions } from '@firmador/shared';
import { XMLParser } from 'fast-xml-parser';
import { loadAppConfig } from '../../config/app.config';
import {
  coerceString,
  deepFindValue,
  xmlEscape,
} from '../utils/provider-response.util';

interface CertificateConfigSoapInput {
  certDownloadUser: string;
  certDownloadPassword: string;
  pinFirma: string;
  downloadPin: string;
  nroSolicitud: string;
  certificatePassword: string;
  certType: string;
  rutEmpresa: string;
  username: string;
  qrEnabled: boolean;
  qrX?: string | number;
  qrY?: string | number;
  signOptions: SignOptions;
  imageBuffer?: Buffer | null;
}

export const buildCertificateConfigSoapEnvelope = (
  input: CertificateConfigSoapInput,
) => {
  const visibleValue = <T>(value: T | undefined) =>
    input.signOptions.visible ? value : undefined;
  const qrValue = <T>(value: T | undefined) =>
    input.qrEnabled ? value : undefined;

  return `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.signserver.esign.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:descargaCertCreaConfPinFirma>
      <requestDescargaConf>
        <encabezado>
          <user>${xmlEscape(input.certDownloadUser)}</user>
          <password>${xmlEscape(input.certDownloadPassword)}</password>
          <pinFirma>${xmlEscape(input.pinFirma)}</pinFirma>
        </encabezado>
        <datosDescarga>
          <pin>${xmlEscape(input.downloadPin)}</pin>
          <nroSolicitud>${xmlEscape(input.nroSolicitud)}</nroSolicitud>
          <clave>${xmlEscape(input.certificatePassword)}</clave>
          <tipoCertificado>${xmlEscape(input.certType)}</tipoCertificado>
        </datosDescarga>
        <parametro>
          <rutEmpresa>${xmlEscape(input.rutEmpresa)}</rutEmpresa>
          <usuarioLogin>${xmlEscape(input.username)}</usuarioLogin>
          <posicionImagenXInferiorIzquierda>${xmlEscape(visibleValue(input.signOptions.x))}</posicionImagenXInferiorIzquierda>
          <posicionImagenYInferiorIzquierda>${xmlEscape(visibleValue(input.signOptions.y))}</posicionImagenYInferiorIzquierda>
          <posicionImagenXSuperiorDerecha>${xmlEscape(
            input.signOptions.visible &&
              input.signOptions.x !== undefined &&
              input.signOptions.width !== undefined
              ? input.signOptions.x + input.signOptions.width
              : '',
          )}</posicionImagenXSuperiorDerecha>
          <posicionImagenYSuperiorDerecha>${xmlEscape(
            input.signOptions.visible &&
              input.signOptions.y !== undefined &&
              input.signOptions.height !== undefined
              ? input.signOptions.y + input.signOptions.height
              : '',
          )}</posicionImagenYSuperiorDerecha>
          <paginaImagen>${xmlEscape(
            input.signOptions.visible && input.signOptions.page
              ? input.signOptions.page - 1
              : '',
          )}</paginaImagen>
          <codigoQR>${xmlEscape(input.qrEnabled)}</codigoQR>
          <posicionXCodigoQR>${xmlEscape(qrValue(input.qrX))}</posicionXCodigoQR>
          <posicionYCodigoQR>${xmlEscape(qrValue(input.qrY))}</posicionYCodigoQR>
          <urlVerificacion></urlVerificacion>
          <posicionXUrlVerificacion></posicionXUrlVerificacion>
          <posicionYUrlVerificacion></posicionYUrlVerificacion>
          <agregarSello>false</agregarSello>
          <posicionXSello></posicionXSello>
          <posicionYSello></posicionYSello>
          <selloDefault></selloDefault>
          <imagenPDFB64>${xmlEscape(
            input.signOptions.visible && input.imageBuffer
              ? input.imageBuffer.toString('base64')
              : '',
          )}</imagenPDFB64>
        </parametro>
      </requestDescargaConf>
    </ws:descargaCertCreaConfPinFirma>
  </soapenv:Body>
</soapenv:Envelope>`;
};

@Injectable()
export class CertificateClient {
  private readonly config = loadAppConfig();
  private readonly parser = new XMLParser({ ignoreAttributes: false });

  async downloadAndConfigure(input: {
    nroSolicitud: string;
    downloadPin: string;
    signOptions: SignOptions;
    imageBuffer?: Buffer | null;
  }) {
    const url = `${this.config.providerEsignerUrl}/WSDescargaCertificadoConfPinFirma`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
      },
      body: buildCertificateConfigSoapEnvelope({
        certDownloadUser: this.config.providerCertDownloadUser,
        certDownloadPassword: this.config.providerCertDownloadPassword,
        pinFirma: this.config.providerPinFirma,
        downloadPin: input.downloadPin,
        nroSolicitud: input.nroSolicitud,
        certificatePassword: this.config.defaultCertificatePassword,
        certType: this.config.providerCertType,
        rutEmpresa: this.config.providerRutEmpresa,
        username: this.config.providerUsername,
        qrEnabled: this.config.providerQrEnabled,
        qrX: this.config.providerQrX,
        qrY: this.config.providerQrY,
        signOptions: input.signOptions,
        imageBuffer: input.imageBuffer,
      }),
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new BadGatewayException(
        'Certificate download/configuration failed.',
      );
    }

    const data = this.parser.parse(rawText) as Record<string, unknown>;
    return {
      pinFirma:
        coerceString(deepFindValue(data, ['pinFirma', 'PinFirma'])) ??
        this.config.providerPinFirma,
      configurationName: coerceString(
        deepFindValue(data, [
          'nombreConfiguracion',
          'NombreConfiguracion',
          'configuracion',
        ]),
      ),
      raw: data,
    };
  }
}
