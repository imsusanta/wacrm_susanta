import assert from 'node:assert/strict';
import test from 'node:test';
import { validateFixture } from '../security/authenticated-two-tenant.mjs';

const fixture = () => ({
  syntheticOnly: true,
  appOrigin: 'http://127.0.0.1:3000',
  supabaseOrigin: 'http://127.0.0.1:54321',
  publishableKey: 'synthetic-test-key',
  tenants: [1, 2].map((n) => ({
    userId: `${n}1111111-1111-4111-8111-111111111111`,
    accountId: `${n}2222222-2222-4222-8222-222222222222`,
    contactId: `${n}3333333-3333-4333-8333-333333333333`,
    patientId: `${n}3333333-3333-4333-8333-333333333333`,
    appointmentId: `${n}4444444-4444-4444-8444-444444444444`,
    billId: `${n}5555555-5555-4555-8555-555555555555`,
    email: `synthetic-${n}@example.invalid`,
    password: 'test-only-password',
    searchTerm: `SyntheticTenant${n}`,
  })),
  platformAdmin: {
    userId: '99999999-9999-4999-8999-999999999999',
    email: 'synthetic-admin@example.invalid',
    password: 'test-only-password',
  },
});
const env = { HELPA_SYNTHETIC_TESTS_APPROVED: '1' };
test('valid local synthetic fixtures are accepted', () =>
  validateFixture(fixture(), env));
test('explicit synthetic approval is required', () => {
  assert.throws(() => validateFixture(fixture(), {}));
});
test('real-data fixtures are refused', () => {
  assert.throws(() =>
    validateFixture({ ...fixture(), syntheticOnly: false }, env)
  );
});
test('remote app origin requires exact staging approval', () => {
  assert.throws(() =>
    validateFixture(
      { ...fixture(), appOrigin: 'https://production.invalid' },
      env
    )
  );
});
test('remote Supabase origin requires exact staging approval', () => {
  assert.throws(() =>
    validateFixture(
      { ...fixture(), supabaseOrigin: 'https://project.supabase.co' },
      env
    )
  );
});
test('same-account fixtures are refused', () => {
  const f = fixture();
  f.tenants[1].accountId = f.tenants[0].accountId;
  assert.throws(() => validateFixture(f, env));
});
test('platform admin cannot reuse a tenant identity', () => {
  const f = fixture();
  f.platformAdmin.userId = f.tenants[0].userId;
  assert.throws(() => validateFixture(f, env));
});
test('an explicit HTTPS staging pair is accepted', () => {
  const f = {
    ...fixture(),
    appOrigin: 'https://staging.example.invalid',
    supabaseOrigin: 'https://synthetic.supabase.co',
  };
  validateFixture(f, {
    ...env,
    HELPA_APPROVED_STAGING_APP_ORIGIN: f.appOrigin,
    HELPA_APPROVED_STAGING_SUPABASE_ORIGIN: f.supabaseOrigin,
  });
});
