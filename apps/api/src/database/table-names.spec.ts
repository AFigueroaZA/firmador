import { getMetadataArgsStorage } from 'typeorm';
import { AuditEventEntity } from '../audit/audit-event.entity';
import { RoleEntity } from '../auth/role.entity';
import { UserEntity } from '../auth/user.entity';
import { CreditMovementEntity } from '../credits/entities/credit-movement.entity';
import { PaymentEntity } from '../credits/entities/payment.entity';
import { UserIdentityEntity } from '../identity/entities/user-identity.entity';
import { RegistrationIntentEntity } from '../registration/entities/registration-intent.entity';
import { DocumentEntity } from '../signing/entities/document.entity';
import { SignatureAccountEntity } from '../signing/entities/signature-account.entity';
import { SignatureAssetEntity } from '../signing/entities/signature-asset.entity';
import { SignatureRegistrationEntity } from '../signing/entities/signature-registration.entity';
import { SigningProcessEntity } from '../signing/entities/signing-process.entity';
import { SigningStatusEntity } from '../signing/entities/signing-status.entity';

describe('database table names', () => {
  const entities = [
    AuditEventEntity,
    CreditMovementEntity,
    DocumentEntity,
    RegistrationIntentEntity,
    PaymentEntity,
    RoleEntity,
    SignatureAccountEntity,
    SignatureAssetEntity,
    SignatureRegistrationEntity,
    SigningProcessEntity,
    SigningStatusEntity,
    UserEntity,
    UserIdentityEntity,
  ];

  it('uses the existing Supabase public tables', () => {
    const tableNames = new Map(
      getMetadataArgsStorage()
        .tables.filter((table) => entities.includes(table.target as never))
        .map((table) => [table.target, table.name]),
    );

    expect(tableNames.get(UserEntity)).toBe('users');
    expect(tableNames.get(UserIdentityEntity)).toBe('user_identities');
    expect(tableNames.get(RegistrationIntentEntity)).toBe(
      'registration_intents',
    );
    expect(tableNames.get(SigningProcessEntity)).toBe('signing_processes');
    expect(tableNames.get(SignatureRegistrationEntity)).toBe(
      'signature_registrations',
    );
    expect(tableNames.get(AuditEventEntity)).toBe('provider_events');
    expect(tableNames.get(PaymentEntity)).toBe('payments');
    expect(tableNames.get(CreditMovementEntity)).toBe(
      'signature_credit_movements',
    );
  });

  it('declares database types for nullable entity columns', () => {
    const nullableColumnsWithoutType = getMetadataArgsStorage()
      .columns.filter(
        (column) =>
          entities.includes(column.target as never) &&
          column.options.nullable === true &&
          !column.options.type,
      )
      .map(
        (column) =>
          `${(column.target as { name: string }).name}.${column.propertyName}`,
      );

    expect(nullableColumnsWithoutType).toEqual([]);
  });
});
