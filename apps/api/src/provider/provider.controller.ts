import { Controller, Get, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { SigningService } from '../signing/signing.service';

@Controller('api/provider/clave-unica')
export class ProviderController {
  constructor(private readonly signingService: SigningService) {}

  @Get('callback')
  async callback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.signingService.handleAuthorizationCallback({
      state,
      code,
      error,
    });
    return response.redirect(redirectUrl);
  }
}
