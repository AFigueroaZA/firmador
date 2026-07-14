import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type {
  ChallengePayload,
  EnrollmentChallenge,
  EnrollmentClaveValidation,
  EnrollmentStatusResponse,
} from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { loadAppConfig } from '../config/app.config';
import { SealedPayloadService } from '../documents/sealed-payload.service';
import { UserIdentityEntity } from '../identity/entities/user-identity.entity';
import { ProviderService } from '../provider/provider.service';
import type { ExternalProfile, ProviderContext } from '../provider/types';
import { SignatureRegistrationEntity } from '../signing/entities/signature-registration.entity';

interface EnrollmentContext extends ProviderContext {
  enrollmentChallenge?: EnrollmentChallenge;
  /** ISO timestamp of the last successful ClaveUnica validation. */
  claveValidatedAt?: string;
  /** ClaveUnica code pending exchange for the enrollment re-validation. */
  claveAuthCode?: string;
}

/**
 * ClaveUnica validations are short-lived at the provider: the RA rejects
 * FEA requests whose idValidacion is stale. Past this window the user must
 * re-validate with ClaveUnica before submitting the challenge.
 */
const CLAVE_VALIDATION_TTL_MS = 30 * 60 * 1000;

const ENROLLMENT_AUTH_STATE_PREFIX = 'enrollment:';

@Injectable()
export class EnrollmentService {
  private readonly config = loadAppConfig();
  private readonly logger = new Logger(EnrollmentService.name);

  constructor(
    @InjectRepository(SignatureRegistrationEntity)
    private readonly registrationRepository: Repository<SignatureRegistrationEntity>,
    @InjectRepository(UserIdentityEntity)
    private readonly identityRepository: Repository<UserIdentityEntity>,
    private readonly sealedPayloadService: SealedPayloadService,
    private readonly providerService: ProviderService,
  ) {}

  async getStatus(userId: string): Promise<EnrollmentStatusResponse> {
    const active = await this.findActiveRegistration(userId);
    if (active) {
      return {
        status: 'ACTIVE',
        validUntil: active.validUntil?.toISOString() ?? null,
        challenge: null,
      };
    }

    const pending = await this.findPendingRegistration(userId);
    if (pending) {
      const context = this.openContext(pending);
      return {
        status: 'PENDING',
        validUntil: null,
        challenge: context?.enrollmentChallenge ?? null,
        claveValidation: this.claveValidationInfo(context),
      };
    }

    return { status: 'NONE', validUntil: null, challenge: null };
  }

  /**
   * Starts a ClaveUnica re-validation for the pending enrollment. The
   * original validation from registration expires quickly at the provider,
   * so users returning later must renew it before submitting answers.
   */
  async startClaveUnicaValidation(
    requestUser: RequestUser,
  ): Promise<{ url: string }> {
    const active = await this.findActiveRegistration(requestUser.id);
    if (active) {
      throw new BadRequestException('Enrollment is already active.');
    }

    const registration = await this.getOrCreatePendingRegistration(
      requestUser.id,
    );
    const identity = await this.identityRepository.findOne({
      where: { userId: requestUser.id },
    });
    if (!identity) {
      throw new BadRequestException(
        'Completa tu perfil de identidad antes de validar con ClaveUnica.',
      );
    }

    const state = randomUUID();
    identity.externalAuthState = `${ENROLLMENT_AUTH_STATE_PREFIX}${state}`;
    await this.identityRepository.save(identity);

    const callbackBase = `${this.config.apiBaseUrl}/api/enrollment/clave-unica/callback?state=${encodeURIComponent(
      state,
    )}`;
    const authorization =
      await this.providerService.createClaveUnicaAuthorization({
        successRedirect: callbackBase,
        failedRedirect: `${callbackBase}&error=external_denied`,
        mockCode: `mock-enrollment-${state}`,
      });

    const context = this.openContext(registration) ?? {};
    registration.providerContextEncrypted = this.sealedPayloadService.sealJson({
      ...context,
      claveAuthCode: authorization.claveCode,
    });
    await this.registrationRepository.save(registration);

    return { url: authorization.redirectUrl };
  }

