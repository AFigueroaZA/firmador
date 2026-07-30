import { Global, Module } from '@nestjs/common';
import { SupabaseSetupService } from './supabase-setup.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService, SupabaseSetupService],
  exports: [SupabaseService, SupabaseSetupService],
})
export class SupabaseModule {}
