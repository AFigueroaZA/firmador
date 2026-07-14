import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { loadAppConfig } from '../config/app.config';
import { CreateSupabaseSupportTables1710000000000 } from './migrations/1710000000000-CreateSupabaseSupportTables';
import { AddCreditLedgerSupport1783970000000 } from './migrations/1783970000000-AddCreditLedgerSupport';

export const createTypeOrmOptions = (): TypeOrmModuleOptions => {
  const config = loadAppConfig();

  return {
    type: 'postgres',
    url: config.databaseUrl,
    schema: config.databaseSchema ?? 'public',
    autoLoadEntities: true,
    synchronize: config.databaseSynchronize,
    migrations: [
      CreateSupabaseSupportTables1710000000000,
      AddCreditLedgerSupport1783970000000,
    ],
    migrationsRun: true,
    ssl: config.databaseUrl?.includes('localhost')
      ? false
      : { rejectUnauthorized: false },
  };
};
