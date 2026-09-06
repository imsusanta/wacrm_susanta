import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  calculateCallCost,
  calculateRuleBasedLeadScore,
  PostCallPipeline,
} from '@/lib/voice/post-call-pipeline';

const { mockStructuredData } = vi.hoisted(() => {
  return {
    mockStructuredData: {
      customer: {
        name: 'Pooja Verma',
        email: 'pooja@example.com',
        phone: '+919876543210',
        company: 'Verma Enterprises',
        location: 'Mumbai',
      },
      requirement: 'Enterprise CRM implementation for 25 agents',
      intent: 'High',
      budget: '₹50,000 / month',
      timeline: 'Next 2 weeks',
      important_details: ['Needs WhatsApp integration', 'Hindi language voice bot required'],
      lead_score: 85,
      lead_quality: 'high',
      outcome: 'Lead Created',
      next_action: 'Schedule technical demo with solutions architect',
      follow_up_required: true,
      summary: 'Customer called inquiring about enterprise CRM. Very interested in Hindi voice assistant with immediate 2-week timeline.',
    },
  };
});

// Mock OpenRouterProvider as a constructible class
vi.mock('@/core/ai/provider', () => {
  return {
    OpenRouterProvider: class {
      generateCompletion = vi.fn().mockResolvedValue({
        content: JSON.stringify(mockStructuredData),
      });
    },
  };
});

// Mock database client
const mockDb = {
  from: vi.fn(),
};

vi.mock('@/lib/db/server', () => ({
  getAdminClient: () => mockDb,
}));

describe('PostCallPipeline - Cost Calculation', () => {
  it('calculates cost accurately for short call with Sarvam STT & TTS', () => {
    // 30 seconds -> 1 minute billable
    // Rate = 1.0 (base) + 0.25 (sarvam stt) + 0.20 (sarvam tts) = 1.45 + 0.30 fixed = 1.75
    const cost = calculateCallCost(30, 'sarvam', 'sarvam');
    expect(cost).toBe(1.75);
  });

  it('calculates cost for multi-minute call with ElevenLabs TTS', () => {
    // 130 seconds -> 3 minutes
    // Rate = 1.0 + 0.25 (stt) + 1.20 (elevenlabs tts) = 2.45 * 3 = 7.35 + 0.30 = 7.65
    const cost = calculateCallCost(130, 'sarvam', 'elevenlabs');
    expect(cost).toBe(7.65);
  });
});

describe('PostCallPipeline - Rule Based Lead Scoring', () => {
  it('computes low score for brief, low-intent inquiries', () => {
    const transcript = 'Hello? Wrong number.';
    const result = calculateRuleBasedLeadScore(transcript, {});
    expect(result.score).toBeLessThan(45);
    expect(result.quality).toBe('low');
  });

  it('computes high score for buying intent, budget, and timeline', () => {
    const transcript = 'I am looking for a complete CRM package. My budget is around ₹25,000 and I want to book an appointment for tomorrow.';
    const result = calculateRuleBasedLeadScore(transcript, {
      requirement: 'CRM package',
      budget: '₹25,000',
      timeline: 'tomorrow',
    });
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.quality).toBe('high');
  });
});

describe('PostCallPipeline - Structured Extraction', () => {
  it('returns empty placeholder when transcript is empty', async () => {
    const result = await PostCallPipeline.extractStructuredData('');
    expect(result.lead_score).toBe(0);
    expect(result.customer.name).toBeNull();
    expect(result.summary.toLowerCase()).toContain('without dialogue');
  });

  it('extracts structured lead details from AI completion', async () => {
    const transcript = `
      AI: Namaste! I am Maya from Helpa. How can I assist you?
      Caller: Hi Maya, my name is Pooja Verma from Verma Enterprises in Mumbai. We need an enterprise CRM for 25 agents.
      AI: Wonderful, what is your budget and timeline?
      Caller: Our budget is ₹50,000 per month and we need this implemented in the next 2 weeks.
    `;

    const result = await PostCallPipeline.extractStructuredData(transcript);
    expect(result.customer.name).toBe('Pooja Verma');
    expect(result.customer.phone).toBe('+919876543210');
    expect(result.lead_score).toBe(85);
    expect(result.lead_quality).toBe('high');
    expect(result.summary).toContain('enterprise CRM');
  });
});

describe('PostCallPipeline - Duplicate Avoidance in ProcessCall', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('attaches to existing contact without inserting a duplicate', async () => {
    const existingContact = {
      id: 'existing-contact-123',
      name: 'Pooja Verma',
      phone: '+919876543210',
      email: 'pooja@example.com',
    };

    function createChainable(data: unknown) {
      const chain: Record<string, unknown> = {};
      const methods = ['select', 'update', 'insert', 'eq', 'or', 'order', 'limit'];
      for (const m of methods) {
        chain[m] = vi.fn(() => chain);
      }
      chain.maybeSingle = vi.fn().mockResolvedValue({ data, error: null });
      chain.single = vi.fn().mockResolvedValue({ data, error: null });
      return chain;
    }

    const contactsChain = createChainable(existingContact);
    const leadsChain = createChainable({ id: 'existing-lead-456' });
    const callsChain = createChainable({ id: 'call-1' });

    mockDb.from.mockImplementation((table: string) => {
      if (table === 'contacts') return contactsChain;
      if (table === 'leads') return leadsChain;
      if (table === 'calls') return callsChain;
      return createChainable(null);
    });

    const result = await PostCallPipeline.processCall({
      accountId: 'acc-test',
      externalCallId: 'call-ext-100',
      transcript: 'Caller Pooja inquiring about CRM.',
      callerPhone: '+919876543210',
      durationSeconds: 90,
    });

    expect(result.success).toBe(true);
    expect(result.contactId).toBe('existing-contact-123');
  });
});
