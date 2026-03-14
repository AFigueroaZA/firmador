import { Injectable } from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { SigningService } from '../signing/signing.service';

@Injectable()
export class HistoryService {
  constructor(private readonly signingService: SigningService) {}

  async list(requestUser: RequestUser) {
    return {
      items: await this.signingService.listProcessSummaries(requestUser),
    };
  }

  async auditTrail(requestUser: RequestUser, processId: string) {
    return this.signingService.getAuditTrail(requestUser, processId);
  }
}
