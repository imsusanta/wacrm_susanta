import { getAdminClient } from '@/lib/db/server';
import { OpenRouterProvider } from '@/core/ai/provider';
import { coreEvents } from '@/core/events';

export interface StructuredLeadExtraction {
  customer: {
    name: string | null;
    email: string | null;
    phone: string | null;
    company: string | null;
    location: string | null;
  };
  requirement: string | null;
  intent: string | null;
  budget: number | string | null;
  timeline: string | null;
  important_details: string[];
  lead_score: number;
  lead_quality: 'low' | 'medium' | 'high';
  outcome: string | null;
  next_action: string | null;
  follow_up_required: boolean;
  summary: string;
}

export interface PostCallPipelineInput {
  accountId: string;
  externalCallId: string;
  transcript: string;
  callerPhone?: string;
  calledPhone?: string;
  direction?: 'inbound' | 'outbound';
  durationSeconds?: number;
  agentId?: string;
  sttProvider?: string;
  ttsProvider?: string;
  existingContactId?: string;
  existingLeadId?: string;
}

export interface PostCallPipelineResult {
  success: boolean;
  contactId?: string;
  leadId?: string;
  leadScore: number;
  intent?: string;
  outcome: string;
  summary: string;
  extractedData: StructuredLeadExtraction;
  cost: number;
}

/**
 * Calculates approximate cost in INR based on duration and providers.
 * Telephony ~ ₹0.60/min, STT ~ ₹0.25/min, TTS ~ ₹0.20/min, LLM ~ ₹0.30/call
 */
export function calculateCallCost(
  durationSeconds: number = 0,
  sttProvider = 'sarvam',
  ttsProvider = 'sarvam'
): number {
  const minutes = Math.ceil(durationSeconds / 60) || 1;
  let ratePerMinute = 1.0; // base telephony + voice

  if (sttProvider === 'sarvam') ratePerMinute += 0.25;
  if (ttsProvider === 'sarvam') ratePerMinute += 0.20;
  if (ttsProvider === 'elevenlabs') ratePerMinute += 1.20;

  return Math.round((minutes * ratePerMinute + 0.3) * 100) / 100;
}

/**
 * Robust fallback calculation of lead score from text signals
 */
export function calculateRuleBasedLeadScore(
  transcript: string,
  extraction: Partial<StructuredLeadExtraction>
): { score: number; quality: 'low' | 'medium' | 'high' } {
  let score = 20; // baseline for conversation
  const lower = transcript.toLowerCase();

  if (extraction.requirement || lower.includes('want') || lower.includes('need') || lower.includes('looking for')) {
    score += 25;
  }
  if (extraction.budget || lower.includes('budget') || lower.includes('price') || lower.includes('cost') || lower.includes('₹')) {
    score += 20;
  }
  if (extraction.timeline || lower.includes('when') || lower.includes('date') || lower.includes('tomorrow') || lower.includes('december')) {
    score += 15;
  }
  if (lower.includes('book') || lower.includes('reserve') || lower.includes('appointment') || lower.includes('confirm')) {
    score += 15;
  }
  if (lower.includes('call back') || lower.includes('send') || lower.includes('whatsapp') || lower.includes('details')) {
    score += 10;
  }

  score = Math.min(100, Math.max(10, score));
  const quality: 'low' | 'medium' | 'high' = score >= 75 ? 'high' : score >= 45 ? 'medium' : 'low';
  return { score, quality };
}

export class PostCallPipeline {
  private static ai = new OpenRouterProvider();

