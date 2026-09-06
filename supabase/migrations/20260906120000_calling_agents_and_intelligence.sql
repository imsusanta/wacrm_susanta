-- Migration: 20260906120000_calling_agents_and_intelligence.sql
-- Description: Adds calling_agents, calling_phone_numbers, and extends calls table with AI intelligence metadata.

CREATE TABLE IF NOT EXISTS public.calling_agents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  phone_number VARCHAR(64),
  stt_provider VARCHAR(32) NOT NULL DEFAULT 'sarvam',
  tts_provider VARCHAR(32) NOT NULL DEFAULT 'sarvam',
  voice_id VARCHAR(128) DEFAULT 'shubh',
  language VARCHAR(32) NOT NULL DEFAULT 'en-IN',
  llm_provider VARCHAR(32) NOT NULL DEFAULT 'openrouter',
  llm_model VARCHAR(128) DEFAULT 'google/gemini-2.5-flash',
  system_instructions TEXT,
  greeting TEXT,
  knowledge_base_enabled BOOLEAN NOT NULL DEFAULT true,
  tools_config JSONB NOT NULL DEFAULT '{"searchKnowledge": true, "findContact": true, "createLead": true, "updateLead": true, "transferToHuman": true, "endCall": true}'::jsonb,
  business_hours JSONB,
  call_rules JSONB,
  transfer_number VARCHAR(64),
  recording_enabled BOOLEAN NOT NULL DEFAULT false,
  elevenlabs_agent_id VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.calling_phone_numbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  phone_number VARCHAR(64) NOT NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'elevenlabs',
  provider_phone_number_id VARCHAR(255),
  assigned_agent_id UUID REFERENCES public.calling_agents(id) ON DELETE SET NULL,
  inbound_enabled BOOLEAN NOT NULL DEFAULT true,
  outbound_enabled BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Telephony calls & events tables
CREATE TABLE IF NOT EXISTS public.calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  lead_id UUID,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  provider VARCHAR(32) NOT NULL DEFAULT 'sarvam',
  external_call_id VARCHAR(255),
  external_agent_id VARCHAR(255),
  external_phone_number_id VARCHAR(255),
  direction VARCHAR(16) NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  status VARCHAR(32) NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'in_progress', 'completed', 'failed', 'no_answer', 'busy', 'transferred')),
  patient_phone VARCHAR(64) NOT NULL,
  clinic_phone VARCHAR(64),
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  answered_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER DEFAULT 0,
  outcome VARCHAR(64),
  summary TEXT,
  transcript TEXT,
  recording_url TEXT,
  failure_reason TEXT,
  human_handoff BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.call_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  call_id UUID NOT NULL REFERENCES public.calls(id) ON DELETE CASCADE,
  external_event_id VARCHAR(255),
  event_type VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "calls_tenant_isolation" ON public.calls;
CREATE POLICY "calls_tenant_isolation"
  ON public.calls
  FOR ALL
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS "call_events_tenant_isolation" ON public.call_events;
CREATE POLICY "call_events_tenant_isolation"
  ON public.call_events
  FOR ALL
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

GRANT ALL ON TABLE public.calls TO service_role;
GRANT ALL ON TABLE public.call_events TO service_role;

-- Non-destructive extension of calls table
ALTER TABLE public.calls
  ADD COLUMN IF NOT EXISTS calling_agent_id UUID REFERENCES public.calling_agents(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS from_phone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS to_phone VARCHAR(64),
  ADD COLUMN IF NOT EXISTS lead_score INTEGER,
  ADD COLUMN IF NOT EXISTS intent VARCHAR(128),
  ADD COLUMN IF NOT EXISTS extracted_data JSONB,
  ADD COLUMN IF NOT EXISTS cost NUMERIC(10, 4) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stt_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS tts_provider VARCHAR(32),
  ADD COLUMN IF NOT EXISTS language VARCHAR(32);

-- Indexes for performant tenant lookups
CREATE INDEX IF NOT EXISTS idx_calling_agents_account_id ON public.calling_agents (account_id);
CREATE INDEX IF NOT EXISTS idx_calling_phone_numbers_account_id ON public.calling_phone_numbers (account_id);
CREATE INDEX IF NOT EXISTS idx_calling_phone_numbers_number ON public.calling_phone_numbers (phone_number);
CREATE INDEX IF NOT EXISTS idx_calls_calling_agent ON public.calls (calling_agent_id);
CREATE INDEX IF NOT EXISTS idx_calls_lead_score ON public.calls (account_id, lead_score);

-- RLS Isolation
ALTER TABLE public.calling_agents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calling_phone_numbers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS calling_agents_select ON public.calling_agents;
CREATE POLICY calling_agents_select
  ON public.calling_agents FOR SELECT TO authenticated
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS calling_agents_write ON public.calling_agents;
CREATE POLICY calling_agents_write
  ON public.calling_agents FOR ALL TO authenticated
  USING (
    public.has_account_role(account_id, 'agent')
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.has_account_role(account_id, 'agent')
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS calling_phone_numbers_select ON public.calling_phone_numbers;
CREATE POLICY calling_phone_numbers_select
  ON public.calling_phone_numbers FOR SELECT TO authenticated
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS calling_phone_numbers_write ON public.calling_phone_numbers;
CREATE POLICY calling_phone_numbers_write
  ON public.calling_phone_numbers FOR ALL TO authenticated
  USING (
    public.has_account_role(account_id, 'admin')
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.has_account_role(account_id, 'admin')
    OR (SELECT auth.role()) = 'service_role'
  );

GRANT ALL ON TABLE public.calling_agents TO service_role;
GRANT ALL ON TABLE public.calling_phone_numbers TO service_role;
