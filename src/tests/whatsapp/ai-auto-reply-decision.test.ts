import { describe, it, expect, vi, beforeEach } from 'vitest';

// Shared state for mocks
const mockState = vi.hoisted(() => ({
  automations: [] as Record<string, unknown>[],
  automationSteps: [] as Record<string, unknown>[],
  sentTexts: [] as Record<string, unknown>[],
  sentTemplates: [] as Record<string, unknown>[],
  flowConsumed: false,
  planLimitAllowed: true,
  aiResolvedKey: 'test-api-key',
  conversationData: {
    id: 'conv-123',
    account_id: 'acc-1',
    contact_id: 'cnt-1',
    ai_chat_enabled: true,
    ai_autoreply_disabled: false,
    is_ai_enabled: true,
    assigned_agent_id: null as string | null,
    ai_reply_count: 0,
  } as Record<string, unknown>,
  messagesData: [
    {
      sender_type: 'customer',
      content_type: 'text',
      content_text: 'How much is consultation?',
      created_at: new Date().toISOString(),
    },
  ] as Record<string, unknown>[],
}));

// Mock getAdminClient / DB with chainable query builder
vi.mock('@/lib/db/server', () => {
  const { automations, automationSteps, conversationData, messagesData } =
    mockState;

  function resolve(ops: {
    table: string;
    type: string;
    payload?: unknown;
    filters: [string, string, unknown][];
  }) {
    const { table } = ops;

    if (table === 'conversations') {
      if (ops.type === 'single' || ops.type === 'maybeSingle') {
        return { data: conversationData, error: null };
      }
      return { data: [conversationData], error: null };
    }
    if (table === 'contacts') {
      const contactObj = {
        id: 'cnt-1',
        name: 'John Doe',
        phone: '+919876543210',
        account_id: 'acc-1',
      };
      if (ops.type === 'single' || ops.type === 'maybeSingle') {
        return { data: contactObj, error: null };
      }
      return { data: [contactObj], error: null };
    }
    if (table === 'accounts') {
      return {
        data: {
          id: 'acc-1',
          name: 'Helpa Health Clinic',
          industry: 'hospital_clinic',
          ai_provider: 'openrouter',
        },
        error: null,
      };
    }
    if (table === 'automations') {
      return { data: automations, error: null };
    }
    if (table === 'automation_steps') {
      return { data: automationSteps, error: null };
    }
    if (table === 'automation_logs') {
      return { data: { id: 'log-1', steps_executed: [] }, error: null };
    }
    if (table === 'messages') {
      return { data: messagesData, error: null };
    }
    if (table === 'knowledge_base') {
      return {
        data: [
          {
            category: 'pricing',
            question_title: 'Consultation Fee',
            answer_content: 'Our general doctor consultation fee is ₹500.',
          },
        ],
        error: null,
      };
    }
    if (table === 'hospital_doctors') {
      return {
        data: [
          {
            name: 'Dr. Sharma',
            department: 'General Medicine',
            specialization: 'Physician',
            consultation_fee: '₹500',
            available_days: 'Mon-Sat',
            working_hours: '9 AM - 5 PM',
          },
        ],
        error: null,
      };
    }
    if (table === 'appointments') {
      return { data: [], error: null };
    }
    if (table === 'hospital_lab_reports') {
      return { data: [], error: null };
    }
    if (table === 'patients') {
      return { data: [], error: null };
    }
    if (table === 'broadcast_recipients') {
      return { data: [], error: null };
    }
    return { data: [], error: null };
  }

  function builder(table: string) {
    const ops = {
      table,
      type: 'select',
      payload: undefined as unknown,
      filters: [] as [string, string, unknown][],
    };
    const b: Record<string, unknown> = {
      select: () => b,
      insert: (p: unknown) => {
        ops.type = 'insert';
        ops.payload = p;
        return b;
      },
      update: (p: unknown) => {
        ops.type = 'update';
        ops.payload = p;
        return b;
      },
      delete: () => {
        ops.type = 'delete';
        return b;
      },
      upsert: (p: unknown) => {
        ops.type = 'upsert';
        ops.payload = p;
        return b;
      },
      eq: (k: string, v: unknown) => {
        ops.filters.push(['eq', k, v]);
        return b;
      },
      in: (k: string, v: unknown) => {
        ops.filters.push(['in', k, v]);
        return b;
      },
      gte: () => b,
      is: () => b,
      order: () => b,
      limit: () => b,
      single: () => {
        ops.type = 'single';
        return Promise.resolve(resolve(ops));
      },
      maybeSingle: () => {
        ops.type = 'maybeSingle';
        return Promise.resolve(resolve(ops));
      },
      then: (onF: (v: unknown) => unknown, onR?: (e: unknown) => unknown) =>
        Promise.resolve(resolve(ops)).then(onF, onR),
    };
    return b;
  }

  return {
    getAdminClient: () => ({
      from: (t: string) => builder(t),
      rpc: () => Promise.resolve({ error: null }),
    }),
  };
});

