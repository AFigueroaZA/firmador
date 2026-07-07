import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { loadAppConfig } from '../../config/app.config';
import { providerFetch } from '../utils/provider-http';
import {
  coerceString,
  deepFindValue,
  describePayloadShape,
  normalizeExternalProfile,
} from '../utils/provider-response.util';

@Injectable()
export class ClaveUnicaClient {
  private readonly config = loadAppConfig();
  private readonly logger = new Logger(ClaveUnicaClient.name);

  private readonly apiHeaders = {
    'X-API-APP': this.config.providerUsername,
    'X-API-KEY': this.config.providerPassword,
  };

  async requestAuthorizationCode(input: {
    successRedirect: string;
    failedRedirect: string;
  }) {
    const response = await providerFetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/request`,
      {
        method: 'POST',
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(input),
      },
    );

    const data = await this.parseProviderResponse(response);
    if (!response.ok) {
      throw new BadGatewayException(
        `ClaveUnica authorization request failed with status ${response.status}.`,
      );
    }

    const code =
      coerceString(deepFindValue(data, ['code', 'codigo', 'tokenCode'])) ?? '';
    if (!code) {
      throw new BadGatewayException(
        'ClaveUnica did not return an authorization code.',
      );
    }

    const authResponse = await providerFetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/${encodeURIComponent(
        code,
      )}/authorize`,
      {
        method: 'POST',
        headers: this.apiHeaders,
      },
    );
    const authData = await this.parseProviderResponse(authResponse);
    if (!authResponse.ok) {
      throw new BadGatewayException(
        `ClaveUnica authorization URL request failed with status ${authResponse.status}.`,
      );
    }

    const redirectUrl =
      coerceString(
        deepFindValue(authData, [
          'authorizationUrl',
          'url',
          'redirectUrl',
          'uri',
          'location',
        ]),
      ) ??
      coerceString(authData) ??
      '';

    if (!redirectUrl) {
      throw new BadGatewayException(
        'ClaveUnica did not return an authorization URL.',
      );
    }

    return { code, redirectUrl, raw: { token: data, authorization: authData } };
  }

  async exchangeToken(code: string) {
    const response = await providerFetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/${encodeURIComponent(
        code,
      )}`,
      {
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
        },
      },
    );
    const data = await this.parseProviderResponse(response);

    if (!response.ok) {
      throw new BadGatewayException(
        `ClaveUnica access token exchange failed with status ${response.status}.`,
      );
    }

    const accessToken =
      coerceString(
        deepFindValue(data, ['accessToken', 'access_token', 'token']),
      ) ?? '';

    if (!accessToken) {
      throw new BadGatewayException(
        'ClaveUnica did not return an access token.',
      );
    }

    // The token exchange is the most likely carrier of the ClaveUnica-side
    // validation id the RA needs (users/info proved to not include one).
    const idValidation = coerceString(
      deepFindValue(data, ['idValidacion', 'idValidation', 'validationId']),
    );
    if (!idValidation) {
      this.logger.warn(
        `ClaveUnica token exchange returned no idValidacion. Response shape: ${JSON.stringify(
          describePayloadShape(data),
        )}`,
      );
    }

    return { accessToken, idValidation, raw: data };
  }

  async getUserInfo(input: { accessToken: string; code: string }) {
    const response = await providerFetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/users/info`,
      {
        method: 'POST',
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
        },
        body: JSON.stringify(input),
      },
    );
    const data = await this.parseProviderResponse(response);

    if (!response.ok) {
      throw new BadGatewayException(
        `ClaveUnica user lookup failed with status ${response.status}.`,
      );
    }

    const profile = normalizeExternalProfile(data);
    if (!profile.rut || !profile.nombres || !profile.apellidoPaterno) {
      // Surface the raw payload so unexpected response shapes can be mapped.
      this.logger.warn(
        `ClaveUnica users/info response could not be fully normalized (rut=${
          profile.rut || 'EMPTY'
        }). Raw payload: ${JSON.stringify(data)}`,
      );
    }

    return {
      profile,
      raw: data,
    };
  }

  private async parseProviderResponse(response: Response): Promise<unknown> {
    const text = await response.text();
    if (!text) {
      return {};
    }

    try {
      return JSON.parse(text) as Record<string, unknown>;
    } catch {
      return text.trim();
    }
  }
}
