import type { AuditEventSummary, SigningProcessStatus } from '@firmador/shared';
import { SIGNING_PROCESS_STATUSES } from '@firmador/shared';
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
      paymentId: null,
      provider: 'firmador',
      eventType: input.type,
      externalEventId: null,
      status: input.toStatus ?? input.fromStatus ?? null,
      payload: {
        actorUserId: input.actorUserId ?? null,
        actor: input.actor,
        message: input.message,
        fromStatus: input.fromStatus ?? null,
        toStatus: input.toStatus ?? null,
        meta: (sanitizeObject(input.meta) as Record<string, unknown>) ?? null,
      },
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
      type: event.eventType,
      actor:
        typeof event.payload.actor === 'string'
          ? event.payload.actor
          : 'system',
      message:
        typeof event.payload.message === 'string' ? event.payload.message : '',
      fromStatus: this.toSigningStatus(event.payload.fromStatus),
      toStatus: this.toSigningStatus(event.payload.toStatus),
      createdAt: event.createdAt.toISOString(),
      meta:
        event.payload.meta &&
        typeof event.payload.meta === 'object' &&
        !Array.isArray(event.payload.meta)
          ? (event.payload.meta as Record<string, unknown>)
          : undefined,
    }));
  }

  private toSigningStatus(value: unknown): SigningProcessStatus | undefined {
    return typeof value === 'string' &&
      SIGNING_PROCESS_STATUSES.includes(value as SigningProcessStatus)
      ? (value as SigningProcessStatus)
      : undefined;
  }
}
