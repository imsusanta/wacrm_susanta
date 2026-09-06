import { beforeEach, describe, expect, it, vi } from 'vitest';
import { OutboxService } from '@/lib/whatsapp/outbox-service';

const mockRpc = vi.fn();
const mockUpdate = vi.fn();
const mockUpdateResult = vi.fn();
const mockEq2 = vi.fn();

vi.mock('@/lib/db/server', () => ({
  getAdminClient: () => ({
    rpc: (name: string, payload: unknown) => mockRpc(name, payload),
    from: (_table: string) => ({
      update: (payload: unknown) => {
        mockUpdate(payload);
        return {
          eq: (field1: string, value1: string) => ({
            eq: (field2: string, value2: string) => {
              mockEq2(field1, value1, field2, value2);
              return {
                select: () => ({
                  maybeSingle: async () => mockUpdateResult(),
                }),
              };
            },
          }),
        };
      },
    }),
  }),
}));

const BASE_PAYLOAD = {
  accountId: 'acc_1',
  conversationId: 'conv_1',
  idempotencyKey: 'key_1',
  requestHash: 'hash_123',
  channel: 'whatsapp',
};

describe('OutboxService tenant isolation and reliability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateResult.mockResolvedValue({
      data: { id: 'outbox_1' },
      error: null,
    });
  });

  it('atomically creates the local message and tenant-scoped outbox row', async () => {
    mockRpc.mockResolvedValue({
      data: {
        ok: true,
        duplicate: false,
        status: 'pending',
        outbox_id: 'outbox_new_1',
        message_id: 'message_new_1',
      },
      error: null,
    });

    const result = await OutboxService.createPreSendOutbox(BASE_PAYLOAD);

    expect(result).toMatchObject({
      ok: true,
      status: 'created',
      outboxId: 'outbox_new_1',
      messageId: 'message_new_1',
    });
    expect(mockRpc).toHaveBeenCalledWith(
      'enqueue_whatsapp_outbound_message',
      expect.objectContaining({
        p_account_id: 'acc_1',
        p_conversation_id: 'conv_1',
        p_idempotency_key: 'key_1',
      })
    );
  });

  it('returns a matching persisted duplicate without re-enqueueing', async () => {
    mockRpc.mockResolvedValue({
      data: {
        ok: true,
        duplicate: true,
        status: 'sent',
        outbox_id: 'outbox_existing_2',
        message_id: 'message_existing_2',
        provider_message_id: 'wamid.123',
      },
      error: null,
    });

    const result = await OutboxService.createPreSendOutbox(BASE_PAYLOAD);

    expect(result).toMatchObject({
      ok: true,
      status: 'existing',
      existingStatus: 'sent',
      providerMessageId: 'wamid.123',
    });
  });

  it('rejects an idempotency key reused for a different request hash', async () => {
    mockRpc.mockResolvedValue({
      data: {
        ok: false,
        error: 'IDEMPOTENCY_CONFLICT',
      },
      error: null,
    });

    const result = await OutboxService.createPreSendOutbox(BASE_PAYLOAD);

    expect(result).toMatchObject({
      ok: false,
      code: 'IDEMPOTENCY_CONFLICT',
      retryable: false,
    });
  });

  it('fails closed when the transactional RPC is unavailable', async () => {
    mockRpc.mockResolvedValue({
      data: null,
      error: { message: 'Database connection failed' },
    });

    const result = await OutboxService.createPreSendOutbox(BASE_PAYLOAD);

    expect(result).toMatchObject({
      ok: false,
      code: 'OUTBOX_PERSISTENCE_FAILED',
      retryable: true,
    });
  });

  it('atomically completes the local message and outbox delivery', async () => {
    mockRpc.mockResolvedValue({
      data: { ok: true, message_id: 'message_1' },
      error: null,
    });

    await OutboxService.markSent('outbox_123', 'acc_tenant_a', 'wamid_123');

    expect(mockRpc).toHaveBeenCalledWith(
      'complete_whatsapp_outbound_message',
      {
        p_outbox_id: 'outbox_123',
        p_account_id: 'acc_tenant_a',
        p_provider_message_id: 'wamid_123',
      }
    );
  });

  it('tenant-scopes reconciliation-required transitions', async () => {
    await OutboxService.markReconciliationRequired(
      'outbox_1',
      'acc_tenant_a',
      'wamid.abc',
      'Table locked'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'reconciliation_required',
        provider_message_id: 'wamid.abc',
      })
    );
    expect(mockEq2).toHaveBeenCalledWith(
      'id',
      'outbox_1',
      'account_id',
      'acc_tenant_a'
    );
  });

  it('tenant-scopes dead-letter transitions', async () => {
    await OutboxService.markDeadLetter(
      'outbox_fail_1',
      'acc_tenant_a',
      'Permanent provider error'
    );

    expect(mockUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'dead_letter' })
    );
    expect(mockEq2).toHaveBeenCalledWith(
      'id',
      'outbox_fail_1',
      'account_id',
      'acc_tenant_a'
    );
  });

  it('throws when a tenant-scoped transition updates no row', async () => {
    mockUpdateResult.mockResolvedValue({ data: null, error: null });

    await expect(
      OutboxService.markDeadLetter('missing', 'acc_tenant_a', 'failed')
    ).rejects.toThrow('Failed to mark WhatsApp outbox dead letter');
  });
});
