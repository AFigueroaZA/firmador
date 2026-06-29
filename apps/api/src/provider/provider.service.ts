import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type {
  ChallengePayload,
  ExternalIdentitySummary,
  SignOptions,
} from '@firmador/shared';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { loadAppConfig } from '../config/app.config';
import { CertificateClient } from './clients/certificate.client';
import { ChallengeClient } from './clients/challenge.client';
import { ClaveUnicaClient } from './clients/clave-unica.client';
import { DocumentExchangeClient } from './clients/document-exchange.client';
import { RaClient } from './clients/ra.client';
import type {
  AuthorizationCompletionResult,
  ExternalProfile,
  AuthorizationResult,
  ProviderContext,
  ProviderStageResult,
  SignDocumentResult,
} from './types';
import {
  normalizeProfileForChallenge,
  normalizeProfileForRa,
} from './utils/provider-normalization';

@Injectable()
export class ProviderService {
  private readonly config = loadAppConfig();

  constructor(
    private readonly claveUnicaClient: ClaveUnicaClient,
    private readonly challengeClient: ChallengeClient,
    private readonly raClient: RaClient,
    private readonly certificateClient: CertificateClient,
    private readonly documentExchangeClient: DocumentExchangeClient,
  ) {}

  async createAuthorization(input: {
    processId: string;
    state: string;
    successRedirect: string;
    failedRedirect: string;
  }): Promise<AuthorizationResult> {
    if (this.config.signingProviderMode === 'mock') {
      return {
        state: input.state,
        redirectUrl: `${this.config.apiBaseUrl}/api/provider/clave-unica/callback?state=${encodeURIComponent(
          input.state,
        )}&code=mock-${input.processId}`,
        providerContext: {
          claveCode: `mock-${input.processId}`,
        },
        auditMeta: { provider: 'mock', stage: 'authorization' },
      };
    }

    const result = await this.claveUnicaClient.requestAuthorizationCode({
      successRedirect: input.successRedirect,
      failedRedirect: input.failedRedirect,
    });
    return {
      state: input.state,
      redirectUrl: result.redirectUrl,
      providerContext: { claveCode: result.code },
      auditMeta: { provider: 'live', stage: 'authorization', raw: result.raw },
    };
  }

  async completeAuthorization(input: {
    callbackCode?: string;
    providerContext?: ProviderContext | null;
  }): Promise<AuthorizationCompletionResult> {
    if (this.config.signingProviderMode === 'mock') {
      const identity: ExternalIdentitySummary = {
        run: '11.111.111-1',
        fullName: 'Usuario Mock Firmador',
        email: 'mock@firmador.local',
      };
      return {
        identity,
        challenge: {
          idChallenge: `mock-challenge-${randomUUID()}`,
          questions: [1, 2, 3, 4].map((id) => ({
            id,
            prompt: `Pregunta mock ${id}`,
            options: [1, 2, 3, 4, 5],
          })),
        },
        providerContext: {
          ...input.providerContext,
          claveCode: input.callbackCode ?? input.providerContext?.claveCode,
          challengeToken: 'mock-token',
          idValidation: `mock-validation-${randomUUID()}`,
          externalProfile: {
            rut: identity.run,
            numeroDocumento: '00000000',
            nombres: 'Usuario Mock',
            apellidoPaterno: 'Firmador',
            apellidoMaterno: 'Demo',
            email: identity.email ?? '',
            telefono: '56911111111',
          },
        },
        auditMeta: { provider: 'mock', stage: 'external-auth' },
      };
    }

    const callbackCode = input.callbackCode ?? input.providerContext?.claveCode;
    if (!callbackCode) {
      throw new Error('Callback code is required for live mode.');
    }

    const tokenResult = await this.claveUnicaClient.exchangeToken(callbackCode);
    const userInfo = await this.claveUnicaClient.getUserInfo({
      accessToken: tokenResult.accessToken,
      code: callbackCode,
    });
    const externalProfile = this.mergeExternalProfileOverrides(
      userInfo.profile,
      input.providerContext?.externalProfileOverrides,
    );
    this.assertChallengeProfileComplete(externalProfile);
    const challengeToken = await this.challengeClient.generateToken();
    const challenge = await this.challengeClient.createChallenge(
      normalizeProfileForChallenge(externalProfile),
      challengeToken.token,
    );

    return {
      identity: {
        run: userInfo.profile.rut,
        fullName: [
          externalProfile.nombres,
          externalProfile.apellidoPaterno,
          externalProfile.apellidoMaterno,
        ]
          .filter(Boolean)
          .join(' '),
        email: externalProfile.email,
      },
      challenge: {
        idChallenge: challenge.idChallenge,
        questions: challenge.questions,
      },
      providerContext: {
        ...(input.providerContext ?? {}),
        claveCode: callbackCode,
        claveAccessToken: tokenResult.accessToken,
        challengeToken: challengeToken.token,
        idChallenge: challenge.idChallenge,
        idValidation: challenge.idValidation,
        externalProfile,
      },
      auditMeta: {
        provider: 'live',
        stage: 'external-auth',
        tokenExchange: tokenResult.raw,
        userInfo: userInfo.raw,
        challenge: challenge.raw,
      },
    };
  }

