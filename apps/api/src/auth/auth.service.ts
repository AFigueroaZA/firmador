import type { AuthSession, AuthUser } from '@firmador/shared';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as argon2 from 'argon2';
import type { Request, Response } from 'express';
import { Repository } from 'typeorm';
import { loadAppConfig } from '../config/app.config';
import { UserEntity } from './user.entity';
import type { LoginDto } from './dto/login.dto';
import { ACCESS_COOKIE_NAME, REFRESH_COOKIE_NAME } from './auth.constants';
import type { RequestUser } from './interfaces/request-user.interface';

interface JwtPayload {
  sub: string;
  email: string;
  fullName: string;
  role: AuthUser['role'];
}

@Injectable()
export class AuthService {
  private readonly config = loadAppConfig();

  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  async seedDefaultUsers() {
    const existingUsers = await this.userRepository.count();
    if (existingUsers > 0) {
      return;
    }

    await this.createSeedUser(
      process.env.SEED_ADMIN_EMAIL ?? 'admin@firmador.local',
      process.env.SEED_ADMIN_PASSWORD ?? 'Admin1234!',
      'Administrador Firmador',
      'admin',
    );
    await this.createSeedUser(
      process.env.SEED_OPERATOR_EMAIL ?? 'operador@firmador.local',
      process.env.SEED_OPERATOR_PASSWORD ?? 'Operador1234!',
      'Operador Firmador',
      'operator',
    );
  }

  async login(dto: LoginDto, response: Response): Promise<AuthSession> {
    const user = await this.userRepository.findOne({
      where: { email: dto.email.toLowerCase() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    const passwordMatches = await argon2.verify(
      user.passwordHash,
      dto.password,
    );
    if (!passwordMatches) {
      throw new UnauthorizedException('Invalid credentials.');
    }

    await this.issueSession(user, response);
    return { user: this.toAuthUser(user) };
  }

  async refresh(request: Request, response: Response): Promise<AuthSession> {
    const refreshToken = request.cookies?.[REFRESH_COOKIE_NAME] as
      | string
      | undefined;
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing.');
    }

    const payload = await this.jwtService.verifyAsync<JwtPayload>(
      refreshToken,
      {
        secret: this.config.jwtRefreshSecret,
      },
    );

    const user = await this.userRepository.findOne({
      where: { id: payload.sub },
    });
    if (!user || !user.refreshTokenHash) {
      throw new UnauthorizedException('Refresh session not found.');
    }

    const isValid = await argon2.verify(user.refreshTokenHash, refreshToken);
    if (!isValid) {
      throw new UnauthorizedException('Refresh session is invalid.');
    }

    await this.issueSession(user, response);
    return { user: this.toAuthUser(user) };
  }

  async logout(requestUser: RequestUser | undefined, response: Response) {
    if (requestUser) {
      await this.userRepository.update(
        { id: requestUser.id },
        { refreshTokenHash: null },
      );
    }

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

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(
        accessToken,
        {
          secret: this.config.jwtAccessSecret,
        },
      );
      return {
        id: payload.sub,
        email: payload.email,
        fullName: payload.fullName,
        role: payload.role,
      };
    } catch {
      return null;
    }
  }

  async getSession(requestUser: RequestUser): Promise<AuthSession> {
    const user = await this.userRepository.findOne({
      where: { id: requestUser.id },
    });
    if (!user) {
      throw new UnauthorizedException('User not found.');
    }

    return { user: this.toAuthUser(user) };
  }

  async getUserById(id: string) {
    return this.userRepository.findOne({ where: { id } });
  }

  private async createSeedUser(
    email: string,
    password: string,
    fullName: string,
    role: AuthUser['role'],
  ) {
    const passwordHash = await argon2.hash(password);
    const entity = this.userRepository.create({
      email: email.toLowerCase(),
      fullName,
      role,
      passwordHash,
      refreshTokenHash: null,
    });
    await this.userRepository.save(entity);
  }

  private async issueSession(user: UserEntity, response: Response) {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtAccessSecret,
        expiresIn: this.config.jwtAccessTtl as never,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.jwtRefreshSecret,
        expiresIn: this.config.jwtRefreshTtl as never,
      }),
    ]);

    user.refreshTokenHash = await argon2.hash(refreshToken);
    await this.userRepository.save(user);

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      secure: this.config.cookieSecure,
      path: '/',
    };

    response.cookie(ACCESS_COOKIE_NAME, accessToken, cookieOptions);
    response.cookie(REFRESH_COOKIE_NAME, refreshToken, cookieOptions);
  }

  private clearCookies(response: Response) {
    response.clearCookie(ACCESS_COOKIE_NAME, { path: '/' });
    response.clearCookie(REFRESH_COOKIE_NAME, { path: '/' });
  }

  private toAuthUser(user: UserEntity): AuthUser {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    };
  }
}
