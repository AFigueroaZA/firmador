import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import type {
  IdentityProfile,
  IdentityStatus,
  IdentityStatusResponse,
} from '@firmador/shared';
import { randomUUID } from 'node:crypto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { loadAppConfig } from '../config/app.config';
import { UserIdentityEntity } from './entities/user-identity.entity';
import type { UpdateIdentityProfileDto } from './dto/update-identity-profile.dto';

const REQUIRED_PROFILE_FIELDS: Array<keyof IdentityProfile> = [
  'numeroDocumento',
  'fechaNacimiento',
  'estadoCivil',
  'telefono',
];

@Injectable()
export class IdentityService {
  private readonly config = loadAppConfig();

  constructor(
    @InjectRepository(UserIdentityEntity)
    private readonly identityRepository: Repository<UserIdentityEntity>,
  ) {}

  async getStatus(requestUser: RequestUser): Promise<IdentityStatusResponse> {
    const identity = await this.findByUserId(requestUser.id);
    return this.toStatusResponse(identity);
  }

  async createAuthorization(requestUser: RequestUser) {
    const state = randomUUID();
    const identity =
      (await this.findByUserId(requestUser.id)) ??
      this.identityRepository.create({
        userId: requestUser.id,
        status: 'NOT_STARTED',
        rut: null,
        nombres: null,
        apellidoPaterno: null,
        apellidoMaterno: null,
        email: requestUser.email,
        telefono: null,
        numeroDocumento: null,
        fechaNacimiento: null,
        estadoCivil: null,
        claveUnicaValidatedAt: null,
        externalAuthState: null,
      });

    const nameParts = this.splitFullName(requestUser.fullName);
    identity.email = identity.email ?? requestUser.email;
    identity.nombres = identity.nombres ?? nameParts.nombres;
    identity.apellidoPaterno =
      identity.apellidoPaterno ?? nameParts.apellidoPaterno;
    identity.apellidoMaterno =
      identity.apellidoMaterno ?? nameParts.apellidoMaterno;
    identity.externalAuthState = state;
    await this.identityRepository.save(identity);

    const callbackUrl = `${this.config.apiBaseUrl}/api/identity/clave-unica/callback?state=${encodeURIComponent(
      state,
    )}&code=${encodeURIComponent(`mock-identity-${requestUser.id}`)}`;

    return { url: callbackUrl };
  }

  async handleAuthorizationCallback(input: {
    state: string;
    code?: string;
    error?: string;
  }) {
    const identity = await this.identityRepository.findOne({
      where: { externalAuthState: input.state },
    });
    if (!identity) {
      throw new NotFoundException('Identity validation state was not found.');
    }

    if (input.error) {
      identity.status = 'FAILED';
      identity.externalAuthState = null;
      await this.identityRepository.save(identity);
      return `${this.config.webBaseUrl}/identity?error=${encodeURIComponent(
        input.error,
      )}`;
    }

    if (!input.code) {
      throw new BadRequestException('Authorization code is required.');
    }

    const profile = this.createMockClaveUnicaProfile(identity);
    identity.rut = profile.rut;
    identity.nombres = profile.nombres;
    identity.apellidoPaterno = profile.apellidoPaterno;
    identity.apellidoMaterno = profile.apellidoMaterno;
    identity.email = profile.email;
    identity.claveUnicaValidatedAt = new Date();
    identity.externalAuthState = null;
    identity.status = this.computeStatus(identity);
    await this.identityRepository.save(identity);

    return `${this.config.webBaseUrl}/identity`;
  }

  async updateProfile(
    requestUser: RequestUser,
    dto: UpdateIdentityProfileDto,
  ): Promise<IdentityStatusResponse> {
    const identity = await this.findByUserId(requestUser.id);
    if (!identity?.claveUnicaValidatedAt) {
      throw new BadRequestException(
        'ClaveUnica validation is required before completing the profile.',
      );
    }

    this.assignTrimmed(identity, 'telefono', dto.telefono);
    this.assignTrimmed(identity, 'numeroDocumento', dto.numeroDocumento);
    this.assignTrimmed(identity, 'fechaNacimiento', dto.fechaNacimiento);
    this.assignTrimmed(identity, 'estadoCivil', dto.estadoCivil);
    identity.status = this.computeStatus(identity);
    await this.identityRepository.save(identity);

    return this.toStatusResponse(identity);
  }

  async ensureCanSign(userId: string) {
    const identity = await this.findByUserId(userId);
    const status = this.toStatusResponse(identity);
    if (!status.canSign) {
      throw new ForbiddenException(
        'Complete identity validation before signing documents.',
      );
    }
    return identity as UserIdentityEntity;
  }

  private findByUserId(userId: string) {
    return this.identityRepository.findOne({ where: { userId } });
  }

  private toStatusResponse(
    identity: UserIdentityEntity | null,
  ): IdentityStatusResponse {
    if (!identity) {
      return {
        status: 'NOT_STARTED',
        canSign: false,
        isValidated: false,
        isProfileComplete: false,
        missingFields: [...REQUIRED_PROFILE_FIELDS],
        profile: null,
      };
    }

    const missingFields = this.getMissingFields(identity);
    const isValidated = Boolean(identity.claveUnicaValidatedAt);
    const isProfileComplete = missingFields.length === 0;
    const status = this.computeStatus(identity);

    return {
      status,
      canSign: status === 'READY',
      isValidated,
      isProfileComplete,
      missingFields,
      profile: {
        rut: identity.rut,
        nombres: identity.nombres,
        apellidoPaterno: identity.apellidoPaterno,
        apellidoMaterno: identity.apellidoMaterno,
        email: identity.email,
        telefono: identity.telefono,
        numeroDocumento: identity.numeroDocumento,
        fechaNacimiento: identity.fechaNacimiento,
        estadoCivil: identity.estadoCivil,
        claveUnicaValidatedAt:
          identity.claveUnicaValidatedAt?.toISOString() ?? null,
      },
    };
  }

  private computeStatus(identity: UserIdentityEntity): IdentityStatus {
    if (identity.status === 'FAILED') {
      return 'FAILED';
    }
    if (!identity.claveUnicaValidatedAt) {
      return 'NOT_STARTED';
    }
    return this.getMissingFields(identity).length === 0 ? 'READY' : 'VALIDATED';
  }

  private getMissingFields(identity: UserIdentityEntity) {
    return REQUIRED_PROFILE_FIELDS.filter((field) => {
      const value = identity[field];
      return typeof value !== 'string' || value.trim().length === 0;
    });
  }

  private assignTrimmed(
    identity: UserIdentityEntity,
    field: keyof Pick<
      UserIdentityEntity,
      'telefono' | 'numeroDocumento' | 'fechaNacimiento' | 'estadoCivil'
    >,
    value: string | undefined,
  ) {
    if (value !== undefined) {
      identity[field] = value.trim() || null;
    }
  }

  private createMockClaveUnicaProfile(identity: UserIdentityEntity) {
    return {
      rut: '11.111.111-1',
      nombres: identity.nombres ?? 'Usuario',
      apellidoPaterno: identity.apellidoPaterno ?? 'Firmador',
      apellidoMaterno: identity.apellidoMaterno ?? 'Demo',
      email: identity.email ?? 'mock@firmador.local',
    };
  }

  private splitFullName(fullName: string) {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return {
      nombres: parts[0] ?? fullName,
      apellidoPaterno: parts[1] ?? 'Firmador',
      apellidoMaterno: parts.slice(2).join(' ') || 'Demo',
    };
  }
}
