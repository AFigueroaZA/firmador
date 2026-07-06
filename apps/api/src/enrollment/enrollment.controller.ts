import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { ChallengePayloadDto } from '../signing/dto/challenge-payload.dto';
import { EnrollmentService } from './enrollment.service';

@Controller('api/enrollment')
@UseGuards(SessionAuthGuard)
export class EnrollmentController {
  constructor(private readonly enrollmentService: EnrollmentService) {}

  @Get()
  async getStatus(@CurrentUser() requestUser: RequestUser) {
    return this.enrollmentService.getStatus(requestUser.id);
  }

  @Post('challenge/start')
  async startChallenge(@CurrentUser() requestUser: RequestUser) {
    return this.enrollmentService.startChallenge(requestUser);
  }

  @Post('challenge')
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
