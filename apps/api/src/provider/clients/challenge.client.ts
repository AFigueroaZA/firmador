import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import type { ChallengePayload } from '@firmador/shared';
import { loadAppConfig } from '../../config/app.config';
import type { ExternalProfile } from '../types';
import { providerFetch } from '../utils/provider-http';
import {
  coerceString,
  deepFindValue,
  extractChallengeQuestions,
  normalizeChallengeQuestions,
} from '../utils/provider-response.util';

@Injectable()
export class ChallengeClient {
  private readonly config = loadAppConfig();
  private readonly logger = new Logger(ChallengeClient.name);

  private readonly apiHeaders = {
    'X-API-APP': this.config.providerUsername,
    'X-API-KEY': this.config.providerPassword,
  };

  async generateToken() {
    const response = await providerFetch(
      `${this.config.providerChallengeBaseUrl}/tokens/generarToken`,
      {
        headers: this.apiHeaders,
      },
    );
    const rawText = await response.text();
    if (!response.ok) {
      throw new BadGatewayException(
        `Challenge token generation failed with status ${response.status}: ${rawText.slice(0, 500)}`,
      );
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
    const response = await providerFetch(
      `${this.config.providerChallengeBaseUrl}/validacionChallenge/ingresoValidacionChallenge`,
      {
        method: 'POST',
        headers: {
          ...this.apiHeaders,
          'Content-Type': 'application/json;charset=UTF-8',
          Authorization: this.authorizationHeader(bearerToken),
        },
        // Send exactly the fields the provider contract expects.
        body: JSON.stringify({
          rut: profile.rut,
          numeroDocumento: profile.numeroDocumento,
          nombres: profile.nombres,
          apellidoPaterno: profile.apellidoPaterno,
          apellidoMaterno: profile.apellidoMaterno,
          email: profile.email,
          fechaNacimiento: profile.fechaNacimiento,
          estadoCivil: profile.estadoCivil,
          telefono: profile.telefono,
        }),
      },
    );
    const data = await this.parseProviderResponse(response);

    if (!response.ok) {
      throw new BadGatewayException(
        `Challenge creation failed with status ${response.status}: ${this.describeProviderError(data)}`,
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

    if (!extractChallengeQuestions(data)) {
      // Surface the raw payload so unrecognized question shapes can be mapped.
      this.logger.warn(
        `Challenge questions could not be parsed from the provider response; showing generic placeholders. Raw payload: ${JSON.stringify(
          data,
        ).slice(0, 4000)}`,
      );
    }

    const idValidation = coerceString(
      deepFindValue(data, ['idValidacion', 'idValidation', 'validationId']),
    );
    if (!idValidation) {
      // The RA needs this id comma-joined with the answer validation id.
      this.logger.warn(
        `ingresoValidacionChallenge returned no idValidacion; top-level keys: ${JSON.stringify(
          data && typeof data === 'object' ? Object.keys(data) : typeof data,
        )}`,
      );
    }

    return {
      idChallenge,
      idValidation,
      questions: normalizeChallengeQuestions(data),
      raw: data,
    };
  }

  async answerChallenge(payload: ChallengePayload, bearerToken: string) {
    const response = await providerFetch(
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
        `Challenge verification failed with status ${response.status}: ${this.describeProviderError(data)}`,
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

  private describeProviderError(data: unknown) {
    if (typeof data === 'string') {
      return data.slice(0, 500);
    }
    try {
      return JSON.stringify(data).slice(0, 500);
    } catch {
      return 'unparseable provider response';
    }
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
