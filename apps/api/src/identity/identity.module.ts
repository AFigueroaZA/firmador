import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { UserIdentityEntity } from './entities/user-identity.entity';
import { IdentityController } from './identity.controller';
import { IdentityService } from './identity.service';

@Module({
  imports: [TypeOrmModule.forFeature([UserIdentityEntity]), AuthModule],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService, TypeOrmModule],
})
export class IdentityModule {}