  static async extractStructuredData(
    transcript: string
  ): Promise<StructuredLeadExtraction> {
    if (!transcript || transcript.trim().length === 0) {
      return {
        customer: { name: null, email: null, phone: null, company: null, location: null },
        requirement: null,
        intent: 'No Discussion',
        budget: null,
        timeline: null,
        important_details: [],
        lead_score: 0,
        lead_quality: 'low',
        outcome: 'No Answer',
        next_action: 'Follow up later',
        follow_up_required: false,
        summary: 'Call connected without dialogue or speech was inaudible.',
      };
    }

    const extractionPrompt = `You are an expert CRM Intelligence Agent.
Analyze the following phone conversation transcript between an AI Calling Agent and a customer.

Extract structured lead and sales qualification information in strict JSON matching the schema below:

{
  "customer": {
    "name": "string or null",
    "email": "string or null",
    "phone": "string or null",
    "company": "string or null",
    "location": "string or null"
  },
  "requirement": "specific product/service requested or null",
  "intent": "High / Medium / Low / Not Interested / Information Request",
  "budget": "budget mentioned with currency or null",
  "timeline": "timeline or timeframe mentioned or null",
  "important_details": ["key detail 1", "key detail 2"],
  "lead_score": 0-100 integer based on purchase intent, confirmed budget/timeline, and responsiveness,
  "lead_quality": "low" | "medium" | "high",
  "outcome": "Lead Created" | "Existing Lead Updated" | "Appointment Booked" | "Booking Enquiry" | "Pricing Enquiry" | "Information Request" | "Follow-up Required" | "Human Transfer" | "Not Interested" | "Other",
  "next_action": "recommended next sales step",
  "follow_up_required": boolean,
  "summary": "concise 2-3 sentence executive summary of the conversation, customer requirements, and outcome"
}

TRANSCRIPT:
"""
${transcript}
"""

Return ONLY the raw JSON object. No explanation, no markdown formatting.`;

    try {
      const completion = await this.ai.generateCompletion(
        [
          { role: 'system', content: 'You are a precise CRM extraction assistant that outputs only valid JSON.' },
          { role: 'user', content: extractionPrompt },
        ],
        {
          model: 'google/gemini-2.5-flash',
          temperature: 0.1,
          responseFormat: { type: 'json_object' },
        }
      );

      const parsed = JSON.parse(completion.content) as StructuredLeadExtraction;
      // Sanity checks
      if (!parsed.summary) {
        parsed.summary = 'Call completed. Discussion summarized in customer profile.';
      }
      if (typeof parsed.lead_score !== 'number' || Number.isNaN(parsed.lead_score)) {
        const { score, quality } = calculateRuleBasedLeadScore(transcript, parsed);
        parsed.lead_score = score;
        parsed.lead_quality = quality;
      }
      return parsed;
    } catch (err) {
      console.warn('[PostCallPipeline] AI extraction failed, using heuristic analysis:', err);
      const { score, quality } = calculateRuleBasedLeadScore(transcript, {});
      return {
        customer: { name: null, email: null, phone: null, company: null, location: null },
        requirement: 'General Enquiry',
        intent: score >= 60 ? 'Medium' : 'Low',
        budget: null,
        timeline: null,
        important_details: [],
        lead_score: score,
        lead_quality: quality,
        outcome: 'Information Request',
        next_action: 'Review call transcript',
        follow_up_required: true,
        summary: transcript.slice(0, 200) + '...',
      };
    }
  }

