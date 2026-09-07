import {
  afterEach,
  beforeEach,
  describe,
  expect,
  expectTypeOf,
  it,
  vi,
} from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { getAdminClient } from './server';
import type { AdminClient } from '@/lib/db/server';

describe('Supabase admin client boundary', () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => vi.unstubAllEnvs());

  it('preserves the SDK type rather than leaking any through the facade', () => {
    expectTypeOf<ReturnType<typeof getAdminClient>>().not.toBeAny();
    expectTypeOf<AdminClient>().not.toBeAny();
    expectTypeOf<AdminClient>().toMatchTypeOf<SupabaseClient>();
  });

  it('reuses the service client in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    const { getAdminClient: getClient } = await import('./server');
    const first = getClient();
    expect(first).toBe(getClient());
  });

  it('keeps development/test clients uncached', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    const { getAdminClient: getClient } = await import('./server');
    expect(getClient()).not.toBe(getClient());
  });
});
