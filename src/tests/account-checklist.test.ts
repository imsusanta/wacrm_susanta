import { beforeEach, describe, expect, it, vi } from 'vitest';

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

import { GET } from '@/app/api/account/checklist-status/route';

describe('GET /api/account/checklist-status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns false for unconfigured setup steps', async () => {
    requireRole.mockResolvedValue({
      accountId: 'acc-123',
      userId: 'user-123',
      role: 'owner',
      account: { id: 'acc-123', name: '', industry: 'general' },
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { name: '', industry: 'general', ai_system_prompt: null },
            error: null,
          }),
        };
      }
      if (table === 'knowledge_base') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 0, error: null }),
        };
      }
      if (table === 'whatsapp_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      if (table === 'whatsapp_config') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.profile_done).toBe(false);
    expect(json.services_done).toBe(false);
    expect(json.services_count).toBe(0);
    expect(json.ai_done).toBe(false);
    expect(json.whatsapp_done).toBe(false);
    expect(json.completed_count).toBe(0);
    expect(json.percent).toBe(0);
  });

  it('returns true when profile, knowledge base, AI receptionist, and WhatsApp are configured', async () => {
    requireRole.mockResolvedValue({
      accountId: 'acc-456',
      userId: 'user-456',
      role: 'owner',
      account: { id: 'acc-456', name: 'Dr. Sen Clinic', industry: 'health' },
    });

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'accounts') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: {
              name: 'Dr. Sen Clinic',
              industry: 'health',
              ai_system_prompt: 'You are an AI assistant for Dr. Sen Clinic.',
            },
            error: null,
          }),
        };
      }
      if (table === 'knowledge_base') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ count: 5, error: null }),
        };
      }
      if (table === 'whatsapp_configs') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({
            data: { id: 'w1', phone_number_id: '10982347234', is_active: true },
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    const response = await GET();
    expect(response.status).toBe(200);
    const json = await response.json();

    expect(json.profile_done).toBe(true);
    expect(json.services_done).toBe(true);
    expect(json.services_count).toBe(5);
    expect(json.ai_done).toBe(true);
    expect(json.whatsapp_done).toBe(true);
    expect(json.completed_count).toBe(4);
    expect(json.percent).toBe(100);
    expect(json.items[1].count).toBe(5);
  });
});