  /**
   * Complete Post-Call Processing execution:
   * Extracts data -> Matches/Creates Contact -> Matches/Creates Lead -> Updates Call -> Triggers Automations
   */
  static async processCall(
    params: PostCallPipelineInput
  ): Promise<PostCallPipelineResult> {
    const db = getAdminClient();
    const { accountId, externalCallId, transcript, durationSeconds = 0 } = params;

    // 1. Structured AI Extraction
    const extraction = await this.extractStructuredData(transcript);
    const cost = calculateCallCost(durationSeconds, params.sttProvider, params.ttsProvider);

    const targetPhone =
      params.callerPhone ||
      params.calledPhone ||
      extraction.customer.phone ||
      null;

    let contactId = params.existingContactId;
    let leadId = params.existingLeadId;

    // 2. Existing Contact Matching (Prevent Duplicates)
    if (!contactId && targetPhone) {
      const cleanPhone = targetPhone.replace(/[^0-9+]/g, '');
      const { data: existingContact } = await db
        .from('contacts')
        .select('id, name, phone, email')
        .eq('account_id', accountId)
        .or(`phone.eq.${cleanPhone},phone.eq.${cleanPhone.replace('+', '')}`)
        .limit(1)
        .maybeSingle();

      if (existingContact) {
        contactId = existingContact.id;
        // Enrich existing contact if extracted new name/email
        const updates: Record<string, unknown> = {};
        if (!existingContact.name && extraction.customer.name) {
          updates.name = extraction.customer.name;
        }
        if (!existingContact.email && extraction.customer.email) {
          updates.email = extraction.customer.email;
        }
        if (Object.keys(updates).length > 0) {
          await db.from('contacts').update(updates).eq('id', contactId);
        }
      } else {
        // Create new contact
        const { data: newContact, error: createContactErr } = await db
          .from('contacts')
          .insert({
            account_id: accountId,
            name: extraction.customer.name || `Caller ${cleanPhone.slice(-4)}`,
            phone: cleanPhone,
            email: extraction.customer.email || null,
            company: extraction.customer.company || null,
            address: extraction.customer.location || null,
            notes: `Auto-created from AI Call (${externalCallId})`,
            metadata: {
              source: 'ai_voice_call',
              lead_score: extraction.lead_score,
            },
          })
          .select('id')
          .single();

        if (!createContactErr && newContact) {
          contactId = newContact.id;
          coreEvents.emit('contact.created', accountId, {
            contactId,
            phone: cleanPhone,
            name: extraction.customer.name,
          });
        }
      }
    }

    // 3. Existing Lead Matching (Prevent Duplicates)
    if (contactId && !leadId) {
      const { data: existingLead } = await db
        .from('leads')
        .select('id, stage, value, metadata')
        .eq('account_id', accountId)
        .eq('contact_id', contactId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingLead) {
        leadId = existingLead.id;
        // Update existing lead with call insights
        const existingMeta = (existingLead.metadata as Record<string, unknown>) || {};
        await db
          .from('leads')
          .update({
            lead_score: String(extraction.lead_score),
            score: String(extraction.lead_score),
            notes: extraction.summary,
            metadata: {
              ...existingMeta,
              last_call_id: externalCallId,
              last_call_summary: extraction.summary,
              last_call_intent: extraction.intent,
              important_details: extraction.important_details,
            },
            updated_at: new Date().toISOString(),
          })
          .eq('id', leadId);

        coreEvents.emit('deal.updated', accountId, {
          dealId: leadId,
          contactId,
          leadScore: extraction.lead_score,
        });
      } else {
        // Create new lead
        const { data: newLead, error: createLeadErr } = await db
          .from('leads')
          .insert({
            account_id: accountId,
            contact_id: contactId,
            name: extraction.customer.name || `Voice Lead (${targetPhone || 'Call'})`,
            phone: targetPhone,
            email: extraction.customer.email,
            stage: 'NEW',
            source: 'ai_voice_call',
            channel: 'voice',
            service: extraction.requirement || 'Voice Call Inquiry',
            lead_score: String(extraction.lead_score),
            score: String(extraction.lead_score),
            notes: extraction.summary,
            metadata: {
              external_call_id: externalCallId,
              intent: extraction.intent,
              budget: extraction.budget,
              timeline: extraction.timeline,
              important_details: extraction.important_details,
              next_action: extraction.next_action,
            },
          })
          .select('id')
          .single();

        if (!createLeadErr && newLead) {
          leadId = newLead.id;
          coreEvents.emit('deal.created', accountId, {
            dealId: leadId,
            contactId,
            leadScore: extraction.lead_score,
            source: 'ai_voice_call',
          });
        }
      }
    }

    // 4. Update calls record in database
    await db
      .from('calls')
      .update({
        contact_id: contactId || null,
        lead_id: leadId || null,
        summary: extraction.summary,
        outcome: extraction.outcome || 'Information Request',
        lead_score: extraction.lead_score,
        intent: extraction.intent,
        extracted_data: extraction,
        duration_seconds: durationSeconds,
        cost,
        transcript,
        status: 'completed',
        updated_at: new Date().toISOString(),
      })
      .eq('account_id', accountId)
      .eq('external_call_id', externalCallId);

    // 5. Emit Call Completed & High Intent Events for Automations
    coreEvents.emit('call.completed', accountId, {
      callId: externalCallId,
      contactId,
      leadId,
      leadScore: extraction.lead_score,
      intent: extraction.intent,
      outcome: extraction.outcome,
      summary: extraction.summary,
    });

    if (extraction.lead_score >= 75) {
      coreEvents.emit('call.high_intent', accountId, {
        callId: externalCallId,
        contactId,
        leadId,
        leadScore: extraction.lead_score,
        intent: extraction.intent,
        requirement: extraction.requirement,
      });
    }

    return {
      success: true,
      contactId,
      leadId,
      leadScore: extraction.lead_score,
      intent: extraction.intent || undefined,
      outcome: extraction.outcome || 'Information Request',
      summary: extraction.summary,
      extractedData: extraction,
      cost,
    };
  }
}