  async submitChallenge(input: {
    payload: ChallengePayload;
    providerContext: ProviderContext;
  }): Promise<ProviderStageResult> {
    if (this.config.signingProviderMode === 'mock') {
      return {
        providerContext: {
          ...input.providerContext,
          idValidation:
            input.providerContext.idValidation ??
            `mock-validation-${randomUUID()}`,
        },
        auditMeta: { provider: 'mock', stage: 'challenge' },
      };
    }

    const challengeToken = input.providerContext.challengeToken;
    if (!challengeToken) {
      throw new Error('Challenge token is missing.');
    }

    const result = await this.challengeClient.answerChallenge(
      input.payload,
      challengeToken,
    );

    return {
      providerContext: {
        ...input.providerContext,
        idValidation: result.idValidation ?? input.providerContext.idValidation,
      },
      auditMeta: { provider: 'live', stage: 'challenge', raw: result.raw },
    };
  }

  async createRaRequest(input: {
    providerContext: ProviderContext;
  }): Promise<ProviderStageResult> {
    if (this.config.signingProviderMode === 'mock') {
      return {
        providerContext: {
          ...input.providerContext,
          nroSolicitud: `mock-request-${Date.now()}`,
          downloadPin: '4jyQ00',
        },
        auditMeta: { provider: 'mock', stage: 'ra' },
      };
    }

    if (
      !input.providerContext.externalProfile ||
      !input.providerContext.idValidation
    ) {
      throw new Error('Provider context is incomplete for RA request.');
    }

    const result = await this.raClient.createRequest({
      profile: normalizeProfileForRa(input.providerContext.externalProfile),
      idValidation: input.providerContext.idValidation,
    });

    return {
      providerContext: {
        ...input.providerContext,
        nroSolicitud: result.nroSolicitud,
        downloadPin: result.downloadPin,
      },
      auditMeta: { provider: 'live', stage: 'ra', raw: result.raw },
    };
  }

  async downloadCertificate(input: {
    providerContext: ProviderContext;
    signOptions: SignOptions;
    imageBuffer?: Buffer | null;
  }): Promise<ProviderStageResult> {
    if (this.config.signingProviderMode === 'mock') {
      return {
        providerContext: {
          ...input.providerContext,
          pinFirma: this.config.providerPinFirma,
          configurationName: 'mock-config',
        },
        auditMeta: { provider: 'mock', stage: 'certificate' },
      };
    }

    if (
      !input.providerContext.nroSolicitud ||
      !input.providerContext.downloadPin
    ) {
      throw new Error(
        'Provider context is incomplete for certificate download.',
      );
    }

    const result = await this.certificateClient.downloadAndConfigure({
      nroSolicitud: input.providerContext.nroSolicitud,
      downloadPin: input.providerContext.downloadPin,
      signOptions: input.signOptions,
      imageBuffer: input.imageBuffer,
    });

    return {
      providerContext: {
        ...input.providerContext,
        pinFirma: result.pinFirma,
        configurationName: result.configurationName,
      },
      auditMeta: { provider: 'live', stage: 'certificate', raw: result.raw },
    };
  }

