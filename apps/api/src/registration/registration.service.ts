import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type { IdentityProfile } from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import type { Response } from 'express';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { loadAppConfig } from '../config/app.config';
import { EnrollmentService } from '../enrollment/enrollment.service';
import { UserIdentityEntity } from '../identity/entities/user-identity.entity';
import { ClaveUnicaClient } from '../provider/clients/clave-unica.client';
import type { ExternalProfile } from '../provider/types';
import {
  coerceString,
  deepFindValue,
} from '../provider/utils/provider-response.util';
import type { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { RegistrationIntentEntity } from './entities/registration-intent.entity';

const REQUIRED_REGISTRATION_FIELDS: Array<keyof IdentityProfile> = [
  'telefono',
  'numeroDocumento',
  'fechaNacimiento',
  'estadoCivil',
];

@Injectable()
export class RegistrationService {
  private readonly config = loadAppConfig();

  constructor(
    @InjectRepository(RegistrationIntentEntity)
    private readonly registrationRepository: Repository<RegistrationIntentEntity>,
    @InjectRepository(UserIdentityEntity)
    private readonly identityRepository: Repository<UserIdentityEntity>,
    private readonly authService: AuthService,
    private readonly claveUnicaClient: ClaveUnicaClient,
    private readonly enrollmentService: EnrollmentService,
  ) {}

  async createAuthorization() {
    const state = randomUUID();
    const intent = this.registrationRepository.create({
      state,
      status: 'PENDING',
      claveCode: null,
      profile: null,
      completedUserId: null,
      errorMessage: null,
      expiresAt: new Date(Date.now() + 30 * 60 * 1000),
    });
    await this.registrationRepository.save(intent);

    const callbackBase = `${this.config.apiBaseUrl}/api/registration/clave-unica/callback?state=${encodeURIComponent(
      state,
    )}`;

    if (this.config.signingProviderMode === 'mock') {
      return { url: `${callbackBase}&code=mock-registration-${state}` };
    }

    const authorization = await this.claveUnicaClient.requestAuthorizationCode({
      successRedirect: callbackBase,
      failedRedirect: `${callbackBase}&error=external_denied`,
    });
    intent.claveCode = authorization.code;
    await this.registrationRepository.save(intent);

    return { url: authorization.redirectUrl };
  }

  async handleAuthorizationCallback(input: {
    state: string;
    code?: string;
    error?: string;
  }) {
    const intent = await this.findIntent(input.state);
    this.ensureUsableIntent(intent);

    if (input.error) {
      intent.status = 'FAILED';
      intent.errorMessage = input.error;
      await this.registrationRepository.save(intent);
      return `${this.config.webBaseUrl}/?error=${encodeURIComponent(
        'registration',
      )}`;
    }

    const profile =
      this.config.signingProviderMode === 'mock'
        ? this.createMockProfile()
        : await this.getLiveProfile(input.code ?? intent.claveCode ?? '');

    intent.profile = profile;
    intent.status = 'VALIDATED';
    intent.errorMessage = null;
    await this.registrationRepository.save(intent);

    return `${this.config.webBaseUrl}/register/complete?state=${encodeURIComponent(
      intent.state,
    )}`;
  }

  async getRegistration(state: string) {
    const intent = await this.findIntent(state);
    if (this.isExpired(intent)) {
      throw new GoneException('Registration intent has expired.');
    }
    if (
      !['VALIDATED', 'COMPLETED'].includes(intent.status) ||
      !intent.profile
    ) {
      throw new BadRequestException('Registration is not validated.');
    }

    return {
      status: intent.status,
      profile: this.toIdentityProfile(intent.profile),
      missingFields: this.getMissingFields(intent.profile),
    };
  }

  async completeRegistration(
    state: string,
    dto: CompleteRegistrationDto,
    response: Response,
  ) {
    const intent = await this.findIntent(state);
    if (this.isExpired(intent)) {
      throw new GoneException('Registration intent has expired.');
    }
    if (intent.status !== 'VALIDATED' || !intent.profile) {
      throw new BadRequestException('Registration is not ready to complete.');
    }

    const email = dto.email.trim().toLowerCase();
    const existingUser = await this.authService.getUserByEmail(email);
    if (existingUser) {
      throw new ConflictException('A user with this email already exists.');
    }

    const existingIdentity = await this.identityRepository.findOne({
      where: { rut: intent.profile.rut },
    });
    if (existingIdentity) {
      throw new ConflictException('A user with this RUN already exists.');
    }

    const user = await this.authService.createOperatorUser({
      email,
      password: dto.password,
      fullName: this.fullName(intent.profile),
      rut: intent.profile.rut,
      phone: dto.telefono.trim(),
    });

    const identity = this.identityRepository.create({
      userId: user.id,
      status: 'READY',
      rut: intent.profile.rut,
      nombres: intent.profile.nombres,
      apellidoPaterno: intent.profile.apellidoPaterno,
      apellidoMaterno: intent.profile.apellidoMaterno,
      email,
      telefono: dto.telefono.trim(),
      numeroDocumento: dto.numeroDocumento.trim(),
      fechaNacimiento: dto.fechaNacimiento.trim(),
      estadoCivil: dto.estadoCivil.trim(),
      claveUnicaValidatedAt: new Date(),
      externalAuthState: null,
    });
    await this.identityRepository.save(identity);

    intent.status = 'COMPLETED';
    intent.completedUserId = user.id;
    await this.registrationRepository.save(intent);

    // Best-effort: start the provider enrollment (challenge) right away while
    // the ClaveUnica validation is fresh. Account creation must not fail if
    // the provider is unavailable; the challenge page can retry later.
    await this.enrollmentService.beginEnrollment(
      user.id,
      {
        rut: intent.profile.rut,
        nombres: intent.profile.nombres,
        apellidoPaterno: intent.profile.apellidoPaterno,
        apellidoMaterno: intent.profile.apellidoMaterno,
        email,
        telefono: dto.telefono.trim(),
        numeroDocumento: dto.numeroDocumento.trim(),
        fechaNacimiento: dto.fechaNacimiento.trim(),
        estadoCivil: dto.estadoCivil.trim(),
      },
      typeof intent.profile.claveIdValidation === 'string'
        ? intent.profile.claveIdValidation
        : undefined,
    );

    return this.authService.issueSessionForCredentials({
      email,
      password: dto.password,
      response,
    });
  }

  private async getLiveProfile(code: string): Promise<ExternalProfile> {
    if (!code) {
      throw new BadRequestException('Authorization code is required.');
    }
    const tokenResult = await this.claveUnicaClient.exchangeToken(code);
    const userInfo = await this.claveUnicaClient.getUserInfo({
      accessToken: tokenResult.accessToken,
      code,
    });
    // Keep the provider validation id from this ClaveUnica session: the RA
    // enrollment expects it comma-joined with the challenge validation id.
    // users/info carries no id, so fall back to the token exchange payload.
    const claveIdValidation =
      coerceString(
        deepFindValue(userInfo.raw, [
          'idValidacion',
          'idValidation',
          'validationId',
        ]),
      ) ?? tokenResult.idValidation;
    return { ...userInfo.profile, claveIdValidation };
  }

  private async findIntent(state: string) {
    const intent = await this.registrationRepository.findOne({
      where: { state },
    });
    if (!intent) {
      throw new NotFoundException('Registration intent was not found.');
    }
    return intent;
  }

  private ensureUsableIntent(intent: RegistrationIntentEntity) {
    if (this.isExpired(intent)) {
      throw new GoneException('Registration intent has expired.');
    }
    if (intent.status !== 'PENDING') {
      throw new BadRequestException('Registration intent is not pending.');
    }
  }

  private isExpired(intent: RegistrationIntentEntity) {
    return intent.expiresAt.getTime() < Date.now();
  }

  private getMissingFields(profile: ExternalProfile) {
    return REQUIRED_REGISTRATION_FIELDS.filter((field) => {
      const value = profile[field];
      return typeof value !== 'string' || value.trim().length === 0;
    });
  }

  private toIdentityProfile(profile: ExternalProfile): IdentityProfile {
    return {
      rut: profile.rut,
      nombres: profile.nombres,
      apellidoPaterno: profile.apellidoPaterno,
      apellidoMaterno: profile.apellidoMaterno,
      email: profile.email,
      telefono: profile.telefono ?? null,
      numeroDocumento: profile.numeroDocumento,
      fechaNacimiento: profile.fechaNacimiento ?? null,
      estadoCivil: profile.estadoCivil ?? null,
      claveUnicaValidatedAt: new Date().toISOString(),
    };
  }

  private fullName(profile: ExternalProfile) {
    return [profile.nombres, profile.apellidoPaterno, profile.apellidoMaterno]
      .filter(Boolean)
      .join(' ');
  }

  private createMockProfile(): ExternalProfile {
    return {
      rut: '22.222.222-2',
      numeroDocumento: '',
      nombres: 'Registro',
      apellidoPaterno: 'Mock',
      apellidoMaterno: 'Firmador',
      email: '',
      fechaNacimiento: '',
      estadoCivil: '',
      telefono: '',
    };
  }
}
