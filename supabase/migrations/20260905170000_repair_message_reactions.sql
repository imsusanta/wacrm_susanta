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
DROP POLICY IF EXISTS "message_reactions_modify" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_select" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_insert" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_update" ON public.message_reactions;
DROP POLICY IF EXISTS "message_reactions_delete" ON public.message_reactions;

CREATE POLICY "message_reactions_select" ON public.message_reactions
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND c.id = message_reactions.conversation_id
        AND is_account_member(c.account_id, 'viewer'::account_role_enum)
    )
  );

CREATE POLICY "message_reactions_insert" ON public.message_reactions
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND c.id = message_reactions.conversation_id
        AND is_account_member(c.account_id, 'agent'::account_role_enum)
    )
  );

CREATE POLICY "message_reactions_update" ON public.message_reactions
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND c.id = message_reactions.conversation_id
        AND is_account_member(c.account_id, 'agent'::account_role_enum)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND c.id = message_reactions.conversation_id
        AND is_account_member(c.account_id, 'agent'::account_role_enum)
    )
  );

CREATE POLICY "message_reactions_delete" ON public.message_reactions
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.messages m
      JOIN public.conversations c ON c.id = m.conversation_id
      WHERE m.id = message_reactions.message_id
        AND c.id = message_reactions.conversation_id
        AND is_account_member(c.account_id, 'agent'::account_role_enum)
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'message_reactions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
  END IF;
EXCEPTION
  WHEN undefined_object OR duplicate_object THEN NULL;
END $$;
