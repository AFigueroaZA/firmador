import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { CompleteRegistrationDto } from './dto/complete-registration.dto';
import { RegistrationService } from './registration.service';

@Controller('api/registration')
export class RegistrationController {
  constructor(private readonly registrationService: RegistrationService) {}

  @Get('clave-unica/authorize')
  async authorize() {
    return this.registrationService.createAuthorization();
  }

  @Get('clave-unica/callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const redirectUrl =
      await this.registrationService.handleAuthorizationCallback({
        state,
        code,
        error,
      });
    return response.redirect(redirectUrl);
  }

  @Get(':state')
  async getRegistration(@Param('state') state: string) {
    return this.registrationService.getRegistration(state);
  }

  @Post(':state/complete')
  async complete(
    @Param('state') state: string,
    @Body() dto: CompleteRegistrationDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.registrationService.completeRegistration(state, dto, response);
  }
}
