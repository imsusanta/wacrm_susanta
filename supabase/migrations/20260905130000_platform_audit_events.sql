begin;

-- Tenant audit events remain account-scoped. Platform-level events do not have
-- an account UUID and must be represented explicitly instead of inventing a
-- sentinel account identifier that violates the foreign key.
alter table public.audit_logs
  alter column account_id drop not null;

create index if not exists audit_logs_platform_created_idx
  on public.audit_logs (created_at desc)
  where account_id is null;

comment on column public.audit_logs.account_id is
  'Tenant UUID for tenant-scoped events; NULL only for platform-level administrative events.';

commit;
