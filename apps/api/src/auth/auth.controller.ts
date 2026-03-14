import {
  Body,
  Controller,
  Get,
  Post,
  Res,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { SessionAuthGuard } from './guards/session-auth.guard';
import type { RequestUser } from './interfaces/request-user.interface';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.login(dto, response);
  }

  @Post('refresh')
  async refresh(
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.refresh(request, response);
  }

  @Post('logout')
  async logout(
    @CurrentUser() requestUser: RequestUser | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    return this.authService.logout(requestUser, response);
  }

  @Get('me')
  @UseGuards(SessionAuthGuard)
  async me(@CurrentUser() requestUser: RequestUser) {
    return this.authService.getSession(requestUser);
  }
}
