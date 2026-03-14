import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { loadAppConfig } from '../config/app.config';

@Injectable()
export class SealedPayloadService {
  private readonly key = createHash('sha256')
    .update(loadAppConfig().encryptionKey)
    .digest();

  sealBuffer(buffer: Buffer) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.key, iv);
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]);
  }

  openBuffer(buffer: Buffer) {
    const iv = buffer.subarray(0, 12);
    const tag = buffer.subarray(12, 28);
    const encrypted = buffer.subarray(28);
    const decipher = createDecipheriv('aes-256-gcm', this.key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
  }

  sealJson(value: Record<string, unknown>) {
    return this.sealBuffer(Buffer.from(JSON.stringify(value), 'utf8')).toString(
      'base64',
    );
  }

  openJson<T extends Record<string, unknown>>(value?: string | null): T | null {
    if (!value) {
      return null;
    }

    return JSON.parse(
      this.openBuffer(Buffer.from(value, 'base64')).toString('utf8'),
    ) as T;
  }
}
