import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupabaseSupportTables1710000000000 implements MigrationInterface {
  name = 'CreateSupabaseSupportTables1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      create table if not exists public.user_identities (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null unique references public.users(id) on delete cascade,
        status varchar not null,
        rut varchar unique,
        nombres varchar,
        apellido_paterno varchar,
        apellido_materno varchar,
        email varchar,
        telefono varchar,
        numero_documento varchar,
        fecha_nacimiento varchar,
        estado_civil varchar,
        clave_unica_validated_at timestamptz,
        external_auth_state varchar,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await queryRunner.query(`
      create table if not exists public.registration_intents (
        id uuid primary key default gen_random_uuid(),
        state varchar not null unique,
        status varchar not null,
        clave_code varchar,
        profile jsonb,
        completed_user_id uuid references public.users(id) on delete set null,
        error_message text,
        expires_at timestamptz not null,
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )
    `);

    await queryRunner.query(
      'alter table public.user_identities enable row level security',
    );
    await queryRunner.query(
      'alter table public.registration_intents enable row level security',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('drop table if exists public.registration_intents');
    await queryRunner.query('drop table if exists public.user_identities');
  }
}
