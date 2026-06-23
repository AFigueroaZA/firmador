import { Injectable } from '@nestjs/common';
import { EncryptedFileStoreService } from './encrypted-file-store.service';

@Injectable()
export class DocumentStorageService {
  constructor(private readonly encryptedFileStore: EncryptedFileStoreService) {}

  async save(processId: string, kind: string, buffer: Buffer) {
    return this.encryptedFileStore.save(processId, kind, buffer);
  }

  async read(storagePath?: string | null) {
    return this.encryptedFileStore.read(storagePath);
  }

  async exists(storagePath?: string | null) {
    return this.encryptedFileStore.exists(storagePath);
  }

  async delete(storagePath?: string | null) {
    return this.encryptedFileStore.delete(storagePath);
  }

  async deleteProcessDirectory(processId: string) {
    return this.encryptedFileStore.deleteProcessDirectory(processId);
  }
}
