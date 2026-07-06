import { BadGatewayException, Injectable } from '@nestjs/common';
import { XMLParser } from 'fast-xml-parser';
import { loadAppConfig } from '../../config/app.config';
import type { ExternalProfile } from '../types';
import { providerFetch } from '../utils/provider-http';
import {
  coerceString,
  deepFindValue,
  xmlEscape,
} from '../utils/provider-response.util';

@Injectable()
export class RaClient {
  private readonly config = loadAppConfig();
  private readonly parser = new XMLParser({ ignoreAttributes: false });

  async createRequest(input: {
    profile: ExternalProfile;
    idValidation: string;
  }) {
    const response = await providerFetch(this.config.providerRaUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml;charset=UTF-8',
      },
      body: `<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ws="http://ws.backend.esign.com/">
  <soapenv:Header/>
  <soapenv:Body>
    <ws:ingresarSolicitud>
      <requestIngreso>
        <encabezado>
          <usuario>${xmlEscape(this.config.providerUsername)}</usuario>
          <clave>${xmlEscape(this.config.providerPassword)}</clave>
        </encabezado>
        <parametro>
          <nombres>${xmlEscape(input.profile.nombres)}</nombres>
          <apellidoPaterno>${xmlEscape(input.profile.apellidoPaterno)}</apellidoPaterno>
          <apellidoMaterno>${xmlEscape(input.profile.apellidoMaterno)}</apellidoMaterno>
          <email>${xmlEscape(input.profile.email)}</email>
          <rut>${xmlEscape(input.profile.rut)}</rut>
          <telefonoMovil>${xmlEscape(input.profile.telefono ?? '')}</telefonoMovil>
          <telefonoFijo></telefonoFijo>
          <direccion></direccion>
          <nroSerieCedula>${xmlEscape(input.profile.numeroDocumento)}</nroSerieCedula>
          <origen>${xmlEscape(this.config.providerOrigin)}</origen>
          <vigencia>${xmlEscape(this.config.certificateValidityDays)}</vigencia>
          <clave>${xmlEscape(this.config.defaultCertificatePassword)}</clave>
          <idValidacion>${xmlEscape(input.idValidation)}</idValidacion>
          <tipoCertificado>${xmlEscape(this.config.providerCertType)}</tipoCertificado>
          <estado>${xmlEscape(input.profile.estadoCivil ?? '')}</estado>
        </parametro>
      </requestIngreso>
    </ws:ingresarSolicitud>
  </soapenv:Body>
</soapenv:Envelope>`,
    });

    const rawText = await response.text();
    if (!response.ok) {
      throw new BadGatewayException(
        `RA certificate request failed with status ${response.status}: ${rawText.slice(0, 500)}`,
      );
    }

    const data = this.parser.parse(rawText) as Record<string, unknown>;
    const nroSolicitud =
      coerceString(deepFindValue(data, ['nroSolicitud', 'numeroSolicitud'])) ??
      '';
    if (!nroSolicitud) {
      // Surface the provider's business error (e.g. <descripcion>) instead
      // of a blind "missing nroSolicitud" so the UI/logs show the cause.
      const providerMessage = coerceString(
        deepFindValue(data, [
          'descripcion',
          'mensajeRespuesta',
          'mensaje',
          'glosa',
          'detalle',
          'faultstring',
          'error',
        ]),
      );
      throw new BadGatewayException(
        `RA request was not accepted: ${
          providerMessage ?? `unrecognized response: ${rawText.slice(0, 300)}`
        }`,
      );
    }

    return {
      nroSolicitud,
      downloadPin:
        coerceString(deepFindValue(data, ['pin', 'codigoDescarga'])) ?? '',
      raw: data,
    };
  }
}
