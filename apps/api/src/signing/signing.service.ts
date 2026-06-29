import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  forwardRef,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChallengePayload,
  CreateSigningProcessResponse,
  PaymentEligibilityResponse,
  SigningProcessDetail,
  SigningProcessSummary,
} from '@firmador/shared';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Express } from 'express';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { statusToNextStep } from '../common/utils/signing-next-step';
import { loadAppConfig } from '../config/app.config';
import { DocumentsModule } from '../documents/documents.module';
import { DocumentStorageService } from '../documents/document-storage.service';
import { PdfValidationService } from '../documents/pdf-validation.service';
import { SealedPayloadService } from '../documents/sealed-payload.service';
import { IdentityService } from '../identity/identity.service';
import { ProviderService } from '../provider/provider.service';
import type {
  ExternalProfileOverrides,
  ProviderContext,
} from '../provider/types';
import { SignatureRegistrationEntity } from './entities/signature-registration.entity';
import {
  hasSignOptionFields,
  normalizeSignOptions,
  validateSignOptionsForPdf,
} from './sign-options';
import { SigningProcessEntity } from './entities/signing-process.entity';
import { mapProcessToDetail, mapProcessToSummary } from './signing.mapper';

@Injectable()
export class SigningService {
  private readonly config = loadAppConfig();

  constructor(
    @InjectRepository(SigningProcessEntity)
    private readonly processRepository: Repository<SigningProcessEntity>,
    @InjectRepository(SignatureRegistrationEntity)
    private readonly registrationRepository: Repository<SignatureRegistrationEntity>,
    private readonly pdfValidationService: PdfValidationService,
    private readonly fileStore: DocumentStorageService,
    private readonly sealedPayloadService: SealedPayloadService,
    private readonly auditService: AuditService,
    private readonly identityService: IdentityService,
    private readonly providerService: ProviderService,
  ) {
    void DocumentsModule;
    void forwardRef;
  }

  async createProcess(
    requestUser: RequestUser,
    pdfFile: Express.Multer.File | undefined,
    imageFile: Express.Multer.File | undefined,
    fields: Record<string, string | undefined>,
  ): Promise<CreateSigningProcessResponse> {
    if (!pdfFile) {
      throw new BadRequestException('A PDF file is required.');
    }

    const metadata = await this.pdfValidationService.validatePdf(
      pdfFile.buffer,
      pdfFile.mimetype,
    );
    const hasInitialSignOptions = hasSignOptionFields(fields);
    const externalProfileOverrides =
      this.normalizeExternalProfileOverrides(fields);
    const signOptions = hasInitialSignOptions
      ? normalizeSignOptions(
          fields,
          imageFile?.originalname,
          metadata.pdfMetadata,
        )
      : {
          visible: true,
          imageFileName: imageFile?.originalname,
        };

    const process = this.processRepository.create({
      userId: requestUser.id,
      status: 'UPLOADED',
      originalFileName: pdfFile.originalname,
      mimeType: metadata.mimeType,
      sizeBytes: metadata.sizeBytes,
      sha256: metadata.sha256,
      signOptions,
      pdfMetadata: metadata.pdfMetadata,
      originalStoragePath: '',
      signedStoragePath: null,
      signatureImageStoragePath: null,
      externalAuthState: null,
      externalIdentity: null,
      externalProfileOverrides,
      providerContextEncrypted: null,
      challenge: null,
      errorMessage: null,
      expiresAt: new Date(
        Date.now() + this.config.tempFileTtlHours * 60 * 60 * 1000,
      ),
      signedAt: null,
    });

    await this.processRepository.save(process);
    process.originalStoragePath = await this.fileStore.save(
      process.id,
      'original',
      pdfFile.buffer,
    );
    if (imageFile) {
      process.signatureImageStoragePath = await this.fileStore.save(
        process.id,
        'signature-image',
        imageFile.buffer,
      );
    }

    process.status = hasInitialSignOptions ? 'CONFIGURED' : 'UPLOADED';
    await this.processRepository.save(process);

    await this.auditService.record({
      processId: process.id,
      actorUserId: requestUser.id,
      actor: requestUser.email,
      type: 'PROCESS_CREATED',
      message: hasInitialSignOptions
        ? `PDF ${pdfFile.originalname} uploaded and prepared for signing.`
        : `PDF ${pdfFile.originalname} uploaded and awaiting signature placement.`,
      toStatus: process.status,
      meta: {
        mimeType: metadata.mimeType,
        sizeBytes: metadata.sizeBytes,
        sha256: metadata.sha256,
        pdfMetadata: metadata.pdfMetadata,
        signOptions,
        identityFields: Object.fromEntries(
          Object.entries(externalProfileOverrides ?? {}).map(([key, value]) => [
            key,
            Boolean(value),
          ]),
        ),
      },
    });

    return {
      processId: process.id,
      status: process.status,
      nextStep: statusToNextStep(process.status),
    };
  }

