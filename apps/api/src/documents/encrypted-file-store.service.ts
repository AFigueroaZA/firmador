import { mkdir, readFile, rm, stat, unlink, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { loadAppConfig } from '../config/app.config';
import { SealedPayloadService } from './sealed-payload.service';

@Injectable()
export class EncryptedFileStoreService {
  private readonly storageRoot = loadAppConfig().storageRoot;

  constructor(private readonly sealedPayloadService: SealedPayloadService) {}

  async save(processId: string, kind: string, buffer: Buffer) {
    const filePath = join(this.storageRoot, processId, `${kind}.bin`);
    await mkdir(dirname(filePath), { recursive: true });
    const encrypted = this.sealedPayloadService.sealBuffer(buffer);
    await writeFile(filePath, encrypted);
    return filePath;
  }

  async read(storagePath?: string | null) {
    if (!storagePath) {
      throw new NotFoundException('Document is not available.');
    }

    const encrypted = await readFile(storagePath);
    return this.sealedPayloadService.openBuffer(encrypted);
  }

  async exists(storagePath?: string | null) {
    if (!storagePath) {
      return false;
    }

    try {
      await stat(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath?: string | null) {
    if (!storagePath) {
      return;
    }

    try {
      await unlink(storagePath);
    } catch {
      return;
    }
  }

  async deleteProcessDirectory(processId: string) {
    await rm(join(this.storageRoot, processId), {
      recursive: true,
      force: true,
    });
  }
}
