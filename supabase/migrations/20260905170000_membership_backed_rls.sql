begin;

-- Authorization helpers must bypass account_members RLS while retaining a
-- fixed search path. Tenant identity is derived from persisted memberships,
-- never from mutable JWT account metadata.
create or replace function public.is_active_account_member(target_account_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.account_members
     where account_id = target_account_id
       and user_id = (select auth.uid())
       and active = true
  );
$$;

create or replace function public.is_account_member(
  target_account_id uuid,
  min_role account_role_enum default 'viewer'::account_role_enum
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.account_members
     where account_id = target_account_id
       and user_id = (select auth.uid())
       and active = true
       and case role
             when 'owner' then 4
             when 'admin' then 3
             when 'agent' then 2
             when 'viewer' then 1
             else 0
           end >=
           case min_role
             when 'owner' then 4
             when 'admin' then 3
             when 'agent' then 2
             when 'viewer' then 1
           end
  );
$$;

create or replace function public.is_platform_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
      from public.profiles
     where user_id = (select auth.uid())
       and is_super_admin = true
  );
$$;

revoke all on function public.is_active_account_member(uuid)
  from public, anon;
revoke all on function public.is_account_member(uuid, account_role_enum)
  from public, anon;
revoke all on function public.is_platform_super_admin()
  from public, anon;
grant execute on function public.is_active_account_member(uuid)
  to authenticated, service_role;
grant execute on function public.is_account_member(uuid, account_role_enum)
  to authenticated, service_role;
grant execute on function public.is_platform_super_admin()
  to authenticated, service_role;

-- Replace policies that trusted app_metadata.account_id. Relations are
-- optional across older installations, so only touch tables that exist.
do $$
declare
  target record;
begin
  for target in
    select * from (values
      ('lead_stage_history', 'lead_stage_history_tenant_isolation'),
      ('idempotency_keys', 'idempotency_keys_tenant_isolation'),
      ('followup_sequences', 'followup_sequences_tenant_isolation'),
      ('followup_steps', 'followup_steps_tenant_isolation'),
      ('followup_enrollments', 'followup_enrollments_tenant_isolation'),
      ('followup_jobs', 'followup_jobs_tenant_isolation'),
      ('contact_channels', 'contact_channels_tenant_isolation'),
      ('communication_consents', 'communication_consents_tenant_isolation'),
      ('calls', 'calls_tenant_isolation'),
      ('call_events', 'call_events_tenant_isolation'),
      ('calendly_connections', 'calendly_connections_tenant_isolation'),
      ('calendly_event_types', 'calendly_event_types_tenant_isolation'),
      ('service_event_type_mappings', 'service_event_type_mappings_tenant_isolation')
    ) as policies(table_name, policy_name)
  loop
    if to_regclass(format('public.%I', target.table_name)) is not null then
      execute format(
        'drop policy if exists %I on public.%I',
        target.policy_name,
        target.table_name
      );
      execute format(
        'create policy %I on public.%I for all to authenticated, service_role using (public.is_active_account_member(account_id) or (select auth.role()) = ''service_role'') with check (public.is_active_account_member(account_id) or (select auth.role()) = ''service_role'')',
        target.policy_name,
        target.table_name
      );
    end if;
  end loop;
end $$;

drop policy if exists "audit_logs_tenant_select" on public.audit_logs;
create policy "audit_logs_tenant_select"
  on public.audit_logs
  for select
  to authenticated, service_role
  using (
    public.is_active_account_member(account_id)
    or public.is_platform_super_admin()
    or (select auth.role()) = 'service_role'
  );

drop policy if exists "tenant_members_read_whatsapp_outbox"
  on public.whatsapp_outbox;
create policy "tenant_members_read_whatsapp_outbox"
  on public.whatsapp_outbox
  for select
  to authenticated
  using (public.is_active_account_member(account_id));

commit;