// Mock automations meta-send
vi.mock('@/lib/automations/meta-send', () => ({
  engineSendText: vi.fn(async (args: Record<string, unknown>) => {
    mockState.sentTexts.push(args);
    return { whatsapp_message_id: 'wamid.test-sent' };
  }),
  engineSendTemplate: vi.fn(async (args: Record<string, unknown>) => {
    mockState.sentTemplates.push(args);
    return { whatsapp_message_id: 'wamid.template-sent' };
  }),
  engineSendDocument: vi.fn(async () => ({ whatsapp_message_id: 'wamid.doc' })),
  engineSendButtons: vi.fn(async () => ({ whatsapp_message_id: 'wamid.btn' })),
}));

// Mock AI resolver
vi.mock('@/core/ai/resolver', () => ({
  resolveAccountAiConfig: vi.fn(async () => ({
    primary: {
      provider: 'openrouter',
      apiKey: mockState.aiResolvedKey,
      model: 'google/gemini-2.5-flash',
    },
    fallback: null,
  })),
  executeAiCompletionWithFallback: vi.fn(async () => ({
    content:
      'Our consultation fee is ₹500. Would you like to book an appointment with Dr. Sharma?',
    text: 'Our consultation fee is ₹500. Would you like to book an appointment with Dr. Sharma?',
    provider: 'openrouter',
    model: 'google/gemini-2.5-flash',
    tokensUsed: 120,
    estimatedCostUsd: 0.0004,
  })),
}));

// Mock SaaS limits
vi.mock('@/lib/saas/subscription', () => ({
  checkPlanLimits: vi.fn(async () => ({
    allowed: mockState.planLimitAllowed,
    reason: mockState.planLimitAllowed ? undefined : 'AI limit reached',
  })),
  incrementUsage: vi.fn(async () => {}),
}));

// Import after mocks
import { runAutomationsForTrigger } from '@/lib/automations/engine';
import { triggerAiResponse } from '@/lib/whatsapp/ai';
import { engineSendText } from '@/lib/automations/meta-send';

