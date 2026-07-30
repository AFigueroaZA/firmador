import { readFileSync } from 'node:fs';
import { join } from 'node:path';

describe('seed ownership', () => {
  const source = (path: string) =>
    readFileSync(join(process.cwd(), 'src', path), 'utf8');

  it('keeps bucket and user setup in pnpm seed instead of startup hooks', () => {
    const seed = source('scripts/seed.ts');
    const authModule = source('auth/auth.module.ts');
    const supabaseSetup = source('supabase/supabase-setup.service.ts');

    expect(seed).toContain('ensureStorageBucket()');
    expect(seed).toContain('seedDefaultUsers()');
    expect(authModule).not.toContain('AuthBootstrapService');
    expect(supabaseSetup).not.toContain('OnApplicationBootstrap');
  });
});