  async handleClaveUnicaCallback(input: {
    state: string;
    code?: string;
    error?: string;
  }): Promise<string> {
    const challengeUrl = `${this.config.webBaseUrl}/enrollment/challenge`;

    const identity = await this.identityRepository.findOne({
      where: {
        externalAuthState: `${ENROLLMENT_AUTH_STATE_PREFIX}${input.state}`,
      },
    });
    if (!identity) {
      throw new NotFoundException('Enrollment validation state was not found.');
    }
    identity.externalAuthState = null;
    await this.identityRepository.save(identity);

    if (input.error) {
      return `${challengeUrl}?clave=error`;
    }

    const registration = await this.findPendingRegistration(identity.userId);
    if (!registration) {
      return `${challengeUrl}?clave=error`;
    }

    const context = this.openContext(registration) ?? {};
    const code = input.code ?? context.claveAuthCode;
    if (!code) {
      return `${challengeUrl}?clave=error`;
    }

    try {
      const result = await this.providerService.refreshClaveValidation({
        callbackCode: code,
      });
      registration.providerContextEncrypted =
        this.sealedPayloadService.sealJson({
          ...context,
          claveIdValidation: result.claveIdValidation,
          claveValidatedAt: new Date().toISOString(),
          claveAuthCode: undefined,
        });
      await this.registrationRepository.save(registration);
      return `${challengeUrl}?clave=ok`;
    } catch (error) {
      this.logger.warn(
        `Enrollment ClaveUnica re-validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return `${challengeUrl}?clave=error`;
    }
  }

  /**
   * Called right after registration completes, while the ClaveUnica
   * validation from the registration flow is still fresh. Best effort:
   * a provider outage must not break account creation.
   */
  async beginEnrollment(
    userId: string,
    profile: ExternalProfile,
    claveIdValidation?: string,
  ): Promise<EnrollmentChallenge | null> {
    try {
      const registration = await this.getOrCreatePendingRegistration(userId);
      const storedContext = this.openContext(registration);
      const context: EnrollmentContext = {
        ...(storedContext ?? {}),
        claveIdValidation:
          claveIdValidation ?? storedContext?.claveIdValidation,
        // The registration flow just validated with ClaveUnica.
        claveValidatedAt: claveIdValidation
          ? new Date().toISOString()
          : storedContext?.claveValidatedAt,
        externalProfile: profile,
      };
      return await this.refreshChallenge(registration, context);
    } catch (error) {
      this.logger.warn(
        `Enrollment could not be started after registration: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return null;
    }
  }

  async startChallenge(requestUser: RequestUser): Promise<EnrollmentChallenge> {
    const active = await this.findActiveRegistration(requestUser.id);
    if (active) {
      throw new BadRequestException('Enrollment is already active.');
    }

    const registration = await this.getOrCreatePendingRegistration(
      requestUser.id,
    );
    const storedContext = this.openContext(registration) ?? {};
    const profile =
      storedContext.externalProfile ??
      (await this.buildProfileFromIdentity(requestUser.id));
    const context: EnrollmentContext = {
      ...storedContext,
      externalProfile: profile,
    };

    return this.refreshChallenge(registration, context);
  }

  async submitChallenge(
    requestUser: RequestUser,
    payload: ChallengePayload,
  ): Promise<EnrollmentStatusResponse> {
    const registration = await this.findPendingRegistration(requestUser.id);
    if (!registration) {
      throw new NotFoundException('No pending enrollment was found.');
    }

    const context = this.openContext(registration);
    if (!context?.enrollmentChallenge) {
      throw new BadRequestException('Enrollment challenge is not ready.');
    }
    if (payload.idChallenge !== context.enrollmentChallenge.idChallenge) {
      throw new BadRequestException(
        'Challenge id does not match the enrollment.',
      );
    }

    const stageTimer = (stage: string) => {
      const startedAt = Date.now();
      this.logger.log(`Enrollment stage "${stage}" started`);
      return () =>
        this.logger.log(
          `Enrollment stage "${stage}" finished in ${Date.now() - startedAt}ms`,
        );
    };

    let done = stageTimer('challenge');
    const challengeResult = await this.providerService.submitChallenge({
      payload,
      providerContext: context,
    });
    done();

    done = stageTimer('ra');
    const raResult = await this.providerService.createRaRequest({
      providerContext: challengeResult.providerContext,
    });
    done();

    done = stageTimer('certificate');
    const certificateResult = await this.providerService.downloadCertificate({
      providerContext: raResult.providerContext,
      signOptions: { visible: false },
      imageBuffer: null,
    });
    done();

    const finalContext = certificateResult.providerContext;
    const now = new Date();
    registration.status = 'ACTIVE';
    registration.certificateSubject = finalContext.externalProfile?.rut ?? null;
    registration.validFrom = now;
    registration.validUntil = new Date(
      now.getTime() + this.config.certificateValidityDays * 24 * 60 * 60 * 1000,
    );
    registration.providerContextEncrypted = this.sealedPayloadService.sealJson({
      pinFirma: finalContext.pinFirma,
      configurationName: finalContext.configurationName,
      nroSolicitud: finalContext.nroSolicitud,
      externalProfile: finalContext.externalProfile,
    });
    await this.registrationRepository.save(registration);

    return {
      status: 'ACTIVE',
      validUntil: registration.validUntil.toISOString(),
      challenge: null,
    };
  }

  private async refreshChallenge(
    registration: SignatureRegistrationEntity,
    context: EnrollmentContext,
  ): Promise<EnrollmentChallenge> {
    if (!context.externalProfile) {
      throw new BadRequestException(
        'A complete identity profile is required to start the challenge.',
      );
    }

    const result = await this.providerService.createChallengeForProfile({
      profile: context.externalProfile,
    });

    registration.providerContextEncrypted = this.sealedPayloadService.sealJson({
      ...context,
      ...result.providerContext,
      claveIdValidation: context.claveIdValidation,
      enrollmentChallenge: result.challenge,
    });
    await this.registrationRepository.save(registration);
    return result.challenge;
  }

  private async buildProfileFromIdentity(
    userId: string,
  ): Promise<ExternalProfile> {
    const identity = await this.identityRepository.findOne({
      where: { userId },
    });
    const required = [
      identity?.rut,
      identity?.nombres,
      identity?.apellidoPaterno,
      identity?.apellidoMaterno,
      identity?.email,
      identity?.telefono,
      identity?.numeroDocumento,
      identity?.fechaNacimiento,
      identity?.estadoCivil,
    ];
    if (!identity || required.some((value) => !value)) {
      throw new BadRequestException(
        'Complete your identity profile before starting the enrollment challenge.',
      );
    }

    return {
      rut: identity.rut as string,
      nombres: identity.nombres as string,
      apellidoPaterno: identity.apellidoPaterno as string,
      apellidoMaterno: identity.apellidoMaterno as string,
      email: identity.email as string,
      telefono: identity.telefono as string,
      numeroDocumento: identity.numeroDocumento as string,
      fechaNacimiento: identity.fechaNacimiento as string,
      estadoCivil: identity.estadoCivil as string,
    };
  }

  private async getOrCreatePendingRegistration(userId: string) {
    const existing = await this.findPendingRegistration(userId);
    if (existing) {
      return existing;
    }

    return this.registrationRepository.create({
      userId,
      provider: 'FIRMA_CL',
      providerRegistrationId: null,
      certificateSubject: null,
      status: 'PENDING',
      validFrom: null,
      validUntil: null,
    });
  }

  private async findActiveRegistration(userId: string) {
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
    return registration;
  }

  private findPendingRegistration(userId: string) {
    return this.registrationRepository.findOne({
      where: { userId, provider: 'FIRMA_CL', status: 'PENDING' },
      order: { createdAt: 'DESC' },
    });
  }

  private openContext(registration: SignatureRegistrationEntity) {
    return this.sealedPayloadService.openJson<EnrollmentContext>(
      registration.providerContextEncrypted,
    );
  }

  private claveValidationInfo(
    context: EnrollmentContext | null | undefined,
  ): EnrollmentClaveValidation {
    const validatedAt = context?.claveValidatedAt ?? null;
    const fresh = Boolean(
      context?.claveIdValidation &&
      validatedAt &&
      Date.now() - Date.parse(validatedAt) < CLAVE_VALIDATION_TTL_MS,
    );
    return { validatedAt, fresh };
  }
}
