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

import { GET } from '@/app/api/broadcasts/reports/route';

describe('GET /api/broadcasts/reports with Conversion and Revenue Attribution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireRole.mockResolvedValue({
      accountId: 'acc-marketing-1',
      userId: 'user-agent-1',
      role: 'viewer',
    });
  });

  it('aggregates sent, delivered, read, CTR, conversions, and attributed revenue', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'broadcasts') {
        const query: Record<string, unknown> = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          gte: vi.fn().mockReturnThis(),
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'bc-1',
                account_id: 'acc-marketing-1',
                name: 'Summer Health Checkup',
                status: 'sent',
                total_recipients: 100,
                sent_count: 100,
                delivered_count: 90,
                read_count: 70,
                replied_count: 20,
                failed_count: 10,
                clicks_count: 15,
                conversions_count: 5,
                attributed_revenue: 12500,
                created_at: new Date().toISOString(),
              },
            ],
            error: null,
          }),
        };
        return query;
      }
      if (table === 'appointments') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockResolvedValue({
            data: [
              { id: 'appt-1', campaign_id: 'bc-1' },
              { id: 'appt-2', campaign_id: 'bc-1' },
            ],
            error: null,
          }),
        };
      }
      if (table === 'billing_invoices') {
        return {
          select: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [
              { appointment_id: 'appt-1', amount: 1500, status: 'paid' },
              { appointment_id: 'appt-2', amount: 2000, status: 'paid' },
            ],
            error: null,
          }),
        };
      }
      return {};
    });

    const req = new NextRequest(
      'http://localhost/api/broadcasts/reports?range=last_30_days'
    );
    const res = await GET(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    expect(json.data).toBeDefined();
    expect(json.data.summary.totalCampaigns).toBe(1);
    expect(json.data.summary.sent).toBe(100);
    expect(json.data.summary.delivered).toBe(90);
    expect(json.data.summary.read).toBe(70);
    expect(json.data.summary.readRate).toBe(70); // 70 / 100 * 100
    expect(json.data.summary.clicks).toBe(15);
    expect(json.data.summary.ctr).toBe(16.7); // 15 / 90 * 100 = 16.666 -> 16.7
    expect(json.data.summary.conversions).toBe(5);
    expect(json.data.summary.attributedRevenue).toBe(12500);
  });
});
