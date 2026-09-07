import { describe, expect, it } from 'vitest';
import { TenantContextError } from '../tenant-context';
import { isUniqueViolation } from './voice.interface';
import {
  SupabaseVoiceRepository,
  mapVoiceCall,
  mapVoiceCommand,
} from './supabase-voice.repository';

type QueryCall = {
  table: string;
  op: 'select' | 'insert' | 'update';
  payload?: unknown;
  filters: Array<{ field: string; value: unknown }>;
};

function createMockClient(options: {
  selectData?: unknown;
  insertData?: unknown;
  insertError?: { code: string; message: string };
  updateData?: unknown;
}) {
  const calls: QueryCall[] = [];

  const builder = (table: string, op: QueryCall['op'], payload?: unknown) => {
    const filters: Array<{ field: string; value: unknown }> = [];
    const record: QueryCall = { table, op, payload, filters };
    calls.push(record);
    const chain = {
      select: () => chain,
      insert: (next: unknown) => builder(table, 'insert', next),
      update: (next: unknown) => builder(table, 'update', next),
      eq: (field: string, value: unknown) => {
        filters.push({ field, value });
        return chain;
      },
      maybeSingle: async () => ({
        data:
          op === 'update'
            ? (options.updateData ?? null)
            : (options.selectData ?? null),
        error: null,
      }),
      single: async () => ({
        data: options.insertData ?? null,
        error: options.insertError ?? null,
      }),
    };
    return chain;
  };

  return {
    calls,
    client: {
      from: (table: string) => builder(table, 'select'),
    },
  };
}

describe('SupabaseVoiceRepository', () => {
  it('fails closed without a tenant context', () => {
    expect(() => new SupabaseVoiceRepository({ accountId: '' })).toThrow(
      TenantContextError
    );
  });

  it('maps command fingerprint and provider result refs from params_json', () => {
    const mapped = mapVoiceCommand({
      id: 'cmd-1',
      account_id: 'tenant-a',
      status: 'succeeded',
      params_json: {
        fingerprint: 'fp-1',
        externalCallId: 'ext-1',
        resultReference: 'ext-1',
      },
    });
    expect(mapped.commandFingerprint).toBe('fp-1');
    expect(mapped.externalCallId).toBe('ext-1');
    expect(mapped.resultReference).toBe('ext-1');
  });

  it('maps call camelCase aliases used by the transcript route', () => {
    const mapped = mapVoiceCall({
      id: 'call-1',
      account_id: 'tenant-a',
      external_call_id: 'ext-1',
      transcript_reference: 'file-1',
      transcript_status: 'available',
    });
    expect(mapped.externalCallId).toBe('ext-1');
    expect(mapped.transcriptReference).toBe('file-1');
    expect(mapped.accountId).toBe('tenant-a');
  });

  it('scopes command updates by account_id and persists the provider result ref', async () => {
    const existing = {
      id: 'cmd-1',
      account_id: 'tenant-a',
      status: 'queued',
      params_json: { fingerprint: 'fp-1' },
    };
    const { client, calls } = createMockClient({
      selectData: existing,
      updateData: {
        ...existing,
        status: 'succeeded',
        params_json: {
          fingerprint: 'fp-1',
          externalCallId: 'ext-9',
          resultReference: 'ext-9',
        },
      },
    });
    const repo = new SupabaseVoiceRepository(
      { accountId: 'tenant-a' },
      client as never
    );
    const updated = await repo.updateCommand('cmd-1', {
      status: 'succeeded',
      externalCallId: 'ext-9',
      resultReference: 'ext-9',
    });
    const update = calls.find((entry) => entry.op === 'update');
    expect(update?.filters).toEqual(
      expect.arrayContaining([
        { field: 'id', value: 'cmd-1' },
        { field: 'account_id', value: 'tenant-a' },
      ])
    );
    expect(update?.payload).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        params_json: {
          fingerprint: 'fp-1',
          externalCallId: 'ext-9',
          resultReference: 'ext-9',
        },
      })
    );
    expect(updated?.resultReference).toBe('ext-9');
  });

  it('treats Postgres 23505 as a unique violation', async () => {
    const { client } = createMockClient({
      insertError: { code: '23505', message: 'duplicate key' },
    });
    const repo = new SupabaseVoiceRepository(
      { accountId: 'tenant-a' },
      client as never
    );
    await expect(
      repo.createCommand({
        commandType: 'initiate_outbound_call',
        idempotencyKey: 'idem-1',
        commandFingerprint: 'fp-1',
      })
    ).rejects.toMatchObject({ code: '23505' });
    expect(isUniqueViolation({ code: '23505' })).toBe(true);
    expect(isUniqueViolation({ code: 409 })).toBe(false);
  });

  it('scopes provider event lookups to the current tenant', async () => {
    const { client, calls } = createMockClient({ selectData: null });
    const repo = new SupabaseVoiceRepository(
      { accountId: 'tenant-a' },
      client as never
    );
    await repo.findProviderEvent('sarvam', 'evt-1');
    expect(calls[0]?.filters).toEqual(
      expect.arrayContaining([
        { field: 'account_id', value: 'tenant-a' },
        { field: 'provider', value: 'sarvam' },
        { field: 'external_event_id', value: 'evt-1' },
      ])
    );
  });
});
