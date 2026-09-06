-- ============================================================================
-- Migration: 20260905150000_campaign_analytics_and_push_notifications.sql
-- Description: Push notifications subscriptions table and campaign analytics
--              columns (CTR, clicks, conversions, attributed revenue).
-- ============================================================================

-- 1. Create push_subscriptions table
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT push_subscriptions_endpoint_unique UNIQUE (endpoint)
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_account ON public.push_subscriptions(account_id);
CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
  FOR SELECT USING (is_account_member(account_id, 'viewer'::account_role_enum));

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT WITH CHECK (is_account_member(account_id, 'viewer'::account_role_enum));

DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions
  FOR UPDATE USING (is_account_member(account_id, 'viewer'::account_role_enum))
  WITH CHECK (is_account_member(account_id, 'viewer'::account_role_enum));

DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE USING (is_account_member(account_id, 'viewer'::account_role_enum));

-- 2. Add analytics counters to broadcasts
ALTER TABLE public.broadcasts
  ADD COLUMN IF NOT EXISTS clicks_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attributed_revenue NUMERIC(12,2) DEFAULT 0;

-- 3. Add button tracking fields to broadcast_recipients
ALTER TABLE public.broadcast_recipients
  ADD COLUMN IF NOT EXISTS button_clicked BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_clicked
  ON public.broadcast_recipients(broadcast_id, button_clicked);
