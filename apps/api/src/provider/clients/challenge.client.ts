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

  async generateToken() {
    const response = await fetch(
      `${this.config.providerChallengeBaseUrl}/tokens/generarToken`,
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
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
        },
        body: JSON.stringify(profile),
      },
    );
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw new BadGatewayException('Challenge creation failed.');
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
          'Content-Type': 'application/json',
          Authorization: `Bearer ${bearerToken}`,
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
    const data = (await response.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;

    if (!response.ok) {
      throw new BadGatewayException('Challenge verification failed.');
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
}