  async getProcessDetail(
    requestUser: RequestUser,
    processId: string,
  ): Promise<SigningProcessDetail> {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);
    const auditCount = await this.auditService
      .listForProcess(process.id)
      .then((events) => events.length);
    return mapProcessToDetail(process, auditCount);
  }

  async updateSignOptions(
    requestUser: RequestUser,
    processId: string,
    fields: Record<string, unknown>,
  ): Promise<SigningProcessDetail> {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (!['UPLOADED', 'CONFIGURED'].includes(process.status)) {
      throw new BadRequestException(
        'Signature placement can only be updated before authorization starts.',
      );
    }

    const signOptions = normalizeSignOptions(
      this.coerceSignOptionFields(fields),
      process.signOptions.imageFileName ?? undefined,
      process.pdfMetadata,
    );
    const fromStatus = process.status;
    process.signOptions = signOptions;
    process.status = 'CONFIGURED';
    await this.processRepository.save(process);

    await this.auditService.record({
      processId: process.id,
      actorUserId: requestUser.id,
      actor: requestUser.email,
      type: 'SIGN_OPTIONS_CONFIGURED',
      message: 'Visible signature placement was configured.',
      fromStatus,
      toStatus: process.status,
      meta: { signOptions },
    });

    return this.getProcessDetail(requestUser, process.id);
  }

  async listProcessSummaries(
    requestUser: RequestUser,
  ): Promise<SigningProcessSummary[]> {
    const where =
      requestUser.role === 'admin' ? {} : { userId: requestUser.id };
    const items = await this.processRepository.find({
      where,
      order: { createdAt: 'DESC' },
    });

    const aliveItems: SigningProcessSummary[] = [];
    for (const process of items) {
      if (this.isExpired(process) && process.status !== 'EXPIRED') {
        await this.expireProcess(
          process,
          'Process expired while listing history.',
        );
      }
      aliveItems.push(mapProcessToSummary(process));
    }
    return aliveItems;
  }

  async getAuthorizationUrl(requestUser: RequestUser, processId: string) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (process.status === 'UPLOADED') {
      throw new BadRequestException(
        'Configure signature placement before starting authorization.',
      );
    }

    validateSignOptionsForPdf(process.signOptions, process.pdfMetadata);

    const state = randomUUID();
    const successRedirect = `${this.config.apiBaseUrl}/api/provider/clave-unica/callback?state=${encodeURIComponent(
      state,
    )}`;
    const failedRedirect = `${this.config.apiBaseUrl}/api/provider/clave-unica/callback?state=${encodeURIComponent(
      state,
    )}&error=external_denied`;

    const result = await this.providerService.createAuthorization({
      processId: process.id,
      state,
      successRedirect,
      failedRedirect,
    });

    process.externalAuthState = state;
    process.providerContextEncrypted = this.sealedPayloadService.sealJson({
      ...((result.providerContext ?? {}) as Record<string, unknown>),
      externalProfileOverrides: process.externalProfileOverrides ?? undefined,
    });
    const fromStatus = process.status;
    process.status = 'EXTERNAL_AUTH_PENDING';
    await this.processRepository.save(process);

    await this.auditService.record({
      processId: process.id,
      actorUserId: requestUser.id,
      actor: requestUser.email,
      type: 'EXTERNAL_AUTH_STARTED',
      message: 'Authorization with external identity provider started.',
      fromStatus,
      toStatus: process.status,
      meta: {
        state,
        ...result.auditMeta,
      },
    });

    return { url: result.redirectUrl };
  }

  async getPaymentEligibility(
    requestUser: RequestUser,
    processId: string,
  ): Promise<PaymentEligibilityResponse> {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);
    const identity = await this.identityService.getStatus(requestUser);
    const eligible = identity.canSign && process.status === 'CONFIGURED';

    return {
      mode: this.config.signingProviderMode,
      eligible,
      costCredits: 1,
      availableCredits: eligible ? 1 : 0,
      message: eligible
        ? this.config.signingProviderMode === 'mock'
          ? 'Demo credit available for this signing process.'
          : 'Ready to start external provider authorization.'
        : 'Complete identity validation and signature placement before signing.',
    };
  }

  async startDemoSigning(requestUser: RequestUser, processId: string) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (this.config.signingProviderMode !== 'mock') {
      throw new BadRequestException(
        'Demo signing is only available in mock provider mode.',
      );
    }

    if (process.status === 'UPLOADED') {
      throw new BadRequestException(
        'Configure signature placement before signing.',
      );
    }

    if (process.status !== 'CONFIGURED') {
      throw new BadRequestException(
        'Demo signing can only start from a configured process.',
      );
    }

    validateSignOptionsForPdf(process.signOptions, process.pdfMetadata);
    await this.identityService.ensureCanSign(requestUser.id);
    const payment = await this.getPaymentEligibility(requestUser, process.id);
    if (!payment.eligible) {
      throw new BadRequestException(payment.message);
    }

    const registration = await this.getOrCreateMockRegistration(requestUser.id);
    const providerContext =
      this.sealedPayloadService.openJson<ProviderContext>(
        registration.providerContextEncrypted,
      ) ?? {};

    try {
      const previousStatus = process.status;
      process.status = 'SIGNING';
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actorUserId: requestUser.id,
        actor: requestUser.email,
        type: 'DEMO_PAYMENT_ACCEPTED',
        message: 'Demo credit accepted for signing.',
        fromStatus: previousStatus,
        toStatus: process.status,
        meta: {
          mode: payment.mode,
          costCredits: payment.costCredits,
          availableCredits: payment.availableCredits,
          signatureRegistrationId: registration.id,
        },
      });

      const imageBuffer = process.signatureImageStoragePath
        ? await this.fileStore.read(process.signatureImageStoragePath)
        : null;
      const originalPdf = await this.fileStore.read(
        process.originalStoragePath,
      );
      const signResult = await this.providerService.signDocument({
        providerContext,
        fileName: process.originalFileName,
        pdfBuffer: originalPdf,
        signOptions: process.signOptions,
        imageBuffer,
      });

      process.signedStoragePath = await this.fileStore.save(
        process.id,
        'signed',
        signResult.signedPdfBuffer,
      );
      process.providerContextEncrypted = this.sealedPayloadService.sealJson({
        ...providerContext,
        signatureRegistrationId: registration.id,
      });
      process.status = 'SIGNED';
      process.signedAt = new Date();
      process.errorMessage = null;
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'DOCUMENT_SIGNED',
        message: 'Signed PDF received from mock provider.',
        fromStatus: 'SIGNING',
        toStatus: 'SIGNED',
        meta: {
          ...signResult.auditMeta,
          signatureRegistrationId: registration.id,
        },
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected signing failure.';
      await this.failProcess(process, message, requestUser.email);
    }

    return this.getProcessDetail(requestUser, process.id);
  }

  async handleAuthorizationCallback(input: {
    state: string;
    code?: string;
    error?: string;
  }) {
    const process = await this.processRepository.findOne({
      where: { externalAuthState: input.state },
    });

    if (!process) {
      throw new NotFoundException(
        'Signing process for callback was not found.',
      );
    }
    await this.ensureNotExpired(process);

    if (input.error) {
      await this.failProcess(process, input.error, 'system');
      return `${this.config.webBaseUrl}/sign/${process.id}/result`;
    }

    const providerContext =
      this.sealedPayloadService.openJson<ProviderContext>(
        process.providerContextEncrypted,
      ) ?? {};
    const result = await this.providerService.completeAuthorization({
      callbackCode: input.code,
      providerContext,
    });

    process.externalIdentity = result.identity;
    process.providerContextEncrypted = this.sealedPayloadService.sealJson(
      result.providerContext as Record<string, unknown>,
    );

    process.status = 'EXTERNAL_AUTH_DONE';
    await this.processRepository.save(process);
    await this.auditService.record({
      processId: process.id,
      actor: 'system',
      type: 'EXTERNAL_AUTH_COMPLETED',
      message: 'External identity flow completed successfully.',
      fromStatus: 'EXTERNAL_AUTH_PENDING',
      toStatus: 'EXTERNAL_AUTH_DONE',
      meta: result.auditMeta,
    });

    process.challenge = result.challenge;
    process.status = 'CHALLENGE_PENDING';
    await this.processRepository.save(process);
    await this.auditService.record({
      processId: process.id,
      actor: 'system',
      type: 'CHALLENGE_READY',
      message: 'Challenge questions are ready for the operator.',
      fromStatus: 'EXTERNAL_AUTH_DONE',
      toStatus: 'CHALLENGE_PENDING',
      meta: { idChallenge: result.challenge.idChallenge },
    });

    return `${this.config.webBaseUrl}/sign/${process.id}/challenge`;
  }

  async submitChallenge(
    requestUser: RequestUser,
    processId: string,
    payload: ChallengePayload,
  ) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (process.status !== 'CHALLENGE_PENDING' || !process.challenge) {
      throw new BadRequestException('The process is not awaiting a challenge.');
    }

    if (payload.idChallenge !== process.challenge.idChallenge) {
      throw new BadRequestException('Challenge id does not match the process.');
    }

    const providerContext =
      this.sealedPayloadService.openJson<ProviderContext>(
        process.providerContextEncrypted,
      ) ?? {};

    try {
      process.status = 'RA_PENDING';
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actorUserId: requestUser.id,
        actor: requestUser.email,
        type: 'CHALLENGE_SUBMITTED',
        message: 'Challenge answers submitted.',
        fromStatus: 'CHALLENGE_PENDING',
        toStatus: 'RA_PENDING',
        meta: { answers: payload.answers.length },
      });

      const challengeResult = await this.providerService.submitChallenge({
        payload,
        providerContext,
      });

      const raResult = await this.providerService.createRaRequest({
        providerContext: challengeResult.providerContext,
      });
      process.status = 'CERT_PENDING';
      process.providerContextEncrypted = this.sealedPayloadService.sealJson(
        raResult.providerContext as Record<string, unknown>,
      );
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'RA_COMPLETED',
        message: 'RA request completed successfully.',
        fromStatus: 'RA_PENDING',
        toStatus: 'CERT_PENDING',
        meta: raResult.auditMeta,
      });

      const imageBuffer = process.signatureImageStoragePath
        ? await this.fileStore.read(process.signatureImageStoragePath)
        : null;
      const certificateResult = await this.providerService.downloadCertificate({
        providerContext: raResult.providerContext,
        signOptions: process.signOptions,
        imageBuffer,
      });
      process.status = 'SIGNING';
      process.providerContextEncrypted = this.sealedPayloadService.sealJson(
        certificateResult.providerContext as Record<string, unknown>,
      );
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'CERTIFICATE_READY',
        message: 'Certificate downloaded and configured.',
        fromStatus: 'CERT_PENDING',
        toStatus: 'SIGNING',
        meta: certificateResult.auditMeta,
      });

      const originalPdf = await this.fileStore.read(
        process.originalStoragePath,
      );
      const signResult = await this.providerService.signDocument({
        providerContext: certificateResult.providerContext,
        fileName: process.originalFileName,
        pdfBuffer: originalPdf,
        signOptions: process.signOptions,
        imageBuffer,
      });

      process.signedStoragePath = await this.fileStore.save(
        process.id,
        'signed',
        signResult.signedPdfBuffer,
      );
      process.status = 'SIGNED';
      process.signedAt = new Date();
      process.errorMessage = null;
      await this.processRepository.save(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'DOCUMENT_SIGNED',
        message: 'Signed PDF received from provider.',
        fromStatus: 'SIGNING',
        toStatus: 'SIGNED',
        meta: signResult.auditMeta,
      });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected signing failure.';
      await this.failProcess(process, message, requestUser.email);
    }

    return this.getProcessDetail(requestUser, process.id);
  }

  async downloadSignedDocument(requestUser: RequestUser, processId: string) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (process.status !== 'SIGNED' || !process.signedStoragePath) {
      throw new NotFoundException('Signed PDF is not available.');
    }

    return {
      fileName: process.originalFileName.replace(/\.pdf$/i, '') + '-signed.pdf',
      buffer: await this.fileStore.read(process.signedStoragePath),
    };
  }

  async downloadOriginalDocument(requestUser: RequestUser, processId: string) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    return {
      fileName: process.originalFileName,
      buffer: await this.fileStore.read(process.originalStoragePath),
    };
  }

  async getAuditTrail(requestUser: RequestUser, processId: string) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    const events = await this.auditService.listForProcess(process.id);
    return {
      process: mapProcessToSummary(process),
      events,
    };
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupExpiredProcesses() {
    const expired = await this.processRepository.find();
    for (const process of expired) {
      if (this.isExpired(process) && process.status !== 'EXPIRED') {
        await this.expireProcess(process, 'Expired by scheduled cleanup.');
      }
    }
  }

  private async getAccessibleProcess(
    requestUser: RequestUser,
    processId: string,
  ) {
    const process = await this.processRepository.findOne({
      where: { id: processId },
    });
    if (!process) {
      throw new NotFoundException('Signing process not found.');
    }

    if (requestUser.role !== 'admin' && process.userId !== requestUser.id) {
      throw new NotFoundException('Signing process not found.');
    }

    return process;
  }

  private async getOrCreateMockRegistration(userId: string) {
    const now = new Date();
    const existing = await this.registrationRepository.findOne({
      where: { userId, status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    if (existing && existing.validUntil.getTime() > now.getTime()) {
      return existing;
    }

    const registration = this.registrationRepository.create({
      userId,
      status: 'ACTIVE',
      validFrom: now,
      validUntil: new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000),
      providerContextEncrypted: this.sealedPayloadService.sealJson({
        provider: 'mock',
        pinFirma: this.config.providerPinFirma,
        configurationName: 'mock-config',
      }),
    });
    return this.registrationRepository.save(registration);
  }

  private coerceSignOptionFields(fields: Record<string, unknown>) {
    return {
      visible: this.coerceSignOptionField(fields.visible),
      page: this.coerceSignOptionField(fields.page),
      x: this.coerceSignOptionField(fields.x),
      y: this.coerceSignOptionField(fields.y),
      width: this.coerceSignOptionField(fields.width),
      height: this.coerceSignOptionField(fields.height),
    };
  }

  private normalizeExternalProfileOverrides(
    fields: Record<string, string | undefined>,
  ): ExternalProfileOverrides | null {
    const overrides: ExternalProfileOverrides = {};

    const setString = (key: keyof ExternalProfileOverrides) => {
      const value = fields[key]?.trim();
      if (value) {
        overrides[key] = value;
      }
    };

    setString('numeroDocumento');
    setString('fechaNacimiento');
    setString('estadoCivil');
    setString('telefono');

    return Object.keys(overrides).length > 0 ? overrides : null;
  }

  private coerceSignOptionField(value: unknown) {
    if (value === undefined) {
      return undefined;
    }

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return String(value);
    }

    return undefined;
  }

  private isExpired(process: SigningProcessEntity) {
    return process.expiresAt.getTime() < Date.now();
  }

  private async ensureNotExpired(process: SigningProcessEntity) {
    if (this.isExpired(process)) {
      await this.expireProcess(process, 'Process expired.');
      throw new GoneException('The temporary signing process has expired.');
    }
  }

  private async expireProcess(process: SigningProcessEntity, reason: string) {
    if (process.status === 'EXPIRED') {
      return;
    }

    const previousStatus = process.status;
    process.status = 'EXPIRED';
    process.errorMessage = reason;
    await this.processRepository.save(process);
    await this.fileStore.delete(process.originalStoragePath);
    await this.fileStore.delete(process.signedStoragePath);
    await this.fileStore.delete(process.signatureImageStoragePath);
    await this.fileStore.deleteProcessDirectory(process.id);
    await this.auditService.record({
      processId: process.id,
      actor: 'system',
      type: 'PROCESS_EXPIRED',
      message: reason,
      fromStatus: previousStatus,
      toStatus: 'EXPIRED',
    });
  }

  private async failProcess(
    process: SigningProcessEntity,
    message: string,
    actor: string,
  ) {
    const previousStatus = process.status;
    process.status = 'FAILED';
    process.errorMessage = message;
    await this.processRepository.save(process);
    await this.auditService.record({
      processId: process.id,
      actor,
      type: 'PROCESS_FAILED',
      message,
      fromStatus: previousStatus,
      toStatus: 'FAILED',
    });
  }
}
