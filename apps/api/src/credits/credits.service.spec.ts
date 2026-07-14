import { ConflictException } from '@nestjs/common';
import { SignatureAccountEntity } from '../signing/entities/signature-account.entity';
import { CreditsService } from './credits.service';
import { CreditMovementEntity } from './entities/credit-movement.entity';
import { PaymentEntity } from './entities/payment.entity';

describe('CreditsService', () => {
  const createHarness = () => {
    const accounts: SignatureAccountEntity[] = [];
    const movements: CreditMovementEntity[] = [];
    const payments: PaymentEntity[] = [];

    const accountRepository = {
      findOne: jest.fn(
        ({ where }: { where: { id?: string; userId?: string } }) =>
          Promise.resolve(
            accounts.find(
              (account) =>
                (where.id === undefined || account.id === where.id) &&
                (where.userId === undefined || account.userId === where.userId),
            ) ?? null,
          ),
      ),
      save: jest.fn((account: SignatureAccountEntity) => {
        const index = accounts.findIndex((item) => item.id === account.id);
        if (index >= 0) accounts[index] = account;
        else accounts.push(account);
        return Promise.resolve(account);
      }),
    };
    const movementRepository = {
      create: jest.fn((input: Partial<CreditMovementEntity>) => ({
        createdAt: new Date(),
        ...input,
      })),
      findOne: jest.fn(
        ({
          where,
        }: {
          where: {
            id?: string;
            signingProcessId?: string;
            movementType?: string;
          };
        }) =>
          Promise.resolve(
            movements.find(
              (movement) =>
                (where.id === undefined || movement.id === where.id) &&
                (where.signingProcessId === undefined ||
                  movement.signingProcessId === where.signingProcessId) &&
                (where.movementType === undefined ||
                  movement.movementType === where.movementType),
            ) ?? null,
          ),
      ),
      find: jest.fn(() => Promise.resolve([...movements].reverse())),
      save: jest.fn((movement: CreditMovementEntity) => {
        if (!movements.some((item) => item.id === movement.id)) {
          movements.push(movement);
        }
        return Promise.resolve(movement);
      }),
    };
    const paymentRepository = {
      create: jest.fn((input: Partial<PaymentEntity>) => ({
        createdAt: new Date(),
        updatedAt: new Date(),
        ...input,
      })),
      findOne: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          payments.find((payment) => payment.id === where.id) ?? null,
        ),
      ),
      save: jest.fn((payment: PaymentEntity) => {
        if (!payments.some((item) => item.id === payment.id)) {
          payments.push(payment);
        }
        return Promise.resolve(payment);
      }),
    };
    const getRepository = (target: unknown) => {
      if (target === SignatureAccountEntity) return accountRepository;
      if (target === CreditMovementEntity) return movementRepository;
      if (target === PaymentEntity) return paymentRepository;
      throw new Error('Unknown repository target.');
    };
    const manager = {
      getRepository,
      query: jest.fn((sql: string, params: string[]) => {
        if (!sql.includes('insert into public.signature_accounts')) {
          throw new Error('Unexpected query.');
        }
        const [id, userId] = params;
        if (accounts.some((account) => account.userId === userId)) {
          return Promise.resolve([]);
        }
        accounts.push({
          id,
          userId,
          currentBalance: 1,
        } as SignatureAccountEntity);
        return Promise.resolve([{ id }]);
      }),
    };
    const dataSource = {
      transaction: jest.fn(
        (callback: (input: typeof manager) => Promise<unknown>) =>
          callback(manager),
      ),
      getRepository,
    };

    return {
      service: new CreditsService(dataSource as never),
      accounts,
      movements,
      payments,
    };
  };

  it('grants the welcome credit exactly once', async () => {
    const harness = createHarness();

    await harness.service.ensureAccount('user-1');
    await harness.service.ensureAccount('user-1');

    expect(harness.accounts).toHaveLength(1);
    expect(harness.accounts[0]?.currentBalance).toBe(1);
    expect(
      harness.movements.filter(
        (movement) => movement.description === 'Firma de bienvenida.',
      ),
    ).toHaveLength(1);
  });

  it('purchases a pack idempotently', async () => {
    const harness = createHarness();
    const input = {
      operationId: '11111111-1111-4111-8111-111111111111',
      credits: 5 as const,
    };

    const first = await harness.service.purchase('user-1', input);
    const retry = await harness.service.purchase('user-1', input);

    expect(first.currentBalance).toBe(6);
    expect(retry.currentBalance).toBe(6);
    expect(harness.payments).toHaveLength(1);
    expect(
      harness.movements.filter(
        (movement) => movement.movementType === 'CHARGE',
      ),
    ).toHaveLength(1);
  });

  it('reserves and refunds a process only once', async () => {
    const harness = createHarness();
    await harness.service.ensureAccount('user-1');

    await expect(
      harness.service.reserveForProcess('user-1', 'process-1'),
    ).resolves.toBe(0);
    await expect(
      harness.service.reserveForProcess('user-1', 'process-1'),
    ).resolves.toBe(0);
    await expect(
      harness.service.reserveForProcess('user-1', 'process-2'),
    ).rejects.toBeInstanceOf(ConflictException);

    await expect(
      harness.service.refundForProcess('process-1', 'Falló la firma.'),
    ).resolves.toBe(true);
    await expect(
      harness.service.refundForProcess('process-1', 'Falló la firma.'),
    ).resolves.toBe(false);
    expect(harness.accounts[0]?.currentBalance).toBe(1);
  });

  it('rejects an administrative adjustment below zero', async () => {
    const harness = createHarness();
    await harness.service.ensureAccount('user-1');

    await expect(
      harness.service.adjustBalance({
        userId: 'user-1',
        actorUserId: 'admin-1',
        operationId: '22222222-2222-4222-8222-222222222222',
        quantity: -2,
        reason: 'Corrección administrativa',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(harness.accounts[0]?.currentBalance).toBe(1);
  });
});
