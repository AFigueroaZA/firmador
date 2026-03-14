import type { AuditEventSummary, SigningProcessStatus } from '@firmador/shared';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { sanitizeObject } from '../common/utils/sanitize-object';
import { AuditEventEntity } from './audit-event.entity';

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditEventEntity)
    private readonly auditRepository: Repository<AuditEventEntity>,
  ) {}

  async record(input: {
    processId: string;
    actorUserId?: string | null;
    actor: string;
    type: string;
    message: string;
    fromStatus?: SigningProcessStatus | null;
    toStatus?: SigningProcessStatus | null;
    meta?: Record<string, unknown>;
  }) {
    const entity = this.auditRepository.create({
      processId: input.processId,
      actorUserId: input.actorUserId ?? null,
      actor: input.actor,
      type: input.type,
      message: input.message,
      fromStatus: input.fromStatus ?? null,
      toStatus: input.toStatus ?? null,
      meta: (sanitizeObject(input.meta) as Record<string, unknown>) ?? null,
    });
    return this.auditRepository.save(entity);
  }

  async listForProcess(processId: string): Promise<AuditEventSummary[]> {
    const events = await this.auditRepository.find({
      where: { processId },
      order: { createdAt: 'ASC' },
    });

    return events.map((event) => ({
      id: event.id,
      type: event.type,
      actor: event.actor,
      message: event.message,
      fromStatus: event.fromStatus ?? undefined,
      toStatus: event.toStatus ?? undefined,
      createdAt: event.createdAt.toISOString(),
      meta: event.meta ?? undefined,
    }));
  }
}
