import { Injectable, NotFoundException } from '@nestjs/common';
import { loadAppConfig } from '../config/app.config';
import { SupabaseService } from '../supabase/supabase.service';
import { SealedPayloadService } from './sealed-payload.service';

@Injectable()
export class DocumentStorageService {
  private readonly bucket = loadAppConfig().supabaseStorageBucket;

  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly sealedPayloadService: SealedPayloadService,
  ) {}

  async save(processId: string, kind: string, buffer: Buffer) {
    const path = `${processId}/${kind}.bin`;
    const encrypted = this.sealedPayloadService.sealBuffer(buffer);
    const { error } = await this.supabaseService
      .getAdminClient()
      .storage.from(this.bucket)
      .upload(path, encrypted, {
        contentType: 'application/octet-stream',
        upsert: true,
      });

    if (error) {
      throw new Error(`Unable to store document: ${error.message}`);
    }

    return path;
  }

  async read(storagePath?: string | null) {
    if (!storagePath) {
      throw new NotFoundException('Document is not available.');
    }

    const { data, error } = await this.supabaseService
      .getAdminClient()
      .storage.from(this.bucket)
      .download(storagePath);
    if (error || !data) {
      throw new NotFoundException('Document is not available.');
    }

    return this.sealedPayloadService.openBuffer(
      Buffer.from(await data.arrayBuffer()),
    );
  }

  async exists(storagePath?: string | null) {
    if (!storagePath) {
      return false;
    }

    const directory = storagePath.split('/').slice(0, -1).join('/');
    const fileName = storagePath.split('/').at(-1);
    const { data, error } = await this.supabaseService
      .getAdminClient()
      .storage.from(this.bucket)
      .list(directory);
    if (error) {
      return false;
    }
    return Boolean(data?.some((item) => item.name === fileName));
  }

  async delete(storagePath?: string | null) {
    if (!storagePath) {
      return;
    }

    await this.supabaseService
      .getAdminClient()
      .storage.from(this.bucket)
      .remove([storagePath]);
  }

  async deleteProcessDirectory(processId: string) {
    const { data } = await this.supabaseService
      .getAdminClient()
      .storage.from(this.bucket)
      .list(processId);
    const paths = data?.map((item) => `${processId}/${item.name}`) ?? [];
    if (paths.length > 0) {
      await this.supabaseService
        .getAdminClient()
        .storage.from(this.bucket)
        .remove(paths);
    }
  }
}