describe('AI Receptionist Auto-Reply Decision Engine & Automations Coexistence', () => {
  beforeEach(() => {
    mockState.automations.length = 0;
    mockState.automationSteps.length = 0;
    mockState.sentTexts.length = 0;
    mockState.sentTemplates.length = 0;
    mockState.flowConsumed = false;
    mockState.planLimitAllowed = true;
    mockState.aiResolvedKey = 'test-api-key';
    mockState.conversationData.id = 'conv-123';
    mockState.conversationData.account_id = 'acc-1';
    mockState.conversationData.contact_id = 'cnt-1';
    mockState.conversationData.ai_chat_enabled = true;
    mockState.conversationData.ai_autoreply_disabled = false;
    mockState.conversationData.is_ai_enabled = true;
    mockState.conversationData.assigned_agent_id = null;
    mockState.conversationData.ai_reply_count = 0;
    mockState.messagesData.length = 0;
    mockState.messagesData.push({
      sender_type: 'customer',
      content_type: 'text',
      content_text: 'How much is consultation?',
      created_at: new Date().toISOString(),
    });
    vi.clearAllMocks();
  });

  // Test 1: Background automation exists (e.g. tagging / reminder) -> does NOT send customer message -> AI replies
  it('Test 1: Active background automation exists (new_message_received) without customer reply -> AI still replies', async () => {
    mockState.automations.push({
      id: 'auto-1',
      account_id: 'acc-1',
      user_id: 'usr-1',
      trigger_type: 'new_message_received',
      is_active: true,
    });
    mockState.automationSteps.push({
      id: 'step-1',
      automation_id: 'auto-1',
      step_type: 'add_tag',
      step_config: { tag_id: 'tag-new-lead' },
      position: 0,
    });

    const autoResult = await runAutomationsForTrigger({
      accountId: 'acc-1',
      triggerType: 'new_message_received',
      contactId: 'cnt-1',
      context: { message_text: 'How much is consultation?' },
    });

    expect(autoResult.replied).toBe(false);

    // AI Receptionist triggers and sends reply
    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'acc-1',
        conversationId: 'conv-123',
        text: expect.stringContaining('consultation fee is ₹500'),
      })
    );
  });

  // Test 2: Active keyword automation exists but only performs CRM updates/tagging -> AI still replies
  it('Test 2: Active keyword automation exists but only performs CRM/tagging -> AI still replies', async () => {
    mockState.automations.push({
      id: 'auto-2',
      account_id: 'acc-1',
      user_id: 'usr-1',
      trigger_type: 'keyword_match',
      trigger_config: { keywords: ['consultation', 'fees'] },
      is_active: true,
    });
    mockState.automationSteps.push({
      id: 'step-crm-1',
      automation_id: 'auto-2',
      step_type: 'update_contact_field',
      step_config: { field: 'notes', value: 'Inquired about fees' },
      position: 0,
    });

    const autoResult = await runAutomationsForTrigger({
      accountId: 'acc-1',
      triggerType: 'keyword_match',
      contactId: 'cnt-1',
      context: { message_text: 'consultation fee please' },
    });

    expect(autoResult.replied).toBe(false);

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).toHaveBeenCalled();
  });

  // Test 3: Automation actually sends customer-facing reply -> AI should not duplicate
  it('Test 3: Automation sends customer-facing message -> reports replied=true', async () => {
    mockState.automations.push({
      id: 'auto-3',
      account_id: 'acc-1',
      user_id: 'usr-1',
      trigger_type: 'new_message_received',
      is_active: true,
    });
    mockState.automationSteps.push({
      id: 'step-send-1',
      automation_id: 'auto-3',
      step_type: 'send_message',
      step_config: { text: 'Hello! Thank you for contacting our clinic.' },
      position: 0,
    });

    const autoResult = await runAutomationsForTrigger({
      accountId: 'acc-1',
      triggerType: 'new_message_received',
      contactId: 'cnt-1',
      context: { message_text: 'Hello' },
    });

    expect(autoResult.replied).toBe(true);
  });

  // Test 4: Human agent assigned -> AI does not reply
  it('Test 4: Human agent assigned to conversation -> AI does not reply', async () => {
    mockState.conversationData.assigned_agent_id = 'agent-dr-john';

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).not.toHaveBeenCalled();
  });

  // Test 5: ai_autoreply_disabled = true or ai_chat_enabled = false -> AI does not reply
  it('Test 5: ai_chat_enabled=false or ai_autoreply_disabled=true -> AI does not reply', async () => {
    mockState.conversationData.ai_chat_enabled = false;

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).not.toHaveBeenCalled();
  });

  // Test 6: AI enabled + no automation -> AI replies
  it('Test 6: AI enabled + no automations -> AI generates and sends reply', async () => {
    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).toHaveBeenCalledTimes(1);
  });

  // Test 7: AI provider generates text -> engineSendText sends it through WhatsApp
  it('Test 7: AI provider text is routed to engineSendText for WhatsApp delivery', async () => {
    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(mockState.sentTexts).toHaveLength(1);
    expect(mockState.sentTexts[0].text).toContain('consultation fee is ₹500');
  });

  // Test 8: Plan limit check reached -> No outbound AI message
  it('Test 8: Plan limit reached -> No outbound AI message', async () => {
    mockState.planLimitAllowed = false;

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).not.toHaveBeenCalled();
  });

  it('still replies when a previous bot persist sorts newer than the customer turn', async () => {
    const customerId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockState.messagesData.length = 0;
    mockState.messagesData.push(
      {
        id: 'bot-prev',
        sender_type: 'bot',
        content_type: 'text',
        content_text: 'Previous AI reply persisted with server time',
        created_at: '2026-08-27T10:00:20.000Z',
      },
      {
        id: customerId,
        sender_type: 'customer',
        content_type: 'text',
        content_text: 'How much is consultation?',
        created_at: '2026-08-27T10:00:00.000Z',
      }
    );

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).toHaveBeenCalledWith(
      expect.objectContaining({
        replyToMessageId: customerId,
        text: expect.stringContaining('consultation fee is ₹500'),
      })
    );
    expect(engineSendText).not.toHaveBeenCalledWith(
      expect.objectContaining({ createdAt: expect.any(String) })
    );
  });

  it('does not send another AI reply when outbound already points at that customer', async () => {
    const customerId = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
    mockState.messagesData.length = 0;
    mockState.messagesData.push(
      {
        id: 'bot-answered',
        sender_type: 'bot',
        content_type: 'text',
        content_text: 'Already answered',
        created_at: '2026-08-27T10:00:01.000Z',
        reply_to_message_id: customerId,
      },
      {
        id: customerId,
        sender_type: 'customer',
        content_type: 'text',
        content_text: 'How much is consultation?',
        created_at: '2026-08-27T10:00:00.000Z',
      }
    );

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).not.toHaveBeenCalled();
  });

  // Test 9: Conversation reply limit reached -> AI does not reply
  it('Test 9: Conversation reached AI reply cap (>=100) -> AI skips response', async () => {
    mockState.conversationData.ai_reply_count = 100;

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    expect(engineSendText).not.toHaveBeenCalled();
  });

  // Test 10: Strict deterministic toggle — no auto-resume after >30 minutes
  it('Test 10: Keeps AI disabled even when chat was inactive for >30 minutes (no auto-resume)', async () => {
    mockState.conversationData.ai_chat_enabled = false;
    mockState.conversationData.ai_handoff_required = true;
    mockState.conversationData.ai_reply_count = 0;

    // Previous message was 40 minutes ago
    const fortyMinutesAgo = new Date(Date.now() - 40 * 60 * 1000).toISOString();
    mockState.messagesData.length = 0;
    mockState.messagesData.push(
      {
        id: 'msg-now',
        sender_type: 'customer',
        content_type: 'text',
        content_text: 'Are you available tomorrow?',
        created_at: new Date().toISOString(),
      },
      {
        id: 'msg-old',
        sender_type: 'agent',
        content_type: 'text',
        content_text: 'Let me check with doctor',
        created_at: fortyMinutesAgo,
      }
    );

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    // Must stay disabled; no automatic resume
    expect(mockState.conversationData.ai_chat_enabled).toBe(false);
    expect(engineSendText).not.toHaveBeenCalled();
  });

  it('Test 11: Keeps AI disabled when chat was disabled and activity was recent', async () => {
    mockState.conversationData.ai_chat_enabled = false;
    mockState.conversationData.ai_handoff_required = true;
    mockState.conversationData.ai_reply_count = 0;

    // Previous message was 10 minutes ago
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    mockState.messagesData.length = 0;
    mockState.messagesData.push(
      {
        id: 'msg-now',
        sender_type: 'customer',
        content_type: 'text',
        content_text: 'Are you available tomorrow?',
        created_at: new Date().toISOString(),
      },
      {
        id: 'msg-recent',
        sender_type: 'agent',
        content_type: 'text',
        content_text: 'Looking into it',
        created_at: tenMinutesAgo,
      }
    );

    await triggerAiResponse({
      accountId: 'acc-1',
      userId: 'usr-1',
      conversationId: 'conv-123',
      contactId: 'cnt-1',
    });

    // Should remain disabled and skip AI reply
    expect(mockState.conversationData.ai_chat_enabled).toBe(false);
    expect(engineSendText).not.toHaveBeenCalled();
  });
});
