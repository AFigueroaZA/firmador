import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { UpdateIdentityProfileDto } from './dto/update-identity-profile.dto';
import { IdentityService } from './identity.service';

@Controller('api/identity')
export class IdentityController {
  constructor(private readonly identityService: IdentityService) {}

  @Get('me')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('operator')
  async me(@CurrentUser() requestUser: RequestUser) {
    return this.identityService.getStatus(requestUser);
  }

  @Get('clave-unica/authorize')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('operator')
  async authorize(@CurrentUser() requestUser: RequestUser) {
    return this.identityService.createAuthorization(requestUser);
  }

  @Get('clave-unica/callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.identityService.handleAuthorizationCallback({
      state,
      code,
      error,
    });
    return response.redirect(redirectUrl);
  }

  @Patch('profile')
  @UseGuards(SessionAuthGuard, RolesGuard)
  @Roles('operator')
  async updateProfile(
    @CurrentUser() requestUser: RequestUser,
    @Body() dto: UpdateIdentityProfileDto,
  ) {
    return this.identityService.updateProfile(requestUser, dto);
  }
}
