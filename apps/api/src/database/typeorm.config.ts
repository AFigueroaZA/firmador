import { join } from 'node:path';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { loadAppConfig } from '../config/app.config';

export const createTypeOrmOptions = (): TypeOrmModuleOptions => {
  const config = loadAppConfig();

  if (config.databaseUrl) {
    return {
      type: 'postgres',
      url: config.databaseUrl,
      autoLoadEntities: true,
      synchronize: config.databaseSynchronize,
      ssl: config.databaseUrl.includes('localhost')
        ? false
        : { rejectUnauthorized: false },
    };
  }

  return {
    type: 'sqljs',
    autoLoadEntities: true,
    location:
      process.env.SQLITE_LOCATION ??
      join(process.cwd(), 'apps', 'api', 'data', 'firmador.sqlite'),
    autoSave: true,
    synchronize: true,
  };
};
