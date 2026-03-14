import { Injectable, OnApplicationBootstrap } from '@nestjs/common';
import { AuthService } from './auth.service';

@Injectable()
export class AuthBootstrapService implements OnApplicationBootstrap {
  constructor(private readonly authService: AuthService) {}

  async onApplicationBootstrap() {
    await this.authService.seedDefaultUsers();
  }
}
