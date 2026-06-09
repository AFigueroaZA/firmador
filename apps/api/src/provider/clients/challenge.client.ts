import { BadGatewayException, Injectable } from '@nestjs/common';
import type { ChallengePayload } from '@firmador/shared';
import { loadAppConfig } from '../../config/app.config';
import type { ExternalProfile } from '../types';
import {
  coerceString,
  deepFindValue,
  normalizeChallengeQuestions,
} from '../utils/provider-response.util';

@Injectable()
export class ChallengeClient {
  private readonly config = loadAppConfig();

  private readonly apiHeaders = {
    'X-API-APP': this.config.providerUsername,
    'X-API-KEY': this.config.providerPassword,
  };

  async generateToken() {
    const response = await fetch(
      `${this.config.providerChallengeBaseUrl}/tokens/generarToken`,
      {
        headers: this.apiHeaders,
      },
    );
    const rawText = await response.text();
    if (!response.ok) {
      throw new BadGatewayException('Challenge token generation failed.');
    }

    try {
      const parsed = JSON.parse(rawText) as Record<string, unknown>;
      const token =
        coerceString(deepFindValue(parsed, ['token', 'accessToken'])) ?? '';
      if (token) {
        return { token, raw: parsed };
      }
    } catch {
      // Some deployments respond with plain text.
    }

    return { token: rawText.trim(), raw: rawText.trim() };
  }

  async createChallenge(profile: ExternalProfile, bearerToken: string) {
    const response = await fetch(
      `${this.config.providerChallengeBaseUrl}/validacionChallenge/ingresoValidacionChallenge`,
      {
        method: 'POST',
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
          Authorization: this.authorizationHeader(bearerToken),
        },
        body: JSON.stringify(profile),
      },
    );
    const data = await this.parseProviderResponse(response);

    if (!response.ok) {
      throw new BadGatewayException(
        `Challenge creation failed with status ${response.status}.`,
      );
    }

    const idChallenge =
      coerceString(deepFindValue(data, ['idChallenge', 'id', 'challengeId'])) ??
      '';

    if (!idChallenge) {
      throw new BadGatewayException(
        'Challenge response did not include an id.',
      );
    }

    return {
      idChallenge,
      idValidation: coerceString(
        deepFindValue(data, ['idValidacion', 'idValidation', 'validationId']),
      ),
      questions: normalizeChallengeQuestions(data),
      raw: data,
    };
  }

  async answerChallenge(payload: ChallengePayload, bearerToken: string) {
    const response = await fetch(
      `${this.config.providerChallengeBaseUrl}/validacionChallenge/respuestaValidacionChallenge`,
      {
        method: 'POST',
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
          Authorization: this.authorizationHeader(bearerToken),
        },
        body: JSON.stringify({
          idChallenge: payload.idChallenge,
          respuestas: payload.answers.map((answer) => ({
            pregunta: answer.question,
            respuesta: answer.answer,
          })),
        }),
      },
    );
    const data = await this.parseProviderResponse(response);

    if (!response.ok) {
      throw new BadGatewayException(
        `Challenge verification failed with status ${response.status}.`,
      );
    }

    const resultValue = coerceString(
      deepFindValue(data, ['resultado', 'status', 'estado', 'ok']),
    );
    if (resultValue && ['false', '0', 'error'].includes(resultValue)) {
      throw new BadGatewayException('Challenge verification was rejected.');
    }

    return {
      idValidation: coerceString(
        deepFindValue(data, ['idValidacion', 'idValidation', 'validationId']),
      ),
      raw: data,
    };
  }

  private authorizationHeader(token: string) {
    return token.toLowerCase().startsWith('bearer ')
      ? token
      : `Bearer ${token}`;
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
