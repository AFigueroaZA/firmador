import type {
  BalanceResponse,
  CreditMovementSummary,
  PurchaseCreditsResponse,
} from '@firmador/shared';
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { DataSource, EntityManager } from 'typeorm';
import { SignatureAccountEntity } from '../signing/entities/signature-account.entity';
import { CreditMovementEntity } from './entities/credit-movement.entity';
import { PaymentEntity } from './entities/payment.entity';

export const CREDIT_PACKS = [1, 5, 10] as const;

@Injectable()
export class CreditsService {
  constructor(private readonly dataSource: DataSource) {}

  async ensureAccount(userId: string) {
    return this.dataSource.transaction((manager) =>
      this.ensureAccountWithManager(manager, userId),
    );
  }

  async getOverview(userId: string): Promise<BalanceResponse> {
    const account = await this.ensureAccount(userId);
    const movements = await this.dataSource
      .getRepository(CreditMovementEntity)
      .find({
        where: { accountId: account.id },
        order: { createdAt: 'DESC' },
        take: 20,
      });

    return {
      currentBalance: account.currentBalance,
      packs: CREDIT_PACKS,
      movements: movements.map((movement) => this.toMovementSummary(movement)),
    };
  }

  async getCurrentBalance(userId: string) {
    return (await this.ensureAccount(userId)).currentBalance;
  }

  async purchase(
    userId: string,
    input: { operationId: string; credits: 1 | 5 | 10 },
  ): Promise<PurchaseCreditsResponse> {
    return this.dataSource.transaction(async (manager) => {
      const paymentRepository = manager.getRepository(PaymentEntity);
      const account = await this.ensureAccountWithManager(manager, userId);
      const existing = await paymentRepository.findOne({
        where: { id: input.operationId },
      });
      if (existing) {
        if (
          existing.userId !== userId ||
          existing.creditsPurchased !== input.credits ||
          existing.status !== 'APPROVED'
        ) {
          throw new ConflictException({
            code: 'OPERATION_ID_CONFLICT',
            message: 'The operation identifier is already in use.',
          });
        }
        return {
          paymentId: existing.id,
          creditsPurchased: input.credits,
          currentBalance: account.currentBalance,
        };
      }

      const payment = paymentRepository.create({
        id: input.operationId,
        userId,
        provider: 'SIMULATED',
        providerPaymentId: input.operationId,
        amountClp: 0,
        creditsPurchased: input.credits,
        status: 'APPROVED',
        paidAt: new Date(),
        metadata: { mode: 'simulated', packCredits: input.credits },
      });
      await paymentRepository.save(payment);

      account.currentBalance += input.credits;
      await manager.getRepository(SignatureAccountEntity).save(account);
      await manager.getRepository(CreditMovementEntity).save(
        manager.getRepository(CreditMovementEntity).create({
          id: randomUUID(),
          accountId: account.id,
          paymentId: payment.id,
          signingProcessId: null,
          actorUserId: userId,
          movementType: 'CHARGE',
          quantity: input.credits,
          balanceAfter: account.currentBalance,
          description: `Compra simulada de ${input.credits} firma${input.credits === 1 ? '' : 's'}.`,
        }),
      );

      return {
        paymentId: payment.id,
        creditsPurchased: input.credits,
        currentBalance: account.currentBalance,
      };
    });
  }

  async reserveForProcess(userId: string, processId: string) {
    return this.dataSource.transaction(async (manager) => {
      const movementRepository = manager.getRepository(CreditMovementEntity);
      const account = await this.ensureAccountWithManager(manager, userId);
      const existing = await movementRepository.findOne({
        where: { signingProcessId: processId, movementType: 'CONSUMPTION' },
      });
      if (existing) {
        if (existing.accountId !== account.id) {
          throw new ConflictException(
            'The signing credit belongs to another account.',
          );
        }
        return account.currentBalance;
      }

      if (account.currentBalance < 1) {
        throw new ConflictException({
          code: 'INSUFFICIENT_CREDITS',
          message: 'No signature credits are available.',
        });
      }

      account.currentBalance -= 1;
      await manager.getRepository(SignatureAccountEntity).save(account);
      await movementRepository.save(
        movementRepository.create({
          id: randomUUID(),
          accountId: account.id,
          paymentId: null,
          signingProcessId: processId,
          actorUserId: userId,
          movementType: 'CONSUMPTION',
          quantity: -1,
          balanceAfter: account.currentBalance,
          description: 'Reserva de una firma para el proceso.',
        }),
      );
      return account.currentBalance;
    });
  }

