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
      body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.signserver.esign.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:descargaCertCreaConfPinFirma>
      <requestDescargaConf>
        <encabezado>
          <user>${xmlEscape(this.config.providerCertDownloadUser)}</user>
          <password>${xmlEscape(this.config.providerCertDownloadPassword)}</password>
          <pinFirma>${xmlEscape(this.config.providerPinFirma)}</pinFirma>
        </encabezado>
        <datosDescarga>
          <pin>${xmlEscape(input.downloadPin)}</pin>
          <nroSolicitud>${xmlEscape(input.nroSolicitud)}</nroSolicitud>
          <clave>${xmlEscape(this.config.defaultCertificatePassword)}</clave>
          <tipoCertificado>${xmlEscape(this.config.providerCertType)}</tipoCertificado>
        </datosDescarga>
        <parametro>
          <rutEmpresa>${xmlEscape(this.config.providerRutEmpresa)}</rutEmpresa>
          <usuarioLogin>${xmlEscape(this.config.providerUsername)}</usuarioLogin>
          <posicionImagenXInferiorIzquierda>${xmlEscape(input.signOptions.x)}</posicionImagenXInferiorIzquierda>
          <posicionImagenYInferiorIzquierda>${xmlEscape(input.signOptions.y)}</posicionImagenYInferiorIzquierda>
          <posicionImagenXSuperiorDerecha>${xmlEscape(
            input.signOptions.x !== undefined &&
              input.signOptions.width !== undefined
              ? input.signOptions.x + input.signOptions.width
              : '',
          )}</posicionImagenXSuperiorDerecha>
          <posicionImagenYSuperiorDerecha>${xmlEscape(
            input.signOptions.y !== undefined &&
              input.signOptions.height !== undefined
              ? input.signOptions.y + input.signOptions.height
              : '',
          )}</posicionImagenYSuperiorDerecha>
          <paginaImagen>${xmlEscape(
            input.signOptions.page ? input.signOptions.page - 1 : '',
          )}</paginaImagen>
          <codigoQR>false</codigoQR>
          <posicionXCodigoQR></posicionXCodigoQR>
          <posicionYCodigoQR></posicionYCodigoQR>
          <urlVerificacion></urlVerificacion>
          <posicionXUrlVerificacion></posicionXUrlVerificacion>
          <posicionYUrlVerificacion></posicionYUrlVerificacion>
          <agregarSello>false</agregarSello>
          <posicionXSello></posicionXSello>
          <posicionYSello></posicionYSello>
          <selloDefault></selloDefault>
          <imagenPDFB64>${xmlEscape(
            input.imageBuffer ? input.imageBuffer.toString('base64') : '',
          )}</imagenPDFB64>
        </parametro>
      </requestDescargaConf>
    </ws:descargaCertCreaConfPinFirma>
  </soapenv:Body>
</soapenv:Envelope>`,
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
