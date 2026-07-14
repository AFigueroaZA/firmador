import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CreditsModule } from '../credits/credits.module';
import { SupabaseModule } from '../supabase/supabase.module';
import { AuthBootstrapService } from './auth.bootstrap.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { RolesGuard } from './guards/roles.guard';
import { SessionAuthGuard } from './guards/session-auth.guard';
import { RoleEntity } from './role.entity';
import { UserEntity } from './user.entity';

@Module({
  imports: [
    SupabaseModule,
    CreditsModule,
    TypeOrmModule.forFeature([UserEntity, RoleEntity]),
  ],
  controllers: [AuthController],
  providers: [AuthService, AuthBootstrapService, SessionAuthGuard, RolesGuard],
  exports: [AuthService, SessionAuthGuard, RolesGuard, TypeOrmModule],
})
export class AuthModule {}
