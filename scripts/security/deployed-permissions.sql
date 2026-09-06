-- Metadata-only inspection. No patient/customer rows, function bodies,
-- credentials, auth tokens, or migration statement text are selected.
-- Run through a read-only, project-scoped connection. This does not certify
-- the deployment; review the results against the approved release commit.
begin transaction read only;
set local statement_timeout = '20s';
set local lock_timeout = '2s';

select jsonb_build_object(
  'captured_at', current_timestamp,
  'server_version', current_setting('server_version'),
  'relations', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', c.relname,
      'kind', c.relkind,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity,
      'options', c.reloptions,
      'owner_bypasses_rls', r.rolsuper or r.rolbypassrls
    ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_roles r on r.oid = c.relowner
    where n.nspname in ('public', 'storage') and c.relkind in ('r','p','v','m')
  ),
  'policies', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', schemaname, 'table', tablename, 'name', policyname,
      'roles', roles, 'command', cmd, 'permissive', permissive,
      'using_expression', qual, 'check_expression', with_check
    ) order by schemaname, tablename, policyname), '[]'::jsonb)
    from pg_policies where schemaname in ('public', 'storage')
  ),
  'security_definer_functions', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'name', p.proname,
      'arguments', pg_get_function_identity_arguments(p.oid),
      'search_path_settings', (
        select coalesce(jsonb_agg(setting), '[]'::jsonb)
        from unnest(p.proconfig) setting where setting like 'search_path=%'
      ),
      'anon_execute', has_function_privilege('anon', p.oid, 'EXECUTE'),
      'authenticated_execute', has_function_privilege('authenticated', p.oid, 'EXECUTE'),
      'service_role_execute', has_function_privilege('service_role', p.oid, 'EXECUTE')
    ) order by p.proname, p.oid), '[]'::jsonb)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
  ),
  'sensitive_column_grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'table', c.relname, 'column', a.attname,
      'authenticated_insert', has_column_privilege('authenticated', c.oid, a.attnum, 'INSERT'),
      'authenticated_update', has_column_privilege('authenticated', c.oid, a.attnum, 'UPDATE')
    ) order by c.relname, a.attname), '[]'::jsonb)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname = 'public'
      and c.relname in ('profiles', 'account_members')
      and a.attname in ('account_id', 'role', 'account_role', 'is_super_admin', 'active')
      and a.attnum > 0 and not a.attisdropped
  ),
  'anonymous_table_grants', (
    select coalesce(jsonb_agg(jsonb_build_object(
      'schema', n.nspname, 'table', c.relname,
      'select', has_table_privilege('anon', c.oid, 'SELECT'),
      'insert', has_table_privilege('anon', c.oid, 'INSERT'),
      'update', has_table_privilege('anon', c.oid, 'UPDATE'),
      'delete', has_table_privilege('anon', c.oid, 'DELETE')
    ) order by n.nspname, c.relname), '[]'::jsonb)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'storage') and c.relkind in ('r','p','v')
  )
) as permission_inventory;
commit;

-- Separately inspect applied VERSION identifiers only:
-- SELECT version FROM supabase_migrations.schema_migrations ORDER BY version;
-- Do not export its `statements` column or pg_proc.prosrc.