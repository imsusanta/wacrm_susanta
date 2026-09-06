-- ─────────────────────────────────────────────────────────────
-- Create inbox tables that were previously out-of-band.
--
-- message_reactions and message_templates were created outside the
-- migration history (dashboard-only), so fresh databases and this
-- production project never received them. #209 enabled RLS on them
-- where they exist; this migration creates them where they don't.
--
-- Tenant isolation follows the current account-scoped model
-- (is_account_member / has_account_role), matching every other
-- table in the canonical schema. Idempotent.
-- ─────────────────────────────────────────────────────────────

-- ============================================================
-- message_reactions — one row per (message, actor)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  actor_type text NOT NULL CHECK (actor_type IN ('customer', 'agent')),
  actor_id uuid,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, actor_type, actor_id)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation
  ON public.message_reactions(conversation_id);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
  ON public.message_reactions(message_id);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_reactions_tenant_isolation" ON public.message_reactions;
CREATE POLICY "message_reactions_tenant_isolation" ON public.message_reactions
  FOR ALL TO authenticated, service_role
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_reactions.conversation_id
        AND (is_account_member(c.account_id, 'viewer'::account_role_enum) OR (SELECT current_setting('role', true)) = 'service_role')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.id = message_reactions.conversation_id
        AND (is_account_member(c.account_id, 'viewer'::account_role_enum) OR (SELECT current_setting('role', true)) = 'service_role')
    )
  );

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'message_reactions'
  ) THEN
    RETURN;
  END IF;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
EXCEPTION WHEN undefined_object THEN NULL;
END $$;

-- ============================================================
-- message_templates — WhatsApp template library
-- ============================================================
CREATE TABLE IF NOT EXISTS public.message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  user_id uuid,
  name text NOT NULL,
  category text NOT NULL DEFAULT 'Marketing' CHECK (category IN ('Marketing', 'Utility', 'Authentication')),
  language text DEFAULT 'en_US',
  header_type text CHECK (header_type IN ('text', 'image', 'video', 'document')),
  header_content text,
  body_text text NOT NULL,
  footer_text text,
  buttons jsonb,
  status text DEFAULT 'Draft' CHECK (status IN ('Draft', 'Pending', 'Approved', 'Rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "message_templates_select" ON public.message_templates;
CREATE POLICY "message_templates_select" ON public.message_templates
  FOR SELECT TO authenticated
  USING (
    is_account_member(account_id, 'viewer'::account_role_enum)
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS "message_templates_insert" ON public.message_templates;
CREATE POLICY "message_templates_insert" ON public.message_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    has_account_role(account_id, 'agent')
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS "message_templates_update" ON public.message_templates;
CREATE POLICY "message_templates_update" ON public.message_templates
  FOR UPDATE TO authenticated
  USING (
    has_account_role(account_id, 'agent')
    OR (user_id = auth.uid())
  )
  WITH CHECK (
    has_account_role(account_id, 'agent')
    OR (user_id = auth.uid())
  );

DROP POLICY IF EXISTS "message_templates_delete" ON public.message_templates;
CREATE POLICY "message_templates_delete" ON public.message_templates
  FOR DELETE TO authenticated
  USING (
    has_account_role(account_id, 'admin')
    OR (user_id = auth.uid())
  );

CREATE INDEX IF NOT EXISTS idx_message_templates_account
  ON public.message_templates(account_id);