  async signDocument(input: {
    providerContext: ProviderContext;
    fileName: string;
    pdfBuffer: Buffer;
    signOptions: SignOptions;
    imageBuffer?: Buffer | null;
  }): Promise<SignDocumentResult> {
    if (this.config.signingProviderMode === 'mock') {
      return {
        signedPdfBuffer: await this.createMockSignedPdf(
          input.pdfBuffer,
          input.signOptions,
          input.imageBuffer,
        ),
        providerContext: input.providerContext,
        auditMeta: { provider: 'mock', stage: 'signing' },
      };
    }

    const result = await this.documentExchangeClient.signDocument({
      fileName: input.fileName,
      pdfBuffer: input.pdfBuffer,
      signOptions: input.signOptions,
      configurationName: input.providerContext.configurationName,
      pinFirma: input.providerContext.pinFirma,
    });

    return {
      signedPdfBuffer: result.signedPdfBuffer,
      providerContext: input.providerContext,
      auditMeta: { provider: 'live', stage: 'signing', raw: result.raw },
    };
  }

  private async createMockSignedPdf(
    pdfBuffer: Buffer,
    signOptions: SignOptions,
    imageBuffer?: Buffer | null,
  ) {
    const pdfDocument = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });

    if (
      signOptions.visible &&
      signOptions.page !== undefined &&
      signOptions.x !== undefined &&
      signOptions.y !== undefined &&
      signOptions.width !== undefined &&
      signOptions.height !== undefined
    ) {
      const page = pdfDocument.getPage(signOptions.page - 1);
      const font = await pdfDocument.embedFont(StandardFonts.HelveticaBold);

      page.drawRectangle({
        x: signOptions.x,
        y: signOptions.y,
        width: signOptions.width,
        height: signOptions.height,
        color: rgb(0.9, 0.96, 1),
        borderColor: rgb(0.06, 0.43, 0.75),
        borderWidth: 1.5,
        opacity: 0.45,
      });

      const embeddedImage = imageBuffer
        ? await this.tryEmbedMockImage(pdfDocument, imageBuffer)
        : null;
      if (embeddedImage) {
        const imageScale = Math.min(
          signOptions.width / embeddedImage.width,
          signOptions.height / embeddedImage.height,
        );
        const imageWidth = embeddedImage.width * imageScale;
        const imageHeight = embeddedImage.height * imageScale;
        page.drawImage(embeddedImage, {
          x: signOptions.x + (signOptions.width - imageWidth) / 2,
          y: signOptions.y + (signOptions.height - imageHeight) / 2,
          width: imageWidth,
          height: imageHeight,
        });
      } else {
        const text = 'Firmado mock';
        page.drawText(text, {
          x: signOptions.x + 8,
          y: signOptions.y + Math.max(8, signOptions.height / 2 - 5),
          size: Math.min(12, Math.max(8, signOptions.height / 5)),
          font,
          color: rgb(0.06, 0.43, 0.75),
        });
      }
    }

    const signedBytes = await pdfDocument.save({ useObjectStreams: false });
    return Buffer.from(signedBytes);
  }

  private async tryEmbedMockImage(
    pdfDocument: PDFDocument,
    imageBuffer: Buffer,
  ) {
    try {
      return await pdfDocument.embedPng(imageBuffer);
    } catch {
      try {
        return await pdfDocument.embedJpg(imageBuffer);
      } catch {
        return null;
      }
    }
  }

  private mergeExternalProfileOverrides(
    profile: ExternalProfile,
    overrides: ProviderContext['externalProfileOverrides'],
  ): ExternalProfile {
    if (!overrides) {
      return profile;
    }

    return {
      ...profile,
      numeroDocumento: overrides.numeroDocumento ?? profile.numeroDocumento,
      fechaNacimiento: overrides.fechaNacimiento ?? profile.fechaNacimiento,
      estadoCivil: overrides.estadoCivil ?? profile.estadoCivil,
      telefono: overrides.telefono ?? profile.telefono,
    };
  }

  private assertChallengeProfileComplete(profile: ExternalProfile) {
    const requiredFields: Array<keyof ExternalProfile> = [
      'rut',
      'numeroDocumento',
      'nombres',
      'apellidoPaterno',
      'apellidoMaterno',
      'email',
      'fechaNacimiento',
      'estadoCivil',
      'telefono',
    ];
    const missing = requiredFields.filter((field) => !profile[field]);

    if (missing.length > 0) {
      throw new Error(
        `Challenge profile is incomplete. Missing fields: ${missing.join(', ')}.`,
      );
    }
  }
}
