import {
  Body,
  Controller,
  Get,
  Param,
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
}
