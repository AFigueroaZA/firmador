import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ChallengePayloadDto } from '../signing/dto/challenge-payload.dto';
import { EnrollmentService } from './enrollment.service';

@Controller('api/enrollment')
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  @UseGuards(SessionAuthGuard)
  async getStatus(@CurrentUser() requestUser: RequestUser) {
    return this.enrollmentService.getStatus(requestUser.id);
  }

  @Post('clave-unica/start')
  @UseGuards(SessionAuthGuard)
  async startClaveUnica(@CurrentUser() requestUser: RequestUser) {
    return this.enrollmentService.startClaveUnicaValidation(requestUser);
  }

  // No session guard: the browser lands here redirected by the provider.
  // The one-time state parameter identifies the enrollment.
  @Get('clave-unica/callback')
  async claveUnicaCallback(
    @Query('state') state: string,
    @Query('code') code: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ) {
    const redirectUrl = await this.enrollmentService.handleClaveUnicaCallback({
      state,
      code,
      error,
    });
    return response.redirect(redirectUrl);
  }

  @Post('challenge/start')
  @UseGuards(SessionAuthGuard)
  async startChallenge(@CurrentUser() requestUser: RequestUser) {
    return this.enrollmentService.startChallenge(requestUser);
  }

  @Post('challenge')
  @UseGuards(SessionAuthGuard)
  async submitChallenge(
    @CurrentUser() requestUser: RequestUser,
    @Body() payload: ChallengePayloadDto,
  ) {
    return this.enrollmentService.submitChallenge(requestUser, {
      idChallenge: payload.idChallenge,
      answers: payload.answers,
    });
  }
}
