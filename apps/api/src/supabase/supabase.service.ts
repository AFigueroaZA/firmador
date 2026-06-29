import { Injectable } from '@nestjs/common';
import { createClient } from '@supabase/supabase-js';
import { loadAppConfig } from '../config/app.config';

@Injectable()
export class SupabaseService {
  private readonly client: ReturnType<typeof createClient>;

  constructor() {
    const config = loadAppConfig();

    if (!config.supabaseUrl || !config.supabasePublishableKey) {
      throw new Error(
        'Supabase configuration is required: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.',
      );
    }

    this.client = createClient(
      config.supabaseUrl,
      config.supabasePublishableKey,
    );
  }

  getClient() {
    return this.client;
  }
}
