import { NestFactory } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AppModule } from '../app.module';
import { loadAppConfig } from '../config/app.config';
import { SupabaseService } from '../supabase/supabase.service';

/**
 * Deletes every user created during testing along with everything that
 * hangs off of them (documents, signing processes, identities, etc.),
 * their Supabase Auth account, and their files in Storage.
 *
 * The seed admin/operator accounts (SEED_ADMIN_EMAIL / SEED_OPERATOR_EMAIL)
 * are always kept so the app stays usable after cleanup.
 *
 * Usage:
 *   pnpm --filter @firmador/api cleanup:test-data            # dry run, only reports what would be deleted
 *   pnpm --filter @firmador/api cleanup:test-data -- --yes    # actually deletes
 */

interface UserRow {
  id: string;
  auth_user_id: string | null;
  email: string;
}

async function run() {
  const confirmed = process.argv.includes('--yes');
  const config = loadAppConfig();
  const keepEmails = [
    process.env.SEED_ADMIN_EMAIL,
    process.env.SEED_OPERATOR_EMAIL,
  ]
    .filter((email): email is string => Boolean(email))
    .map((email) => email.toLowerCase());

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });

  try {
    const dataSource = app.get(DataSource);
    const supabaseService = app.get(SupabaseService);

    const usersToDelete: UserRow[] = await dataSource.query(
      `select id, auth_user_id, email from public.users where lower(email) != all($1::text[])`,
      [keepEmails],
    );

    if (usersToDelete.length === 0) {
      console.log('No test users found. Nothing to clean up.');
      return;
    }

    const userIds = usersToDelete.map((u) => u.id);

    const storageRows: Array<{ path: string }> = await dataSource.query(
      `select storage_path as path from public.documents where user_id = any($1::uuid[])
       union
       select image_storage_path as path from public.signature_assets sa
         join public.signing_processes sp on sp.id = sa.signing_process_id
         where sp.user_id = any($1::uuid[]) and sa.image_storage_path is not null
       union
       select signed_document_path as path from public.signing_processes
         where user_id = any($1::uuid[]) and signed_document_path is not null`,
      [userIds],
    );
    const storagePaths = storageRows.map((row) => row.path);

    const registrationIntents: number = await dataSource
      .query(`select count(*)::int as count from public.registration_intents`)
      .then((rows: { count: number }[]) => rows[0].count);

    console.log(`Users to delete: ${usersToDelete.length}`);
    for (const user of usersToDelete) {
      console.log(`  - ${user.email} (${user.id})`);
    }
    console.log(`Storage objects to delete: ${storagePaths.length}`);
    console.log(`Registration intents to delete: ${registrationIntents}`);
    console.log(
      `Kept accounts: ${keepEmails.join(', ') || '(none configured)'}`,
    );

    if (!confirmed) {
      console.log(
        '\nDry run only. Re-run with --yes to actually delete this data.',
      );
      return;
    }

    await dataSource.transaction(async (manager) => {
      await manager.query(
        `delete from public.signature_assets where signing_process_id in
           (select id from public.signing_processes where user_id = any($1::uuid[]))`,
        [userIds],
      );
      await manager.query(
        `delete from public.provider_events where signing_process_id in
           (select id from public.signing_processes where user_id = any($1::uuid[]))`,
        [userIds],
      );
      await manager.query(
        `delete from public.signing_processes where user_id = any($1::uuid[])`,
        [userIds],
      );
      await manager.query(
        `delete from public.documents where user_id = any($1::uuid[])`,
        [userIds],
      );
      await manager.query(
        `delete from public.signature_accounts where user_id = any($1::uuid[])`,
        [userIds],
      );
      await manager.query(
        `delete from public.signature_registrations where user_id = any($1::uuid[])`,
        [userIds],
      );
      await manager.query(
        `delete from public.user_identities where user_id = any($1::uuid[])`,
        [userIds],
      );
      await manager.query(`delete from public.registration_intents`);
      await manager.query(
        `delete from public.users where id = any($1::uuid[])`,
        [userIds],
      );
    });

    const adminClient = supabaseService.getAdminClient();

    if (storagePaths.length > 0) {
      const { error: storageError } = await adminClient.storage
        .from(config.supabaseStorageBucket)
        .remove(storagePaths);
      if (storageError) {
        console.warn(`Storage cleanup warning: ${storageError.message}`);
      }
    }

    for (const user of usersToDelete) {
      if (!user.auth_user_id) {
        continue;
      }
      const { error } = await adminClient.auth.admin.deleteUser(
        user.auth_user_id,
      );
      if (error) {
        console.warn(
          `Could not delete Supabase Auth user ${user.email}: ${error.message}`,
        );
      }
    }

    console.log('\nCleanup complete.');
  } finally {
    await app.close();
  }
}

void run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
