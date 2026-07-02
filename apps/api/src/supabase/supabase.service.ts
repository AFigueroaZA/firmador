import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { loadAppConfig } from '../config/app.config';

@Injectable()
export class SupabaseService {
  private readonly publicClient: ReturnType<typeof createClient> | null;
  private readonly adminClient: ReturnType<typeof createClient> | null;

  constructor() {
    const config = loadAppConfig();
    this.publicClient =
      config.supabaseUrl && config.supabasePublishableKey
        ? createClient(config.supabaseUrl, config.supabasePublishableKey)
        : null;
    this.adminClient =
      config.supabaseUrl && config.supabaseServiceRoleKey
        ? createClient(config.supabaseUrl, config.supabaseServiceRoleKey, {
            auth: {
              autoRefreshToken: false,
              persistSession: false,
            },
          })
        : null;
  }

  getPublicClient() {
    if (!this.publicClient) {
      throw new Error('Supabase client is not configured.');
    }
    return this.publicClient;
  }

  getAdminClient() {
    if (!this.adminClient) {
      throw new Error('Supabase admin client is not configured.');
    }
    return this.adminClient;
  }
}
