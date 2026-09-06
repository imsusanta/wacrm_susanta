import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export function validateFixture(fixture, env = process.env) {
  assert.equal(
    env.HELPA_SYNTHETIC_TESTS_APPROVED,
    '1',
    'Synthetic test approval is required'
  );
  assert.equal(
    fixture.syntheticOnly,
    true,
    'Only pre-provisioned synthetic fixtures are permitted'
  );
  for (const key of ['appOrigin', 'supabaseOrigin']) {
    const url = new URL(fixture[key]);
    assert.equal(
      url.origin,
      fixture[key],
      `${key} must be an origin, not a path`
    );
    assert.equal(
      url.username + url.password,
      '',
      'Credentials must not be embedded in URLs'
    );
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (!local) {
      assert.equal(url.protocol, 'https:', 'Remote staging requires HTTPS');
      const approved =
        key === 'appOrigin'
          ? env.HELPA_APPROVED_STAGING_APP_ORIGIN
          : env.HELPA_APPROVED_STAGING_SUPABASE_ORIGIN;
      assert.equal(
        url.origin,
        approved,
        `Explicit ${key} staging approval is required`
      );
    }
  }
  assert.equal(
    fixture.tenants?.length,
    2,
    'Exactly two tenant fixtures are required'
  );
  const uuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  for (const tenant of fixture.tenants) {
    for (const key of [
      'userId',
      'accountId',
      'contactId',
      'patientId',
      'appointmentId',
      'billId',
    ]) {
      assert.match(tenant[key] || '', uuid, `A valid ${key} is required`);
    }
    for (const key of ['email', 'password', 'searchTerm']) {
      assert.ok(
        typeof tenant[key] === 'string' && tenant[key].length > 0,
        `${key} is required`
      );
    }
  }
  const [a, b] = fixture.tenants;
  for (const key of [
    'userId',
    'accountId',
    'contactId',
    'patientId',
    'appointmentId',
    'billId',
    'searchTerm',
  ]) {
    assert.notEqual(a[key], b[key], `Tenant ${key} values must be distinct`);
  }
  assert.ok(
    fixture.publishableKey,
    'The Supabase publishable/anon key is required'
  );
  assert.ok(
    fixture.platformAdmin?.email &&
      fixture.platformAdmin?.password &&
      uuid.test(fixture.platformAdmin.userId || ''),
    'A synthetic platform-admin positive control is required'
  );
  assert.ok(
    ![a.userId, b.userId].includes(fixture.platformAdmin.userId),
    'Platform admin must be a distinct user'
  );
}

