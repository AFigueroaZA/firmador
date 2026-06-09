import { existsSync, mkdirSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
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

  const defaultSqliteLocation = (() => {
    const currentDirectory = process.cwd();
    const workspaceRoot = existsSync(join(currentDirectory, 'apps', 'api'))
      ? currentDirectory
      : resolve(currentDirectory, '..', '..');
    const dataDirectory = join(workspaceRoot, 'apps', 'api', 'data');
    mkdirSync(dataDirectory, { recursive: true });
    return join(dataDirectory, 'firmador.sqlite');
  })();
  const configuredSqliteLocation = process.env.SQLITE_LOCATION?.trim();

  return {
    type: 'sqljs',
    autoLoadEntities: true,
    location: configuredSqliteLocation
      ? isAbsolute(configuredSqliteLocation)
        ? configuredSqliteLocation
        : resolve(
            existsSync(join(process.cwd(), 'apps', 'api'))
              ? process.cwd()
              : resolve(process.cwd(), '..', '..'),
            configuredSqliteLocation,
          )
      : defaultSqliteLocation,
    autoSave: true,
    synchronize: true,
  };
};
