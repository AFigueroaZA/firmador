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
  SignOptions,
  SigningProcessDetail,
  SigningProcessSummary,
} from '@firmador/shared';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import type { Express } from 'express';
import { Repository } from 'typeorm';
import { AuditService } from '../audit/audit.service';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import {
  FECHA_NACIMIENTO_PATTERN,
  NUMERO_DOCUMENTO_PATTERN,
  TELEFONO_PATTERN,
  normalizeEstadoCivil,
  normalizeFechaNacimiento,
  normalizeNumeroDocumento,
  normalizeTelefono,
} from '../common/utils/profile-fields';
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
import { DocumentEntity } from './entities/document.entity';
import { SignatureAccountEntity } from './entities/signature-account.entity';
import { SignatureAssetEntity } from './entities/signature-asset.entity';
import { SignatureRegistrationEntity } from './entities/signature-registration.entity';
import { SigningStatusEntity } from './entities/signing-status.entity';
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
    @InjectRepository(DocumentEntity)
    private readonly documentRepository: Repository<DocumentEntity>,
    @InjectRepository(SignatureAssetEntity)
    private readonly assetRepository: Repository<SignatureAssetEntity>,
    @InjectRepository(SignatureAccountEntity)
    private readonly accountRepository: Repository<SignatureAccountEntity>,
    @InjectRepository(SigningStatusEntity)
    private readonly statusRepository: Repository<SigningStatusEntity>,
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

    const processId = randomUUID();
    const originalStoragePath = await this.fileStore.save(
      processId,
      'original',
      pdfFile.buffer,
    );
    const signatureImageStoragePath = imageFile
      ? await this.fileStore.save(
          processId,
          'signature-image',
          imageFile.buffer,
        )
      : null;
    const document = await this.documentRepository.save(
      this.documentRepository.create({
        userId: requestUser.id,
        originalFileName: pdfFile.originalname,
        storagePath: originalStoragePath,
        mimeType: metadata.mimeType,
        sizeBytes: String(metadata.sizeBytes),
        sha256: metadata.sha256,
        status: 'UPLOADED',
      }),
    );
    const account = await this.getOrCreateAccount(requestUser.id);
    const process = this.processRepository.create({
      id: processId,
      userId: requestUser.id,
      documentId: document.id,
      document,
      accountId: account.id,
      account,
      status: 'UPLOADED',
      provider: 'FIRMA_CL',
      providerProcessId: null,
      requestedAt: new Date(),
      signOptions,
      pdfMetadata: metadata.pdfMetadata,
      originalStoragePath,
      signedStoragePath: null,
      signatureImageStoragePath,
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

    process.status = hasInitialSignOptions ? 'CONFIGURED' : 'UPLOADED';
    await this.saveProcess(process);
    if (hasInitialSignOptions && signOptions.visible) {
      await this.upsertSignatureAsset(process);
    }

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
    await this.saveProcess(process);
    await this.upsertSignatureAsset(process);

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

  async getAuthorizationUrl(
    requestUser: RequestUser,
    processId: string,
    options?: { skipEnrollmentRedirect?: boolean },
  ) {
    const process = await this.getAccessibleProcess(requestUser, processId);
    await this.ensureNotExpired(process);

    if (process.status === 'UPLOADED') {
      throw new BadRequestException(
        'Configure signature placement before starting authorization.',
      );
    }

    validateSignOptionsForPdf(process.signOptions, process.pdfMetadata);

    if (this.config.signingProviderMode === 'live') {
      const active = await this.findActiveLiveRegistration(requestUser.id);
      if (active) {
        const signed = await this.signWithExistingRegistration(
          requestUser,
          process,
          active.registration,
          active.context,
        );
        if (signed) {
          return {
            url: `${this.config.webBaseUrl}/sign/${process.id}/result`,
          };
        }
      }

      if (!options?.skipEnrollmentRedirect) {
        const pending = await this.registrationRepository.findOne({
          where: {
            userId: requestUser.id,
            provider: 'FIRMA_CL',
            status: 'PENDING',
          },
          order: { createdAt: 'DESC' },
        });
        if (pending) {
          const next = encodeURIComponent(`/sign/${process.id}/payment`);
          return {
            url: `${this.config.webBaseUrl}/enrollment/challenge?next=${next}`,
          };
        }
      }
    }

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

    // ClaveUnica only returns names/RUN/email; complete the challenge profile
    // with the data collected at registration (user_identities), letting any
    // per-process overrides win.
    const identity = await this.identityService.getStatus(requestUser);
    const identityOverrides: ExternalProfileOverrides = {};
    if (identity.profile?.numeroDocumento) {
      identityOverrides.numeroDocumento = identity.profile.numeroDocumento;
    }
    if (identity.profile?.fechaNacimiento) {
      identityOverrides.fechaNacimiento = identity.profile.fechaNacimiento;
    }
    if (identity.profile?.estadoCivil) {
      identityOverrides.estadoCivil = identity.profile.estadoCivil;
    }
    if (identity.profile?.telefono) {
      identityOverrides.telefono = identity.profile.telefono;
    }

    process.externalAuthState = state;
    process.providerContextEncrypted = this.sealedPayloadService.sealJson({
      ...((result.providerContext ?? {}) as Record<string, unknown>),
      externalProfileOverrides: {
        ...identityOverrides,
        ...(process.externalProfileOverrides ?? {}),
      },
    });
    const fromStatus = process.status;
    process.status = 'EXTERNAL_AUTH_PENDING';
    await this.saveProcess(process);

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
    const activeRegistration =
      eligible && this.config.signingProviderMode === 'live'
        ? await this.findActiveLiveRegistration(requestUser.id)
        : null;

    return {
      mode: this.config.signingProviderMode,
      eligible,
      costCredits: 1,
      availableCredits: eligible ? 1 : 0,
      requiresExternalAuthorization:
        this.config.signingProviderMode === 'live' && !activeRegistration,
      message: eligible
        ? this.config.signingProviderMode === 'mock'
          ? 'Demo credit available for this signing process.'
          : activeRegistration
            ? 'Active certificate found. The document will be signed directly without repeating identity validation.'
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
      await this.saveProcess(process);
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

      const prepared = await this.prepareDocumentForSigning(process);
      const signResult = await this.providerService.signDocument({
        providerContext,
        fileName: process.originalFileName,
        pdfBuffer: prepared.pdfBuffer,
        signOptions: prepared.signOptions,
        imageBuffer: null,
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
      await this.saveProcess(process);
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
    const match = await this.processRepository
      .createQueryBuilder('process')
      .select('process.id', 'id')
      .where(`process.metadata ->> 'externalAuthState' = :state`, {
        state: input.state,
      })
      .getRawOne<{ id: string }>();
    const process = match
      ? await this.processRepository.findOne({ where: { id: match.id } })
      : null;

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
    await this.saveProcess(process);
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
    await this.saveProcess(process);
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
      await this.saveProcess(process);
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
      await this.saveProcess(process);
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
      await this.saveProcess(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'CERTIFICATE_READY',
        message: 'Certificate downloaded and configured.',
        fromStatus: 'CERT_PENDING',
        toStatus: 'SIGNING',
        meta: certificateResult.auditMeta,
      });

      const registration = await this.persistLiveRegistration(
        requestUser.id,
        certificateResult.providerContext,
        process,
      );
      if (registration) {
        await this.auditService.record({
          processId: process.id,
          actor: 'system',
          type: 'SIGNATURE_REGISTRATION_SAVED',
          message:
            'Certificate enrollment stored; future signings will not require ClaveUnica re-validation.',
          meta: {
            signatureRegistrationId: registration.id,
            validUntil: registration.validUntil?.toISOString(),
          },
        });
      }

      const prepared = await this.prepareDocumentForSigning(process);
      const signResult = await this.providerService.signDocument({
        providerContext: certificateResult.providerContext,
        fileName: process.originalFileName,
        pdfBuffer: prepared.pdfBuffer,
        signOptions: prepared.signOptions,
        imageBuffer: null,
      });

      process.signedStoragePath = await this.fileStore.save(
        process.id,
        'signed',
        signResult.signedPdfBuffer,
      );
      process.status = 'SIGNED';
      process.signedAt = new Date();
      process.errorMessage = null;
      await this.saveProcess(process);
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

  /**
   * Prepares the PDF for the provider signature:
   * - The user's drawn signature image (if any) is stamped into the page
   *   content at the position picked in the wizard, so it travels with the
   *   document and gets covered by the cryptographic signature.
   * - A signature page is appended at the end, and the provider's mandatory
   *   dynamic stamp (ImagenDinamica) is pointed at a strip there, so it
   *   never overlaps the original content.
   */
  private async prepareDocumentForSigning(
    process: SigningProcessEntity,
  ): Promise<{ pdfBuffer: Buffer; signOptions: SignOptions }> {
    const originalPdf = await this.fileStore.read(process.originalStoragePath);
    const imageBuffer = process.signatureImageStoragePath
      ? await this.fileStore.read(process.signatureImageStoragePath)
      : null;

    const pdfDocument = await PDFDocument.load(originalPdf, {
      ignoreEncryption: true,
    });

    const options = process.signOptions;
    if (
      imageBuffer &&
      options.visible &&
      options.page !== undefined &&
      options.page >= 1 &&
      options.page <= pdfDocument.getPageCount() &&
      options.x !== undefined &&
      options.y !== undefined &&
      options.width !== undefined &&
      options.height !== undefined
    ) {
      const isPng = imageBuffer[0] === 0x89 && imageBuffer[1] === 0x50;
      const image = isPng
        ? await pdfDocument.embedPng(imageBuffer)
        : await pdfDocument.embedJpg(imageBuffer);
      pdfDocument.getPage(options.page - 1).drawImage(image, {
        x: options.x,
        y: options.y,
        width: options.width,
        height: options.height,
      });
    }

    const lastPage = pdfDocument.getPage(pdfDocument.getPageCount() - 1);
    const { width: pageWidth, height: pageHeight } = lastPage.getSize();
    const signaturePage = pdfDocument.addPage([pageWidth, pageHeight]);

    const margin = 40;
    const stripHeight = 120;
    const stripY = pageHeight - margin - stripHeight;
    const font = await pdfDocument.embedFont(StandardFonts.Helvetica);
    signaturePage.drawText('Firma Electrónica Avanzada', {
      x: margin,
      y: stripY + stripHeight + 10,
      size: 10,
      font,
      color: rgb(0.42, 0.45, 0.5),
    });

    return {
      pdfBuffer: Buffer.from(await pdfDocument.save()),
      signOptions: {
        visible: true,
        page: pdfDocument.getPageCount(),
        x: margin,
        y: stripY,
        width: pageWidth - margin * 2,
        height: stripHeight,
      },
    };
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

  private async findActiveLiveRegistration(userId: string) {
    const registration = await this.registrationRepository.findOne({
      where: { userId, provider: 'FIRMA_CL', status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    if (!registration) {
      return null;
    }

    if (
      registration.validUntil &&
      registration.validUntil.getTime() <= Date.now()
    ) {
      registration.status = 'EXPIRED';
      await this.registrationRepository.save(registration);
      return null;
    }

    const context = this.sealedPayloadService.openJson<ProviderContext>(
      registration.providerContextEncrypted,
    );
    if (!context?.pinFirma) {
      return null;
    }

    return { registration, context };
  }

  private async signWithExistingRegistration(
    requestUser: RequestUser,
    process: SigningProcessEntity,
    registration: SignatureRegistrationEntity,
    providerContext: ProviderContext,
  ) {
    const fromStatus = process.status;
    try {
      process.status = 'SIGNING';
      await this.saveProcess(process);
      await this.auditService.record({
        processId: process.id,
        actorUserId: requestUser.id,
        actor: requestUser.email,
        type: 'EXTERNAL_AUTH_SKIPPED',
        message:
          'Valid certificate enrollment found; signing directly without ClaveUnica re-validation.',
        fromStatus,
        toStatus: process.status,
        meta: {
          signatureRegistrationId: registration.id,
          validUntil: registration.validUntil?.toISOString(),
        },
      });

      const prepared = await this.prepareDocumentForSigning(process);
      const signResult = await this.providerService.signDocument({
        providerContext,
        fileName: process.originalFileName,
        pdfBuffer: prepared.pdfBuffer,
        signOptions: prepared.signOptions,
        imageBuffer: null,
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
      await this.saveProcess(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'DOCUMENT_SIGNED',
        message: 'Signed PDF received from provider using stored enrollment.',
        fromStatus: 'SIGNING',
        toStatus: 'SIGNED',
        meta: {
          ...signResult.auditMeta,
          signatureRegistrationId: registration.id,
        },
      });
      return true;
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Unexpected signing failure.';
      process.status = fromStatus;
      await this.saveProcess(process);
      await this.auditService.record({
        processId: process.id,
        actor: 'system',
        type: 'REGISTRATION_SIGN_FAILED',
        message: `Direct signing with stored enrollment failed (${message}); falling back to full provider authorization.`,
        fromStatus: 'SIGNING',
        toStatus: process.status,
        meta: { signatureRegistrationId: registration.id },
      });
      return false;
    }
  }

  private async persistLiveRegistration(
    userId: string,
    providerContext: ProviderContext,
    process: SigningProcessEntity,
  ) {
    if (this.config.signingProviderMode !== 'live') {
      return null;
    }
    if (!providerContext.pinFirma) {
      return null;
    }

    const now = new Date();
    const registration = this.registrationRepository.create({
      userId,
      provider: 'FIRMA_CL',
      certificateSubject:
        providerContext.externalProfile?.rut ??
        process.externalIdentity?.run ??
        null,
      status: 'ACTIVE',
      validFrom: now,
      validUntil: new Date(
        now.getTime() +
          this.config.certificateValidityDays * 24 * 60 * 60 * 1000,
      ),
      providerContextEncrypted: this.sealedPayloadService.sealJson({
        pinFirma: providerContext.pinFirma,
        configurationName: providerContext.configurationName,
        nroSolicitud: providerContext.nroSolicitud,
        externalProfile: providerContext.externalProfile,
      }),
    });
    return this.registrationRepository.save(registration);
  }

  private async getOrCreateMockRegistration(userId: string) {
    const now = new Date();
    const existing = await this.registrationRepository.findOne({
      where: { userId, status: 'ACTIVE' },
      order: { createdAt: 'DESC' },
    });
    if (existing?.validUntil && existing.validUntil.getTime() > now.getTime()) {
      return existing;
    }

    const registration = this.registrationRepository.create({
      userId,
      provider: 'MOCK',
      providerRegistrationId: null,
      certificateSubject: 'mock',
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

  private async saveProcess(process: SigningProcessEntity) {
    process.statusId = await this.getDatabaseStatusId(process.status);
    return this.processRepository.save(process);
  }

  private async getDatabaseStatusId(status: SigningProcessEntity['status']) {
    const code = this.toDatabaseStatusCode(status);
    const entity = await this.statusRepository.findOne({ where: { code } });
    if (!entity) {
      throw new Error(`Signing status ${code} was not found.`);
    }
    return entity.id;
  }

  private toDatabaseStatusCode(status: SigningProcessEntity['status']) {
    const map: Record<SigningProcessEntity['status'], string> = {
      UPLOADED: 'DOCUMENT_SELECTED',
      CONFIGURED: 'READY_TO_SIGN',
      EXTERNAL_AUTH_PENDING: 'SIGNING_PENDING',
      EXTERNAL_AUTH_DONE: 'SIGNING_PENDING',
      CHALLENGE_PENDING: 'SIGNING_PENDING',
      RA_PENDING: 'SIGNING_PENDING',
      CERT_PENDING: 'SIGNING_PENDING',
      SIGNING: 'SIGNING_PENDING',
      SIGNED: 'SIGNED',
      FAILED: 'FAILED',
      EXPIRED: 'EXPIRED',
    };
    return map[status];
  }

  private async getOrCreateAccount(userId: string) {
    const existing = await this.accountRepository.findOne({
      where: { userId },
    });
    if (existing) {
      return existing;
    }
    return this.accountRepository.save(
      this.accountRepository.create({
        userId,
        currentBalance: 0,
      }),
    );
  }

  private async upsertSignatureAsset(process: SigningProcessEntity) {
    const options = process.signOptions;
    if (!options.visible || !options.page) {
      return;
    }

    const existing = await this.assetRepository.findOne({
      where: { signingProcessId: process.id, assetType: 'VISUAL_SIGNATURE' },
    });
    await this.assetRepository.save(
      this.assetRepository.create({
        id: existing?.id,
        signingProcessId: process.id,
        assetType: 'VISUAL_SIGNATURE',
        pageNumber: options.page,
        x: options.x ?? 0,
        y: options.y ?? 0,
        width: options.width ?? 160,
        height: options.height ?? 80,
        label: options.imageFileName ?? null,
        imageStoragePath: process.signatureImageStoragePath,
        metadata: { signOptions: options },
      }),
    );
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

    const setNormalized = (
      key: keyof ExternalProfileOverrides,
      normalize: (value: unknown) => unknown,
      pattern: RegExp | null,
      message: string,
    ) => {
      const raw = fields[key]?.trim();
      if (!raw) {
        return;
      }
      const value = normalize(raw);
      if (typeof value !== 'string' || (pattern && !pattern.test(value))) {
        throw new BadRequestException(message);
      }
      overrides[key] = value;
    };

    setNormalized(
      'numeroDocumento',
      normalizeNumeroDocumento,
      NUMERO_DOCUMENTO_PATTERN,
      'numeroDocumento debe ser el número de serie/documento de la cédula, sin puntos.',
    );
    setNormalized(
      'fechaNacimiento',
      normalizeFechaNacimiento,
      FECHA_NACIMIENTO_PATTERN,
      'fechaNacimiento debe tener formato AAAA-MM-DD.',
    );
    setNormalized(
      'estadoCivil',
      normalizeEstadoCivil,
      null,
      'estadoCivil inválido.',
    );
    setNormalized(
      'telefono',
      normalizeTelefono,
      TELEFONO_PATTERN,
      'telefono debe ser un celular chileno de 9 dígitos.',
    );

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
    return Boolean(
      process.expiresAt && process.expiresAt.getTime() < Date.now(),
    );
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
    await this.saveProcess(process);
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
    await this.saveProcess(process);
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
