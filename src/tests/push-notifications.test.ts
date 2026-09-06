import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { requireRole, toErrorResponse, mockSupabaseFrom } = vi.hoisted(() => ({
  requireRole: vi.fn(),
  toErrorResponse: vi.fn((err: unknown) => {
    const error = err as { status?: number; message?: string };
    return new Response(JSON.stringify({ error: error?.message || 'Error' }), {
      status: error?.status || 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }),
  mockSupabaseFrom: vi.fn(),
}));

vi.mock('@/lib/auth/account', () => ({
  requireRole,
  toErrorResponse,
  UnauthorizedError: class UnauthorizedError extends Error {
    readonly status = 401;
  },
  ForbiddenError: class ForbiddenError extends Error {
    readonly status = 403;
  },
}));

vi.mock('@/lib/supabase/server', () => ({
  getAdminClient: () => ({
    from: mockSupabaseFrom,
  }),
}));

import { POST, DELETE } from '@/app/api/notifications/push/subscribe/route';
import { dispatchPushToAccount } from '@/lib/notifications/web-push';

describe('Web Push Notifications Subscription & Dispatcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      accountId: 'acc-tenant-1',
      userId: 'user-frontline-1',
      role: 'agent',
      account: {
        id: 'acc-tenant-1',
        name: 'Dental Clinic',
        industry: 'health',
      },
    });
  });

  it('POST saves push subscription successfully', async () => {
    const upsertMock = vi.fn().mockResolvedValue({ error: null });
    mockSupabaseFrom.mockReturnValue({
      upsert: upsertMock,
    });

    const req = new NextRequest(
      'http://localhost/api/notifications/push/subscribe',
      {
        method: 'POST',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
          keys: {
            p256dh: 'BNcRdreALRF8FsII...',
            auth: 'tBHItDaA...',
          },
        }),
        headers: {
          'content-type': 'application/json',
          'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
        },
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
    expect(upsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        account_id: 'acc-tenant-1',
        user_id: 'user-frontline-1',
        endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
      }),
      { onConflict: 'endpoint' }
    );
  });

  it('POST rejects invalid subscription payload', async () => {
    const req = new NextRequest(
      'http://localhost/api/notifications/push/subscribe',
      {
        method: 'POST',
        body: JSON.stringify({
          endpoint: '',
        }),
      }
    );

    const res = await POST(req);
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error).toBe('INVALID_SUBSCRIPTION_PAYLOAD');
  });

  it('DELETE unsubscribes device endpoint', async () => {
    const eqMock2 = vi.fn().mockResolvedValue({ error: null });
    const eqMock1 = vi.fn().mockReturnValue({ eq: eqMock2 });
    const deleteMock = vi.fn().mockReturnValue({ eq: eqMock1 });

    mockSupabaseFrom.mockReturnValue({
      delete: deleteMock,
    });

    const req = new NextRequest(
      'http://localhost/api/notifications/push/subscribe',
      {
        method: 'DELETE',
        body: JSON.stringify({
          endpoint: 'https://fcm.googleapis.com/fcm/send/sample-token',
        }),
      }
    );

    const res = await DELETE(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.success).toBe(true);
  });

  it('dispatchPushToAccount sends push notifications to registered subscriptions', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'push_subscriptions') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'sub-1',
                account_id: 'acc-tenant-1',
                endpoint: 'https://fcm.googleapis.com/fcm/send/device-1',
                p256dh: 'key1',
                auth: 'auth1',
              },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const result = await dispatchPushToAccount('acc-tenant-1', {
      title: '🚨 Human Handoff Requested',
      body: 'Customer needs help with billing',
      url: '/inbox?conversation=c-1',
    });

    expect(result.dispatched).toBe(1);
    expect(result.failed).toBe(0);
  });
});
