import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthBootstrapService } from './auth.bootstrap.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { UserEntity } from './user.entity';

@Module({
  imports: [JwtModule.register({}), TypeOrmModule.forFeature([UserEntity])],
  controllers: [AuthController],
  providers: [AuthService, AuthBootstrapService, SessionAuthGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard, TypeOrmModule],
})
export class AuthModule {}
