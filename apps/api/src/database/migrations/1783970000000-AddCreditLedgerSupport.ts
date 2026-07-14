import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCreditLedgerSupport1783970000000 implements MigrationInterface {
  name = 'AddCreditLedgerSupport1783970000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      alter table public.signature_credit_movements
      add column if not exists actor_user_id uuid
    `);
    await queryRunner.query(`
      do $$
      begin
        if not exists (
          select 1 from pg_constraint
          where conname = 'fk_credit_movements_actor_user'
        ) then
          alter table public.signature_credit_movements
          add constraint fk_credit_movements_actor_user
          foreign key (actor_user_id) references public.users(id)
          on update cascade on delete set null;
        end if;
      end $$
    `);
    await queryRunner.query(`
      create unique index if not exists uq_credit_movements_payment_charge
      on public.signature_credit_movements (payment_id)
      where payment_id is not null and movement_type = 'CHARGE'
    `);
    await queryRunner.query(`
      create unique index if not exists uq_credit_movements_process_lifecycle
      on public.signature_credit_movements (signing_process_id, movement_type)
      where signing_process_id is not null
        and movement_type in ('CONSUMPTION', 'REFUND')
    `);
    await queryRunner.query(`
      create unique index if not exists uq_payments_provider_operation
      on public.payments (provider, provider_payment_id)
      where provider_payment_id is not null
    `);

    await queryRunner.query(`
      with inserted as (
        insert into public.signature_accounts (id, user_id, current_balance)
        select gen_random_uuid(), users.id, 1
        from public.users users
        join public.roles roles on roles.id = users.role_id
        where roles.code = 'SIGNER'
          and not exists (
            select 1 from public.signature_accounts accounts
            where accounts.user_id = users.id
          )
        returning id
      )
      insert into public.signature_credit_movements (
        id, account_id, movement_type, quantity, balance_after, description
      )
      select gen_random_uuid(), id, 'ADJUSTMENT', 1, 1, 'Firma de bienvenida.'
      from inserted
    `);
    await queryRunner.query(`
      with updated as (
        update public.signature_accounts accounts
        set current_balance = 1, updated_at = now()
        from public.users users
        join public.roles roles on roles.id = users.role_id
        where accounts.user_id = users.id
          and roles.code = 'SIGNER'
          and accounts.current_balance = 0
        returning accounts.id
      )
      insert into public.signature_credit_movements (
        id, account_id, movement_type, quantity, balance_after, description
      )
      select gen_random_uuid(), id, 'ADJUSTMENT', 1, 1, 'Firma de bienvenida.'
      from updated
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'drop index if exists public.uq_payments_provider_operation',
    );
    await queryRunner.query(
      'drop index if exists public.uq_credit_movements_process_lifecycle',
    );
    await queryRunner.query(
      'drop index if exists public.uq_credit_movements_payment_charge',
    );
    await queryRunner.query(`
      alter table public.signature_credit_movements
      drop constraint if exists fk_credit_movements_actor_user
    `);
    await queryRunner.query(`
      alter table public.signature_credit_movements
      drop column if exists actor_user_id
    `);
  }
}
