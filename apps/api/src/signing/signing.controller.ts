import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import type { Express, Response } from 'express';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { SessionAuthGuard } from '../auth/guards/session-auth.guard';
import { ChallengePayloadDto } from './dto/challenge-payload.dto';
import { SignOptionsDto } from './dto/sign-options.dto';
import { SigningService } from './signing.service';

@Controller('api/signing')
@UseGuards(SessionAuthGuard)
export class SigningController {
  constructor(private readonly signingService: SigningService) {}

  @Post('processes')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'pdf', maxCount: 1 },
        { name: 'imageFile', maxCount: 1 },
      ],
      {
        limits: {
          fileSize: 20 * 1024 * 1024,
        },
      },
    ),
  )
  async createProcess(
    @CurrentUser() requestUser: RequestUser,
    @UploadedFiles()
    files: {
      pdf?: Express.Multer.File[];
      imageFile?: Express.Multer.File[];
    },
    @Body() body: Record<string, string | undefined>,
  ) {
    return this.signingService.createProcess(
      requestUser,
      files.pdf?.[0],
      files.imageFile?.[0],
      body,
    );
  }

  @Get('processes/:id')
  async getProcess(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
  ) {
    return this.signingService.getProcessDetail(requestUser, processId);
  }

  @Get('processes/:id/authorize')
  async getAuthorizationUrl(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
  ) {
    return this.signingService.getAuthorizationUrl(requestUser, processId);
  }

  @Get('processes/:id/payment')
  async getPaymentEligibility(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
  ) {
    return this.signingService.getPaymentEligibility(requestUser, processId);
  }

  @Patch('processes/:id/sign-options')
  async updateSignOptions(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
    @Body() body: SignOptionsDto,
  ) {
    return this.signingService.updateSignOptions(requestUser, processId, {
      ...body,
    });
  }

  @Post('processes/:id/challenge')
  async submitChallenge(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
    @Body() payload: ChallengePayloadDto,
  ) {
    return this.signingService.submitChallenge(requestUser, processId, {
      idChallenge: payload.idChallenge,
      answers: payload.answers,
    });
  }

  @Post('processes/:id/start-signing')
  async startSigning(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
  ) {
    return this.signingService.startDemoSigning(requestUser, processId);
  }

  @Get('processes/:id/download')
  async downloadSignedDocument(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
    @Res() response: Response,
  ) {
    const result = await this.signingService.downloadSignedDocument(
      requestUser,
      processId,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${result.fileName}"`,
    );
    return response.send(result.buffer);
  }

  @Get('processes/:id/original')
  async downloadOriginalDocument(
    @CurrentUser() requestUser: RequestUser,
    @Param('id') processId: string,
    @Res() response: Response,
  ) {
    const result = await this.signingService.downloadOriginalDocument(
      requestUser,
      processId,
    );
    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader('Cache-Control', 'no-store');
    response.setHeader(
      'Content-Disposition',
      `inline; filename="${result.fileName}"`,
    );
    return response.send(result.buffer);
  }
}
