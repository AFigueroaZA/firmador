import { Injectable } from '@nestjs/common';
import { loadAppConfig } from '../config/app.config';
import { SupabaseService } from './supabase.service';

@Injectable()
export class SupabaseSetupService {
  private readonly config = loadAppConfig();

  constructor(private readonly supabaseService: SupabaseService) {}

  async ensureStorageBucket() {
    const storage = this.supabaseService.getAdminClient().storage;
    const { data } = await storage.getBucket(this.config.supabaseStorageBucket);
    if (data) {
      return;
    }

    const { error } = await storage.createBucket(
      this.config.supabaseStorageBucket,
      {
        public: false,
      },
    );
    if (error && !error.message.toLowerCase().includes('already exists')) {
      throw new Error(`Unable to create Supabase bucket: ${error.message}`);
    }
  }
}
