import { createTypeOrmOptions } from './typeorm.config';

describe('createTypeOrmOptions', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/postgres',
      DATABASE_SCHEMA: 'public',
      DATABASE_SYNCHRONIZE: 'false',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('uses the configured Supabase Postgres schema without SQLite fallback', () => {
    expect(createTypeOrmOptions()).toMatchObject({
      type: 'postgres',
      schema: 'public',
      synchronize: false,
    });
  });
});
