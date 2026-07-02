import type { AuthSession, AuthUser } from '@firmador/shared';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { loadAppConfig } from '../config/app.config';
import { SupabaseService } from '../supabase/supabase.service';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth.constants';
import type { LoginDto } from './dto/login.dto';
import { RoleEntity } from './role.entity';
import {
  mapAuthRoleToDatabaseRoleCode,
  mapDatabaseRoleToAuthRole,
} from './role-mapping';
import { UserEntity } from './user.entity';
import type { RequestUser } from './interfaces/request-user.interface';

@Injectable()
export class AuthService {
  private readonly config = loadAppConfig();

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    @InjectRepository(RoleEntity)
    private readonly roleRepository: Repository<RoleEntity>,
    private readonly supabaseService: SupabaseService,
  ) {}

  async seedDefaultUsers() {
    const existingUsers = await this.userRepository.count();
    if (existingUsers > 0) {
      return;
    }

    const seedConfig = this.getSeedUserConfig();
    await this.createSeedUser(
      seedConfig.adminEmail,
      seedConfig.adminPassword,
      'Administrador Firmador',
      'admin',
    );
    await this.createSeedUser(
      seedConfig.operatorEmail,
      seedConfig.operatorPassword,
      'Operador Firmador',
      'operator',
    );
  }

  async login(dto: LoginDto, response: Response): Promise<AuthSession> {
    const supabase = this.supabaseService.getPublicClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: dto.email.toLowerCase(),
      password: dto.password,
    });

    if (error || !data.session?.access_token || !data.user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const user = await this.findProfileForAuthUser(
      data.user.id,
      data.user.email ?? dto.email,
    );
    if (!user?.isActive) {
      throw new UnauthorizedException('User is inactive.');
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);
    this.setSessionCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });

    return { user: this.toAuthUser(user) };
  }

  async refresh(request: Request, response: Response): Promise<AuthSession> {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const { data, error } = await this.supabaseService
      .getPublicClient()
      .auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session?.access_token || !data.user) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    const user = await this.findProfileForAuthUser(
      data.user.id,
      data.user.email ?? '',
    );
    if (!user?.isActive) {
      throw new UnauthorizedException('User is inactive.');
    }

    this.setSessionCookies(response, {
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
    });
    return { user: this.toAuthUser(user) };
  }

  logout(_requestUser: RequestUser | undefined, response: Response) {
    this.clearCookies(response);
    return { ok: true };
  }

  async authenticateRequest(request: Request): Promise<RequestUser | null> {
    const accessToken = request.cookies?.[ACCESS_COOKIE_NAME] as
      | string
      | undefined;
    if (!accessToken) {
      return null;
    }

    const { data, error } = await this.supabaseService
      .getPublicClient()
      .auth.getUser(accessToken);
    if (error || !data.user) {
      return null;
    }

    const profile = await this.findProfileForAuthUser(
      data.user.id,
      data.user.email ?? '',
    );
    return profile?.isActive ? this.toRequestUser(profile) : null;
  }

  async getSession(requestUser: RequestUser): Promise<AuthSession> {
    const user = await this.getUserById(requestUser.id);
    if (!user?.isActive) {
      throw new UnauthorizedException('User not found.');
    }

    return { user: this.toAuthUser(user) };
  }

  async getUserById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  async getUserByEmail(email: string) {
    return this.userRepository.findOne({
      where: { email: email.toLowerCase() },
    });
  }

  async createOperatorUser(input: {
    email: string;
    password: string;
    fullName: string;
    rut?: string | null;
    phone?: string | null;
  }) {
    const email = input.email.trim().toLowerCase();
    const existing = await this.getUserByEmail(email);
    if (existing) {
      throw new ConflictException('A user with this email already exists.');
    }

    const [firstName, lastName] = this.splitFullName(input.fullName);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: {
          first_name: firstName,
          last_name: lastName,
        },
      });

    if (error || !data.user) {
      throw new ConflictException(error?.message ?? 'Unable to create user.');
    }

    const role = await this.getRole('operator');
    const entity = this.userRepository.create({
      authUserId: data.user.id,
      roleId: role.id,
      role,
      rut: input.rut ?? null,
      firstName,
      lastName,
      email,
      phone: input.phone ?? null,
      isActive: true,
      lastLoginAt: null,
    });
    return this.userRepository.save(entity);
  }

  issueSessionForUser(user: UserEntity, response: Response): AuthSession {
    void response;
    return { user: this.toAuthUser(user) };
  }

  async issueSessionForCredentials(input: {
    email: string;
    password: string;
    response: Response;
  }): Promise<AuthSession> {
    return this.login(
      { email: input.email, password: input.password },
      input.response,
    );
  }

  private async createSeedUser(
    email: string,
    password: string,
    fullName: string,
    roleName: AuthUser['role'],
  ) {
    await this.createUserWithRole({
      email,
      password,
      fullName,
      role: roleName,
    });
  }

  private async createUserWithRole(input: {
    email: string;
    password: string;
    fullName: string;
    role: AuthUser['role'];
  }) {
    const email = input.email.toLowerCase();
    const [firstName, lastName] = this.splitFullName(input.fullName);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { first_name: firstName, last_name: lastName },
      });

    if (error || !data.user) {
      throw new Error(error?.message ?? `Unable to create ${email}.`);
    }

    const role = await this.getRole(input.role);
    await this.userRepository.save(
      this.userRepository.create({
        authUserId: data.user.id,
        roleId: role.id,
        role,
        rut: null,
        firstName,
        lastName,
        email,
        phone: null,
        isActive: true,
        lastLoginAt: null,
      }),
    );
  }

  private getSeedUserConfig() {
    const adminEmail = process.env.SEED_ADMIN_EMAIL?.trim();
    const adminPassword = process.env.SEED_ADMIN_PASSWORD;
    const operatorEmail = process.env.SEED_OPERATOR_EMAIL?.trim();
    const operatorPassword = process.env.SEED_OPERATOR_PASSWORD;

    const missing = [
      ['SEED_ADMIN_EMAIL', adminEmail],
      ['SEED_ADMIN_PASSWORD', adminPassword],
      ['SEED_OPERATOR_EMAIL', operatorEmail],
      ['SEED_OPERATOR_PASSWORD', operatorPassword],
    ]
      .filter(([, value]) => !value)
      .map(([name]) => name);

    if (missing.length > 0) {
      throw new Error(
        `Missing seed user configuration: ${missing.join(', ')}.`,
      );
    }

    return {
      adminEmail: adminEmail as string,
      adminPassword: adminPassword as string,
      operatorEmail: operatorEmail as string,
      operatorPassword: operatorPassword as string,
    };
  }

  private async findProfileForAuthUser(authUserId: string, email: string) {
    return (
      (await this.userRepository.findOne({ where: { authUserId } })) ??
      (email
        ? await this.userRepository.findOne({
            where: { email: email.toLowerCase() },
          })
        : null)
    );
  }

  private async getRole(role: AuthUser['role']) {
    const code = mapAuthRoleToDatabaseRoleCode(role);
    const entity = await this.roleRepository.findOne({ where: { code } });
    if (!entity) {
      throw new Error(`Role ${code} was not found.`);
    }
    return entity;
  }

  private setSessionCookies(
    response: Response,
    tokens: { accessToken: string; refreshToken: string },
  ) {
    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.cookieSecure,
      path: '/',
    };

    response.cookie(ACCESS_COOKIE_NAME, tokens.accessToken, cookieOptions);
    response.cookie(REFRESH_COOKIE_NAME, tokens.refreshToken, cookieOptions);
  }

  private clearCookies(response: Response) {
    response.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    response.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  }

  private toRequestUser(user: UserEntity): RequestUser {
    return {
      id: user.id,
      email: user.email,
      fullName: this.fullName(user),
      role: mapDatabaseRoleToAuthRole(user.role?.code),
    };
  }

  private toAuthUser(user: UserEntity): AuthUser {
    return this.toRequestUser(user);
  }

  private fullName(user: UserEntity) {
    return [user.firstName, user.lastName].filter(Boolean).join(' ');
  }

  private splitFullName(fullName: string): [string, string] {
    const parts = fullName.trim().split(/\s+/).filter(Boolean);
    return [parts[0] ?? fullName, parts.slice(1).join(' ') || 'Firmador'];
  }
}