export async function runAuthenticatedTests(fixture, env = process.env) {
  validateFixture(fixture, env);
  const { createServerClient } = await import('@supabase/ssr');
  const results = [];
  const clients = [];
  const check = async (label, operation) => {
    try {
      await operation();
      results.push({ label, result: 'passed' });
    } catch {
      // Do not log response bodies, credentials, emails, or patient fields.
      results.push({ label, result: 'failed' });
    }
  };
  async function login(identity) {
    const cookies = new Map();
    const auth = createServerClient(
      fixture.supabaseOrigin,
      fixture.publishableKey,
      {
        cookies: {
          getAll: () => [...cookies].map(([name, value]) => ({ name, value })),
          setAll: (items) =>
            items.forEach(({ name, value }) => cookies.set(name, value)),
        },
      }
    );
    const { data, error } = await auth.auth.signInWithPassword({
      email: identity.email,
      password: identity.password,
    });
    assert.equal(error, null, 'Real authentication failed');
    assert.equal(
      data.user?.id,
      identity.userId,
      'Authenticated identity differs from fixture'
    );
    const request = async (route) => {
      assert.ok(
        route.startsWith('/api/'),
        'Only application API paths are allowed'
      );
      const response = await fetch(`${fixture.appOrigin}${route}`, {
        redirect: 'manual',
        signal: AbortSignal.timeout(30000),
        headers: {
          Cookie: [...cookies]
            .map(([name, value]) => `${name}=${value}`)
            .join('; '),
        },
      });
      return response;
    };
    clients.push(auth);
    const probe = await request('/api/auth/me');
    assert.equal(
      probe.status,
      200,
      'Application did not accept the real session'
    );
    const body = await probe.json();
    assert.equal(body.authenticated, true);
    assert.equal(body.user?.id, identity.userId);
    return request;
  }
  try {
    for (let index = 0; index < 2; index++) {
      const own = fixture.tenants[index];
      const other = fixture.tenants[1 - index];
      const label = `tenant-${index + 1}`;
      const request = await login(own);
      // Identity/tenant controls are prerequisites, not optional tests: abort
      // rather than accepting negative tests against a broken login/session.
      const profile = await request('/api/account/profile');
      assert.equal(profile.status, 200);
      const identity = await profile.json();
      assert.equal(identity.profile?.account_id, own.accountId);
      assert.ok(['owner', 'admin'].includes(identity.profile?.account_role));
      assert.equal(identity.profile?.is_super_admin, false);
      results.push({
        label: `${label}: real session and tenant identity`,
        result: 'passed',
      });

      await check(`${label}: own patient search positive control`, async () => {
        const response = await request(
          `/api/patients/search?query=${encodeURIComponent(own.searchTerm)}`
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(body.patients?.some((p) => p.id === own.contactId));
        assert.ok(!body.patients.some((p) => p.id === other.contactId));
      });
      await check(`${label}: other patient search does not leak`, async () => {
        const response = await request(
          `/api/patients/search?query=${encodeURIComponent(other.searchTerm)}`
        );
        assert.equal(response.status, 200);
        const body = await response.json();
        assert.ok(Array.isArray(body.patients));
        assert.ok(!body.patients.some((p) => p.id === other.contactId));
      });
      await check(`${label}: own patient export positive control`, async () => {
        const response = await request(`/api/patients/${own.patientId}/export`);
        assert.equal(response.status, 200);
        assert.match(response.headers.get('cache-control') || '', /no-store/i);
        const body = await response.json();
        assert.equal(body.patient?.id, own.patientId);
        assert.equal(body.patient?.account_id, own.accountId);
        assert.ok(
          !body.appointments?.some((p) => p.id === other.appointmentId)
        );
      });
      await check(`${label}: cross-tenant export denied`, async () => {
        const response = await request(
          `/api/patients/${other.patientId}/export`
        );
        assert.equal(response.status, 404);
      });
      await check(`${label}: own PDF positive control`, async () => {
        const response = await request(
          `/api/appointments/${own.appointmentId}/pdf`
        );
        assert.equal(response.status, 200);
        assert.match(
          response.headers.get('content-type') || '',
          /application\/pdf/
        );
        assert.equal(
          Buffer.from(await response.arrayBuffer())
            .subarray(0, 5)
            .toString(),
          '%PDF-'
        );
      });
      await check(`${label}: cross-tenant PDF denied`, async () => {
        const response = await request(
          `/api/appointments/${other.appointmentId}/pdf`
        );
        // This specific handler uses 401 for a wrong-tenant staff session.
        // The authenticated identity and own-PDF controls above are mandatory.
        assert.ok([401, 403, 404].includes(response.status));
      });
      await check(
        `${label}: bills include own fixture but not other tenant`,
        async () => {
          const response = await request('/api/billing');
          assert.equal(response.status, 200);
          const body = await response.json();
          assert.ok(body.data?.some((bill) => bill.id === own.billId));
          assert.ok(
            body.data.every((bill) => bill.account_id === own.accountId)
          );
          assert.ok(!body.data.some((bill) => bill.id === other.billId));
        }
      );
      await check(
        `${label}: ordinary tenant owner cannot access platform admin`,
        async () => {
          const response = await request('/api/admin/tenants');
          assert.equal(response.status, 403);
        }
      );
    }
    const adminRequest = await login(fixture.platformAdmin);
    await check('platform-admin positive control', async () => {
      const response = await adminRequest('/api/admin/tenants');
      assert.equal(response.status, 200);
      const body = await response.json();
      assert.ok(Array.isArray(body));
      for (const tenant of fixture.tenants) {
        assert.ok(body.some((account) => account.id === tenant.accountId));
      }
    });
  } catch {
    results.push({ label: 'authenticated prerequisites', result: 'failed' });
  } finally {
    for (const client of clients) {
      await client.auth.signOut({ scope: 'local' }).catch(() => {});
    }
  }
  return {
    kind: 'real-authenticated-http-verification',
    status: results.some((r) => r.result === 'failed') ? 'failed' : 'passed',
    scope:
      'Synthetic read paths: patients, exports, appointment PDFs, bills, platform-admin authorization. Exports write audit events. Not a full CRUD or revocation suite.',
    results,
  };
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  try {
    const fixturePath = process.env.HELPA_TWO_TENANT_FIXTURE_FILE;
    assert.ok(fixturePath, 'Fixture file required');
    const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const report = await runAuthenticatedTests(fixture);
    console.log(JSON.stringify(report, null, 2));
    if (report.status !== 'passed') process.exitCode = 1;
  } catch {
    console.error(
      'Verification blocked: check approved staging origins, synthetic fixture file, and real login prerequisites. No credentials or response bodies were logged.'
    );
    process.exitCode = 1;
  }
}
