-- Migration: 20260906130000_ensure_voice_integrations.sql
-- Description: Ensures voice_integrations and voice_commands tables exist with RLS policies and indexes.

CREATE TABLE IF NOT EXISTS public.voice_integrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  encrypted_credentials_reference TEXT,
  api_key_encrypted TEXT,
  agent_id TEXT,
  provider_phone_number_id TEXT,
  phone_number_id TEXT,
  phone_number_masked TEXT,
  status TEXT NOT NULL DEFAULT 'configured',
  capabilities JSONB,
  key_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_voice_integrations_account_provider UNIQUE (account_id, provider)
);

CREATE TABLE IF NOT EXISTS public.voice_commands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  call_id UUID,
  command_type TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  params_json JSONB,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS voice_commands_account_idempotency_idx
  ON public.voice_commands (account_id, idempotency_key)
  WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_voice_integrations_account
  ON public.voice_integrations (account_id);

ALTER TABLE public.voice_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_commands ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS voice_integrations_select ON public.voice_integrations;
CREATE POLICY voice_integrations_select
  ON public.voice_integrations FOR SELECT TO authenticated
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS voice_integrations_write ON public.voice_integrations;
CREATE POLICY voice_integrations_write
  ON public.voice_integrations FOR ALL TO authenticated
  USING (
    public.has_account_role(account_id, 'admin')
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.has_account_role(account_id, 'admin')
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS voice_commands_select ON public.voice_commands;
CREATE POLICY voice_commands_select
  ON public.voice_commands FOR SELECT TO authenticated
  USING (
    public.is_active_account_member(account_id)
    OR (SELECT auth.role()) = 'service_role'
  );

DROP POLICY IF EXISTS voice_commands_write ON public.voice_commands;
CREATE POLICY voice_commands_write
  ON public.voice_commands FOR ALL TO authenticated
  USING (
    public.has_account_role(account_id, 'agent')
    OR (SELECT auth.role()) = 'service_role'
  )
  WITH CHECK (
    public.has_account_role(account_id, 'agent')
    OR (SELECT auth.role()) = 'service_role'
  );

GRANT ALL ON TABLE public.voice_integrations TO service_role;
GRANT ALL ON TABLE public.voice_commands TO service_role;
