import { BadGatewayException, Injectable } from '@nestjs/common';
import { loadAppConfig } from '../../config/app.config';
import {
  coerceString,
  deepFindValue,
  normalizeExternalProfile,
} from '../utils/provider-response.util';

@Injectable()
export class ClaveUnicaClient {
  private readonly config = loadAppConfig();

  async requestAuthorizationCode(input: {
    successRedirect: string;
    failedRedirect: string;
  }) {
    const response = await fetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/request`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify(input),
      },
    );

    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!response.ok) {
      throw new BadGatewayException('ClaveUnica authorization request failed.');
    }

    const code =
      coerceString(deepFindValue(data, ['code', 'codigo', 'tokenCode'])) ?? '';
    if (!code) {
      throw new BadGatewayException(
        'ClaveUnica did not return an authorization code.',
      );
    }

    const redirectUrl =
      coerceString(
        deepFindValue(data, ['authorizationUrl', 'url', 'redirectUrl']),
      ) ??
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/${encodeURIComponent(
        code,
      )}/authorize`;

    return { code, redirectUrl, raw: data };
  }

  async exchangeToken(code: string) {
    const response = await fetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/tokens/${encodeURIComponent(
        code,
      )}`,
      {
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
      },
    );
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw new BadGatewayException('ClaveUnica access token exchange failed.');
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

    return { accessToken, raw: data };
  }

  async getUserInfo(input: { accessToken: string; code: string }) {
    const response = await fetch(
      `${this.config.providerClaveUnicaBaseUrl}/api/v1/users/info`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json;charset=UTF-8' },
        body: JSON.stringify(input),
      },
    );
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw new BadGatewayException('ClaveUnica user lookup failed.');
    }

    return {
      profile: normalizeExternalProfile(data),
      raw: data,
    };
  }
}