  async refundForProcess(processId: string, description: string) {
    return this.dataSource.transaction(async (manager) => {
      const movementRepository = manager.getRepository(CreditMovementEntity);
      const consumption = await movementRepository.findOne({
        where: { signingProcessId: processId, movementType: 'CONSUMPTION' },
      });
      if (!consumption) {
        return false;
      }

      const account = await manager
        .getRepository(SignatureAccountEntity)
        .findOne({
          where: { id: consumption.accountId },
          lock: { mode: 'pessimistic_write' },
        });
      if (!account) {
        throw new NotFoundException('Signature account was not found.');
      }

      const existingRefund = await movementRepository.findOne({
        where: { signingProcessId: processId, movementType: 'REFUND' },
      });
      if (existingRefund) {
        return false;
      }

      account.currentBalance += 1;
      await manager.getRepository(SignatureAccountEntity).save(account);
      await movementRepository.save(
        movementRepository.create({
          id: randomUUID(),
          accountId: account.id,
          paymentId: null,
          signingProcessId: processId,
          actorUserId: null,
          movementType: 'REFUND',
          quantity: 1,
          balanceAfter: account.currentBalance,
          description,
        }),
      );
      return true;
    });
  }

  async adjustBalance(input: {
    userId: string;
    actorUserId: string;
    operationId: string;
    quantity: number;
    reason: string;
  }) {
    if (!Number.isInteger(input.quantity) || input.quantity === 0) {
      throw new ConflictException(
        'The adjustment quantity must be a non-zero integer.',
      );
    }

    return this.dataSource.transaction(async (manager) => {
      const movementRepository = manager.getRepository(CreditMovementEntity);
      const account = await this.ensureAccountWithManager(
        manager,
        input.userId,
      );
      const existing = await movementRepository.findOne({
        where: { id: input.operationId },
      });
      if (existing) {
        if (
          existing.accountId !== account.id ||
          existing.movementType !== 'ADJUSTMENT' ||
          existing.quantity !== input.quantity
        ) {
          throw new ConflictException({
            code: 'OPERATION_ID_CONFLICT',
            message: 'The operation identifier is already in use.',
          });
        }
        return account.currentBalance;
      }

      const nextBalance = account.currentBalance + input.quantity;
      if (nextBalance < 0) {
        throw new ConflictException({
          code: 'INSUFFICIENT_CREDITS',
          message: 'The adjustment would leave a negative balance.',
        });
      }

      account.currentBalance = nextBalance;
      await manager.getRepository(SignatureAccountEntity).save(account);
      await movementRepository.save(
        movementRepository.create({
          id: input.operationId,
          accountId: account.id,
          paymentId: null,
          signingProcessId: null,
          actorUserId: input.actorUserId,
          movementType: 'ADJUSTMENT',
          quantity: input.quantity,
          balanceAfter: nextBalance,
          description: input.reason.trim(),
        }),
      );
      return nextBalance;
    });
  }

  private async ensureAccountWithManager(
    manager: EntityManager,
    userId: string,
  ) {
    const accountId = randomUUID();
    const inserted = await manager.query<Array<{ id: string }>>(
      `insert into public.signature_accounts (id, user_id, current_balance)
       values ($1, $2, 1)
       on conflict (user_id) do nothing
       returning id`,
      [accountId, userId],
    );

    const account = await manager
      .getRepository(SignatureAccountEntity)
      .findOne({
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });
    if (!account) {
      throw new NotFoundException('Signature account could not be created.');
    }

    if (inserted.length > 0) {
      await manager.getRepository(CreditMovementEntity).save(
        manager.getRepository(CreditMovementEntity).create({
          id: randomUUID(),
          accountId: account.id,
          paymentId: null,
          signingProcessId: null,
          actorUserId: null,
          movementType: 'ADJUSTMENT',
          quantity: 1,
          balanceAfter: 1,
          description: 'Firma de bienvenida.',
        }),
      );
    }
    return account;
  }

  private toMovementSummary(
    movement: CreditMovementEntity,
  ): CreditMovementSummary {
    return {
      id: movement.id,
      type: movement.movementType,
      quantity: movement.quantity,
      balanceAfter: movement.balanceAfter,
      description: movement.description,
      createdAt: movement.createdAt.toISOString(),
    };
  }
}
