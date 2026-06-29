import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from './audit/audit.module';
import { AuthModule } from './auth/auth.module';
import { loadAppConfig } from './config/app.config';
import { validateConfig } from './config/env.validation';
import { createTypeOrmOptions } from './database/typeorm.config';
import { DocumentsModule } from './documents/documents.module';
import { HistoryModule } from './history/history.module';
import { IdentityModule } from './identity/identity.module';
import { ProviderModule } from './provider/provider.module';
import { SigningModule } from './signing/signing.module';
import { SupabaseModule } from './supabase/supabase.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      envFilePath: ['.env', '../../.env'],
      validate: () => {
        const config = loadAppConfig();
        validateConfig(config);
        return process.env;
      },
    }),
    ScheduleModule.forRoot(),
    TypeOrmModule.forRootAsync({
      useFactory: createTypeOrmOptions,
    }),
    AuthModule,
    DocumentsModule,
    AuditModule,
    IdentityModule,
    ProviderModule,
    SigningModule,
    HistoryModule,
    SupabaseModule,
  ],
})
export class AppModule {}
