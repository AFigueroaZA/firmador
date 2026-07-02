import { Global, Module } from '@nestjs/common';
import { SupabaseBootstrapService } from './supabase.bootstrap.service';
import { SupabaseService } from './supabase.service';

@Global()
@Module({
  providers: [SupabaseService, SupabaseBootstrapService],
  exports: [SupabaseService],
})
export class SupabaseModule {}
