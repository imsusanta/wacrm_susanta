\set ON_ERROR_STOP on
-- Function grants: evaluate the actual effective ACL, including PUBLIC grants.
select test_assert(not has_function_privilege('anon',
  'public.enqueue_whatsapp_outbound_message(uuid,uuid,text,text,text,text,text,text,integer,jsonb)',
  'EXECUTE'), 'anonymous cannot enqueue');
select test_assert(not has_function_privilege('authenticated',
  'public.enqueue_whatsapp_outbound_message(uuid,uuid,text,text,text,text,text,text,integer,jsonb)',
  'EXECUTE'), 'authenticated clients cannot call privileged enqueue');
select test_assert(has_function_privilege('service_role',
  'public.enqueue_whatsapp_outbound_message(uuid,uuid,text,text,text,text,text,text,integer,jsonb)',
  'EXECUTE'), 'service role retains enqueue access');

set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '11111111-1111-4111-8111-111111111111';
-- Deliberately stale/forged tenant metadata must not override persisted membership.
set request.jwt.claims = '{"app_metadata":{"account_id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb"}}';
select test_assert(is_active_account_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'own persisted membership resolves');
select test_assert(not is_active_account_member('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'JWT metadata cannot grant membership');
select test_assert((select count(*) = 1 from contacts), 'Tenant A reads exactly its own seeded contact');
select test_assert((select count(*) = 0 from contacts where account_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'), 'Tenant B data is invisible to Tenant A');
with changed as (
  update contacts set name = 'Synthetic allowed update'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id
) select test_assert((select count(*) = 1 from changed), 'same-tenant admin update succeeds');
with changed as (
  update contacts set name = 'Cross-tenant attempt'
  where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' returning id
) select test_assert((select count(*) = 0 from changed), 'cross-tenant update affects no rows');
with removed as (
  delete from contacts where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd' returning id
) select test_assert((select count(*) = 0 from removed), 'cross-tenant deletion affects no rows');
do $$
begin
  begin
    insert into contacts (account_id, name) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Denied synthetic insert');
    raise exception 'FAIL: cross-tenant insert succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS: cross-tenant insert rejected with SQLSTATE 42501';
  end;
  begin
    update contacts set account_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
    where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc';
    raise exception 'FAIL: own contact was moved to another tenant';
  exception when insufficient_privilege then
    raise notice 'PASS: WITH CHECK rejects moving a contact across tenants';
  end;
  begin
    perform enqueue_whatsapp_outbound_message(
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'ffffffff-ffff-4fff-8fff-ffffffffffff', 'denied-client',
      p_payload => '{"requestHash":"synthetic-hash"}');
    raise exception 'FAIL: authenticated privileged enqueue succeeded';
  exception when insufficient_privilege then
    raise notice 'PASS: direct privileged enqueue rejected with SQLSTATE 42501';
  end;
end $$;
reset role;

-- The same JWT loses access immediately after persisted membership revocation.
update account_members set active = false where user_id = '11111111-1111-4111-8111-111111111111';
set role authenticated;
select test_assert(not is_active_account_member('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), 'revoked membership fails closed');
select test_assert((select count(*) = 0 from contacts), 'revoked member cannot read former tenant');
reset role;
update account_members set active = true where user_id = '11111111-1111-4111-8111-111111111111';
update account_members set role = 'viewer' where user_id = '11111111-1111-4111-8111-111111111111';
set role authenticated;
select test_assert((select count(*) = 1 from contacts), 'viewer retains permitted read access');
with changed as (
  update contacts set name = 'Viewer mutation'
  where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc' returning id
) select test_assert((select count(*) = 0 from changed), 'viewer cannot update own tenant contacts');
reset role;
update account_members set role = 'admin' where user_id = '11111111-1111-4111-8111-111111111111';

set role service_role;
set request.jwt.claim.role = 'service_role';
do $$
declare
  first_result jsonb;
  duplicate_result jsonb;
  conflict_result jsonb;
  denied_result jsonb;
begin
  first_result := enqueue_whatsapp_outbound_message(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'same-key',
    p_payload => '{"requestHash":"synthetic-hash-A"}');
  perform test_assert(first_result ->> 'ok' = 'true' and first_result ->> 'duplicate' = 'false', 'service enqueue creates real message and outbox records');
  duplicate_result := enqueue_whatsapp_outbound_message(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'same-key',
    p_payload => '{"requestHash":"synthetic-hash-A"}');
  perform test_assert(duplicate_result ->> 'duplicate' = 'true' and duplicate_result ->> 'outbox_id' = first_result ->> 'outbox_id', 'matching retry returns the original record');
  conflict_result := enqueue_whatsapp_outbound_message(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'same-key',
    p_payload => '{"requestHash":"synthetic-hash-B"}');
  perform test_assert(conflict_result ->> 'error' = 'IDEMPOTENCY_CONFLICT', 'changed payload is rejected by PostgreSQL');
  denied_result := enqueue_whatsapp_outbound_message(
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    'ffffffff-ffff-4fff-8fff-ffffffffffff', 'wrong-tenant',
    p_payload => '{"requestHash":"synthetic-hash-C"}');
  perform test_assert(denied_result ->> 'error' = 'CONVERSATION_NOT_FOUND', 'service caller cannot mix tenant and conversation IDs');
  perform test_assert((select count(*) = 1 from whatsapp_outbox), 'duplicate/conflict/denied calls create no extra outbox records');
  perform test_assert((select count(*) = 1 from messages), 'duplicate/conflict/denied calls create no extra messages');
end $$;
reset role;
set role authenticated;
set request.jwt.claim.role = 'authenticated';
set request.jwt.claim.sub = '22222222-2222-4222-8222-222222222222';
set request.jwt.claims = '{"app_metadata":{"account_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"}}';
select test_assert((select count(*) = 0 from whatsapp_outbox), 'Tenant B cannot read Tenant A outbox even with stale metadata');
select test_assert((select count(*) = 1 from contacts), 'Tenant B positive control reads its own contact');
reset role;